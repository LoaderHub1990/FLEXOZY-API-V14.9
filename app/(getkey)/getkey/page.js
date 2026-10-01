import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
// /getkey → หน้าตัวอย่าง (slug ตั้งได้ที่ Admin > ตั้งค่าเว็บ)
export default async function Demo() {
  const s = await getSettings();
  redirect('/getkey/' + s.demo);
}
