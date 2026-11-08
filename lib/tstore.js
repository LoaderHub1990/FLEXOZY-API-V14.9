// ร้านของผู้เช่า (multi-tenant): ทุก query ผูกกับ rental_id เสมอ
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { q, one, tx, HttpError } from './db';
import { rentalBySub, rentalState } from './rent';
import { TEMPLATES, demoSite, demoCatalog } from './templates';
import { getUser } from './auth';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DAYS = 14;
export const cookieName = (rentalId) => `ts_${rentalId}`;

/** ร้านทดลอง (~aurora ฯลฯ): สร้างแถวร้าน + สินค้าตัวอย่างให้เองครั้งแรกที่มีคนเปิด */
export async function ensureDemo(slug) {
  const tpl = TEMPLATES.find((x) => x.slug === slug);
  if (!tpl) return null;
  const sub = '~' + slug;
  let r = await one('SELECT * FROM rentals WHERE sub=$1', [sub]);
  if (!r) {
    r = await one(
      `INSERT INTO rentals(user_id,plan_name,sub,status,expires_at,site,demo) VALUES(NULL,'demo',$1,'active', now() + interval '100 years', $2::jsonb, TRUE)
       ON CONFLICT (lower(sub)) DO UPDATE SET demo=TRUE RETURNING *`, [sub, JSON.stringify(demoSite(slug))]);
  }
  if (!r.site?.tagline_en || !r.site?.banner) { // เติมข้อความอังกฤษของร้านทดลอง (กรณีสร้างไว้ตั้งแต่เวอร์ชันก่อน)
    const ds = demoSite(slug);
    r = await one('UPDATE rentals SET site = site || $1::jsonb WHERE id=$2 RETURNING *', [JSON.stringify({ tagline_en: ds.tagline_en, about_en: ds.about_en, banner: ds.banner }), r.id]);
  }
  const has = await one('SELECT 1 FROM t_products WHERE rental_id=$1 LIMIT 1', [r.id]);
  if (!has) {
    // กันเรียกพร้อมกันแล้วสร้างซ้ำ: ล็อกด้วย advisory lock แล้วเช็กซ้ำในธุรกรรม
    await tx(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock($1)', [r.id]);
      if ((await c.query('SELECT 1 FROM t_products WHERE rental_id=$1 LIMIT 1', [r.id])).rows.length) return;
      const { categories, products } = demoCatalog(slug);
      const ids = [];
      for (let i = 0; i < categories.length; i++) ids.push((await c.query('INSERT INTO t_categories(rental_id,name,sort) VALUES($1,$2,$3) RETURNING id', [r.id, categories[i], i])).rows[0].id);
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        await c.query('INSERT INTO t_products(rental_id,category_id,name,description,price,unlimited,sort) VALUES($1,$2,$3,$4,$5,TRUE,$6)', [r.id, ids[p.cat], p.name, p.desc, Math.round(p.price * 100), i]);
      }
    });
  }
  // ล้างลูกค้า/ออเดอร์ทดลองที่เก่ากว่า 1 วัน (เป็นครั้งคราว)
  if (Math.random() < 0.05) {
    await q("DELETE FROM t_orders WHERE rental_id=$1 AND created_at < now() - interval '1 day'", [r.id]);
    await q("DELETE FROM t_users WHERE rental_id=$1 AND created_at < now() - interval '1 day'", [r.id]);
  }
  return r;
}

/** หาร้านจาก sub — ร้านจริงต้อง active, ร้านทดลองสร้างให้เอง */
export async function loadRental(sub) {
  sub = String(sub || '').slice(0, 40);
  if (sub.startsWith('~')) return ensureDemo(sub.slice(1));
  const r = await rentalBySub(sub);
  if (!r) return null;
  return r;
}
export const activeRental = async (sub) => {
  const r = await loadRental(sub);
  if (!r || rentalState(r) !== 'active') throw new HttpError(404, 'ไม่พบร้านนี้ หรือร้านหมดอายุแล้ว');
  return r;
};

