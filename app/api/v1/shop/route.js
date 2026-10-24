import { q } from '@/lib/db';
import { pub } from '@/lib/hub';

export const dynamic = 'force-dynamic';

// GET /api/v1/shop — รายชื่อร้านที่เปิดสาธารณะ (สรุปสต็อกรวม)
export async function GET() {
  try {
    const { rows } = await q(
      `SELECT s.slug,s.name,s.tagline,s.version,
              (SELECT count(*)::int FROM shop_products p WHERE p.shop_id=s.id AND p.active) AS products,
              (SELECT count(*)::int FROM shop_stock k JOIN shop_products p ON p.id=k.product_id WHERE p.shop_id=s.id AND p.active AND NOT k.sold) AS in_stock
         FROM shops s WHERE s.active AND s.is_public ORDER BY s.id DESC LIMIT 200`
    );
    return pub({ ok: true, count: rows.length, shops: rows.map((r) => ({ ...r, version: Number(r.version), url: `/api/v1/shop/${r.slug}` })) });
  } catch (e) {
    console.error(e);
    return pub({ ok: false, error: 'server_error' }, 500, { 'Cache-Control': 'no-store' });
  }
}
export const OPTIONS = () => new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' } });
