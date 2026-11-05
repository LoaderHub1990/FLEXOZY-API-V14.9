/** ตัวเลขจากข้อความราคา เช่น "฿89" "1,290 บาท" → 89 / 1290 · ไม่ใช่ตัวเลขล้วนคืน null */
export function priceNumber(txt) {
  const m = String(txt || '').trim().match(/^[฿\s]*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:บาท|฿|THB)?$/i);
  const n = m ? Number(m[1].replace(/,/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : null;
}
