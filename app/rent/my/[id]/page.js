import StoreManage from '@/components/StoreManage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'จัดการร้านเช่า', robots: { index: false } };

export default async function Page({ params }) {
  const { id } = await params;
  return <div className="wrap"><StoreManage id={Number(id) || 0} /></div>;
}
