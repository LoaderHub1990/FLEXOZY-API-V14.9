import QRCode from 'qrcode';
import { promptPayPayload } from './promptpay';
import { HttpError } from './db';
import { getSettings } from './shop';

/** ตรวจว่าแอดมินเปิดช่องทางนี้อยู่หรือไม่ (ปิดชั่วคราวจากหลังบ้าน) */
export async function assertTopupEnabled(method) {
  const s = await getSettings();
  const key = method === 'truemoney' ? 'topup_truemoney_enabled' : 'topup_promptpay_enabled';
  if (s[key] === '0') {
    const name = method === 'truemoney' ? 'TrueMoney' : 'PromptPay';
    throw new HttpError(503, `ช่องทางเติมเงินผ่าน ${name} ปิดให้บริการชั่วคราว กรุณาใช้ช่องทางอื่นหรือลองใหม่ภายหลัง`);
  }
  return s;
}

export async function topupView(t) {
  const payload = promptPayPayload(process.env.PROMPTPAY_ID, t.pay_amount);
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { id: t.id, amount: t.amount, payAmount: t.pay_amount, status: t.status, ref: t.ref, qr };
}
