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
  const acVars = pc ? { '--ac': pv.color, '--ac-rgb': pc, '--on-ac': onCol(pc) } : vars0;
  const has = (k) => pv && k in pv;
  const eff = { bg_image: has('bg_image') ? pv.bg_image : shop0.bg_image, bg_dim: has('bg_dim') ? pv.bg_dim : shop0.bg_dim, colors: has('colors') ? pv.colors : shop0.colors, font: has('font') ? pv.font : shop0.font, banner: has('banner') ? pv.banner : shop0.banner };
  const cl = eff.colors || {};
  const ownerTheme = pv?.theme || shop0.owner_theme;
  const ov = {};
  if (theme === ownerTheme) { // สีที่เจ้าของร้านกำหนดเอง ใช้กับธีมที่เป็นค่าเริ่มต้นของร้าน (อีกธีมใช้สีมาตรฐานของแบบ)
    if (hexRgb(cl.bg)) { ov['--bg'] = cl.bg; ov['--bg-rgb'] = hexRgb(cl.bg); }
    if (hexRgb(cl.surface)) { ov['--surface'] = cl.surface; ov['--surface-2'] = `color-mix(in srgb, ${cl.surface} 93%, ${cl.text || '#808080'})`; ov['--surface-3'] = `color-mix(in srgb, ${cl.surface} 86%, ${cl.text || '#808080'})`; }
    if (hexRgb(cl.text)) { ov['--text'] = cl.text; ov['--fg-rgb'] = hexRgb(cl.text); ov['--muted'] = `color-mix(in srgb, ${cl.text} 62%, transparent)`; }
    if (hexRgb(cl.border)) { ov['--border'] = cl.border; ov['--border-strong'] = cl.border; }
  }
  const FONTS = { kanit: "'Kanit',sans-serif", prompt: "'Prompt',sans-serif", noto: "'Noto Sans Thai',sans-serif" };
  const vars = { ...acVars, ...ov, ...(FONTS[eff.font] ? { fontFamily: FONTS[eff.font] } : {}), '--dim': (Number(eff.bg_dim) || 0) / 100 };
  const shop = lang === 'en' ? { ...shop0, title: shop0.title_en || shop0.title, tagline: shop0.tagline_en || shop0.tagline, about: shop0.about_en || shop0.about, announce: shop0.announce_en || shop0.announce, banner: eff.banner } : { ...shop0, banner: eff.banner };
  const t = useMemo(() => makeT(lang), [lang]);
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
      {eff.bg_image && <div className="tsk-bg" style={{ backgroundImage: `url("${String(eff.bg_image).replace(/"/g, '%22')}")` }} aria-hidden="true" />}
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
          : <Home data={data} shop={shop} now={now} lang={lang} skin={skin} onAuth={() => authOpen('register')} me={me} />}
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

