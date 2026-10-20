import crypto from 'node:crypto';
import { route, json } from '@/lib/api';
import { one, tx, HttpError } from '@/lib/db';
import { requireUser, rateLimit, recordAttempt } from '@/lib/auth';
import { assertTopupEnabled } from '@/lib/topup';
import { verifySlipImage, receiverIsShop, slipConfigured } from '@/lib/easyslip';

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_BAHT = 100000;
const MAX_AGE_H = Math.max(1, Number(process.env.SLIP_MAX_AGE_HOURS) || 24);

function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// อัปโหลดสลิปโอนเงิน -> ตรวจกับ EasySlip -> เติมเครดิตเท่ายอดในสลิป (ไม่หักค่าธรรมเนียม)
export const POST = route(async (req) => {
  const user = await requireUser();
  await assertTopupEnabled('promptpay');
  if (!slipConfigured()) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่าระบบตรวจสลิป (EASYSLIP_API_KEY)');

  const key = `slip:${user.id}`;
  await rateLimit(key, 8, 10);

  let form;
  try { form = await req.formData(); } catch { throw new HttpError(400, 'รูปแบบข้อมูลไม่ถูกต้อง'); }
  const file = form.get('slip');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'กรุณาเลือกรูปสลิป');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'รูปสลิปใหญ่เกิน 4 MB');
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length || !sniff(buf)) throw new HttpError(400, 'รองรับเฉพาะรูป JPG / PNG / WEBP');

  // รูปเดิมที่เคยเติมสำเร็จแล้ว — ตอบทันทีโดยไม่เสียโควต้า EasySlip
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (await one('SELECT 1 FROM slip_topups WHERE img_hash=$1', [hash])) throw new HttpError(409, 'สลิปนี้ถูกใช้เติมเงินไปแล้ว');

  await recordAttempt(key);
  const slip = await verifySlipImage(buf.toString('base64'));

  if (!slip.transRef) throw new HttpError(400, 'อ่านเลขอ้างอิงจากสลิปไม่ได้ กรุณาอัปโหลดสลิปที่เห็น QR Code ชัดเจน');
  if (!(slip.amountSatang > 0)) throw new HttpError(400, 'อ่านยอดเงินจากสลิปไม่ได้');
  if (slip.amountSatang > MAX_BAHT * 100) throw new HttpError(400, 'ยอดในสลิปสูงเกินกำหนด กรุณาติดต่อแอดมิน');
  if (!receiverIsShop(slip)) throw new HttpError(400, 'สลิปนี้ไม่ได้โอนเข้าบัญชีของร้าน');
  if (slip.date && !Number.isNaN(slip.date.getTime())) {
    const age = Date.now() - slip.date.getTime();
    if (age > MAX_AGE_H * 3600 * 1000) throw new HttpError(400, `สลิปเก่าเกิน ${MAX_AGE_H} ชั่วโมง กรุณาติดต่อแอดมิน`);
    if (age < -10 * 60 * 1000) throw new HttpError(400, 'วันที่ในสลิปไม่ถูกต้อง');
  }

  const out = await tx(async (c) => {
    const u = (await c.query('SELECT id,banned FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
    if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    const ins = (await c.query(
      `INSERT INTO slip_topups(user_id,trans_ref,amount,status,sender_name,sender_bank,slip_at,img_hash,credited_at)
       VALUES($1,$2,$3,'credited',$4,$5,$6,$7,now())
       ON CONFLICT (trans_ref) DO NOTHING RETURNING id`,
      [user.id, slip.transRef, slip.amountSatang, slip.senderName.slice(0, 120), slip.senderBank.slice(0, 40), slip.date, hash]
    )).rows[0];
    if (!ins) throw new HttpError(409, 'สลิปนี้ถูกใช้เติมเงินไปแล้ว');
    const balance = (await c.query('UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance', [slip.amountSatang, user.id])).rows[0].balance;
    await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [user.id, slip.amountSatang, `เติมเงินผ่านสลิปธนาคาร #${ins.id}`]);
    return { id: ins.id, balance };
  });

  return json({ ok: true, id: out.id, amount: slip.amountSatang, balance: out.balance, transRef: slip.transRef, sender: slip.senderName, bank: slip.senderBank });
});
