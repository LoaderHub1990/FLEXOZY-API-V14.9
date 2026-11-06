'use client';
// หลังบ้านร้านเช่า: ภาพรวม · หมวดหมู่ · สินค้า+สต็อก · ออเดอร์ · ลูกค้า · เติมเงิน
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, baht, fmtDate } from './api';
import { useShell } from './Shell';

const TABS = [['overview', 'ภาพรวม'], ['products', 'สินค้า'], ['categories', 'หมวดหมู่'], ['orders', 'ออเดอร์'], ['customers', 'ลูกค้า'], ['topups', 'เติมเงิน']];
const post = (rental, op, data) => api('/api/rent/store', 'POST', { rental, op, ...data });

export default function StoreManage({ id }) {
  const { openAuth } = useShell();
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [ov, setOv] = useState(null);
  const load = useCallback(() => api(`/api/rent/store?rental=${id}&view=${tab}`).then((r) => { setD(r); setErr(''); if (tab === 'overview') setOv(r); }).catch((e) => setErr(e.message)), [id, tab]);
  useEffect(() => { setD(null); load(); }, [load]);
  useEffect(() => { api(`/api/rent/store?rental=${id}&view=overview`).then(setOv).catch(() => {}); }, [id]);

  if (err && !d) return <div className="panel" style={{ maxWidth: 480 }}><div className="msg err">{err}</div>{err.includes('เข้าสู่ระบบ') && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => openAuth('login')}>เข้าสู่ระบบ</button>}<p style={{ marginTop: 10 }}><Link href="/rent/my" className="btn btn-sm">← เว็บที่เช่าไว้</Link></p></div>;
  return (
    <>
      <div className="page-h">
        <div>
          <div className="crumb"><Link href="/rent/my">เว็บที่เช่าไว้</Link>/<span>จัดการร้าน</span></div>
          <h1>🛍 จัดการร้าน {ov?.sub && <span className="rent-url">{ov.sub}</span>}</h1>
        </div>
        {ov?.sub && <a className="btn" href={`/site/${ov.sub}`} target="_blank" rel="noopener noreferrer">ดูหน้าร้าน ↗</a>}
      </div>
      <div className="tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'topups' && ov?.review > 0 ? ` (${ov.review})` : ''}</button>)}
      </div>
      {err && <div className="msg err">{err}</div>}
      {!d ? <div className="muted">กำลังโหลด…</div> : tab === 'overview' ? <Overview d={d} />
        : tab === 'categories' ? <Categories id={id} rows={d.rows} reload={load} setErr={setErr} />
        : tab === 'products' ? <Products id={id} rows={d.rows} reload={load} setErr={setErr} />
        : tab === 'orders' ? <Orders rows={d.rows} />
        : tab === 'customers' ? <Customers id={id} rows={d.rows} reload={load} setErr={setErr} />
        : <Topups id={id} rows={d.rows} reload={load} setErr={setErr} />}
    </>
  );
}

const Stat = ({ l, v }) => <div className="panel" style={{ padding: 16 }}><div className="subtle" style={{ fontSize: 13 }}>{l}</div><div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{v}</div></div>;
function Overview({ d }) {
  return (
    <>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        <Stat l="ลูกค้า" v={d.customers} /><Stat l="ออเดอร์" v={d.orders} /><Stat l="ยอดขายรวม" v={`฿${baht(d.revenue)}`} />
        <Stat l="เติมเงินเข้าแล้ว" v={`฿${baht(d.topups)}`} /><Stat l="สินค้า" v={d.products} /><Stat l="สต็อกคงเหลือ" v={d.stock} />
      </div>
      <div className="panel" style={{ marginTop: 16, display: 'grid', gap: 6 }}>
        <b>เริ่มต้นใช้งาน</b>
        <span className="muted" style={{ fontSize: 14 }}>1) สร้างหมวดหมู่ → 2) เพิ่มสินค้า + ใส่สต็อก (หนึ่งบรรทัดต่อหนึ่งชิ้น) → 3) ตั้งเบอร์ TrueMoney ที่ “ตั้งค่า / ดีไซน์” เพื่อรับเติมเงินจากลูกค้า → 4) แชร์ลิงก์ร้านให้ลูกค้า</span>
        {d.review > 0 && <span className="tag warn" style={{ justifySelf: 'start' }}>มี {d.review} รายการเติมเงินรอตรวจสอบ</span>}
      </div>
    </>
  );
}

