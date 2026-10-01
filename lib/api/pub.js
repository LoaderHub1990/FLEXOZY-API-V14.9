import { cookies } from 'next/headers';
import { kv, kvReady, kvMode, ping } from '../db';
import { E, V, COOKIE, WEEK, sign, unsign, hex, crypto, isAdmin, isOwner, publicUser, live, toUnix, bkkDay, cfgBase } from '../core';
import { cleanTheme, resolveMedia, iconUrl } from '../theme';
import { publicSite, getImgv, botReady, turnstileReady } from '../settings';
import { readFile } from '../files';
import { captchaIssue, captchaCheck } from '../captcha';
import { tsReady, tsVerify, botUA, powIssue, limit, ipKey } from '../security';

// ---------------------------------------------------------------- ตรวจระบบ (ไม่เปิดเผยค่าลับ)
export async function health({ base, site, J }) {
  const p = await ping(), missing = [!V('DISCORD_CLIENT_ID') && 'DISCORD_CLIENT_ID', !V('DISCORD_CLIENT_SECRET') && 'DISCORD_CLIENT_SECRET'].filter(Boolean), cb = cfgBase();
  const admins = (E.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean).length;
  return J({
    loginReady: !missing.length, missing,
    db: { mode: kvMode, envFound: kvReady, working: p.ok, error: p.error },
    autoJoin: { botToken: botReady(), guildId: !!site.guildId, ready: botReady() && !!site.guildId },
    turnstile: turnstileReady(),
    env: { SITE_URL: !!(E.SITE_URL || E.BASE_URL), SESSION_SECRET: !!V('SESSION_SECRET'), DISCORD_CLIENT_ID: !!V('DISCORD_CLIENT_ID'), DISCORD_CLIENT_SECRET: !!V('DISCORD_CLIENT_SECRET'), ADMIN_IDS_count: admins },
    baseUrlUsed: base,
    redirectUri: base + '/api/auth/callback', // ต้องเพิ่มค่านี้ใน Discord Developer Portal → OAuth2 → Redirects ให้ตรงเป๊ะ
    notes: [
      !kvReady && E.VERCEL && 'ยังไม่ได้ต่อ KV/Upstash บน Vercel — ข้อมูลจะหายเมื่อฟังก์ชันรีสตาร์ท (ต่อ Upstash Redis จาก Marketplace)',
      !kvReady && !E.VERCEL && 'กำลังเก็บข้อมูลในไฟล์ .data (เหมาะกับ VPS/เครื่องตัวเอง)',
      (E.SITE_URL || E.BASE_URL) && !cb && 'SITE_URL ยังเป็นค่าตัวอย่าง/รูปแบบไม่ถูกต้อง (ระบบจึงใช้โดเมนที่เข้าจริงแทน)',
      cb && cb !== base && 'SITE_URL ไม่ตรงกับโดเมนที่เข้าอยู่ (ระบบใช้โดเมนที่เข้าจริงเพื่อให้ cookie ล็อกอินทำงาน)',
      !V('SESSION_SECRET') && 'ยังไม่ได้ตั้ง SESSION_SECRET (ใช้ค่าที่สร้างจากความลับอื่นแทน แนะนำให้ตั้งเอง)',
      !admins && 'ยังไม่ได้ตั้ง ADMIN_IDS จึงไม่มีใครเป็นแอดมิน',
      site.guildId && !botReady() && 'ตั้ง Guild ID แล้วแต่ยังไม่มี DISCORD_BOT_TOKEN — จะเช็กสมาชิกได้อย่างเดียว เพิ่มคนเข้าเซิร์ฟเวอร์อัตโนมัติไม่ได้',
      !turnstileReady() && 'ยังไม่ได้ตั้ง TURNSTILE_SITEKEY/SECRET — ข้าม captcha (ตัวกันบอทอื่นยังทำงาน)',
    ].filter(Boolean),
  });
}

export async function siteInfo({ site, J }) { return J(publicSite(site, await getImgv('_site'))); }

