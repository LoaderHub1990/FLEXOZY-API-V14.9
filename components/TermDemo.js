'use client';
import { useEffect, useState } from 'react';
const LINES = [
  ['info', 'POST /api/v1/slip/check'],
  ['ok', 'อ่านรูปสำเร็จ 828×1792px'],
  ['ok', 'พบ QR บนสลิป'],
  ['ok', 'CRC ถูกต้อง'],
  ['ok', 'ธนาคารต้นทาง KBANK'],
  ['ok', 'ยังไม่เคยเช็คเลขอ้างอิงนี้'],
  ['ok', 'ไม่พบร่องรอยโปรแกรมแต่งรูป'],
  ['ok', 'สรุป: ok · ความเสี่ยง 0/100'],
];
const IC = { ok: '✓', info: '$' };
const CL = { ok: 'var(--ok)', info: 'var(--dim)' };
export default function TermDemo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= LINES.length + 4 ? 0 : x + 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="term" data-par>
      <div className="term-bar"><i /><i /><i /><span>slip-check</span></div>
      <div className="term-body">
        {LINES.slice(0, n).map((l, i) => (
          <div key={i} className="ll" style={{ '--i': 0, display: 'flex', gap: 10, opacity: 1, animation: 'ln .35s' }}>
            <span style={{ color: CL[l[0]], width: 14 }}>{IC[l[0]]}</span><span>{l[1]}</span>
          </div>
        ))}
        {n < LINES.length && <span className="caret" />}
      </div>
    </div>
  );
}
