import { q } from '@/lib/db';
import { pub, botView, publicShop, shopProducts, NO_STORE } from '@/lib/hub';
import { botAuthorized } from '@/lib/auth';
import { POST as botStatus } from '@/app/api/bot/shops/route';
import { POST as botBuy } from '@/app/api/bot/shop/buy/route';

export const dynamic = 'force-dynamic';

// GET /api/v1/shop — รายชื่อร้านที่เปิดสาธารณะ (สรุปสต็อกรวม)
export async function GET(req) {
  try {
    // บอท (Authorization: Bot <key>): ได้ร้านที่ผูกเซิร์ฟเวอร์แล้วทั้งหมด พร้อมสินค้า/สต็อก/อีโมจิ/ห้อง/เบอร์รับเงิน ใน request เดียว
    if (await botAuthorized()) {
      const origin = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
      const { rows } = await q(`SELECT s.*,u.discord_id AS owner_discord_id FROM shops s JOIN users u ON u.id=s.owner_id
        WHERE s.active AND NOT u.banned AND s.guild_id IS NOT NULL ORDER BY s.id`);
      const shops = [];
      for (const s of rows) shops.push({ ...publicShop(s, await shopProducts(s.id), { origin }), bot: botView(s, s.owner_discord_id) });
      return pub({ ok: true, count: shops.length, shops }, 200, NO_STORE);
    }
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

// บอทส่งคำสั่งเข้าทางเดียวกัน: { action: 'status', guildId, inGuild, verified, guildName, note } หรือ { action: 'buy', guildId, productId, qty }
// (ซื้อใช้ Authorization: Bot <key> + X-Discord-Id ของผู้ซื้อ)
export async function POST(req) {
  let action = '';
  try { action = String((await req.clone().json()).action || 'status'); } catch {}
  const res = await (action === 'buy' ? botBuy(req) : botStatus(req));
  return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE } });
}
export const OPTIONS = () => new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Discord-Id' } });
