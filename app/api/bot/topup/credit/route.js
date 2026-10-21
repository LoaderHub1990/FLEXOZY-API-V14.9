import { route, json, body } from '@/lib/api';
import { requireUser, rateLimit } from '@/lib/auth';
import { tx, HttpError } from '@/lib/db';

// Called by the Discord bot only after its direct TrueMoney request returned SUCCESS.
// The unique voucher_code makes retries idempotent and prevents double crediting.
export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`bot-tm-credit:${user.id}`, 20, 10);
  const b = await body(req);
  const code = String(b.voucherCode || '').trim();
  const amount = Number(b.amount);
  if (!/^[A-Za-z0-9]{10,100}$/.test(code)) throw new HttpError(400, 'รหัสซองไม่ถูกต้อง');
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000000) throw new HttpError(400, 'ยอดเงินไม่ถูกต้อง');

  const result = await tx(async (c) => {
    const inserted = (await c.query(
      `INSERT INTO truemoney_topups(user_id,voucher_code,amount,status,redeemed_at,credited_at)
       VALUES($1,$2,$3,'credited',now(),now()) ON CONFLICT (voucher_code) DO NOTHING RETURNING id`,
      [user.id, code, amount]
    )).rows[0];
    if (!inserted) {
      const old = (await c.query('SELECT user_id,amount,status FROM truemoney_topups WHERE voucher_code=$1 FOR UPDATE', [code])).rows[0];
      if (old?.user_id === user.id && old?.status === 'credited' && Number(old.amount) === amount) {
        const u = (await c.query('SELECT balance FROM users WHERE id=$1', [user.id])).rows[0];
        return { amount: Number(old.amount), balance: Number(u.balance), duplicate: true };
      }
      throw new HttpError(409, 'ซองนี้ถูกใช้หรือกำลังตรวจสอบอยู่แล้ว');
    }
    const u = (await c.query('UPDATE users SET balance=balance+$1 WHERE id=$2 AND banned=false RETURNING balance', [amount, user.id])).rows[0];
    if (!u) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [user.id, amount, `เติมเงิน TrueMoney จาก Discord Bot #${inserted.id}`]);
    return { amount, balance: Number(u.balance), duplicate: false };
  });
  return json({ ok: true, ...result });
});
