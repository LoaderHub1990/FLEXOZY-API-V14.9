import { route, json, body } from '@/lib/api';
import { one, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { calcDiscount, couponProblem } from '@/lib/shop';

export const POST = route(async (req) => {
  const b = await body(req);
  const code = str(b.code, { min: 1, max: 40, name: 'โค้ด' }).toUpperCase();
  const productId = int(b.productId, { min: 1, name: 'สินค้า' });
  const qty = int(b.qty, { min: 1, max: 50, name: 'จำนวน' });
  const p = await one('SELECT price FROM products WHERE id=$1 AND active', [productId]);
  if (!p) throw new HttpError(404, 'ไม่พบสินค้า');
  const c = await one('SELECT * FROM coupons WHERE code=$1', [code]);
  const bad = couponProblem(c);
  if (bad) throw new HttpError(400, bad);
  const subtotal = p.price * qty;
  const discount = calcDiscount(c, subtotal);
  return json({ discount, total: subtotal - discount });
});
