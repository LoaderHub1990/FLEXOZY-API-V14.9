import { NextResponse } from 'next/server';
import { RESERVED_SLUGS } from './lib/reserved.js';

// Hub (ร้านค้าบอท Discord) อยู่บนโดเมนหลักเดียวกัน:
//   flexozy.site/shop/login      → หน้าล็อกอิน/สมัคร
//   flexozy.site/shop/dashboard  → แดชบอร์ดเจ้าของร้าน
//   flexozy.site/<ชื่อ Discord>  → หน้าร้านสาธารณะ
// โค้ดหน้าเว็บจริงอยู่ที่ app/hub/* (rewrite ภายใน ผู้ใช้ไม่เห็น /hub ใน URL)
const SITE = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
// โดเมนเก่า (shop.flexozy.site) — ถ้ายังชี้มาที่โปรเจกต์นี้ จะเด้งไปโดเมนหลักให้อัตโนมัติ ตั้ง HUB_HOST= (ว่าง) เพื่อปิด
const LEGACY_HOST = (process.env.HUB_HOST ?? 'shop.flexozy.site').trim().toLowerCase();
const BASE = '/shop';

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

  // เส้นทางภายในเก่า /hub/... → ลิงก์ใหม่
  if (seg[0] === 'hub') {
    if (seg.length === 1) return redirect(`${BASE}/login`);
    if (seg[1] === 'dashboard') return redirect(`${BASE}/dashboard`);
    if (seg[1] === 's' && seg[2]) return redirect(`/${seg[2]}`);
    return redirect(`${BASE}/login`);
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
