import { HttpError } from './db';

const BASE = 'https://gift.truemoney.com';
const URL_RE = /^https:\/\/gift\.truemoney\.com\/campaign(?:\/voucher_detail)?\/?\?v=([A-Za-z0-9]+)$/;

export function extractVoucherCode(input) {
  const value = String(input || '').trim();
  const m = value.match(URL_RE);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{10,100}$/.test(value)) return value;
  throw new HttpError(400, 'ลิงก์ TrueMoney Voucher ไม่ถูกต้อง');
}

async function tmnFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
    let data;
    try { data = await r.json(); } catch { throw new HttpError(502, 'TrueMoney ตอบกลับข้อมูลไม่ถูกต้อง'); }
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e?.name === 'AbortError') throw new HttpError(504, 'TrueMoney ตอบกลับช้าเกินไป กรุณาลองใหม่');
    throw new HttpError(502, 'ไม่สามารถเชื่อมต่อ TrueMoney ได้');
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

export async function redeemTrueMoney(voucherCode) {
  const mobile = String(process.env.TRUEMONEY_MOBILE || '').replace(/\D/g, '');
  if (!/^0\d{9}$/.test(mobile)) {
    throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่า TRUEMONEY_MOBILE');
  }

  const verify = await tmnFetch(`/campaign/vouchers/${encodeURIComponent(voucherCode)}/verify`);
  if (verify?.status?.code !== 'SUCCESS' || !verify?.data?.voucher) apiError(verify);

  const voucher = verify.data.voucher;
  if (voucher.status !== 'active') throw new HttpError(400, 'ซอง TrueMoney นี้ไม่พร้อมใช้งาน');
  if (Number(voucher.member) !== 1) {
    throw new HttpError(400, 'กรุณาสร้างซอง TrueMoney แบบผู้รับ 1 คนเท่านั้น');
  }

  const amountBaht = Number(voucher.amount_baht);
  const redeemedBaht = Number(voucher.redeemed_amount_baht || 0);
  const availableBaht = amountBaht - redeemedBaht;
  if (!Number.isFinite(availableBaht) || availableBaht <= 0) {
    throw new HttpError(400, 'ซอง TrueMoney ไม่มียอดคงเหลือ');
  }

  const redeem = await tmnFetch(`/campaign/vouchers/${encodeURIComponent(voucherCode)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ mobile, voucher_hash: voucherCode }),
  });
  if (redeem?.status?.code !== 'SUCCESS') apiError(redeem);

  const received = Number(redeem?.data?.my_ticket?.amount_baht ?? availableBaht);
  if (!Number.isFinite(received) || received <= 0) {
    throw new HttpError(502, 'TrueMoney ยืนยันรายการแล้วแต่ไม่พบยอดเงิน');
  }
  return { amount: Math.round(received * 100), voucherCode };
}
