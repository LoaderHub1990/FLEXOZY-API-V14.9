import { NextResponse } from 'next/server';
import { RESERVED_SLUGS } from './lib/reserved.js';
import { ADMIN_PATH } from './lib/adminPath.js';
import { TEMPLATE_SLUGS } from './lib/templates';

// Hub (ร้านค้าบอท Discord) อยู่บนโดเมนหลักเดียวกัน:
//   flexozy.site/shop/login      → หน้าล็อกอิน/สมัคร
//   flexozy.site/shop/dashboard  → แดชบอร์ดเจ้าของร้าน
//   flexozy.site/<ชื่อ Discord>  → หน้าร้านสาธารณะ
// โค้ดหน้าเว็บจริงอยู่ที่ app/hub/* (rewrite ภายใน ผู้ใช้ไม่เห็น /hub ใน URL)
const SITE = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
// โดเมนเก่า (shop.flexozy.site) — ถ้ายังชี้มาที่โปรเจกต์นี้ จะเด้งไปโดเมนหลักให้อัตโนมัติ ตั้ง HUB_HOST= (ว่าง) เพื่อปิด
const LEGACY_HOST = (process.env.HUB_HOST ?? 'shop.flexozy.site').trim().toLowerCase();
const BASE = '/shop';
// เว็บที่ลูกค้าเช่า: <ชื่อ>.<ROOT_DOMAIN> → หน้า /tenant/<ชื่อ> (ต้องตั้ง Wildcard domain *.โดเมน ที่ Vercel)
const ROOT = (process.env.ROOT_DOMAIN || new URL(SITE).hostname).toLowerCase().replace(/^www\./, '');
const SUB_RE = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;

export function middleware(req) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  const { pathname, search } = req.nextUrl;
  const seg = pathname.split('/').filter(Boolean);
  const redirect = (to) => NextResponse.redirect(`${SITE}${to}${search}`, 308);

  // โดเมนเก่า → โดเมนหลัก (ไม่แตะ /api เพราะบอท/OAuth เดิมอาจยังเรียกอยู่)
  if (LEGACY_HOST && host === LEGACY_HOST && seg[0] !== 'api' && seg[0] !== '_next' && seg[0] !== 'uploads') {
    if (!seg.length) return redirect(`${BASE}/login`);
    if (seg[0] === 'dashboard') return redirect(`${BASE}/dashboard`);
    return redirect(pathname);
  }

  // เว็บเช่า (โดเมนย่อย) — ไม่แตะ /api /_next /uploads
  if (host.endsWith('.' + ROOT) && seg[0] !== 'api' && seg[0] !== '_next' && seg[0] !== 'uploads') {
    const sub = host.slice(0, -(ROOT.length + 1));
    if (SUB_RE.test(sub) && !RESERVED_SLUGS.has(sub) && sub !== 'www') {
      const h = new Headers(req.headers);
      h.set('x-tenant', '1');
      const url = req.nextUrl.clone();
      url.pathname = `/tenant/${sub}`;
      return NextResponse.rewrite(url, { request: { headers: h } });
    }
  }
  // ตัวอย่างเว็บเช่าบนโดเมนหลัก: /site/<ชื่อ> (ใช้ดูได้ก่อน DNS พร้อม) · ห้ามเข้า /tenant ตรงๆ
  if (seg[0] === 'site' && seg.length === 2 && SUB_RE.test(seg[1].toLowerCase())) {
    const h = new Headers(req.headers);
    h.set('x-tenant', '1');
    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${seg[1].toLowerCase()}`;
    return NextResponse.rewrite(url, { request: { headers: h } });
  }
  // หน้าตัวอย่างแม่แบบ: https://โดเมนหลัก/aurora ฯลฯ
  if (seg.length === 1 && TEMPLATE_SLUGS.includes(seg[0].toLowerCase())) {
    const h = new Headers(req.headers);
    h.set('x-tenant', '1');
    const url = req.nextUrl.clone();
    url.pathname = `/tenant/~${seg[0].toLowerCase()}`;
    return NextResponse.rewrite(url, { request: { headers: h } });
  }
  if (seg[0] === 'tenant') {
    const url = req.nextUrl.clone();
    url.pathname = '/__not_found__';
    return NextResponse.rewrite(url);
  }

  // เส้นทางภายในเก่า /hub/... → ลิงก์ใหม่
  if (seg[0] === 'hub') {
    if (seg.length === 1) return redirect(`${BASE}/login`);
    if (seg[1] === 'dashboard') return redirect(`${BASE}/dashboard`);
    if (seg[1] === 's' && seg[2]) return redirect(`/${seg[2]}`);
    return redirect(`${BASE}/login`);
  }

  // หลังบ้าน: เข้าได้เฉพาะ /<ADMIN_PATH> (rewrite ไป app/admin) ส่วน /admin ตรงๆ ตอบ 404
  if (seg.length === 1 && seg[0].toLowerCase() === ADMIN_PATH) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.rewrite(url);
  }
  if (seg[0] && seg[0].toLowerCase() === 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/__not_found__';
    return NextResponse.rewrite(url);
  }

  const headers = new Headers(req.headers);
  const go = (to) => {
    headers.set('x-hub', '1');
    headers.set('x-hub-base', BASE);
    const url = req.nextUrl.clone();
    url.pathname = to;
    return NextResponse.rewrite(url, { request: { headers } });
  };

  if (seg[0] === 'shop') {
    if (seg.length === 1) return redirect(`${BASE}/login`);
    if (seg.length === 2 && seg[1] === 'login') return go('/hub');
    if (seg.length === 2 && seg[1] === 'dashboard') return go('/hub/dashboard');
    return NextResponse.next(); // /shop/อื่นๆ → 404 ปกติ
  }

  // flexozy.site/<ชื่อร้าน> (1 ส่วน, ไม่ใช่ชื่อสงวน, ไม่มีจุด)
  if (seg.length === 1 && !RESERVED_SLUGS.has(seg[0].toLowerCase()) && !seg[0].includes('.')) {
    return go(`/hub/s/${seg[0]}`);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|uploads|favicon.ico).*)'] };
