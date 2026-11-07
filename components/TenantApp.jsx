'use client';
// ร้านของผู้เช่า — หน้าตา/โครงเดียวกับเว็บหลักทุกอย่าง (ใช้คลาสเดียวกัน) เปลี่ยนแค่ "สกิน" ด้วยตัวแปรสี
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { makeT } from '@/lib/i18n';
import Icon from './Icons';
import { AuthShell, AField } from './AuthUI';

const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dt = (d) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
const ago = (iso, now, lang) => {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000)); const en = lang === 'en';
  if (s < 60) return en ? 'Just now' : 'เมื่อสักครู่';
  const m = Math.floor(s / 60); if (m < 60) return en ? `${m} min ago` : `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60); if (h < 24) return en ? `${h} h ago` : `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24); return en ? `${d} d ago` : `${d} วันที่แล้ว`;
};
const setCookie = (k, v) => { document.cookie = `${k}=${v};path=/;max-age=31536000;samesite=lax`; };
const hexRgb = (c) => { const h = String(c || '').replace('#', ''); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',') : null; };
const onCol = (rgb) => { const [r, g, b] = rgb.split(',').map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000' : '#fff'; };
const TT = createContext(makeT('th'));
const useTT = () => useContext(TT);

async function call(method, url, data) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
  return j;
}
const parseHash = () => {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const seg = path.split('/').filter(Boolean);
  return { seg, q: new URLSearchParams(qs || '') };
};

