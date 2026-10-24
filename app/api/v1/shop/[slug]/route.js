import { shopBySlug, shopProducts, publicShop, pub } from '@/lib/hub';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/v1/shop/{slug}  — ข้อมูลร้าน + สินค้า + สต็อกแบบสด (เพิ่ม ?since=<version> เพื่อเช็กว่ามีอะไรเปลี่ยนไหม)
export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    const shop = await shopBySlug(slug);
    if (!shop) return pub({ ok: false, error: 'not_found' }, 404, { 'Cache-Control': 'no-store' });
    const since = Number(new URL(req.url).searchParams.get('since'));
    if (since && since === Number(shop.version)) return pub({ ok: true, unchanged: true, version: since });
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const origin = `${h.get('x-forwarded-proto') || 'https'}://${host}`;
    return pub({ ok: true, shop: publicShop(shop, await shopProducts(shop.id), { origin }) });
  } catch (e) {
    console.error(e);
    return pub({ ok: false, error: 'server_error' }, 500, { 'Cache-Control': 'no-store' });
  }
}
export const OPTIONS = () => new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' } });
