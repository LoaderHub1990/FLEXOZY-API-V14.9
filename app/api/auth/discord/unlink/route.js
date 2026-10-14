import { route, json } from '@/lib/api';
import { q } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { HttpError } from '@/lib/db';

export const POST = route(async () => {
  const u = await requireUser();
  if (u.email.endsWith('@discord.local')) {
    throw new HttpError(400, 'บัญชีนี้สมัครผ่าน Discord จึงยกเลิกการผูกไม่ได้ (จะเข้าสู่ระบบไม่ได้)');
  }
  await q('UPDATE users SET discord_id=NULL,discord_username=NULL,discord_name=NULL,discord_avatar=NULL WHERE id=$1', [u.id]);
  return json({ ok: true });
});
