import { route, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getProducts } from '@/lib/shop';

// บอท Discord: รายการสินค้าที่ซื้อได้ (ราคาเป็นสตางค์)
export const GET = route(async () => {
  await requireUser();
  const rows = await getProducts();
  return json({
    products: rows
      .filter((p) => p.type === 'key' || p.stock > 0)
      .slice(0, 25)
      .map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.unlimited ? null : p.stock })),
  });
});
