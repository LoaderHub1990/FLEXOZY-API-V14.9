import crypto from 'crypto';
import { kv } from './db';

export { crypto };
export const E = process.env;
export const V = k => (E[k] || '').trim();
export const COOKIE = 'fx_s'; // session ล็อกอิน
export const WEEK = 7 * 864e5;

// ---------------------------------------------------------------- ความลับสำหรับเซ็น cookie
// SESSION_SECRET ถ้าไม่ตั้ง จะสร้างจากความลับอื่นของเซิร์ฟเวอร์ (ห้ามใช้ค่า default สาธารณะ ไม่งั้นใครก็ปลอม cookie แอดมินได้)
const S = V('SESSION_SECRET')
  || (V('DISCORD_CLIENT_SECRET') || V('KV_REST_API_TOKEN') || V('UPSTASH_REDIS_REST_TOKEN') || V('DISCORD_BOT_TOKEN')
    ? crypto.createHash('sha256').update(['flexozy', V('DISCORD_CLIENT_SECRET'), V('KV_REST_API_TOKEN'), V('UPSTASH_REDIS_REST_TOKEN'), V('DISCORD_BOT_TOKEN')].join('|')).digest('hex')
    : E.NODE_ENV === 'production' ? crypto.randomBytes(32).toString('hex') : 'dev-secret-local-only');
export const hmac = b => crypto.createHmac('sha256', S).update(b).digest('base64url');
export const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

export const sign = o => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + hmac(b); };
export const unsign = t => {
  try {
    const [b, m] = String(t || '').split('.');
    if (!b || !m) return;
    const x = hmac(b);
    if (m.length !== x.length || !crypto.timingSafeEqual(Buffer.from(m), Buffer.from(x))) return;
    const o = JSON.parse(Buffer.from(b, 'base64url'));
    if (o.e && o.e < Date.now()) return;
    return o;
  } catch {}
};

// ---------------------------------------------------------------- แอดมิน
export const ownerIds = () => (E.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean);
export const isOwner = id => ownerIds().includes(String(id));           // เจ้าของ (จาก env) ถอนสิทธิ์ไม่ได้
export async function isAdmin(id) {                                      // เจ้าของ + แอดมินที่เพิ่มในหน้า Admin
  if (!id) return false;
  if (isOwner(id)) return true;
  try { return await kv.sismember('admins', 'id:' + id); } catch { return false; }
}

// ---------------------------------------------------------------- ตัวช่วยทั่วไป
export const rnd = n => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: n }, () => c[crypto.randomInt(c.length)]).join(''); };
export const hex = n => crypto.randomBytes(n).toString('hex');
export const clean = (v, re, n) => String(v ?? '').trim().replace(re, '').slice(0, n);
export const clamp = (v, lo, hi) => { const n = Math.floor(+v); return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo)); };
export const url = v => { try { const u = new URL(String(v || '').trim()); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch { return ''; } };
export const safeNext = n => (typeof n === 'string' && /^\/($|[^/\\])/.test(n)) ? n : '/';
export const bkkDay = (t = Date.now()) => new Date(t + 7 * 36e5).toISOString().slice(0, 10); // วันตามเวลาไทย
export const live = k => !!k && !k.off && k.exp > Date.now();
// แปลงเวลาหมดอายุ (ms) เป็น Unix วินาที; ถ้าเป็นวินาทีอยู่แล้ว (<1e11) ก็ใช้ตามนั้น
export const toUnix = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n >= 1e11 ? n / 1000 : n) : 0; };
// Discord ID ยาว 18-19 หลัก: เก็บใน set ต้องใส่ prefix กันถูกแปลงเป็นตัวเลข
export const bk = x => /^\d+$/.test(String(x)) ? 'id:' + x : String(x);
export const unbk = x => String(x).replace(/^id:/, '');
export const snowflakeTime = id => { try { return Number((BigInt(id) >> 22n) + 1420070400000n); } catch { return 0; } };

// ---------------------------------------------------------------- โดเมนที่ใช้จริง
// cookie ต้องอยู่โดเมนเดียวกับตอนล็อกอิน จึงยึดโดเมนที่ผู้ใช้เข้ามา ไม่พึ่ง SITE_URL อย่างเดียว
const isLocal = h => /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/i.test(h);
export const cfgBase = () => { const m = (V('SITE_URL') || V('BASE_URL')).match(/^https?:\/\/[^/\s]+/i); return m && !/your-domain\.com/i.test(m[0]) ? m[0] : ''; };
export const pickBase = req => {
  const H = req.headers, u = new URL(req.url), first = v => String(v || '').split(',')[0].trim();
  const host = first(H.get('x-forwarded-host')) || first(H.get('host')) || u.host, proto = first(H.get('x-forwarded-proto')) || u.protocol.replace(':', '');
  const seen = proto + '://' + host, cfg = cfgBase();
  return cfg && isLocal(host) && !isLocal(cfg.split('://')[1]) ? cfg : seen; // หลัง proxy ที่ไม่ส่ง host มา → ใช้ SITE_URL
};
export const cookieOpts = base => ({ path: '/', httpOnly: true, sameSite: 'lax', secure: base.startsWith('https') });

// ---------------------------------------------------------------- ข้อมูลผู้ใช้จาก session
const ext = h => (h && h.startsWith('a_') ? 'gif' : 'png');
export function avatarUrl(id, hash) {
  if (hash) return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext(hash)}?size=256`;
  let i = 0; try { i = Number((BigInt(id) >> 22n) % 6n); } catch {}
  return `https://cdn.discordapp.com/embed/avatars/${i}.png`;
}
// โปรไฟล์ Discord → ข้อมูลย่อที่เก็บใน cookie (ไม่เกิน ~300 ไบต์)
export const packProfile = d => ({ id: d.id, n: d.global_name || d.username, u: d.username, a: d.avatar || null, b: d.banner || null, c: d.accent_color ?? null, d: d.avatar_decoration_data?.asset || null });
export const publicUser = p => ({
  id: p.id, name: p.n, username: p.u, avatar: avatarUrl(p.id, p.a),
  banner: p.b ? `https://cdn.discordapp.com/banners/${p.id}/${p.b}.${ext(p.b)}?size=600` : null,
  color: p.c != null ? '#' + Number(p.c).toString(16).padStart(6, '0') : null,
  decoration: p.d ? `https://cdn.discordapp.com/avatar-decoration-presets/${p.d}.png?size=240&passthrough=true` : null,
});
export const readSession = v => unsign(v);