function Home({ data, shop, now, lang, skin, onAuth, me }) {
  const t = useTT();
  const featured = useMemo(() => [...data.products].sort((a, b) => b.sold - a.sold).slice(0, 5), [data.products]);
  const rec = data.recent;
  let base = rec; while (base.length && base.length < 12) base = base.concat(rec);
  const track = [...base, ...base];
  const st = [['users', t('ผู้ใช้งานทั้งหมด'), data.stats.users], ['box', t('สินค้าพร้อมขาย'), data.stats.products], ['bag', t('ขายแล้วทั้งหมด'), data.stats.sold]];
  return (
    <div className="wrap">
      {shop.banner && (
        <section className="banner rv in" aria-label={shop.title}>
          <img src={shop.banner} alt={shop.title} width="986" height="399" decoding="async" fetchPriority="high" />
          <i className="banner-edge" aria-hidden="true" />
        </section>
      )}

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

      {skin === 'studio' ? data.categories.filter((c) => data.products.some((p) => p.category_id === c.id)).map((c) => {
        const list = data.products.filter((p) => p.category_id === c.id);
        return (
          <section className="section" key={c.id}>
            <div className="sh rv in">
              <div className="sec-head"><span className="sec-ic"><Icon n="box" size={18} /></span><div><h2 className="sec-title">{t(c.name)}</h2><p className="sub" style={{ margin: 0 }}>{list.length} {t('รายการ')}</p></div></div>
              <a href={`#/store?c=${c.id}`} className="sh-more">{t('ดูทั้งหมด')} <Icon n="arrow" size={14} /></a>
            </div>
            <div className="grid">{list.slice(0, 8).map((p, i) => <PCard key={p.id} p={p} i={i} />)}</div>
          </section>
        );
      }) : null}
      {skin !== 'studio' && featured.length > 0 && (
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

function PCard({ p, i }) {
  const t = useTT();
  return (
    <a href={`#/p/${p.id}`} className="pcard rv in" style={{ '--i': i % 8 }}>
      <div className="pcard-img"><Img src={p.image} name={p.name} />{p.stock === 0 && <span className="badge-out">{t('สินค้าหมด')}</span>}</div>
      <div className="pcard-body">
        <div className="pcard-name">{t(p.name)}</div>
        <div className="price">{baht(p.price)}<small>฿</small></div>
        <div className="stock">{p.stock === null ? t('ส่งทันที') : <>{t('คงเหลือ')} <b>{p.stock}</b></>}</div>
        <span className={'btn btn-sm ' + (p.stock === null || p.stock > 0 ? 'btn-primary' : '')} style={p.stock === 0 ? { opacity: 0.5 } : null}>{p.stock === null || p.stock > 0 ? t('ซื้อเลย') : t('สินค้าหมด')}</span>
      </div>
    </a>
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
          {list.map((p, i) => <PCard key={p.id} p={p} i={i} />)}
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

const TOPUP_ST = { credited: ['ok', 'เติมแล้ว'], review: ['warn', 'รอตรวจสอบ'], redeemed: ['warn', 'รอตรวจสอบ'], failed: ['bad', 'ไม่สำเร็จ'], pending: ['', 'กำลังดำเนินการ'] };

function AccountPage({ sub, me, demo, canTopup, tab0, onChange, say }) {
  const t = useTT();
  const [tab, setTab] = useState(['orders', 'security'].includes(tab0) ? tab0 : 'topup');
  useEffect(() => { setTab(['orders', 'security'].includes(tab0) ? tab0 : 'topup'); }, [tab0]);
  const T = [['topup', 'เติมเงิน'], ['orders', 'ประวัติการสั่งซื้อ'], ['security', 'ความปลอดภัย']];
  return (
    <div className="wrap">
      <div className="page-h">
        <div><h1>{t('สวัสดี,')} {me.username}</h1><div className="muted">{t('บัญชีของฉัน')}</div></div>
        <div className="panel" style={{ padding: '12px 20px' }}><span className="muted" style={{ fontSize: 13 }}>{t('ยอดเงินคงเหลือ')}</span><div className="big" style={{ fontSize: 28 }}>{baht(me.balance)} ฿</div></div>
      </div>
      <div className="atabs">{T.map(([k, l]) => <button key={k} className={'filter' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); history.replaceState(null, '', '#/account/' + k); }}>{t(l)}</button>)}</div>
      {tab === 'topup' && <TopupTab sub={sub} me={me} demo={demo} canTopup={canTopup} onChange={onChange} say={say} />}
      {tab === 'orders' && <OrdersTab sub={sub} />}
      {tab === 'security' && <SecurityTab sub={sub} />}
    </div>
  );
}

function TopupTab({ sub, me, demo, canTopup, onChange, say }) {
  const t = useTT();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [link, setLink] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null); const [done, setDone] = useState(null);
  const load = useCallback(() => call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}&topups=1`).then(setData).catch(() => setData({ rows: [], summary: { total: 0, count: 0 } })), [sub]);
  useEffect(() => { load(); }, [load]);
  const enabled = canTopup || demo;
  async function submit(e) {
    e.preventDefault(); if (busy || !link.trim()) return; setBusy(true); setMsg(null);
    try { const r = await call('POST', '/api/tstore', { sub, action: 'topup', voucher: link }); setDone({ amount: r.amount, balance: r.balance }); setLink(''); onChange(); load(); }
    catch (x) { setMsg({ t: 'err', m: t(x.message) }); } finally { setBusy(false); }
  }
  if (open) {
    return (
      <div className="topup-rzx tp-page">
        <button type="button" className="tp-back" onClick={() => { setOpen(false); setDone(null); setMsg(null); }}>← {t('กลับไปหน้าเลือกช่องทาง')}</button>
        <div className="tp-card">
          <div className="tp-card-head">
            <span className="tp-card-ic tm"><img src="/uploads/payments/truemoney-gift.png" alt="" /></span>
            <div><h2>{t('เติมเงินด้วยซองอั่งเปา (TrueMoney)')}</h2><p>{t('วางลิงก์ซองของขวัญทรูมันนี่เพื่อเติมยอดเงินเข้ากระเป๋าของคุณ')}</p></div>
          </div>
          <div className="tp-card-body">
            {done ? (
              <div className="tp-done">
                <div className="tp-done-ico">✓</div><div className="tp-done-t">{t('เติมเงินสำเร็จ')}</div><div className="tp-done-amt">+{baht(done.amount)} ฿</div><div className="tp-done-s">{t('ยอดคงเหลือตอนนี้')} {baht(done.balance)} ฿</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}><a className="btn btn-primary" href="#/store">{t('ไปเลือกซื้อสินค้า')}</a><button className="btn" onClick={() => setDone(null)}>{t('เติมเพิ่ม')}</button></div>
              </div>
            ) : (
              <form className="tp-form" onSubmit={submit}>
                {demo && <div className="msg" style={{ margin: 0 }}>🧪 {t('ร้านทดลอง: วางลิงก์ซองรูปแบบใดก็ได้ จะได้เงินเดโม 100 ฿ ต่อครั้ง ไม่มีเงินจริง')}</div>}
                <label className="tp-label">{t('ลิงก์ซองของขวัญ')}</label>
                <input className="input tp-input" autoFocus value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." autoComplete="off" inputMode="url" autoCapitalize="none" spellCheck={false} />
                <button className="btn btn-primary tp-go" disabled={busy || !link.trim()}>{busy ? <><span className="spin" /> {t('กำลังตรวจสอบ...')}</> : t('เติมเงิน')}</button>
                {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
                <ul className="tp-tips"><li>{t('สร้างซองแบบ')} <b>{t('ผู้รับ 1 คน')}</b> {t('เท่านั้น')}</li><li>{t('ซองที่รับแล้วใช้ซ้ำไม่ได้')}</li><li>{t('ได้เครดิตเท่ายอดที่ TrueMoney ยืนยันว่าเข้าจริง')}</li></ul>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }
  const list = data?.rows || [];
  return (
    <div className="topup-rzx">
      <div className="topup-rzx-head"><div className="topup-rzx-eyebrow">WALLET</div><h2>{t('ช่องทางเติมเงิน')}</h2><p>{t('เลือกช่องทางที่สะดวก ระบบจะแจ้งรายละเอียดก่อนทำรายการทุกครั้ง')}</p></div>
      <div className="tp-stats">
        <div className="tp-stat main"><span>{t('ยอดเงินคงเหลือ')}</span><b>{baht(me.balance)} ฿</b></div>
        <div className="tp-stat"><span>{t('เติมแล้วทั้งหมด')}</span><b>{baht(data?.summary.total || 0)} ฿</b></div>
        <div className="tp-stat"><span>{t('จำนวนครั้ง')}</span><b>{data?.summary.count || 0}</b></div>
      </div>
      <div className="topup-rzx-methods">
        <button type="button" className={'topup-rzx-card' + (enabled ? '' : ' disabled')} disabled={!enabled} onClick={() => setOpen(true)}>
          <span className="topup-rzx-icon"><img src="/uploads/payments/truemoney-gift.png" alt="TrueMoney" /></span>
          <span className="topup-rzx-copy"><b>TrueMoney Gift</b><small>{t('เติมเงินผ่านซองทรูมันนี่')}</small>{enabled ? <em><i />{t('ไม่มีค่าธรรมเนียม')}</em> : <em className="off">{t('ร้านยังไม่เปิดรับเติมเงิน')}</em>}</span>
          <span className="topup-rzx-arrow">↗</span>
        </button>
      </div>
      <p className="topup-rzx-note">{t('กรุณาตรวจสอบยอดเงินให้ถูกต้องก่อนยืนยันรายการ')}</p>
      <div className="topup-rzx-history">
        <div className="topup-rzx-history-head"><h3>{t('ประวัติการเติมเงิน')}</h3></div>
        <div className="tp-list">
          {list.map((x) => { const st = TOPUP_ST[x.status] || ['', x.status]; return (
            <div key={x.id} className="tp-item">
              <span className="tp-ico tm">🎁</span>
              <div className="tp-main"><div className="tp-row1"><b>TrueMoney</b><span className={'tag ' + st[0]}>{t(st[1])}</span></div><div className="tp-row2">{dt(x.created_at)} · #{x.id}</div></div>
              <div className={'tp-amt' + (x.status === 'credited' ? ' plus' : ' dim')}>{x.status === 'credited' ? '+' : ''}{baht(x.amount)} ฿</div>
            </div>); })}
          {data && !list.length && <div className="tp-empty"><span>🪙</span>{t('ยังไม่มีรายการเติมเงิน')}<small>{t('เติมเงินครั้งแรกแล้วประวัติจะแสดงที่นี่')}</small></div>}
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ sub }) {
  const t = useTT();
  const [orders, setOrders] = useState(null);
  useEffect(() => { call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}&orders=1`).then((d) => setOrders(d.rows)).catch(() => setOrders([])); }, [sub]);
  if (orders === null) return <div className="muted">{t('กำลังโหลด…')}</div>;
  if (!orders.length) return <div className="empty">{t('ยังไม่มีออเดอร์')}</div>;
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
      {orders.map((o) => (
        <div className="panel" key={o.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><b>{t(o.product_name)} × {o.qty}</b><b>{baht(o.total)} ฿</b></div>
          <div className="subtle" style={{ fontSize: 13, margin: '2px 0 10px' }}>#{o.id} · {dt(o.created_at)}</div>
          <pre className="codebox" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflow: 'auto', margin: 0 }}>{o.delivered}</pre>
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => navigator.clipboard?.writeText(o.delivered)}>{t('คัดลอก')}</button>
        </div>
      ))}
    </div>
  );
}

function SecurityTab({ sub }) {
  const t = useTT();
  const [f, setF] = useState({ current: '', next: '' }); const [msg, setMsg] = useState(null);
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try { await call('POST', '/api/tstore', { sub, action: 'password', ...f }); setF({ current: '', next: '' }); setMsg({ t: 'ok', m: t('เปลี่ยนรหัสผ่านแล้ว') }); }
    catch (x) { setMsg({ t: 'err', m: t(x.message) }); }
  }
  return (
    <form className="panel" style={{ maxWidth: 440 }} onSubmit={save}>
      <h3 style={{ fontSize: 18 }}>{t('เปลี่ยนรหัสผ่าน')}</h3>
      <label className="label">{t('รหัสผ่านเดิม')}</label>
      <input className="input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
      <label className="label">{t('รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)')}</label>
      <input className="input" type="password" autoComplete="new-password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required />
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>{t('บันทึก')}</button>
    </form>
  );
}
