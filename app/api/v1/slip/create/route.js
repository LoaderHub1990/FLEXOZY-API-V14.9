import crypto from 'crypto';
import * as db from '@/lib/db';
import { getUser } from '@/lib/auth';
import { promptpay, validNationalId, PREFIX } from '@/lib/promptpay';
import { ok, fail, wrap, site } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const POST = wrap(async (req) => {
  const user = await getUser(req);
  if (!user) return fail('unauthorized: ต้องส่ง API Key (x-api-key) หรือเข้าสู่ระบบ', 401);
  await db.touch(user.id).catch(() => {});
  const b = await req.json().catch(() => null);
  if (!b) return fail('ต้องส่ง JSON body');
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) return fail('amount ต้องเป็นตัวเลขมากกว่า 0 (ทศนิยมไม่เกิน 2 ตำแหน่ง)');
  const type = String(b.type || '');
  const target = String(b.target || '').replace(/[\s-]/g, '');
  const bank = typeof b.bank === 'string' ? b.bank.trim().slice(0, 40) : '';
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
  if (type === 'phone') { if (!/^0\d{9}$/.test(target)) return fail('เบอร์โทรต้องเป็น 10 หลักขึ้นต้นด้วย 0'); }
  else if (type === 'national_id') { if (!validNationalId(target)) return fail('เลขบัตรประชาชนไม่ถูกต้อง'); }
  else if (type === 'ewallet') { if (!/^\d{15}$/.test(target)) return fail('e-Wallet ID ต้องเป็นตัวเลข 15 หลัก'); }
  else if (type === 'bank_account') { if (!/^\d{10,15}$/.test(target)) return fail('เลขบัญชีต้องเป็นตัวเลข 10-15 หลัก'); if (!bank) return fail('ต้องระบุ bank (ชื่อธนาคาร) สำหรับเลขบัญชี'); }
  else return fail('type ต้องเป็น phone | national_id | ewallet | bank_account');
  const amt = Math.round(amount * 100) / 100;
  const id = crypto.randomBytes(5).toString('hex');
  const rec = { id, type, target, bank, name, amount: amt, owner: user.id, createdAt: Date.now(), qr: type === 'bank_account' ? null : promptpay(type, target, amt) };
  await db.set('slip:' + id, rec);
  const code = PREFIX + id;
  return ok({ id, code, link: `${site(req)}/s/${encodeURIComponent(code)}`, amount: amt, type, target, qrPayload: rec.qr }, 201);
});
