import { route, json, body } from '@/lib/api';
import { one, HttpError } from '@/lib/db';
import { str } from '@/lib/util';
import { checkPassword, createSession, clientIp, rateLimit, recordAttempt, clearAttempts } from '@/lib/auth';

export const POST = route(async (req) => {
  const b = await body(req);
  const username = str(b.username, { min: 1, max: 100, name: 'ชื่อผู้ใช้' });
  const password = str(b.password, { min: 1, max: 72, name: 'รหัสผ่าน' });
  const ip = await clientIp();
  const k1 = `login:${ip}:${username.toLowerCase()}`;
  const k2 = `loginip:${ip}`;
  await rateLimit(k1, 6, 15);
  await rateLimit(k2, 30, 15);
  const u = await one('SELECT id,password_hash,banned FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1)', [username]);
  const ok = u && (await checkPassword(password, u.password_hash));
  if (!ok) {
    await recordAttempt(k1);
    await recordAttempt(k2);
    throw new HttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  if (u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
  await clearAttempts(k1);
  await createSession(u.id);
  return json({ ok: true });
});
