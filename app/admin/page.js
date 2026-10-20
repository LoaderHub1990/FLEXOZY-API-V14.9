import { getUser } from '@/lib/auth';
import Admin from '@/components/Admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'หลังบ้าน' };

export default async function AdminPage() {
  const u = await getUser();
  if (!u || u.role !== 'admin')
    return (
      <div className="wrap"><div className="empty">ไม่มีสิทธิ์เข้าถึงหน้านี้ — ต้องเข้าสู่ระบบด้วยบัญชีแอดมิน</div></div>
    );
  return <div className="wrap"><Admin /></div>;
}
