import { route, json, body } from '@/lib/api';
import { q, tx, HttpError } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { KEY_RE } from '@/lib/keys';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const user = await requireUser();
  const { rows } = await q(
    `SELECT key, product_name, seconds, hwid, hwid_lock, activated_at, expires_at, revoked
       FROM license_keys WHERE user_id=$1 ORDER BY id DESC LIMIT 100`, [user.id]);
  return json({ keys: rows });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const key = String(b.key || '').trim().toUpperCase();
  if (!KEY_RE.test(key)) throw new HttpError(400, 'รูปแบบคีย์ไม่ถูกต้อง');
  const result = await tx(async (c) => {
    const row = (await c.query('SELECT id,user_id,revoked,expires_at FROM license_keys WHERE key=$1 FOR UPDATE', [key])).rows[0];
    if (!row) throw new HttpError(404, 'ไม่พบคีย์นี้');
    if (row.revoked) throw new HttpError(400, 'คีย์นี้ถูกระงับ');
    if (row.expires_at && new Date(row.expires_at) <= new Date()) throw new HttpError(400, 'คีย์นี้หมดอายุแล้ว');
    if (row.user_id && Number(row.user_id) !== Number(user.id)) throw new HttpError(409, 'คีย์นี้ถูกผูกกับบัญชีอื่นแล้ว');
    await c.query('UPDATE license_keys SET user_id=$1 WHERE id=$2 AND (user_id IS NULL OR user_id=$1)', [user.id, row.id]);
    return { ok: true, key };
  });
  return json(result);
});
