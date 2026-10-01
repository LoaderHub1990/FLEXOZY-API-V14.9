import { kv } from './db';
import { E, sign, unsign, crypto, hex } from './core';

// =========================================================================
//  ชั้นป้องกันการ bypass (ทำงานฝั่งเซิร์ฟเวอร์ทั้งหมด — ฝั่งเบราว์เซอร์ปลอมได้เสมอ)
// =========================================================================

export function clientInfo(req) {
  const H = req.headers, first = v => String(v || '').split(',')[0].trim();
  const ip = first(H.get('cf-connecting-ip')) || first(H.get('x-forwarded-for')) || first(H.get('x-real-ip')) || '';
  const ua = H.get('user-agent') || '';
  return { ip, ua, fp: crypto.createHash('sha256').update(ua).digest('hex').slice(0, 16) };
}
// IPv6 → รวมทั้ง /64 (ผู้ใช้คนเดียวมีหลายที่อยู่ในช่วงเดียวกัน) · IPv4 ใช้ทั้งค่า
export const ipKey = ip => (ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip).replace(/[^a-fA-F0-9:.]/g, '').slice(0, 45) || 'x';

const BOT_UA = /(curl|wget|python|requests|aiohttp|httpx|axios|node-fetch|undici|okhttp|go-http|java\/|libwww|httpclient|headless|phantom|selenium|puppeteer|playwright|scrapy|postman|insomnia|bot\b|spider|crawler|bypass)/i;
export const botUA = ua => !ua || ua.length < 12 || BOT_UA.test(ua);

// คำขอ POST ต้องมาจากหน้าเว็บของเราเอง (Origin / Sec-Fetch-Site) — กัน CSRF และสคริปต์ข้ามเว็บ
export function sameSite(req, strict = false) {
  const H = req.headers, o = H.get('origin'), sf = H.get('sec-fetch-site');
  const host = String(H.get('x-forwarded-host') || H.get('host') || new URL(req.url).host).split(',')[0].trim();
  if (o) { try { if (new URL(o).host !== host) return false; } catch { return false; } }
  if (sf && sf !== 'same-origin' && sf !== 'none') return false;
  if (strict && !sf) return false;
  return true;
}

// ---------------------------------------------------------------- Rate limit (นับใน KV)
export async function limit(key, max, sec) {
  try { const n = await kv.incrx('rl:' + key, sec); return { ok: n <= max, n }; } catch { return { ok: true, n: 0 }; }
}

// ---------------------------------------------------------------- Proof-of-Work
// เซิร์ฟเวอร์ออกโจทย์ (เซ็นแล้ว ผูกกับผู้ใช้+ขั้นตอน หมดอายุ 10 นาที ใช้ได้ครั้งเดียว)
// เบราว์เซอร์ต้องหา nonce ที่ทำให้ sha256(token + ':' + nonce) มีบิต 0 นำหน้า >= bits
export const powIssue = (uid, scope, bits) => (bits > 0 ? { t: sign({ i: hex(8), u: String(uid), s: scope, b: bits, e: Date.now() + 600000 }), b: bits } : null);
export const zeroBits = buf => { let n = 0; for (const x of buf) { if (x === 0) { n += 8; continue; } n += Math.clz32(x) - 24; break; } return n; };
export async function powCheck(p, uid, scope, bits) {
  if (!(bits > 0)) return true;
  try {
    const o = unsign(p?.t);
    if (!o || o.u !== String(uid) || o.s !== scope || o.b < bits) return false;
    const nonce = String(p.n ?? '');
    if (!/^\d{1,12}$/.test(nonce)) return false;
    const h = crypto.createHash('sha256').update(p.t + ':' + nonce).digest();
    if (zeroBits(h) < o.b) return false;
    return await kv.set('pw:' + o.i, 1, { nx: true, ex: 700 }); // ใช้ซ้ำไม่ได้
  } catch { return false; }
}

// ---------------------------------------------------------------- Strike / บล็อกชั่วคราว / log
export async function blocked(uid) { try { return !!(await kv.get('tb:' + uid)); } catch { return false; } }
export async function secLog(o) { try { await kv.lpush('seclog', { t: Date.now(), ...o }); await kv.ltrim('seclog', 0, 299); } catch {} }
export async function strike(uid, limitN, why, info = {}, w = 1) {
  try {
    let n = 0; for (let i = 0; i < w; i++) n = await kv.incrx('sk:' + uid, 3600);
    await secLog({ uid, type: why, ...info });
    if (n >= limitN) { await kv.set('tb:' + uid, 1, { ex: 3600 }); await secLog({ uid, type: 'auto_block', note: `ทำผิดกติกา ${n} ครั้ง บล็อก 1 ชม.`, ...info }); }
    return n;
  } catch { return 0; }
}

// ---------------------------------------------------------------- Cloudflare Turnstile
export const tsReady = () => !!(E.TURNSTILE_SECRET && E.TURNSTILE_SITEKEY);
export async function tsVerify(token, ip) {
  if (!E.TURNSTILE_SECRET) return true;
  try {
    const b = new URLSearchParams({ secret: E.TURNSTILE_SECRET, response: token || '' });
    if (ip) b.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: b, signal: AbortSignal.timeout(6000) });
    return !!(await r.json()).success;
  } catch { return false; }
}
