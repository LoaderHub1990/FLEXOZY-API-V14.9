import { route, json, body } from '@/lib/api';
import { tx, HttpError } from '@/lib/db';
import { int } from '@/lib/util';
import { requireUser, rateLimit, recordAttempt } from '@/lib/auth';
import { bump, FEE_PERCENT } from '@/lib/hub';

export const dynamic = 'force-dynamic';

// บอท (Authorization: Bot <key> + X-Discord-Id ของผู้ซื้อ): ซื้อสินค้าของร้านในเซิร์ฟเวอร์นั้น
// หักจากกระเป๋าเงินเดียวกับเว็บ (เติมเงินที่เว็บหรือผ่านบอทก็ได้) แล้วโอนเข้ากระเป๋าเจ้าของร้าน (หักค่าธรรมเนียมตาม SHOP_FEE_PERCENT)
export const POST = route(async (req) => {
  const buyer = await requireUser();
  await rateLimit(`shopbuy:${buyer.id}`, 30, 10);
  await recordAttempt(`shopbuy:${buyer.id}`);
  const b = await body(req);
  const guildId = String(b.guildId || '');
  if (!/^\d{15,25}$/.test(guildId)) throw new HttpError(400, 'guildId ไม่ถูกต้อง');
  const productId = int(b.productId, { min: 1, name: 'สินค้า' });
  const qty = int(b.qty ?? 1, { min: 1, max: 20, name: 'จำนวน' });

  const out = await tx(async (c) => {
    const shop = (await c.query(
      `SELECT s.id,s.owner_id,s.name FROM shops s JOIN users u ON u.id=s.owner_id
        WHERE s.guild_id=$1 AND s.guild_verified AND s.active AND NOT u.banned`, [guildId])).rows[0];
    if (!shop) throw new HttpError(404, 'ร้านนี้ยังไม่เปิดให้บริการ');
    // ล็อกกระเป๋าเงินทั้งสองฝั่งตามลำดับ id กัน deadlock
    const ids = [...new Set([buyer.id, shop.owner_id])].sort((x, y) => x - y);
    const users = (await c.query('SELECT id,balance,banned FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [ids])).rows;
    const me = users.find((u) => u.id === buyer.id);
    if (!me || me.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    const p = (await c.query('SELECT id,name,price FROM shop_products WHERE id=$1 AND shop_id=$2 AND active', [productId, shop.id])).rows[0];
    if (!p) throw new HttpError(404, 'ไม่พบสินค้า');
    const total = Number(p.price) * qty;
    if (Number(me.balance) < total) throw new HttpError(402, 'ยอดเงินคงเหลือไม่พอ กรุณาเติมเงินก่อน');
    const items = (await c.query(
      'SELECT id,content FROM shop_stock WHERE product_id=$1 AND NOT sold ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED', [p.id, qty])).rows;
    if (items.length < qty) throw new HttpError(409, items.length ? `สินค้าเหลือเพียง ${items.length} ชิ้น` : 'สินค้าหมด');

    const fee = Math.floor((total * FEE_PERCENT()) / 100);
    const o = (await c.query(
      `INSERT INTO shop_orders(shop_id,product_id,product_name,buyer_id,buyer_discord_id,qty,total,fee) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [shop.id, p.id, p.name, buyer.id, buyer.discord_id, qty, total, fee])).rows[0];
    await c.query('UPDATE shop_stock SET sold=TRUE,order_id=$1,sold_at=now() WHERE id = ANY($2::int[])', [o.id, items.map((i) => i.id)]);
    const nb = (await c.query('UPDATE users SET balance=balance-$1 WHERE id=$2 RETURNING balance', [total, buyer.id])).rows[0].balance;
    await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [buyer.id, -total, `ซื้อ ${p.name} x${qty} จากร้าน ${shop.name} (#S${o.id})`]);
    await c.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [total - fee, shop.owner_id]);
    await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [shop.owner_id, total - fee, `ขาย ${p.name} x${qty} (#S${o.id})${fee ? ` หักค่าธรรมเนียม ${fee / 100} บาท` : ''}`]);
    await bump(c, shop.id);
    return { orderId: o.id, product: p.name, qty, total, balance: Number(nb), items: items.map((i) => i.content) };
  });
  return json(out);
});
