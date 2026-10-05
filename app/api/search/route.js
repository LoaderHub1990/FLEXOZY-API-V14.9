import { route, json } from '@/lib/api';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const term = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 50);
  const like = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
  const products = await q(
    `SELECT p.id,p.name,p.price,p.image,c.name AS category,
            (SELECT count(*)::int FROM stock_items s WHERE s.product_id=p.id AND NOT s.sold) AS stock
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE p.active AND ($1 = '%%' OR p.name ILIKE $1 OR c.name ILIKE $1)
      ORDER BY p.sort,p.id LIMIT 8`,
    [like]
  );
  const cats = await q('SELECT id,name FROM categories WHERE ($1 = \'%%\' OR name ILIKE $1) ORDER BY sort LIMIT 5', [like]);
  return json({ products: products.rows, categories: cats.rows });
});