export default function TenantApp({ sub, demo, shop: shop0, initial, skin: skin0, theme: theme0, lang: lang0, vars: vars0, others }) {
  const [pv, setPv] = useState(null); // พรีวิวสดจากหลังบ้าน (postMessage) ใช้เฉพาะตอนฝังในหน้าตั้งค่า
  const [lang, setLang] = useState(lang0);
  const [theme1, setTheme] = useState(theme0);
  const theme = pv?.theme || theme1;
  const skin = pv?.skin || skin0;
  const pc = pv?.color ? hexRgb(pv.color) : null;
  const vars = pc ? { '--ac': pv.color, '--ac-rgb': pc, '--on-ac': onCol(pc) } : vars0;
  const t = useMemo(() => makeT(lang), [lang]);
  const shop = useMemo(() => (lang === 'en' ? { ...shop0, title: shop0.title_en || shop0.title, tagline: shop0.tagline_en || shop0.tagline, about: shop0.about_en || shop0.about, announce: shop0.announce_en || shop0.announce } : shop0), [lang, shop0]);
  const [data, setData] = useState(initial);
  const [route, setRoute] = useState({ seg: [], q: new URLSearchParams() });
  const [modal, setModal] = useState(null); // {t:'auth',mode} | {t:'contact'} | {t:'buy',p,qty}
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(null);
  const root = useRef(null);
  const me = data.me;

  useEffect(() => {
    if (!shop0.embed) return;
    const h = (e) => { if (e.origin === location.origin && e.data && e.data.tnPreview) setPv(e.data.tnPreview); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [shop0.embed]);
  useEffect(() => {
    const f = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }); };
    setRoute(parseHash()); setNow(Date.now());
    window.addEventListener('hashchange', f);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { window.removeEventListener('hashchange', f); clearInterval(t); };
  }, []);
  const reload = useCallback(() => call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}`).then(setData).catch(() => {}), [sub]);
  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 3500); };
  const close = useCallback(() => setModal(null), []);
  const page = route.seg[0] || 'home';
  const nav = (p) => { location.hash = p; };
  async function logout() { await call('POST', '/api/tstore', { sub, action: 'logout' }).catch(() => {}); await reload(); say(t('ออกจากระบบแล้ว')); if (page === 'account') nav('/'); }
  const authOpen = (mode) => setModal({ t: 'auth', mode });
  const switchLang = () => { const n = lang === 'th' ? 'en' : 'th'; setLang(n); setCookie('fx_lang', n); document.documentElement.lang = n; };
  const switchTheme = (ev) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const apply = () => { flushSync(() => setTheme(next)); setCookie('fx_theme', next); };
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    const r = ev.currentTarget.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
  };
  const prefs = (small) => (
    <div className="prefs">
      <button type="button" role="switch" aria-checked={lang === 'en'} aria-label={t('สลับภาษา')} className={'lsw' + (small ? ' sm' : '')} data-lang={lang} onClick={switchLang}><i /><span>TH</span><span>EN</span></button>
      <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label={t('สลับธีมสว่าง/มืด')} className={'tsw' + (small ? ' sm' : '')} onClick={switchTheme}><i className="st s1" /><i className="st s2" /><i className="st s3" /><i className="cl" /><span className="th" /></button>
    </div>
  );

  const links = [['/', 'หน้าหลัก', 'home'], ['/store', 'หมวดหมู่สินค้า', 'store'], ['/account/topup', 'เติมเงิน', 'account']];
  const userBtn = me ? (
    <button className="btn btn-sm" onClick={() => nav('/account')}><Icon n="wallet" size={16} /> {baht(me.balance)} ฿ <span className="muted">· {me.username}</span></button>
  ) : null;

  return (
    <TT.Provider value={t}>
    <div className="tsk" data-skin={skin} data-theme={theme} lang={lang} style={vars} ref={root}>
      <i className="tsk-glow" aria-hidden="true" />
      <header className="header">
        <nav className="nav-d">
          <div className="nav-in">
            <a href="#/" className="brand">{shop.logo ? <img src={shop.logo} alt="" /> : <span className="auth2-dot" />}<span>{shop.title}</span></a>
            <div className="nav-links">
              {links.map(([h, l, k]) => <a key={k} href={'#' + h} className={'nav-link' + (page === k || (k === 'home' && page === 'home') || (k === 'store' && page === 'p') ? ' active' : '')}>{t(l)}</a>)}
              <button className="nav-link" onClick={() => setModal({ t: 'contact' })}>{t('ติดต่อเรา')}</button>
            </div>
            <div className="nav-right">
              {prefs(false)}
              {me ? (<>{userBtn}<button className="btn btn-sm" onClick={logout}>{t('ออกจากระบบ')}</button></>) : (
                <><button className="btn" onClick={() => authOpen('register')}>{t('สมัครสมาชิก')}</button><button className="btn btn-white" onClick={() => authOpen('login')}><Icon n="arrow" size={15} /> {t('เข้าสู่ระบบ')}</button></>
              )}
            </div>
          </div>
        </nav>
        <div className="nav-m" style={{ position: 'relative' }}>
          <a href="#/" className="brand">{shop.logo ? <img src={shop.logo} alt="" /> : <span className="auth2-dot" />}<span>{shop.title}</span></a>
          <div className="nav-right">{prefs(true)}{me ? userBtn : <button className="btn btn-sm btn-white" onClick={() => authOpen('login')}>{t('เข้าสู่ระบบ')}</button>}</div>
        </div>
      </header>
      <nav className="tabbar">
        <a href="#/" className={'tab' + (page === 'home' ? ' active' : '')}><Icon n="home" />{t('หน้าหลัก')}</a>
        <a href="#/store" className={'tab' + (page === 'store' || page === 'p' ? ' active' : '')}><Icon n="store" />{t('ร้านค้า')}</a>
        <a href="#/account/topup" className={'tab' + (page === 'account' ? ' active' : '')}><Icon n="wallet" />{t('เติมเงิน')}</a>
        {me ? <a href="#/account" className="tab"><Icon n="user" />{t('บัญชี')}</a> : <button className="tab" onClick={() => authOpen('register')}><Icon n="user" />{t('สมัคร')}</button>}
      </nav>

      <main><div key={page + (route.seg[1] || '')} className="page-in">
        {page === 'store' ? <StorePage data={data} q={route.q} />
          : page === 'p' ? <ProductPage data={data} id={Number(route.seg[1])} me={me} onAuth={() => authOpen('login')} onBuy={(p, qty) => setModal({ t: 'buy', p, qty })} />
          : page === 'account' ? (me ? <AccountPage sub={sub} me={me} demo={demo} canTopup={shop.canTopup} tab0={route.seg[1]} onChange={reload} say={say} /> : <NeedLogin onAuth={() => authOpen('login')} />)
          : <Home data={data} shop={shop} now={now} lang={lang} onAuth={() => authOpen('register')} me={me} />}
      </div></main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-g">
            <div>
              <a href="#/" className="brand" style={{ marginBottom: 16 }}>{shop.logo ? <img src={shop.logo} alt="" /> : <span className="auth2-dot" />}<span style={{ fontSize: 18 }}>{shop.title}</span></a>
              <p className="muted" style={{ marginBottom: 18 }}>{shop.about || shop.tagline}</p>
              <button className="btn" onClick={() => setModal({ t: 'contact' })}>{t('ติดต่อเรา')}</button>
            </div>
            <div>
              <div className="eyebrow">{t('เมนู')}</div>
              <a className="fl" href="#/">{t('หน้าหลัก')}</a><a className="fl" href="#/store">{t('ร้านค้า')}</a><a className="fl" href="#/account/topup">{t('เติมเงิน')}</a>
            </div>
            <div>
              <div className="eyebrow">{t('ช่องทางติดต่อ')}</div>
              {shop.links.length ? shop.links.map((l, i) => <a key={i} className="fl" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>) : <span className="subtle">-</span>}
            </div>
          </div>
          <div className="copy"><span>Copyright © {new Date().getFullYear()} {shop.title} · All rights reserved · <a href={`https://${shop.root}/rent`} style={{ textDecoration: 'underline' }}>{t('สร้างร้านของคุณเอง')}</a></span></div>
        </div>
      </footer>

      {demo && !shop.embed && (
        <div className="tn-demo" role="navigation">
          <span>{t('ร้านตัวอย่าง — ลองสมัคร เติมเงิน ซื้อของได้จริง')}</span>
          <div className="tn-demo-sw">{others.map((x) => <a key={x.slug} href={'/' + x.slug} className={x.slug === skin ? 'on' : ''}>{x.name}</a>)}</div>
          <a className="tn-demo-cta" href={`/rent?tpl=${skin}`}>{t('เลือกแบบนี้ →')}</a>
        </div>
      )}
      {toast && <div className="toast" role="alert" onClick={() => setToast('')}>{toast}</div>}
      <Modals root={root} modal={modal} close={close} shop={shop} sub={sub} me={me} reload={reload} say={say} nav={nav} setModal={setModal} />
    </div>
    </TT.Provider>
  );
}

