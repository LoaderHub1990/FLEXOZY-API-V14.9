import { headers } from 'next/headers';

export const discordConfigured = () => !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

export const HUB_HOST = () => (process.env.HUB_HOST || 'shop.flexozy.site').trim().toLowerCase();

/** คำขอนี้เข้ามาทางโดเมนของ Hub (shop.flexozy.site) หรือไม่ */
export async function isHubHost() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(':')[0].toLowerCase();
  return host === HUB_HOST();
}

/** โดเมนของเว็บ (ใช้สร้าง redirect URI) — ตั้ง SITE_URL ได้ ถ้าไม่ตั้งจะอ่านจาก header · โดเมน Hub ใช้โดเมนของตัวเองเสมอ */
export async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host && host.startsWith('localhost') ? 'http' : 'https');
  if (await isHubHost()) return `${proto}://${host}`;
  const env = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  return `${proto}://${host}`;
}

export async function redirectUri() {
  const hub = await isHubHost();
  return (!hub && (process.env.DISCORD_REDIRECT_URI || '').trim()) || `${await siteOrigin()}/api/auth/discord/callback`;
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

/** ข้อมูลโปรไฟล์ที่แสดงบนเว็บ: รูปอัปโหลดเองมาก่อน ถ้าไม่มีใช้ของ Discord (รวมกรอบโปรไฟล์/แบนเนอร์) */
export function publicProfile(u) {
  if (!u) return null;
  const dc = publicDiscord(u);
  const avatar = u.avatar_ver ? `/api/media/${u.id}/avatar?v=${u.avatar_ver}` : dc?.avatar || null;
  const banner = u.banner_ver
    ? `/api/media/${u.id}/banner?v=${u.banner_ver}`
    : u.discord_id && u.discord_banner
      ? `https://cdn.discordapp.com/banners/${u.discord_id}/${u.discord_banner}.${u.discord_banner.startsWith('a_') ? 'gif' : 'png'}?size=600`
      : null;
  return {
    name: (u.display_name && u.display_name.trim()) || u.username,
    displayName: u.display_name || '',
    username: u.username,
    avatar,
    banner,
    accent: u.discord_accent || null,
    decoration: u.discord_id && u.discord_decoration ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.discord_decoration}.png?size=240&passthrough=true` : null,
    showFrame: u.show_frame !== false,
    customAvatar: !!u.avatar_ver,
    customBanner: !!u.banner_ver,
    discord: dc,
  };
}
