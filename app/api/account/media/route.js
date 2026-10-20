import { route, json, body } from '@/lib/api';
import { q, HttpError } from '@/lib/db';
import { requireUser, rateLimit, recordAttempt } from '@/lib/auth';

const LIMIT = { avatar: 160 * 1024, banner: 420 * 1024 };

function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
const kindOf = (k) => { if (!['avatar', 'banner'].includes(k)) throw new HttpError(400, 'ประเภทรูปไม่ถูกต้อง'); return k; };

/** อัปโหลดรูปโปรไฟล์/แบนเนอร์ (ฝั่งเบราว์เซอร์ย่อขนาดมาให้แล้ว — เซิร์ฟเวอร์ตรวจชนิดไฟล์จากไบต์จริงและจำกัดขนาด) */
export const POST = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  const kind = kindOf(b.kind);
  const m = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
  if (!m) throw new HttpError(400, 'ไฟล์รูปไม่ถูกต้อง (รองรับ PNG / JPG / WebP)');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > LIMIT[kind]) throw new HttpError(400, 'ไฟล์ใหญ่เกินไป');
  const mime = sniff(buf);
  if (!mime) throw new HttpError(400, 'ไฟล์ไม่ใช่รูปภาพที่รองรับ');
  const key = `media:${u.id}`;
  await rateLimit(key, 20, 10);
  await recordAttempt(key);
  await q(
    `INSERT INTO user_media(user_id,kind,mime,data) VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id,kind) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data,updated_at=now()`,
    [u.id, kind, mime, buf]
  );
  return json({ ok: true });
});

export const DELETE = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  await q('DELETE FROM user_media WHERE user_id=$1 AND kind=$2', [u.id, kindOf(b.kind)]);
  return json({ ok: true });
});
