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

export async function getUser() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (!t || t.length !== 64) return null;
  const u = await one(
    `SELECT u.id,u.username,u.email,u.role,u.balance,u.banned
       FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`,
    [sha(t)]
  );
  if (!u || u.banned) return null;
  return u;
}

export async function requireUser() {
  const u = await getUser();
  if (!u) throw new HttpError(401, 'กรุณาเข้าสู่ระบบก่อน');
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
  const origin = req.headers.get('origin');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (!origin) throw new HttpError(403, 'คำขอไม่ถูกต้อง');
  let oh;
  try { oh = new URL(origin).host; } catch { throw new HttpError(403, 'คำขอไม่ถูกต้อง'); }
  if (oh !== host) throw new HttpError(403, 'คำขอไม่ถูกต้อง (origin)');
}
