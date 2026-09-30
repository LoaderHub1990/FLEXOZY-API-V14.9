import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { signSession, COOKIE } from '@/lib/auth';
import { site, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  const base = site(req);
  const back = (e) => NextResponse.redirect(`${base}/dashboard?err=${e}`);
  const p = new URL(req.url).searchParams;
  const code = p.get('code'), state = p.get('state');
  if (p.get('error') || !code) return back('cancel');
  if (!state || state !== req.cookies.get('fx_st')?.value) return back('state');
  const tr = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || '', client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code', code, redirect_uri: base + '/api/auth/callback',
    }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tok.access_token) return back('token');
  const ur = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const d = await ur.json().catch(() => ({}));
  if (!d.id) return back('user');
  const prof = {
    id: d.id, username: d.username, global_name: d.global_name, avatar: d.avatar, banner: d.banner,
    accent_color: d.accent_color, avatar_decoration_data: d.avatar_decoration_data || null,
  };
  let old = {};
  try {
    old = (await db.get('user:' + d.id)) || {};
    const { apiKey: _legacy, ...keep } = old;
    await db.set('user:' + d.id, { ...keep, ...prof, createdAt: old.createdAt || Date.now() });
  } catch (e) { console.error('db', e); }
  const res = NextResponse.redirect(`${base}/dashboard`);
  res.cookies.set(COOKIE, signSession(prof, old.keyVer || 0), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 86400, path: '/' });
  res.cookies.delete('fx_st');
  return res;
});
