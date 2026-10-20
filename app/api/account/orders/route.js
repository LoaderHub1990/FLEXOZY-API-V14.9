import { route, json } from '@/lib/api';
import { q } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const GET = route(async () => {
  const user = await requireUser();
  const { rows } = await q(
    `SELECT o.id,o.product_name,o.qty,o.total,o.discount,o.created_at,
            (SELECT json_build_object('rating',r.rating,'comment',r.comment) FROM reviews r WHERE r.order_id=o.id) AS review,
            coalesce((SELECT json_agg(x.c ORDER BY x.k) FROM (
               SELECT s.content AS c, s.id AS k FROM stock_items s WHERE s.order_id=o.id
               UNION ALL
               SELECT l.key AS c, l.id AS k FROM license_keys l WHERE l.order_id=o.id) x),'[]'::json) AS items,
            (SELECT json_agg(json_build_object('key',l.key,'seconds',l.seconds,'activated_at',l.activated_at,'expires_at',l.expires_at,'revoked',l.revoked,'hwid_lock',l.hwid_lock,'hwid_bound',(l.hwid IS NOT NULL),'roblox_id',l.roblox_id::text,'roblox_name',l.roblox_name,'roblox_display',l.roblox_display,'roblox_avatar',l.roblox_avatar) ORDER BY l.id)
               FROM license_keys l WHERE l.order_id=o.id) AS keys
       FROM orders o WHERE o.user_id=$1 ORDER BY o.id DESC LIMIT 50`,
    [user.id]
  );
  const tx = await q('SELECT delta,reason,created_at FROM wallet_tx WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [user.id]);
  return json({ orders: rows, wallet: tx.rows });
});
