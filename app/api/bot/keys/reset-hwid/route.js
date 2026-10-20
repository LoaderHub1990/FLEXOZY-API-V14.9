import { route, json, body } from '@/lib/api';
import { q, HttpError } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const PUT = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const key = String(b.key || '').trim().toUpperCase();
  if (!key) throw new HttpError(400, 'กรุณาระบุคีย์');
  const row = await q('UPDATE license_keys SET hwid=NULL WHERE key=$1 AND user_id=$2 AND NOT revoked RETURNING key', [key, user.id]);
  if (!row.rows.length) throw new HttpError(404, 'ไม่พบคีย์ในบัญชีของคุณ หรือคีย์ถูกระงับ');
  return json({ ok: true });
});