function Categories({ id, rows, reload, setErr }) {
  const [name, setName] = useState('');
  const run = (p) => p.then(reload).catch((e) => setErr(e.message));
  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
      <form className="panel" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(post(id, 'cat.save', { name })); setName(''); }}>
        <input className="input" placeholder="ชื่อหมวดหมู่ใหม่" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /><button className="btn btn-primary">+ เพิ่ม</button>
      </form>
      {rows.map((c) => (
        <div className="panel" key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12 }}>
          <input className="input" defaultValue={c.name} maxLength={40} style={{ flex: 1 }} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run(post(id, 'cat.save', { id: c.id, name: e.target.value, image: c.image }))} />
          <input className="input" defaultValue={c.image} placeholder="ลิงก์รูปหมวดหมู่ https://…" style={{ flex: 2 }} onBlur={(e) => e.target.value !== c.image && run(post(id, 'cat.save', { id: c.id, name: c.name, image: e.target.value }))} />
          <button className="btn btn-sm btn-danger" onClick={() => confirm(`ลบหมวด “${c.name}” ? (สินค้าในหมวดจะไม่หาย)`) && run(post(id, 'cat.delete', { id: c.id }))}>ลบ</button>
        </div>
      ))}
      {rows.length === 0 && <div className="empty">ยังไม่มีหมวดหมู่</div>}
    </div>
  );
}

