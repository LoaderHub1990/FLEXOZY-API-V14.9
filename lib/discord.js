import { V } from './core';

const D = 'https://discord.com/api/v10';
export const BOT = () => V('DISCORD_BOT_TOKEN');

// เรียก Discord พร้อม timeout และรับมือ response ที่ไม่ใช่ JSON
export async function dj(path, init = {}) {
  const r = await fetch(D + path, { ...init, signal: AbortSignal.timeout(8000) });
  const txt = await r.text().catch(() => '');
  let j = {}; try { j = txt ? JSON.parse(txt) : {}; } catch {}
  return { ok: r.ok, status: r.status, j };
}
const botH = () => ({ Authorization: 'Bot ' + BOT(), 'Content-Type': 'application/json' });

export const tokenWhy = (t, uri) => t.error === 'invalid_client' ? 'DISCORD_CLIENT_ID หรือ DISCORD_CLIENT_SECRET ไม่ถูกต้อง'
  : t.error === 'invalid_grant' ? 'Redirect URI ไม่ตรงกับที่ตั้งใน Discord Portal: ' + uri
  : t.error_description || t.message || t.error || 'no_token';

// สมาชิกอยู่ในเซิร์ฟเวอร์ไหม (ใช้บอท) → true / false / null (ตรวจไม่ได้)
export async function isMember(gid, uid) {
  if (!BOT() || !gid) return null;
  try {
    const r = await dj(`/guilds/${gid}/members/${uid}`, { headers: botH() });
    if (r.ok) return true;
    if (r.status === 404) return false;
    return null;
  } catch { return null; }
}

// เพิ่มผู้ใช้เข้าเซิร์ฟเวอร์ด้วย access token (scope guilds.join) · คืน { state: 'joined'|'already'|'fail', why }
export async function joinGuild({ gid, uid, accessToken, roleId }) {
  if (!BOT() || !gid) return { state: 'skip' };
  try {
    const body = { access_token: accessToken };
    if (roleId) body.roles = [roleId];
    const r = await dj(`/guilds/${gid}/members/${uid}`, { method: 'PUT', headers: botH(), body: JSON.stringify(body) });
    if (r.status === 201) return { state: 'joined' };
    if (r.status === 204) {
      if (roleId) await dj(`/guilds/${gid}/members/${uid}/roles/${roleId}`, { method: 'PUT', headers: botH() }).catch(() => {}); // สมาชิกเดิม: ลองใส่ยศให้
      return { state: 'already' };
    }
    const code = r.j?.code, msg = r.j?.message || 'http ' + r.status;
    const why = code === 40007 ? 'ถูกแบนจากเซิร์ฟเวอร์นี้' : code === 30001 ? 'อยู่ครบ 100 เซิร์ฟเวอร์แล้ว' : code === 50013 || code === 50001 ? 'บอทไม่มีสิทธิ์ (ต้องมี Create Invite)' : r.status === 401 ? 'DISCORD_BOT_TOKEN ไม่ถูกต้อง' : r.status === 404 ? 'ไม่พบเซิร์ฟเวอร์ (ตรวจ Guild ID / เชิญบอทเข้าเซิร์ฟเวอร์)' : msg;
    return { state: 'fail', why, code };
  } catch (e) { return { state: 'fail', why: String(e?.message || e).slice(0, 100) }; }
}

// ข้อมูลเซิร์ฟเวอร์ (ใช้ทดสอบบอทในหน้า Admin)
export async function guildInfo(gid) {
  if (!BOT() || !gid) return null;
  try { const r = await dj(`/guilds/${gid}?with_counts=true`, { headers: botH() }); return r.ok ? { name: r.j.name, members: r.j.approximate_member_count, icon: r.j.icon ? `https://cdn.discordapp.com/icons/${gid}/${r.j.icon}.png?size=64` : null } : { error: r.j?.message || 'http ' + r.status }; }
  catch (e) { return { error: String(e?.message || e).slice(0, 100) }; }
}
