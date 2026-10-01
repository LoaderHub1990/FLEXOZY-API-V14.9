'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Door, Menu, Discord, Crown } from './Icons';
import { useApp } from './AppProvider';
import { resolveMedia } from '@/lib/theme';

export default function Nav() {
  const path = usePathname();
  const { me, site, api } = useApp();
  const [st, setSt] = useState(null), [open, setOpen] = useState(false), [menu, setMenu] = useState(false);
  useEffect(() => {
    let dead = false;
    const tick = () => api('stats').then(j => !dead && !j.dbError && setSt(j));
    tick(); const t = setInterval(tick, 25000);
    return () => { dead = true; clearInterval(t); };
  }, [api, me?.user?.id]);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => { const k = e => e.key === 'Escape' && (setOpen(false), setMenu(false)); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  async function logout() { await api('auth/logout', {}); location.href = '/'; }
  const u = me?.user, logo = resolveMedia('_site', site.theme, site.imgv).logo || '/logo.png';
  const LINKS = [['/', 'หน้าหลัก'], ['/create', 'สร้างหน้าแจกคีย์'], ['/getkey', 'ตัวอย่าง', true], ...(me?.admin ? [['/admin', 'แอดมิน']] : [])];
  const on = h => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <>
      {site.announce?.on && site.announce.text && (
        site.announce.link ? <a className="ann" href={site.announce.link} target="_blank" rel="noreferrer">{site.announce.text} ↗</a> : <div className="ann">{site.announce.text}</div>
      )}
      <header className="nav">
        <Link href="/" className="brand"><img src={logo} alt="" width="34" height="34" /><span>{site.name.toUpperCase()}</span></Link>
        <nav className={'menu' + (menu ? ' open' : '')}>
          {LINKS.map(([h, t, hard]) => hard ? <a key={h} href={h} className={on(h) ? 'on' : ''}>{t}</a> : <Link key={h} href={h} className={on(h) ? 'on' : ''}>{t}</Link>)}
          {site.discord && <a href={site.discord} target="_blank" rel="noreferrer">Discord ↗</a>}
        </nav>
        <div className="right">
          <div className="stats">
            <span><i className="dot" />ออนไลน์ <b>{st ? st.active : '–'}</b></span>
            <span>หน้าแจกคีย์ <b>{st ? st.pages : '–'}</b></span>
          </div>
          {me === undefined ? <span className="skel" /> : u ? (
            <button className="me" onClick={() => setOpen(true)} aria-label="โปรไฟล์">
              <span className="av sm"><img src={u.avatar} alt="" />{u.decoration && <img className="deco" src={u.decoration} alt="" />}</span>
              <span className="nm">{u.name}</span>
            </button>
          ) : <a className="btn primary" href="/api/auth/discord"><Discord />เข้าสู่ระบบ</a>}
        </div>
        <button className="burger" onClick={() => setMenu(!menu)} aria-label="เมนู"><Menu /></button>
      </header>
      {open && u && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="prof" onClick={e => e.stopPropagation()} role="dialog" aria-label="โปรไฟล์">
            <div className="banner" style={{ background: u.banner ? `center/cover url(${u.banner})` : u.color || '#111' }} />
            <button className="exit" onClick={logout} title="ออกจากระบบ" aria-label="ออกจากระบบ"><Door /></button>
            <div className="av lg"><img src={u.avatar} alt="" />{u.decoration && <img className="deco" src={u.decoration} alt="" />}</div>
            <div className="pbody">
              <h3>{u.name} {me.admin && <span className="badge"><Crown /> ADMIN</span>}</h3>
              <p className="mono dim">@{u.username}</p>
              <div className="pcard"><small>Discord ID</small><span className="mono">{u.id}</span></div>
              <div className="pcard"><small>สิทธิ์</small><span>{me.admin ? 'แอดมิน' : me.creator ? 'ผู้สร้างหน้า' : 'สมาชิก'}</span></div>
              {me.creator && <div className="pcard"><small>หน้าของคุณ</small><a className="mono" href={'/getkey/' + me.creator.slug}>/getkey/{me.creator.slug}</a></div>}
              <Link href="/create" className="btn primary block" onClick={() => setOpen(false)}>{me.creator ? 'จัดการหน้าของฉัน' : 'ไปที่แผงสร้างหน้า'}</Link>
              {me.admin && <Link href="/admin" className="btn block" onClick={() => setOpen(false)}>แผงแอดมิน</Link>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
