import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { slug, kind } = await params;
  if (kind !== 'logo' && kind !== 'banner') return new Response('not found', { status: 404 });
  const r = await one(
    `SELECT m.mime,m.data FROM shop_media m JOIN shops s ON s.id=m.shop_id WHERE lower(s.slug)=lower($1) AND s.active AND m.kind=$2`,
    [String(slug).slice(0, 40), kind]
  );
  if (!r) return new Response('not found', { status: 404 });
  return new Response(r.data, {
    headers: { 'Content-Type': r.mime, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cache-Control': 'public, max-age=3600' },
  });
}
