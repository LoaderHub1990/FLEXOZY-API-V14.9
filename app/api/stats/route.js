import * as db from '@/lib/db';
import { readSession, COOKIE } from '@/lib/auth';
import { ok, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  let uid = null;
  try { uid = readSession(req.cookies.get(COOKIE)?.value); } catch {}
  if (uid) await db.touch(uid);
  return ok(await db.stats());
});
