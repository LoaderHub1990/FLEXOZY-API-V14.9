import { HttpError } from './db';

const BASE = (process.env.TRUEMONEY_BASE_URL || 'https://gift.truemoney.com').replace(/\/+$/, '');
// ถ้าเซิร์ฟเวอร์ (เช่น Vercel) ถูก TrueMoney/Cloudflare บล็อก ให้ตั้ง TRUEMONEY_BASE_URL ชี้ไป relay บนเซิร์ฟเวอร์ไทย แล้วใส่รหัสลับที่นี่
const RELAY_KEY = process.env.TRUEMONEY_RELAY_KEY || '';

/** รับได้ทั้งลิงก์ซอง (…/campaign/?v=xxxx) หรือโค้ดล้วนๆ */
export function extractVoucherCode(input) {
  const value = String(input || '').trim();
  try {
    const u = new URL(value);
    const v = u.searchParams.get('v');
    if (u.protocol === 'https:' && u.hostname === 'gift.truemoney.com' && u.pathname.startsWith('/campaign') && /^[A-Za-z0-9]{10,100}$/.test(v || '')) return v;
  } catch {}
  if (/^[A-Za-z0-9]{10,100}$/.test(value)) return value;
  throw new HttpError(400, 'ลิงก์ TrueMoney Voucher ไม่ถูกต้อง (ต้องเป็นลิงก์แบบ https://gift.truemoney.com/campaign/?v=...)');
}

/**
 * เรียก TrueMoney แล้วแปลงเป็น JSON ให้เสมอ
 * ถ้าไม่ใช่ JSON (มักเป็นหน้า HTML ของ Cloudflare ที่บล็อก IP เซิร์ฟเวอร์) จะ log สถานะ + ข้อความต้นฉบับไว้ใน Vercel Logs
 * และติดธง err.notRedeemed = true เมื่อมั่นใจว่าคำขอไม่ถึงขั้นรับเงิน (ให้ลองซ้ำได้ ไม่ต้องรอแอดมิน)
 */
async function tmnFetch(path, { referer, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        Origin: 'https://gift.truemoney.com',
        Referer: referer || 'https://gift.truemoney.com/campaign/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        ...(RELAY_KEY ? { 'X-Relay-Key': RELAY_KEY } : {}),
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch {}
    if (!data || typeof data !== 'object') {
      console.error('[truemoney] non-JSON response', r.status, text.slice(0, 300).replace(/\s+/g, ' '));
      const blocked = [403, 429, 503].includes(r.status) || /cloudflare|just a moment|attention required|access denied|captcha/i.test(text);
      const err = new HttpError(502, blocked
        ? `TrueMoney ปฏิเสธการเชื่อมต่อจากเซิร์ฟเวอร์ร้าน (HTTP ${r.status}) กรุณาแจ้งแอดมิน`
        : `TrueMoney ตอบกลับข้อมูลไม่ถูกต้อง (HTTP ${r.status})`);
      err.notRedeemed = blocked || r.status === 404;
      throw err;
    }
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e?.name === 'AbortError') throw new HttpError(504, 'TrueMoney ตอบกลับช้าเกินไป');
    const err = new HttpError(502, 'ไม่สามารถเชื่อมต่อ TrueMoney ได้');
    err.notRedeemed = ['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(e?.cause?.code);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function apiError(data) {
  const code = data?.status?.code || 'UNKNOWN';
  const msg = data?.status?.message || 'ไม่สามารถทำรายการ TrueMoney ได้';
  const map = {
    VOUCHER_OUT_OF_STOCK: 'ซองนี้ถูกใช้หมดแล้ว',
    VOUCHER_EXPIRED: 'ซองนี้หมดอายุแล้ว',
    VOUCHER_NOT_FOUND: 'ไม่พบซอง TrueMoney นี้',
    TARGET_USER_REDEEMED: 'บัญชีปลายทางรับซองนี้ไปแล้ว',
    TARGET_USER_NOT_FOUND: 'ไม่พบเบอร์ TrueMoney ของร้าน',
    CANNOT_GET_OWN_VOUCHER: 'ไม่สามารถรับซองของตัวเองได้',
    TARGET_USER_STATUS_INACTIVE: 'บัญชี TrueMoney ปลายทางไม่พร้อมรับเงิน',
    MAINTENANCE: 'ระบบ TrueMoney กำลังปรับปรุง',
  };
  throw new HttpError(400, map[code] || msg);
}

const shopMobile = () => {
  const mobile = String(process.env.TRUEMONEY_MOBILE || '').replace(/\D/g, '');
  if (!/^0\d{9}$/.test(mobile)) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่า TRUEMONEY_MOBILE');
  return mobile;
};

/**
 * กดรับซองเข้าเบอร์ร้านทันที (รับก่อนแล้วค่อยเช็กยอดจากที่ TrueMoney ยืนยัน)
 * ไม่เรียก /verify ก่อน เพราะเป็นจุดที่ TrueMoney มักตอบไม่ใช่ JSON และไม่จำเป็นต่อการรับซอง
 * คืนยอดที่เข้ากระเป๋าจริง (สตางค์)
 */
export async function redeemVoucher(voucherCode) {
  const mobile = shopMobile();
  const redeem = await tmnFetch(`/campaign/vouchers/${encodeURIComponent(voucherCode)}/redeem`, {
    method: 'POST',
    referer: `https://gift.truemoney.com/campaign/?v=${encodeURIComponent(voucherCode)}`,
    body: JSON.stringify({ mobile, voucher_hash: voucherCode }),
  });
  if (redeem?.status?.code !== 'SUCCESS') apiError(redeem);

  const got = Number(redeem?.data?.my_ticket?.amount_baht ?? redeem?.data?.voucher?.amount_baht);
  const satang = Number.isFinite(got) && got > 0 ? Math.round(got * 100) : 0;
  if (!satang) {
    // เงินเข้าแล้วแต่ไม่รู้ยอด -> ให้แอดมินตรวจ (status>=500 และไม่ติดธง notRedeemed)
    throw new HttpError(502, 'TrueMoney ยืนยันรายการแล้วแต่ไม่พบยอดเงิน');
  }
  return { amount: satang };
}
