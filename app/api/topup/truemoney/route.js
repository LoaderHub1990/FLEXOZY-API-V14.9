import { route, json, body } from '@/lib/api';
import { one, q, tx, HttpError } from '@/lib/db';
import { requireUser, clientIp, rateLimit, recordAttempt, clearAttempts } from '@/lib/auth';
import { extractVoucherCode, redeemTrueMoney } from '@/lib/truemoney';
import { assertTopupEnabled } from '@/lib/topup';

export const POST = route(async (req) => {
  const user = await requireUser();
  await assertTopupEnabled('truemoney');
  const b = await body(req);
  const voucherCode = extractVoucherCode(b.voucher);
  const ip = await clientIp();
  const key = `tmn:${user.id}:${ip}`;
  await rateLimit(key, 5, 10);

  const existing = await one('SELECT id,status FROM truemoney_topups WHERE voucher_code=$1', [voucherCode]);
  if (existing) {
    if (existing.status === 'credited') throw new HttpError(409, 'ซองนี้ถูกใช้เติมเงินไปแล้ว');
    if (existing.status === 'pending') throw new HttpError(409, 'ซองนี้กำลังถูกตรวจสอบ กรุณารอสักครู่');
  }

  const pending = await one(
    `INSERT INTO truemoney_topups(user_id,voucher_code,amount,status)
     VALUES($1,$2,1,'pending')
     ON CONFLICT (voucher_code) DO NOTHING
     RETURNING id`,
    [user.id, voucherCode]
  );
  if (!pending) throw new HttpError(409, 'ซองนี้ถูกส่งเข้าระบบแล้ว');

  await recordAttempt(key);
  try {
    const result = await redeemTrueMoney(voucherCode);
    const min = 1000;
    if (result.amount < min) throw new HttpError(400, 'ยอด TrueMoney ต่ำกว่า 10 บาท');

    const out = await tx(async (c) => {
      const row = (await c.query(
        'SELECT id,user_id,status FROM truemoney_topups WHERE id=$1 FOR UPDATE',
        [pending.id]
      )).rows[0];
      if (!row || row.status !== 'pending') throw new HttpError(409, 'รายการนี้ถูกดำเนินการไปแล้ว');

      const u = (await c.query('SELECT id,balance,banned FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
      if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');

      const nb = (await c.query(
        `UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance`,
        [result.amount, user.id]
      )).rows[0].balance;

      await c.query(
        `UPDATE truemoney_topups SET amount=$1,status='credited',redeemed_at=now(),credited_at=now()
         WHERE id=$2`,
        [result.amount, pending.id]
      );
      await c.query(
        `INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)`,
        [user.id, result.amount, `เติมเงิน TrueMoney Voucher #${pending.id}`]
      );
      return { balance: nb, amount: result.amount };
    });

    await clearAttempts(key);
    return json({ ok: true, amount: out.amount, balance: out.balance });
  } catch (e) {
    try {
      await q(
        `UPDATE truemoney_topups SET status='failed',error_code=$1
         WHERE id=$2 AND status='pending'`,
        [e?.message?.slice(0, 120) || 'ERROR', pending.id]
      );
    } catch {}
    throw e;
  }
});
