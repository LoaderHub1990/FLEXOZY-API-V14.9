// ชั้นฐานข้อมูลเดียวใช้ได้ทั้ง Upstash Redis / Vercel KV (ผ่าน REST) และไฟล์ในเครื่อง (.data) สำหรับ VPS / ทดสอบ
// คำสั่งที่รองรับ = ชุดที่ระบบใช้จริง · รูปแบบข้อมูลเข้ากันได้กับ keygate-v3 เดิม (ค่า object เก็บเป็น JSON string)
import fs from 'fs';
import path from 'path';

const env = k => (process.env[k] || '').trim();
const URL_ = (env('UPSTASH_REDIS_REST_URL') || env('KV_REST_API_URL')).replace(/\/$/, '');
const TOK = env('UPSTASH_REDIS_REST_TOKEN') || env('KV_REST_API_TOKEN');
export const kvReady = !!(URL_ && TOK);
export const kvMode = kvReady ? 'redis' : 'file';

const enc = v => (typeof v === 'string' ? v : JSON.stringify(v));
const dec = raw => { if (raw == null) return null; if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return raw; } };

// ---------------------------------------------------------------- Redis (REST)
async function post(p, body) {
  const r = await fetch(URL_ + p, { method: 'POST', headers: { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(9000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || j == null) throw new Error((j && j.error) || 'kv http ' + r.status);
  return j;
}
const call = async cmd => { const j = await post('', cmd); if (j.error) throw new Error(j.error); return j.result; };
const pipe = async cmds => { const j = await post('/pipeline', cmds); if (!Array.isArray(j)) throw new Error('kv pipeline'); return j.map(x => { if (x.error) throw new Error(x.error); return x.result; }); };
const flat = a => { const o = {}; if (Array.isArray(a)) for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i + 1]; return o; };

const redis = {
  get: async k => dec(await call(['GET', k])),
  getRaw: async k => { const v = await call(['GET', k]); return v == null ? null : String(v); },
  set: async (k, v, o = {}) => { const c = ['SET', k, enc(v)]; if (o.ex) c.push('EX', Math.max(1, Math.ceil(o.ex))); if (o.nx) c.push('NX'); const r = await call(c); return o.nx ? r === 'OK' : true; },
  del: async (...ks) => (ks.length ? Number(await call(['DEL', ...ks])) : 0),
  incr: async k => Number(await call(['INCR', k])),
  incrx: async (k, ttl) => Number((await pipe([['SET', k, '0', 'EX', Math.ceil(ttl), 'NX'], ['INCR', k]]))[1]),
  expire: async (k, ttl) => call(['EXPIRE', k, Math.ceil(ttl)]),
  persist: async ks => { if (ks.length) await pipe(ks.map(k => ['PERSIST', k])); },
  sadd: async (k, ...m) => (m.length ? Number(await call(['SADD', k, ...m.map(String)])) : 0),
  srem: async (k, ...m) => (m.length ? Number(await call(['SREM', k, ...m.map(String)])) : 0),
  smembers: async k => (await call(['SMEMBERS', k])) || [],
  sismember: async (k, m) => Number(await call(['SISMEMBER', k, String(m)])) === 1,
  scard: async k => Number(await call(['SCARD', k])) || 0,
  mget: async (...ks) => (ks.length ? (await call(['MGET', ...ks])).map(dec) : []),
  mgetRaw: async (...ks) => (ks.length ? (await call(['MGET', ...ks])).map(v => (v == null ? null : String(v))) : []),
  hincrby: async (k, f, n = 1) => Number(await call(['HINCRBY', k, f, n])),
  hgetall: async k => { const a = await call(['HGETALL', k]); return a && a.length ? flat(a) : null; },
  pfadd: async (k, ...m) => call(['PFADD', k, ...m.map(String)]),
  pfcount: async k => Number(await call(['PFCOUNT', k])) || 0,
  lpush: async (k, ...v) => call(['LPUSH', k, ...v.map(enc)]),
  ltrim: async (k, a, b) => call(['LTRIM', k, a, b]),
  lrange: async (k, a, b) => ((await call(['LRANGE', k, a, b])) || []).map(dec),
};

// ---------------------------------------------------------------- ไฟล์ในเครื่อง
const FILE = path.join(process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.data'), 'db.json');
let M = null, timer = null;
function load() {
  if (M) return M;
  M = new Map();
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    for (const [k, o] of Object.entries(j)) { if (o.t === 'set' || o.t === 'hll') o.v = new Set(o.v); M.set(k, o); }
  } catch {}
  return M;
}
function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const out = {};
      for (const [k, o] of M) out[k] = o.v instanceof Set ? { ...o, v: [...o.v] } : o;
      fs.writeFileSync(FILE, JSON.stringify(out));
    } catch {}
  }, 150);
  if (timer.unref) timer.unref();
}
const live = k => { const o = load().get(k); if (!o) return null; if (o.x && o.x <= Date.now()) { M.delete(k); return null; } return o; };
const bucket = (k, t, mk) => { let o = live(k); if (!o) { o = { t, v: mk(), x: 0 }; M.set(k, o); } return o; };
const rng = (a, b, n) => { const s = a < 0 ? Math.max(0, n + a) : a, e = b < 0 ? n + b : Math.min(b, n - 1); return [s, e]; };

