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
const safeEq = (x, y) => { const a = Buffer.from(String(x)), b = Buffer.from(String(y)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

// ---------- Session (เก็บโปรไฟล์ไว้ในคุกกี้ที่เซ็นแล้ว ล็อกอินได้แม้ฐานข้อมูลยังไม่พร้อม) ----------
export function signSession(profile, kv = 0) {
  const body = b64(JSON.stringify({
    uid: profile.id, kv, exp: Date.now() + 30 * 864e5,
    p: { id: profile.id, username: profile.username, global_name: profile.global_name, avatar: profile.avatar, banner: profile.banner, accent_color: profile.accent_color, avatar_decoration_data: profile.avatar_decoration_data || null },
  }));
  return `${body}.${mac(body)}`;
}
export function parseSession(v) {
  try {
    if (!v) return null;
    const [body, sig] = v.split('.');
    if (!body || !sig || !safeEq(sig, mac(body))) return null;
    const j = JSON.parse(Buffer.from(body, 'base64url').toString());
    return j.exp > Date.now() && j.uid ? j : null;
  } catch { return null; }
}
export const readSession = (v) => parseSession(v)?.uid || null;
export const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

// ---------- API Key (ตรวจลายเซ็นได้เองไม่ต้องพึ่งฐานข้อมูล) ----------
export function makeKey(uid, ver) {
  const head = `${b64(uid)}.${ver}`;
  return `fx_${head}.${mac('key:' + head).slice(0, 32)}`;
}
function parseKey(k) {
  const m = /^fx_([\w-]+)\.(\d+)\.([\w-]{32})$/.exec(k);
  if (!m) return null;
  const head = `${m[1]}.${m[2]}`;
  if (!safeEq(m[3], mac('key:' + head).slice(0, 32))) return null;
  return { uid: Buffer.from(m[1], 'base64url').toString(), ver: Number(m[2]) };
}

// รองรับทั้ง API Key (x-api-key / Bearer) และ session ของเว็บ
export async function getUser(req) {
  const h = req.headers.get('authorization') || '';
  const key = (req.headers.get('x-api-key') || (h.startsWith('Bearer ') ? h.slice(7) : '')).trim();
  if (key) {
    const pk = parseKey(key);
    if (pk) {
      const u = await db.get('user:' + pk.uid).catch(() => null);
      if (u && (u.keyVer ?? -1) !== pk.ver) return null; // คีย์เก่าถูกแทนที่แล้ว
      return u || { id: pk.uid, username: pk.uid, keyVer: pk.ver };
    }
    const uid = await db.get('key:' + hashKey(key)).catch(() => null); // คีย์รุ่นเก่า
    return uid ? (await db.get('user:' + uid).catch(() => null)) : null;
  }
  const s = parseSession(req.cookies.get(COOKIE)?.value);
  if (!s) return null;
  const stored = await db.get('user:' + s.uid).catch(() => null);
  return { ...s.p, ...(stored || {}), id: s.uid, keyVer: stored?.keyVer ?? (s.kv > 0 ? s.kv : undefined) };
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
    apiKey: u.keyVer != null ? makeKey(u.id, u.keyVer) : (u.apiKey || null),
    createdAt: u.createdAt || null,
  };
}
