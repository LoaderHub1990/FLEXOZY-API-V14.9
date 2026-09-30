import { getUser, publicUser } from '@/lib/auth';
import { ok, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  const u = await getUser(req);
  return ok(u ? publicUser(u) : null);
});
