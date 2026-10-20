import { HttpError } from './db';

// EasySlip API v2 — https://document.easyslip.com/en/v2/
// ตั้งค่า EASYSLIP_BASE_URL ได้ถ้าต้องการชี้ไปเซิร์ฟเวอร์อื่น (เช่น ทดสอบ)
const base = () => (process.env.EASYSLIP_BASE_URL || 'https://api.easyslip.com/v2').replace(/\/+$/, '');

export const slipConfigured = () => !!process.env.EASYSLIP_API_KEY;

const ERRORS = {
  MISSING_API_KEY: [503, 'ระบบตรวจสลิปยังตั้งค่าไม่ครบ กรุณาแจ้งแอดมิน'],
  INVALID_API_KEY: [503, 'ระบบตรวจสลิปยังตั้งค่าไม่ครบ กรุณาแจ้งแอดมิน'],
  UNAUTHORIZED: [503, 'ระบบตรวจสลิปยังตั้งค่าไม่ครบ กรุณาแจ้งแอดมิน'],
  BRANCH_INACTIVE: [503, 'ระบบตรวจสลิปปิดใช้งานชั่วคราว กรุณาแจ้งแอดมิน'],
  SERVICE_BANNED: [503, 'ระบบตรวจสลิปปิดใช้งานชั่วคราว กรุณาแจ้งแอดมิน'],
  USER_BANNED: [503, 'ระบบตรวจสลิปปิดใช้งานชั่วคราว กรุณาแจ้งแอดมิน'],
  IP_NOT_ALLOWED: [503, 'ระบบตรวจสลิปปิดกั้น IP ของเซิร์ฟเวอร์ กรุณาแจ้งแอดมิน'],
  ACCESS_DENIED: [503, 'ระบบตรวจสลิปปิดใช้งานชั่วคราว กรุณาแจ้งแอดมิน'],
  SERVICE_EXPIRED: [503, 'แพ็กเกจระบบตรวจสลิปของร้านหมดอายุ กรุณาแจ้งแอดมิน'],
  PACKAGE_EXPIRED: [503, 'แพ็กเกจระบบตรวจสลิปของร้านหมดอายุ กรุณาแจ้งแอดมิน'],
  QUOTA_EXCEEDED: [503, 'โควต้าตรวจสลิปของร้านหมด กรุณาแจ้งแอดมิน'],
  VALIDATION_ERROR: [400, 'อ่านรูปสลิปไม่ได้ กรุณาอัปโหลดสลิปที่เห็น QR Code ชัดเจน'],
  INVALID_IMAGE: [400, 'อ่านรูปสลิปไม่ได้ กรุณาอัปโหลดสลิปที่เห็น QR Code ชัดเจน'],
  INVALID_PAYLOAD: [400, 'อ่าน QR ในสลิปไม่ได้ กรุณาอัปโหลดสลิปที่เห็น QR Code ชัดเจน'],
  SLIP_NOT_FOUND: [400, 'ไม่พบข้อมูลสลิปนี้ในระบบธนาคาร (สลิปปลอมหรือยังไม่เข้าระบบ) ถ้าเพิ่งโอนให้รอ 1-2 นาทีแล้วลองใหม่'],
  DUPLICATE_SLIP: [409, 'สลิปนี้ถูกใช้เติมเงินไปแล้ว'],
};

/** ส่งรูปสลิป (base64) ไปตรวจกับ EasySlip แล้วคืนข้อมูลสลิปที่ normalize แล้ว */
export async function verifySlipImage(base64) {
  const key = process.env.EASYSLIP_API_KEY;
  if (!key) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่าระบบตรวจสลิป (EASYSLIP_API_KEY)');

  // EasySlip v2 รับรูปได้หลายชื่อฟิลด์ ลองตามลำดับเมื่อฟิลด์แรกถูกปฏิเสธ (VALIDATION_ERROR)
  const bodies = [{ image: base64 }, { base64 }];
  let j, code = '';
  for (const payload of bodies) {
    j = await callEasySlip(key, payload);
    const ok = j?.success === true || (j?.status === 200 && j?.data);
    if (ok) return normalizeSlip(j.data);
    code = String(j?.error?.code || j?.message || '').toUpperCase().replace(/[^A-Z_]/g, '');
    if (code !== 'VALIDATION_ERROR') break;
  }

  const hit = ERRORS[code];
  if (hit) throw new HttpError(hit[0], hit[1]);
  console.error('easyslip error', JSON.stringify(j)?.slice(0, 500));
  throw new HttpError(502, `ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่หรือแจ้งแอดมิน${code ? ` (${code})` : ''}`);
}

