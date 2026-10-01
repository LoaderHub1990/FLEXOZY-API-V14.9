import { kv } from '../db';
import { isAdmin, live, snowflakeTime, bkkDay } from '../core';
import { mint } from '../keys';
import { botReady } from '../settings';
import { isMember } from '../discord';
import { botUA, sameSite, limit, ipKey, powCheck, strike, secLog, blocked, tsVerify } from '../security';

// ขั้นตอนรับคีย์ = state machine ที่อยู่ฝั่งเซิร์ฟเวอร์ทั้งหมด (step 0→1→2→3→claim)
// ชั้นป้องกัน: แบน/บล็อกชั่วคราว · UA สคริปต์ · Origin/Sec-Fetch · rate limit · อายุบัญชี Discord · ผูกอุปกรณ์(UA)/IP ·
// เวลารอฝั่งเซิร์ฟเวอร์ · Proof-of-Work · Turnstile · ตรวจว่าอยู่ในเซิร์ฟเวอร์ Discord จริง · จำกัดคีย์ต่อ IP · ระบบ strike
export async function gate(ctx) {
  const { M, b, body, ses: s, ip, ua, fp, site, req, J } = ctx, sec = site.sec;
  if (M !== 'POST') return J({ error: 'act' }, 400);
  if (!s) return J({ error: 'auth' }, 401);
  const p = await kv.get('page:' + b);
  if (!p) return J({ error: 'nf' }, 404);
  if (p.off) return J({ error: 'closed' }, 403);
  const info = { page: b, name: s.n, ip, ua: ua.slice(0, 110) }, sk = n => strike(s.id, sec.strikeLimit, n, info);

  if (await kv.sismember('bans', 'id:' + s.id) || (ip && await kv.sismember('bans', ip))) return J({ error: 'banned' }, 403);
  if (await blocked(s.id)) return J({ error: 'blocked' }, 429);
  if (sec.blockBots && botUA(ua)) { await strike(s.id, sec.strikeLimit, 'bot_ua', info, 2); return J({ error: 'bot' }, 403); }
  if (!sameSite(req, sec.strictFetch)) { await sk('origin'); return J({ error: 'origin' }, 403); }
  if (!(await limit('g:u:' + s.id, 24, 60)).ok || !(await limit('g:i:' + ipKey(ip), 80, 60)).ok) return J({ error: 'rate' }, 429);

  const adm = await isAdmin(s.id);
  if (sec.minAccountDays > 0 && !adm) {
    const days = (Date.now() - snowflakeTime(s.id)) / 864e5;
    if (days < sec.minAccountDays) { await secLog({ uid: s.id, type: 'account_age', note: `บัญชีอายุ ${days.toFixed(1)} วัน`, ...info }); return J({ error: 'age', days: sec.minAccountDays }, 403); }
  }

  const stKey = `st:${b}:${s.id}`, st = (await kv.get(stKey)) || { step: 0 };
  const left = Math.max(0, Math.ceil(((st.t || 0) + p.wait * 1000 - Date.now()) / 1000));
  const setSt = (step, extra = {}) => kv.set(stKey, { step, t: Date.now(), fp: st.fp, ip: st.ip, ...extra }, { ex: 3600 });
  const pow = async () => { if (await powCheck(body.pow, s.id, `${b}:${st.step}`, sec.powBits)) return true; await sk('pow'); return false; };
  const member = async () => {
    if (!(sec.verifyMember && site.guildId && botReady()) || adm) return true;
    const m = await isMember(site.guildId, s.id);
    if (m === false) { await secLog({ uid: s.id, type: 'not_member', ...info }); return false; }
    return true; // ตรวจไม่ได้ (null) = ปล่อยผ่าน ไม่ล็อกคนออกเพราะ Discord ล่ม
  };

  // ผูกอุปกรณ์: ขั้นตอนที่เริ่มด้วยเบราว์เซอร์หนึ่ง ต้องจบด้วยเบราว์เซอร์เดียวกัน
  if (st.step > 0) {
    if (st.fp && st.fp !== fp) { await sk('device'); return J({ error: 'device' }, 403); }
    if (sec.strictIp && st.ip && st.ip !== ipKey(ip)) { await sk('ip_change'); return J({ error: 'ipchg' }, 403); }
  }

  if (body.act === 'go') {
    if (st.step === 0) {
      if (!await pow()) return J({ error: 'pow' }, 400);
      await setSt(1, { fp, ip: ipKey(ip) });
      await kv.pfadd(`st:${b}:sn`, s.id).catch(() => {});
      return J({ ok: 1, url: p.yt || null });
    }
    if ((st.step === 1 || st.step === 2) && left > 0) {
      if (left > 3) await sk('too_fast'); // กดก่อนเวลามากๆ = ไม่ได้มาจากปุ่มในหน้าเว็บ
      return J({ error: 'wait', left }, 400);
    }
    if (st.step === 1) {
      if (!await pow()) return J({ error: 'pow' }, 400);
      await setSt(2);
      return J({ ok: 1, url: p.dc || null });
    }
    if (st.step === 2) {
      if (!await pow()) return J({ error: 'pow' }, 400);
      if (!await member()) return J({ error: 'notmember', invite: site.discord }, 403);
      if (!await tsVerify(body.token, ip)) return J({ error: 'captcha' }, 400);
      await setSt(3);
      return J({ ok: 1 });
    }
    return J({ error: 'steps' }, 400);
  }

  if (body.act === 'claim') {
    const oldKey = await kv.get('cl:' + b + ':' + s.id), old = oldKey && await kv.get('key:' + oldKey);
    if (live(old)) return J({ key: { key: old.key, exp: old.exp } }); // มีคีย์ที่ยังใช้ได้อยู่แล้ว → ส่งอันเดิม
    if (st.step !== 3) { await sk('skip_steps'); return J({ error: 'steps' }, 400); }
    if (Date.now() - (st.t || 0) < 1500) { await sk('too_fast'); return J({ error: 'wait', left: 1 }, 400); }
    if (!await pow()) return J({ error: 'pow' }, 400);
    if (!await member()) return J({ error: 'notmember', invite: site.discord }, 403);
    if (sec.ipCap > 0 && !adm) {
      const n = await kv.incrx(`ipc:${b}:${bkkDay()}:${ipKey(ip)}`, 86400);
      if (n > sec.ipCap) { await secLog({ uid: s.id, type: 'ip_cap', note: `IP นี้รับคีย์ครบ ${sec.ipCap} ครั้ง/วัน`, ...info }); return J({ error: 'ipcap' }, 429); }
    }
    if (!await kv.set(`lock:${b}:${s.id}`, 1, { nx: true, ex: 5 })) return J({ error: 'wait', left: 1 }, 429);
    const k = await mint(b, s.id, p.hours, p.prefix);
    await kv.set('cl:' + b + ':' + s.id, k.key, { ex: Math.ceil(p.hours * 3600) + 604800 });
    await kv.del(stKey);
    await Promise.all([kv.incr(`st:${b}:claims`), kv.pfadd(`st:${b}:cl`, s.id), kv.hincrby('sd:' + b, bkkDay() + ':c', 1)]).catch(e => console.error('stat', e));
    await kv.lpush('log', { t: Date.now(), page: b, uid: s.id, name: s.n, ip, key: k.key });
    await kv.ltrim('log', 0, 199);
    return J({ key: k });
  }
  return J({ error: 'act' }, 400);
}
