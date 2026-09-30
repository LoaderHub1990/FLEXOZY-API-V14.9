import crypto from 'crypto';
import * as db from './db';
export const COOKIE = 'fx_s';
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
    return 'dev-only-secret';
  }
  return s;
}
const b64 = (b) => Buffer.from(b).toString('base64url');
const mac = (d) => crypto.createHmac('sha256', secret()).update(d).digest('base64url');
export function signSession(uid) {
  const body = b64(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 }));
  return `${body}.${mac(body)}`;
}
export function readSession(v) {
  try {
    if (!v) return null;
    const [body, sig] = v.split('.');
    const a = Buffer.from(sig || ''), b = Buffer.from(mac(body));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const j = JSON.parse(Buffer.from(body, 'base64url').toString());
    return j.exp > Date.now() ? j.uid : null;
  } catch { return null; }
}
export const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');
// รองรับทั้ง API Key (x-api-key / Bearer) และ session ของเว็บ
export async function getUser(req) {
  let uid = null;
  const h = req.headers.get('authorization') || '';
  const key = req.headers.get('x-api-key') || (h.startsWith('Bearer ') ? h.slice(7) : '');
  if (key) uid = await db.get('key:' + hashKey(key.trim()));
  else uid = readSession(req.cookies.get(COOKIE)?.value);
  if (!uid) return null;
  const user = await db.get('user:' + uid);
  return user || null;
}
export function publicUser(u) {
  const ext = (h) => (h && h.startsWith('a_') ? 'gif' : 'png');
  let idx = 0;
  try { idx = Number((BigInt(u.id) >> 22n) % 6n); } catch {}
  return {
    id: u.id,
    name: u.global_name || u.username,
    username: u.username,
    color: u.accent_color != null ? '#' + Number(u.accent_color).toString(16).padStart(6, '0') : null,
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext(u.avatar)}?size=256` : `https://cdn.discordapp.com/embed/avatars/${idx}.png`,
    banner: u.banner ? `https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${ext(u.banner)}?size=600` : null,
    decoration: u.avatar_decoration_data?.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=240&passthrough=true` : null,
    apiKey: u.apiKey || null,
    createdAt: u.createdAt || null,
  };
}
