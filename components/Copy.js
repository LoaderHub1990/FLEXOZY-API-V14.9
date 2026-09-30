'use client';
import { useState } from 'react';
export default function Copy({ text, small, label = 'คัดลอก' }) {
  const [done, setDone] = useState(false);
  async function go() {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
    setDone(true); setTimeout(() => setDone(false), 1400);
  }
  return <button type="button" className={'btn ghost' + (small ? ' sm' : '')} onClick={go}>{done ? 'คัดลอกแล้ว ✓' : label}</button>;
}
