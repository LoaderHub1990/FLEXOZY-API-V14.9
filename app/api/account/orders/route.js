import { route, json } from '@/lib/api';
import { q } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const GET = route(async () => {
  const user = await requireUser();
  const { rows } = await q(
    `SELECT o.id,o.product_name,o.qty,o.total,o.discount,o.created_at,
            coalesce((SELECT json_agg(s.content ORDER BY s.id) FROM stock_items s WHERE s.order_id=o.id),'[]'::json) AS items
       FROM orders o WHERE o.user_id=$1 ORDER BY o.id DESC LIMIT 50`,
    [user.id]
  );
  const tx = await q('SELECT delta,reason,created_at FROM wallet_tx WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [user.id]);
  return json({ orders: rows, wallet: tx.rows });
});
