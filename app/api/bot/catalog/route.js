import { route, json } from '@/lib/api';
import { requireBot } from '@/lib/auth';
import { botProducts } from '@/lib/botCatalog';

export const dynamic = 'force-dynamic';

// บอท Discord: รายการสินค้าทั้งหมดบนเว็บ (ไม่ต้องผูกบัญชีผู้ใช้) ใช้สร้าง/รีเฟรชช่องเลื่อนเลือกสินค้า
export const GET = route(async () => {
  await requireBot();
  return json({ products: await botProducts() });
});
