import fs from 'fs';
import path from 'path';
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOK}` }, body: JSON.stringify(cmd), cache: 'no-store' });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const FILE = path.join(process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.data'), 'db.json');
let mem = null;
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { mem = {}; }
  return mem;
}
function save() {
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(mem)); } catch {}
}
export async function get(k) {
  if (URL_ && TOK) { const v = await redis(['GET', k]); return v == null ? null : JSON.parse(v); }
  const v = load()[k]; return v === undefined ? null : v;
}
export async function set(k, v) {
  if (URL_ && TOK) { await redis(['SET', k, JSON.stringify(v)]); return; }
  load()[k] = v; save();
}
// คืน true ถ้าตั้งค่าได้ (ยังไม่เคยมี)
export async function setnx(k, v) {
  if (URL_ && TOK) return (await redis(['SETNX', k, JSON.stringify(v)])) === 1;
  const d = load(); if (k in d) return false; d[k] = v; save(); return true;
}
export async function incr(k) {
  if (URL_ && TOK) return Number(await redis(['INCR', k]));
  const d = load(); d[k] = (Number(d[k]) || 0) + 1; save(); return d[k];
}
const WIN = 5 * 60 * 1000;
export async function touch(id) {
  const now = Date.now();
  const p = (await get('presence')) || {};
  p[id] = now;
  for (const k of Object.keys(p)) if (now - p[k] > WIN) delete p[k];
  await set('presence', p);
}
export async function stats() {
  const now = Date.now();
  const p = (await get('presence')) || {};
  const active = Object.values(p).filter((t) => now - t <= WIN).length;
  return { creators: Number(await get('stat:creators')) || 0, active };
}
