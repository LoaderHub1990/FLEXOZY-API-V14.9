'use client';
import { useState } from 'react';
import QRCode from 'qrcode';
import useMe from './useMe';
import LoginGate from './LoginGate';
import LogView from './LogView';
import Copy from './Copy';
import { Download } from './Icons';

const TYPES = [['phone', 'เบอร์โทร'], ['national_id', 'บัตร ปชช.'], ['ewallet', 'e-Wallet'], ['bank_account', 'เลขบัญชี']];
const PH = { phone: '0812345678', national_id: '1101700230703', ewallet: '123456789012345', bank_account: '1234567890' };
const BANKS = ['กสิกรไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'กรุงไทย', 'ทหารไทยธนชาต', 'กรุงศรีอยุธยา', 'ออมสิน', 'ธ.ก.ส.', 'อาคารสงเคราะห์', 'ยูโอบี', 'ซีไอเอ็มบี ไทย', 'ทิสโก้', 'เกียรตินาคินภัทร'];

function validate(type, target, bank, amount) {
  const t = target.replace(/[\s-]/g, '');
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return 'ใส่จำนวนเงินให้ถูกต้อง';
  if (Math.abs(a * 100 - Math.round(a * 100)) > 1e-6) return 'จำนวนเงินทศนิยมไม่เกิน 2 ตำแหน่ง';
  if (type === 'phone' && !/^0\d{9}$/.test(t)) return 'เบอร์โทรต้องเป็น 10 หลักขึ้นต้นด้วย 0';
  if (type === 'national_id' && !/^\d{13}$/.test(t)) return 'เลขบัตรประชาชนต้องเป็น 13 หลัก';
  if (type === 'ewallet' && !/^\d{15}$/.test(t)) return 'e-Wallet ID ต้องเป็นตัวเลข 15 หลัก';
  if (type === 'bank_account') { if (!/^\d{10,15}$/.test(t)) return 'เลขบัญชีต้องเป็นตัวเลข 10-15 หลัก'; if (!bank) return 'เลือกธนาคาร'; }
  return '';
}

export default function CreateTester() {
  const me = useMe();
  const [type, setType] = useState('phone');
  const [target, setTarget] = useState('');
  const [bank, setBank] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [out, setOut] = useState(null); // { data, qrPay, qrLink, log }
  const [qtab, setQtab] = useState('pay');

  async function run(e) {
    e.preventDefault();
    const m = validate(type, target, bank, amount);
    if (m) return setErr(m);
    setErr(''); setBusy(true); setOut(null);
    const t0 = Date.now(); const log = [];
    const say = (level, msg) => log.push({ ms: Date.now() - t0, level, msg });
    say('ok', 'ตรวจข้อมูลที่กรอกผ่าน');
    say('info', `ส่ง POST /api/v1/slip/create (${TYPES.find((x) => x[0] === type)[1]}, ฿${Number(amount).toFixed(2)})`);
    try {
      const body = { type, target: target.replace(/[\s-]/g, ''), amount: Number(amount) };
      if (bank && type === 'bank_account') body.bank = bank;
      if (name.trim()) body.name = name.trim();
      const r = await fetch('/api/v1/slip/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (!j || !j.ok) { say('error', j?.error || 'HTTP ' + r.status); setErr(j?.error || 'สร้างไม่สำเร็จ HTTP ' + r.status); setBusy(false); return; }
      const d = j.data;
      say('ok', `เซิร์ฟเวอร์ตอบ ${r.status} สร้างรหัส ${d.code}`);
      const opt = { margin: 1, width: 460, errorCorrectionLevel: 'M' };
      const qrLink = await QRCode.toDataURL(d.link, opt);
      let qrPay = null;
      if (d.qrPayload) { qrPay = await QRCode.toDataURL(d.qrPayload, opt); say('ok', 'สร้าง QR พร้อมเพย์ (ยอดถูกฝังใน QR แล้ว)'); }
      else say('info', 'เลขบัญชีไม่มี QR พร้อมเพย์ ใช้ QR ลิงก์แทน');
      say('ok', 'สร้าง QR ลิงก์ชำระเงิน');
      say('ok', 'เสร็จสิ้น');
      setQtab(qrPay ? 'pay' : 'link');
      setOut({ data: d, qrPay, qrLink, log });
    } catch (er) { say('error', String(er?.message || er)); setErr('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    setBusy(false);
  }

  if (me === undefined) return <div className="busy"><div className="spin" /></div>;
  if (!me) return <LoginGate text="เข้าสู่ระบบด้วย Discord เพื่อทดสอบสร้างสลิป" />;
  const d = out?.data;
  const shown = out && (qtab === 'pay' && out.qrPay ? out.qrPay : out.qrLink);
  return (
    <div className="grid2">
      <form className="panel" onSubmit={run}>
        <h3>ข้อมูลผู้รับเงิน</h3>
        <div className="seg" role="tablist">{TYPES.map(([k, l]) => <button type="button" key={k} className={type === k ? 'on' : ''} onClick={() => { setType(k); setErr(''); }}>{l}</button>)}</div>
        <label>{TYPES.find((x) => x[0] === type)[1]}<input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={PH[type]} inputMode="numeric" /></label>
        {type === 'bank_account' && <label>ธนาคาร<select value={bank} onChange={(e) => setBank(e.target.value)}><option value="">เลือกธนาคาร</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></label>}
        <label>ชื่อบัญชี<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ไม่ใส่ก็ได้" /></label>
        <label>จำนวนเงิน (บาท)<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="100" /></label>
        <div className="chips">{[50, 100, 500, 1000].map((n) => <button type="button" key={n} onClick={() => setAmount(String(n))}>฿{n}</button>)}</div>
        {err && <div className="err" key={err}>{err}</div>}
        <button className="btn primary lg" disabled={busy}>{busy ? <><span className="spin" />กำลังสร้าง</> : 'สร้างสลิป'}</button>
      </form>
      <div style={{ display: 'grid', gap: 16 }}>
        {busy ? <div className="busy"><div className="scan" /><span>กำลังสร้างสลิปและ QR…</span></div>
          : !out ? <div className="empty">สลิปและ QR จะแสดงตรงนี้</div>
          : (
            <>
              <div className="slip">
                <div className="slip-top"><img src="/logo.png" alt="" width="30" height="30" /><span>คำขอชำระเงิน</span></div>
                <div className="slip-amt"><small>จำนวนเงิน</small><b>฿{d.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></div>
                {out.qrPay && (
                  <div className="tabbar" style={{ display: 'flex', margin: '0 auto 16px', width: 'fit-content' }}>
                    <button className={qtab === 'pay' ? 'on' : ''} style={qtab === 'pay' ? { background: '#fff' } : null} onClick={() => setQtab('pay')} type="button">QR พร้อมเพย์</button>
                    <button className={qtab === 'link' ? 'on' : ''} style={qtab === 'link' ? { background: '#fff' } : null} onClick={() => setQtab('link')} type="button">QR ลิงก์</button>
                  </div>
                )}
                <div className="qr" key={qtab}><img src={shown} alt="QR" /></div>
                <dl className="kv">
                  <dt>รหัส</dt><dd className="mono">{d.code}</dd>
                  <dt>ปลายทาง</dt><dd className="mono">{d.target}</dd>
                  <dt>ลิงก์</dt><dd className="mono" style={{ fontSize: 12 }}>{d.link}</dd>
                </dl>
                <div className="row" style={{ marginTop: 18 }}>
                  <a className="btn" href={d.link} target="_blank" rel="noreferrer">เปิดหน้าชำระเงิน</a>
                  <Copy text={d.link} label="คัดลอกลิงก์" />
                  <a className="btn" href={shown} download={`flexozy-${d.id}.png`}><Download />ดาวน์โหลด QR</a>
                </div>
              </div>
              <LogView lines={out.log} title="log การสร้าง" />
            </>
          )}
      </div>
    </div>
  );
}
