import crypto from 'crypto';
import * as db from '@/lib/db';
import { getUser, hashKey, readSession, COOKIE } from '@/lib/auth';
import { ok, fail, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
// สร้าง / สร้างใหม่ API Key (ต้องล็อกอินผ่านเว็บเท่านั้น)
export const POST = wrap(async (req) => {
  if (!readSession(req.cookies.get(COOKIE)?.value)) return fail('กรุณาเข้าสู่ระบบก่อน', 401);
  const u = await getUser(req);
  if (!u) return fail('กรุณาเข้าสู่ระบบก่อน', 401);
  const key = 'fx_' + crypto.randomBytes(24).toString('hex');
  if (u.apiKey) await db.set('key:' + hashKey(u.apiKey), null);
  else await db.incr('stat:creators');
  await db.set('key:' + hashKey(key), u.id);
  await db.set('user:' + u.id, { ...u, apiKey: key });
  return ok({ apiKey: key });
});
