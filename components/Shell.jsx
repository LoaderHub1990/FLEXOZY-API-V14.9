'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from './Icons';
import { api, baht } from './api';
import { CookieBanner, AnnouncementPopup, DiscordWidget } from './Extras';
import { perfAllowed } from './consent';

const Ctx = createContext(null);
export const useShell = () => useContext(Ctx);

function Modal({ onClose, children, wide }) {
  // วาดผ่าน portal ไปที่ <body> — ถ้าไม่ทำ โมดัลที่เปิดจากในหน้า (เช่นหลังบ้าน) จะติดอยู่ใน <main>
  // ซึ่งมี z-index:1 ทำให้ footer และวิดเจ็ต Discord ทับโมดัลได้
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" style={{ position: 'relative' }}>
        <button className="btn btn-sm x" onClick={onClose} aria-label="ปิด"><Icon n="x" size={16} /></button>
        {children}
      </div>
    </div>,
    document.body
  );
}
export { Modal };

function AuthModal({ mode: m0, onClose }) {
  const router = useRouter();
  const [mode, setMode] = useState(m0);
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', 'POST', f);
      onClose();
      router.refresh();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose}>
      <h3>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h3>
      <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
        {mode === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีเพื่อสั่งซื้อและเติมเงิน'}
      </p>
      <div className="tabs">
        <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>เข้าสู่ระบบ</button>
        <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>สมัครสมาชิก</button>
      </div>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" style={{ marginTop: 0 }}>{mode === 'login' ? 'ชื่อผู้ใช้หรืออีเมล' : 'ชื่อผู้ใช้'}</label>
          <input className="input" autoFocus autoComplete="username" value={f.username} onChange={set('username')} placeholder={mode === 'login' ? 'username / email' : 'a-z 0-9 _ . (3-20 ตัว)'} required />
        </div>
        {mode === 'register' && (
          <div className="field">
            <label className="label" style={{ marginTop: 0 }}>อีเมล</label>
            <input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
        )}
        <div className="field">
          <label className="label" style={{ marginTop: 0 }}>รหัสผ่าน</label>
          <input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} placeholder={mode === 'register' ? 'อย่างน้อย 8 ตัวอักษร' : '••••••••'} required />
        </div>
        {err && <div className="msg err">{err}</div>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={busy}>
          {busy ? <span className="spin" /> : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>
    </Modal>
  );
}

function ContactModal({ onClose, discord }) {
  return (
    <Modal onClose={onClose}>
      <h3>ติดต่อเรา</h3>
      <p className="muted" style={{ margin: '6px 0 18px', fontSize: 14 }}>มีปัญหาการสั่งซื้อหรืออยากสอบถามสินค้า ทักมาได้ที่ Discord ของร้าน</p>
      {discord ? (
        <a className="btn btn-primary" style={{ width: '100%' }} href={discord} target="_blank" rel="noopener noreferrer">เข้า Discord ร้านค้า</a>
      ) : (
        <div className="msg err">ร้านยังไม่ได้ตั้งค่าช่องทางติดต่อ</div>
      )}
    </Modal>
  );
}

