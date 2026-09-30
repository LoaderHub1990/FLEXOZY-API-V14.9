'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
const Door = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>);
export default function Nav() {
  const [me, setMe] = useState(undefined);
  const [st, setSt] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let dead = false;
    fetch('/api/me').then((r) => r.json()).then((j) => !dead && setMe(j.data || null)).catch(() => !dead && setMe(null));
    const tick = () => fetch('/api/stats').then((r) => r.json()).then((j) => !dead && j.data && setSt(j.data)).catch(() => {});
    tick(); const t = setInterval(tick, 20000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  async function logout() { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {} location.href = '/'; }
  return (
    <>
      <header className="nav">
        <Link href="/" className="brand"><img src="/logo.png" alt="Flexozy" width="34" height="34" /><span>FLEXOZY</span></Link>
        <nav className="menu">
          <Link href="/">หน้าหลัก</Link>
          <Link href="/slip-check">API เช็คสลิป</Link>
          <Link href="/slip-create">API สร้างสลิป</Link>
          <Link href="/dashboard">แดชบอร์ด</Link>
        </nav>
        <div className="right">
          <div className="stats" title="อัปเดตทุก 20 วินาที">
            <span><i className="dot" />กำลังใช้งาน <b>{st ? st.active : '–'}</b></span>
            <span>สร้าง API แล้ว <b>{st ? st.creators : '–'}</b> คน</span>
          </div>
          {me === undefined ? <span className="skel" /> : me ? (
            <button className="me" onClick={() => setOpen(true)} aria-label="โปรไฟล์">
              <span className="av sm"><img src={me.avatar} alt="" />{me.decoration && <img className="deco" src={me.decoration} alt="" />}</span>
              <span className="nm">{me.name}</span>
            </button>
          ) : <a className="btn primary" href="/api/auth/discord">เข้าสู่ระบบด้วย Discord</a>}
        </div>
      </header>
      {open && me && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="prof" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="โปรไฟล์">
            <div className="banner" style={{ background: me.banner ? `center/cover url(${me.banner})` : me.color || 'linear-gradient(120deg,#1d4ed8,#38bdf8)' }} />
            <button className="exit" onClick={logout} title="ออกจากระบบ" aria-label="ออกจากระบบ"><Door /></button>
            <div className="av lg"><img src={me.avatar} alt="" />{me.decoration && <img className="deco" src={me.decoration} alt="" />}</div>
            <div className="pbody">
              <h3>{me.name}</h3>
              <p className="mono dim">@{me.username}</p>
              <div className="pcard"><small>Discord ID</small><span className="mono">{me.id}</span></div>
              <div className="pcard"><small>API Key</small><span className="mono">{me.apiKey ? me.apiKey.slice(0, 7) + '••••••••' : 'ยังไม่ได้สร้าง'}</span></div>
              <Link href="/dashboard" className="btn primary block" onClick={() => setOpen(false)}>ไปที่แดชบอร์ด</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
