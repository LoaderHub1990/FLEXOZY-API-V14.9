import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth';
import { discordConfigured, redirectUri, siteOrigin } from '@/lib/discord';

export const dynamic = 'force-dynamic';

/** เริ่มล็อกอิน/ผูกบัญชีด้วย Discord → ส่งไปหน้าอนุญาตของ Discord */
export async function GET(req) {
  const origin = await siteOrigin();
  if (!discordConfigured()) return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent('ร้านยังไม่ได้ตั้งค่าล็อกอินด้วย Discord')}`);

  const link = new URL(req.url).searchParams.get('mode') === 'link' && !!(await getUser());
  const state = crypto.randomBytes(24).toString('hex');
  const jar = await cookies();
  jar.set('dh_oauth', JSON.stringify({ state, link }), {
    httpOnly: true,
    sameSite: 'lax', // ต้องเป็น lax เพื่อให้คุกกี้ติดมากับการเด้งกลับจาก Discord
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  const u = new URL('https://discord.com/api/oauth2/authorize');
  u.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID);
  u.searchParams.set('redirect_uri', await redirectUri());
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'identify');
  u.searchParams.set('state', state);
  u.searchParams.set('prompt', 'none');
  return NextResponse.redirect(u.toString());
}
