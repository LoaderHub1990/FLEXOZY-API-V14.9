import { NextResponse as R } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '../db';
import { V, COOKIE, WEEK, sign, hex, crypto, isAdmin, safeNext, packProfile } from '../core';
import { dj, tokenWhy, joinGuild, isMember, BOT } from '../discord';

const CID = () => V('DISCORD_CLIENT_ID'), CSEC = () => V('DISCORD_CLIENT_SECRET');

// เริ่มล็อกอิน: /api/auth/discord  (เส้นทางเดิมของ Flexozy — Redirect URI เดิมใน Discord Portal ใช้ต่อได้)
export async function start({ base, q, co, site, J }) {
  if (!CID() || !CSEC()) return R.redirect(base + '/?err=cfg&why=' + encodeURIComponent('ขาด ' + [!CID() && 'DISCORD_CLIENT_ID', !CSEC() && 'DISCORD_CLIENT_SECRET'].filter(Boolean).join(', ')));
  const gid = site.guildId, scope = gid && BOT() ? 'identify guilds.join' : gid ? 'identify guilds' : 'identify';
  const state = hex(16);
  const r = R.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: CID(), redirect_uri: base + '/api/auth/callback', response_type: 'code', scope, state }));
  r.cookies.set('fx_st', state, { ...co, maxAge: 600 });
  r.cookies.set('fx_next', safeNext(q.get('next')), { ...co, maxAge: 600 });
  return r;
}

export async function callback({ base, q, co, ip, site }) {
  const ck = await cookies(), next = safeNext(ck.get('fx_next')?.value);
  const back = (why, err) => {
    const u = new URL(base + next); u.searchParams.set('err', err); if (why) u.searchParams.set('why', String(why).slice(0, 140));
    const r = R.redirect(u); r.cookies.delete('fx_st'); r.cookies.delete('fx_next'); return r;
  };
  if (q.get('error')) return back('', 'denied');
  if (!q.get('code') || !q.get('state') || q.get('state') !== ck.get('fx_st')?.value) return back('', 'state');
  try {
    const uri = base + '/api/auth/callback';
    const { j: t } = await dj('/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: CID(), client_secret: CSEC(), grant_type: 'authorization_code', code: q.get('code'), redirect_uri: uri }) });
    if (!t.access_token) { console.error('discord token error', t, 'redirect_uri=', uri); return back(tokenWhy(t, uri), 'token'); }
    const H = { Authorization: 'Bearer ' + t.access_token, 'User-Agent': 'Flexozy (' + base + ', 3.0)' };
    const { j: d } = await dj('/users/@me', { headers: H });
    if (!d.id) return back(d.message || 'no_user', 'token');
    const adm = await isAdmin(d.id);
    if (!adm && await kv.sismember('bans', 'id:' + d.id).catch(() => false)) return back('', 'ban');

    // ---- เพิ่มผู้ใช้เข้าเซิร์ฟเวอร์ Discord อัตโนมัติ (ต้องมี DISCORD_BOT_TOKEN + Guild ID) ----
    const gid = site.guildId;
    let join = { state: 'skip' }, inGuild = true;
    if (gid) {
      if (BOT()) {
        join = await joinGuild({ gid, uid: d.id, accessToken: t.access_token, roleId: site.joinRole });
        if (join.state === 'fail') { if (await isMember(gid, d.id) === true) join = { state: 'already' }; else inGuild = false; }
      } else {
        const gs = await dj('/users/@me/guilds', { headers: H });
        inGuild = Array.isArray(gs.j) && gs.j.some(g => g.id === gid);
      }
      if (!inGuild && site.requireGuild && !adm) return back(join.why || '', 'guild');
    }

    // ---- บันทึกผู้ใช้ ----
    const prof = packProfile(d), now = Date.now();
    try {
      const old = (await kv.get('user:' + d.id)) || {};
      await kv.set('user:' + d.id, { id: d.id, name: prof.n, username: d.username, avatar: d.avatar || null, first: old.first || now, last: now, n: (old.n || 0) + 1, join: join.state, ip });
      await kv.sadd('users', 'id:' + d.id);
      await kv.lpush('ulog', { t: now, id: d.id, name: prof.n, avatar: d.avatar || null, ip, join: join.state });
      await kv.ltrim('ulog', 0, 99);
    } catch (e) { console.error('db', e); }

    const dest = new URL(base + next);
    dest.searchParams.set('ok', 'login');
    if (join.state !== 'skip') dest.searchParams.set('join', join.state);
    const r = R.redirect(dest);
    r.cookies.delete('fx_st'); r.cookies.delete('fx_next');
    r.cookies.set(COOKIE, sign({ ...prof, e: now + WEEK }), { ...co, maxAge: WEEK / 1000 });
    return r;
  } catch (e) { console.error('callback error', e); return back(e?.message || 'exception', 'token'); }
}

export async function logout({ J }) {
  const r = J({ ok: 1 });
  r.cookies.delete(COOKIE);
  return r;
}
