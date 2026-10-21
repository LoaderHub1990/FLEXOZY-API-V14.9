import { route, json, body } from '@/lib/api';
import { q, one, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { requireUser, rateLimit, recordAttempt } from '@/lib/auth';

/** รีวิวสินค้า: เฉพาะเจ้าของออเดอร์ และ 1 ออเดอร์รีวิวได้ 1 ครั้ง */
export const POST = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  const orderId = int(b.orderId, { min: 1, name: 'ออเดอร์' });
  const rating = int(b.rating, { min: 1, max: 5, name: 'คะแนน' });
  const comment = str(String(b.comment ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ''), { min: 5, max: 300, name: 'ข้อความรีวิว' });

  const key = `review:${u.id}`;
  await rateLimit(key, 10, 60);
  await recordAttempt(key);

  const o = await one('SELECT id,product_name FROM orders WHERE id=$1 AND user_id=$2', [orderId, u.id]);
  if (!o) throw new HttpError(404, 'ไม่พบออเดอร์นี้');
  try {
    await q('INSERT INTO reviews(user_id,order_id,product_name,rating,comment) VALUES($1,$2,$3,$4,$5)', [u.id, o.id, o.product_name, rating, comment]);
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'ออเดอร์นี้รีวิวไปแล้ว');
    throw e;
  }
  return json({ ok: true });
});