function Modals({ root, modal, close, shop, sub, me, reload, say, nav, setModal }) {
  const t = useTT();
  const [host, setHost] = useState(null);
  useEffect(() => setHost(root.current), [root]);
  useEffect(() => {
    if (!modal) return;
    const k = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [modal, close]);
  if (!modal || !host) return null;
  const cls = modal.t === 'auth' ? 'auth' : '';
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={'modal ' + cls} role="dialog" aria-modal="true" style={{ position: 'relative' }}>
        <button className="btn btn-sm x" onClick={close} aria-label={t('ปิด')}><Icon n="x" size={16} /></button>
        {modal.t === 'auth' && <AuthBox sub={sub} mode0={modal.mode} shop={shop} onDone={() => { close(); reload(); say(t('เข้าสู่ระบบสำเร็จ')); }} />}
        {modal.t === 'contact' && (
          <div><h3>{t('ติดต่อเรา')}</h3><p className="muted" style={{ fontSize: 14, margin: '6px 0 16px' }}>{t('มีปัญหาการสั่งซื้อหรืออยากสอบถามสินค้า ทักมาได้เลย')}</p>
            <div style={{ display: 'grid', gap: 8 }}>{shop.links.length ? shop.links.map((l, i) => <a key={i} className="btn btn-primary" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label} <Icon n="ext" size={14} /></a>) : <div className="msg err">{t('ร้านยังไม่ได้ตั้งค่าช่องทางติดต่อ')}</div>}</div></div>
        )}
        {modal.t === 'buy' && <BuyConfirm sub={sub} p={modal.p} qty={modal.qty} me={me} onClose={close} onBought={reload} nav={nav} />}
      </div>
    </div>, host);
}