export async function getTUser(rental) {
  const jar = await cookies();
  const tok = jar.get(cookieName(rental.id))?.value;
  if (!tok) return null;
  const u = await one(
    `SELECT u.id,u.username,u.balance,u.banned,u.is_owner FROM t_sessions s JOIN t_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.rental_id=$2 AND s.expires_at > now()`, [sha(tok), rental.id]);
  if (!u || u.banned) return null;
  return { id: u.id, username: u.username, balance: Number(u.balance), owner: !!u.is_owner };
}
export async function tCreateSession(rental, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q("INSERT INTO t_sessions(token_hash,user_id,rental_id,expires_at) VALUES($1,$2,$3, now() + ($4 || ' days')::interval)", [sha(token), userId, rental.id, String(DAYS)]);
  if (Math.random() < 0.05) await q('DELETE FROM t_sessions WHERE expires_at < now()');
  (await cookies()).set(cookieName(rental.id), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DAYS * 86400 });
}
export async function tDestroySession(rental) {
  const jar = await cookies();
  const t = jar.get(cookieName(rental.id))?.value;
  if (t) await q('DELETE FROM t_sessions WHERE token_hash=$1', [sha(t)]);
  jar.set(cookieName(rental.id), '', { path: '/', maxAge: 0 });
}
export const tHash = (p) => bcrypt.hash(p, 10);
export const tCompare = (p, h) => bcrypt.compare(p, h);

const maskName = (u) => { u = String(u || ''); return (u.slice(0, 3) || '***') + '***'; };

/** ข้อมูลหน้าร้าน: หมวดหมู่ (มีรูป/จำนวนสินค้า) · สินค้า (สต็อก null = ไม่จำกัด) · ซื้อล่าสุด · สถิติ */
export async function getCatalog(rentalId, { demo = false } = {}) {
  const [categories, products, recent, stats] = await Promise.all([
    q(`SELECT c.id,c.name,c.image,(SELECT count(*) FROM t_products p WHERE p.category_id=c.id AND p.active)::int AS count
         FROM t_categories c WHERE c.rental_id=$1 ORDER BY c.sort,c.id`, [rentalId]).then((r) => r.rows),
    q(`SELECT p.id,p.category_id,c.name AS category_name,p.name,p.description,p.price,p.image,p.unlimited,p.sold,
              CASE WHEN p.unlimited THEN NULL ELSE (SELECT count(*) FROM t_stock s WHERE s.product_id=p.id AND NOT s.sold) END AS stock
         FROM t_products p LEFT JOIN t_categories c ON c.id=p.category_id WHERE p.rental_id=$1 AND p.active ORDER BY p.sort,p.id`, [rentalId]).then((r) => r.rows),
    q(`SELECT o.product_name AS product,o.username,o.created_at AS at,p.image FROM t_orders o LEFT JOIN t_products p ON p.id=o.product_id
        WHERE o.rental_id=$1 ORDER BY o.id DESC LIMIT 12`, [rentalId]).then((r) => r.rows.map((x) => ({ product: x.product, user: maskName(x.username), at: x.at, image: x.image || '' }))),
    one(`SELECT (SELECT count(*) FROM t_users WHERE rental_id=$1)::int AS users,
                (SELECT coalesce(sum(sold),0) FROM t_products WHERE rental_id=$1)::int AS sold`, [rentalId]),
  ]);
  const prods = products.map((p) => ({ ...p, price: Number(p.price), stock: p.stock === null ? null : Number(p.stock) }));
  let rec = recent;
  if (demo && rec.length < 4 && prods.length) { // ร้านทดลอง: เติมรายการซื้อล่าสุดตัวอย่างให้ดูมีชีวิต (ไม่บันทึกลงฐานข้อมูล)
    const names = ['mar***', 'SI***', 'jif***', 'nat***', 'kri***', 'pon***'];
    const fake = names.map((u, i) => ({ product: prods[i % prods.length].name, user: u, image: prods[i % prods.length].image || '', at: new Date(Date.now() - (i + 1) * 3600e3 * (1 + i)).toISOString() }));
    rec = [...rec, ...fake].slice(0, 12);
  }
  return { categories, products: prods, recent: rec, stats: { users: stats.users + (demo ? 128 : 0), products: prods.length, sold: stats.sold + (demo ? 1250 : 0) } };
}

/** เจ้าของร้านเข้าถึงหลังบ้านได้ 2 ทาง: ล็อกอินบัญชีเว็บหลัก หรือเข้าสู่ระบบเจ้าของร้านบนเว็บของร้านเอง */
export async function ownerRental(id) {
  const cols = 'id,sub,site,expires_at,plan_name,status,user_id,demo';
  const user = await getUser();
  if (user) {
    const r = await one(`SELECT ${cols} FROM rentals WHERE id=$1 AND user_id=$2 AND NOT demo`, [id, user.id]);
    if (r) return r;
  }
  const r = await one(`SELECT ${cols} FROM rentals WHERE id=$1 AND NOT demo`, [id]);
  if (r) { const tu = await getTUser(r); if (tu?.owner) return r; }
  throw new HttpError(user ? 404 : 401, user ? 'ไม่พบร้านนี้' : 'กรุณาเข้าสู่ระบบเจ้าของร้านก่อน');
}
