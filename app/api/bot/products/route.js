import { route, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { botProducts } from '@/lib/botCatalog';

// บอท Discord: รายการสินค้าที่ซื้อได้ (ราคาเป็นสตางค์) — ต้องผูก Discord กับบัญชีเว็บแล้ว
export const GET = route(async () => {
  await requireUser();
  return json({ products: await botProducts() });
});
