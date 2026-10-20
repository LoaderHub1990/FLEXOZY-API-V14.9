import { route, json, body } from '@/lib/api';
import { HttpError } from '@/lib/db';
import { int } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import { assertTopupEnabled, exactQr } from '@/lib/topup';
import { slipConfigured } from '@/lib/easyslip';

// สร้าง QR PromptPay ยอดตรงตัว (ไม่บันทึกอะไรลงฐานข้อมูล) — โอนแล้วอัปโหลดสลิปที่ /api/topup/slip
export const POST = route(async (req) => {
  await requireUser();
  await assertTopupEnabled('promptpay');
  if (!process.env.PROMPTPAY_ID) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่าบัญชีรับเงิน (PROMPTPAY_ID)');
  if (!slipConfigured()) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่าระบบตรวจสลิป (EASYSLIP_API_KEY)');
  const s = await getSettings();
  const b = await body(req);
  const min = Math.max(1, parseInt(s.min_topup, 10) || 10);
  const baht = int(b.amount, { min, max: 50000, name: `จำนวนเงิน (ขั้นต่ำ ${min} บาท)` });
  return json({ topup: { amount: baht * 100, qr: await exactQr(baht) } });
});
