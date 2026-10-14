import { headers } from 'next/headers';

export const discordConfigured = () => !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

/** โดเมนของเว็บ (ใช้สร้าง redirect URI) — ตั้ง SITE_URL ได้ ถ้าไม่ตั้งจะอ่านจาก header */
export async function siteOrigin() {
  const env = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host && host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function redirectUri() {
  return (process.env.DISCORD_REDIRECT_URI || '').trim() || `${await siteOrigin()}/api/auth/discord/callback`;
}

/** รูปโปรไฟล์ Discord (ถ้าไม่มีรูปใช้รูปเริ่มต้นของ Discord) */
export function discordAvatarUrl(id, hash, size = 128) {
  if (!id) return null;
  if (hash) return `https://cdn.discordapp.com/avatars/${id}/${hash}.${hash.startsWith('a_') ? 'gif' : 'png'}?size=${size}`;
  const idx = Number((BigInt(id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export const discordProfileUrl = (id) => (id ? `https://discord.com/users/${id}` : null);

/** ข้อมูล Discord ที่ปลอดภัยส่งให้ฝั่งเบราว์เซอร์ */
export function publicDiscord(u) {
  if (!u || !u.discord_id) return null;
  return {
    id: u.discord_id,
    username: u.discord_username || '',
    name: u.discord_name || u.discord_username || '',
    avatar: discordAvatarUrl(u.discord_id, u.discord_avatar),
    profileUrl: discordProfileUrl(u.discord_id),
  };
}