function AuthBox({ sub, mode0, shop, onDone }) {
  const t = useTT();
  const [mode, setMode] = useState(mode0);
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await call('POST', '/api/tstore', { sub, action: mode, username: u, password: p }); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthShell mode={mode} setMode={(m) => { setMode(m); setErr(''); }} brand={shop.title} logo={shop.logo}
      title={mode === 'login' ? t('ยินดีต้อนรับกลับมา') : t('สร้างบัญชีเพื่อสั่งซื้อและเติมเงิน')}
      sub={mode === 'login' ? t('เข้าสู่ระบบเพื่อดูยอดเงิน ประวัติการสั่งซื้อ และคีย์ของคุณ') : t('สมัครฟรี ใช้เวลาไม่ถึงหนึ่งนาที')}
      perks={[['bolt', t('รับสินค้าทันทีหลังชำระเงิน')], ['shield', t('ปลอดภัย ใช้งานง่าย')], ['wallet', t('เติมเงินง่ายด้วยซองอั่งเปา TrueMoney')]]}>
      <form onSubmit={go} key={mode}>
        <AField icon="user" label={t('ชื่อผู้ใช้')} autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} maxLength={20} required />
        <AField icon="lock" type="password" label={mode === 'register' ? t('รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)') : t('รหัสผ่าน')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={p} onChange={(e) => setP(e.target.value)} maxLength={72} required />
        {err && <div className="msg err" style={{ margin: 0 }}>{t(err)}</div>}
        <button className="auth2-go" disabled={busy}>{busy ? <span className="spin" /> : <>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'} <Icon n="arrow" size={16} /></>}</button>
      </form>
      <div className="auth2-foot">{mode === 'login' ? t('ยังไม่มีบัญชี?') : t('มีบัญชีอยู่แล้ว?')} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>{mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button></div>
    </AuthShell>
  );
}

const Img = ({ src, name, cls }) => src ? <img src={src} alt={name} loading="lazy" /> : <div className={'ph ' + (cls || '')}>{(name || '?').slice(0, 1)}</div>;

function Home({ data, shop, now, lang, onAuth, me }) {
  const t = useTT();
  const featured = useMemo(() => [...data.products].sort((a, b) => b.sold - a.sold).slice(0, 5), [data.products]);
  const rec = data.recent;
  let base = rec; while (base.length && base.length < 12) base = base.concat(rec);
  const track = [...base, ...base];
  const st = [['users', t('ผู้ใช้งานทั้งหมด'), data.stats.users], ['box', t('สินค้าพร้อมขาย'), data.stats.products], ['bag', t('ขายแล้วทั้งหมด'), data.stats.sold]];
  return (
    <div className="wrap">
      <section className="banner rv in" aria-label={shop.title}>
        <div className="banner-ph">
          <span className="banner-chip"><i />{t('เปิดให้บริการ')}</span>
          <h1>{shop.title}</h1>
          {shop.tagline && <p>{shop.tagline}</p>}
          <div className="banner-cta">
            <a href="#/store" className="btn btn-primary">{t('เลือกซื้อสินค้า')}</a>
            {me ? <a href="#/account/topup" className="btn">{t('+ เติมเงิน')}</a> : <button className="btn" onClick={onAuth}>{t('สมัครสมาชิก')}</button>}
          </div>
        </div>
        <i className="banner-edge" aria-hidden="true" />
      </section>

      {shop.announce && (
        <div className="annc rv in" role="status">
          <div className="annc-tag"><Icon n="bell" size={15} /> {t('ประกาศ')}</div>
          <div className="annc-run"><div className="annc-track">{[...Array(12)].map((_, i) => <span key={i} aria-hidden={i > 5 ? 'true' : undefined}>{shop.announce}</span>)}</div></div>
        </div>
      )}
      <section className="stats">
        {st.map(([ic, l, v], i) => (
          <div className="stat rv in" key={l}><div className="stat-ic"><Icon n={ic} /></div><div className="stat-tx"><div className="stat-l">{l}</div><div className="stat-v"><span className="num">{Number(v).toLocaleString('th-TH')}</span></div></div></div>
        ))}
        <a className="stat stat-contact rv in" href={shop.links[0]?.url || '#/'} target={shop.links[0] ? '_blank' : undefined} rel="noopener noreferrer nofollow">
          <div className="stat-ic"><Icon n="headset" /></div>
          <div className="stat-tx"><div className="stat-l">{t('สอบถามและขอความช่วยเหลือ')}</div><div className="stat-v stat-cta">{t('ติดต่อทีมงาน')}</div></div>
          <Icon n="arrow" size={16} className="stat-go" />
        </a>
      </section>

      {rec.length > 0 && (
        <section className="section recent rv in">
          <div className="sec-head"><span className="sec-ic"><Icon n="bag" size={18} /></span><div><h2 className="sec-title">{t('สินค้าที่ซื้อล่าสุด')}</h2><p className="sub" style={{ margin: 0 }}>{t('สินค้าที่ซื้อล่าสุด')}</p></div></div>
          <div className="ticker"><div className="ticker-track" style={{ animationDuration: `${Math.max(30, base.length * 4.5)}s` }}>
            {track.map((o, i) => (
              <div className="tk" key={i} aria-hidden={i >= base.length ? 'true' : undefined}>
                <div className="tk-img">{o.image ? <img src={o.image} alt="" loading="lazy" /> : <Icon n="box" size={22} />}</div>
                <div className="tk-tx"><div className="tk-name">{t(o.product)}</div><div className="tk-meta"><span className="tk-user"><Icon n="user" size={12} />{o.user}</span><i /><span suppressHydrationWarning>{now ? ago(o.at, now, lang) : ''}</span></div></div>
              </div>
            ))}
          </div></div>
        </section>
      )}

      <section className="section">
        <div className="sh rv in"><div><div className="sh-eye">{shop.title}</div><h2>{t('หมวดหมู่สินค้า')}</h2></div><a href="#/store" className="sh-more">{t('ดูทั้งหมด')} <Icon n="arrow" size={14} /></a></div>
        <div className="cats">
          {data.categories.map((c, i) => (
            <a key={c.id} href={`#/store?c=${c.id}`} className="cat rv in" style={{ '--i': i % 4 }}>
              <i className="cat-lines" aria-hidden="true" />
              <div className="cat-img">{c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <div className="ph cat-ph">{t(c.name)}</div>}</div>
              <div className="cat-body"><div><h3>{t(c.name)}</h3><div className="cat-count">{c.count} {t('รายการ')}</div></div><span className="cat-go"><Icon n="arrow" size={16} /></span></div>
            </a>
          ))}
          {data.categories.length === 0 && <div className="empty">{t('ยังไม่มีหมวดหมู่สินค้า')}</div>}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="sh rv in"><div><div className="sh-eye">{shop.title}</div><h2>{t('สินค้าแนะนำ')}</h2></div><a href="#/store" className="sh-more">{t('ดูทั้งหมด')} <Icon n="arrow" size={14} /></a></div>
          <div className="feat">
            {featured.map((p, i) => (
              <a key={p.id} href={`#/p/${p.id}`} className="fcard rv in" style={{ '--i': i % 5 }}>
                <span className="fcard-badge"><Icon n="flame" size={12} /> {t('แนะนำ')}</span>
                <div className="fcard-img"><Img src={p.image} name={p.name} />{p.stock === 0 && <span className="badge-out">{t('สินค้าหมด')}</span>}</div>
                <div className="fcard-body">
                  <div className="fcard-cat">{p.category_name ? t(p.category_name) : t('สินค้า')}</div><div className="fcard-name">{t(p.name)}</div>
                  <div className="fcard-foot"><span className="price">{baht(p.price)}<small>฿</small></span><span className="fcard-sold">{t('ขายแล้ว')} {p.sold}</span></div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StorePage({ data, q }) {
  const t = useTT();
  const cid = Number(q.get('c')) || 0;
  const cur = data.categories.find((c) => c.id === cid);
  const list = data.products.filter((p) => !cid || p.category_id === cid);
  return (
    <div className="wrap">
      <div className="page-h rv in"><div><div className="crumb"><a href="#/">{t('หน้าหลัก')}</a>/<span>{t('ร้านค้า')}</span></div><h1>{cur ? cur.name : 'สินค้าทั้งหมด'}</h1></div><span className="muted">{list.length} {t('รายการ')}</span></div>
      <div className="filters rv in">
        <a href="#/store" className={'filter' + (!cid ? ' on' : '')}>{t('สินค้าทั้งหมด')}</a>
        {data.categories.map((c) => <a key={c.id} href={`#/store?c=${c.id}`} className={'filter' + (cid === c.id ? ' on' : '')}>{t(c.name)}</a>)}
      </div>
      {list.length === 0 ? <div className="empty">{t('ยังไม่มีสินค้าในหมวดนี้')}</div> : (
        <div className="grid">
          {list.map((p, i) => (
            <a key={p.id} href={`#/p/${p.id}`} className="pcard rv in" style={{ '--i': i % 8 }}>
              <div className="pcard-img"><Img src={p.image} name={p.name} />{p.stock === 0 && <span className="badge-out">{t('สินค้าหมด')}</span>}</div>
              <div className="pcard-body">
                <div className="pcard-name">{t(p.name)}</div>
                <div className="price">{baht(p.price)}<small>฿</small></div>
                <div className="stock">{p.stock === null ? t('ส่งทันที') : <>{t('คงเหลือ')} <b>{p.stock}</b></>}</div>
                <span className={'btn btn-sm ' + (p.stock === null || p.stock > 0 ? 'btn-primary' : '')} style={p.stock === 0 ? { opacity: 0.5 } : null}>{p.stock === null || p.stock > 0 ? 'ซื้อเลย' : 'สินค้าหมด'}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPage({ data, id, me, onAuth, onBuy }) {
  const t = useTT();
  const p = data.products.find((x) => x.id === id);
  const [qty, setQty] = useState(1);
  if (!p) return <div className="wrap"><div className="empty">{t('ไม่พบสินค้านี้ ·')} <a href="#/store" style={{ textDecoration: 'underline' }}>{t('กลับไปร้านค้า')}</a></div></div>;
  const out = p.stock !== null && p.stock <= 0;
  const max = Math.min(20, p.stock === null ? 20 : p.stock);
  const total = p.price * qty;
  return (
    <div className="wrap">
      <div className="crumb"><a href="#/store">{t('ร้านค้า')}</a>/{p.category_name && <><a href={`#/store?c=${p.category_id}`}>{t(p.category_name)}</a>/</>}<span>{t(p.name)}</span></div>
      <div className="pd">
        <div className="pd-img rv in"><Img src={p.image} name={p.name} /></div>
        <div className="rv in">
          <div className="panel">
            <h1>{t(p.name)}</h1>
            <div className="price big" style={{ margin: '10px 0' }}>{baht(p.price)}<small>฿</small></div>
            <div className="stock" style={{ marginBottom: 14 }}>{out ? 'สินค้าหมด' : p.stock === null ? t('ส่งทันทีหลังชำระเงิน') : <>{t('คงเหลือ')} <b>{p.stock}</b> {t('ชิ้น')}</>} · {t('ขายแล้ว')} {p.sold}</div>
            {!out && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span className="muted">{t('จำนวน')}</span>
                <button className="btn btn-sm" onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t('ลด')}>−</button><b>{qty}</b><button className="btn btn-sm" onClick={() => setQty(Math.min(max, qty + 1))} aria-label={t('เพิ่ม')}>+</button>
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{t('รวม')} {baht(total)} ฿</span>
              </div>
            )}
            {out ? <button className="btn" disabled style={{ width: '100%' }}>{t('สินค้าหมด')}</button>
              : !me ? <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAuth}>{t('เข้าสู่ระบบเพื่อสั่งซื้อ')}</button>
              : me.balance < total ? <a className="btn btn-primary" style={{ width: '100%' }} href="#/account/topup">{t('ยอดเงินไม่พอ — เติมเงิน')}</a>
              : <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onBuy(p, qty)}>{t('ซื้อเลย')}</button>}
          </div>
        </div>
      </div>
      <div className="panel rv in" style={{ marginTop: 18 }}><h2 style={{ fontSize: 18, marginBottom: 12 }}>{t('รายละเอียดสินค้า')}</h2><div className="desc">{p.description ? t(p.description) : t('ไม่มีรายละเอียดเพิ่มเติม')}</div></div>
    </div>
  );
}

function BuyConfirm({ sub, p, qty, me, onClose, onBought, nav }) {
  const t = useTT();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [res, setRes] = useState(null);
  const [code, setCode] = useState(''); const [cp, setCp] = useState(null); const [cerr, setCerr] = useState('');
  const base = p.price * qty;
  const total = cp ? cp.total : base;
  async function applyCode() {
    setCerr(''); setCp(null);
    try { const r = await call('POST', '/api/tstore', { sub, action: 'coupon', productId: p.id, qty, code }); setCp({ ...r, code }); } catch (x) { setCerr(x.message); }
  }
  async function buy() { setErr(''); setBusy(true); try { const r = await call('POST', '/api/tstore', { sub, action: 'buy', productId: p.id, qty, coupon: cp ? cp.code : '' }); setRes(r); onBought(); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  if (res) return (
    <div><h3>{t('✓ สั่งซื้อสำเร็จ')}</h3><p className="muted" style={{ margin: '6px 0 12px' }}>{t(res.name)} × {qty} · {baht(res.total)} ฿{res.discount > 0 && <> ({t('ส่วนลด')} {baht(res.discount)} ฿)</>}</p>
      <pre className="codebox" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflow: 'auto' }}>{res.items.join('\n')}</pre>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button className="btn" style={{ flex: 1 }} onClick={() => navigator.clipboard?.writeText(res.items.join('\n'))}>{t('คัดลอก')}</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); nav('/account/orders'); }}>{t('ดูประวัติ')}</button></div>
      <p className="subtle" style={{ fontSize: 12.5, marginTop: 10 }}>{t('ยอดคงเหลือ')} {baht(res.balance)} ฿</p></div>
  );
  return (
    <div><h3>{t('ยืนยันการสั่งซื้อ')}</h3><p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>{t('ตรวจสอบรายการก่อนกดยืนยัน ระบบจะหักเงินและส่งสินค้าทันที')}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input className="input" value={code} onChange={(e) => { setCode(e.target.value); setCp(null); }} placeholder={t('โค้ดส่วนลด (ถ้ามี)')} maxLength={30} />
        <button className="btn" onClick={applyCode} disabled={!code.trim()}>{t('ใช้โค้ด')}</button>
      </div>
      {cerr && <div className="msg err" style={{ margin: '0 0 8px' }}>{t(cerr)}</div>}
      {cp && <div className="msg ok" style={{ margin: '0 0 8px' }}>✓ {t('ลดไป')} {baht(cp.discount)} ฿</div>}
      <div className="cf-rows"><div><span>{t('สินค้า')}</span><b>{t(p.name)} × {qty}</b></div>{cp && <div><span>{t('ส่วนลด')}</span><b>-{baht(cp.discount)} ฿</b></div>}<div className="cf-total"><span>{t('ยอดที่ต้องชำระ')}</span><b>{baht(total)} ฿</b></div><div><span>{t('ยอดคงเหลือหลังซื้อ')}</span><b>{baht(Math.max(0, me.balance - total))} ฿</b></div></div>
      {err && <div className="msg err">{t(err)}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="btn" style={{ flex: 1 }} onClick={onClose} disabled={busy}>{t('ยกเลิก')}</button><button className="btn btn-primary" style={{ flex: 1 }} onClick={buy} disabled={busy || me.balance < total}>{busy ? <span className="spin" /> : t('ยืนยันสั่งซื้อ')}</button></div></div>
  );
}

function NeedLogin({ onAuth }) { const t = useTT(); return <div className="wrap"><div className="empty"><p style={{ marginBottom: 14 }}>{t('กรุณาเข้าสู่ระบบก่อน')}</p><button className="btn btn-primary" onClick={onAuth}>{t('เข้าสู่ระบบ')}</button></div></div>; }

function AccountPage({ sub, me, demo, canTopup, tab0, onChange, say }) {
  const t = useTT();
  const [tab, setTab] = useState(tab0 === 'orders' ? 'orders' : 'topup');
  const [link, setLink] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState(null);
  useEffect(() => { setTab(tab0 === 'orders' ? 'orders' : 'topup'); }, [tab0]);
  useEffect(() => { if (tab === 'orders') call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}&orders=1`).then((d) => setOrders(d.rows)).catch(() => setOrders([])); }, [tab, sub]);
  async function topup(e) { e.preventDefault(); setErr(''); setBusy(true); try { const r = await call('POST', '/api/tstore', { sub, action: 'topup', voucher: link }); say(`${t('เติมเงินสำเร็จ')} +${baht(r.amount)} ฿`); setLink(''); onChange(); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  return (
    <div className="wrap">
      <div className="page-h rv in"><div><div className="crumb"><a href="#/">{t('หน้าหลัก')}</a>/<span>{t('บัญชีของฉัน')}</span></div><h1>{t('บัญชีของฉัน')}</h1></div></div>
      <div className="panel rv in" style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><span className="muted">{t('ยอดคงเหลือ')}</span><b style={{ fontSize: 32 }}>{baht(me.balance)} ฿</b><span className="subtle" style={{ marginLeft: 'auto' }}>{me.username}</span></div>
      <div className="tabs" style={{ maxWidth: 360 }}><button className={tab === 'topup' ? 'on' : ''} onClick={() => setTab('topup')}>{t('เติมเงิน')}</button><button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>{t('ประวัติการสั่งซื้อ')}</button></div>
      {tab === 'topup' ? (
        <div className="panel" style={{ maxWidth: 560 }}>
          <h3 style={{ marginBottom: 4 }}>{t('🧧 เติมเงินด้วยซองอั่งเปา TrueMoney')}</h3>
          {canTopup || demo ? (
            <form onSubmit={topup}>
              {demo && <div className="note" style={{ margin: '10px 0' }}>{t('🧪 ร้านทดลอง: วางลิงก์ซองรูปแบบใดก็ได้ จะได้เงินเดโม 100 ฿ ต่อครั้ง ไม่มีเงินจริง')}</div>}
              <ol className="muted" style={{ fontSize: 13.5, lineHeight: 1.8, margin: '10px 0 14px', paddingLeft: 18 }}><li>{t('สร้างซองอั่งเปาใน TrueMoney Wallet (จำนวน 1 คน)')}</li><li>{t('ใส่ยอดที่ต้องการเติม แล้วคัดลอกลิงก์ซอง')}</li><li>{t('วางลิงก์ด้านล่างแล้วกดยืนยัน — เติมเข้ายอดคงเหลือทันที')}</li></ol>
              <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." inputMode="url" autoCapitalize="none" spellCheck={false} required />
              {err && <div className="msg err">{t(err)}</div>}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={busy || !link.trim()}>{busy ? <span className="spin" /> : t('ยืนยันเติมเงิน')}</button>
            </form>
          ) : <div className="note" style={{ marginTop: 10 }}>{t('ร้านนี้ยังไม่เปิดรับเติมเงิน กรุณาติดต่อเจ้าของร้าน')}</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
          {orders === null ? <div className="muted">{t('กำลังโหลด…')}</div> : orders.length === 0 ? <div className="empty">{t('ยังไม่มีออเดอร์')}</div> : orders.map((o) => (
            <div className="panel" key={o.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b>{t(o.product_name)} × {o.qty}</b><b>{baht(o.total)} ฿</b></div>
              <div className="subtle" style={{ fontSize: 13, margin: '2px 0 8px' }}>#{o.id} · {dt(o.created_at)}</div>
              <pre className="codebox" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 160, overflow: 'auto' }}>{o.delivered}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
