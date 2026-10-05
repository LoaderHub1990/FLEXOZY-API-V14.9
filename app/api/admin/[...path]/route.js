import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int, safeImage, safeUrl } from '@/lib/util';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/shop';

export const dynamic = 'force-dynamic';

const TYPES = ['normal', 'random'];

async function handle(req, { params }) {
  const admin = await requireAdmin();
  const path = (await params).path;
  const [res, id, act] = path;
  const m = req.method;
  const nid = () => int(id, { min: 1, name: 'รหัส' });

  // ---------- dashboard ----------
  if (res === 'stats' && m === 'GET') {
    const r = await one(`
      SELECT (SELECT count(*)::int FROM users) users,
             (SELECT count(*)::int FROM orders) orders,
             (SELECT coalesce(sum(total),0)::bigint FROM orders) revenue,
             (SELECT coalesce(sum(total),0)::bigint FROM orders WHERE created_at > now() - interval '24 hours') revenue_today,
             (SELECT count(*)::int FROM topups WHERE status='pending' AND created_at > now() - interval '24 hours') pending_topups,
             (SELECT count(*)::int FROM stock_items WHERE NOT sold) stock,
             (SELECT coalesce(sum(balance),0)::bigint FROM users) balances`);
    return json(r);
  }

  // ---------- categories ----------
  if (res === 'categories') {
    if (m === 'GET') return json({ rows: (await q('SELECT * FROM categories ORDER BY sort,id')).rows });
    if (m === 'POST') {
      const b = await body(req);
      const r = await one('INSERT INTO categories(name,image,sort) VALUES($1,$2,$3) RETURNING *', [
        str(b.name, { min: 1, max: 60, name: 'ชื่อหมวดหมู่' }), safeImage(b.image), int(b.sort ?? 0, { min: -9999, max: 9999 }),
      ]);
      return json({ row: r });
    }
    if (m === 'PUT') {
      const b = await body(req);
      const r = await one('UPDATE categories SET name=$1,image=$2,sort=$3 WHERE id=$4 RETURNING *', [
        str(b.name, { min: 1, max: 60, name: 'ชื่อหมวดหมู่' }), safeImage(b.image), int(b.sort ?? 0, { min: -9999, max: 9999 }), nid(),
      ]);
      if (!r) throw new HttpError(404, 'ไม่พบหมวดหมู่');
      return json({ row: r });
    }
    if (m === 'DELETE') {
      await q('DELETE FROM categories WHERE id=$1', [nid()]);
      return json({ ok: true });
    }
  }

  // ---------- products ----------
  if (res === 'products') {
    if (m === 'GET') {
      const { rows } = await q(`
        SELECT p.*, c.name AS category_name,
               (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND NOT s.sold) AS stock,
               p.sold_base + (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND s.sold) AS sold
          FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.sort,p.id`);
      return json({ rows });
    }
    if (m === 'POST' || m === 'PUT') {
      const b = await body(req);
      const f = [
        b.category_id ? int(b.category_id, { min: 1, name: 'หมวดหมู่' }) : null,
        str(b.name, { min: 1, max: 150, name: 'ชื่อสินค้า' }),
        Math.round(Number(b.price) * 100),
        safeImage(b.image),
        str(b.description, { max: 8000, name: 'รายละเอียด' }),
        TYPES.includes(b.type) ? b.type : 'normal',
        b.active !== false,
        int(b.sold_base ?? 0, { min: 0, max: 10000000, name: 'ยอดขายเริ่มต้น' }),
        int(b.sort ?? 0, { min: -9999, max: 9999 }),
      ];
      if (!Number.isFinite(f[2]) || f[2] < 0 || f[2] > 100000000) throw new HttpError(400, 'ราคาไม่ถูกต้อง');
      if (m === 'POST') {
        const r = await one(
          `INSERT INTO products(category_id,name,price,image,description,type,active,sold_base,sort)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, f);
        return json({ row: r });
      }
      const r = await one(
        `UPDATE products SET category_id=$1,name=$2,price=$3,image=$4,description=$5,type=$6,active=$7,sold_base=$8,sort=$9
          WHERE id=$10 RETURNING *`, [...f, nid()]);
      if (!r) throw new HttpError(404, 'ไม่พบสินค้า');
      return json({ row: r });
    }
    if (m === 'DELETE') {
      // มีออเดอร์แล้วลบไม่ได้ (เก็บประวัติ) ให้ซ่อนแทน
      const used = await one('SELECT 1 FROM orders WHERE product_id=$1 LIMIT 1', [nid()]);
      if (used) {
        await q('UPDATE products SET active=FALSE WHERE id=$1', [nid()]);
        return json({ ok: true, hidden: true });
      }
      await q('DELETE FROM products WHERE id=$1', [nid()]);
      return json({ ok: true });
    }
  }

  // ---------- stock (คีย์/โค้ดที่ส่งให้ลูกค้า) ----------
  if (res === 'stock') {
    const pid = nid();
    if (m === 'GET') {
      const { rows } = await q('SELECT id,content,created_at FROM stock_items WHERE product_id=$1 AND NOT sold ORDER BY id LIMIT 500', [pid]);
      return json({ rows });
    }
    if (m === 'POST') {
      const b = await body(req);
      const lines = String(b.lines || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (!lines.length) throw new HttpError(400, 'ยังไม่ได้ใส่คีย์/โค้ด');
      if (lines.length > 5000) throw new HttpError(400, 'เพิ่มได้ครั้งละไม่เกิน 5,000 รายการ');
      if (lines.some((l) => l.length > 2000)) throw new HttpError(400, 'บางบรรทัดยาวเกิน 2,000 ตัวอักษร');
      if (!(await one('SELECT 1 FROM products WHERE id=$1', [pid]))) throw new HttpError(404, 'ไม่พบสินค้า');
      await q('INSERT INTO stock_items(product_id,content) SELECT $1, unnest($2::text[])', [pid, lines]);
      return json({ ok: true, added: lines.length });
    }
    if (m === 'DELETE') {
      if (act) { // ลบทีละรายการ: /stock/:pid/:itemId
        await q('DELETE FROM stock_items WHERE id=$1 AND product_id=$2 AND NOT sold', [int(act, { min: 1 }), pid]);
      } else {
        await q('DELETE FROM stock_items WHERE product_id=$1 AND NOT sold', [pid]);
      }
      return json({ ok: true });
    }
  }

  // ---------- orders ----------
  if (res === 'orders' && m === 'GET') {
    const { rows } = await q(
      `SELECT o.id,o.product_name,o.qty,o.total,o.discount,o.coupon_code,o.created_at,u.username
         FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 200`);
    return json({ rows });
  }

  // ---------- topups ----------
  if (res === 'topups') {
    if (m === 'GET') {
      const { rows } = await q(
        `SELECT t.*, u.username,
                CASE WHEN t.status='pending' AND t.created_at < now() - interval '24 hours' THEN true ELSE false END AS stale
           FROM topups t JOIN users u ON u.id=t.user_id ORDER BY (t.status='pending') DESC, t.id DESC LIMIT 200`);
      return json({ rows });
    }
    if (m === 'POST' && (act === 'approve' || act === 'reject')) {
      const out = await tx(async (c) => {
        const t = (await c.query('SELECT * FROM topups WHERE id=$1 FOR UPDATE', [nid()])).rows[0];
        if (!t) throw new HttpError(404, 'ไม่พบรายการ');
        if (t.status !== 'pending') throw new HttpError(409, 'รายการนี้ถูกดำเนินการไปแล้ว');
        if (act === 'approve') {
          await c.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [t.amount, t.user_id]);
          await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [t.user_id, t.amount, `เติมเงิน #${t.id}`]);
        }
        await c.query('UPDATE topups SET status=$1, decided_at=now(), decided_by=$2 WHERE id=$3', [
          act === 'approve' ? 'approved' : 'rejected', admin.id, t.id,
        ]);
        return { ok: true };
      });
      return json(out);
    }
  }

  // ---------- users ----------
  if (res === 'users') {
    if (m === 'GET') {
      const { rows } = await q(
        `SELECT id,username,email,role,balance,banned,created_at,
                (SELECT count(*)::int FROM orders o WHERE o.user_id=users.id) AS orders
           FROM users ORDER BY id DESC LIMIT 300`);
      return json({ rows });
    }
    if (m === 'POST' && act === 'balance') {
      const b = await body(req);
      const delta = Math.round(Number(b.amount) * 100);
      if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000000) throw new HttpError(400, 'จำนวนเงินไม่ถูกต้อง');
      const note = str(b.note, { max: 100 });
      const out = await tx(async (c) => {
        const r = await c.query('UPDATE users SET balance = balance + $1 WHERE id=$2 RETURNING balance', [delta, nid()]);
        if (!r.rows[0]) throw new HttpError(404, 'ไม่พบผู้ใช้');
        await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [nid(), delta, `แอดมินปรับยอด${note ? ': ' + note : ''}`]);
        return r.rows[0];
      }).catch((e) => {
        if (e.code === '23514') throw new HttpError(400, 'ยอดเงินติดลบไม่ได้');
        throw e;
      });
      return json({ balance: out.balance });
    }
    if (m === 'PATCH') {
      const b = await body(req);
      const target = nid();
      if (target === admin.id) throw new HttpError(400, 'แก้ไขบัญชีตัวเองจากหน้านี้ไม่ได้');
      if (typeof b.banned === 'boolean') {
        await q('UPDATE users SET banned=$1 WHERE id=$2', [b.banned, target]);
        if (b.banned) await q('DELETE FROM sessions WHERE user_id=$1', [target]);
      }
      if (b.role === 'admin' || b.role === 'user') await q('UPDATE users SET role=$1 WHERE id=$2', [b.role, target]);
      return json({ ok: true });
    }
  }

  // ---------- coupons ----------
  if (res === 'coupons') {
    if (m === 'GET') return json({ rows: (await q('SELECT * FROM coupons ORDER BY code')).rows });
    if (m === 'POST') {
      const b = await body(req);
      const code = str(b.code, { min: 2, max: 40, name: 'โค้ด' }).toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(code)) throw new HttpError(400, 'โค้ดใช้ได้เฉพาะ A-Z 0-9 _ -');
      const type = b.type === 'fixed' ? 'fixed' : 'percent';
      const value = int(b.value, { min: 1, max: type === 'percent' ? 100 : 100000, name: 'มูลค่าส่วนลด' });
      const max = b.max_uses === '' || b.max_uses == null ? null : int(b.max_uses, { min: 1, max: 10000000, name: 'จำนวนครั้ง' });
      const exp = b.expires_at ? new Date(b.expires_at) : null;
      if (exp && isNaN(exp)) throw new HttpError(400, 'วันหมดอายุไม่ถูกต้อง');
      const r = await one(
        `INSERT INTO coupons(code,type,value,max_uses,active,expires_at) VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (code) DO UPDATE SET type=$2,value=$3,max_uses=$4,active=$5,expires_at=$6 RETURNING *`,
        [code, type, value, max, b.active !== false, exp]);
      return json({ row: r });
    }
    if (m === 'DELETE') {
      await q('DELETE FROM coupons WHERE code=$1', [str(id, { min: 1, max: 40 }).toUpperCase()]);
      return json({ ok: true });
    }
  }

  // ---------- settings ----------
  if (res === 'settings') {
    if (m === 'GET') return json({ settings: await getSettings() });
    if (m === 'PUT') {
      const b = await body(req);
      const v = {
        shop_name: str(b.shop_name, { min: 1, max: 40, name: 'ชื่อร้าน' }),
        tagline: str(b.tagline, { max: 200 }),
        footer_text: str(b.footer_text, { max: 200 }),
        discord_url: safeUrl(b.discord_url),
        logo: safeImage(b.logo),
        min_topup: String(int(b.min_topup, { min: 1, max: 50000, name: 'ยอดเติมขั้นต่ำ' })),
      };
      for (const [k, val] of Object.entries(v))
        await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k, val]);
      return json({ ok: true });
    }
  }

  throw new HttpError(404, 'ไม่พบ API นี้');
}

export const GET = route(handle);
export const POST = route(handle);
export const PUT = route(handle);
export const PATCH = route(handle);
export const DELETE = route(handle);
