import axios from 'axios';
import https from 'node:https';
import { HttpError } from './db';

// พอร์ตตรงมาจาก topup_system.js ของบอท (axios + TLS 1.3 + body { mobile } เหมือนกันทุกอย่าง)
const TIMEOUT = 15000;

export function validateGiftLink(link) {
  if (!link || typeof link !== 'string') return false;
  const cleanLink = link.trim().replace(/\s/g, '');
  return /^https:\/\/gift\.truemoney\.com\/campaign(\/)?\?v=[a-zA-Z0-9]+$/.test(cleanLink);
}

export function extractVoucherCode(link) {
  try {
    return new URL(String(link).trim().replace(/\s/g, '')).searchParams.get('v');
  } catch {
    return null;
  }
}

export function mapError(code) {
  const messages = {
    CANNOT_GET_OWN_VOUCHER: 'รับซองตัวเองไม่ได้',
    TARGET_USER_NOT_FOUND: 'ไม่พบเบอร์นี้ในระบบ',
    VOUCHER_NOT_FOUND: 'ไม่พบซองอั่งเปาในระบบ',
    VOUCHER_OUT_OF_STOCK: 'มีคนรับซองอั่งเปาไปแล้ว',
    INTERNAL_ERROR: 'ไม่พบซองนี้ในระบบ หรือ URL ผิด',
    VOUCHER_EXPIRED: 'ซองวอเลทนี้หมดอายุแล้ว',
    BAD_PARAM: 'เบอร์โทรศัพท์ผู้รับเงินไม่ถูกต้อง',
    NETWORK_ERROR: 'ไม่สามารถเชื่อมต่อกับระบบ TrueMoney ได้',
  };
  return messages[code] || `เกิดข้อผิดพลาด: ${code}`;
}

const shopMobile = () => {
  const mobile = String(process.env.TRUEMONEY_MOBILE || '').replace(/\D/g, '');
  if (!/^0\d{9}$/.test(mobile)) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่า TRUEMONEY_MOBILE');
  return mobile;
};

/** เหมือน redeemVoucher ของบอททุกประการ คืน { success, amount(บาท), ownerName, voucherCode } หรือ { success:false, error, message } */
export async function redeemVoucher(giftLink) {
  if (!validateGiftLink(giftLink)) {
    return { success: false, error: 'INVALID_LINK_FORMAT', message: 'รูปแบบลิงค์อั่งเปาไม่ถูกต้อง' };
  }
  const voucherCode = extractVoucherCode(giftLink);
  if (!voucherCode) {
    return { success: false, error: 'INVALID_VOUCHER_CODE', message: 'ไม่สามารถดึงรหัสซองได้' };
  }
  const mobile = shopMobile();

  try {
    const response = await axios({
      method: 'post',
      url: `https://gift.truemoney.com/campaign/vouchers/${voucherCode}/redeem`,
      data: { mobile: `${mobile}` },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36 Edg/84.0.522.52',
        'Content-Type': 'application/json',
      },
      httpsAgent: new https.Agent({ maxVersion: 'TLSv1.3', minVersion: 'TLSv1.3' }),
      timeout: TIMEOUT,
    });
    const resData = response.data;

    if (resData.status && resData.status.code === 'SUCCESS') {
      const amount = parseFloat(String(resData.data.my_ticket.amount_baht).replace(/,/g, ''));
      const ownerName = String(resData.data.owner_profile?.full_name || '').replace(/^(Mr|Ms|Mrs|Dr|นาย|นางสาว|นาง|น.ส.|ด.ช.|ด.ญ.|สาว)\s*/i, '').trim();
      return { success: true, amount, ownerName, voucherCode };
    }
    return { success: false, error: resData.status.code, message: mapError(resData.status.code) };
  } catch (error) {
    const errorResponse = error.response ? error.response.data : null;
    const errorCode = errorResponse && errorResponse.status ? errorResponse.status.code : 'NETWORK_ERROR';
    return { success: false, error: errorCode, message: mapError(errorCode) };
  }
}
