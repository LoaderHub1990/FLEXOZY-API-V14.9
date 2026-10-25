'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/components/api';
import { Mark, Emo } from './Logo';
import DiscordPreview from './DiscordPreview';
import { Backdrop, Cursor, Icon, ToastProvider, useToast, Switch, Tabs, Select, Modal, CopyBtn } from './Fx';

const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const GuildCtx = createContext('');
const AskCtx = createContext(() => {});

const TABS = [
  ['overview', 'ภาพรวม', 'grid', 'สรุปร้านและขั้นตอนเริ่มต้น'],
  ['products', 'สินค้า & สต็อก', 'box', 'เพิ่มสินค้า เติมสต็อก ตั้งราคา'],
  ['settings', 'ตั้งค่าร้าน', 'palette', 'ชื่อ สีธีม รูป และปุ่มบนบอท — แก้แล้วเห็นผลแบบ Discord ทันที'],
  ['discord', 'เซิร์ฟเวอร์ & บอท', 'chat', 'เลือกเซิร์ฟเวอร์ที่มีบอท แล้วตั้งค่าห้อง'],
  ['topup', 'เติมเงิน', 'wallet', 'ตั้งเบอร์ TrueMoney รับเงินจากลูกค้า'],
];

/* ---------- เบอร์โทร: รับ 081-234-5678 / +66 81 234 5678 / 66812345678 แล้วแปลงเป็น 0812345678 ---------- */
const PHONE_OK = /^0\d{9}$/;
function toLocalDigits(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (/^\s*\+?66/.test(String(raw)) && d.startsWith('66')) d = '0' + d.slice(2);
  return d.slice(0, 10);
}
const fmtPhone = (d) => (d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d);

/* ---------- ดึงห้อง/อีโมจิของเซิร์ฟเวอร์ (แคชไว้ ไม่ยิงซ้ำ) ---------- */
const guildCache = new Map();
function guildInfo(gid, force) {
  if (force) guildCache.delete(gid);
  if (!guildCache.has(gid)) {
    const p = api(`/api/v1/shop/hub/guilds/${gid}`).catch((e) => { guildCache.delete(gid); throw e; });
    guildCache.set(gid, p);
  }
  return guildCache.get(gid);
}

export default function Dashboard({ base = '/shop' }) {
  return (
    <ToastProvider>
      <Inner base={base} />
    </ToastProvider>
  );
}

