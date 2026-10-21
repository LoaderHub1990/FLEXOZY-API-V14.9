/** แปลงจำนวนวินาทีเป็นข้อความไทย (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์) 0 = ตลอดชีพ */
export function fmtDuration(seconds) {
  let s = Math.floor(Number(seconds) || 0);
  if (s <= 0) return 'ตลอดชีพ';
  const parts = [];
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (d) parts.push(`${d} วัน`);
  if (h) parts.push(`${h} ชั่วโมง`);
  if (m) parts.push(`${m} นาที`);
  if (!parts.length) parts.push(`${s} วินาที`);
  return parts.slice(0, 2).join(' ');
}

export const startText = (start) => (start === 'purchase' ? 'เริ่มนับเวลาตั้งแต่ซื้อ' : 'เริ่มนับเวลาเมื่อใช้งานครั้งแรก');

/** สถานะคีย์สำหรับแสดงผล → [คลาสสี, ข้อความ] */
export function keyStatus(k) {
  if (k.revoked) return ['bad', 'ถูกระงับ'];
  const secs = Number(k.seconds);
  if (!k.activated_at) return ['warn', `ยังไม่เริ่มใช้ · อายุ ${fmtDuration(secs)}`];
  if (!k.expires_at) return ['ok', 'ใช้งานได้ · ตลอดชีพ'];
  const left = Math.floor((new Date(k.expires_at).getTime() - Date.now()) / 1000);
  if (left <= 0) return ['bad', 'หมดอายุแล้ว'];
  return ['ok', `ใช้งานได้ · เหลือ ${fmtDuration(left)}`];
}
