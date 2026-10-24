'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/components/api';
import { Mark, Emo } from './Logo';
import DiscordPreview from './DiscordPreview';
import { Aurora, Sparks, useSpotlight } from './Fx';

const GuildCtx = createContext('');
const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  store: 'M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M9 20v-6h6v6',
  cursor: 'M5 4l6 16 2.5-6.5L20 11z',
  chat: 'M4 5h16v11H9l-5 4z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  out: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
  sold: 'M4 12l5 5L20 6M4 20h16',
};
const Ico = ({ n, s = 18 }) => <svg className="hb-ic" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[n]} /></svg>;

const TABS = [
  ['overview', 'ภาพรวม', 'grid', 'สรุปร้านและขั้นตอนเริ่มต้น'],
  ['products', 'สินค้า & สต็อก', 'box', 'เพิ่มสินค้า เติมสต็อก ตั้งราคา'],
  ['shop', 'ตั้งค่าร้าน', 'store', 'ชื่อ สีธีม โลโก้ แบนเนอร์'],
  ['buttons', 'ปุ่มบนบอท', 'cursor', 'ชื่อและอีโมจิของปุ่มในแผง Discord'],
  ['discord', 'เซิร์ฟเวอร์ & บอท', 'chat', 'เลือกเซิร์ฟเวอร์ที่มีบอท แล้วตั้งค่าห้อง'],
  ['topup', 'เติมเงิน', 'coin', 'ตั้งเบอร์ TrueMoney รับเงิน'],
  ['api', 'API', 'code', 'ลิงก์เช็คสต็อกร้านของคุณ'],
];

function Copy({ text, label = 'คัดลอก' }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="hb-btn ghost sm" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}>{ok ? 'คัดลอกแล้ว ✓' : label}</button>;
}

function Modal({ onClose, wide, children }) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && cb.current();
    addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="hb-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'hb-modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

