import { route, json, body } from '@/lib/api';
import { q } from '@/lib/db';
import { str } from '@/lib/util';
import { requireUser } from '@/lib/auth';

/** แก้ชื่อที่แสดง / เปิด-ปิดกรอบโปรไฟล์ Discord (ชื่อผู้ใช้สำหรับล็อกอินไม่เปลี่ยน) */
export const POST = route(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  if ('displayName' in b) {
    const name = str(String(b.displayName ?? '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ''), { max: 30, name: 'ชื่อที่แสดง' });
    await q('UPDATE users SET display_name=$1 WHERE id=$2', [name || null, u.id]);
  }
  if ('showFrame' in b) await q('UPDATE users SET show_frame=$1 WHERE id=$2', [b.showFrame !== false, u.id]);
  return json({ ok: true });
});