function Products({ id, rows, reload, setErr }) {
  const [cats, setCats] = useState([]);
  const [edit, setEdit] = useState(null);
  useEffect(() => { api(`/api/rent/store?rental=${id}&view=categories`).then((r) => setCats(r.rows)).catch(() => {}); }, [id]);
  const blank = { name: '', description: '', price: '', image: '', category_id: '', unlimited: false, delivery_text: '', active: true };
  return (
    <>
      <button className="btn btn-primary" onClick={() => setEdit({ ...blank })}>+ เพิ่มสินค้า</button>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {rows.map((p) => (
          <div className="panel" key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 14 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b>{p.name}</b> <span className={'tag ' + (p.active ? 'ok' : '')}>{p.active ? 'เปิดขาย' : 'ปิด'}</span>
              <div className="subtle" style={{ fontSize: 13 }}>฿{baht(p.price)} · ขายแล้ว {p.sold} · {p.unlimited ? 'ส่งข้อความอัตโนมัติ (ไม่จำกัด)' : `สต็อก ${p.stock}`}</div>
            </div>
            <button className="btn btn-sm" onClick={() => setEdit({ ...p, price: p.price / 100, category_id: p.category_id || '' })}>แก้ไข / สต็อก</button>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">ยังไม่มีสินค้า</div>}
      </div>
      {edit && <ProductForm id={id} cats={cats} p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} setErr={setErr} />}
    </>
  );
}

function ProductForm({ id, cats, p, onClose, onSaved, setErr }) {
  const [f, setF] = useState(p);
  const [lines, setLines] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const up = (k, v) => setF((o) => ({ ...o, [k]: v }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const r = await post(id, 'prod.save', f);
      const pid = f.id || r.id;
      if (lines.trim() && !f.unlimited) await post(id, 'stock.add', { productId: pid, lines });
      onSaved();
    } catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal wide" onSubmit={save} style={{ display: 'grid', gap: 10, maxHeight: '90vh', overflow: 'auto' }}>
        <h3>{f.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
        <input className="input" placeholder="ชื่อสินค้า" value={f.name} onChange={(e) => up('name', e.target.value)} maxLength={80} required />
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <input className="input" type="number" min="0" step="0.01" placeholder="ราคา (บาท)" value={f.price} onChange={(e) => up('price', e.target.value)} required />
          <select className="input" value={f.category_id} onChange={(e) => up('category_id', e.target.value)}><option value="">ไม่มีหมวดหมู่</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <textarea className="input" rows={2} placeholder="รายละเอียด" value={f.description} onChange={(e) => up('description', e.target.value)} maxLength={600} />
        <input className="input" placeholder="ลิงก์รูปสินค้า https://… (ไม่บังคับ)" value={f.image} onChange={(e) => up('image', e.target.value)} />
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.unlimited} onChange={(e) => up('unlimited', e.target.checked)} /> <span>ส่งข้อความเดิมให้ทุกคน (ไม่จำกัดจำนวน เช่น ลิงก์เข้ากลุ่ม/บริการ)</span></label>
        {f.unlimited
          ? <textarea className="input" rows={3} placeholder="ข้อความที่ส่งให้ลูกค้าหลังซื้อ" value={f.delivery_text} onChange={(e) => up('delivery_text', e.target.value)} maxLength={1000} />
          : <>
              <textarea className="input" rows={5} placeholder={'เพิ่มสต็อก: หนึ่งบรรทัดต่อหนึ่งชิ้น (คีย์ / ไอดี:รหัส ฯลฯ)' + (f.id ? `\nสต็อกคงเหลือตอนนี้ ${f.stock}` : '')} value={lines} onChange={(e) => setLines(e.target.value)} />
              {f.id && f.stock > 0 && <button type="button" className="btn btn-sm btn-danger" style={{ justifySelf: 'start' }} onClick={async () => { if (confirm('ลบสต็อกที่ยังไม่ขายทั้งหมด?')) { await post(id, 'stock.clear', { productId: f.id }); onSaved(); } }}>ล้างสต็อกที่ยังไม่ขาย</button>}
            </>}
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.active} onChange={(e) => up('active', e.target.checked)} /> <span>เปิดขาย</span></label>
        {msg && <div className="msg err">{msg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>{busy ? <span className="spin" /> : 'บันทึก'}</button>
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          {f.id && <button type="button" className="btn btn-danger" onClick={async () => { if (confirm('ลบสินค้านี้พร้อมสต็อก?')) { await post(id, 'prod.delete', { id: f.id }).catch((e) => setErr(e.message)); onSaved(); } }}>ลบ</button>}
        </div>
      </form>
    </div>
  );
}

function Orders({ rows }) {
  if (!rows.length) return <div className="empty">ยังไม่มีออเดอร์</div>;
  return <div style={{ display: 'grid', gap: 8 }}>{rows.map((o) => (
    <div className="panel" key={o.id} style={{ padding: 12, display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b>#{o.id} {o.product_name} × {o.qty}</b><b>฿{baht(o.total)}</b></div>
      <div className="subtle" style={{ fontSize: 13 }}>{o.username || '—'} · {fmtDate(o.created_at)}</div>
    </div>))}</div>;
}

function Customers({ id, rows, reload, setErr }) {
  const run = (p) => p.then(reload).catch((e) => setErr(e.message));
  if (!rows.length) return <div className="empty">ยังไม่มีลูกค้า</div>;
  return <div style={{ display: 'grid', gap: 8 }}>{rows.map((u) => (
    <div className="panel" key={u.id} style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 160 }}><b>{u.username}</b> {u.banned && <span className="tag bad">ระงับ</span>}<div className="subtle" style={{ fontSize: 13 }}>฿{baht(u.balance)} · สมัคร {fmtDate(u.created_at)}</div></div>
      <button className="btn btn-sm" onClick={() => { const v = prompt('เพิ่ม/ลดยอด (บาท) เช่น 50 หรือ -20'); if (v && !isNaN(Number(v))) run(post(id, 'cust.adjust', { userId: u.id, delta: Number(v) })); }}>ปรับยอด</button>
      <button className="btn btn-sm" onClick={() => run(post(id, 'cust.ban', { userId: u.id, banned: !u.banned }))}>{u.banned ? 'ปลดระงับ' : 'ระงับ'}</button>
    </div>))}</div>;
}

function Topups({ id, rows, reload, setErr }) {
  const run = (p) => p.then(reload).catch((e) => setErr(e.message));
  if (!rows.length) return <div className="empty">ยังไม่มีรายการเติมเงิน</div>;
  const tag = { credited: ['ok', 'เติมแล้ว'], review: ['warn', 'รอตรวจสอบ'], redeemed: ['warn', 'รับซองแล้ว (ยังไม่เติม)'], failed: ['bad', 'ไม่สำเร็จ'], pending: ['', 'กำลังดำเนินการ'] };
  return <div style={{ display: 'grid', gap: 8 }}>
    <p className="subtle" style={{ fontSize: 13 }}>ถ้าสถานะ “รอตรวจสอบ” ให้เช็กกระเป๋า TrueMoney ของคุณ ถ้าเงินเข้าแล้วกด “เติมให้ลูกค้า” แล้วใส่ยอดที่ได้รับ</p>
    {rows.map((t) => { const [c, l] = tag[t.status] || ['', t.status]; return (
      <div className="panel" key={t.id} style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}><b>#{t.id} {t.username || '—'}</b> <span className={'tag ' + c}>{l}</span><div className="subtle" style={{ fontSize: 13 }}>{t.amount ? `฿${baht(t.amount)} · ` : ''}{fmtDate(t.created_at)}</div></div>
        {['review', 'redeemed', 'failed', 'pending'].includes(t.status) && <button className="btn btn-sm btn-primary" onClick={() => { const v = prompt('ยอดที่เงินเข้าจริง (บาท)'); if (v && Number(v) > 0) run(post(id, 'topup.credit', { id: t.id, amount: Number(v) })); }}>เติมให้ลูกค้า</button>}
      </div>); })}
  </div>;
}
