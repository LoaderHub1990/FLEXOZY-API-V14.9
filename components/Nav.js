'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Door, Menu, Discord } from './Icons';
const LINKS = [['/', 'หน้าหลัก'], ['/slip-check', 'เช็คสลิป'], ['/slip-create', 'สร้างสลิป'], ['/dashboard', 'แดชบอร์ด']];
export default function Nav() {
  const path = usePathname();
  const [me, setMe] = useState(undefined);
  const [st, setSt] = useState(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    let dead = false;
    fetch('/api/me').then((r) => r.json()).then((j) => !dead && setMe(j.data || null)).catch(() => !dead && setMe(null));
    const tick = () => fetch('/api/stats').then((r) => r.json()).then((j) => !dead && j.data && setSt(j.data)).catch(() => {});
    tick(); const t = setInterval(tick, 20000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && (setOpen(false), setMenu(false)); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  async function logout() { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {} location.href = '/'; }
  const on = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <>
      <header className="nav">
        <Link href="/" className="brand"><img src="/logo.png" alt="" width="34" height="34" /><span>FLEXOZY</span></Link>
        <nav className={'menu' + (menu ? ' open' : '')}>
          {LINKS.map(([h, t]) => <Link key={h} href={h} className={on(h) ? 'on' : ''}>{t}</Link>)}
        </nav>
        <div className="right">
          <div className="stats">
            <span><i className="dot" />ออนไลน์ <b>{st ? st.active : '–'}</b></span>
            <span>ผู้ใช้ API <b>{st ? st.creators : '–'}</b></span>
          </div>
          {me === undefined ? <span className="skel" /> : me ? (
            <button className="me" onClick={() => setOpen(true)} aria-label="โปรไฟล์">
              <span className="av sm"><img src={me.avatar} alt="" />{me.decoration && <img className="deco" src={me.decoration} alt="" />}</span>
              <span className="nm">{me.name}</span>
            </button>
          ) : <a className="btn primary" href="/api/auth/discord"><Discord />เข้าสู่ระบบ</a>}
        </div>
        <button className="burger" onClick={() => setMenu(!menu)} aria-label="เมนู"><Menu /></button>
      </header>
      {open && me && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="prof" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="โปรไฟล์">
            <div className="banner" style={{ background: me.banner ? `center/cover url(${me.banner})` : me.color || '#111' }} />
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
