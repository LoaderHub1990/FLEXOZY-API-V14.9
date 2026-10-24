import { HttpError } from './db';

const API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n, ADMIN = 0x8n;

export const botToken = () => (process.env.DISCORD_BOT_TOKEN || '').trim();
const get = async (path, auth) => {
  const r = await fetch(API + path, { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  return r;
};

/** เซิร์ฟเวอร์ที่ผู้ใช้เป็นเจ้าของ / มีสิทธิ์ Manage Server (ใช้โทเคน OAuth scope guilds ตอนล็อกอิน) */
export async function manageableGuilds(accessToken) {
  const r = await get('/users/@me/guilds', `Bearer ${accessToken}`);
  if (r.status === 401) throw new HttpError(401, 'เซสชัน Discord หมดอายุ กรุณาออกจากระบบแล้วล็อกอินใหม่');
  if (!r.ok) throw new HttpError(502, 'ดึงรายชื่อเซิร์ฟเวอร์จาก Discord ไม่สำเร็จ');
  return (await r.json())
    .filter((g) => g.owner || (BigInt(g.permissions || 0) & (MANAGE_GUILD | ADMIN)) !== 0n)
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=96` : null }));
}

/** บอทอยู่ในเซิร์ฟเวอร์นี้ไหม — true/false หรือ null ถ้าไม่ได้ตั้ง DISCORD_BOT_TOKEN */
export async function botInGuild(id) {
  if (!botToken()) return null;
  try { return (await get(`/guilds/${id}`, `Bot ${botToken()}`)).ok; } catch { return null; }
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
