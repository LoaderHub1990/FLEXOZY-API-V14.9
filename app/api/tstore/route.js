import crypto from 'crypto';
import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { clientIp, rateLimit, recordAttempt, clearAttempts } from '@/lib/auth';
import { validateGiftLink, extractVoucherCode, redeemVoucher } from '@/lib/truemoney';
import { validPhone } from '@/lib/phone';
import { activeRental, getTUser, tCreateSession, tDestroySession, tHash, tCompare, getCatalog } from '@/lib/tstore';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;


/** ตรวจโค้ดส่วนลด (ต้องเรียกในธุรกรรมที่ล็อกแถวคูปองแล้วถ้าจะใช้จริง) → { coupon, discount } */
async function applyCoupon(c, r, userId, code, total, lock) {
  const cp = (await c.query(`SELECT * FROM t_coupons WHERE rental_id=$1 AND upper(code)=upper($2) ${lock ? 'FOR UPDATE' : ''}`, [r.id, code])).rows[0];
  if (!cp || !cp.active) throw new HttpError(400, 'โค้ดส่วนลดไม่ถูกต้อง');
  if (cp.expires_at && new Date(cp.expires_at) < new Date()) throw new HttpError(400, 'โค้ดส่วนลดหมดอายุแล้ว');
  if (cp.max_uses > 0 && cp.used >= cp.max_uses) throw new HttpError(400, 'โค้ดส่วนลดถูกใช้ครบแล้ว');
  if (total < Number(cp.min_total)) throw new HttpError(400, `ต้องมียอดสั่งซื้อขั้นต่ำ ${(Number(cp.min_total) / 100).toLocaleString('th-TH')} ฿`);
  if (cp.once_per_user && (await c.query('SELECT 1 FROM t_coupon_uses WHERE coupon_id=$1 AND user_id=$2', [cp.id, userId])).rows.length) throw new HttpError(400, 'คุณใช้โค้ดนี้ไปแล้ว');
  const discount = cp.kind === 'percent' ? Math.floor((total * Number(cp.value)) / 100) : Math.min(Number(cp.value), total);
  return { cp, discount };
}

const needUser = async (r) => { const u = await getTUser(r); if (!u) throw new HttpError(401, 'กรุณาเข้าสู่ระบบก่อน'); return u; };

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const r = await activeRental(sp.get('sub'));
  if (sp.has('orders')) {
    const u = await needUser(r);
    const { rows } = await q('SELECT id,product_name,qty,total,delivered,created_at FROM t_orders WHERE rental_id=$1 AND user_id=$2 ORDER BY id DESC LIMIT 50', [r.id, u.id]);
    return json({ rows: rows.map((x) => ({ ...x, total: Number(x.total) })) });
  }
  return json({ ...(await getCatalog(r.id, { demo: r.demo })), me: await getTUser(r) });
});

