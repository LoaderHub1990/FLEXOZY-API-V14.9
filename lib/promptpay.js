// สร้าง PromptPay QR payload (EMVCo / Thai QR Payment) พร้อม CRC16-CCITT
const f = (id, v) => id + String(v.length).padStart(2, '0') + v;

function crc16(s) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function promptPayPayload(target, amountSatang) {
  const id = String(target || '').replace(/\D/g, '');
  let tag, val;
  if (id.length === 10 && id.startsWith('0')) { tag = '01'; val = '0066' + id.slice(1); }
  else if (id.length === 13) { tag = '02'; val = id; }
  else if (id.length === 15) { tag = '03'; val = id; }
  else throw new Error('PROMPTPAY_ID ต้องเป็นเบอร์โทร 10 หลัก / เลขบัตร 13 หลัก / e-Wallet 15 หลัก');
  const amt = amountSatang ? (amountSatang / 100).toFixed(2) : '';
  const p =
    f('00', '01') +
    f('01', amt ? '12' : '11') +
    f('29', f('00', 'A000000677010111') + f(tag, val)) +
    f('53', '764') +
    (amt ? f('54', amt) : '') +
    f('58', 'TH') +
    '6304';
  return p + crc16(p);
}
