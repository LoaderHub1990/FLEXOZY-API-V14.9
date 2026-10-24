import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Dashboard from '@/components/hub/Dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: { absolute: 'แดชบอร์ด · Flexozy Shop' }, robots: { index: false } };

export default async function Page() {
  const base = (await headers()).get('x-hub-base') ?? '/shop';
  const u = await getUser();
  if (!u || !u.discord_id) redirect(`${base}/login`); // ไม่ใช่เจ้าของบัญชี Discord ที่ล็อกอินไว้ → เข้าไม่ได้
  return <Dashboard base={base} />;
}
