import { route, json, body } from '@/lib/api';
import { q, one, HttpError } from '@/lib/db';
import { str } from '@/lib/util';
import { hashPassword, createSession, clientIp, rateLimit, recordAttempt } from '@/lib/auth';

export const POST = route(async (req) => {
  const b = await body(req);
  const username = str(b.username, { min: 3, max: 20, name: 'ชื่อผู้ใช้' });
  const email = str(b.email, { min: 5, max: 100, name: 'อีเมล' }).toLowerCase();
  const password = str(b.password, { min: 8, max: 72, name: 'รหัสผ่าน' });
  if (!/^[A-Za-z0-9_.]+$/.test(username)) throw new HttpError(400, 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 _ .');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'อีเมลไม่ถูกต้อง');
  const key = `reg:${await clientIp()}`;
  await rateLimit(key, 10, 60);
  const dup = await one('SELECT 1 FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($2)', [username, email]);
  if (dup) throw new HttpError(409, 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว');
  await recordAttempt(key);
  let u;
  try {
    u = await one('INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id', [
      username, email, await hashPassword(password),
    ]);
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว');
    throw e;
  }
  await createSession(u.id);
  return json({ ok: true });
});
