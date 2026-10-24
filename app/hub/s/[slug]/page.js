import { notFound } from 'next/navigation';
import { shopBySlug, shopProducts, publicShop } from '@/lib/hub';
import PublicShop from '@/components/hub/PublicShop';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const shop = await shopBySlug((await params).slug);
  return shop ? { title: { absolute: `${shop.name} · Flexozy Shop` }, description: shop.tagline || `ร้าน ${shop.name}` } : { title: { absolute: 'ไม่พบร้านค้า' } };
}

export default async function Page({ params }) {
  const shop = await shopBySlug((await params).slug);
  if (!shop) notFound();
  return <PublicShop initial={publicShop(shop, await shopProducts(shop.id))} />;
}
