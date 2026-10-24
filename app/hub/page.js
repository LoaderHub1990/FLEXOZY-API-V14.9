import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Landing from '@/components/hub/Landing';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: { absolute: 'Flexozy Shop — ร้านค้าบอท Discord ของคุณ' },
  description: 'ล็อกอินด้วย Discord เพิ่มสินค้า ใส่ไอดีเซิร์ฟเวอร์ บอทสร้างร้านให้ทันที สต็อกเรียลไทม์ มี API เช็คสต็อก',
  robots: { index: true },
};

export default async function Page() {
  const base = (await headers()).get('x-hub-base') ?? '';
  const u = await getUser();
  if (u?.discord_id) redirect(`${base}/dashboard`);
  return <Landing />;
}
