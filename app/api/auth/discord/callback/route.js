import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { one, q, HttpError } from '@/lib/db';
import { createSession, getUser, hashPassword, clientIp, rateLimit, recordAttempt } from '@/lib/auth';
import { discordConfigured, redirectUri, siteOrigin } from '@/lib/discord';

export const dynamic = 'force-dynamic';

function cleanName(s) {
  let n = String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9_.]/g, '').slice(0, 14);
  if (n.length < 3) n = ('user' + n).slice(0, 14);
  return n;
}

async function uniqueUsername(base) {
  for (let i = 0; i < 8; i++) {
    const cand = i === 0 ? base : `${base}${crypto.randomInt(1000, 9999)}`.slice(0, 20);
    if (!(await one('SELECT 1 FROM users WHERE lower(username)=lower($1)', [cand]))) return cand;
  }
  return `user${crypto.randomBytes(6).toString('hex')}`;
}

async function handle(req, ctx) {
  if (!discordConfigured()) throw new HttpError(500, 'ร้านยังไม่ได้ตั้งค่าล็อกอินด้วย Discord');
  const url = new URL(req.url);
  if (url.searchParams.get('error')) throw new HttpError(400, 'คุณยกเลิกการเข้าสู่ระบบด้วย Discord');
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  const jar = await cookies();
  let saved = null;
  try { saved = JSON.parse(jar.get('dh_oauth')?.value || 'null'); } catch {}
  jar.set('dh_oauth', '', { path: '/', maxAge: 0 });
  ctx.from = saved?.from === 'shop' ? 'shop' : ''; // ล็อกอินมาจาก flexozy.site/shop/login
  if (!saved || !code || !state || state.length !== saved.state.length ||
      !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) {
    throw new HttpError(400, 'เซสชันล็อกอินหมดอายุ กรุณาลองใหม่อีกครั้ง');
  }

  const ip = await clientIp();
  await rateLimit(`dc:${ip}`, 20, 15);
  await recordAttempt(`dc:${ip}`);

  // แลก code เป็น access token
  const tr = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: await redirectUri(),
    }),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!tr.ok) throw new HttpError(400, 'ยืนยันตัวตนกับ Discord ไม่สำเร็จ กรุณาลองใหม่');
  const tok = await tr.json();
  const mr = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!mr.ok) throw new HttpError(400, 'ดึงข้อมูลโปรไฟล์ Discord ไม่สำเร็จ');
  const d = await mr.json();
  if (!d?.id || !/^\d{5,25}$/.test(String(d.id))) throw new HttpError(400, 'ข้อมูล Discord ไม่ถูกต้อง');

  const okAsset = (v) => (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(v) ? v : null);
  const accent = Number.isInteger(d.accent_color) ? '#' + d.accent_color.toString(16).padStart(6, '0') : null;
  // [username, name, avatar, กรอบโปรไฟล์, แบนเนอร์, สีโปรไฟล์]
  const profile = [
    String(d.username || '').slice(0, 64), String(d.global_name || '').slice(0, 64), okAsset(d.avatar),
    okAsset(d.avatar_decoration_data?.asset), okAsset(d.banner), accent,
  ];
  const me = await getUser();
  const existing = await one('SELECT id,banned FROM users WHERE discord_id=$1', [d.id]);

  // โหมดผูกบัญชี: ผู้ใช้ล็อกอินอยู่แล้ว
  if (saved.link && me) {
    if (existing && existing.id !== me.id) throw new HttpError(409, 'Discord นี้ถูกผูกกับบัญชีอื่นแล้ว');
    await q('UPDATE users SET discord_id=$1,discord_username=$2,discord_name=$3,discord_avatar=$4,discord_decoration=$5,discord_banner=$6,discord_accent=$7 WHERE id=$8', [d.id, ...profile, me.id]);
    return '/account?tab=security&linked=1';
  }

  let uid;
  if (existing) {
    if (existing.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    uid = existing.id;
    await q('UPDATE users SET discord_username=$1,discord_name=$2,discord_avatar=$3,discord_decoration=$4,discord_banner=$5,discord_accent=$6 WHERE id=$7', [...profile, uid]);
  } else {
    // สมัครสมาชิกใหม่อัตโนมัติ (รหัสผ่านสุ่ม — เข้าสู่ระบบผ่าน Discord เท่านั้น)
    const username = await uniqueUsername(cleanName(d.username));
    const pw = await hashPassword(crypto.randomBytes(24).toString('hex'));
    try {
      uid = (await one(
        `INSERT INTO users(username,email,password_hash,discord_id,discord_username,discord_name,discord_avatar,discord_decoration,discord_banner,discord_accent)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [username, `discord_${d.id}@discord.local`, pw, d.id, ...profile]
      )).id;
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่');
      throw e;
    }
  }
  await createSession(uid);
  return ctx.from === 'shop' ? '/shop/dashboard' : '/';
}

export async function GET(req) {
  const origin = await siteOrigin();
  const ctx = { from: '' };
  try {
    const to = await handle(req, ctx);
    return NextResponse.redirect(`${origin}${to}`);
  } catch (e) {
    const msg = e instanceof HttpError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    if (!(e instanceof HttpError)) console.error(e);
    return NextResponse.redirect(`${origin}${ctx.from === 'shop' ? '/shop/login' : '/'}?auth_error=${encodeURIComponent(msg)}`);
  }
}