function SearchModal({ onClose }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [res, setRes] = useState({ products: [], categories: [] });
  const [sel, setSel] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const key = 'dh_search_cache';
      if (!term && perfAllowed()) {
        try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c) setRes(c); } catch {}
      }
      api('/api/search?q=' + encodeURIComponent(term)).then((r) => {
        setRes(r);
        if (!term && perfAllowed()) { try { sessionStorage.setItem(key, JSON.stringify(r)); } catch {} }
      }).catch(() => {});
      setSel(0);
    }, 180);
    return () => clearTimeout(t);
  }, [term]);
  const list = [
    ...res.categories.map((c) => ({ href: `/store?category=${c.id}`, title: c.name, sub: 'หมวดหมู่' })),
    ...res.products.map((p) => ({ href: `/store/${p.id}`, title: p.name, sub: `${baht(p.price)} ฿ · ${p.category || ''}`, img: p.image })),
  ];
  const go = (it) => { onClose(); router.push(it.href); };
  function key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && list[sel]) go(list[sel]);
  }
  return (
    <Modal onClose={onClose} wide>
      <div style={{ paddingRight: 40 }}>
        <input className="input" autoFocus placeholder="ค้นหาสินค้าหรือหมวดหมู่" value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={key} />
      </div>
      <div style={{ marginTop: 12, maxHeight: '50vh', overflowY: 'auto' }}>
        {list.length === 0 && <div className="muted" style={{ padding: 20, textAlign: 'center' }}>ไม่พบสิ่งที่ค้นหา</div>}
        {list.map((it, i) => (
          <button key={it.href} className={'sr' + (i === sel ? ' sel' : '')} style={{ width: '100%', textAlign: 'left' }} onClick={() => go(it)} onMouseEnter={() => setSel(i)}>
            {it.img ? <img src={it.img} alt="" /> : <span className="stat-ic" style={{ width: 44, height: 44 }}><Icon n="layers" size={20} /></span>}
            <span><div style={{ fontWeight: 500 }}>{it.title}</div><div className="subtle" style={{ fontSize: 13 }}>{it.sub}</div></span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function popupItems(s) {
  try { const a = JSON.parse(s.popup_items || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}

export default function Shell({ user, settings, children }) {
  const path = usePathname();
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const open = useCallback((m) => { setMenu(false); setModal(m); }, []);
  const close = useCallback(() => setModal(null), []);

  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setModal('search'); } };
    const c = (e) => { if (!e.target.closest?.('[data-usermenu]')) setMenu(false); };
    document.addEventListener('keydown', k);
    document.addEventListener('mousedown', c);
    return () => { document.removeEventListener('keydown', k); document.removeEventListener('mousedown', c); };
  }, []);
  useEffect(() => setMenu(false), [path]);

  async function logout() {
    await api('/api/auth/logout', 'POST', {});
    setMenu(false);
    router.push('/');
    router.refresh();
  }

  const act = (p) => (p === '/' ? path === '/' : path.startsWith(p));
  const UserMenu = () => (
    <div data-usermenu style={{ position: 'relative' }}>
      <button className="btn btn-sm" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}>
        <Icon n="wallet" size={16} /> {baht(user.balance)} ฿ <span className="muted">· {user.username}</span>
      </button>
      {menu && (
        <div className="menu-pop" role="menu">
          <Link href="/account">บัญชีของฉัน / เติมเงิน</Link>
          <Link href="/account?tab=orders">ประวัติการสั่งซื้อ</Link>
          {user.role === 'admin' && <Link href="/admin">จัดการหลังบ้าน</Link>}
          <button onClick={logout}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  );

  return (
    <Ctx.Provider value={{ user, settings, openAuth: (m) => open('auth:' + m), openSearch: () => open('search'), openContact: () => open('contact'), openCookies: () => setCookieOpen(true) }}>
      <header className="header">
        <nav className="nav-d" aria-label="เมนูหลัก">
          <Link href="/" className="brand"><img src={settings.logo} alt="" /><span>{settings.shop_name}</span></Link>
          <div className="nav-links">
            <Link href="/" className={'nav-link' + (act('/') ? ' active' : '')}>หน้าหลัก</Link>
            <Link href="/store" className={'nav-link' + (act('/store') ? ' active' : '')}>ร้านค้า</Link>
            <button className="nav-link" onClick={() => open('contact')}>ติดต่อเรา</button>
          </div>
          <div className="nav-right">
            {user ? <UserMenu /> : (
              <>
                <button className="btn" onClick={() => open('auth:login')}>เข้าสู่ระบบ</button>
                <button className="btn btn-primary" onClick={() => open('auth:register')}>สมัครสมาชิก</button>
              </>
            )}
          </div>
        </nav>
        <div className="nav-m" style={{ position: 'relative' }}>
          <Link href="/" className="brand"><img src={settings.logo} alt="" /><span>{settings.shop_name}</span></Link>
          {user ? <UserMenu /> : <button className="btn btn-sm btn-primary" onClick={() => open('auth:login')}>เข้าสู่ระบบ</button>}
        </div>
      </header>

      <nav className="tabbar" aria-label="เมนูมือถือ">
        <Link href="/" className={'tab' + (act('/') ? ' active' : '')}><Icon n="home" />หน้าหลัก</Link>
        <Link href="/store" className={'tab' + (act('/store') ? ' active' : '')}><Icon n="store" />ร้านค้า</Link>
        <button className="tab" onClick={() => open('search')}><Icon n="search" />ค้นหา</button>
        {user ? (
          <Link href="/account" className={'tab' + (act('/account') ? ' active' : '')}><Icon n="user" />บัญชี</Link>
        ) : (
          <button className="tab" onClick={() => open('auth:register')}><Icon n="user" />สมัคร</button>
        )}
      </nav>

      <main><div key={path} className="page-in">{children}</div></main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-g">
            <div>
              <Link href="/" className="brand" style={{ marginBottom: 16 }}><img src={settings.logo} alt="" /><span style={{ fontSize: 18 }}>{settings.shop_name}</span></Link>
              <p className="muted" style={{ marginBottom: 18 }}>{settings.footer_text}</p>
              <button className="btn" onClick={() => open('contact')}>ติดต่อเรา</button>
            </div>
            <div>
              <div className="eyebrow">เมนู</div>
              <Link className="fl" href="/">หน้าหลัก</Link>
              <Link className="fl" href="/store">ร้านค้า</Link>
              <Link className="fl" href="/privacy">นโยบายความเป็นส่วนตัว</Link>
            </div>
            <div>
              <div className="eyebrow">ชุมชน Discord</div>
              {settings.discord_widget_id ? (
                <DiscordWidget serverId={settings.discord_widget_id} />
              ) : settings.discord_url ? (
                <a className="btn btn-primary" href={settings.discord_url} target="_blank" rel="noopener noreferrer">เข้าร่วม Discord</a>
              ) : (
                <span className="subtle">-</span>
              )}
            </div>
          </div>
          <div className="copy"><span>Copyright © {new Date().getFullYear()} {settings.shop_name} · All rights reserved</span></div>
        </div>
      </footer>

      <AnnouncementPopup enabled={settings.popup_enabled === '1'} items={popupItems(settings)} version={settings.popup_version} />
      <CookieBanner forceOpen={cookieOpen} onClose={() => setCookieOpen(false)} />
      {modal?.startsWith('auth:') && <AuthModal mode={modal.split(':')[1]} onClose={close} />}
      {modal === 'search' && <SearchModal onClose={close} />}
      {modal === 'contact' && <ContactModal onClose={close} discord={settings.discord_url} />}
    </Ctx.Provider>
  );
}
