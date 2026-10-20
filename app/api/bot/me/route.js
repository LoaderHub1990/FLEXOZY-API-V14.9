import { route, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';

// บอท Discord: ดูยอดเงินของผู้ใช้ที่ผูก Discord ไว้ (ใช้ Authorization: Bot <BOT_API_SECRET> + X-Discord-Id)
export const GET = route(async () => {
  const u = await requireUser();
  return json({ username: u.display_name || u.discord_name || u.username, balance: u.balance });
});
