import QRCode from 'qrcode';
import { promptPayPayload } from './promptpay';

export async function topupView(t) {
  const payload = promptPayPayload(process.env.PROMPTPAY_ID, t.pay_amount);
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { id: t.id, amount: t.amount, payAmount: t.pay_amount, status: t.status, ref: t.ref, qr };
}
