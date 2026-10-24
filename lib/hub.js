import { q, one, HttpError } from './db';
import { RESERVED_SLUGS as RESERVED } from './reserved';

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,23}$/;
export const MAX_PRODUCTS = 25; // เมนูเลือกของ Discord รับได้สูงสุด 25 ตัวเลือก
export const MAX_STOCK_PER_ADD = 500;
export const MAX_MEDIA_BYTES = 1_500_000;
export const FEE_PERCENT = () => Math.min(50, Math.max(0, Number(process.env.SHOP_FEE_PERCENT || 0) || 0));

export const DEFAULT_BUTTONS = {
  buy: { label: 'ซื้อสินค้า', emoji: '🛒' },
  stock: { label: 'เช็คสต็อก', emoji: '📦' },
  balance: { label: 'ยอดเงิน', emoji: '💰' },
  topup: { label: 'เติมเงิน', emoji: '💳' },
};

export function cleanSlug(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!SLUG_RE.test(s)) throw new HttpError(400, 'ชื่อร้านในลิงก์ต้องเป็น a-z 0-9 และ - ยาว 3-24 ตัว');
  if (RESERVED.has(s)) throw new HttpError(400, 'ชื่อนี้สงวนไว้ กรุณาใช้ชื่ออื่น');
  return s;
}

/** สร้างลิงก์ร้านจากชื่อ Discord (username) เช่น Nac_Dev.01 → nac-dev-01 — ชนกัน/สงวน/สั้นไป จะต่อเลขสุ่มให้ */
export function slugFromDiscord(names, attempt = 0) {
  const rnd = () => String(Math.floor(1000 + Math.random() * 9000));
  const clean = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/g, '');
  // ลองทีละชื่อ (username → ชื่อที่แสดง → ชื่อบัญชีเว็บ) เอาอันแรกที่ใช้เป็นลิงก์ได้
  const username = [].concat(names).map(clean).find((n) => SLUG_RE.test(n) && !RESERVED.has(n)) || [].concat(names).map(clean).find(Boolean) || '';
  let b = String(username || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/g, '');
  if (!SLUG_RE.test(b) || RESERVED.has(b)) b = `shop-${rnd()}`; // สั้นไป / ไม่มีตัวอักษรอังกฤษ / ชื่อสงวน
  else if (attempt > 0) b = `${b.slice(0, 19).replace(/-+$/g, '')}-${rnd()}`;
  return b;
}

/** อีโมจิ: รับ <:ชื่อ:id> / <a:ชื่อ:id> (อีโมจิเซิร์ฟเวอร์) หรืออีโมจิ Unicode ปกติ — ว่างได้ */
const CUSTOM = /^<(a?):([A-Za-z0-9_]{2,32}):(\d{15,25})>$/;
const UNI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}\u200D\uFE0F\u20E3#*0-9]){1,14}$/u;
export function cleanEmoji(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (CUSTOM.test(s) || (s.length <= 24 && UNI.test(s) && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(s))) return s;
  throw new HttpError(400, 'อีโมจิไม่ถูกต้อง — ใส่อีโมจิปกติ หรือรูปแบบ <:ชื่อ:id> ที่คัดลอกจาก Discord');
}
export function emojiInfo(s) {
  const m = CUSTOM.exec(s || '');
  if (m) return { custom: true, animated: !!m[1], name: m[2], id: m[3], url: `https://cdn.discordapp.com/emojis/${m[3]}.${m[1] ? 'gif' : 'webp'}?size=64&quality=lossless` };
  return s ? { custom: false, char: s } : null;
}

export function cleanColor(v) {
  const s = String(v || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) throw new HttpError(400, 'สีต้องเป็นรูปแบบ #RRGGBB');
  return s.toLowerCase();
}

export function cleanButtons(v) {
  const out = {};
  for (const k of Object.keys(DEFAULT_BUTTONS)) {
    const b = (v && typeof v === 'object' && v[k]) || {};
    const label = String(b.label ?? DEFAULT_BUTTONS[k].label).trim();
    if (!label || label.length > 40) throw new HttpError(400, 'ชื่อปุ่มต้องยาว 1-40 ตัวอักษร');
    out[k] = { label, emoji: cleanEmoji(b.emoji ?? DEFAULT_BUTTONS[k].emoji) };
  }
  return out;
}
export const mergeButtons = (stored) => {
  const out = {};
  for (const k of Object.keys(DEFAULT_BUTTONS)) out[k] = { ...DEFAULT_BUTTONS[k], ...((stored && stored[k]) || {}) };
  return out;
};

/** เพิ่มเลขเวอร์ชันของร้าน — บอทและหน้าเว็บใช้เทียบว่ามีอะไรเปลี่ยน (เรียลไทม์) */
export async function bump(c, shopId) {
  await c.query('UPDATE shops SET version=version+1, updated_at=now() WHERE id=$1', [shopId]);
}

const PRODUCT_SQL = `
  SELECT p.id,p.name,p.price,p.description,p.emoji,p.sort,p.active,
         (SELECT count(*)::int FROM shop_stock s WHERE s.product_id=p.id AND NOT s.sold) AS stock,
         (SELECT count(*)::int FROM shop_stock s WHERE s.product_id=p.id AND s.sold) AS sold
    FROM shop_products p WHERE p.shop_id=$1 ORDER BY p.sort,p.id`;

export async function shopProducts(shopId) {
  return (await q(PRODUCT_SQL, [shopId])).rows;
}

export function mediaUrl(shop, kind) {
  const url = kind === 'logo' ? shop.logo_url : shop.banner_url;
  if (url === 'upload') return `/api/v1/shop/${shop.slug}/media/${kind}?v=${shop.version}`;
  return url || '';
}

/** รูปแบบข้อมูลสาธารณะ (API เช็คสต็อก + หน้าร้าน + บอท) */
export function publicShop(shop, products, { origin = '' } = {}) {
  const abs = (u) => (u && u.startsWith('/') ? origin + u : u);
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    color: shop.color,
    logo: abs(mediaUrl(shop, 'logo')) || null,
    banner: abs(mediaUrl(shop, 'banner')) || null,
    buttons: mergeButtons(shop.buttons),
    version: Number(shop.version),
    updated_at: new Date(shop.updated_at).toISOString(),
    products: products
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price), // สตางค์
        price_baht: Number(p.price) / 100,
        emoji: p.emoji || null,
        emoji_info: emojiInfo(p.emoji),
        stock: p.stock,
        sold: p.sold,
        in_stock: p.stock > 0,
      })),
  };
}

export async function shopBySlug(slug) {
  return one('SELECT * FROM shops WHERE lower(slug)=lower($1) AND active', [String(slug || '').slice(0, 40)]);
}

/** ตอบ API สาธารณะ: เปิด CORS + แคชสั้นๆ ที่ CDN (เรียลไทม์ ~2 วินาที) */
export function pub(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5',
      ...extra,
    },
  });
}

/** ข้อมูลเพิ่มเติมที่ส่งให้เฉพาะบอท (ส่ง Authorization: Bot <key>) — บอทใช้สร้างไฟล์ data/guilds/<guildId>.json เอง */
export function botView(shop, ownerDiscordId) {
  return {
    guild_id: shop.guild_id || null,
    channel_id: shop.channel_id || null,
    verified: !!shop.guild_verified,
    owner_discord_id: ownerDiscordId || null,
    topup: { enabled: !!shop.topup_enabled && /^0\d{9}$/.test(shop.topup_phone || ''), phone: shop.topup_phone || '' },
  };
}
export const NO_STORE = { 'Cache-Control': 'private, no-store' };
