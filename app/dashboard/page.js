'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Copy from '@/components/Copy';
import LoginGate from '@/components/LoginGate';
import { Eye, EyeOff, Refresh } from '@/components/Icons';

const ERR = {
  config: 'ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในเซิร์ฟเวอร์',
  cancel: 'ยกเลิกการเข้าสู่ระบบ',
  state: 'ล็อกอินหมดเวลา ลองกดเข้าสู่ระบบใหม่อีกครั้ง',
  token: 'Discord ไม่ยอมรับการล็อกอิน ตรวจ Client Secret และ Redirect URL',
  user: 'ดึงข้อมูลผู้ใช้จาก Discord ไม่ได้',
};
export default function Dashboard() {
  const [me, setMe] = useState(undefined);
  const [key, setKey] = useState(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState('');
  const [loginErr, setLoginErr] = useState('');
  useEffect(() => {
    const e = new URLSearchParams(location.search).get('err');
    if (e) { setLoginErr(ERR[e] || 'เข้าสู่ระบบไม่สำเร็จ'); history.replaceState(null, '', '/dashboard'); }
    fetch('/api/me').then((r) => r.json()).then((j) => { setMe(j.data || null); setKey(j.data?.apiKey || null); }).catch(() => setMe(null));
  }, []);
  async function make() {
    setAsk(false); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/key', { method: 'POST' }); const j = await r.json();
      if (j.ok) { setKey(j.data.apiKey); setShow(true); } else setErr(j.error || 'สร้างไม่สำเร็จ');
    } catch { setErr('เชื่อมต่อไม่ได้'); }
    setBusy(false);
  }
  if (me === undefined) return <main className="wrap narrow"><div className="busy"><div className="spin" /></div></main>;
  if (!me) return (
    <main className="wrap narrow">
      <div className="head center"><h1>เข้าสู่ระบบ</h1></div>
      {loginErr && <div className="err" style={{ marginBottom: 16 }}>{loginErr}</div>}
      <LoginGate text="ล็อกอินด้วย Discord เพื่อสร้าง API Key" />
    </main>
  );
  const mk = (k) => `curl -X POST https://flexozy.site/api/v1/slip/check \\\n  -H "x-api-key: ${k}" \\\n  -F "image=@slip.jpg"`;
  const sample = mk(key || 'fx_xxxxxxxx');
  const shownSample = mk(key ? (show ? key : key.slice(0, 7) + '••••••••••••••••') : 'fx_xxxxxxxx');
  return (
    <main className="wrap narrow">
      <div className="me-head rv">
        <span className="av md"><img src={me.avatar} alt="" />{me.decoration && <img className="deco" src={me.decoration} alt="" />}</span>
        <div><h1>{me.name}</h1><p className="mono dim">@{me.username}</p></div>
      </div>
      <div style={{ display: 'grid', gap: 22 }}>
        <div className="panel rv">
          <div className="ph"><h3>API Key</h3>{key && <span className="ok-t mono" style={{ fontSize: 13 }}>พร้อมใช้งาน</span>}</div>
          {key ? (
            <div className="keyrow">
              <code className={'mono keybox' + (show ? '' : ' hide')}>{key}</code>
              <button className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'ซ่อนคีย์' : 'แสดงคีย์'}>{show ? <EyeOff /> : <Eye />}</button>
              <Copy text={key} />
            </div>
          ) : <p className="dim" style={{ margin: 0 }}>ยังไม่มี API Key กดปุ่มด้านล่างเพื่อสร้าง</p>}
          {err && <div className="err" key={err}>{err}</div>}
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => (key ? setAsk(true) : make())} disabled={busy}>
            {busy ? <><span className="spin" />กำลังสร้าง</> : key ? <><Refresh />สร้างคีย์ใหม่</> : 'สร้าง API Key'}
          </button>
        </div>
        {key && (
          <div className="panel rv">
            <div className="ph"><h3>ลองเรียกใช้</h3><Copy text={sample} small /></div>
            <pre className="code codebox">{shownSample}</pre>
          </div>
        )}
        <div className="qlinks rv">
          <Link className="btn lg" href="/slip-check">ทดสอบเช็คสลิป</Link>
          <Link className="btn lg" href="/slip-create">ทดสอบสร้างสลิป</Link>
        </div>
      </div>
      {ask && (
        <div className="modal" onClick={() => setAsk(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3>สร้างคีย์ใหม่?</h3>
            <p>คีย์เดิมจะใช้ไม่ได้ทันที</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" style={{ flex: 'none' }} onClick={() => setAsk(false)}>ยกเลิก</button>
              <button className="btn primary" style={{ flex: 'none' }} onClick={make}>สร้างคีย์ใหม่</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
