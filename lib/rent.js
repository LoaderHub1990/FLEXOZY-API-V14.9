import { q, one, HttpError } from './db';
import { RESERVED_SLUGS } from './reserved';
import { ADMIN_PATH } from './adminPath';
import { str, safeImage, safeUrl } from './util';
import { TEMPLATE_SLUGS } from './templates';
import { cleanPhone, validPhone } from './phone';

const SITE = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
export const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || new URL(SITE).hostname).toLowerCase().replace(/^www\./, '');
export const SUB_RE = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/; // 3-32 ตัว ขึ้นต้น/ลงท้ายด้วย a-z 0-9
export const GRACE_DAYS = 30; // หมดอายุแล้วเก็บชื่อไว้ให้เจ้าของเดิม 30 วัน ก่อนปล่อยให้คนอื่นจอง
const SUB_RESERVED = new Set([
  ...RESERVED_SLUGS, 'www', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'ns', 'ns1', 'ns2', 'mx', 'app', 'apps', 'static', 'cdn', 'assets', 'img', 'images',
  'rent', 'site', 'tenant', 'blog', 'dev', 'test', 'staging', 'demo', 'root', 'administrator', 'panel', 'cpanel', 'webmail', 'billing', 'pay', 'payment',
  'secure', 'login', 'signin', 'signup', 'auth', 'oauth', 'account', 'accounts', 'user', 'users', 'wallet', 'topup', 'discord', 'flexozy', 'hub', ADMIN_PATH,
]);

export const siteUrl = (sub) => `https://${sub}.${ROOT_DOMAIN}/`;

/** ตรวจชื่อเว็บ: คืน { ok, sub, reason } (reason = invalid | reserved) */
export function parseSub(v) {
  const sub = String(v || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(new RegExp(`\\.${ROOT_DOMAIN.replace(/\./g, '\\.')}.*$`), '').replace(/\/.*$/, '');
  if (!SUB_RE.test(sub) || sub.includes('--')) return { ok: false, sub, reason: 'invalid' };
  if (SUB_RESERVED.has(sub)) return { ok: false, sub, reason: 'reserved' };
  return { ok: true, sub };
}

export async function isSubFree(sub, c) {
  const run = c ? (t, p) => c.query(t, p) : q;
  const r = (await run('SELECT id,expires_at FROM rentals WHERE lower(sub)=$1', [sub])).rows[0];
  if (!r) return true;
  return new Date(r.expires_at).getTime() < Date.now() - GRACE_DAYS * 86400000; // หมดอายุเกิน 30 วัน → ปล่อยชื่อ
}

export async function getRentPlans({ all = false } = {}) {
  const { rows } = await q(`SELECT id,name,days,price,description,active,sort FROM rent_plans ${all ? '' : 'WHERE active'} ORDER BY sort,id`);
  return rows;
}

export function rentalState(r) {
  if (r.status === 'suspended') return 'suspended';
  return new Date(r.expires_at).getTime() > Date.now() ? 'active' : 'expired';
}

export async function rentalBySub(sub) {
  return one('SELECT * FROM rentals WHERE lower(sub)=lower($1)', [String(sub || '').slice(0, 40)]);
}

/* ---------- เนื้อหาหน้าเว็บของผู้เช่า (ตรวจและล้างค่าทุกครั้งก่อนเก็บ) ---------- */
const hexOr = (v) => { v = String(v || '').trim(); if (!v) return ''; if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new HttpError(400, 'สีต้องเป็นรูปแบบ #RRGGBB'); return v.toLowerCase(); };
export function cleanSite(b = {}) {
  const color = String(b.color || '#ffffff').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new HttpError(400, 'สีต้องเป็นรูปแบบ #RRGGBB');
  const links = (Array.isArray(b.links) ? b.links : []).slice(0, 6).map((l) => ({
    label: str(l?.label, { min: 1, max: 30, name: 'ชื่อปุ่ม' }),
    url: safeUrl(l?.url) || (() => { throw new HttpError(400, 'ใส่ลิงก์ให้ครบ'); })(),
  }));
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 24).map((i) => ({
    name: str(i?.name, { min: 1, max: 60, name: 'ชื่อรายการ' }),
    price: str(i?.price, { max: 24, name: 'ราคา' }),
    desc: str(i?.desc, { max: 200, name: 'รายละเอียด' }),
    image: safeImage(i?.image || ''),
  }));
  return {
    title: str(b.title, { max: 40, name: 'ชื่อเว็บ' }),
    tagline: str(b.tagline, { max: 120, name: 'คำโปรย' }),
    about: str(b.about, { max: 600, name: 'เกี่ยวกับ' }),
    closed: !!b.closed,
    closed_msg: str(b.closed_msg, { max: 200, name: 'ข้อความปิดร้าน' }),
    seo_desc: str(b.seo_desc, { max: 160, name: 'คำอธิบาย SEO' }),
    banner: safeImage(b.banner || ''),
    bg_image: safeImage(b.bg_image || ''),
    bg_dim: Math.min(90, Math.max(0, parseInt(b.bg_dim, 10) || 0)),
    font: ['kanit', 'prompt', 'noto'].includes(b.font) ? b.font : '',
    colors: { bg: hexOr(b.colors?.bg), surface: hexOr(b.colors?.surface), text: hexOr(b.colors?.text), border: hexOr(b.colors?.border) },
    announce: str(b.announce, { max: 200, name: 'ประกาศ' }),
    announce_en: str(b.announce_en, { max: 200, name: 'ประกาศ (EN)' }),
    title_en: str(b.title_en, { max: 40, name: 'ชื่อเว็บ (EN)' }),
    tagline_en: str(b.tagline_en, { max: 120, name: 'คำโปรย (EN)' }),
    about_en: str(b.about_en, { max: 600, name: 'เกี่ยวกับ (EN)' }),
    logo: safeImage(b.logo || ''),
    color: color.toLowerCase(),
    theme: b.theme === 'light' ? 'light' : 'dark',
    pay_phone: b.pay_phone ? (validPhone(b.pay_phone) ? cleanPhone(b.pay_phone) : (() => { throw new HttpError(400, 'เบอร์ TrueMoney ต้องเป็นเบอร์ 10 หลัก ขึ้นต้นด้วย 0'); })()) : '',
    template: TEMPLATE_SLUGS.includes(b.template) ? b.template : TEMPLATE_SLUGS[0],
    links, items,
  };
}

/** จำกัดอัตราแบบเบา (หน่วยความจำ) สำหรับเช็กชื่อเว็บ */
export function lightLimit(key, max, ms) {
  const m = (globalThis.__rentLim ||= new Map());
  const now = Date.now();
  const e = m.get(key);
  if (!e || e.reset < now) { m.set(key, { n: 1, reset: now + ms }); if (m.size > 5000) m.clear(); return; }
  if (++e.n > max) throw new HttpError(429, 'ตรวจบ่อยเกินไป กรุณารอสักครู่');
}
