'use client';
import { useEffect, useState } from 'react';
// ตัวทดสอบ API ในหน้าเว็บ (ใช้ session ที่ล็อกอินอยู่)
export default function Tester({ endpoint, fields, example }) {
  const [me, setMe] = useState(undefined);
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.def ?? ''])));
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/me').then((r) => r.json()).then((j) => setMe(j.data || null)).catch(() => setMe(null)); }, []);
  async function run(e) {
    e.preventDefault(); setBusy(true); setOut('');
    const body = {};
    for (const f of fields) { const x = v[f.name]; if (f.file) { if (x) body[f.name] = x; continue; } if (x === '' || x == null) continue; body[f.name] = f.num ? Number(x) : x === 'true' ? true : x === 'false' ? false : x; }
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { ok: false, error: 'HTTP ' + r.status } }
      setOut(JSON.stringify(j, null, 2));
    } catch (er) { setOut(JSON.stringify({ ok: false, error: String(er) }, null, 2)); }
    setBusy(false);
  }
  return (
    <form className="panel" onSubmit={run}>
      <h3>ทดลองยิง API</h3>
      {me === null && <p className="warn">ต้อง <a href="/api/auth/discord">เข้าสู่ระบบด้วย Discord</a> ก่อนจึงจะทดลองได้</p>}
      {fields.map((f) => (
        <label key={f.name}><span>{f.label}</span>
          {f.file ? (
            <input type="file" accept="image/png,image/jpeg" onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return setV({ ...v, [f.name]: '' });
              if (file.size > 4e6) { alert('ไฟล์ใหญ่เกิน 4MB'); e.target.value = ''; return; }
              const r = new FileReader(); r.onload = () => setV((o) => ({ ...o, [f.name]: String(r.result) })); r.readAsDataURL(file);
            }} />
          ) : f.options ? (
            <select value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}>{f.options.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
          ) : f.area ? (
            <textarea rows={4} value={v[f.name]} placeholder={f.ph} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
          ) : (
            <input value={v[f.name]} placeholder={f.ph} inputMode={f.num ? 'decimal' : undefined} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
          )}
        </label>
      ))}
      <button className="btn primary" disabled={busy || !me}>{busy ? 'กำลังส่ง…' : 'ส่งคำขอ'}</button>
      {out && <pre className="code">{out}</pre>}
    </form>
  );
}
