'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/components/api';
import { Mark, Emo } from './Logo';
import DiscordPreview from './DiscordPreview';

const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const TABS = [['shop', 'ร้าน'], ['products', 'สินค้า'], ['buttons', 'ปุ่ม'], ['discord', 'Discord'], ['api', 'API']];

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return <button className="hb-btn ghost sm" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}>{ok ? 'คัดลอกแล้ว' : 'คัดลอก'}</button>;
}

export default function Dashboard({ base }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('shop');
  const [toast, setToast] = useState(null);
  const ver = useRef(0);

  const say = (msg, bad) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 2600); };
  const load = useCallback(async (force) => {
    try {
      const r = await api('/api/hub/me' + (!force && ver.current ? `?since=${ver.current}` : ''));
      if (r.unchanged) return;
      ver.current = r.shop?.version || 0;
      setD(r);
    } catch (e) {
      if (e.status === 401 || e.status === 403) location.href = base || '/';
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
  const logout = async () => { await api('/api/auth/logout', 'POST', {}); location.href = base || '/'; };

  if (!d) return <div className="hb" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#71717a' }}>กำลังโหลด…</div>;
  const { shop, products, user } = d;

  return (
    <div className="hb">
      <div className="hb-dash">
        <div className="hb-top">
          <a className="hb-brand" href={base || '/'}><Mark size={22} /><b>flexozy</b><span>.shop</span></a>
          <div className="hb-me">
            {user.discord?.avatar && <img src={user.discord.avatar} alt="" />}
            <span>{user.name}</span>
            <button className="hb-btn ghost sm" onClick={logout}>ออกจากระบบ</button>
          </div>
        </div>

        {!shop ? <CreateShop run={run} /> : (
          <div className="hb-grid">
            <div className="hb-panel">
              <div className="hb-tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
              {!shop.active && <p className="hb-badge bad">ร้านนี้ถูกระงับโดยผู้ดูแลระบบ</p>}
              {tab === 'shop' && <ShopTab shop={shop} d={d} run={run} />}
              {tab === 'products' && <ProductsTab products={products} limits={d.limits} fee={d.fee} run={run} say={say} />}
              {tab === 'buttons' && <ButtonsTab shop={shop} run={run} />}
              {tab === 'discord' && <DiscordTab shop={shop} d={d} run={run} />}
              {tab === 'api' && <ApiTab d={d} shop={shop} />}
            </div>
            <aside className="hb-side">
              <p className="hb-sub" style={{ margin: '0 0 8px' }}>พรีวิวแผงใน Discord (อัปเดตสด)</p>
              <DiscordPreview shop={shop} products={products} />
              <div className="hb-row" style={{ marginTop: 12 }}>
                <a className="hb-btn ghost sm" href={d.urls.page} target="_blank" rel="noreferrer">เปิดหน้าร้าน ↗</a>
                <span className={'hb-badge ' + (shop.guild_verified && shop.bot_in_guild ? 'ok' : 'warn')}>{shop.guild_verified && shop.bot_in_guild ? 'บอทพร้อมใช้งาน' : 'รอเชื่อมบอท'}</span>
              </div>
            </aside>
          </div>
        )}
      </div>
      {toast && <div className={'hb-toast' + (toast.bad ? ' bad' : '')} role="status">{toast.msg}</div>}
    </div>
  );
}

function CreateShop({ run }) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  useEffect(() => { try { const s = localStorage.getItem('hb-slug'); if (s) { setSlug(s); setName(s); } } catch {} }, []);
  return (
    <div className="hb-panel" style={{ maxWidth: 520, margin: '40px auto' }}>
      <h2 className="hb-h">สร้างร้านของคุณ</h2>
      <p className="hb-sub">ตั้งชื่อร้านและลิงก์ ทั้งสองอย่างแก้ชื่อได้ภายหลัง (ลิงก์แก้ไม่ได้)</p>
      <div className="hb-f">
        <label>ลิงก์ร้าน<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24))} placeholder="yourname" /></label>
        <div className="hb-sub" style={{ margin: '-8px 0 0' }}>shop.flexozy.site/<b>{slug || 'yourname'}</b></div>
        <label>ชื่อร้าน<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อร้านที่แสดง" maxLength={40} /></label>
        <button className="hb-btn" onClick={() => run(() => api('/api/hub/shop', 'POST', { slug, name }), 'สร้างร้านแล้ว')}>สร้างร้าน</button>
      </div>
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
    r.onload = () => run(() => api('/api/hub/media', 'POST', { kind, data: r.result }), 'อัปโหลดแล้ว');
    r.readAsDataURL(f);
  };
  return (
    <label>{label}
      <div className="hb-row">
        <input className="grow" style={{ flex: '1 1 200px' }} value={v} onChange={(e) => setV(e.target.value)} placeholder="https://… หรืออัปโหลดไฟล์" />
        <button type="button" className="hb-btn ghost sm" onClick={() => run(() => api('/api/hub/shop', 'PUT', { [kind + '_url']: v }), 'บันทึกรูปแล้ว')}>ใช้ลิงก์</button>
        <button type="button" className="hb-btn ghost sm" onClick={() => file.current.click()}>อัปโหลด</button>
        {url && <button type="button" className="hb-btn danger sm" onClick={() => { setV(''); run(() => api('/api/hub/media/' + kind, 'DELETE'), 'ลบรูปแล้ว'); }}>ลบ</button>}
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
      <div><button className="hb-btn" onClick={() => run(() => api('/api/hub/shop', 'PUT', f), 'บันทึกแล้ว')}>บันทึก</button></div>
    </div>
  );
}

