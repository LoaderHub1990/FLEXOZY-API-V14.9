import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int, safeImage, safeUrl } from '@/lib/util';
import { requireAdmin, genApiKey, hashApiKey, clearApiKeyCache } from '@/lib/auth';
import { getSettings, clearSettingsCache } from '@/lib/shop';
import { issueKeys, cleanPrefix } from '@/lib/keys';

export const dynamic = 'force-dynamic';

const TYPES = ['normal', 'random', 'key'];
const TEN_YEARS = 10 * 365 * 86400;

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
             ((SELECT count(*)::int FROM topups WHERE status='pending' AND created_at > now() - interval '24 hours') + (SELECT count(*)::int FROM truemoney_topups WHERE status IN ('review','redeemed'))) pending_topups,
             (SELECT count(*)::int FROM stock_items WHERE NOT sold) stock,
             (SELECT coalesce(sum(balance),0)::bigint FROM users) balances`);
    return json(r);
  }

  // ---------- license keys (คีย์อัตโนมัติ) ----------
  if (res === 'keys') {
    if (m === 'GET') {
      const term = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 60);
      const like = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
      const { rows } = await q(
        `SELECT l.id,l.key,l.product_name,l.seconds,l.hwid_lock,l.hwid,l.activated_at,l.expires_at,l.revoked,l.note,l.last_check_at,l.created_at,l.order_id,u.username,l.roblox_id::text AS roblox_id,l.roblox_name,l.roblox_display,l.roblox_avatar,l.roblox_seen_at
           FROM license_keys l LEFT JOIN users u ON u.id=l.user_id
          WHERE ($1='' OR l.key ILIKE $2 OR l.product_name ILIKE $2 OR u.username ILIKE $2 OR l.note ILIKE $2)
          ORDER BY l.id DESC LIMIT 200`, [term, like]);
      return json({ rows });
    }
    if (m === 'POST') { // แอดมินสร้างคีย์เอง (แจก/ทดสอบ) ไม่ผ่านการซื้อ
      const b = await body(req);
      const pid = int(b.productId, { min: 1, name: 'สินค้า' });
      const qty = int(b.qty ?? 1, { min: 1, max: 200, name: 'จำนวน' });
      const p = await one("SELECT id,name,key_prefix,key_seconds,key_start,key_hwid FROM products WHERE id=$1 AND type='key'", [pid]);
      if (!p) throw new HttpError(404, 'ไม่พบสินค้าประเภทคีย์อัตโนมัติ');
      const secs = b.seconds == null || b.seconds === '' ? undefined : int(b.seconds, { min: 0, max: TEN_YEARS, name: 'อายุคีย์' });
      const keys = await tx((c) => issueKeys(c, { product: p, qty, seconds: secs, note: str(b.note, { max: 120 }) || 'แอดมินสร้าง' }));
      return json({ keys });
    }
    if (m === 'PUT') {
      const kid = nid();
      if (act === 'revoke' || act === 'unrevoke') {
        await q('UPDATE license_keys SET revoked=$1 WHERE id=$2', [act === 'revoke', kid]);
      } else if (act === 'reset-hwid') {
        await q('UPDATE license_keys SET hwid=NULL WHERE id=$1', [kid]); // ล้างเครื่องที่ผูกไว้ → ผูกใหม่ตอนใช้ครั้งถัดไป
      } else if (act === 'extend') {
        const b = await body(req);
        const secs = Math.round(Number(b.days) * 86400);
        if (!Number.isFinite(secs) || secs === 0 || Math.abs(secs) > TEN_YEARS) throw new HttpError(400, 'จำนวนวันไม่ถูกต้อง');
        const r = await one('SELECT seconds,activated_at,expires_at FROM license_keys WHERE id=$1', [kid]);
        if (!r) throw new HttpError(404, 'ไม่พบคีย์');
        if (Number(r.seconds) === 0) throw new HttpError(400, 'คีย์ตลอดชีพไม่ต้องต่อเวลา');
        if (r.expires_at) await q(`UPDATE license_keys SET expires_at = expires_at + ($1 || ' seconds')::interval WHERE id=$2`, [String(secs), kid]);
        else await q('UPDATE license_keys SET seconds = GREATEST(60, seconds + $1) WHERE id=$2', [secs, kid]); // ยังไม่เริ่มนับ → เพิ่มที่อายุรวม
      } else throw new HttpError(404, 'ไม่พบคำสั่ง');
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      await q('DELETE FROM license_keys WHERE id=$1', [nid()]);
      return json({ ok: true });
    }
  }

  // ---------- API keys (ให้บอท/ระบบภายนอกเรียกเว็บ) ----------
  if (res === 'apikeys') {
    if (m === 'GET') {
      const { rows } = await q('SELECT id,name,key_hint,revoked,last_used_at,created_at FROM api_keys ORDER BY id DESC LIMIT 100');
      return json({ rows });
    }
    if (m === 'POST') {
      const b = await body(req);
      const name = str(b.name, { min: 1, max: 60, name: 'ชื่อคีย์' });
      const key = genApiKey();
      await q('INSERT INTO api_keys(name,key_hash,key_hint) VALUES($1,$2,$3)', [name, hashApiKey(key), key.slice(0, 8) + '…' + key.slice(-4)]);
      return json({ key }); // แสดงคีย์เต็มครั้งเดียวเท่านั้น (ในฐานข้อมูลเก็บแค่ hash)
    }
    if (m === 'PUT' && act === 'revoke') {
      await q('UPDATE api_keys SET revoked=TRUE WHERE id=$1', [nid()]);
      clearApiKeyCache();
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      await q('DELETE FROM api_keys WHERE id=$1', [nid()]);
      clearApiKeyCache();
      return json({ ok: true });
    }
  }

  // ---------- reviews ----------
  if (res === 'reviews') {
    if (m === 'GET') {
      const { rows } = await q(
        `SELECT r.id,r.rating,r.comment,r.product_name,r.created_at,u.username
           FROM reviews r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 200`);
      return json({ rows });
    }
    if (m === 'DELETE') {
      await q('DELETE FROM reviews WHERE id=$1', [nid()]);
      return json({ ok: true });
    }
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
               p.sold_base + (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND s.sold)
                           + (SELECT count(*)::int FROM license_keys l WHERE l.product_id=p.id AND l.order_id IS NOT NULL) AS sold
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
        cleanPrefix(b.key_prefix),
        int(b.key_seconds ?? 86400, { min: 0, max: TEN_YEARS, name: 'อายุคีย์' }), // 0 = ตลอดชีพ
        b.key_start === 'purchase' ? 'purchase' : 'activate',
        b.key_hwid === true,
      ];
      if (!Number.isFinite(f[2]) || f[2] < 0 || f[2] > 100000000) throw new HttpError(400, 'ราคาไม่ถูกต้อง');
      if (m === 'POST') {
        const r = await one(
          `INSERT INTO products(category_id,name,price,image,description,type,active,sold_base,sort,key_prefix,key_seconds,key_start,key_hwid)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, f);
        return json({ row: r });
      }
      const r = await one(
        `UPDATE products SET category_id=$1,name=$2,price=$3,image=$4,description=$5,type=$6,active=$7,sold_base=$8,sort=$9,
                key_prefix=$10,key_seconds=$11,key_start=$12,key_hwid=$13
          WHERE id=$14 RETURNING *`, [...f, nid()]);
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
      const [man, slip, tm] = await Promise.all([
        q(`SELECT t.*, u.username,
                  CASE WHEN t.status='pending' AND t.created_at < now() - interval '24 hours' THEN true ELSE false END AS stale
             FROM topups t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100`),
        q(`SELECT t.*, u.username FROM slip_topups t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100`),
        q(`SELECT t.*, u.username FROM truemoney_topups t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100`),
      ]);
      const rows = [
        ...man.rows.map((t) => ({ key: `m-${t.id}`, kind: 'manual', id: t.id, username: t.username, amount: t.amount, pay_amount: t.pay_amount, ref: t.ref, note: '', status: t.status, stale: t.stale, created_at: t.created_at })),
        ...slip.rows.map((t) => ({ key: `b-${t.id}`, kind: 'bank', id: t.id, username: t.username, amount: t.amount, ref: t.trans_ref, note: [t.sender_bank, t.sender_name].filter(Boolean).join(' · '), status: t.status, created_at: t.created_at })),
        ...tm.rows.map((t) => ({ key: `t-${t.id}`, kind: 'truemoney', id: t.id, username: t.username, amount: t.amount, ref: t.voucher_code, note: t.error_code || '', status: t.status, created_at: t.created_at })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const attention = rows.filter((r) => (r.kind === 'manual' && r.status === 'pending' && !r.stale) || (r.kind === 'truemoney' && ['review', 'redeemed'].includes(r.status)));
      return json({ rows: [...attention, ...rows.filter((r) => !attention.includes(r))] });
    }
    // ซอง TrueMoney ที่รับแล้วแต่ยังไม่เครดิต / ไม่แน่ใจผล -> แอดมินเช็กกระเป๋าแล้วกดเครดิตให้
    if (m === 'POST' && (act === 'tm-credit' || act === 'tm-reject')) {
      const out = await tx(async (c) => {
        const t = (await c.query('SELECT * FROM truemoney_topups WHERE id=$1 FOR UPDATE', [nid()])).rows[0];
        if (!t) throw new HttpError(404, 'ไม่พบรายการ');
        if (!['review', 'redeemed'].includes(t.status)) throw new HttpError(409, 'รายการนี้ถูกดำเนินการไปแล้ว');
        if (act === 'tm-credit') {
          await c.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [t.amount, t.user_id]);
          await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [t.user_id, t.amount, `เติมเงิน TrueMoney Voucher #${t.id} (แอดมินยืนยัน)`]);
          await c.query(`UPDATE truemoney_topups SET status='credited',credited_at=now(),error_code=NULL WHERE id=$1`, [t.id]);
        } else {
          await c.query(`UPDATE truemoney_topups SET status='failed',error_code='แอดมินปฏิเสธ' WHERE id=$1`, [t.id]);
        }
        return { ok: true };
      });
      return json(out);
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
        announce_text: str(b.announce_text, { max: 300 }),
        banner_image: safeImage(b.banner_image),
        discord_url: safeUrl(b.discord_url),
        logo: safeImage(b.logo),
        meta_title: str(b.meta_title, { max: 70, name: 'ชื่อพรีวิวลิงก์' }),
        meta_description: str(b.meta_description, { max: 200, name: 'คำอธิบายพรีวิวลิงก์' }),
        og_image: safeImage(b.og_image),
        min_topup: String(int(b.min_topup, { min: 1, max: 50000, name: 'ยอดเติมขั้นต่ำ' })),
        discord_widget_id: (() => {
          const w = str(b.discord_widget_id, { max: 30 });
          if (w && !/^\d{15,25}$/.test(w)) throw new HttpError(400, 'Discord Server ID ต้องเป็นตัวเลข 15-25 หลัก');
          return w;
        })(),
        topup_truemoney_enabled: b.topup_truemoney_enabled === false || b.topup_truemoney_enabled === '0' ? '0' : '1',
        popup_enabled: b.popup_enabled === false || b.popup_enabled === '0' ? '0' : '1',
      };
      const rawItems = Array.isArray(b.popup_items) ? b.popup_items : [];
      if (rawItems.length > 5) throw new HttpError(400, 'ป๊อปอัปประกาศมีได้สูงสุด 5 รายการ');
      const items = rawItems.map((it) => ({
        title: str(it.title, { min: 1, max: 100, name: 'หัวข้อประกาศ' }),
        body: str(it.body, { max: 1500, name: 'ข้อความประกาศ' }),
        image: safeImage(it.image),
        link: safeUrl(it.link),
        button: str(it.button, { max: 30, name: 'ข้อความปุ่ม' }),
      }));
      const itemsJson = JSON.stringify(items);
      clearSettingsCache();
      const cur = await getSettings();
      v.popup_items = itemsJson;
      // เปลี่ยนเลขเวอร์ชันเมื่อเนื้อหาเปลี่ยน เพื่อให้ลูกค้าที่เคยปิดไว้เห็นประกาศใหม่อีกครั้ง
      v.popup_version = cur.popup_items === itemsJson ? cur.popup_version : String(Date.now());
      for (const [k, val] of Object.entries(v))
        await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k, val]);
      clearSettingsCache();
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
