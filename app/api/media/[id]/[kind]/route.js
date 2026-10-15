import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** รูปโปรไฟล์/แบนเนอร์ที่ผู้ใช้อัปโหลดเอง (เก็บในฐานข้อมูล เพราะ Vercel เขียนไฟล์ลงดิสก์ไม่ได้) */
export async function GET(req, { params }) {
  const { id, kind } = await params;
  if (!/^\d{1,9}$/.test(id) || !['avatar', 'banner'].includes(kind)) return new Response('Not found', { status: 404 });
  const row = await one('SELECT mime,data FROM user_media WHERE user_id=$1 AND kind=$2', [Number(id), kind]);
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(row.data, {
    headers: {
      'Content-Type': row.mime,
      // URL มี ?v=เวลาอัปเดต อยู่แล้ว จึงแคชยาวได้
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
