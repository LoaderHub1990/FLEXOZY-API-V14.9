import { NextResponse } from 'next/server';

// โดเมน Hub (สมัครร้านค้า): ตั้ง HUB_HOST ได้ ค่าเริ่มต้น shop.flexozy.site
const HUB = (process.env.HUB_HOST || 'shop.flexozy.site').toLowerCase();
const RESERVED = new Set(['api', '_next', 'uploads', 'favicon.ico', 'og.jpg', 'robots.txt', 'dashboard', 'hub']);

export function middleware(req) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  const { pathname } = req.nextUrl;
  const headers = new Headers(req.headers);
  const onHubHost = host === HUB;

  if (!onHubHost && pathname !== '/hub' && !pathname.startsWith('/hub/')) return NextResponse.next();

  headers.set('x-hub', '1');
  headers.set('x-hub-base', onHubHost ? '' : '/hub'); // ลิงก์ภายใน: โดเมน Hub ไม่ต้องมี /hub นำหน้า
  const go = (to) => {
    const url = req.nextUrl.clone();
    url.pathname = to;
    return NextResponse.rewrite(url, { request: { headers } });
  };
  if (onHubHost) {
    if (pathname === '/') return go('/hub');
    if (pathname === '/dashboard') return go('/hub/dashboard');
    const seg = pathname.split('/').filter(Boolean);
    if (seg.length === 1 && !RESERVED.has(seg[0]) && !seg[0].includes('.')) return go(`/hub/s/${seg[0]}`);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|uploads|favicon.ico).*)'] };