function ProductForm({ p, run, say }) {
  const isNew = !p;
  const [f, setF] = useState({ name: p?.name || '', price: p ? Number(p.price) / 100 : '', emoji: p?.emoji || '', description: p?.description || '', active: p ? p.active : true });
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState('');
  const [items, setItems] = useState(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const loadItems = async () => { try { setItems((await api(`/api/hub/products/${p.id}/stock`)).items); } catch (e) { say(e.message, true); } };
  useEffect(() => { if (open && p) loadItems(); }, [open, p?.stock]); // eslint-disable-line

  const save = async () => {
    const ok = await run(() => (isNew ? api('/api/hub/products', 'POST', f) : api('/api/hub/products/' + p.id, 'PUT', f)), isNew ? 'เพิ่มสินค้าแล้ว' : 'บันทึกสินค้าแล้ว');
    if (ok && isNew) setF({ name: '', price: '', emoji: '', description: '', active: true });
  };
  return (
    <div className="hb-prod">
      <div className="hb-two">
        <label>ชื่อสินค้า<input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} /></label>
        <div className="hb-two">
          <label>ราคา (บาท)<input type="number" min="0.01" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} /></label>
          <label>อีโมจิ<div className="hb-row"><input style={{ flex: 1, minWidth: 0 }} value={f.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🔥 หรือ <:vip:123…>" /><Emo v={f.emoji} size={22} /></div></label>
        </div>
      </div>
      <label>รายละเอียด<input value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={300} /></label>
      <div className="hb-row">
        <button className="hb-btn sm" onClick={save}>{isNew ? 'เพิ่มสินค้า' : 'บันทึก'}</button>
        {!isNew && <>
          <label className="hb-row" style={{ flexDirection: 'row', gap: 6 }}><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />แสดงในร้าน</label>
          <span className={'hb-badge ' + (p.stock > 0 ? 'ok' : 'bad')}>สต็อก {p.stock}</span><span className="hb-badge">ขายแล้ว {p.sold}</span>
          <button className="hb-btn ghost sm" onClick={() => setOpen(!open)}>{open ? 'ปิดสต็อก' : 'จัดการสต็อก'}</button>
          <button className="hb-btn danger sm" onClick={() => confirm(`ลบ “${p.name}” และสต็อกทั้งหมด?`) && run(() => api('/api/hub/products/' + p.id, 'DELETE'), 'ลบแล้ว')}>ลบ</button>
        </>}
      </div>
      {open && !isNew && (
        <div className="hb-f">
          <label>เพิ่มสต็อก (1 บรรทัด = 1 ชิ้น เช่น user:pass หรือคีย์)
            <textarea value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'ไอดี1:รหัส1\nไอดี2:รหัส2'} /></label>
          <div className="hb-row">
            <button className="hb-btn sm" onClick={async () => { if (await run(() => api(`/api/hub/products/${p.id}/stock`, 'POST', { lines }), 'เพิ่มสต็อกแล้ว')) setLines(''); }}>เพิ่มสต็อก</button>
            <button className="hb-btn danger sm" onClick={() => confirm('ล้างสต็อกที่ยังไม่ขายทั้งหมด?') && run(() => api(`/api/hub/products/${p.id}/stock`, 'DELETE'), 'ล้างสต็อกแล้ว')}>ล้างสต็อกที่เหลือ</button>
          </div>
          {items && <div className="hb-stock-list">{items.length === 0 ? <div><span>ไม่มีสต็อก</span></div> : items.map((it) => (
            <div key={it.id}><span>{it.content}</span><button onClick={() => run(() => api('/api/hub/stock/' + it.id, 'DELETE'))}>✕</button></div>
          ))}</div>}
        </div>
      )}
    </div>
  );
}

function ProductsTab({ products, limits, fee, run, say }) {
  return (
    <div>
      <h3 className="hb-h">สินค้า ({products.length}/{limits.products})</h3>
      <p className="hb-sub">ผู้ซื้อจ่ายจากกระเป๋าเงินเดียวกับ flexozy.site รายได้เข้ากระเป๋าของคุณทันที{fee ? ` (หักค่าธรรมเนียม ${fee}%)` : ''}</p>
      {products.length < limits.products && <ProductForm run={run} say={say} />}
      <div style={{ marginTop: 12 }}>{products.map((p) => <ProductForm key={p.id} p={p} run={run} say={say} />)}</div>
    </div>
  );
}

