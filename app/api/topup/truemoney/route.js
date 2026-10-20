import { route, json, body } from '@/lib/api';
import { one, q, tx, HttpError } from '@/lib/db';
import { requireUser, clientIp, rateLimit, recordAttempt, clearAttempts } from '@/lib/auth';
import { extractVoucherCode, redeemVoucher } from '@/lib/truemoney';
import { assertTopupEnabled } from '@/lib/topup';

export const maxDuration = 30;

async function credit(userId, rowId, amount) {
  return tx(async (c) => {
    const row = (await c.query('SELECT id,status FROM truemoney_topups WHERE id=$1 FOR UPDATE', [rowId])).rows[0];
    if (!row || !['redeemed', 'review', 'pending'].includes(row.status)) throw new HttpError(409, 'รายการนี้ถูกดำเนินการไปแล้ว');
    const u = (await c.query('SELECT id,banned FROM users WHERE id=$1 FOR UPDATE', [userId])).rows[0];
    if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    const nb = (await c.query('UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance', [amount, userId])).rows[0].balance;
    await c.query(`UPDATE truemoney_topups SET amount=$1,status='credited',credited_at=now(),error_code=NULL WHERE id=$2`, [amount, rowId]);
    await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [userId, amount, `เติมเงิน TrueMoney Voucher #${rowId}`]);
    return nb;
  });
}

// รับซองอั่งเปา TrueMoney อัตโนมัติ: กดรับเข้าเบอร์ร้านทันที -> เช็กยอดที่ TrueMoney ยืนยัน -> เครดิตเท่ายอดนั้น
export const POST = route(async (req) => {
  const user = await requireUser();
  await assertTopupEnabled('truemoney');
  const b = await body(req);
  const code = extractVoucherCode(b.voucher);
  const ip = await clientIp();
  const key = `tmn:${user.id}:${ip}`;
  await rateLimit(key, 5, 10);

  const existing = await one('SELECT id,status FROM truemoney_topups WHERE voucher_code=$1', [code]);
  if (existing) {
    if (existing.status === 'credited') throw new HttpError(409, 'ซองนี้ถูกใช้เติมเงินไปแล้ว');
    if (existing.status === 'redeemed' || existing.status === 'review') throw new HttpError(409, 'ซองนี้อยู่ระหว่างให้แอดมินตรวจสอบ กรุณารอหรือติดต่อแอดมิน');
  }

  // จองซอง: ซองที่เคยล้มเหลว (หรือค้างเกิน 10 นาที) ลองใหม่ได้ ไม่ติดบล็อกถาวร
  const claim = await one(
    `INSERT INTO truemoney_topups(user_id,voucher_code,amount,status) VALUES($1,$2,1,'pending')
     ON CONFLICT (voucher_code) DO UPDATE SET user_id=EXCLUDED.user_id,status='pending',created_at=now(),error_code=NULL
       WHERE truemoney_topups.status='failed' OR (truemoney_topups.status='pending' AND truemoney_topups.created_at < now() - interval '10 minutes')
     RETURNING id`,
    [user.id, code]
  );
  if (!claim) throw new HttpError(409, 'ซองนี้กำลังถูกตรวจสอบ กรุณารอสักครู่');
  await recordAttempt(key);

  const fail = (e) => q(`UPDATE truemoney_topups SET status='failed',error_code=$1 WHERE id=$2 AND status='pending'`, [String(e?.message || 'ERROR').slice(0, 120), claim.id]).catch(() => {});

  let got;
  try {
    got = await redeemVoucher(code);
  } catch (e) {
    if (e instanceof HttpError && e.status >= 500 && !e.notRedeemed) {
      // ไม่รู้ว่า TrueMoney รับซองไปหรือยัง (timeout/เน็ตหลุด) -> ห้ามปล่อยให้ลองซ้ำเอง ให้แอดมินเช็กกระเป๋าแล้วกดเครดิต
      await q(`UPDATE truemoney_topups SET status='review',error_code=$1 WHERE id=$2`, [String(e.message).slice(0, 120), claim.id]);
      throw new HttpError(502, `ยังยืนยันผลการรับซองไม่ได้ แอดมินจะตรวจสอบและเติมเครดิตให้ถ้าเงินเข้าแล้ว (รายการ #${claim.id})`);
    }
    await fail(e);
    throw e;
  }

  // เงินเข้ากระเป๋าร้านแล้ว — จดทันที เผื่อขั้นเครดิตมีปัญหาจะได้ตามเก็บได้
  await q(`UPDATE truemoney_topups SET status='redeemed',amount=$1,redeemed_at=now() WHERE id=$2`, [got.amount, claim.id]);

  let balance, lastErr;
  for (let i = 0; i < 3 && balance === undefined; i++) {
    try { balance = await credit(user.id, claim.id, got.amount); } catch (e) {
      lastErr = e;
      if (e instanceof HttpError) break;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  if (balance === undefined) {
    await q(`UPDATE truemoney_topups SET error_code=$1 WHERE id=$2`, [String(lastErr?.message || 'credit_failed').slice(0, 120), claim.id]).catch(() => {});
    throw new HttpError(500, `รับซองสำเร็จแล้วแต่เติมเครดิตไม่สำเร็จ กรุณาติดต่อแอดมิน (รายการ #${claim.id})`);
  }

  await clearAttempts(key);
  return json({ ok: true, amount: got.amount, balance });
});
