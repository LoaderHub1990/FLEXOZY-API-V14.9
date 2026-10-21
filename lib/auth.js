import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { q, one, HttpError } from './db';

const COOKIE = 'dh_session';
const DAYS = 7;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2, now() + ($3 || ' days')::interval)", [
    sha(token),
    userId,
    String(DAYS),
  ]);
  // เก็บ session เก่าที่หมดอายุทิ้งเป็นระยะ
  if (Math.random() < 0.05) await q('DELETE FROM sessions WHERE expires_at < now()');
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await q('DELETE FROM sessions WHERE token_hash=$1', [sha(t)]);
  jar.set(COOKIE, '', { path: '/', maxAge: 0 });
}

/**
 * บอท Discord เรียกเว็บนี้แทนผู้ใช้: Authorization: Bot <BOT_API_SECRET> + X-Discord-Id: <id ผู้ใช้>
 * คืน discord id ที่ถูกต้อง หรือ null ถ้าไม่ใช่คำขอจากบอท
 */
async function botDiscordId() {
  const secret = process.env.BOT_API_SECRET || '';
  if (secret.length < 16) return null;
  const h = await headers();
  const a = Buffer.from(h.get('authorization') || '');
  const b = Buffer.from(`Bot ${secret}`);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const id = h.get('x-discord-id') || '';
  return /^\d{15,25}$/.test(id) ? id : null;
}

/** เฉพาะบอท (ตรวจ BOT_API_SECRET) ไม่ต้องมีผู้ใช้ — ใช้กับข้อมูลสาธารณะ เช่น รายการสินค้า */
export async function requireBot() {
  const secret = process.env.BOT_API_SECRET || '';
  if (secret.length < 16) throw new HttpError(503, 'เว็บยังไม่ได้ตั้งค่า BOT_API_SECRET');
  const h = await headers();
  const a = Buffer.from(h.get('authorization') || '');
  const b = Buffer.from(`Bot ${secret}`);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(401, 'BOT_API_SECRET ไม่ตรงกับเว็บ');
  return true;
}

export async function getUser() {
  const did = await botDiscordId();
  if (did) {
    const u = await one(
      `SELECT id,username,email,balance,banned,discord_id,discord_username,discord_name,display_name FROM users WHERE discord_id=$1`,
      [did]
    );
    if (!u || u.banned) return null;
    return { ...u, role: 'user' }; // บอทไม่มีสิทธิ์แอดมินเด็ดขาด
  }
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (!t || t.length !== 64) return null;
  const u = await one(
    `SELECT u.id,u.username,u.email,u.role,u.balance,u.banned,
            u.discord_id,u.discord_username,u.discord_name,u.discord_avatar,
            u.discord_decoration,u.discord_banner,u.discord_accent,u.display_name,u.show_frame,
            (SELECT extract(epoch from updated_at)::bigint FROM user_media WHERE user_id=u.id AND kind='avatar') AS avatar_ver,
            (SELECT extract(epoch from updated_at)::bigint FROM user_media WHERE user_id=u.id AND kind='banner') AS banner_ver
       FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`,
    [sha(t)]
  );
  if (!u || u.banned) return null;
  return u;
}

export async function requireUser() {
  const u = await getUser();
  if (!u) {
    if (await botDiscordId()) throw new HttpError(404, 'ยังไม่ได้ผูก Discord กับบัญชีเว็บ กรุณาเข้าเว็บแล้วกด "เชื่อม Discord" ก่อน');
    throw new HttpError(401, 'กรุณาเข้าสู่ระบบก่อน');
  }
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'admin') throw new HttpError(403, 'ไม่มีสิทธิ์เข้าถึง');
  return u;
}

export const hashPassword = (p) => bcrypt.hash(p, 10);
export const checkPassword = (p, h) => bcrypt.compare(p, h);

export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

/** กันบรูทฟอร์ซ: นับจำนวนครั้งในช่วงเวลา */
export async function rateLimit(key, max, minutes) {
  const r = await one(`SELECT count(*)::int AS n FROM attempts WHERE key=$1 AND at > now() - ($2 || ' minutes')::interval`, [
    key,
    String(minutes),
  ]);
  if (r.n >= max) throw new HttpError(429, 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่');
}
export async function recordAttempt(key) {
  await q('INSERT INTO attempts(key) VALUES($1)', [key]);
  if (Math.random() < 0.05) await q("DELETE FROM attempts WHERE at < now() - interval '1 day'");
}
export async function clearAttempts(key) {
  await q('DELETE FROM attempts WHERE key=$1', [key]);
}

/** ป้องกัน CSRF: คำขอที่แก้ไขข้อมูลต้องมาจากโดเมนเดียวกัน */
export async function checkOrigin(req) {
  if (await botDiscordId()) return; // คำขอจากบอท (ยืนยันด้วย BOT_API_SECRET แล้ว) ไม่ใช่เบราว์เซอร์
  const origin = req.headers.get('origin');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (!origin) throw new HttpError(403, 'คำขอไม่ถูกต้อง');
  let oh;
  try { oh = new URL(origin).host; } catch { throw new HttpError(403, 'คำขอไม่ถูกต้อง'); }
  if (oh !== host) throw new HttpError(403, 'คำขอไม่ถูกต้อง (origin)');
}
