import { route, json, body } from '@/lib/api';
import { tx, HttpError } from '@/lib/db';
import { int, str } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { calcDiscount, couponProblem } from '@/lib/shop';

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const productId = int(b.productId, { min: 1, name: 'สินค้า' });
  const qty = int(b.qty, { min: 1, max: 50, name: 'จำนวน' });
  const code = str(b.coupon, { max: 40 }).toUpperCase();

  const result = await tx(async (c) => {
    // ล็อกแถวผู้ใช้ กันกดซื้อซ้อนหลายคำขอพร้อมกันแล้วยอดติดลบ
    const u = (await c.query('SELECT id,balance,banned FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
    if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    const p = (await c.query('SELECT id,name,price,type FROM products WHERE id=$1 AND active', [productId])).rows[0];
    if (!p) throw new HttpError(404, 'ไม่พบสินค้า');

    let coupon = null;
    if (code) {
      coupon = (await c.query('SELECT * FROM coupons WHERE code=$1 FOR UPDATE', [code])).rows[0];
      const bad = couponProblem(coupon);
      if (bad) throw new HttpError(400, bad);
    }
    const subtotal = p.price * qty;
    const discount = calcDiscount(coupon, subtotal);
    const total = subtotal - discount;
    if (u.balance < total) throw new HttpError(402, 'ยอดเงินคงเหลือไม่พอ กรุณาเติมเงินก่อน');

    const order = p.type === 'random' ? 'random()' : 's.id';
    const items = (
      await c.query(
        `SELECT s.id,s.content FROM stock_items s
          WHERE s.product_id=$1 AND NOT s.sold
          ORDER BY ${order} LIMIT $2 FOR UPDATE SKIP LOCKED`,
        [p.id, qty]
      )
    ).rows;
    if (items.length < qty) throw new HttpError(409, items.length ? `สินค้าเหลือเพียง ${items.length} ชิ้น` : 'สินค้าหมด');

    const o = (
      await c.query(
        `INSERT INTO orders(user_id,product_id,product_name,qty,unit_price,discount,total,coupon_code)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [u.id, p.id, p.name, qty, p.price, discount, total, coupon ? coupon.code : null]
      )
    ).rows[0];
    await c.query('UPDATE stock_items SET sold=TRUE, order_id=$1, sold_at=now() WHERE id = ANY($2::int[])', [
      o.id,
      items.map((i) => i.id),
    ]);
    const nb = (await c.query('UPDATE users SET balance = balance - $1 WHERE id=$2 RETURNING balance', [total, u.id])).rows[0]
      .balance;
    if (total > 0)
      await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [u.id, -total, `ซื้อ #${o.id} ${p.name} x${qty}`]);
    if (coupon) await c.query('UPDATE coupons SET used = used + 1 WHERE code=$1', [coupon.code]);
    return { orderId: o.id, items: items.map((i) => i.content), balance: nb, total };
  });
  return json(result);
});
