import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

// เสิร์ฟรูปที่ผู้เช่าอัปโหลด (เก็บในฐานข้อมูล) — เฉพาะ jpeg/png/webp, แคชยาว เพราะ id ไม่ซ้ำและไม่แก้ไขภายหลัง
export async function GET(_req, { params }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return new Response('Not found', { status: 404 });
  const r = await one('SELECT mime,data FROM t_images WHERE id=$1', [id]);
  if (!r) return new Response('Not found', { status: 404 });
  return new Response(r.data, {
    headers: {
      'Content-Type': r.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
