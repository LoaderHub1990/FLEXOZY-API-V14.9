'use client';
import { useEffect, useState } from 'react';
const LINES = [
  ['info', 'login --discord'],
  ['ok', 'เข้าสู่ระบบสำเร็จ · เพิ่มเข้าเซิร์ฟเวอร์ให้แล้ว'],
  ['ok', 'ตรวจเบราว์เซอร์ (proof-of-work) ผ่าน'],
  ['ok', 'ขั้นที่ 1  เปิดช่อง YouTube · รอ 15s'],
  ['ok', 'ขั้นที่ 2  เข้าดิสคอร์ด · ตรวจสมาชิกจริง'],
  ['ok', 'ตรวจ captcha ผ่าน'],
  ['info', 'claim --key'],
  ['ok', 'FLEX-7KQ2M9X-A4R8T  · หมดอายุใน 24 ชม.'],
];
const IC = { ok: '✓', info: '$' };
export default function TermDemo() {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(x => (x >= LINES.length + 4 ? 0 : x + 1)), 700); return () => clearInterval(t); }, []);
  return (
    <div className="term" data-par>
      <div className="term-bar"><i /><i /><i /><span>keygate</span></div>
      <div className="term-body">
        {LINES.slice(0, n).map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, animation: 'ln .35s' }}>
            <span style={{ color: l[0] === 'ok' ? 'var(--ok)' : 'var(--dim)', width: 14 }}>{IC[l[0]]}</span><span>{l[1]}</span>
          </div>
        ))}
        {n < LINES.length && <span className="caret" />}
      </div>
    </div>
  );
}
