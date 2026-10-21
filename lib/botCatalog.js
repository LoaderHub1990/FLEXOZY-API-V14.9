import { getProducts } from './shop';
import { keyNote } from './keys';

// รูปแบบสินค้าที่ส่งให้บอท Discord (ราคาเป็นสตางค์) ใช้ร่วมกันระหว่าง /api/bot/catalog และ /api/bot/products
export async function botProducts() {
  const rows = await getProducts();
  return rows
    .filter((p) => p.type === 'key' || p.stock > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category_name || '',
      description: String(p.description || '').replace(/\s+/g, ' ').trim().slice(0, 300),
      stock: p.unlimited ? null : p.stock,
      note: p.type === 'key' ? keyNote(p) : '',
    }));
}
