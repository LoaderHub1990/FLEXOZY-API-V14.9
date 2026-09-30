import * as db from '@/lib/db';
import { getUser } from '@/lib/auth';
import { checkSlip } from '@/lib/slipcheck';
import { ok, fail, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const POST = wrap(async (req) => {
  const user = await getUser(req);
  if (!user) return fail('unauthorized: ต้องส่ง API Key (x-api-key) หรือเข้าสู่ระบบ', 401);
  await db.touch(user.id);
  let payload, image, register = true, maxAgeDays;
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const f = await req.formData();
    const file = f.get('image');
    if (file && typeof file !== 'string') image = Buffer.from(await file.arrayBuffer());
    payload = f.get('payload') || undefined;
    register = f.get('register') !== 'false';
    maxAgeDays = Number(f.get('maxAgeDays')) || undefined;
  } else {
    const b = await req.json().catch(() => null);
    if (!b) return fail('ต้องส่ง JSON หรือ multipart/form-data');
    if (typeof b.image === 'string' && b.image) image = Buffer.from(b.image.replace(/^data:[^,]*,/, ''), 'base64');
    payload = typeof b.payload === 'string' ? b.payload : undefined;
    register = b.register !== false;
    maxAgeDays = Number(b.maxAgeDays) || undefined;
  }
  if (!image && !payload) return fail('ต้องส่ง image (รูปสลิป) หรือ payload (ข้อความ QR บนสลิป)');
  if (image && !image.length) return fail('image ว่างเปล่าหรือ base64 ไม่ถูกต้อง');
  return ok(await checkSlip({ payload, image, userId: user.id, register, maxAgeDays }));
});
