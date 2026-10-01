'use client';
export default function Err({ reset }) {
  return (
    <main className="wrap narrow center">
      <h2>เกิดข้อผิดพลาดชั่วคราว</h2>
      <p className="dim">ลองใหม่อีกครั้ง ถ้ายังไม่หาย แอดมินตรวจที่ <code>/api/health</code></p>
      <button className="btn primary" onClick={reset}>ลองอีกครั้ง</button>
    </main>
  );
}
