import { route, json, body } from '@/lib/api';
import { one, q, HttpError } from '@/lib/db';
import { str } from '@/lib/util';
import { requireUser, checkPassword, hashPassword } from '@/lib/auth';

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const cur = str(b.current, { min: 1, max: 72, name: 'รหัสผ่านเดิม' });
  const next = str(b.next, { min: 8, max: 72, name: 'รหัสผ่านใหม่' });
  const row = await one('SELECT password_hash FROM users WHERE id=$1', [user.id]);
  if (!(await checkPassword(cur, row.password_hash))) throw new HttpError(400, 'รหัสผ่านเดิมไม่ถูกต้อง');
  await q('UPDATE users SET password_hash=$1 WHERE id=$2', [await hashPassword(next), user.id]);
  return json({ ok: true });
});