export default function Dashboard({ base = '/shop' }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const ver = useRef(0);
  const rootRef = useRef(null);
  useSpotlight(rootRef);

  const say = (msg, bad) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 2600); };
  const load = useCallback(async (force) => {
    try {
      const r = await api('/api/v1/shop/hub/me' + (!force && ver.current ? `?since=${ver.current}` : ''));
      if (r.unchanged) return;
      ver.current = r.shop?.version || 0;
      setD(r);
    } catch (e) {
      if (e.status === 401 || e.status === 403) location.href = `${base}/login`;
      else if (force) say(e.message, true);
    }
  }, [base]);
  // เรียลไทม์: ถามเซิร์ฟเวอร์ทุก 4 วินาที (ถ้าไม่มีอะไรเปลี่ยนจะได้คำตอบสั้นๆ)
  useEffect(() => {
    load(true);
    const t = setInterval(() => { if (!document.hidden) load(false); }, 4000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn, okMsg) => {
    try { await fn(); await load(true); if (okMsg) say(okMsg); return true; }
    catch (e) { say(e.message, true); return false; }
  };
  const logout = async () => { await api('/api/v1/shop/hub/auth/logout', 'POST', {}); location.href = `${base}/login`; };

  if (!d) return <div className="hb ready" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><div className="hb-loading"><Mark size={42} /><span>กำลังโหลด…</span></div></div>;
  const { shop, products, user } = d;
  const cur = TABS.find((t) => t[0] === tab) || TABS[0];

  return (
    <GuildCtx.Provider value={shop?.guild_id || ''}>
    <div className="hb ready" ref={rootRef}>
      <Aurora /><Sparks count={30} />
      <div className="hb-spot" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
      <div className="hb-app">
        <aside className="hb-sb">
          <a className="hb-brand" href={`${base}/login`}><Mark size={24} /><b>flexozy</b><span>.shop</span></a>
          {shop && (
            <nav className="hb-nav2" aria-label="เมนู">
              {TABS.map(([k, l, ic]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Ico n={ic} /><span>{l}</span></button>
              ))}
            </nav>
          )}
          <div className="hb-sb-foot">
            <div className="hb-user">
              {user.discord?.avatar ? <img src={user.discord.avatar} alt="" /> : <i>{String(user.name || '?').slice(0, 1)}</i>}
              <div><b>{user.name}</b><span>{user.discord?.username ? '@' + user.discord.username : 'Discord'}</span></div>
            </div>
            <button className="hb-ico-btn" onClick={logout} title="ออกจากระบบ" aria-label="ออกจากระบบ"><Ico n="logout" /></button>
          </div>
        </aside>

        <main className="hb-main">
          {!shop ? <CreateShop run={run} d={d} /> : (
            <>
              <header className="hb-pagehead">
                <div>
                  <h1>{cur[1]}</h1>
                  <p>{cur[3]}</p>
                </div>
                <div className="hb-linkchip">
                  <Ico n="link" s={15} /><code>{d.urls.page.replace(/^https?:\/\//, '')}</code>
                  <Copy text={d.urls.page} label="คัดลอก" />
                  <a className="hb-btn sm" href={d.urls.page} target="_blank" rel="noreferrer">เปิดร้าน <Ico n="out" s={14} /></a>
                </div>
              </header>
              {!shop.active && <div className="hb-alert bad">ร้านนี้ถูกระงับโดยผู้ดูแลระบบ</div>}
              <div className="hb-tabbody" key={tab}>

              {tab === 'overview' && <Overview shop={shop} products={products} d={d} go={setTab} />}
              {tab === 'products' && <ProductsTab products={products} limits={d.limits} fee={d.fee} run={run} say={say} />}
              {tab === 'shop' && <section className="hb-pn"><ShopTab shop={shop} d={d} run={run} /></section>}
              {tab === 'buttons' && (
                <div className="hb-cols">
                  <section className="hb-pn"><ButtonsTab shop={shop} run={run} /></section>
                  <aside className="hb-pn hb-prev"><p className="hb-sub">พรีวิวแผงใน Discord (อัปเดตสด)</p><DiscordPreview shop={shop} products={products} /></aside>
                </div>
              )}
              {tab === 'discord' && <section className="hb-pn"><DiscordTab shop={shop} d={d} run={run} /></section>}
              {tab === 'topup' && <section className="hb-pn"><TopupTab shop={shop} run={run} /></section>}
              {tab === 'api' && <section className="hb-pn"><ApiTab d={d} shop={shop} /></section>}
              </div>
              
            </>
          )}
        </main>
      </div>
      {toast && <div className={'hb-toast' + (toast.bad ? ' bad' : '')} role="status">{toast.msg}</div>}
    </div>
    </GuildCtx.Provider>
  );
}

function CreateShop({ run, d }) {
  const [name, setName] = useState(d?.user?.discord?.name || '');
  const [want] = useState(() => { try { return localStorage.getItem('hb-claim') || ''; } catch { return ''; } });
  const slug = want || d?.suggestedSlug || 'ชื่อ-discord';
  return (
    <div className="hb-create">
      <div className="hb-create-card">
        <div className="hb-create-av">{d.user.discord?.avatar ? <img src={d.user.discord.avatar} alt="" /> : <Mark size={40} />}</div>
        <h2>สร้างร้านของคุณ</h2>
        <p>ยินดีต้อนรับ <b>{d.user.name}</b> — ตั้งชื่อร้านแล้วเริ่มขายผ่านบอท Discord ได้เลย</p>
        <div className="hb-slugbox"><span>ลิงก์ร้านของคุณ</span><code>flexozy.site/<b>{slug}</b></code><em>{want ? 'ชื่อที่คุณเลือกจากหน้าแรก (ถ้าถูกใช้แล้วจะแจ้งให้เปลี่ยน)' : 'สร้างจากชื่อ Discord อัตโนมัติ'}</em></div>
        <label className="hb-fl">ชื่อร้าน<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อร้านที่แสดง" maxLength={40} /></label>
        <button className="hb-go wide" onClick={() => run(() => api('/api/v1/shop/hub/shop', 'POST', { name, slug: want || undefined }).then((r) => { try { localStorage.removeItem('hb-claim'); } catch {} return r; }), 'สร้างร้านแล้ว')}>สร้างร้าน <span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}

function Overview({ shop, products, d, go }) {
  const stock = products.reduce((a, p) => a + p.stock, 0);
  const sold = products.reduce((a, p) => a + p.sold, 0);
  const out = products.filter((p) => p.active && p.stock === 0).length;
  const bot = shop.guild_verified && shop.bot_in_guild;
  const steps = [
    [products.length > 0, 'เพิ่มสินค้าชิ้นแรก', 'ตั้งชื่อ ราคา และอีโมจิ', 'products'],
    [stock > 0, 'เติมสต็อกสินค้า', 'วางคีย์/ไอดีพาส 1 บรรทัด = 1 ชิ้น', 'products'],
    [bot, 'เชื่อมบอท Discord', 'ใส่ไอดีเซิร์ฟเวอร์และห้อง บอทสร้างแผงร้านให้เอง', 'discord'],
  ];
  const stats = [
    ['box', 'สินค้าทั้งหมด', `${products.length}/${d.limits.products}`],
    ['coin', 'สต็อกคงเหลือ', stock.toLocaleString('th-TH')],
    ['sold', 'ขายแล้ว', sold.toLocaleString('th-TH')],
    ['cursor', 'สินค้าหมด', String(out), out ? 'warn' : ''],
  ];
  return (
    <div className="hb-cols">
      <div className="hb-stack">
        <section className="hb-hero2" style={{ '--c': shop.color, backgroundImage: shop.banner ? `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.82)),url(${shop.banner})` : undefined }}>
          {shop.logo ? <img src={shop.logo} alt="" /> : <i>{shop.name.slice(0, 1).toUpperCase()}</i>}
          <div>
            <h2>{shop.name}</h2>
            <p>{shop.tagline || 'ยังไม่มีคำอธิบายร้าน — ตั้งได้ที่ “ตั้งค่าร้าน”'}</p>
          </div>
          <span className={'hb-badge ' + (bot ? 'ok' : 'warn')}>{bot ? 'บอทพร้อมใช้งาน' : 'รอเชื่อมบอท'}</span>
        </section>

        <div className="hb-stats">
          {stats.map(([ic, l, v, c]) => (
            <div key={l} className={'hb-stat ' + (c || '')}><span className="ic"><Ico n={ic} /></span><b>{v}</b><em>{l}</em></div>
          ))}
        </div>

        <section className="hb-pn">
          <h3 className="hb-h">เริ่มต้นใช้งาน</h3>
          <div className="hb-steps">
            {steps.map(([ok, t, s, to], i) => (
              <button key={t} className={ok ? 'done' : ''} onClick={() => go(to)}>
                <span className="n">{ok ? <Ico n="check" s={16} /> : i + 1}</span>
                <span className="tx"><b>{t}</b><em>{s}</em></span>
                <span className="go">{ok ? 'เรียบร้อย' : 'ไปทำเลย →'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <aside className="hb-pn hb-prev">
        <p className="hb-sub">พรีวิวแผงใน Discord (อัปเดตสด)</p>
        <DiscordPreview shop={shop} products={products} />
      </aside>
    </div>
  );
}

function ImageField({ label, kind, shop, run }) {
  const url = shop[kind + '_url'];
  const [v, setV] = useState(url && url !== 'upload' ? url : '');
  const file = useRef(null);
  const upload = (f) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => run(() => api('/api/v1/shop/hub/media', 'POST', { kind, data: r.result }), 'อัปโหลดแล้ว');
    r.readAsDataURL(f);
  };
  return (
    <label>{label}
      <div className="hb-row">
        <input className="grow" style={{ flex: '1 1 200px' }} value={v} onChange={(e) => setV(e.target.value)} placeholder="https://… หรืออัปโหลดไฟล์" />
        <button type="button" className="hb-btn ghost sm" onClick={() => run(() => api('/api/v1/shop/hub/shop', 'PUT', { [kind + '_url']: v }), 'บันทึกรูปแล้ว')}>ใช้ลิงก์</button>
        <button type="button" className="hb-btn ghost sm" onClick={() => file.current.click()}>อัปโหลด</button>
        {url && <button type="button" className="hb-btn danger sm" onClick={() => { setV(''); run(() => api('/api/v1/shop/hub/media/' + kind, 'DELETE'), 'ลบรูปแล้ว'); }}>ลบ</button>}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { upload(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </label>
  );
}

function ShopTab({ shop, run }) {
  const [f, setF] = useState({ name: shop.name, tagline: shop.tagline, color: shop.color, is_public: shop.is_public });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  return (
    <div className="hb-f">
      <div className="hb-two">
        <label>ชื่อร้าน<input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} /></label>
        <label>สีธีม<div className="hb-row"><input type="color" value={f.color} onChange={(e) => set('color', e.target.value)} /><code>{f.color}</code></div></label>
      </div>
      <label>คำอธิบายสั้นๆ<input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} placeholder="เช่น ขายไอดีเกม ส่งออโต้ 24 ชม." /></label>
      <ImageField label="โลโก้ร้าน (รูปสี่เหลี่ยมจัตุรัส)" kind="logo" shop={shop} run={run} />
      <ImageField label="แบนเนอร์" kind="banner" shop={shop} run={run} />
      <label className="hb-row" style={{ flexDirection: 'row' }}><input type="checkbox" checked={f.is_public} onChange={(e) => set('is_public', e.target.checked)} />แสดงร้านในรายการสาธารณะ (/api/v1/shop) — ปิดแล้วลิงก์ร้านยังเปิดได้</label>
      <div><button className="hb-btn" onClick={() => run(() => api('/api/v1/shop/hub/shop', 'PUT', f), 'บันทึกแล้ว')}>บันทึก</button></div>
    </div>
  );
}


/* ---------- สินค้า & สต็อก (เหมือนหลังบ้านเว็บหลัก) ---------- */
function ProductModal({ p, onClose, run }) {
  const isNew = !p;
  const [f, setF] = useState({ name: p?.name || '', price: p ? Number(p.price) / 100 : '', emoji: p?.emoji || '', description: p?.description || '', active: p ? p.active : true });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setBusy(true);
    const ok = await run(() => (isNew ? api('/api/v1/shop/hub/products', 'POST', f) : api('/api/v1/shop/hub/products/' + p.id, 'PUT', f)), isNew ? 'เพิ่มสินค้าแล้ว' : 'บันทึกสินค้าแล้ว');
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal onClose={onClose}>
      <div className="hb-mh"><h3>{isNew ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า'}</h3><button className="hb-x" onClick={onClose} aria-label="ปิด">✕</button></div>
      <div className="hb-f">
        <label>ชื่อสินค้า<input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} placeholder="เช่น คีย์ VIP 30 วัน" autoFocus /></label>
        <div className="hb-two">
          <label>ราคา (บาท)<input type="number" min="0.01" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="59" /></label>
          <label>อีโมจิ<div className="hb-row"><input style={{ flex: 1, minWidth: 0 }} value={f.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🔥 หรือ <:vip:123…>" /><Emo v={f.emoji} size={24} /></div><EmojiPicker onPick={(v) => set('emoji', v)} /></label>
        </div>
        <label>รายละเอียด<input value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={300} placeholder="รายละเอียดสั้นๆ (ไม่บังคับ)" /></label>
        <label className="hb-check"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /><span>แสดงสินค้านี้ในร้าน</span></label>
        <button className="hb-go wide" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : isNew ? 'เพิ่มสินค้า' : 'บันทึก'}</button>
      </div>
    </Modal>
  );
}

function StockModal({ pid, products, limits, run, say, onClose }) {
  const p = products.find((x) => x.id === pid);
  const [items, setItems] = useState(null);
  const [lines, setLines] = useState('');
  const [find, setFind] = useState('');
  const [msg, setMsg] = useState(null);
  const file = useRef(null);
  const loadItems = useCallback(async () => {
    try { setItems((await api(`/api/v1/shop/hub/products/${pid}/stock`)).items); } catch (e) { say(e.message, true); }
  }, [pid]); // eslint-disable-line
  useEffect(() => { loadItems(); }, [loadItems, p?.stock]);
  if (!p) return null;

  const list = [...new Set(lines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
  const over = list.length > limits.stockPerAdd;
  const add = async () => {
    setMsg(null);
    try {
      const r = await api(`/api/v1/shop/hub/products/${pid}/stock`, 'POST', { lines });
      setLines(''); setMsg({ t: 'ok', m: `เพิ่ม ${r.added} รายการแล้ว` });
      await run(async () => {});
    } catch (e) { setMsg({ t: 'err', m: e.message }); }
  };
  const readFile = (f) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLines((o) => (o ? o.replace(/\s+$/, '') + '\n' : '') + String(r.result || ''));
    r.readAsText(f);
  };
  const shown = (items || []).filter((it) => !find || it.content.toLowerCase().includes(find.toLowerCase()));
  return (
    <Modal onClose={onClose} wide>
      <div className="hb-mh"><div><h3>สต็อก: {p.name}</h3><span className="hb-sub" style={{ margin: 0 }}>ขายแล้ว {p.sold} · เหลือ {p.stock}</span></div><button className="hb-x" onClick={onClose} aria-label="ปิด">✕</button></div>
      <div className="hb-f">
        <p className="hb-sub" style={{ margin: 0 }}>1 บรรทัด = 1 ชิ้นที่ส่งให้ลูกค้า (คีย์/โค้ด/ไอดีพาส) เพิ่มได้ครั้งละไม่เกิน {limits.stockPerAdd} บรรทัด · บรรทัดซ้ำในชุดเดียวกันจะถูกตัดออกอัตโนมัติ</p>
        <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={6} placeholder={'KEY-AAAA\nKEY-BBBB\nไอดี:รหัสผ่าน'} />
        <div className="hb-row">
          <button className="hb-go" onClick={add} disabled={!list.length || over}><Ico n="plus" s={16} /> เพิ่มสต็อก {list.length > 0 && `(${list.length})`}</button>
          <input ref={file} type="file" accept=".txt,.csv,text/plain" hidden onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="hb-btn ghost sm" type="button" onClick={() => file.current?.click()}><Ico n="upload" s={15} /> นำเข้าจากไฟล์ .txt</button>
          {over && <span className="hb-badge bad">เกิน {limits.stockPerAdd} บรรทัด</span>}
        </div>
        {msg && <div className={'hb-alert ' + (msg.t === 'ok' ? 'ok' : 'bad')}>{msg.m}</div>}

        <div className="hb-split">
          <b>ยังไม่ขาย ({p.stock})</b>
          <input className="hb-find" value={find} onChange={(e) => setFind(e.target.value)} placeholder="ค้นหาในสต็อก…" />
          {p.stock > 0 && <button className="hb-btn danger sm" onClick={() => confirm('ลบสต็อกที่ยังไม่ขายทั้งหมดของสินค้านี้?') && run(() => api(`/api/v1/shop/hub/products/${pid}/stock`, 'DELETE'), 'ล้างสต็อกแล้ว')}>ลบทั้งหมด</button>}
        </div>
        <div className="hb-stock-list">
          {items === null ? <div><span>กำลังโหลด…</span></div> : shown.length === 0 ? <div><span>{find ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีสต็อก'}</span></div> : shown.map((it) => (
            <div key={it.id}><span>{it.content}</span><button onClick={() => run(() => api('/api/v1/shop/hub/stock/' + it.id, 'DELETE'))} aria-label="ลบ">ลบ</button></div>
          ))}
          {items && p.stock > items.length && !find && <div className="more"><span>แสดง {items.length} รายการแรก</span></div>}
        </div>
      </div>
    </Modal>
  );
}

function ProductsTab({ products, limits, fee, run, say }) {
  const [edit, setEdit] = useState(null); // null | 'new' | product
  const [stockId, setStockId] = useState(null);
  const full = products.length >= limits.products;
  return (
    <section className="hb-pn">
      <div className="hb-split top">
        <div><h3 className="hb-h">สินค้า ({products.length}/{limits.products})</h3>
          <p className="hb-sub" style={{ margin: 0 }}>ผู้ซื้อจ่ายจากกระเป๋าเงินเดียวกับ flexozy.site รายได้เข้ากระเป๋าของคุณทันที{fee ? ` (หักค่าธรรมเนียม ${fee}%)` : ''}</p></div>
        <button className="hb-go" onClick={() => setEdit('new')} disabled={full}><Ico n="plus" s={16} /> เพิ่มสินค้า</button>
      </div>

      {products.length === 0 ? (
        <div className="hb-empty"><Ico n="box" s={34} /><b>ยังไม่มีสินค้า</b><span>กด “เพิ่มสินค้า” เพื่อเริ่มต้น แล้วเติมสต็อกให้พร้อมขาย</span></div>
      ) : (
        <div className="hb-tblwrap">
          <table className="hb-tbl">
            <thead><tr><th></th><th>ชื่อ</th><th>ราคา</th><th>สต็อก</th><th>ขายแล้ว</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><span className="hb-em"><Emo v={p.emoji} size={22} />{!p.emoji && '🛍️'}</span></td>
                  <td className="nm"><b>{p.name}</b>{p.description && <span>{p.description}</span>}</td>
                  <td className="pr">฿{baht(p.price)}</td>
                  <td><button className={'hb-stk ' + (p.stock === 0 ? 'bad' : p.stock <= 3 ? 'warn' : 'ok')} onClick={() => setStockId(p.id)}>{p.stock} · จัดการ</button></td>
                  <td>{p.sold}</td>
                  <td><span className={'hb-badge ' + (p.active ? 'ok' : '')}>{p.active ? 'แสดง' : 'ซ่อน'}</span></td>
                  <td className="act">
                    <button className="hb-ico-btn" onClick={() => setEdit(p)} title="แก้ไข" aria-label="แก้ไข"><Ico n="edit" s={16} /></button>
                    <button className="hb-ico-btn danger" onClick={() => confirm(`ลบ “${p.name}” และสต็อกทั้งหมด?`) && run(() => api('/api/v1/shop/hub/products/' + p.id, 'DELETE'), 'ลบแล้ว')} title="ลบ" aria-label="ลบ"><Ico n="trash" s={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ProductModal p={edit === 'new' ? null : edit} onClose={() => setEdit(null)} run={run} />}
      {stockId && <StockModal pid={stockId} products={products} limits={limits} run={run} say={say} onClose={() => setStockId(null)} />}
    </section>
  );
}

const BTN_NAMES = { buy: 'เมนูเลือกซื้อสินค้า', stock: 'ปุ่มเช็คสต็อก', balance: 'ปุ่มดูยอดเงิน', topup: 'ปุ่มเติมเงิน' };
function ButtonsTab({ shop, run }) {
  const [b, setB] = useState(shop.buttons);
  const set = (k, f, v) => setB((o) => ({ ...o, [k]: { ...o[k], [f]: v } }));
  return (
    <div className="hb-f">
      <p className="hb-sub" style={{ margin: 0 }}>ตั้งชื่อและอีโมจิของปุ่มในแผง Discord (กด “เลือกอีโมจิจากเซิร์ฟเวอร์” เพื่อใช้อีโมจิเคลื่อนไหวของเซิร์ฟเวอร์คุณได้เลย — ต้องเชื่อมเซิร์ฟเวอร์ที่แท็บ “เซิร์ฟเวอร์ & บอท” ก่อน)</p>
      {Object.keys(BTN_NAMES).map((k) => (
        <div className="hb-two" key={k}>
          <label>{BTN_NAMES[k]}<input value={b[k].label} onChange={(e) => set(k, 'label', e.target.value)} maxLength={40} /></label>
          <label>อีโมจิ<div className="hb-row"><input style={{ flex: 1, minWidth: 0 }} value={b[k].emoji} onChange={(e) => set(k, 'emoji', e.target.value)} /><Emo v={b[k].emoji} size={22} /></div><EmojiPicker onPick={(v) => set(k, 'emoji', v)} /></label>
        </div>
      ))}
      <div><button className="hb-btn" onClick={() => run(() => api('/api/v1/shop/hub/shop', 'PUT', { buttons: b }), 'บันทึกปุ่มแล้ว — บอทจะอัปเดตแผงในไม่กี่วินาที')}>บันทึกปุ่ม</button></div>
    </div>
  );
}

/* เลือกอีโมจิจากเซิร์ฟเวอร์ที่เชื่อมไว้ (รวมอีโมจิเคลื่อนไหว) — ดึงผ่านบอท */
const emojiCache = {};
function EmojiPicker({ onPick }) {
  const gid = useContext(GuildCtx);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open || !gid || emojiCache[gid]) { if (emojiCache[gid]) setList(emojiCache[gid]); return; }
    api(`/api/v1/shop/hub/guilds/${gid}`).then((r) => { emojiCache[gid] = r.emojis; setList(r.emojis); }).catch((e) => setErr(e.message));
  }, [open, gid]);
  if (!gid) return <small className="hb-sub" style={{ margin: '6px 0 0' }}>เชื่อมเซิร์ฟเวอร์ก่อนเพื่อใช้อีโมจิของเซิร์ฟเวอร์</small>;
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" className="hb-btn ghost sm" onClick={() => setOpen(!open)}>{open ? 'ปิด' : '😀 เลือกอีโมจิจากเซิร์ฟเวอร์'}</button>
      {open && (err ? <div className="hb-alert bad">{err}</div> : !list ? <p className="hb-sub">กำลังโหลดอีโมจิ…</p> : !list.length ? <p className="hb-sub">เซิร์ฟเวอร์นี้ยังไม่มีอีโมจิกำหนดเอง</p> : (
        <div className="hb-eg" style={{ marginTop: 8 }}>
          {list.map((e) => (
            <button type="button" key={e.id} title={`:${e.name}:${e.animated ? ' (เคลื่อนไหว)' : ''}`} onClick={() => { onPick(e.value); setOpen(false); }}>
              <img src={e.url} alt={e.name} loading="lazy" />{e.animated && <em>GIF</em>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function DiscordTab({ shop, d, run }) {
  const [gl, setGl] = useState(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(shop.guild_id || '');
  const [chs, setChs] = useState(null);
  const [c, setC] = useState(shop.channel_id || '');
  useEffect(() => {
    api('/api/v1/shop/hub/guilds').then(setGl).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    setChs(null);
    if (!sel) return;
    api(`/api/v1/shop/hub/guilds/${sel}`).then((r) => setChs(r.channels)).catch(() => setChs([]));
  }, [sel]);
  const st = !shop.guild_id ? ['warn', 'ยังไม่ได้เลือกเซิร์ฟเวอร์']
    : !shop.bot_in_guild ? ['warn', 'รอบอทตรวจสอบเซิร์ฟเวอร์']
    : !shop.guild_verified ? ['bad', shop.bot_note || 'ยังไม่ผ่านการตรวจสิทธิ์']
    : ['ok', `เชื่อมแล้ว${shop.guild_name ? ` · ${shop.guild_name}` : ''}`];
  const invite = (id) => d.inviteUrl ? `${d.inviteUrl}${id ? `&guild_id=${id}&disable_guild_select=true` : ''}` : '';
  return (
    <div className="hb-f">
      <div className="hb-row" style={{ justifyContent: 'space-between' }}>
        <p className="hb-sub" style={{ margin: 0 }}>เซิร์ฟเวอร์ที่คุณเป็นเจ้าของ หรือมีสิทธิ์ Manage Server — เรียงเซิร์ฟเวอร์ที่มีบอทอยู่ไว้ก่อน</p>
        <span className={'hb-badge ' + st[0]}>{st[1]}</span>
      </div>
      {err && <div className="hb-alert bad">{err} {err.includes('ล็อกอิน') && <a className="hb-btn sm" href="#" onClick={(e) => { e.preventDefault(); api('/api/v1/shop/hub/auth/logout', 'POST', {}).then(() => { location.href = '/shop/login'; }); }}>ล็อกอินใหม่</a>}</div>}
      {!gl && !err && <p className="hb-sub">กำลังโหลดเซิร์ฟเวอร์ของคุณ…</p>}
      {gl && !gl.guilds.length && <p className="hb-sub">ไม่พบเซิร์ฟเวอร์ที่คุณจัดการได้</p>}
      {gl && (
        <div className="hb-gl">
          {gl.guilds.map((g) => (
            <button key={g.id} type="button" className={'hb-g' + (sel === g.id ? ' on' : '')} onClick={() => { setSel(g.id); setC(g.id === shop.guild_id ? shop.channel_id || '' : ''); }}>
              {g.icon ? <img src={g.icon} alt="" /> : <i>{g.name.slice(0, 1)}</i>}
              <div><b>{g.name}</b><small className={g.bot ? 'ok' : ''}>{g.bot === true ? '● บอทอยู่ในเซิร์ฟเวอร์แล้ว' : g.bot === false ? 'ยังไม่มีบอท' : 'ไม่ทราบสถานะบอท'}</small></div>
            </button>
          ))}
        </div>
      )}
      {sel && gl && (() => {
        const g = gl.guilds.find((x) => x.id === sel);
        const hasBot = g?.bot !== false;
        return hasBot ? (
          <>
            <label>ห้องที่ให้บอทโพสต์แผงร้าน
              {chs === null ? <input disabled placeholder="กำลังโหลดห้อง…" /> : chs.length ? (
                <select value={c} onChange={(e) => setC(e.target.value)}>
                  <option value="">— เลือกห้อง —</option>
                  {chs.map((x) => <option key={x.id} value={x.id}>#{x.name}</option>)}
                </select>
              ) : <input value={c} onChange={(e) => setC(e.target.value.trim())} placeholder="ไอดีห้อง (โหลดรายชื่อห้องไม่ได้)" inputMode="numeric" />}
            </label>
            <div className="hb-row"><button className="hb-btn" disabled={!c} onClick={() => run(() => api('/api/v1/shop/hub/shop', 'PUT', { guild_id: sel, channel_id: c }), 'บันทึกแล้ว — บอทจะสร้างไฟล์และแผงร้านให้อัตโนมัติ')}>บันทึกและเชื่อมบอท</button></div>
          </>
        ) : (
          <div className="hb-alert">บอทยังไม่ได้อยู่ใน <b>{g.name}</b> {invite(sel) ? <a className="hb-btn sm" href={invite(sel)} target="_blank" rel="noreferrer">เชิญบอทเข้าเซิร์ฟเวอร์นี้ ↗</a> : <span className="hb-badge warn">ผู้ดูแลยังไม่ได้ตั้งค่า BOT_CLIENT_ID</span>}</div>
        );
      })()}
      <p className="hb-sub" style={{ margin: 0 }}>เมื่อบันทึก ระบบจะส่งข้อมูลร้านไปที่บอทผ่าน API <code>/api/v1/shop</code> บอทจะสร้างไฟล์ข้อมูลของเซิร์ฟเวอร์และโพสต์แผงร้านเอง{shop.bot_seen_at ? ` · บอทเช็กล่าสุด ${new Date(shop.bot_seen_at).toLocaleTimeString('th-TH')}` : ''}</p>
    </div>
  );
}

function TopupTab({ shop, run }) {
  const [ph, setPh] = useState(shop.topup_phone || '');
  const [on, setOn] = useState(shop.topup_enabled);
  const ok = /^0\d{9}$/.test(ph.replace(/[\s-]/g, ''));
  return (
    <div className="hb-f">
      <p className="hb-sub" style={{ margin: 0 }}>ตั้งเบอร์ TrueMoney Wallet ของร้านคุณ — ปุ่ม “{shop.buttons.topup.label}” บนแผง Discord จะให้ลูกค้าส่งลิงก์ซองของขวัญ แล้วบอทรับซองเข้าเบอร์นี้ให้อัตโนมัติ</p>
      <label>เบอร์ TrueMoney รับเงิน<input value={ph} onChange={(e) => setPh(e.target.value.replace(/[^\d]/g, '').slice(0, 10))} placeholder="0812345678" inputMode="numeric" /></label>
      <label className="hb-row" style={{ flexDirection: 'row' }}><input type="checkbox" checked={on} disabled={!ok} onChange={(e) => setOn(e.target.checked)} />เปิดปุ่มเติมเงินในร้านนี้</label>
      <div className="hb-row">
        <button className="hb-btn" disabled={ph !== '' && !ok} onClick={() => run(() => api('/api/v1/shop/hub/shop', 'PUT', { topup_phone: ph, topup_enabled: ok && on }), 'บันทึกการตั้งค่าเติมเงินแล้ว')}>บันทึก</button>
        <span className={'hb-badge ' + (shop.topup_enabled ? 'ok' : 'warn')}>{shop.topup_enabled ? `เปิดอยู่ · ${shop.topup_phone}` : 'ปิดอยู่'}</span>
      </div>
    </div>
  );
}

function ApiTab({ d, shop }) {
  const ex = `curl ${d.urls.api}`;
  return (
    <div className="hb-f">
      <p className="hb-sub" style={{ margin: 0 }}>เช็คสต็อกร้านของคุณจากที่ไหนก็ได้ (เปิด CORS ไว้แล้ว) — ใส่ <code>?since={shop.version}</code> เพื่อถามว่ามีอะไรเปลี่ยนไหม</p>
      <div className="hb-code">{d.urls.api}<Copy text={d.urls.api} /></div>
      <div className="hb-code">{ex}<Copy text={ex} /></div>
      <div className="hb-code">{d.urls.page}<Copy text={d.urls.page} /></div>
    </div>
  );
}
