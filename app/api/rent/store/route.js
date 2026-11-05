import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { safeImage } from '@/lib/util';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function owned(id) {
  const user = await requireUser();
  const r = await one('SELECT id,sub FROM rentals WHERE id=$1 AND user_id=$2 AND NOT demo', [id, user.id]);
  if (!r) throw new HttpError(404, 'ไม่พบร้านนี้');
  return r;
}
const satang = (v, { min = 0, max = 100_000_000, name = 'ยอดเงิน' } = {}) => {
  const n = Math.round(Number(v) * 100);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${name}ไม่ถูกต้อง`);
  return n;
};

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const r = await owned(int(sp.get('rental'), { min: 1, name: 'ร้าน' }));
  const view = sp.get('view') || 'overview';
  if (view === 'overview') {
    const x = await one(`SELECT
      (SELECT count(*) FROM t_users WHERE rental_id=$1)::int AS customers,
      (SELECT count(*) FROM t_orders WHERE rental_id=$1)::int AS orders,
      (SELECT coalesce(sum(total),0) FROM t_orders WHERE rental_id=$1)::bigint AS revenue,
      (SELECT count(*) FROM t_products WHERE rental_id=$1)::int AS products,
      (SELECT count(*) FROM t_stock WHERE rental_id=$1 AND NOT sold)::int AS stock,
      (SELECT coalesce(sum(amount),0) FROM t_topups WHERE rental_id=$1 AND status='credited')::bigint AS topups,
      (SELECT count(*) FROM t_topups WHERE rental_id=$1 AND status IN ('review','redeemed'))::int AS review`, [r.id]);
    return json({ ...x, revenue: Number(x.revenue), topups: Number(x.topups), sub: r.sub });
  }
  if (view === 'categories') return json({ rows: (await q('SELECT id,name,sort FROM t_categories WHERE rental_id=$1 ORDER BY sort,id', [r.id])).rows });
  if (view === 'products') {
    const { rows } = await q(`SELECT p.id,p.category_id,p.name,p.description,p.price,p.image,p.unlimited,p.delivery_text,p.active,p.sort,p.sold,
        (SELECT count(*) FROM t_stock s WHERE s.product_id=p.id AND NOT s.sold)::int AS stock FROM t_products p WHERE p.rental_id=$1 ORDER BY p.sort,p.id`, [r.id]);
    return json({ rows: rows.map((p) => ({ ...p, price: Number(p.price) })) });
  }
  if (view === 'orders') return json({ rows: (await q('SELECT id,username,product_name,qty,total,delivered,created_at FROM t_orders WHERE rental_id=$1 ORDER BY id DESC LIMIT 100', [r.id])).rows.map((o) => ({ ...o, total: Number(o.total) })) });
  if (view === 'customers') return json({ rows: (await q('SELECT id,username,balance,banned,created_at FROM t_users WHERE rental_id=$1 ORDER BY id DESC LIMIT 200', [r.id])).rows.map((u) => ({ ...u, balance: Number(u.balance) })) });
  if (view === 'topups') return json({ rows: (await q(`SELECT t.id,t.voucher_code,t.amount,t.status,t.error_code,t.created_at,u.username FROM t_topups t LEFT JOIN t_users u ON u.id=t.user_id WHERE t.rental_id=$1 ORDER BY t.id DESC LIMIT 100`, [r.id])).rows.map((t) => ({ ...t, amount: Number(t.amount) })) });
  throw new HttpError(400, 'view ไม่ถูกต้อง');
});

export const POST = route(async (req) => {
  const b = await body(req);
  const r = await owned(int(b.rental, { min: 1, name: 'ร้าน' }));
  const op = String(b.op || '');

  if (op === 'cat.save') {
    const name = str(b.name, { min: 1, max: 40, name: 'ชื่อหมวดหมู่' });
    if (b.id) await q('UPDATE t_categories SET name=$1 WHERE id=$2 AND rental_id=$3', [name, int(b.id, { min: 1 }), r.id]);
    else {
      const n = await one('SELECT count(*)::int AS n FROM t_categories WHERE rental_id=$1', [r.id]);
      if (n.n >= 30) throw new HttpError(400, 'สร้างหมวดหมู่ได้สูงสุด 30');
      await q('INSERT INTO t_categories(rental_id,name,sort) VALUES($1,$2,$3)', [r.id, name, n.n]);
    }
    return json({ ok: true });
  }
  if (op === 'cat.delete') { await q('DELETE FROM t_categories WHERE id=$1 AND rental_id=$2', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'prod.save') {
    const f = {
      name: str(b.name, { min: 1, max: 80, name: 'ชื่อสินค้า' }), description: str(b.description, { max: 600 }), price: satang(b.price, { name: 'ราคา' }),
      image: safeImage(b.image || ''), unlimited: !!b.unlimited, delivery_text: str(b.delivery_text, { max: 1000 }), active: b.active !== false,
    };
    let cat = null;
    if (b.category_id) { cat = int(b.category_id, { min: 1 }); if (!(await one('SELECT 1 FROM t_categories WHERE id=$1 AND rental_id=$2', [cat, r.id]))) cat = null; }
    if (b.id) {
      await q('UPDATE t_products SET name=$1,description=$2,price=$3,image=$4,unlimited=$5,delivery_text=$6,active=$7,category_id=$8 WHERE id=$9 AND rental_id=$10',
        [f.name, f.description, f.price, f.image, f.unlimited, f.delivery_text, f.active, cat, int(b.id, { min: 1 }), r.id]);
      return json({ ok: true });
    }
    const n = await one('SELECT count(*)::int AS n FROM t_products WHERE rental_id=$1', [r.id]);
    if (n.n >= 300) throw new HttpError(400, 'เพิ่มสินค้าได้สูงสุด 300 รายการ');
    const p = await one('INSERT INTO t_products(rental_id,category_id,name,description,price,image,unlimited,delivery_text,active,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [r.id, cat, f.name, f.description, f.price, f.image, f.unlimited, f.delivery_text, f.active, n.n]);
    return json({ ok: true, id: p.id });
  }
  if (op === 'prod.delete') { await q('DELETE FROM t_products WHERE id=$1 AND rental_id=$2', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'stock.add') {
    const pid = int(b.productId, { min: 1, name: 'สินค้า' });
    if (!(await one('SELECT 1 FROM t_products WHERE id=$1 AND rental_id=$2', [pid, r.id]))) throw new HttpError(404, 'ไม่พบสินค้า');
    const lines = String(b.lines || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => x.slice(0, 500));
    if (!lines.length) throw new HttpError(400, 'ไม่มีข้อมูลสต็อก (หนึ่งบรรทัดต่อหนึ่งชิ้น)');
    if (lines.length > 1000) throw new HttpError(400, 'เพิ่มได้ครั้งละไม่เกิน 1,000 ชิ้น');
    await q('INSERT INTO t_stock(product_id,rental_id,content) SELECT $1,$2,x FROM unnest($3::text[]) AS x', [pid, r.id, lines]);
    return json({ ok: true, added: lines.length });
  }
  if (op === 'stock.clear') { await q('DELETE FROM t_stock WHERE product_id=$1 AND rental_id=$2 AND NOT sold', [int(b.productId, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'cust.adjust') {
    const delta = satang(Math.abs(Number(b.delta)), { name: 'ยอดเงิน' }) * (Number(b.delta) < 0 ? -1 : 1);
    const u = await one('UPDATE t_users SET balance=balance+$1 WHERE id=$2 AND rental_id=$3 AND balance+$1 >= 0 RETURNING balance', [delta, int(b.userId, { min: 1 }), r.id]);
    if (!u) throw new HttpError(400, 'ปรับยอดไม่ได้ (ไม่พบลูกค้า หรือยอดติดลบ)');
    return json({ ok: true, balance: Number(u.balance) });
  }
  if (op === 'cust.ban') { await q('UPDATE t_users SET banned=$1 WHERE id=$2 AND rental_id=$3', [!!b.banned, int(b.userId, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'topup.credit') { // เจ้าของเช็กกระเป๋าแล้วเห็นว่าเงินเข้าจริง → เติมให้ลูกค้าเอง
    const amount = satang(b.amount, { min: 1, name: 'ยอดเงิน' });
    await tx(async (c) => {
      const t = (await c.query(`SELECT id,user_id,status FROM t_topups WHERE id=$1 AND rental_id=$2 FOR UPDATE`, [int(b.id, { min: 1 }), r.id])).rows[0];
      if (!t || !['review', 'redeemed', 'failed', 'pending'].includes(t.status) || !t.user_id) throw new HttpError(409, 'รายการนี้เติมไม่ได้แล้ว');
      await c.query('UPDATE t_users SET balance=balance+$1 WHERE id=$2', [amount, t.user_id]);
      await c.query(`UPDATE t_topups SET status='credited',amount=$1 WHERE id=$2`, [amount, t.id]);
    });
    return json({ ok: true });
  }
  throw new HttpError(400, 'คำสั่งไม่ถูกต้อง');
});
