import { HttpError } from './db';

const API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n, ADMIN = 0x8n;

export const botToken = () => (process.env.DISCORD_BOT_TOKEN || '').trim();
const get = async (path, auth) => {
  const r = await fetch(API + path, { headers: { Authorization: auth, 'User-Agent': 'DiscordBot (https://flexozy.site, 1.0)' }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  return r;
};

/** เซิร์ฟเวอร์ที่ผู้ใช้เป็นเจ้าของ / มีสิทธิ์ Manage Server (ใช้โทเคน OAuth scope guilds ตอนล็อกอิน) */
export async function manageableGuilds(accessToken) {
  const r = await get('/users/@me/guilds', `Bearer ${accessToken}`);
  if (r.status === 401 || r.status === 403) throw new HttpError(401, 'สิทธิ์ดูรายชื่อเซิร์ฟเวอร์หมดอายุหรือยังไม่ได้อนุญาต (เปลี่ยนแอป/บอทแล้วต้องล็อกอินใหม่) กรุณากดล็อกอินใหม่');
  if (r.status === 429) throw new HttpError(429, 'Discord จำกัดความถี่ชั่วคราว กรุณารอสักครู่แล้วรีเฟรช');
  if (!r.ok) throw new HttpError(502, `ดึงรายชื่อเซิร์ฟเวอร์จาก Discord ไม่สำเร็จ (HTTP ${r.status})`);
  return (await r.json())
    .filter((g) => g.owner || (BigInt(g.permissions || 0) & (MANAGE_GUILD | ADMIN)) !== 0n)
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=96` : null }));
}

/** บอทอยู่ในเซิร์ฟเวอร์นี้ไหม — true/false หรือ null (ไม่ทราบ: ไม่ได้ตั้ง DISCORD_BOT_TOKEN / Discord จำกัดความถี่ / เน็ตหลุด)
 *  เดิมถือว่า "ไม่ ok = ไม่มีบอท" ทำให้ตอนเช็กหลายเซิร์ฟเวอร์พร้อมกันแล้วโดน 429 เซิร์ฟเวอร์ที่มีบอทอยู่ถูกแสดงว่า "ยังไม่มีบอท" */
const botCache = new Map(); // guildId -> { v, at }
export async function botInGuild(id) {
  if (!botToken()) return null;
  const hit = botCache.get(id);
  if (hit && Date.now() - hit.at < (hit.v === true ? 60_000 : 15_000)) return hit.v;
  try {
    const r = await get(`/guilds/${id}`, `Bot ${botToken()}`);
    let v = null;
    if (r.ok) v = true;
    else if (r.status === 403 || r.status === 404) v = false;
    if (v === null && r.status === 429) await new Promise((res) => setTimeout(res, Math.min(2000, (Number(r.headers.get('retry-after')) || 1) * 1000)));
    if (v !== null) { botCache.set(id, { v, at: Date.now() }); if (botCache.size > 500) botCache.delete(botCache.keys().next().value); }
    return v;
  } catch { return null; }
}

/** เช็กบอทหลายเซิร์ฟเวอร์ทีละไม่เกิน n ตัว (ไม่ยิงพร้อมกัน 100 ตัวจนโดน rate limit) */
export async function botInGuilds(list, n = 6) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) { const k = i++; out[k] = await botInGuild(list[k].id); }
  }));
  return out;
}

/** อีโมจิ (รวมแบบเคลื่อนไหว) + ห้องข้อความของเซิร์ฟเวอร์ ผ่านบอท */
export async function guildDetails(id) {
  if (!botToken()) throw new HttpError(503, 'ผู้ดูแลยังไม่ได้ตั้ง DISCORD_BOT_TOKEN');
  const [er, cr] = await Promise.all([get(`/guilds/${id}/emojis`, `Bot ${botToken()}`), get(`/guilds/${id}/channels`, `Bot ${botToken()}`)]);
  if (er.status === 403 || er.status === 404) throw new HttpError(409, 'บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้ — กดเชิญบอทก่อน');
  if (!er.ok || !cr.ok) throw new HttpError(502, 'ดึงข้อมูลเซิร์ฟเวอร์ไม่สำเร็จ');
  const emojis = (await er.json()).filter((e) => e.available !== false).map((e) => ({
    id: e.id, name: e.name, animated: !!e.animated,
    value: `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`,
    url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'webp'}?size=64&quality=lossless`,
  }));
  const channels = (await cr.json()).filter((c) => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, name: c.name }));
  return { emojis, channels };
}