const BTN_NAMES = { buy: 'เมนูเลือกซื้อสินค้า', stock: 'ปุ่มเช็คสต็อก', balance: 'ปุ่มดูยอดเงิน', topup: 'ปุ่มเติมเงิน' };
function ButtonsTab({ shop, run }) {
  const [b, setB] = useState(shop.buttons);
  const set = (k, f, v) => setB((o) => ({ ...o, [k]: { ...o[k], [f]: v } }));
  return (
    <div className="hb-f">
      <p className="hb-sub" style={{ margin: 0 }}>ตั้งชื่อและอีโมจิของปุ่มในแผง Discord (ใช้อีโมจิเซิร์ฟเวอร์ได้ ถ้าบอทอยู่ในเซิร์ฟเวอร์นั้น — คัดลอกรูปแบบ <code>&lt;:ชื่อ:id&gt;</code> จาก Discord)</p>
      {Object.keys(BTN_NAMES).map((k) => (
        <div className="hb-two" key={k}>
          <label>{BTN_NAMES[k]}<input value={b[k].label} onChange={(e) => set(k, 'label', e.target.value)} maxLength={40} /></label>
          <label>อีโมจิ<div className="hb-row"><input style={{ flex: 1, minWidth: 0 }} value={b[k].emoji} onChange={(e) => set(k, 'emoji', e.target.value)} /><Emo v={b[k].emoji} size={22} /></div></label>
        </div>
      ))}
      <div><button className="hb-btn" onClick={() => run(() => api('/api/hub/shop', 'PUT', { buttons: b }), 'บันทึกปุ่มแล้ว — บอทจะอัปเดตแผงในไม่กี่วินาที')}>บันทึกปุ่ม</button></div>
    </div>
  );
}

function DiscordTab({ shop, d, run }) {
  const [g, setG] = useState(shop.guild_id || '');
  const [c, setC] = useState(shop.channel_id || '');
  const st = !shop.guild_id ? ['warn', 'ยังไม่ได้ใส่ไอดีเซิร์ฟเวอร์']
    : !shop.bot_in_guild ? ['warn', 'บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้']
    : !shop.guild_verified ? ['bad', shop.bot_note || 'ยังไม่ผ่านการตรวจสิทธิ์']
    : ['ok', `เชื่อมแล้ว${shop.guild_name ? ` · ${shop.guild_name}` : ''}`];
  return (
    <div className="hb-f">
      <ol className="hb-ol">
        <li>เชิญบอทเข้าเซิร์ฟเวอร์ของคุณ {d.inviteUrl ? <a className="hb-btn sm" href={d.inviteUrl} target="_blank" rel="noreferrer">เชิญบอท ↗</a> : <span className="hb-badge warn">ผู้ดูแลยังไม่ได้ตั้งค่า BOT_CLIENT_ID</span>}</li>
        <li>เปิดโหมดนักพัฒนาใน Discord (ตั้งค่า → ขั้นสูง) แล้วคลิกขวาที่ชื่อเซิร์ฟเวอร์ → <b>คัดลอกไอดี</b> นำมาวางด้านล่าง</li>
        <li>คลิกขวาที่ห้องที่จะให้บอทโพสต์แผงร้าน → คัดลอกไอดีห้อง</li>
      </ol>
      <div className="hb-two">
        <label>ไอดีเซิร์ฟเวอร์<input value={g} onChange={(e) => setG(e.target.value.trim())} placeholder="123456789012345678" inputMode="numeric" /></label>
        <label>ไอดีห้องแผงร้าน<input value={c} onChange={(e) => setC(e.target.value.trim())} placeholder="123456789012345678" inputMode="numeric" /></label>
      </div>
      <div className="hb-row"><button className="hb-btn" onClick={() => run(() => api('/api/hub/shop', 'PUT', { guild_id: g, channel_id: c }), 'บันทึกแล้ว — รอบอทตรวจสอบ')}>บันทึกและเชื่อมบอท</button><span className={'hb-badge ' + st[0]}>{st[1]}</span></div>
      <p className="hb-sub" style={{ margin: 0 }}>บอทจะตรวจว่าบัญชี Discord ของคุณเป็นเจ้าของหรือมีสิทธิ์ <b>Manage Server</b> ในเซิร์ฟเวอร์นั้น แล้วสร้างไฟล์ข้อมูลของเซิร์ฟเวอร์ + โพสต์แผงร้านให้อัตโนมัติ{shop.bot_seen_at ? ` · บอทเช็กล่าสุด ${new Date(shop.bot_seen_at).toLocaleTimeString('th-TH')}` : ''}</p>
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
