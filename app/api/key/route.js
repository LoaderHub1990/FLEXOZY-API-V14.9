import * as db from '@/lib/db';
import { getUser, makeKey, signSession, parseSession, COOKIE } from '@/lib/auth';
import { ok, fail, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
// สร้าง / สร้างใหม่ API Key (ต้องล็อกอินผ่านเว็บเท่านั้น)
export const POST = wrap(async (req) => {
  const s = parseSession(req.cookies.get(COOKIE)?.value);
  if (!s) return fail('กรุณาเข้าสู่ระบบก่อน', 401);
  const u = await getUser(req);
  if (!u) return fail('กรุณาเข้าสู่ระบบก่อน', 401);
  const first = u.keyVer == null;
  const ver = (Number(u.keyVer) || 0) + 1;
  const { apiKey: _old, ...rest } = u;
  try {
    await db.set('user:' + u.id, { ...rest, keyVer: ver, createdAt: u.createdAt || Date.now() });
    if (first) await db.incr('stat:creators');
  } catch (e) { console.error('db', e); }
  const res = ok({ apiKey: makeKey(u.id, ver) });
  res.cookies.set(COOKIE, signSession({ ...s.p, id: u.id }, ver), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 86400, path: '/' });
  return res;
});
