import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { safeImage } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { tHash } from '@/lib/tstore';
import { siteUrl } from '@/lib/rent';

export const dynamic = 'force-dynamic';

async function owned(id) {
  const user = await requireUser();
  const r = await one('SELECT id,sub,site,expires_at,plan_name,status FROM rentals WHERE id=$1 AND user_id=$2 AND NOT demo', [id, user.id]);
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
      (SELECT coalesce(sum(total),0) FROM t_orders WHERE rental_id=$1 AND created_at > now() - interval '24 hours')::bigint AS revenue_today,
      (SELECT coalesce(sum(balance),0) FROM t_users WHERE rental_id=$1)::bigint AS balances,
      (SELECT count(*) FROM t_products WHERE rental_id=$1)::int AS products,
      (SELECT count(*) FROM t_stock WHERE rental_id=$1 AND NOT sold)::int AS stock,
      (SELECT coalesce(sum(amount),0) FROM t_topups WHERE rental_id=$1 AND status='credited')::bigint AS topups,
      (SELECT count(*) FROM t_topups WHERE rental_id=$1 AND status IN ('review','redeemed'))::int AS review`, [r.id]);
    const days = (await q(`SELECT to_char(d::date,'DD/MM') AS day, coalesce(sum(o.total),0)::bigint AS total
        FROM generate_series(((now() AT TIME ZONE 'Asia/Bangkok')::date - 6)::timestamp, (now() AT TIME ZONE 'Asia/Bangkok')::date::timestamp, '1 day') d
        LEFT JOIN t_orders o ON o.rental_id=$1 AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date = d::date GROUP BY d ORDER BY d`, [r.id])).rows;
    const low = (await q(`SELECT p.id,p.name,(SELECT count(*) FROM t_stock s WHERE s.product_id=p.id AND NOT s.sold)::int AS stock FROM t_products p
        WHERE p.rental_id=$1 AND p.active AND NOT p.unlimited ORDER BY 3 ASC LIMIT 5`, [r.id])).rows.filter((p) => p.stock <= 3);
    return json({ ...x, revenue: Number(x.revenue), revenue_today: Number(x.revenue_today), balances: Number(x.balances), topups: Number(x.topups),
      days: days.map((d) => ({ ...d, total: Number(d.total) })), low, sub: r.sub, url: siteUrl(r.sub), plan_name: r.plan_name, expires_at: r.expires_at, status: r.status });
  }
  if (view === 'site') return json({ site: r.site || {}, sub: r.sub, url: siteUrl(r.sub), expires_at: r.expires_at });
  if (view === 'stock') {
    const pid = int(sp.get('productId'), { min: 1, name: 'สินค้า' });
    const { rows } = await q('SELECT id,content FROM t_stock WHERE product_id=$1 AND rental_id=$2 AND NOT sold ORDER BY id LIMIT 500', [pid, r.id]);
    return json({ rows });
  }
  if (view === 'coupons') return json({ rows: (await q('SELECT id,code,kind,value,min_total,max_uses,used,once_per_user,expires_at,active FROM t_coupons WHERE rental_id=$1 ORDER BY id DESC', [r.id])).rows.map((c) => ({ ...c, value: Number(c.value), min_total: Number(c.min_total) })) });
  if (view === 'categories') return json({ rows: (await q('SELECT id,name,image,sort FROM t_categories WHERE rental_id=$1 ORDER BY sort,id', [r.id])).rows });
  if (view === 'products') {
    const { rows } = await q(`SELECT p.id,p.category_id,p.name,p.description,p.price,p.image,p.unlimited,p.pick_random,p.delivery_text,p.active,p.sort,p.sold,
        (SELECT count(*) FROM t_stock s WHERE s.product_id=p.id AND NOT s.sold)::int AS stock FROM t_products p WHERE p.rental_id=$1 ORDER BY p.sort,p.id`, [r.id]);
    return json({ rows: rows.map((p) => ({ ...p, price: Number(p.price) })) });
  }
  const term = (sp.get('q') || '').trim().slice(0, 60);
  const like = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
  if (view === 'orders') return json({ rows: (await q(`SELECT id,username,product_name,qty,total,discount,coupon,delivered,created_at FROM t_orders WHERE rental_id=$1 AND ($2='' OR username ILIKE $3 OR product_name ILIKE $3 OR id::text=$2) ORDER BY id DESC LIMIT 150`, [r.id, term, like])).rows.map((o) => ({ ...o, total: Number(o.total), discount: Number(o.discount) })) });
  if (view === 'customers') return json({ rows: (await q(`SELECT u.id,u.username,u.balance,u.banned,u.created_at,(SELECT coalesce(sum(total),0) FROM t_orders o WHERE o.user_id=u.id)::bigint AS spent FROM t_users u WHERE u.rental_id=$1 AND ($2='' OR u.username ILIKE $3) ORDER BY u.id DESC LIMIT 200`, [r.id, term, like])).rows.map((u) => ({ ...u, balance: Number(u.balance), spent: Number(u.spent) })) });
  if (view === 'topups') return json({ rows: (await q(`SELECT t.id,t.voucher_code,t.amount,t.status,t.error_code,t.created_at,u.username FROM t_topups t LEFT JOIN t_users u ON u.id=t.user_id WHERE t.rental_id=$1 ORDER BY t.id DESC LIMIT 100`, [r.id])).rows.map((t) => ({ ...t, amount: Number(t.amount) })) });
  throw new HttpError(400, 'view ไม่ถูกต้อง');
});

export const POST = route(async (req) => {
  const b = await body(req);
  const r = await owned(int(b.rental, { min: 1, name: 'ร้าน' }));
  const op = String(b.op || '');

  if (op === 'cat.save') {
    const name = str(b.name, { min: 1, max: 40, name: 'ชื่อหมวดหมู่' });
    const image = safeImage(b.image || '');
    if (b.id) await q('UPDATE t_categories SET name=$1,image=$2 WHERE id=$3 AND rental_id=$4', [name, image, int(b.id, { min: 1 }), r.id]);
    else {
      const n = await one('SELECT count(*)::int AS n FROM t_categories WHERE rental_id=$1', [r.id]);
      if (n.n >= 30) throw new HttpError(400, 'สร้างหมวดหมู่ได้สูงสุด 30');
      await q('INSERT INTO t_categories(rental_id,name,image,sort) VALUES($1,$2,$3,$4)', [r.id, name, image, n.n]);
    }
    return json({ ok: true });
  }
  if (op === 'cat.delete') { await q('DELETE FROM t_categories WHERE id=$1 AND rental_id=$2', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'prod.save') {
    const f = {
      name: str(b.name, { min: 1, max: 80, name: 'ชื่อสินค้า' }), description: str(b.description, { max: 600 }), price: satang(b.price, { name: 'ราคา' }),
      image: safeImage(b.image || ''), unlimited: !!b.unlimited && !b.pick_random, pick_random: !!b.pick_random && !b.unlimited, delivery_text: str(b.delivery_text, { max: 1000 }), active: b.active !== false,
    };
    let cat = null;
    if (b.category_id) { cat = int(b.category_id, { min: 1 }); if (!(await one('SELECT 1 FROM t_categories WHERE id=$1 AND rental_id=$2', [cat, r.id]))) cat = null; }
    if (b.id) {
      await q('UPDATE t_products SET name=$1,description=$2,price=$3,image=$4,unlimited=$5,delivery_text=$6,active=$7,category_id=$8,pick_random=$9 WHERE id=$10 AND rental_id=$11',
        [f.name, f.description, f.price, f.image, f.unlimited, f.delivery_text, f.active, cat, f.pick_random, int(b.id, { min: 1 }), r.id]);
      return json({ ok: true });
    }
    const n = await one('SELECT count(*)::int AS n FROM t_products WHERE rental_id=$1', [r.id]);
    if (n.n >= 300) throw new HttpError(400, 'เพิ่มสินค้าได้สูงสุด 300 รายการ');
    const p = await one('INSERT INTO t_products(rental_id,category_id,name,description,price,image,unlimited,delivery_text,active,sort,pick_random) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [r.id, cat, f.name, f.description, f.price, f.image, f.unlimited, f.delivery_text, f.active, n.n, f.pick_random]);
    return json({ ok: true, id: p.id });
  }
  if (op === 'prod.delete') { await q('DELETE FROM t_products WHERE id=$1 AND rental_id=$2', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }

  if (op === 'stock.add') {
    const pid = int(b.productId, { min: 1, name: 'สินค้า' });
    if (!(await one('SELECT 1 FROM t_products WHERE id=$1 AND rental_id=$2', [pid, r.id]))) throw new HttpError(404, 'ไม่พบสินค้า');
    const lines = String(b.lines || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => x.slice(0, 500));
    if (!lines.length) throw new HttpError(400, 'ไม่มีข้อมูลสต็อก (หนึ่งบรรทัดต่อหนึ่งชิ้น)');
    if (lines.length > 5000) throw new HttpError(400, 'เพิ่มได้ครั้งละไม่เกิน 5,000 ชิ้น');
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
  if (op === 'stock.delete') { await q('DELETE FROM t_stock WHERE id=$1 AND rental_id=$2 AND NOT sold', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }
  if (op === 'cat.move') { // สลับลำดับหมวดหมู่ขึ้น/ลง
    const rows = (await q('SELECT id FROM t_categories WHERE rental_id=$1 ORDER BY sort,id', [r.id])).rows.map((x) => x.id);
    const i = rows.indexOf(int(b.id, { min: 1 })); const j = i + (b.dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length) return json({ ok: true });
    [rows[i], rows[j]] = [rows[j], rows[i]];
    await q('UPDATE t_categories c SET sort=x.n FROM (SELECT unnest($1::int[]) AS id, generate_series(0, $2) AS n) x WHERE c.id=x.id', [rows, rows.length - 1]);
    return json({ ok: true });
  }
  if (op === 'prod.move') {
    const rows = (await q('SELECT id FROM t_products WHERE rental_id=$1 ORDER BY sort,id', [r.id])).rows.map((x) => x.id);
    const i = rows.indexOf(int(b.id, { min: 1 })); const j = i + (b.dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length) return json({ ok: true });
    [rows[i], rows[j]] = [rows[j], rows[i]];
    await q('UPDATE t_products c SET sort=x.n FROM (SELECT unnest($1::int[]) AS id, generate_series(0, $2) AS n) x WHERE c.id=x.id', [rows, rows.length - 1]);
    return json({ ok: true });
  }
  if (op === 'cust.password') {
    const pw = str(b.password, { min: 8, max: 72, name: 'รหัสผ่านใหม่' });
    const uid = int(b.userId, { min: 1 });
    const u = await one('UPDATE t_users SET pass_hash=$1 WHERE id=$2 AND rental_id=$3 RETURNING id', [await tHash(pw), uid, r.id]);
    if (!u) throw new HttpError(404, 'ไม่พบลูกค้า');
    await q('DELETE FROM t_sessions WHERE user_id=$1', [uid]); // เตะออกจากระบบทุกเครื่อง
    return json({ ok: true });
  }
  if (op === 'coupon.save') {
    const code = str(b.code, { min: 3, max: 30, name: 'โค้ด' }).toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(code)) throw new HttpError(400, 'โค้ดใช้ได้เฉพาะ A-Z 0-9 - _');
    const kind = b.kind === 'fixed' ? 'fixed' : 'percent';
    const value = kind === 'percent' ? int(b.value, { min: 1, max: 100, name: 'เปอร์เซ็นต์' }) : satang(b.value, { min: 1, name: 'ส่วนลด' });
    const f = [code, kind, value, satang(b.min_total || 0, { name: 'ยอดขั้นต่ำ' }), int(b.max_uses || 0, { min: 0, max: 1000000, name: 'จำนวนครั้ง' }), b.once_per_user !== false, b.expires_at ? new Date(b.expires_at) : null, b.active !== false];
    if (f[6] && isNaN(f[6].getTime())) throw new HttpError(400, 'วันหมดอายุไม่ถูกต้อง');
    try {
      if (b.id) await q('UPDATE t_coupons SET code=$1,kind=$2,value=$3,min_total=$4,max_uses=$5,once_per_user=$6,expires_at=$7,active=$8 WHERE id=$9 AND rental_id=$10', [...f, int(b.id, { min: 1 }), r.id]);
      else await q('INSERT INTO t_coupons(code,kind,value,min_total,max_uses,once_per_user,expires_at,active,rental_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [...f, r.id]);
    } catch (e) { if (e.code === '23505') throw new HttpError(409, 'มีโค้ดนี้อยู่แล้ว'); throw e; }
    return json({ ok: true });
  }
  if (op === 'coupon.delete') { await q('DELETE FROM t_coupons WHERE id=$1 AND rental_id=$2', [int(b.id, { min: 1 }), r.id]); return json({ ok: true }); }
  throw new HttpError(400, 'คำสั่งไม่ถูกต้อง');
});
