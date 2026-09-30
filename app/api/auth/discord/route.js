import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { site, wrap, fail } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  if (!process.env.DISCORD_CLIENT_ID) return fail('ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID', 500);
  const state = crypto.randomBytes(16).toString('hex');
  const u = new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'identify');
  u.searchParams.set('state', state);
  u.searchParams.set('redirect_uri', site(req) + '/api/auth/callback');
  const res = NextResponse.redirect(u);
  res.cookies.set('fx_st', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' });
  return res;
});
