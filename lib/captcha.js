import crypto from 'crypto';
import { q, one, HttpError } from './db';

/**
 * ระบบตรวจสอบความปลอดภัย (แคปช่า) ก่อนล็อกอิน/สมัคร/ล็อกอิน Discord
 *  - ถ้าตั้ง TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY → ใช้ Cloudflare Turnstile ตรวจจริง
 *  - ถ้าไม่ตั้ง → ใช้ Proof-of-Work ของระบบเอง (เบราว์เซอร์ต้องคำนวณ hash ก่อนจึงได้โทเคน)
 *  ทั้งสองแบบจบด้วย "โทเคนใช้ครั้งเดียว" อายุ 10 นาที ที่ฝั่งล็อกอิน/สมัครต้องแนบมา
 */
const DIFFICULTY = 4; // จำนวนเลข 0 นำหน้าของ sha256(hex)
const CHALLENGE_TTL = 5 * 60 * 1000;
const TOKEN_TTL = 10 * 60 * 1000;

const secret = () =>
  process.env.CAPTCHA_SECRET ||
  crypto.createHash('sha256').update(`cap|${process.env.DATABASE_URL || ''}|${process.env.ADMIN_PASSWORD || ''}`).digest('hex');
const hmac = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const turnstileEnabled = () => !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
export const captchaDisabled = () => process.env.CAPTCHA_DISABLED === '1'; // ใช้ตอนรันเทสอัตโนมัติเท่านั้น

export function issueChallenge() {
  const id = crypto.randomBytes(12).toString('hex');
  const ts = Date.now();
  return { id, ts, d: DIFFICULTY, sig: hmac(`ch.${id}.${ts}.${DIFFICULTY}`) };
}

function mintToken() {
  const id = crypto.randomBytes(12).toString('hex');
  const exp = Date.now() + TOKEN_TTL;
  return `${id}.${exp}.${hmac(`tk.${id}.${exp}`)}`;
}

async function turnstileOk(response, ip) {
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: String(response || ''), remoteip: ip || '' }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const d = await r.json();
    return !!d.success;
  } catch { return false; }
}

/** ตรวจคำตอบแคปช่า แล้วออกโทเคนให้ */
export async function solveCaptcha(b, ip) {
  if (turnstileEnabled()) {
    if (!(await turnstileOk(b.turnstile, ip))) throw new HttpError(400, 'ตรวจสอบความปลอดภัยไม่ผ่าน กรุณาลองใหม่');
    return mintToken();
  }
  const { id, ts, d, sig, nonce } = b;
  if (![id, sig, nonce].every((v) => typeof v === 'string' && v.length > 0 && v.length < 100) || !Number.isFinite(Number(ts)) || d !== DIFFICULTY)
    throw new HttpError(400, 'คำขอไม่ถูกต้อง');
  if (!safeEq(sig, hmac(`ch.${id}.${ts}.${d}`))) throw new HttpError(400, 'คำขอไม่ถูกต้อง');
  const age = Date.now() - Number(ts);
  if (age < 0 || age > CHALLENGE_TTL) throw new HttpError(400, 'หมดเวลา กรุณาลองใหม่');
  const h = crypto.createHash('sha256').update(`${id}:${nonce}`).digest('hex');
  if (!h.startsWith('0'.repeat(DIFFICULTY))) throw new HttpError(400, 'ตรวจสอบความปลอดภัยไม่ผ่าน');
  // โจทย์ 1 ข้อใช้ได้ครั้งเดียว
  await q('INSERT INTO attempts(key) VALUES($1)', [`chal:${id}`]);
  const n = await one('SELECT count(*)::int AS n FROM attempts WHERE key=$1', [`chal:${id}`]);
  if (n.n > 1) throw new HttpError(400, 'โจทย์นี้ถูกใช้แล้ว กรุณาลองใหม่');
  return mintToken();
}

/** ตรวจ + ใช้โทเคน (ใช้ได้ครั้งเดียว) — เรียกในฝั่งล็อกอิน/สมัคร/Discord */
export async function requireCaptcha(token) {
  if (captchaDisabled()) return;
  const fail = () => new HttpError(403, 'กรุณารอตรวจสอบความปลอดภัยให้เสร็จก่อน');
  if (typeof token !== 'string') throw fail();
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig || !safeEq(sig, hmac(`tk.${id}.${exp}`))) throw fail();
  if (Number(exp) < Date.now()) throw fail();
  await q('INSERT INTO attempts(key) VALUES($1)', [`tok:${id}`]);
  const n = await one('SELECT count(*)::int AS n FROM attempts WHERE key=$1', [`tok:${id}`]);
  if (n.n > 1) throw fail();
}
