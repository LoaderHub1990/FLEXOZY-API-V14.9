'use client';
import { useState } from 'react';
export default function CopyButton({ text, label = 'คัดลอก', className = '' }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={`btn ${className}`} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {}
    }}>{ok ? '✓ คัดลอกแล้ว' : label}</button>
  );
}