async function callEasySlip(key, payload) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(`${base()}/verify/bank`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
      cache: 'no-store',
    });
    const text = await r.text();
    try { return JSON.parse(text); } catch {
      console.error('easyslip non-JSON', r.status, text.slice(0, 200));
      throw new HttpError(502, `ระบบตรวจสลิปตอบกลับข้อมูลไม่ถูกต้อง (HTTP ${r.status})`);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e?.name === 'AbortError') throw new HttpError(504, 'ระบบตรวจสลิปตอบกลับช้าเกินไป กรุณาลองใหม่');
    throw new HttpError(502, 'ไม่สามารถเชื่อมต่อระบบตรวจสลิปได้');
  } finally {
    clearTimeout(timer);
  }
}


const pickName = (n) => String(n?.th || n?.en || '').trim();

/** แปลงผลลัพธ์ให้เป็นรูปแบบเดียว (รองรับทั้ง data ตรงๆ และ data.rawSlip) */
export function normalizeSlip(data) {
  const d = data?.rawSlip || data || {};
  const rawAmount = typeof d.amount === 'object' && d.amount !== null ? d.amount.amount : d.amount;
  const baht = Number(rawAmount);
  const rcv = d.receiver || {};
  const snd = d.sender || {};
  return {
    transRef: String(d.transRef || '').trim(),
    amountSatang: Number.isFinite(baht) ? Math.round(baht * 100) : 0,
    date: d.date ? new Date(d.date) : null,
    senderName: pickName(snd.account?.name),
    senderBank: String(snd.bank?.short || snd.bank?.name || '').trim(),
    receiverNames: [rcv.account?.name?.th, rcv.account?.name?.en].filter(Boolean).map(String),
    receiverAccounts: [rcv.account?.bank?.account, rcv.account?.proxy?.account].filter(Boolean).map(String),
  };
}

// ---------- ตรวจว่าโอนเข้าบัญชีร้านจริง ----------
// สลิปจะปิดบังเลขบัญชีบางหลัก (xxx-x-x1234-x) จึงเทียบเฉพาะหลักที่เห็น เรียงจากท้าย

/** true = ตรงกัน, false = ไม่ตรง, null = เทียบไม่ได้ (เห็นเลขน้อยเกินไป) */
export function accountMatch(expected, masked) {
  const e = String(expected || '').replace(/\D/g, '');
  const m = String(masked || '').toLowerCase().replace(/\*/g, 'x').replace(/[^0-9x]/g, '');
  if (!e || m.replace(/x/g, '').length < 3) return null;
  const n = Math.min(e.length, m.length);
  let seen = 0;
  for (let i = 1; i <= n; i++) {
    const mc = m[m.length - i];
    if (mc === 'x') continue;
    if (mc !== e[e.length - i]) return false;
    seen++;
  }
  return seen >= 3 ? true : null;
}

const HONORIFIC = /^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|miss|ms\.?)\s*/i;
const tokens = (s) => String(s || '').trim().replace(HONORIFIC, '').split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());

/** เทียบชื่อ: ชื่อต้องตรงเป๊ะ ส่วนนามสกุลธนาคารมักตัดเหลือตัวอักษรแรก */
export function nameMatch(expected, slipName) {
  const a = tokens(expected), b = tokens(slipName);
  if (!a.length || !b.length) return null;
  if (a[0] !== b[0]) return false;
  if (a.length < 2 || b.length < 2) return true;
  return a[1].startsWith(b[1]) || b[1].startsWith(a[1]);
}

/** คืน true ถ้าสลิปโอนเข้าบัญชีของร้าน */
export function receiverIsShop(slip) {
  const expected = [process.env.PROMPTPAY_ID, ...String(process.env.SLIP_RECEIVER_ACCOUNT || '').split(',')]
    .map((x) => String(x || '').replace(/\D/g, '')).filter(Boolean);
  const shopName = String(process.env.SLIP_RECEIVER_NAME || '').trim();

  let hit = false, miss = false;
  for (const e of expected) for (const a of slip.receiverAccounts) {
    const r = accountMatch(e, a);
    if (r === true) hit = true; else if (r === false) miss = true;
  }
  let nameRes = null;
  if (shopName) {
    const rs = slip.receiverNames.map((n) => nameMatch(shopName, n));
    nameRes = rs.includes(true) ? true : rs.includes(false) ? false : null;
  }
  if (hit) return nameRes !== false;            // เลขบัญชีตรง (และถ้าตั้งชื่อไว้ ชื่อต้องไม่ขัด)
  if (!miss && nameRes === true) return true;    // เลขบัญชีเทียบไม่ได้ แต่ชื่อตรง
  return false;
}
