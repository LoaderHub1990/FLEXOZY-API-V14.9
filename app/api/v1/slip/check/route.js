import * as db from '@/lib/db';
import { getUser } from '@/lib/auth';
import { crc16, parseTlv } from '@/lib/promptpay';
import { ok, fail, wrap } from '@/lib/http';
export const dynamic = 'force-dynamic';
const BANKS = { '002': 'BBL', '004': 'KBANK', '006': 'KTB', '011': 'TTB', '014': 'SCB', '022': 'CIMBT', '024': 'UOB', '025': 'BAY', '030': 'GSB', '033': 'GHB', '034': 'BAAC', '066': 'ISBT', '067': 'TISCO', '069': 'KKP', '070': 'ICBC', '071': 'TCRB', '073': 'LHFG' };
export const POST = wrap(async (req) => {
  const user = await getUser(req);
  if (!user) return fail('unauthorized: ต้องส่ง API Key (x-api-key) หรือเข้าสู่ระบบ', 401);
  await db.touch(user.id);
  const body = await req.json().catch(() => null);
  const payload = typeof body?.payload === 'string' ? body.payload.trim() : '';
  if (!payload) return fail('ต้องส่ง payload (ข้อความจาก QR บนสลิป)');
  const top = parseTlv(payload);
  const inner = top?.['00'] ? parseTlv(top['00']) : null;
  const ref = inner?.['02'];
  if (!top || !inner || !ref) return fail('invalid_payload: รูปแบบ QR สลิปไม่ถูกต้อง', 422);
  const crcValid = payload.slice(-4).toUpperCase() === crc16(payload.slice(0, -4));
  const first = await db.setnx('slipref:' + ref, { by: user.id, at: Date.now() });
  const out = { transRef: ref, sendingBank: inner['01'] || null, sendingBankName: BANKS[inner['01']] || null, crcValid, alreadyChecked: !first, verified: false, provider: null };
  if (process.env.SLIP_VERIFY_TOKEN) {
    try {
      const r = await fetch(process.env.SLIP_VERIFY_URL || 'https://developer.easyslip.com/api/v1/verify', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.SLIP_VERIFY_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ payload }),
      });
      const j = await r.json();
      out.provider = j;
      out.verified = crcValid && r.ok && j?.status === 200;
      const amt = j?.data?.amount?.amount;
      if (body.amount != null && amt != null) out.amountMatch = Number(body.amount) === Number(amt);
    } catch (e) { out.provider = { error: String(e?.message || e) }; }
  }
  return ok(out);
});
