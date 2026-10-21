import { HttpError } from './db';
import { getSettings } from './shop';

/** ตรวจว่าแอดมินเปิดช่องทางเติมเงิน TrueMoney อยู่หรือไม่ (ปิดชั่วคราวจากหลังบ้าน) */
export async function assertTopupEnabled() {
  const s = await getSettings();
  if (s.topup_truemoney_enabled === '0') {
    throw new HttpError(503, 'ช่องทางเติมเงินผ่าน TrueMoney ปิดให้บริการชั่วคราว กรุณาลองใหม่ภายหลัง');
  }
  return s;
}
