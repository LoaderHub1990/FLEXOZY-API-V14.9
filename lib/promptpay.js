// สร้างข้อมูล QR พร้อมเพย์ (PromptPay) จากเบอร์โทร — เงินเข้าบัญชีเจ้าของเบอร์โดยตรง ระบบไม่ได้ถือเงิน
const crc16 = (s) => {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, '0');
};
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;

export const cleanPhone = (v) => String(v || '').replace(/\D/g, '');
export const validPhone = (v) => /^0\d{9}$/.test(cleanPhone(v));
export const fmtPhone = (v) => { const d = cleanPhone(v); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d; };

/** ตัวเลขจากข้อความราคา เช่น "฿89" "1,290 บาท" → 89 / 1290 · ถ้าไม่ใช่ตัวเลขล้วนคืน null */
export function priceNumber(txt) {
  const m = String(txt || '').trim().match(/^[฿\s]*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:บาท|฿|THB)?$/i);
  const n = m ? Number(m[1].replace(/,/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : null;
}

export function promptPayPayload(phone, amount) {
  const d = cleanPhone(phone);
  const target = '0066' + d.slice(1); // 0812345678 → 0066812345678
  const body = tlv('00', '01') + tlv('01', amount ? '12' : '11')
    + tlv('29', tlv('00', 'A000000677010111') + tlv('01', target))
    + tlv('58', 'TH') + tlv('53', '764') + (amount ? tlv('54', Number(amount).toFixed(2)) : '') + '6304';
  return body + crc16(body);
}
