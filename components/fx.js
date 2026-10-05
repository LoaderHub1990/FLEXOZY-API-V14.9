// ตัวช่วยสำหรับเอฟเฟกต์ (ใช้ฝั่งเบราว์เซอร์เท่านั้น)
export const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// รอให้หน้าโหลด (boot loader) เล่นจบก่อนค่อยเริ่มเอฟเฟกต์ — คืนฟังก์ชันยกเลิก
export function onReady(fn) {
  if (document.documentElement.dataset.ready === '1') { fn(); return () => {}; }
  const h = () => fn();
  window.addEventListener('dh:ready', h, { once: true });
  return () => window.removeEventListener('dh:ready', h);
}
