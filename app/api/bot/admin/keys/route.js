import { route, json, body } from '@/lib/api';
import { headers } from 'next/headers';
import { one, tx, HttpError } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { issueKeys } from '@/lib/keys';

export const dynamic = 'force-dynamic';
export const POST = route(async (req) => {
  await requireUser(); // validates BOT_API_SECRET + X-Discord-Id and requires a linked account
  const h = await headers();
  const discordId = h.get('x-discord-id') || '';
  const admins = String(process.env.BOT_ADMIN_DISCORD_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!admins.includes(discordId)) throw new HttpError(403, 'ไม่มีสิทธิ์ออกคีย์จากบอท');
  const productId = Number(process.env.PREMIUM_PRODUCT_ID);
  if (!Number.isInteger(productId) || productId < 1) throw new HttpError(503, 'เว็บยังไม่ได้ตั้งค่า PREMIUM_PRODUCT_ID');
  const b = await body(req);
  const product = await one("SELECT id,name,key_prefix,key_seconds,key_start,key_hwid FROM products WHERE id=$1 AND type='key' AND active", [productId]);
  if (!product) throw new HttpError(404, 'PREMIUM_PRODUCT_ID ไม่ชี้ไปยังสินค้า Key ที่เปิดใช้งาน');
  const targetDiscordId = String(b.targetDiscordId || '').trim();
  const note = String(b.note || '').slice(0, 120);
  const linked = targetDiscordId ? await one('SELECT id FROM users WHERE discord_id=$1 AND NOT banned', [targetDiscordId]) : null;
  const keys = await tx((c) => issueKeys(c, { product, qty: 1, userId: linked?.id || null, note: note || 'ออกจาก Discord bot' }));
  return json({ ok: true, key: keys[0], assigned: !!linked });
});
