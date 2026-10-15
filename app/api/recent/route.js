import { route, json } from '@/lib/api';
import { getRecentOrders } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export const GET = route(async () => json({ orders: await getRecentOrders(12) }));