// ---------------------------------------------------------------- ผู้ใช้ปัจจุบัน
export async function me({ ses, J }) {
  if (!ses) return J({ user: null });
  const adm = await isAdmin(ses.id);
  if (!adm && await kv.sismember('bans', 'id:' + ses.id).catch(() => false)) { const r = J({ user: null, banned: true }); r.cookies.delete(COOKIE); return r; }
  const out = { user: publicUser(ses), admin: adm, owner: isOwner(ses.id), creator: null, page: null, max: 72, imgv: {} };
  try {
    const c = await kv.get('cr:' + ses.id);
    out.creator = c || null;
    if (c) { out.page = (await kv.get('page:' + c.slug)) || null; out.imgv = (await kv.get('imgv:' + c.slug)) || {}; }
    out.max = (await kv.get('max')) || 72;
  } catch { out.dbError = true; }
  return J(out);
}

// ---------------------------------------------------------------- สถิติ + คนออนไลน์ (เฉพาะคนล็อกอิน ภายใน 5 นาที)
const WIN = 5 * 60 * 1000;
async function touch(id) {
  const now = Date.now(), p = (await kv.get('presence')) || {};
  p[id] = now;
  const ks = Object.keys(p);
  for (const k of ks) if (now - p[k] > WIN) delete p[k];
  await kv.set('presence', p);
  return p;
}
export async function stats({ ses, J }) {
  try {
    let pr = (await kv.get('presence')) || {};
    if (ses) pr = await touch(ses.id);
    const now = Date.now(), [keys, pages, creators, max, users] = await Promise.all([kv.scard('keys'), kv.scard('pages'), kv.scard('crs'), kv.get('max'), kv.scard('users')]);
    return J({ keys, pages, creators, users, max: max || 72, active: Object.values(pr).filter(t => now - t <= WIN).length });
  } catch { return J({ dbError: true }); }
}

// ---------------------------------------------------------------- ตรวจบอตครั้งแรกที่เข้าเว็บ (Cloudflare Turnstile)
export async function human({ M, body, q, ip, co, site, J }) {
  const need = !!site.sec.humanGate, ts = tsReady(), mode = ts ? 'ts' : 'img'; // ts = Cloudflare Turnstile, img = captcha ในตัว
  if (M === 'GET') {
    if (q.get('c')) { // ขอภาพ captcha ใหม่
      if (!need || ts) return J({ error: 'mode' }, 400);
      if (!(await limit('hc:' + ipKey(ip), 60, 300)).ok) return J({ error: 'rate' }, 429);
      return J(captchaIssue());
    }
    const hv = unsign((await cookies()).get('fx_hv')?.value || '');
    return J({ ok: !need || (!!hv && (hv.v || 0) === site.sec.scEpoch), mode, sitekey: need && ts ? E.TURNSTILE_SITEKEY : '' });
  }
  if (!need) return J({ ok: 1 });
  if (!(await limit('hv:' + ipKey(ip), 30, 300)).ok) return J({ ok: 0, error: 'rate' }, 429);
  if (!(ts ? await tsVerify(body.token, ip) : await captchaCheck(body.cid, body.ans))) return J({ ok: 0, error: 'captcha' }, 400);
  const life = site.sec.scMinutes > 0 ? site.sec.scMinutes * 60e3 : 15e3; // อายุคุกกี้ผ่านตรวจ = เวลาที่แอดมินตั้ง (0 = ขึ้นทุกครั้งที่เข้าเว็บ)
  const r = J({ ok: 1 });
  r.cookies.set('fx_hv', sign({ h: 1, v: site.sec.scEpoch, e: Date.now() + life }), { ...co, maxAge: Math.max(15, Math.floor(life / 1000)) });
  return r;
}

// ---------------------------------------------------------------- ไฟล์รูป/GIF/เพลง (รองรับ Range เพื่อให้ Safari เล่นเสียงได้)
export async function img({ b, c, req, CORS, J }) {
  const f = await readFile(String(b || ''), String(c || ''));
  if (!f) return J({ error: 'nf' }, 404, CORS);
  const total = f.buf.length;
  const H = { 'Content-Type': f.t, 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Cross-Origin-Resource-Policy': 'cross-origin', ...CORS };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    let s = m[1] === '' ? Math.max(0, total - Number(m[2])) : Number(m[1]);
    let e = m[1] === '' || m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
    if (s >= total || s > e) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    return new Response(f.buf.subarray(s, e + 1), { status: 206, headers: { ...H, 'Content-Range': `bytes ${s}-${e}/${total}`, 'Content-Length': String(e - s + 1) } });
  }
  return new Response(f.buf, { headers: { ...H, 'Content-Length': String(total) } });
}

