import { kv, kvReady } from './db';
import { cleanTheme } from './theme';
import { V, url, clean, clamp } from './core';

// ตั้งค่าความปลอดภัย (แอดมินปรับได้ในหน้า Admin > ความปลอดภัย)
export const DEFAULT_SEC = {
  humanGate: true,     // แสดง captcha ตอนเข้าเว็บ — ใช้ Turnstile เมื่อมี TURNSTILE_* ไม่งั้นใช้ captcha ในตัว (ภาพตัวเลข)
  powBits: 14,         // Proof-of-Work ฝั่งเบราว์เซอร์ (0 = ปิด, 12-18 = แนะนำ) ทำให้สคริปต์ยิงรัวๆ ช้าลงมาก
  blockBots: true,     // บล็อก User-Agent ของสคริปต์/เครื่องมือ (curl, python, axios, headless ฯลฯ)
  strictFetch: false,  // ต้องมี header Sec-Fetch-* จากเบราว์เซอร์จริง (เข้มขึ้น อาจกระทบเบราว์เซอร์เก่ามาก)
  minAccountDays: 3,   // อายุบัญชี Discord ขั้นต่ำ (วัน) กันบัญชีปั๊ม (0 = ปิด)
  ipCap: 0,            // จำกัดจำนวนคีย์ต่อ IP ต่อหน้าต่อ 24 ชม. (0 = ปิด; ระวัง IP ร่วมของเครือข่ายมือถือ)
  strictIp: false,     // ผูกขั้นตอนกับ IP ตอนเริ่ม (เปลี่ยนเน็ตกลางทางจะทำต่อไม่ได้)
  verifyMember: true,  // ตรวจว่ายังอยู่ในเซิร์ฟเวอร์ Discord จริง (ต้องมีบอท) ก่อนไปขั้นต่อไป/รับคีย์
  strikeLimit: 8,      // ทำผิดกติกาซ้ำเกินกี่ครั้งใน 1 ชม. ให้บล็อกชั่วคราว
  scMinutes: 720,      // ผ่านหน้า "กำลังตรวจสอบความปลอดภัย" แล้ว กี่นาทีถึงจะขึ้นอีก (0 = ขึ้นทุกครั้งที่เข้าเว็บ)
  scEpoch: 0,          // เลขรอบ — แอดมินกด "รีเซ็ต" แล้วเลขนี้เปลี่ยน ทุกคนต้องตรวจใหม่ (แก้ผ่านปุ่มรีเซ็ตเท่านั้น)
};

const D = () => ({
  name: V('NEXT_PUBLIC_SITE_NAME') || 'Flexozy',
  tagline: 'ระบบแจกคีย์สำหรับชุมชน',
  discord: url(V('NEXT_PUBLIC_DISCORD_URL')),
  demo: clean(V('NEXT_PUBLIC_DEMO_SLUG') || 'demo', /[^a-z0-9-]/g, 30) || 'demo',
  guildId: clean(V('DISCORD_GUILD_ID'), /\D/g, 25),
  joinRole: '', requireGuild: true,
  announce: { on: false, text: '', link: '' },
  footer: '',
  theme: cleanTheme({ bg: { type: 'grid', overlay: 60, gray: true } }),
  sec: { ...DEFAULT_SEC },
});

const bool = (v, d) => (v === undefined ? d : !!v);
export function cleanSite(i, prev) {
  i = i && typeof i === 'object' ? i : {};
  const d = prev || D(), a = i.announce && typeof i.announce === 'object' ? i.announce : d.announce, s = i.sec && typeof i.sec === 'object' ? i.sec : {}, ds = d.sec || DEFAULT_SEC;
  return {
    name: clean(i.name ?? d.name, /[\u0000-\u001f<>]/g, 32) || d.name,
    tagline: clean(i.tagline ?? d.tagline, /[\u0000-\u001f<>]/g, 80),
    discord: i.discord === undefined ? d.discord : url(i.discord),
    demo: i.demo === undefined ? d.demo : (clean(i.demo, /[^a-z0-9-]/g, 30) || d.demo),
    guildId: i.guildId === undefined ? d.guildId : clean(i.guildId, /\D/g, 25),
    joinRole: i.joinRole === undefined ? d.joinRole : clean(i.joinRole, /\D/g, 25),
    requireGuild: bool(i.requireGuild, d.requireGuild),
    announce: { on: !!a.on, text: clean(a.text, /[\u0000-\u001f<>]/g, 160), link: url(a.link) },
    footer: clean(i.footer ?? d.footer, /[\u0000-\u001f<>]/g, 100),
    theme: cleanTheme(i.theme ?? d.theme),
    sec: {
      humanGate: bool(s.humanGate, ds.humanGate), powBits: s.powBits === undefined ? ds.powBits : (+s.powBits === 0 ? 0 : clamp(s.powBits, 8, 20)),
      blockBots: bool(s.blockBots, ds.blockBots), strictFetch: bool(s.strictFetch, ds.strictFetch),
      minAccountDays: s.minAccountDays === undefined ? ds.minAccountDays : clamp(s.minAccountDays, 0, 365),
      ipCap: s.ipCap === undefined ? ds.ipCap : clamp(s.ipCap, 0, 1000), strictIp: bool(s.strictIp, ds.strictIp),
      verifyMember: bool(s.verifyMember, ds.verifyMember), strikeLimit: s.strikeLimit === undefined ? ds.strikeLimit : clamp(s.strikeLimit, 2, 100),
      scMinutes: s.scMinutes === undefined ? ds.scMinutes : clamp(s.scMinutes, 0, 43200),
      scEpoch: Math.max(0, Math.floor(+ds.scEpoch) || 0), // ไม่รับจากฟอร์ม กันค่าเก่าเขียนทับตอนรีเซ็ต
    },
  };
}

let cache = null, at = 0;
export const invalidateSettings = () => { cache = null; at = 0; };
export async function getSettings() {
  if (cache && Date.now() - at < 8000) return cache;
  let raw = null;
  try { raw = await kv.get('site'); } catch {}
  cache = cleanSite(raw, D()); at = Date.now();
  return cache;
}
export async function getImgv(slug) { try { return (await kv.get('imgv:' + slug)) || {}; } catch { return {}; } }

export const botReady = () => !!V('DISCORD_BOT_TOKEN');
export const turnstileReady = () => !!(V('TURNSTILE_SECRET') && V('TURNSTILE_SITEKEY'));
export const guildOf = s => s.guildId || '';

// ส่วนที่ปลอดภัยสำหรับส่งให้เบราว์เซอร์ทุกคน
export function publicSite(s, imgv) {
  return {
    name: s.name, tagline: s.tagline, discord: s.discord, demo: s.demo, announce: s.announce, footer: s.footer,
    theme: s.theme, imgv: imgv || {}, sc: { m: s.sec.scMinutes, v: s.sec.scEpoch }, join: botReady() && !!s.guildId, kv: kvReady,
  };
}
