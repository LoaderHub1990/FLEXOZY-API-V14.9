import { route, json, body } from '@/lib/api';
import { one, q, HttpError } from '@/lib/db';
import { str } from '@/lib/util';
import { clientIp, rateLimit, recordAttempt } from '@/lib/auth';
import { validateGiftLink, extractVoucherCode, redeemVoucher } from '@/lib/truemoney';
import { rentalBySub, rentalState } from '@/lib/rent';
import { validPhone } from '@/lib/phone';
import { TEMPLATES, demoSite } from '@/lib/templates';
import { priceNumber } from '@/lib/price';

export const maxDuration = 30;

// ลูกค้าของผู้เช่าวางลิงก์ซองอั่งเปา → รับเข้าเบอร์ TrueMoney ของผู้เช่าทันที (ไม่ผ่านกระเป๋าของระบบ)
export const POST = route(async (req) => {
  const b = await body(req);
  // โหมดทดลองของหน้าตัวอย่าง (/aurora ฯลฯ): ทำงานเหมือนจริงทุกขั้น แต่ไม่แตะ TrueMoney และไม่บันทึกอะไร
  if (String(b.sub || '').startsWith('~')) {
    const tpl = TEMPLATES.find((x) => x.slug === String(b.sub).slice(1));
    if (!tpl) throw new HttpError(404, 'ไม่พบเว็บนี้');
    if (!validateGiftLink(String(b.voucher || '').trim())) throw new HttpError(400, 'รูปแบบลิงก์อั่งเปาไม่ถูกต้อง (ต้องเป็น https://gift.truemoney.com/campaign/?v=...)');
    await rateLimit(`tpaydemo:${await clientIp()}`, 30, 10);
    await recordAttempt(`tpaydemo:${await clientIp()}`);
    const it = demoSite(tpl.slug).items.find((x) => x.name === String(b.item || ''));
    await new Promise((r) => setTimeout(r, 700));
    return json({ ok: true, demo: true, amount: Math.round((priceNumber(it?.price) || 50) * 100) });
  }
  const rental = await rentalBySub(String(b.sub || ''));
  if (!rental || rentalState(rental) !== 'active') throw new HttpError(404, 'ไม่พบเว็บนี้ หรือเว็บหมดอายุแล้ว');
  const phone = rental.site?.pay_phone;
  if (!validPhone(phone)) throw new HttpError(400, 'เว็บนี้ยังไม่ได้ตั้งค่าเบอร์รับเงิน');

  const link = String(b.voucher || '').trim();
  if (!validateGiftLink(link)) throw new HttpError(400, 'รูปแบบลิงก์อั่งเปาไม่ถูกต้อง (ต้องเป็น https://gift.truemoney.com/campaign/?v=...)');
  const code = extractVoucherCode(link);
  const item = str(b.item, { max: 60 });
  const buyer_name = str(b.name, { max: 40 });
  const buyer_contact = str(b.contact, { max: 60 });

  const key = `tpay:${rental.id}:${await clientIp()}`;
  await rateLimit(key, 5, 10);

  const existing = await one('SELECT status FROM tenant_payments WHERE voucher_code=$1', [code]);
  if (existing?.status === 'paid') throw new HttpError(409, 'ซองนี้ถูกใช้ไปแล้ว');
  if (existing?.status === 'review') throw new HttpError(409, 'ซองนี้อยู่ระหว่างตรวจสอบ กรุณาติดต่อเจ้าของเว็บ');

  const claim = await one(
    `INSERT INTO tenant_payments(rental_id,voucher_code,status,item,buyer_name,buyer_contact,phone) VALUES($1,$2,'pending',$3,$4,$5,$6)
     ON CONFLICT (voucher_code) DO UPDATE SET rental_id=EXCLUDED.rental_id,status='pending',item=EXCLUDED.item,buyer_name=EXCLUDED.buyer_name,buyer_contact=EXCLUDED.buyer_contact,phone=EXCLUDED.phone,created_at=now(),error_code=NULL
       WHERE tenant_payments.status='failed' OR (tenant_payments.status='pending' AND tenant_payments.created_at < now() - interval '10 minutes')
     RETURNING id`, [rental.id, code, item, buyer_name, buyer_contact, phone]);
  if (!claim) throw new HttpError(409, 'ซองนี้กำลังถูกตรวจสอบ กรุณารอสักครู่');
  await recordAttempt(key);

  const result = await redeemVoucher(link, phone);
  if (!result.success) {
    if (result.error === 'NETWORK_ERROR') {
      await q(`UPDATE tenant_payments SET status='review',error_code='NETWORK_ERROR' WHERE id=$1`, [claim.id]);
      throw new HttpError(502, 'ยังยืนยันผลการรับซองไม่ได้ กรุณาแจ้งเจ้าของเว็บและแนบลิงก์ซอง');
    }
    await q(`UPDATE tenant_payments SET status='failed',error_code=$1 WHERE id=$2`, [String(result.error).slice(0, 80), claim.id]);
    throw new HttpError(400, result.message);
  }
  const amount = Math.round(result.amount * 100);
  await q(`UPDATE tenant_payments SET status='paid',amount=$1 WHERE id=$2`, [amount, claim.id]);
  return json({ ok: true, amount });
});
