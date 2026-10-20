import { HttpError } from './db';

const BASE = process.env.TRUEMONEY_BASE_URL || 'https://gift.truemoney.com';

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
    if (e?.name === 'AbortError') throw new HttpError(504, 'TrueMoney ตอบกลับช้าเกินไป');
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

const shopMobile = () => {
  const mobile = String(process.env.TRUEMONEY_MOBILE || '').replace(/\D/g, '');
  if (!/^0\d{9}$/.test(mobile)) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่า TRUEMONEY_MOBILE');
  return mobile;
};

/**
 * ขั้นที่ 1: ตรวจซองก่อนกดรับ (ยังไม่แตะเงิน)
 * ตรวจยอดขั้นต่ำตรงนี้ เพื่อไม่ให้รับซองไปแล้วค่อยมาปฏิเสธทีหลัง (เงินจะค้างโดยไม่ได้เครดิต)
 */
export async function checkVoucher(voucherCode, minSatang = 0) {
  const mobile = shopMobile();
  const verify = await tmnFetch(`/campaign/vouchers/${encodeURIComponent(voucherCode)}/verify?mobile=${mobile}`);
  if (verify?.status?.code !== 'SUCCESS' || !verify?.data?.voucher) apiError(verify);

  const v = verify.data.voucher;
  if (v.status !== 'active') throw new HttpError(400, 'ซอง TrueMoney นี้ไม่พร้อมใช้งาน');
  if (Number(v.member) !== 1) throw new HttpError(400, 'กรุณาสร้างซอง TrueMoney แบบผู้รับ 1 คนเท่านั้น');

  const available = Number(v.amount_baht) - Number(v.redeemed_amount_baht || 0);
  if (!Number.isFinite(available) || available <= 0) throw new HttpError(400, 'ซอง TrueMoney ไม่มียอดคงเหลือ');
  const satang = Math.round(available * 100);
  if (satang < minSatang) throw new HttpError(400, `ยอดซองต่ำกว่าขั้นต่ำ ${minSatang / 100} บาท`);
  return { availableSatang: satang };
}

/** ขั้นที่ 2: กดรับซองเข้าเบอร์ร้านจริง คืนยอดที่ TrueMoney ยืนยันว่าเข้ากระเป๋า */
export async function redeemVoucher(voucherCode, fallbackSatang) {
  const mobile = shopMobile();
  const redeem = await tmnFetch(`/campaign/vouchers/${encodeURIComponent(voucherCode)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ mobile, voucher_hash: voucherCode }),
  });
  if (redeem?.status?.code !== 'SUCCESS') apiError(redeem);

  const got = Number(redeem?.data?.my_ticket?.amount_baht);
  const satang = Number.isFinite(got) && got > 0 ? Math.round(got * 100) : fallbackSatang;
  if (!Number.isFinite(satang) || satang <= 0) throw new HttpError(502, 'TrueMoney ยืนยันรายการแล้วแต่ไม่พบยอดเงิน');
  return { amount: satang };
}
