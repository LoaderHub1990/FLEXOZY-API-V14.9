const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
export function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
export function promptpay(type, target, amount) {
  const sub = type === 'phone' ? tlv('01', '0066' + target.slice(1)) : type === 'national_id' ? tlv('02', target) : tlv('03', target);
  const body = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('29', tlv('00', 'A000000677010111') + sub) + tlv('53', '764') + (amount ? tlv('54', amount.toFixed(2)) : '') + tlv('58', 'TH') + '6304';
  return body + crc16(body);
}
export function validNationalId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(id[i]) * (13 - i);
  return (11 - (s % 11)) % 10 === Number(id[12]);
}
// แยก TLV ของ QR บนสลิป
export function parseTlv(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2), len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(len) || i + 4 + len > s.length) return null;
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}
export const PREFIX = '=%fl#S!';
// สร้าง payload สลิปตัวอย่าง (ใช้ทดสอบระบบเช็คสลิป)
export function sampleSlipPayload(bank = '014', ref) {
  const d = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10).replace(/-/g, '');
  const r = ref || d + Array.from({ length: 12 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 34)]).join('');
  const inner = tlv('00', '000001') + tlv('01', bank) + tlv('02', r);
  const body = tlv('00', inner) + tlv('51', 'TH') + '9104';
  return body + crc16(body);
}