const file = {
  get: async k => { const o = live(k); return o && o.t === 's' ? dec(o.v) : null; },
  getRaw: async k => { const o = live(k); return o && o.t === 's' ? String(o.v) : null; },
  set: async (k, v, o = {}) => { if (o.nx && live(k)) return false; load().set(k, { t: 's', v: enc(v), x: o.ex ? Date.now() + o.ex * 1000 : 0 }); save(); return true; },
  del: async (...ks) => { let n = 0; for (const k of ks) if (live(k)) { M.delete(k); n++; } save(); return n; },
  incr: async k => { const o = live(k), n = (o ? Number(o.v) || 0 : 0) + 1; load().set(k, { t: 's', v: String(n), x: o ? o.x : 0 }); save(); return n; },
  incrx: async (k, ttl) => { if (!live(k)) load().set(k, { t: 's', v: '0', x: Date.now() + ttl * 1000 }); return file.incr(k); },
  expire: async (k, ttl) => { const o = live(k); if (o) { o.x = Date.now() + ttl * 1000; save(); } },
  persist: async ks => { for (const k of ks) { const o = live(k); if (o) o.x = 0; } save(); },
  sadd: async (k, ...m) => { const o = bucket(k, 'set', () => new Set()); let n = 0; for (const x of m.map(String)) if (!o.v.has(x)) { o.v.add(x); n++; } save(); return n; },
  srem: async (k, ...m) => { const o = live(k); let n = 0; if (o) for (const x of m.map(String)) if (o.v.delete(x)) n++; save(); return n; },
  smembers: async k => { const o = live(k); return o && o.t === 'set' ? [...o.v] : []; },
  sismember: async (k, m) => { const o = live(k); return !!(o && o.t === 'set' && o.v.has(String(m))); },
  scard: async k => { const o = live(k); return o && o.t === 'set' ? o.v.size : 0; },
  mget: async (...ks) => Promise.all(ks.map(k => file.get(k))),
  mgetRaw: async (...ks) => Promise.all(ks.map(k => file.getRaw(k))),
  hincrby: async (k, f, n = 1) => { const o = bucket(k, 'hash', () => ({})); o.v[f] = (Number(o.v[f]) || 0) + n; save(); return o.v[f]; },
  hgetall: async k => { const o = live(k); return o && o.t === 'hash' && Object.keys(o.v).length ? { ...o.v } : null; },
  pfadd: async (k, ...m) => { const o = bucket(k, 'hll', () => new Set()); let n = 0; for (const x of m.map(String)) if (!o.v.has(x)) { o.v.add(x); n = 1; } save(); return n; },
  pfcount: async k => { const o = live(k); return o && o.t === 'hll' ? o.v.size : 0; },
  lpush: async (k, ...v) => { const o = bucket(k, 'list', () => []); o.v.unshift(...v.map(enc).reverse()); save(); return o.v.length; },
  ltrim: async (k, a, b) => { const o = live(k); if (o && o.t === 'list') { const [s, e] = rng(a, b, o.v.length); o.v = o.v.slice(s, e + 1); save(); } },
  lrange: async (k, a, b) => { const o = live(k); if (!o || o.t !== 'list') return []; const [s, e] = rng(a, b, o.v.length); return o.v.slice(s, e + 1).map(dec); },
};

export const kv = kvReady ? redis : file;
export const __resetLocal = () => { M = new Map(); };

// เช็กว่าเขียน/อ่านได้จริง (ใช้ในหน้า /api/health)
export async function ping() {
  try { await kv.set('health', 1, { ex: 30 }); return { ok: (await kv.get('health')) === 1, error: '' }; }
  catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 160) }; }
}
