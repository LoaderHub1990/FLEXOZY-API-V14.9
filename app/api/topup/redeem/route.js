import { route, json, body } from '@/lib/api';
import { tx, HttpError } from '@/lib/db';
import { requireUser, clientIp, rateLimit, recordAttempt, clearAttempts } from '@/lib/auth';

// เติมเงินด้วยโค้ด (แอดมินสร้างโค้ดไว้ที่หลังบ้าน → ลูกค้ากรอกโค้ด → ได้เครดิตทันที)
export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const code = String(b.code || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{4,40}$/.test(code)) throw new HttpError(400, 'รูปแบบโค้ดไม่ถูกต้อง');
  const key = `rdm:${user.id}:${await clientIp()}`;
  await rateLimit(key, 8, 10); // กันเดาโค้ด: ผิดเกิน 8 ครั้งใน 10 นาทีจะถูกชะลอ

  try {
    const r = await tx(async (c) => {
      const row = (await c.query('SELECT * FROM redeem_codes WHERE code=$1 FOR UPDATE', [code])).rows[0];
      if (!row || !row.active) throw new HttpError(404, 'ไม่พบโค้ดนี้ หรือโค้ดถูกปิดใช้งานแล้ว');
      if (row.expires_at && new Date(row.expires_at) < new Date()) throw new HttpError(410, 'โค้ดนี้หมดอายุแล้ว');
      if (row.used >= row.max_uses) throw new HttpError(409, 'โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว');
      const u = (await c.query('SELECT id,banned FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
      if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
      const dup = (await c.query('SELECT 1 FROM redeem_uses WHERE code=$1 AND user_id=$2', [code, user.id])).rows[0];
      if (dup) throw new HttpError(409, 'บัญชีนี้เคยใช้โค้ดนี้ไปแล้ว');
      await c.query('UPDATE redeem_codes SET used=used+1 WHERE code=$1', [code]);
      await c.query('INSERT INTO redeem_uses(code,user_id,amount) VALUES($1,$2,$3)', [code, user.id, row.amount]);
      const nb = (await c.query('UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance', [row.amount, user.id])).rows[0].balance;
      await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [user.id, row.amount, `เติมเงินด้วยโค้ด ${code}`]);
      return { amount: Number(row.amount), balance: nb };
    });
    await clearAttempts(key);
    return json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof HttpError && [404, 410].includes(e.status)) await recordAttempt(key);
    throw e;
  }
});
