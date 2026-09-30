'use client';
import { useEffect, useState } from 'react';
import Copy from '@/components/Copy';
export default function Dashboard() {
  const [me, setMe] = useState(undefined);
  const [key, setKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { fetch('/api/me').then((r) => r.json()).then((j) => { setMe(j.data || null); setKey(j.data?.apiKey || null); }).catch(() => setMe(null)); }, []);
  async function make() {
    if (key && !confirm('สร้างคีย์ใหม่แล้วคีย์เดิมจะใช้ไม่ได้ทันที ต้องการต่อหรือไม่?')) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/key', { method: 'POST' }); const j = await r.json();
      if (j.ok) setKey(j.data.apiKey); else setErr(j.error || 'สร้างไม่สำเร็จ');
    } catch { setErr('เชื่อมต่อไม่ได้'); }
    setBusy(false);
  }
  if (me === undefined) return <main className="wrap"><p className="dim">กำลังโหลด…</p></main>;
  if (!me) return (
    <main className="wrap narrow center">
      <img src="/logo.png" alt="" width="120" height="120" />
      <h1>เข้าสู่ระบบเพื่อสร้าง API</h1>
      <p className="lead">ล็อกอินด้วย Discord แล้วสร้าง API Key ได้ทันที</p>
      <a className="btn primary lg" href="/api/auth/discord">เข้าสู่ระบบด้วย Discord</a>
    </main>
  );
  return (
    <main className="wrap narrow">
      <h1>แดชบอร์ด</h1>
      <p className="lead">สวัสดี {me.name} 👋</p>
      <div className="panel">
        <h3>API Key ของคุณ</h3>
        {key ? (<div className="keyrow"><code className="mono keybox">{key}</code><Copy text={key} /></div>) : <p className="dim">ยังไม่มี API Key</p>}
        {err && <p className="warn">{err}</p>}
        <button className="btn primary" onClick={make} disabled={busy}>{busy ? 'กำลังสร้าง…' : key ? 'สร้างคีย์ใหม่' : 'สร้าง API Key'}</button>
        <p className="hint">ส่งคีย์ผ่าน Header <code>x-api-key</code> — อย่าเปิดเผยคีย์ให้ผู้อื่น</p>
      </div>
    </main>
  );
}