export const POST = route(async (req) => {
  const b = await body(req);
  const r = await activeRental(b.sub);
  const ip = await clientIp();
  const act = String(b.action || '');

  if (act === 'register') {
    const username = str(b.username, { min: 3, max: 20, name: 'ชื่อผู้ใช้' });
    const password = str(b.password, { min: 8, max: 72, name: 'รหัสผ่าน' });
    if (!/^[A-Za-z0-9_.]+$/.test(username)) throw new HttpError(400, 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 _ .');
    const key = `treg:${ip}`;
    await rateLimit(key, 10, 60);
    await recordAttempt(key);
    let u;
    try { u = await one('INSERT INTO t_users(rental_id,username,pass_hash) VALUES($1,$2,$3) RETURNING id', [r.id, username, await tHash(password)]); }
    catch (e) { if (e.code === '23505') throw new HttpError(409, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'); throw e; }
    await tCreateSession(r, u.id);
    return json({ ok: true });
  }
  if (act === 'login') {
    const key = `tlogin:${r.id}:${ip}`;
    await rateLimit(key, 10, 15);
    const u = await one('SELECT id,pass_hash,banned FROM t_users WHERE rental_id=$1 AND lower(username)=lower($2)', [r.id, String(b.username || '').slice(0, 20)]);
    if (!u || !(await tCompare(String(b.password || '').slice(0, 72), u.pass_hash))) { await recordAttempt(key); throw new HttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); }
    if (u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    await clearAttempts(key);
    await tCreateSession(r, u.id);
    return json({ ok: true });
  }
  if (act === 'logout') { await tDestroySession(r); return json({ ok: true }); }

  const me = await needUser(r);

  // ---------- เติมเงินด้วยซองอั่งเปา TrueMoney (เงินเข้าเบอร์ของเจ้าของร้านโดยตรง) ----------
  if (act === 'topup') {
    const link = String(b.voucher || '').trim();
    if (!validateGiftLink(link)) throw new HttpError(400, 'รูปแบบลิงก์อั่งเปาไม่ถูกต้อง (ต้องเป็น https://gift.truemoney.com/campaign/?v=...)');
    if (r.demo) { // ร้านทดลอง: ให้เงินเดโม 100 บาทต่อครั้ง ไม่แตะ TrueMoney
      const key = `tdemo:${r.id}:${me.id}`;
      await rateLimit(key, 10, 60); await recordAttempt(key);
      const nb = (await q('UPDATE t_users SET balance=balance+10000 WHERE id=$1 RETURNING balance', [me.id])).rows[0].balance;
      return json({ ok: true, demo: true, amount: 10000, balance: Number(nb) });
    }
    const phone = r.site?.pay_phone;
    if (!validPhone(phone)) throw new HttpError(400, 'ร้านนี้ยังไม่เปิดรับเติมเงิน');
    const code = extractVoucherCode(link);
    const key = `ttop:${r.id}:${me.id}:${ip}`;
    await rateLimit(key, 5, 10);
    const ex = await one('SELECT status FROM t_topups WHERE voucher_code=$1', [code]);
    if (ex?.status === 'credited') throw new HttpError(409, 'ซองนี้ถูกใช้ไปแล้ว');
    if (ex && ['redeemed', 'review'].includes(ex.status)) throw new HttpError(409, 'ซองนี้อยู่ระหว่างตรวจสอบ กรุณาติดต่อเจ้าของร้าน');
    const claim = await one(
      `INSERT INTO t_topups(rental_id,user_id,voucher_code,status) VALUES($1,$2,$3,'pending')
       ON CONFLICT (voucher_code) DO UPDATE SET user_id=EXCLUDED.user_id,rental_id=EXCLUDED.rental_id,status='pending',created_at=now(),error_code=NULL
         WHERE t_topups.status='failed' OR (t_topups.status='pending' AND t_topups.created_at < now() - interval '10 minutes')
       RETURNING id`, [r.id, me.id, code]);
    if (!claim) throw new HttpError(409, 'ซองนี้กำลังถูกตรวจสอบ กรุณารอสักครู่');
    await recordAttempt(key);
    const res = await redeemVoucher(link, phone);
    if (!res.success) {
      if (res.error === 'NETWORK_ERROR') {
        await q(`UPDATE t_topups SET status='review',error_code='NETWORK_ERROR' WHERE id=$1`, [claim.id]);
        throw new HttpError(502, `ยังยืนยันผลการรับซองไม่ได้ เจ้าของร้านจะตรวจสอบและเติมเงินให้ถ้าเงินเข้าแล้ว (รายการ #${claim.id})`);
      }
      await q(`UPDATE t_topups SET status='failed',error_code=$1 WHERE id=$2`, [String(res.error).slice(0, 80), claim.id]);
      throw new HttpError(400, res.message);
    }
    const amount = Math.round(res.amount * 100);
    if (!(amount > 0)) {
      await q(`UPDATE t_topups SET status='review',error_code='NO_AMOUNT' WHERE id=$1`, [claim.id]);
      throw new HttpError(502, `ยืนยันซองแล้วแต่ไม่พบยอดเงิน เจ้าของร้านจะตรวจสอบให้ (รายการ #${claim.id})`);
    }
    await q(`UPDATE t_topups SET status='redeemed',amount=$1 WHERE id=$2`, [amount, claim.id]); // เงินเข้ากระเป๋าเจ้าของแล้ว จดไว้ก่อน
    let balance;
    for (let i = 0; i < 3 && balance === undefined; i++) {
      try {
        balance = await tx(async (c) => {
          const nb = (await c.query('UPDATE t_users SET balance=balance+$1 WHERE id=$2 RETURNING balance', [amount, me.id])).rows[0].balance;
          await c.query(`UPDATE t_topups SET status='credited' WHERE id=$1 AND status='redeemed'`, [claim.id]);
          return Number(nb);
        });
      } catch { await new Promise((x) => setTimeout(x, 300 * (i + 1))); }
    }
    if (balance === undefined) throw new HttpError(500, `รับซองสำเร็จแล้วแต่เติมเงินไม่สำเร็จ กรุณาติดต่อเจ้าของร้าน (รายการ #${claim.id})`);
    await clearAttempts(key);
    return json({ ok: true, amount, balance });
  }

  if (act === 'coupon') { // ดูส่วนลดล่วงหน้า (ไม่ตัดสิทธิ์)
    const p = await one('SELECT price FROM t_products WHERE id=$1 AND rental_id=$2 AND active', [int(b.productId, { min: 1, name: 'สินค้า' }), r.id]);
    if (!p) throw new HttpError(404, 'ไม่พบสินค้านี้');
    const qty = int(b.qty ?? 1, { min: 1, max: 20, name: 'จำนวน' });
    const total = Number(p.price) * qty;
    const { discount } = await applyCoupon({ query: (t, a) => q(t, a) }, r, me.id, String(b.code || '').trim().slice(0, 40), total, false);
    return json({ ok: true, discount, total: total - discount });
  }

  // ---------- ซื้อสินค้า (หักเงิน + ส่งของในธุรกรรมเดียว) ----------
  if (act === 'buy') {
    const pid = int(b.productId, { min: 1, name: 'สินค้า' });
    const qty = int(b.qty ?? 1, { min: 1, max: 20, name: 'จำนวน' });
    const out = await tx(async (c) => {
      const u = (await c.query('SELECT id,username,balance,banned FROM t_users WHERE id=$1 AND rental_id=$2 FOR UPDATE', [me.id, r.id])).rows[0];
      if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
      const p = (await c.query('SELECT * FROM t_products WHERE id=$1 AND rental_id=$2 AND active FOR UPDATE', [pid, r.id])).rows[0];
      if (!p) throw new HttpError(404, 'ไม่พบสินค้านี้');
      let total = Number(p.price) * qty, discount = 0, couponCode = '', cpRow = null;
      const code = String(b.coupon || '').trim().slice(0, 40);
      if (code) { const a = await applyCoupon(c, r, u.id, code, total, true); discount = a.discount; total -= discount; cpRow = a.cp; couponCode = cpRow.code; }
      if (Number(u.balance) < total) throw new HttpError(402, 'ยอดเงินคงเหลือไม่พอ กรุณาเติมเงินก่อน');
      let items = [], stockIds = [];
      if (p.unlimited) {
        items = Array.from({ length: qty }, () => (r.demo ? `DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : (p.delivery_text || 'ขอบคุณที่สั่งซื้อ')));
      } else {
        const st = (await c.query('SELECT id,content FROM t_stock WHERE product_id=$1 AND NOT sold ORDER BY ' + (p.pick_random ? 'random()' : 'id') + ' LIMIT $2 FOR UPDATE SKIP LOCKED', [p.id, qty])).rows;
        if (st.length < qty) throw new HttpError(409, st.length ? `สินค้าเหลือแค่ ${st.length} ชิ้น` : 'สินค้าหมด');
        items = st.map((x) => x.content); stockIds = st.map((x) => x.id);
      }
      const nb = (await c.query('UPDATE t_users SET balance=balance-$1 WHERE id=$2 RETURNING balance', [total, u.id])).rows[0].balance;
      const o = (await c.query('INSERT INTO t_orders(rental_id,user_id,username,product_id,product_name,qty,total,delivered,coupon,discount) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [r.id, u.id, u.username, p.id, p.name, qty, total, items.join('\n'), couponCode, discount])).rows[0];
      if (stockIds.length) await c.query('UPDATE t_stock SET sold=TRUE,order_id=$1 WHERE id = ANY($2::int[])', [o.id, stockIds]);
      await c.query('UPDATE t_products SET sold=sold+$1 WHERE id=$2', [qty, p.id]);
      if (cpRow) { await c.query('UPDATE t_coupons SET used=used+1 WHERE id=$1', [cpRow.id]); await c.query('INSERT INTO t_coupon_uses(coupon_id,user_id) VALUES($1,$2)', [cpRow.id, u.id]); }
      return { orderId: o.id, items, total, discount, balance: Number(nb), name: p.name };
    });
    return json({ ok: true, ...out });
  }
  throw new HttpError(400, 'คำสั่งไม่ถูกต้อง');
});
