'use client';
import { useRef, useState, useEffect } from 'react';
import CopyButton from '../../../../components/CopyButton';
import { API_URL } from '../../../../lib/config';

const stamp = () => new Date().toLocaleTimeString('th-TH', { hour12: false });

export default function Deobfuscate() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [output, setOutput] = useState('');
  const [logs, setLogs] = useState([{ k: 'sys', m: 'พร้อมใช้งาน — วางโค้ดหรือแนบไฟล์แล้วกด "เริ่มเกะ"', t: stamp() }]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const logRef = useRef(null);
  const add = (m, k = 'log') => setLogs((l) => [...l, { k, m, t: stamp() }]);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [logs]);

  async function load(file) {
    if (!file) return;
    setCode(await file.text()); setName(file.name);
    add(`แนบไฟล์: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'sys');
  }

  async function run() {
    if (!code.trim() || busy) return;
    setBusy(true); setOutput(''); add('ส่งโค้ดไปยัง API...', 'sys');
    try {
      const res = await fetch(API_URL.replace('https://flexozy.site', ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      const handle = (line) => {
        if (!line.trim()) return;
        const o = JSON.parse(line);
        if (o.t === 'log') add(o.m);
        else if (o.t === 'result') { setOutput(o.code); add(`สำเร็จ ✓ (${o.code.length} ตัวอักษร)`, 'ok'); }
        else if (o.t === 'error') add(o.m, 'err');
      };
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n'); buf = parts.pop();
        parts.forEach(handle);
      }
      handle(buf);
    } catch (e) { add(`ผิดพลาด: ${e.message}`, 'err'); }
    setBusy(false);
  }

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([output], { type: 'text/plain' }));
    a.download = (name ? name.replace(/\.[^.]+$/, '') : 'result') + '.deobf.lua';
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <main className="wrap">
      <div className="fade">
        <span className="badge">LURAPH V15</span>
        <h1 className="h1s">เครื่องมือเกะสคริปต์</h1>
        <p className="muted">วางโค้ดหรือแนบไฟล์ .lua / .luau / .txt แล้วดูผลลัพธ์และ log ด้านล่าง</p>
      </div>

      <div className="split fade">
        <section className="card static panel">
          <div className="phead"><b>① โค้ดต้นฉบับ</b>
            <div className="row">
              <label className="btn sm">แนบไฟล์<input type="file" hidden accept=".lua,.luau,.txt" onChange={(e) => load(e.target.files[0])} /></label>
              <button className="btn sm" onClick={() => { setCode(''); setName(''); }}>ล้าง</button>
            </div>
          </div>
          <div className={`drop ${drag ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
              placeholder="วางโค้ดที่ถูก obfuscate ที่นี่ หรือลากไฟล์มาวาง..." />
          </div>
          <div className="pfoot"><span className="muted">{name || 'ไม่มีไฟล์'} · {code.length.toLocaleString()} ตัวอักษร</span>
            <button className="btn primary" disabled={busy || !code.trim()} onClick={run}>{busy ? 'กำลังประมวลผล…' : 'เริ่มเกะ →'}</button>
          </div>
        </section>

        <section className="card static panel">
          <div className="phead"><b>② ผลลัพธ์</b>
            <div className="row"><CopyButton text={output} className="sm" /><button className="btn sm" disabled={!output} onClick={download}>ดาวน์โหลด</button></div>
          </div>
          <textarea readOnly value={output} spellCheck={false} placeholder="ผลลัพธ์จะแสดงที่นี่" />
          <div className="pfoot"><span className="muted">{output ? `${output.length.toLocaleString()} ตัวอักษร` : 'ยังไม่มีผลลัพธ์'}</span></div>
        </section>
      </div>

      <section className="card static fade mt">
        <div className="phead"><b>③ Log</b><button className="btn sm" onClick={() => setLogs([])}>ล้าง log</button></div>
        <div className="log" ref={logRef}>
          {logs.map((l, i) => <div key={i} className={`ln ${l.k}`}><i>{l.t}</i>{l.m}</div>)}
          {busy && <div className="ln sys"><i>{stamp()}</i>กำลังทำงาน<span className="dots" /></div>}
        </div>
      </section>
    </main>
  );
}
