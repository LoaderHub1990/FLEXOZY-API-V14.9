'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import useMe from './useMe';
import LoginGate from './LoginGate';
import LogView from './LogView';
import { Upload, Scan } from './Icons';
import { sampleSlipPayload } from '@/lib/promptpay';

const VERDICT = {
  ok: ['✓', 'สลิปผ่านการตรวจ', 'ไม่พบสิ่งผิดปกติ'],
  duplicate: ['!', 'สลิปซ้ำ', 'สลิปนี้เคยถูกเช็คแล้ว'],
  suspicious: ['!', 'น่าสงสัย', 'พบสัญญาณผิดปกติหลายอย่าง'],
  invalid: ['✕', 'สลิปไม่ถูกต้อง', 'ตรวจต่อไม่ได้'],
};
const MK = { pass: '✓', fail: '✕', warn: '!', skip: '–' };

async function makeSampleImage() {
  const payload = sampleSlipPayload();
  const qr = await QRCode.toCanvas(document.createElement('canvas'), payload, { margin: 1, width: 420, errorCorrectionLevel: 'M' });
  const c = document.createElement('canvas'); c.width = 720; c.height = 900;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 720, 900);
  x.fillStyle = '#111'; x.font = '700 40px sans-serif'; x.textAlign = 'center'; x.fillText('สลิปตัวอย่าง', 360, 110);
  x.font = '28px sans-serif'; x.fillStyle = '#555'; x.fillText('SAMPLE TRANSFER SLIP', 360, 160);
  x.drawImage(qr, 150, 230, 420, 420);
  x.font = '22px monospace'; x.fillStyle = '#333'; x.fillText(payload.slice(24, 44), 360, 720);
  return c.toDataURL('image/png');
}

export default function CheckTester() {
  const me = useMe();
  const [img, setImg] = useState('');
  const [payload, setPayload] = useState('');
  const [showPayload, setShowPayload] = useState(false);
  const [amount, setAmount] = useState('');
  const [register, setRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [raw, setRaw] = useState(false);
  const [over, setOver] = useState(false);
  const out = useRef(null);

  function readFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setErr('รองรับเฉพาะไฟล์ PNG หรือ JPG');
    if (file.size > 4e6) return setErr('ไฟล์ใหญ่เกิน 4MB');
    setErr('');
    const r = new FileReader(); r.onload = () => { setImg(String(r.result)); setRes(null); }; r.readAsDataURL(file);
  }
  async function sample() { setErr(''); setRes(null); setPayload(''); setImg(await makeSampleImage()); }
  async function run(e) {
    e?.preventDefault();
    if (!img && !payload.trim()) return setErr('เลือกรูปสลิปหรือวาง payload ก่อน');
    setBusy(true); setErr(''); setRes(null);
    const t0 = Date.now();
    try {
      const body = { register };
      if (img) body.image = img;
      if (payload.trim()) body.payload = payload.trim();
      if (amount.trim()) body.amount = Number(amount);
      const r = await fetch('/api/v1/slip/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (!j || !j.ok) { setErr(j?.error || 'เกิดข้อผิดพลาด HTTP ' + r.status); }
      else {
        await new Promise((ok) => setTimeout(ok, Math.max(0, 700 - (Date.now() - t0))));
        setRes(j.data); setTimeout(() => out.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      }
    } catch { setErr('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    setBusy(false);
  }
  useEffect(() => {
    const el = document.querySelector('.meter i');
    if (el && res) requestAnimationFrame(() => { el.style.width = res.risk + '%'; });
  }, [res]);

  if (me === undefined) return <div className="busy"><div className="spin" /></div>;
  if (!me) return <LoginGate text="เข้าสู่ระบบด้วย Discord เพื่อทดสอบเช็คสลิป" />;
  const v = res && VERDICT[res.status];
  const passN = res ? res.checks.filter((c) => c.status === 'pass').length : 0;
  const doneN = res ? res.checks.filter((c) => c.status !== 'skip').length : 0;
  return (
    <div className="grid2">
      <form className="panel" onSubmit={run}>
        <div className="ph"><h3>ส่งสลิปเข้าตรวจ</h3><button type="button" className="btn sm" onClick={sample}>สร้างสลิปตัวอย่าง</button></div>
        <label className={'drop' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files?.[0]); }}>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => readFile(e.target.files?.[0])} />
          {img ? <img src={img} alt="สลิป" /> : <div><div className="ico"><Upload /></div><p>ลากรูปสลิปมาวาง หรือกดเพื่อเลือกไฟล์</p></div>}
        </label>
        {img && <button type="button" className="btn sm" onClick={() => { setImg(''); setRes(null); }}>ล้างรูป</button>}
        <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowPayload(!showPayload)}>{showPayload ? 'ซ่อน payload' : 'ใช้ payload จาก QR แทน'}</button>
        {showPayload && <textarea rows={3} value={payload} placeholder="0041000600000101030140220..." onChange={(e) => setPayload(e.target.value)} />}
        <label>ยอดเงินที่ต้องการยืนยัน (บาท)<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="ไม่ใส่ก็ได้" /></label>
        <label className="sw"><input type="checkbox" checked={register} onChange={(e) => setRegister(e.target.checked)} /><i />บันทึกสลิปนี้ว่าใช้แล้ว</label>
        {err && <div className="err" key={err}>{err}</div>}
        <button className="btn primary lg" disabled={busy}>{busy ? <><span className="spin" />กำลังตรวจ</> : <><Scan />ตรวจสลิป</>}</button>
      </form>
      <div ref={out} style={{ display: 'grid', gap: 16 }}>
        {busy ? (
          <div className="busy"><div className="scan" /><span>กำลังตรวจสลิป…</span></div>
        ) : !res ? (
          <div className="empty"><div className="ico"><Scan /></div>ผลการตรวจจะแสดงตรงนี้</div>
        ) : (
          <>
            <div className={'verdict ' + res.status}>
              <div className="big-ic">{v[0]}</div>
              <div><h3>{v[1]}</h3><p>{v[2]} · ผ่าน {passN} จาก {doneN} รายการ</p></div>
            </div>
            <div><div className="meta"><span>ความเสี่ยง</span><b>{res.risk}/100</b></div><div className="meter"><i /></div></div>
            <ul className="chk">
              {res.checks.map((c, i) => (
                <li key={c.id} style={{ '--i': i }}><span className={'mk ' + c.status}>{MK[c.status]}</span><span className="t">{c.label}</span><small>{c.detail}</small></li>
              ))}
            </ul>
            <LogView lines={res.log} title="log การตรวจ" />
            <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRaw(!raw)}>{raw ? 'ซ่อน JSON' : 'ดู JSON ดิบ'}</button>
            {raw && <pre className="code codebox">{JSON.stringify(res, null, 2)}</pre>}
          </>
        )}
      </div>
    </div>
  );
}
