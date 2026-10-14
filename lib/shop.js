import { q, one } from './db';
import { DEFAULT_SETTINGS } from './schema';

export async function getSettings() {
  const { rows } = await q('SELECT key,value FROM settings');
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export async function getCategories() {
  const { rows } = await q(
    `SELECT c.id,c.name,c.image,c.sort,
            (SELECT count(*)::int FROM products p WHERE p.category_id=c.id AND p.active) AS count
       FROM categories c ORDER BY c.sort,c.id`
  );
  return rows;
}

const PRODUCT_SELECT = `
  SELECT p.id,p.name,p.price,p.image,p.description,p.type,p.active,p.category_id,p.sort,
         c.name AS category_name,
         (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND NOT s.sold) AS stock,
         p.sold_base + (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND s.sold) AS sold
    FROM products p LEFT JOIN categories c ON c.id=p.category_id`;

export async function getProducts({ categoryId } = {}) {
  const params = [];
  let where = 'WHERE p.active';
  if (categoryId) { params.push(categoryId); where += ' AND p.category_id=$1'; }
  const { rows } = await q(`${PRODUCT_SELECT} ${where} ORDER BY p.sort,p.id`, params);
  return rows;
}

export async function getProduct(id) {
  return one(`${PRODUCT_SELECT} WHERE p.id=$1 AND p.active`, [id]);
}

export async function getStats() {
  const r = await one(`
    SELECT (SELECT count(*)::int FROM users) AS users,
           (SELECT count(*)::int FROM products WHERE active) AS products,
           (SELECT count(*)::int FROM stock_items WHERE NOT sold) AS stock,
           (SELECT coalesce(sum(sold_base),0)::int FROM products WHERE active)
             + (SELECT count(*)::int FROM stock_items WHERE sold) AS sold`);
  return r;
}

/** คำนวณส่วนลดจากคูปอง (ใช้ทั้งตอนตรวจและตอนซื้อ) */
export function calcDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  let d = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value * 100;
  return Math.max(0, Math.min(d, subtotal));
}

export function couponProblem(c) {
  if (!c || !c.active) return 'โค้ดส่วนลดไม่ถูกต้อง';
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 'โค้ดส่วนลดหมดอายุแล้ว';
  if (c.max_uses != null && c.used >= c.max_uses) return 'โค้ดส่วนลดถูกใช้ครบแล้ว';
  return null;
}

/** ซ่อนชื่อผู้ใช้บางส่วน เช่น Nacho → Nac*** (ไม่ส่งชื่อเต็มออกไปหน้าเว็บ) */
export function maskName(name) {
  const s = Array.from(String(name || ''));
  return s.slice(0, Math.min(3, Math.max(1, s.length - 1))).join('') + '***';
}

/** ออเดอร์ล่าสุดสำหรับแถบ “สินค้าที่ซื้อล่าสุด” */
export async function getRecentOrders(limit = 12) {
  const { rows } = await q(
    `SELECT o.id,o.product_name,o.created_at,p.image,u.username
       FROM orders o
       JOIN users u ON u.id=o.user_id
       LEFT JOIN products p ON p.id=o.product_id
      ORDER BY o.id DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    product: r.product_name,
    image: r.image || '',
    user: maskName(r.username),
    at: new Date(r.created_at).toISOString(),
  }));
}