// ---------------------------------------------------------------- ข้อมูลหน้าแจกคีย์ (สาธารณะ)
export async function page({ b, q, ses, site, co, ua, J }) {
  const p = await kv.get('page:' + b);
  if (!p) return J({ error: 'nf' }, 404);
  const iv = (await kv.get('imgv:' + b)) || {}, theme = cleanTheme(p.theme), media = resolveMedia(b, theme, iv), sec = site.sec;
  // นับผู้เข้าชม: client ส่ง ?hit=1 ครั้งเดียวต่อแท็บ · ไม่นับเจ้าของหน้า/บอท · ผู้เข้าชมไม่ซ้ำนับจาก cookie vid (HyperLogLog)
  let vid = (await cookies()).get('vid')?.value || '', newVid = false;
  if (q.get('hit') === '1' && !(ses && ses.id === p.owner) && !botUA(ua)) {
    if (!/^[a-f0-9]{24}$/.test(vid)) { vid = hex(12); newVid = true; }
    await Promise.all([kv.incr(`st:${b}:views`), kv.pfadd(`st:${b}:uv`, vid), kv.hincrby('sd:' + b, bkkDay() + ':v', 1)]).catch(e => console.error('hit', e));
  }
  let st = null, k = null;
  if (ses) {
    st = await kv.get(`st:${b}:${ses.id}`);
    const old = await kv.get(`cl:${b}:${ses.id}`);
    if (old) { const kk = await kv.get('key:' + old); if (live(kk)) k = kk; }
  }
  const step = st?.step || 0, left = (step === 1 || step === 2) ? Math.max(0, Math.ceil((st.t + p.wait * 1000 - Date.now()) / 1000)) : 0;
  const out = {
    slug: b, title: p.title, desc: p.desc || '', off: !!p.off, theme, media,
    links: (p.links || []).map(l => ({ label: l.label, url: l.url, icon: l.icon, img: l.icon === 'img' ? iconUrl(b, l.slot, iv) : '' })),
    wait: p.wait, hours: p.hours, step, left, key: k ? { key: k.key, exp: k.exp } : null,
    sitekey: E.TURNSTILE_SITEKEY || '', user: ses?.n || null,
    site: { name: site.name, discord: site.discord }, member: !!(sec.verifyMember && site.guildId && botReady()),
    pow: ses && !k && !p.off ? powIssue(ses.id, `${b}:${step}`, sec.powBits) : null,
  };
  const r = J(out);
  if (newVid) r.cookies.set('vid', vid, { ...co, maxAge: 31536000 });
  return r;
}

// ---------------------------------------------------------------- ตรวจคีย์ (Roblox / สคริปต์เรียกใช้)
export async function verify({ q, ip, CORS, J }) {
  if (!(await limit('vf:' + ipKey(ip), 90, 60)).ok) return J({ valid: false, reason: 'rate_limited' }, 429, CORS);
  // อ่านวันหมดอายุจริงจากข้อมูลคีย์ใน KV (field "exp" = มิลลิวินาที) ห้ามสร้างใหม่ตอนตรวจ
  const key = String(q.get('key') || '').trim();
  if (!key || key.length > 80) return J({ valid: false, reason: 'missing' }, 400, CORS);
  const k = await kv.get('key:' + key);
  if (!k) return J({ valid: false, reason: 'not_found' }, 404, CORS);
  const expiresAt = toUnix(k.exp);
  if (k.off) return J({ valid: false, reason: 'revoked' }, 403, CORS);
  if (!expiresAt || expiresAt * 1000 <= Date.now()) return J({ valid: false, reason: 'expired' }, 410, CORS);
  const now = Math.floor(Date.now() / 1000);
  return J({ valid: true, expiresAt, remaining: expiresAt - now, serverTime: now, expires: k.exp, page: k.page }, 200, CORS);
}