function Inner({ base }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('overview');
  const [ask, setAsk] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const ver = useRef(0);
  const seq = useRef(0);
  const logoutRef = useRef(false);

  // แท็บจำไว้ใน #hash → รีเฟรช/แชร์ลิงก์แล้วกลับมาแท็บเดิม
  useEffect(() => {
    const h = location.hash.slice(1);
    if (TABS.some((t) => t[0] === h)) setTab(h);
    const onHash = () => { const x = location.hash.slice(1); if (TABS.some((t) => t[0] === x)) setTab(x); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((k) => {
    setTab(k);
    try { history.replaceState(null, '', '#' + k); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const load = useCallback(async (force) => {
    const my = ++seq.current;
    try {
      const r = await api('/api/v1/shop/hub/me' + (!force && ver.current ? `?since=${ver.current}` : ''));
      if (my !== seq.current && !force) return; // คำตอบเก่าที่มาช้ากว่า ไม่ทับของใหม่
      if (r.unchanged) return;
      ver.current = r.shop?.version || 0;
      setD(r);
    } catch (e) {
      if (e.status === 401 || e.status === 403) { if (!logoutRef.current) location.href = `${base}/login`; }
      else if (force) toast.bad('โหลดข้อมูลไม่สำเร็จ', e.message);
    }
  }, [base, toast]);

  useEffect(() => {
    load(true);
    const t = setInterval(() => { if (!document.hidden) load(false); }, 4000);
    const vis = () => { if (!document.hidden) load(false); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  // ทำงานแล้วรีโหลดข้อมูล + แจ้งผล (คืน true/false)
  const run = useCallback(async (fn, okTitle, okMsg) => {
    try { await fn(); await load(true); if (okTitle) toast.ok(okTitle, okMsg); return true; }
    catch (e) { toast.bad('ไม่สำเร็จ', e.message); return false; }
  }, [load, toast]);

  const logout = async () => {
    if (logoutRef.current) return;
    logoutRef.current = true; setLoggingOut(true);
    try { await api('/api/auth/logout', 'POST', {}); } catch {}
    location.href = `${base}/login`;
  };

  if (!d) return (
    <div className="hb"><Backdrop /><div className="loading"><div><span className="h-spin" /><span>กำลังโหลด…</span></div></div></div>
  );
  const { shop, products, user } = d;
  const cur = TABS.find((t) => t[0] === tab) || TABS[0];
  const stock = products.reduce((a, p) => a + p.stock, 0);
  const botOk = !!(shop && shop.guild_verified && shop.bot_in_guild);
  const done = shop ? [products.length > 0, stock > 0, botOk].filter(Boolean).length : 0;
  const status = !shop ? 'IDLE • ยังไม่ได้สร้างร้าน' : botOk ? 'ONLINE • บอทพร้อมใช้งาน' : 'IDLE • รอเชื่อมบอท';

  return (
    <GuildCtx.Provider value={shop?.guild_id || ''}>
      <AskCtx.Provider value={setAsk}>
        <div className="hb">
          <Backdrop /><Cursor />
          <div className="dash">
            <header className="dock rim">
              <div className={'dock-av' + (botOk ? ' run' : '')}>
                {user.discord?.avatar ? <img src={user.discord.avatar} alt="" /> : <i>{String(user.name || '?').slice(0, 1)}</i>}
              </div>
              <div className="dock-tx">
                <b>{shop?.name || 'Flexozy Shop'}</b>
                <span className={botOk ? 'on' : ''}>{status}</span>
              </div>
              <div className="dock-act">
                {shop && <a className="ibtn rp" href={d.urls.page} target="_blank" rel="noreferrer" title="เปิดหน้าร้าน" aria-label="เปิดหน้าร้าน"><Icon n="out" s={17} /></a>}
                <button type="button" className="ibtn rp" onClick={logout} disabled={loggingOut} title="ออกจากระบบ" aria-label="ออกจากระบบ"><Icon n="logout" s={17} /></button>
              </div>
              <div className="dock-prog"><i className={done === 3 ? 'full' : ''} style={{ width: `${(done / 3) * 100}%` }} /></div>
            </header>

            {!shop ? <CreateShop d={d} run={run} /> : (
              <>
                <div className="dash-nav"><Tabs tabs={TABS} value={tab} onChange={go} /></div>
                <div className="pagehead">
                  <div><h1>{cur[1]}</h1><p>{cur[3]}</p></div>
                  <div className="linkchip rim">
                    <Icon n="link" s={15} /><code>{d.urls.page.replace(/^https?:\/\//, '')}</code>
                    <CopyBtn text={d.urls.page} className="h-btn ghost sm" />
                  </div>
                </div>
                {!shop.active && <div className="alert bad" style={{ marginBottom: 16 }}><Icon n="warn" s={18} />ร้านนี้ถูกระงับโดยผู้ดูแลระบบ</div>}

                <div className="view" key={tab}>
                  {tab === 'overview' && <Overview shop={shop} products={products} d={d} go={go} stock={stock} botOk={botOk} />}
                  {tab === 'products' && <ProductsTab products={products} limits={d.limits} fee={d.fee} run={run} />}
                  {tab === 'settings' && <SettingsTab shop={shop} products={products} run={run} />}
                  {tab === 'discord' && <DiscordTab shop={shop} d={d} run={run} />}
                  {tab === 'topup' && <TopupTab shop={shop} products={products} run={run} />}
                </div>
              </>
            )}
          </div>
          {ask && <Confirm q={ask} onClose={() => setAsk(null)} />}
        </div>
      </AskCtx.Provider>
    </GuildCtx.Provider>
  );
}

function Confirm({ q, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} icon={q.danger ? 'trash' : 'warn'} title={q.title} sub={q.msg}>
      {(close) => (
        <div className="h-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="h-btn ghost" onClick={close}>ยกเลิก</button>
          <button type="button" className={'h-btn rp ' + (q.danger ? 'danger' : 'primary')} disabled={busy}
            onClick={async () => { if (busy) return; setBusy(true); try { await q.onOk(); } finally { close(); } }}>
            {busy ? 'กำลังทำงาน…' : q.ok || 'ยืนยัน'}
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ====================================================================== สร้างร้าน */
function CreateShop({ run, d }) {
  const [name, setName] = useState(d?.user?.discord?.name || '');
  const [busy, setBusy] = useState(false);
  const [want, setWant] = useState('');
  useEffect(() => { try { setWant(localStorage.getItem('hb-claim') || ''); } catch {} }, []);
  const slug = want || d?.suggestedSlug || 'ชื่อ-discord';
  const create = async () => {
    if (busy) return;
    setBusy(true);
    await run(() => api('/api/v1/shop/hub/shop', 'POST', { name, slug: want || undefined }).then((r) => { try { localStorage.removeItem('hb-claim'); } catch {} return r; }), 'สร้างร้านแล้ว', 'เริ่มเพิ่มสินค้าได้เลย');
    setBusy(false);
  };
  return (
    <div className="create">
      <div className="create-card rim">
        <div className="create-av">{d.user.discord?.avatar ? <img src={d.user.discord.avatar} alt="" /> : <Mark size={36} />}</div>
        <h2>สร้างร้านของคุณ</h2>
        <p>ยินดีต้อนรับ <b>{d.user.name}</b> — ตั้งชื่อร้านแล้วเริ่มขายผ่านบอท Discord ได้เลย</p>
        <div className="slugbox">
          <span>ลิงก์ร้านของคุณ</span>
          <code>flexozy.site/<b>{slug}</b></code>
          <em>{want ? 'ชื่อที่คุณเลือกจากหน้าแรก (ถ้าถูกใช้แล้วจะแจ้งให้เปลี่ยน)' : 'สร้างจากชื่อ Discord อัตโนมัติ'}</em>
        </div>
        <label className="h-fl">ชื่อร้าน<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อร้านที่แสดง" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && create()} /></label>
        <button type="button" className="h-btn primary wide rp" style={{ height: 48 }} onClick={create} disabled={busy || name.trim().length < 2}>{busy ? 'กำลังสร้าง…' : <>สร้างร้าน <Icon n="arrow" s={16} /></>}</button>
      </div>
    </div>
  );
}

/* ====================================================================== ภาพรวม */
function PreviewPane({ shop, products, topupOn, label = 'พรีวิวแผงใน Discord' }) {
  return (
    <aside className="pn rim glow sticky">
      <div className="prev-h"><b>{label}</b><span>สด</span></div>
      <DiscordPreview shop={shop} products={products} topupOn={topupOn} />
    </aside>
  );
}

function Overview({ shop, products, d, go, stock, botOk }) {
  const sold = products.reduce((a, p) => a + p.sold, 0);
  const out = products.filter((p) => p.active && p.stock === 0).length;
  const steps = [
    [products.length > 0, 'เพิ่มสินค้าชิ้นแรก', 'ตั้งชื่อ ราคา และอีโมจิ', 'products'],
    [stock > 0, 'เติมสต็อกสินค้า', 'วางคีย์/ไอดีพาส 1 บรรทัด = 1 ชิ้น', 'products'],
    [botOk, 'เชื่อมบอท Discord', 'เลือกเซิร์ฟเวอร์และห้อง บอทสร้างแผงร้านให้เอง', 'discord'],
  ];
  const stats = [
    ['box', 'สินค้าทั้งหมด', `${products.length}/${d.limits.products}`],
    ['coin', 'สต็อกคงเหลือ', stock.toLocaleString('th-TH')],
    ['sold', 'ขายแล้ว', sold.toLocaleString('th-TH')],
    ['warn', 'สินค้าหมด', String(out), out ? 'warn' : ''],
  ];
  return (
    <div className="h-cols">
      <div className="stack">
        <section className="hero2 rim" style={{ '--c': shop.color, backgroundImage: shop.banner ? `url(${shop.banner})` : undefined }}>
          {shop.logo ? <img className="h-av" src={shop.logo} alt="" /> : <i className="h-av">{shop.name.slice(0, 1).toUpperCase()}</i>}
          <div><h2>{shop.name}</h2><p>{shop.tagline || 'ยังไม่มีคำอธิบายร้าน — ตั้งได้ที่ “ตั้งค่าร้าน”'}</p></div>
          <span className={'badge ' + (botOk ? 'ok' : 'warn')}>{botOk ? 'บอทพร้อมใช้งาน' : 'รอเชื่อมบอท'}</span>
        </section>
        <div className="h-stats">
          {stats.map(([ic, l, v, c]) => (
            <div key={l} className={'h-stat rim glow ' + (c || '')}><span className="si"><Icon n={ic} s={17} /></span><b>{v}</b><em>{l}</em></div>
          ))}
        </div>
        <section className="pn rim">
          <div className="pn-h"><h3>เริ่มต้นใช้งาน</h3><span className="badge plain">{steps.filter((s) => s[0]).length}/3</span></div>
          <div className="steps">
            {steps.map(([ok, t, s, to], i) => (
              <button key={t} type="button" className={'step rp' + (ok ? ' done' : '')} onClick={() => go(to)}>
                <span className="n">{ok ? <Icon n="check" s={16} sw={2.6} /> : i + 1}</span>
                <span className="tx"><b>{t}</b><em>{s}</em></span>
                <span className="go">{ok ? 'เรียบร้อย' : 'ไปทำเลย →'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <PreviewPane shop={shop} products={products} />
    </div>
  );
}

/* ====================================================================== สินค้า & สต็อก */
function EmojiPicker({ onPick }) {
  const gid = useContext(GuildCtx);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open || !gid) return;
    let dead = false;
    guildInfo(gid).then((r) => { if (!dead) setList(r.emojis || []); }).catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, [open, gid]);
  if (!gid) return <small className="hint">เชื่อมเซิร์ฟเวอร์ก่อน เพื่อใช้อีโมจิ (รวมอีโมจิเคลื่อนไหว) ของเซิร์ฟเวอร์</small>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div><button type="button" className="h-btn ghost sm rp" onClick={() => setOpen((o) => !o)}>{open ? 'ปิดรายการอีโมจิ' : '😀 เลือกอีโมจิจากเซิร์ฟเวอร์'}</button></div>
      {open && (err ? <div className="alert bad">{err}</div> : !list ? <p className="h-sub">กำลังโหลดอีโมจิ…</p> : !list.length ? <p className="h-sub">เซิร์ฟเวอร์นี้ยังไม่มีอีโมจิกำหนดเอง</p> : (
        <div className="eg">
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

function ProductModal({ p, run, onClose, products, shop }) {
  const isNew = !p;
  const [f, setF] = useState({ name: p?.name || '', price: p ? String(Number(p.price) / 100) : '', emoji: p?.emoji || '', description: p?.description || '', active: p ? p.active : true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => { setErr(''); setF((o) => ({ ...o, [k]: v })); };
  const priceNum = Number(f.price);
  const save = async (close) => {
    if (busy) return;
    if (!f.name.trim()) return setErr('ใส่ชื่อสินค้าก่อน');
    if (!(priceNum >= 0.01) || priceNum > 1000000) return setErr('ราคาต้องอยู่ระหว่าง 0.01 - 1,000,000 บาท');
    setBusy(true);
    const ok = await run(() => (isNew ? api('/api/v1/shop/hub/products', 'POST', f) : api('/api/v1/shop/hub/products/' + p.id, 'PUT', f)), isNew ? 'เพิ่มสินค้าแล้ว' : 'บันทึกสินค้าแล้ว');
    setBusy(false);
    if (ok) close();
  };
  const preview = { id: 0, name: f.name || 'ชื่อสินค้า', price: Math.round((priceNum || 0) * 100), emoji: f.emoji, stock: p ? p.stock : 0, active: true };
  return (
    <Modal onClose={onClose} icon="box" title={isNew ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า'} sub="ตั้งชื่อ ราคา และอีโมจิ — เห็นหน้าตาในแผง Discord ทันที">
      {(close) => (
        <div className="f">
          <label className="h-fl">ชื่อสินค้า<input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} placeholder="เช่น คีย์ VIP 30 วัน" autoFocus /></label>
          <div className="two">
            <label className="h-fl">ราคา (บาท)<input type="number" inputMode="decimal" min="0.01" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="59" /></label>
            <div className="h-fl">อีโมจิ
              <div className="emo-row"><input value={f.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🔥 หรือ <:vip:123…>" /><span className="pv"><Emo v={f.emoji} size={24} /></span></div>
            </div>
          </div>
          <EmojiPicker onPick={(v) => set('emoji', v)} />
          <label className="h-fl">รายละเอียด<input value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={300} placeholder="รายละเอียดสั้นๆ (ไม่บังคับ)" /></label>
          <Switch on={f.active} onChange={(v) => set('active', v)} label="แสดงสินค้านี้ในร้าน" sub="ปิดไว้ = ซ่อนจากหน้าร้านและบอท" />
          <div className="dc" style={{ padding: 10 }}><div className="dc-line" style={{ padding: '2px 4px' }}>
            {preview.emoji ? <Emo v={preview.emoji} size={18} /> : <span className="dc-sq">▫️</span>}
            <span><b>{preview.name}</b> — ฿{baht(preview.price)} · {preview.stock > 0 ? <>เหลือ <b>{preview.stock}</b></> : <s>หมด</s>}</span>
          </div></div>
          {err && <div className="alert bad"><Icon n="warn" s={17} />{err}</div>}
          <button type="button" className="h-btn primary wide rp" style={{ height: 46 }} onClick={() => save(close)} disabled={busy}>{busy ? 'กำลังบันทึก…' : isNew ? 'เพิ่มสินค้า' : 'บันทึก'}</button>
        </div>
      )}
    </Modal>
  );
}

function StockModal({ pid, products, limits, run, onClose }) {
  const ask = useContext(AskCtx);
  const toast = useToast();
  const p = products.find((x) => x.id === pid);
  const [items, setItems] = useState(null);
  const [lines, setLines] = useState('');
  const [find, setFind] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef(null);
  const stockNow = p?.stock;
  const loadItems = useCallback(async () => {
    try { setItems((await api(`/api/v1/shop/hub/products/${pid}/stock`)).items); } catch (e) { toast.bad('โหลดสต็อกไม่สำเร็จ', e.message); setItems([]); }
  }, [pid, toast]);
  useEffect(() => { loadItems(); }, [loadItems, stockNow]);
  useEffect(() => { if (!p) onClose(); }, [p]); // eslint-disable-line
  if (!p) return null;

  const list = [...new Set(lines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
  const over = list.length > limits.stockPerAdd;
  const add = async () => {
    if (busy || !list.length || over) return;
    setBusy(true);
    try {
      const r = await api(`/api/v1/shop/hub/products/${pid}/stock`, 'POST', { lines });
      setLines('');
      await run(async () => {});
      toast.ok('เติมสต็อกแล้ว', `เพิ่ม ${r.added} รายการ`);
    } catch (e) { toast.bad('เติมสต็อกไม่สำเร็จ', e.message); }
    setBusy(false);
  };
  const readFile = (f) => {
    if (!f) return;
    if (f.size > 1_500_000) return toast.bad('ไฟล์ใหญ่เกินไป', 'ไม่เกิน 1.5 MB');
    const r = new FileReader();
    r.onload = () => setLines((o) => (o ? o.replace(/\s+$/, '') + '\n' : '') + String(r.result || ''));
    r.readAsText(f);
  };
  const shown = (items || []).filter((it) => !find || it.content.toLowerCase().includes(find.toLowerCase()));
  return (
    <Modal onClose={onClose} wide icon="box" title={`สต็อก: ${p.name}`} sub={`ขายแล้ว ${p.sold} · เหลือ ${p.stock}`}>
      <div className="f">
        <p className="h-sub">1 บรรทัด = 1 ชิ้นที่ส่งให้ลูกค้า (คีย์/โค้ด/ไอดีพาส) เพิ่มได้ครั้งละไม่เกิน {limits.stockPerAdd} บรรทัด · บรรทัดซ้ำในชุดเดียวกันจะถูกตัดออกอัตโนมัติ</p>
        <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={6} placeholder={'KEY-AAAA\nKEY-BBBB\nไอดี:รหัสผ่าน'} />
        <div className="h-row">
          <button type="button" className="h-btn primary rp" onClick={add} disabled={!list.length || over || busy}><Icon n="plus" s={16} sw={2.2} />{busy ? 'กำลังเพิ่ม…' : `เพิ่มสต็อก${list.length ? ` (${list.length})` : ''}`}</button>
          <input ref={file} type="file" accept=".txt,.csv,text/plain" hidden onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="h-btn ghost sm rp" onClick={() => file.current?.click()}><Icon n="upload" s={15} />นำเข้าไฟล์ .txt</button>
          {over && <span className="badge bad">เกิน {limits.stockPerAdd} บรรทัด</span>}
        </div>
        <div className="split">
          <b>ยังไม่ขาย ({p.stock})</b>
          <span className="find"><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="ค้นหาในสต็อก…" /></span>
          {p.stock > 0 && <button type="button" className="h-btn danger sm rp" onClick={() => ask({ danger: true, title: 'ลบสต็อกทั้งหมด?', msg: `ลบสต็อกที่ยังไม่ขายทั้งหมดของ “${p.name}” (${p.stock} ชิ้น) — กู้คืนไม่ได้`, ok: 'ลบทั้งหมด', onOk: () => run(() => api(`/api/v1/shop/hub/products/${pid}/stock`, 'DELETE'), 'ล้างสต็อกแล้ว') })}>ลบทั้งหมด</button>}
        </div>
        <div className="stock-list">
          {items === null ? <div className="none"><span>กำลังโหลด…</span></div> : shown.length === 0 ? <div className="none"><span>{find ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีสต็อก'}</span></div> : shown.map((it) => (
            <div key={it.id}><span>{it.content}</span><button type="button" className="ibtn danger rp" onClick={() => run(() => api('/api/v1/shop/hub/stock/' + it.id, 'DELETE'))} aria-label="ลบ"><Icon n="close" s={14} sw={2.2} /></button></div>
          ))}
          {items && p.stock > items.length && !find && <div className="more"><span>แสดง {items.length} รายการแรก</span></div>}
        </div>
      </div>
    </Modal>
  );
}

function ProductsTab({ products, limits, fee, run }) {
  const ask = useContext(AskCtx);
  const [edit, setEdit] = useState(null); // null | 'new' | product
  const [stockId, setStockId] = useState(null);
  const [busyId, setBusyId] = useState(0);
  const full = products.length >= limits.products;
  const toggle = async (p) => {
    if (busyId) return;
    setBusyId(p.id);
    await run(() => api('/api/v1/shop/hub/products/' + p.id, 'PUT', { active: !p.active }));
    setBusyId(0);
  };
  return (
    <section className="pn rim">
      <div className="pn-h">
        <div>
          <h3><Icon n="box" s={18} />สินค้า ({products.length}/{limits.products})</h3>
          <p className="h-sub" style={{ marginTop: 4 }}>ผู้ซื้อจ่ายจากกระเป๋าเงินเดียวกับ flexozy.site รายได้เข้ากระเป๋าของคุณทันที{fee ? ` (หักค่าธรรมเนียม ${fee}%)` : ''}</p>
        </div>
        <button type="button" className="h-btn primary rp" onClick={() => setEdit('new')} disabled={full}><Icon n="plus" s={16} sw={2.2} />เพิ่มสินค้า</button>
      </div>
      {products.length === 0 ? (
        <div className="h-empty"><Icon n="box" s={36} /><b>ยังไม่มีสินค้า</b><span>กด “เพิ่มสินค้า” เพื่อเริ่มต้น แล้วเติมสต็อกให้พร้อมขาย</span></div>
      ) : (
        <div className="plist">
          {products.map((p) => (
            <div key={p.id} className={'prow rim glow' + (p.active ? '' : ' off')}>
              <span className="em">{p.emoji ? <Emo v={p.emoji} size={26} /> : '🛍️'}</span>
              <div className="nm"><b>{p.name}</b><span>{p.description || 'ไม่มีรายละเอียด'}</span></div>
              <div className="pr">฿{baht(p.price)}</div>
              <div className="stkcell"><button type="button" className={'stk rp ' + (p.stock === 0 ? 'bad' : p.stock <= 3 ? 'warn' : 'ok')} onClick={() => setStockId(p.id)}>{p.stock} ชิ้น · จัดการ</button></div>
              <div className="acts">
                <button type="button" className="ibtn rp" onClick={() => toggle(p)} disabled={busyId === p.id} title={p.active ? 'ซ่อนสินค้า' : 'แสดงสินค้า'} aria-label={p.active ? 'ซ่อนสินค้า' : 'แสดงสินค้า'} role="switch" aria-checked={p.active} style={{ width: 'auto', padding: '0 8px' }}><span className={'mini-sw' + (p.active ? ' on' : '')} /></button>
                <button type="button" className="ibtn rp" onClick={() => setEdit(p)} title="แก้ไข" aria-label="แก้ไข"><Icon n="edit" s={16} /></button>
                <button type="button" className="ibtn danger rp" title="ลบ" aria-label="ลบ"
                  onClick={() => ask({ danger: true, title: 'ลบสินค้า?', msg: `ลบ “${p.name}” และสต็อกทั้งหมดของสินค้านี้ — กู้คืนไม่ได้`, ok: 'ลบสินค้า', onOk: () => run(() => api('/api/v1/shop/hub/products/' + p.id, 'DELETE'), 'ลบสินค้าแล้ว') })}><Icon n="trash" s={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <ProductModal p={edit === 'new' ? null : edit} onClose={() => setEdit(null)} run={run} products={products} />}
      {stockId && <StockModal pid={stockId} products={products} limits={limits} run={run} onClose={() => setStockId(null)} />}
    </section>
  );
}

/* ====================================================================== ตั้งค่าร้าน (แก้แล้วพรีวิว Discord เปลี่ยนทันที) */
const SWATCHES = ['#5865f2', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#ffffff'];
const BTN_NAMES = { buy: 'เมนูเลือกซื้อสินค้า', stock: 'ปุ่มเช็คสต็อก', balance: 'ปุ่มดูยอดเงิน', topup: 'ปุ่มเติมเงิน' };
const fromShop = (s) => ({
  slug: s.slug, name: s.name, tagline: s.tagline || '', color: s.color, is_public: !!s.is_public,
  logo_url: s.logo_url && s.logo_url !== 'upload' ? s.logo_url : '',
  banner_url: s.banner_url && s.banner_url !== 'upload' ? s.banner_url : '',
  buttons: JSON.parse(JSON.stringify(s.buttons)),
});

function SaveBar({ onSave, onReset, busy, label = 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก', disabled }) {
  return (
    <div className="savebar rim" role="region" aria-label="บันทึกการเปลี่ยนแปลง">
      <span>{label}</span>
      <button type="button" className="h-btn ghost sm rp" onClick={onReset} disabled={busy}><Icon n="undo" s={14} />ยกเลิก</button>
      <button type="button" className="h-btn primary sm rp" onClick={onSave} disabled={busy || disabled}><Icon n="save" s={14} />{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
    </div>
  );
}

function ImageField({ label, kind, shop, draft, setDraft, run, up, setUp }) {
  const file = useRef(null);
  const toast = useToast();
  const hasUpload = shop[kind + '_url'] === 'upload';
  const key = kind + '_url';
  const upload = (f) => {
    if (!f) return;
    if (f.size > 1_500_000) return toast.bad('รูปใหญ่เกินไป', 'ไม่เกิน 1.5 MB (PNG, JPG, GIF, WEBP)');
    const r = new FileReader();
    r.onload = async () => {
      setUp((o) => ({ ...o, [kind]: r.result })); // โชว์ในพรีวิวทันที ก่อนอัปโหลดเสร็จ
      await run(() => api('/api/v1/shop/hub/media', 'POST', { kind, data: r.result }), 'อัปโหลดแล้ว');
      setUp((o) => ({ ...o, [kind]: '' }));
    };
    r.readAsDataURL(f);
  };
  return (
    <div className="imgf">
      <label className="h-fl" htmlFor={'img-' + kind}>{label}</label>
      <div className="imgf-row">
        <input id={'img-' + kind} value={draft[key]} onChange={(e) => setDraft((o) => ({ ...o, [key]: e.target.value.trim() }))} placeholder={hasUpload ? 'ใช้รูปที่อัปโหลดอยู่ (วางลิงก์ใหม่เพื่อเปลี่ยน)' : 'https://… หรืออัปโหลดไฟล์'} />
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="h-btn ghost sm rp" onClick={() => file.current?.click()}><Icon n="upload" s={14} />อัปโหลด</button>
        {(hasUpload || draft[key]) && <button type="button" className="h-btn danger sm rp" onClick={() => { setDraft((o) => ({ ...o, [key]: '' })); if (hasUpload || shop[key]) run(() => api('/api/v1/shop/hub/media/' + kind, 'DELETE'), 'ลบรูปแล้ว'); }}>ลบรูป</button>}
      </div>
    </div>
  );
}

function SettingsTab({ shop, products, run }) {
  const toast = useToast();
  const base = useMemo(() => fromShop(shop), [shop]);
  const [draft, setDraft] = useState(base);
  const [up, setUp] = useState({ logo: '', banner: '' });
  const [busy, setBusy] = useState(false);
  const baseKey = JSON.stringify(base);
  const dirty = JSON.stringify(draft) !== baseKey;
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // ข้อมูลจากเซิร์ฟเวอร์เปลี่ยน (เช่น ซิงก์จากอุปกรณ์อื่น) และเรายังไม่ได้แก้อะไร → อัปเดตตาม ถ้ากำลังแก้อยู่จะไม่ทับ
  const lastBase = useRef(baseKey);
  useEffect(() => {
    if (lastBase.current !== baseKey) {
      if (!dirtyRef.current || JSON.stringify(draft) === lastBase.current) setDraft(base);
      lastBase.current = baseKey;
    }
  }, [baseKey]); // eslint-disable-line

  useEffect(() => {
    const warn = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, []);

  const set = (k, v) => setDraft((o) => ({ ...o, [k]: v }));
  const setBtn = (k, f, v) => setDraft((o) => ({ ...o, buttons: { ...o.buttons, [k]: { ...o.buttons[k], [f]: v } } }));
  const colorOk = /^#[0-9a-f]{6}$/i.test(draft.color);
  const img = (kind) => up[kind] || draft[kind + '_url'] || (shop[kind + '_url'] === 'upload' ? shop[kind] : '');
  const pv = {
    ...shop, name: draft.name, tagline: draft.tagline, color: colorOk ? draft.color : shop.color,
    logo: img('logo'), banner: img('banner'), buttons: draft.buttons,
  };

  const save = async () => {
    if (busy || !dirty) return;
    if (!colorOk) return toast.warn('สีไม่ถูกต้อง', 'ใช้รูปแบบ #RRGGBB เช่น #5865f2');
    if (draft.name.trim().length < 2) return toast.warn('ชื่อร้านสั้นเกินไป', 'อย่างน้อย 2 ตัวอักษร');
    if (!/^[a-z0-9][a-z0-9-]{2,23}$/.test(draft.slug)) return toast.warn('ลิงก์ร้านไม่ถูกต้อง', 'ใช้ a-z 0-9 และ - ยาว 3-24 ตัว');
    const body = { slug: draft.slug, name: draft.name.trim(), tagline: draft.tagline, color: draft.color.toLowerCase(), is_public: draft.is_public, buttons: draft.buttons };
    if (draft.logo_url !== base.logo_url) body.logo_url = draft.logo_url; // ส่งเฉพาะที่เปลี่ยน กันลบรูปที่อัปโหลดไว้โดยไม่ตั้งใจ
    if (draft.banner_url !== base.banner_url) body.banner_url = draft.banner_url;
    setBusy(true);
    await run(() => api('/api/v1/shop/hub/shop', 'PUT', body), 'บันทึกแล้ว', 'บอทจะอัปเดตแผงใน Discord ภายในไม่กี่วินาที');
    setBusy(false);
  };

  return (
    <div className="h-cols">
      <div className="stack">
        <section className="pn rim">
          <div className="blk">
            <div className="blk-h"><span className="bi"><Icon n="store" s={18} /></span><div><b>ข้อมูลร้าน</b><span>ชื่อ ลิงก์ และสีธีมของแผงร้าน</span></div></div>
            <label className="h-fl">ลิงก์ร้านของคุณ
              <div className="pre"><span>flexozy.site/</span><input value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24))} maxLength={24} spellCheck={false} /></div>
              <small>a-z 0-9 และ - ยาว 3-24 ตัว · ถ้าเปลี่ยน ลิงก์เก่าและ API ของลิงก์เก่าจะใช้ไม่ได้</small>
            </label>
            <div className="two">
              <label className="h-fl">ชื่อร้าน<input value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={40} /></label>
              <label className="h-fl">คำอธิบายสั้นๆ<input value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} placeholder="เช่น ขายไอดีเกม ส่งออโต้ 24 ชม." /></label>
            </div>
            <div className="h-fl">สีธีม
              <div className="swatches">
                {SWATCHES.map((c) => <button key={c} type="button" aria-label={c} className={'swatch' + (draft.color.toLowerCase() === c ? ' on' : '')} style={{ '--c': c }} onClick={() => set('color', c)} />)}
                <label className="colorpick" title="เลือกสีเอง"><input type="color" value={colorOk ? draft.color : '#5865f2'} onChange={(e) => set('color', e.target.value)} /></label>
                <input style={{ width: 118, height: 38 }} className={colorOk ? '' : 'bad'} value={draft.color} onChange={(e) => set('color', e.target.value.slice(0, 7))} spellCheck={false} aria-label="รหัสสี" />
              </div>
            </div>
            <Switch on={draft.is_public} onChange={(v) => set('is_public', v)} label="แสดงร้านในรายการสาธารณะ" sub="ปิดแล้วลิงก์ร้านยังเปิดได้ แต่ไม่โผล่ใน /api/v1/shop" />
          </div>

          <div className="blk">
            <div className="blk-h"><span className="bi"><Icon n="image" s={18} /></span><div><b>รูปภาพ</b><span>โลโก้สี่เหลี่ยมจัตุรัส และแบนเนอร์ (ไม่เกิน 1.5 MB)</span></div></div>
            <ImageField label="โลโก้ร้าน" kind="logo" shop={shop} draft={draft} setDraft={setDraft} run={run} up={up} setUp={setUp} />
            <ImageField label="แบนเนอร์" kind="banner" shop={shop} draft={draft} setDraft={setDraft} run={run} up={up} setUp={setUp} />
          </div>

          <div className="blk">
            <div className="blk-h"><span className="bi"><Icon n="cursor" s={18} /></span><div><b>ปุ่มบนบอท</b><span>ชื่อและอีโมจิของปุ่มในแผง Discord</span></div></div>
            <div className="btnset">
              {Object.keys(BTN_NAMES).map((k) => (
                <div className="cell" key={k}>
                  <div className="two">
                    <label className="h-fl">{BTN_NAMES[k]}<input value={draft.buttons[k].label} onChange={(e) => setBtn(k, 'label', e.target.value)} maxLength={40} /></label>
                    <div className="h-fl">อีโมจิ<div className="emo-row"><input value={draft.buttons[k].emoji} onChange={(e) => setBtn(k, 'emoji', e.target.value)} placeholder="เช่น 🛒" /><span className="pv"><Emo v={draft.buttons[k].emoji} size={22} /></span></div></div>
                  </div>
                  <EmojiPicker onPick={(v) => setBtn(k, 'emoji', v)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <PreviewPane shop={pv} products={products} topupOn={!!shop.topup_enabled} label="พรีวิวแผงใน Discord · แก้แล้วเปลี่ยนทันที" />
      {dirty && <SaveBar onSave={save} onReset={() => { setDraft(base); setUp({ logo: '', banner: '' }); }} busy={busy} />}
    </div>
  );
}

/* ====================================================================== เซิร์ฟเวอร์ & บอท */
function DiscordTab({ shop, d, run }) {
  const ask = useContext(AskCtx);
  const toast = useToast();
  const [gl, setGl] = useState(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(shop.guild_id || '');
  const [chs, setChs] = useState(null);
  const [c, setC] = useState(shop.channel_id || '');
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(false);

  const loadGuilds = useCallback(async () => {
    setErr(''); setSpin(true);
    try { setGl(await api('/api/v1/shop/hub/guilds')); } catch (e) { setErr(e.message); }
    setSpin(false);
  }, []);
  useEffect(() => { loadGuilds(); }, [loadGuilds]);
  useEffect(() => {
    setChs(null);
    if (!sel) return;
    let dead = false;
    guildInfo(sel).then((r) => { if (!dead) setChs(r.channels || []); }).catch(() => { if (!dead) setChs([]); });
    return () => { dead = true; };
  }, [sel]);

  const st = !shop.guild_id ? ['warn', 'ยังไม่ได้เลือกเซิร์ฟเวอร์', 'เลือกเซิร์ฟเวอร์ที่คุณจัดการได้ด้านล่าง', 'server']
    : !shop.bot_in_guild ? ['warn', 'รอบอทตรวจสอบเซิร์ฟเวอร์', 'ถ้าบอทยังไม่อยู่ในเซิร์ฟเวอร์ ให้เชิญบอทก่อน', 'clock']
    : !shop.guild_verified ? ['bad', 'ยังไม่ผ่านการตรวจสิทธิ์', shop.bot_note || 'บัญชีของคุณต้องมีสิทธิ์ Manage Server', 'warn']
    : ['ok', `เชื่อมแล้ว${shop.guild_name ? ` · ${shop.guild_name}` : ''}`, 'บอทโพสต์และอัปเดตแผงร้านให้อัตโนมัติ', 'check'];

  const g = gl?.guilds.find((x) => x.id === sel);
  const hasBot = g ? g.bot !== false : true;
  const invite = (id) => (d.inviteUrl ? `${d.inviteUrl}${id ? `&guild_id=${id}&disable_guild_select=true` : ''}` : '');
  const options = (gl?.guilds || []).map((x) => ({
    value: x.id, label: x.name,
    icon: x.icon ? <img src={x.icon} alt="" /> : x.name.slice(0, 1).toUpperCase(),
    sub: x.bot === true ? '● บอทอยู่ในเซิร์ฟเวอร์แล้ว' : x.bot === false ? 'ยังไม่มีบอท — ต้องเชิญก่อน' : 'ไม่ทราบสถานะบอท',
    subClass: x.bot === true ? 'ok' : x.bot === false ? 'warn' : '',
  }));
  const chOptions = (chs || []).map((x) => ({ value: x.id, label: '#' + x.name, icon: <Icon n="hash" s={14} /> }));
  const same = sel === shop.guild_id && c === (shop.channel_id || '');

  const connect = async () => {
    if (busy || !sel || !c) return;
    setBusy(true);
    await run(() => api('/api/v1/shop/hub/shop', 'PUT', { guild_id: sel, channel_id: c }), 'บันทึกแล้ว', 'บอทจะสร้างแผงร้านให้อัตโนมัติ');
    setBusy(false);
  };

  return (
    <div className="stack">
      <section className="pn rim">
        <div className="pn-h"><h3><Icon n="server" s={18} />สถานะการเชื่อมต่อ</h3></div>
        <div className={'status-card ' + st[0]}>
          <span className="si"><Icon n={st[3]} s={20} /></span>
          <div><b>{st[1]}</b><span>{st[2]}</span></div>
          {shop.guild_id && <button type="button" className="h-btn danger sm rp" onClick={() => ask({ danger: true, title: 'ยกเลิกการเชื่อมต่อ?', msg: 'บอทจะหยุดอัปเดตแผงร้านในเซิร์ฟเวอร์นี้ (แผงเดิมในห้องยังอยู่ ลบเองได้)', ok: 'ยกเลิกการเชื่อมต่อ', onOk: async () => { const ok = await run(() => api('/api/v1/shop/hub/shop', 'PUT', { guild_id: '', channel_id: '' }), 'ยกเลิกแล้ว'); if (ok) { setSel(''); setC(''); } } })}>ยกเลิก</button>}
        </div>
      </section>

      <section className="pn rim">
        <div className="blk">
          <div className="blk-h"><span className="bi"><Icon n="chat" s={18} /></span><div><b>เชื่อมเซิร์ฟเวอร์ Discord</b><span>เซิร์ฟเวอร์ที่คุณเป็นเจ้าของ หรือมีสิทธิ์ Manage Server</span></div>
            <span style={{ marginLeft: 'auto' }}><button type="button" className="h-btn ghost sm rp" onClick={loadGuilds} disabled={spin}><Icon n="refresh" s={14} className={spin ? 'spinning' : ''} />รีเฟรช</button></span></div>

          {err && <div className="alert bad"><Icon n="warn" s={17} />{err}{/ล็อกอิน/.test(err) && <button type="button" className="h-btn sm rp" onClick={() => api('/api/auth/logout', 'POST', {}).then(() => { location.href = '/shop/login'; })}>ล็อกอินใหม่</button>}</div>}

          <div className="h-fl">เซิร์ฟเวอร์ Discord
            <Select value={sel} options={options} placeholder="เลือกเซิร์ฟเวอร์…" loading={!gl && !err} empty="ไม่พบเซิร์ฟเวอร์ที่คุณจัดการได้"
              onChange={(v) => { setSel(v); setC(v === shop.guild_id ? shop.channel_id || '' : ''); }} />
          </div>

          {sel && gl && (hasBot ? (
            <div className="h-fl">ห้องที่ให้บอทโพสต์แผงร้าน
              {chs && chs.length === 0 ? (
                <input value={c} onChange={(e) => setC(e.target.value.replace(/\D/g, '').slice(0, 25))} placeholder="ไอดีห้อง (โหลดรายชื่อห้องไม่ได้ — คัดลอกจาก Discord โหมดนักพัฒนา)" inputMode="numeric" />
              ) : <Select value={c} options={chOptions} onChange={setC} placeholder="เลือกห้อง…" loading={chs === null} />}
            </div>
          ) : (
            <div className="alert"><Icon n="bot" s={18} />บอทยังไม่ได้อยู่ใน <b>{g?.name}</b>
              {invite(sel) ? <a className="h-btn sm primary rp" href={invite(sel)} target="_blank" rel="noreferrer">เชิญบอทเข้าเซิร์ฟเวอร์นี้ <Icon n="out" s={13} /></a> : <span className="badge warn">ผู้ดูแลยังไม่ได้ตั้งค่า BOT_CLIENT_ID</span>}
            </div>
          ))}

          <div className="h-row">
            <button type="button" className="h-btn primary rp" style={{ height: 46 }} onClick={connect} disabled={!sel || !c || busy || (same && shop.guild_verified)}>{busy ? 'กำลังบันทึก…' : <><Icon n="bot" s={16} />บันทึกและเชื่อมบอท</>}</button>
            {same && shop.guild_verified && <span className="hint">เชื่อมอยู่แล้ว — เปลี่ยนห้องหรือเซิร์ฟเวอร์เพื่อบันทึกใหม่</span>}
          </div>
        </div>
      </section>

      <section className="pn rim">
        <div className="pn-h"><h3>บอททำงานอย่างไร</h3></div>
        <div className="how">
          <div><i>01</i><b>เลือกเซิร์ฟเวอร์ + ห้อง</b><span>บอทตรวจว่าคุณมีสิทธิ์ Manage Server จริง</span></div>
          <div><i>02</i><b>บอทโพสต์แผงร้าน</b><span>สินค้า ราคา สต็อก และปุ่มตามที่ตั้งไว้ในแท็บตั้งค่า</span></div>
          <div><i>03</i><b>ลูกค้ากดซื้อ</b><span>หักเงินจากกระเป๋า ส่งสินค้าทันที รายได้เข้ากระเป๋าคุณ</span></div>
        </div>
      </section>
    </div>
  );
}

/* ====================================================================== เติมเงิน (ระบบใส่เบอร์) */
function TopupTab({ shop, products, run }) {
  const toast = useToast();
  const savedPh = shop.topup_phone || '';
  const savedOn = !!shop.topup_enabled;
  const [ph, setPh] = useState(savedPh);
  const [on, setOn] = useState(savedOn);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const ok = PHONE_OK.test(ph);
  const dirty = ph !== savedPh || on !== savedOn;
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // ค่าจากเซิร์ฟเวอร์เปลี่ยน และเรายังไม่ได้แก้ → ตามเซิร์ฟเวอร์
  const lastSaved = useRef(savedPh + '|' + savedOn);
  useEffect(() => {
    const k = savedPh + '|' + savedOn;
    if (lastSaved.current !== k) {
      if (!dirtyRef.current || (ph + '|' + on) === lastSaved.current) { setPh(savedPh); setOn(savedOn); }
      lastSaved.current = k;
    }
  }, [savedPh, savedOn]); // eslint-disable-line

  useEffect(() => {
    const warn = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, []);

  const typePhone = (raw) => { const v = toLocalDigits(raw); setPh(v); if (!PHONE_OK.test(v)) setOn(false); };
  const flip = (v) => {
    if (v && !ok) { setShake((n) => n + 1); toast.warn('ใส่เบอร์ก่อนเปิดใช้งาน', 'เบอร์ TrueMoney 10 หลัก ขึ้นต้นด้วย 0'); return; }
    setOn(v);
  };
  const save = async () => {
    if (busy || !dirty) return;
    if (ph && !ok) return toast.warn('เบอร์ไม่ถูกต้อง', 'ต้องมี 10 หลัก ขึ้นต้นด้วย 0');
    setBusy(true);
    await run(() => api('/api/v1/shop/hub/shop', 'PUT', { topup_phone: ph, topup_enabled: ok && on }), 'บันทึกแล้ว', ok && on ? 'ปุ่มเติมเงินเปิดในแผง Discord แล้ว' : 'ปิดปุ่มเติมเงินแล้ว');
    setBusy(false);
  };
  const left = 10 - ph.length;
  const stateLine = !ph ? ['idle', 'ยังไม่ได้ใส่เบอร์'] : ok ? ['ok', 'เบอร์ถูกต้อง'] : ph[0] !== '0' ? ['bad', 'เบอร์ต้องขึ้นต้นด้วย 0'] : ['idle', `ใส่อีก ${left} หลัก`];

  return (
    <div className="h-cols">
      <div className="stack">
        <section className="pn rim">
          <div className="blk">
            <div className="blk-h"><span className="bi"><Icon n="phone" s={18} /></span><div><b>เบอร์ TrueMoney รับเงิน</b><span>ลูกค้าส่งลิงก์ซองของขวัญ แล้วบอทรับเข้าเบอร์นี้ให้อัตโนมัติ</span></div></div>
            <div className="h-fl">เบอร์ TrueMoney Wallet
              <div className="phone-box">
                <div key={shake} className={'pre' + (shake ? ' shake' : '') + (ok ? ' good' : ph.length === 10 ? ' bad' : '')} style={{ flex: 1 }}>
                  <span><Icon n="phone" s={16} /></span>
                  <input value={fmtPhone(ph)} onChange={(e) => typePhone(e.target.value)} placeholder="081-234-5678" inputMode="tel" autoComplete="off" aria-label="เบอร์ TrueMoney" />
                </div>
                {ph && <button type="button" className="ibtn rp" onClick={() => typePhone('')} aria-label="ล้างเบอร์"><Icon n="close" s={15} sw={2.2} /></button>}
              </div>
              <div className={'phone-state ' + stateLine[0]}>{stateLine[0] === 'ok' ? <Icon n="check" s={14} sw={2.6} /> : null}{stateLine[1]}</div>
              <small>วางเบอร์แบบ +66 81 234 5678 หรือมีขีดคั่นได้ ระบบแปลงให้เอง</small>
            </div>
            <Switch on={on} onChange={flip} label="เปิดปุ่มเติมเงินในร้านนี้" sub={on ? `ปุ่ม “${shop.buttons.topup.label}” จะโผล่ในแผง Discord` : 'ปิดอยู่ — ลูกค้าจะไม่เห็นปุ่มเติมเงิน'} />
            <div className="h-row">
              <span className={'badge ' + (savedOn ? 'ok' : 'warn')}>{savedOn ? `เปิดอยู่ · ${fmtPhone(savedPh)}` : 'ปิดอยู่'}</span>
            </div>
          </div>
        </section>
        <section className="pn rim">
          <div className="pn-h"><h3>ลูกค้าเติมเงินอย่างไร</h3></div>
          <div className="how">
            <div><i>01</i><b>กดปุ่มเติมเงิน</b><span>ในแผงร้านบน Discord</span></div>
            <div><i>02</i><b>วางลิงก์ซองของขวัญ</b><span>ซอง TrueMoney (อั่งเปา)</span></div>
            <div><i>03</i><b>บอทรับซองเข้าเบอร์นี้</b><span>เติมเข้ากระเป๋าลูกค้าทันที</span></div>
          </div>
        </section>
      </div>
      <PreviewPane shop={shop} products={products} topupOn={ok && on} label="พรีวิวแผงใน Discord · ปุ่มเติมเงิน" />
      {dirty && <SaveBar onSave={save} onReset={() => { setPh(savedPh); setOn(savedOn); }} busy={busy} disabled={!!ph && !ok} />}
    </div>
  );
}
