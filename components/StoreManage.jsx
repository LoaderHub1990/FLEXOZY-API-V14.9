'use client';
// หลังบ้านผู้เช่า (ผู้ขาย) — โครงเดียวกับหลังบ้านเว็บหลัก
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, baht, fmtDate } from './api';
import { Modal, useShell } from './Shell';
import Icon from './Icons';
import { TEMPLATES } from '@/lib/templates';

const post = (rental, op, data) => api('/api/rent/store', 'POST', { rental, op, ...data });
const get = (rental, view, extra = '') => api(`/api/rent/store?rental=${rental}&view=${view}${extra}`);
const Err = ({ m }) => (m ? <div className="msg err">{m}</div> : null);
const Table = ({ head, children }) => <div className="table-w"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
const Empty = ({ children }) => <div className="empty">{children}</div>;

function useView(id, view, extra = '') {
  const [rows, setRows] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => get(id, view, extra).then((r) => { setData(r); setRows(r.rows ?? null); setErr(''); }).catch((e) => setErr(e.message)), [id, view, extra]);
  useEffect(() => { load(); }, [load]);
  return { rows, data, err, load, setErr };
}

const TABS = [
  ['overview', 'ภาพรวม', Overview, 'dash', 'สรุปยอดขายและสถานะร้านแบบเรียลไทม์', 'หลัก'],
  ['products', 'สินค้า / สต็อก', Products, 'box', 'เพิ่ม แก้ไข และเติมสต็อกสินค้า', 'ร้านค้า'],
  ['categories', 'หมวดหมู่', Categories, 'grid', 'จัดหมวดหมู่ รูปหมวด และลำดับ', 'ร้านค้า'],
  ['orders', 'ออเดอร์', Orders, 'receipt', 'ประวัติการสั่งซื้อ พร้อมคีย์ที่ส่งให้ลูกค้า', 'ร้านค้า'],
  ['coupons', 'โค้ดส่วนลด', Coupons, 'ticket', 'สร้างโค้ดส่วนลดและกำหนดเงื่อนไข', 'ร้านค้า'],
  ['topups', 'เติมเงิน', Topups, 'wallet', 'ตรวจรายการเติมเงินและเติมให้ลูกค้า', 'การเงิน'],
  ['customers', 'ลูกค้า', Customers, 'users', 'ปรับยอด ระงับ รีเซ็ตรหัสผ่าน', 'การเงิน'],
  ['design', 'ดีไซน์ & โทนสี', Design, 'layers', 'เลือกแบบหน้าร้าน ปรับสีหลักและธีมพร้อมพรีวิวสด', 'ตั้งค่า'],
  ['settings', 'ตั้งค่าร้าน', Settings, 'cog', 'ชื่อร้าน ประกาศ ช่องทางติดต่อ และเบอร์รับเงิน TrueMoney', 'ตั้งค่า'],
];

export default function StoreManage({ id }) {
  const { openAuth } = useShell();
  const [tab, setTab] = useState('overview');
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get(id, 'overview').then(setInfo).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="panel" style={{ maxWidth: 480 }}><div className="msg err">{err}</div>{err.includes('เข้าสู่ระบบ') && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => openAuth('login')}>เข้าสู่ระบบ</button>}<p style={{ marginTop: 10 }}><Link href="/rent/my" className="btn btn-sm">← เว็บที่เช่าไว้</Link></p></div>;
  const cur = TABS.find((t) => t[0] === tab);
  const Cur = cur[2];
  const groups = [...new Set(TABS.map((t) => t[5]))];
  return (
    <div className="adm">
      <aside className="adm-side" aria-label="เมนูหลังบ้านร้าน">
        <div className="adm-brand"><span className="adm-brand-ic"><Icon n="store" size={20} /></span><div><b>หลังบ้านร้าน</b><small>{info?.sub ? `${info.sub}` : '…'}</small></div></div>
        {groups.map((g) => (
          <div key={g} style={{ display: 'contents' }}>
            <div className="adm-grp">{g}</div>
            {TABS.filter((t) => t[5] === g).map(([k, l, , ic]) => <button key={k} type="button" className={'adm-nav' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}><Icon n={ic} size={17} />{l}</button>)}
          </div>
        ))}
        <div className="adm-grp">ลิงก์ด่วน</div>
        {info && <a className="adm-nav adm-link" href={info.url} target="_blank" rel="noopener noreferrer"><Icon n="store" size={17} />ดูหน้าร้าน<Icon n="ext" size={13} className="ext" /></a>}
        <Link className="adm-nav adm-link" href="/rent/my"><Icon n="server" size={17} />เว็บที่เช่าไว้ / ต่ออายุ</Link>
      </aside>
      <section className="adm-main">
        <div className="adm-top">
          <div><h1>{cur[1]}</h1><p>{cur[4]}</p></div>
          <div className="adm-top-act">{info && <a className="btn btn-sm btn-primary" href={info.url} target="_blank" rel="noopener noreferrer"><Icon n="store" size={15} /> หน้าร้าน</a>}</div>
        </div>
        <div className="adm-body"><Cur key={tab} id={id} go={setTab} info={info} /></div>
      </section>
    </div>
  );
}

/* ===================== ภาพรวม ===================== */
function Overview({ id, go }) {
  const { data: s, err, load } = useView(id, 'overview');
  if (!s) return err ? <div className="panel"><Err m={err} /><button className="btn btn-sm" onClick={load}>ลองใหม่</button></div> : <div className="muted">กำลังโหลด…</div>;
  const Big = ({ ic, l, v, u, tone = '' }) => <div className={'kpi big ' + tone}><span className="kpi-ic"><Icon n={ic} size={19} /></span><span className="kpi-l">{l}</span><b className="kpi-v">{v}{u && <small>{u}</small>}</b></div>;
  const Kpi = ({ ic, l, v, u, tone = '', to }) => {
    const inner = <><span className="kpi-ic"><Icon n={ic} size={18} /></span><span className="kpi-l">{l}</span><b className="kpi-v">{v}{u && <small>{u}</small>}</b>{to && <Icon n="arrow" size={15} className="kpi-go" />}</>;
    return to ? <button type="button" className={'kpi ' + tone} onClick={() => go(to)}>{inner}</button> : <div className={'kpi ' + tone}>{inner}</div>;
  };
  const QA = ({ ic, t, d, to }) => <button type="button" className="qa" onClick={() => go(to)}><span className="kpi-ic"><Icon n={ic} size={16} /></span><span><b>{t}</b><small>{d}</small></span></button>;
  const max = Math.max(1, ...s.days.map((d) => d.total));
  const left = Math.ceil((new Date(s.expires_at) - Date.now()) / 86400000);
  return (
    <>
      {left <= 7 && <div className="msg err" style={{ marginBottom: 14 }}>{left > 0 ? `ร้านจะหมดอายุในอีก ${left} วัน` : 'ร้านหมดอายุแล้ว'} — <Link href="/rent/my" style={{ textDecoration: 'underline' }}>ต่ออายุ</Link></div>}
      <div className="adm-hero">
        <Big ic="wallet" l="รายได้รวม" v={baht(s.revenue)} u="฿" />
        <Big ic="flame" l="รายได้ 24 ชั่วโมงล่าสุด" v={baht(s.revenue_today)} u="฿" tone="green" />
        <Big ic="layers" l="ยอดเงินคงเหลือของลูกค้าในร้าน" v={baht(s.balances)} u="฿" tone="cyan" />
      </div>
      <div className="adm-kpis">
        <Kpi ic="users" l="ลูกค้าทั้งหมด" v={s.customers} to="customers" />
        <Kpi ic="receipt" l="ออเดอร์ทั้งหมด" v={s.orders} to="orders" />
        <Kpi ic="box" l="สต็อกคงเหลือ" v={s.stock} u="ชิ้น" to="products" tone="cyan" />
        <Kpi ic="bell" l="เติมเงินรอตรวจ" v={s.review} u="รายการ" to="topups" tone={'warn' + (s.review > 0 ? ' hot' : '')} />
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="adm-sec-h"><h3>ยอดขาย 7 วันล่าสุด</h3><span className="subtle" style={{ fontSize: 13 }}>รวม {baht(s.days.reduce((a, d) => a + d.total, 0))} ฿</span></div>
        <div className="bars" role="img" aria-label="ยอดขาย 7 วัน">
          {s.days.map((d) => <div key={d.day} className="bar"><i style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }} title={`${baht(d.total)} ฿`} /><b>{d.total ? baht(d.total) : ''}</b><span>{d.day}</span></div>)}
        </div>
      </div>
      {s.low.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="adm-sec-h"><h3>⚠ สต็อกใกล้หมด</h3></div>
          {s.low.map((p) => <div key={p.id} className="row" style={{ padding: '6px 0' }}><span>{p.name}</span><span className={'tag ' + (p.stock === 0 ? 'bad' : 'warn')}>เหลือ {p.stock}</span></div>)}
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => go('products')}>ไปเติมสต็อก</button>
        </div>
      )}
      <div className="adm-sec-h"><h3>ทางลัด</h3></div>
      <div className="adm-quick">
        <QA ic="box" t="จัดการสินค้า / สต็อก" d="เพิ่ม แก้ไข เติมสต็อก" to="products" />
        <QA ic="ticket" t="โค้ดส่วนลด" d="สร้างและจำกัดสิทธิ์" to="coupons" />
        <QA ic="layers" t="ดีไซน์ & โทนสี" d="เลือกแบบ ปรับสีหลัก" to="design" />
        <QA ic="cog" t="ตั้งค่าร้าน" d="ประกาศ ติดต่อ เบอร์รับเงิน" to="settings" />
      </div>
    </>
  );
}

/* ===================== สินค้า / สต็อก ===================== */
function Products({ id }) {
  const { rows, err, load, setErr } = useView(id, 'products');
  const cats = useView(id, 'categories');
  const [ed, setEd] = useState(null);
  const [st, setSt] = useState(null);
  const run = (p) => p.then(load).catch((e) => setErr(e.message));
  const blank = { name: '', category_id: '', price: '', image: '', description: '', mode: 'normal', delivery_text: '', active: true, lines: '' };
  const toEd = (r) => ({ ...r, price: r.price / 100, category_id: r.category_id || '', mode: r.unlimited ? 'unlimited' : r.pick_random ? 'random' : 'normal', lines: '' });
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>สินค้า</h3><button className="btn btn-primary btn-sm" onClick={() => setEd({ ...blank })}>+ เพิ่มสินค้า</button></div>
      <Err m={err} />
      {rows && rows.length === 0 ? <Empty>ยังไม่มีสินค้า — กด “เพิ่มสินค้า” เพื่อเริ่มต้น</Empty> : (
        <Table head={['รูป', 'ชื่อ', 'ราคา', 'สต็อก', 'ขายแล้ว', 'สถานะ', '']}>
          {(rows || []).map((r, i) => (
            <tr key={r.id}>
              <td>{r.image && <img src={r.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />}</td>
              <td><div>{r.name}</div><div className="subtle" style={{ fontSize: 12 }}>#{r.id}{r.pick_random ? ' · สุ่มจากสต็อก' : ''}{r.unlimited ? ' · ส่งข้อความอัตโนมัติ' : ''}</div></td>
              <td>{baht(r.price)} ฿</td>
              <td>{r.unlimited ? <span className="tag ok">อัตโนมัติ ∞</span> : <button className="btn btn-sm" onClick={() => setSt(r)}>{r.stock} · จัดการ</button>}</td>
              <td>{r.sold}</td>
              <td><span className={'tag ' + (r.active ? 'ok' : '')}>{r.active ? 'แสดง' : 'ซ่อน'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" disabled={i === 0} onClick={() => run(post(id, 'prod.move', { id: r.id, dir: 'up' }))} aria-label="เลื่อนขึ้น">↑</button>{' '}
                <button className="btn btn-sm" disabled={i === rows.length - 1} onClick={() => run(post(id, 'prod.move', { id: r.id, dir: 'down' }))} aria-label="เลื่อนลง">↓</button>{' '}
                <button className="btn btn-sm" onClick={() => setEd(toEd(r))}>แก้ไข</button>{' '}
                <button className="btn btn-sm btn-danger" onClick={() => confirm(`ลบสินค้า “${r.name}” พร้อมสต็อก?`) && run(post(id, 'prod.delete', { id: r.id }))}>ลบ</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {st && <Stock id={id} product={st} onClose={() => { setSt(null); load(); }} />}
      {ed && <ProductModal id={id} cats={cats.rows || []} p={ed} onClose={() => setEd(null)} onSaved={() => { setEd(null); load(); }} />}
    </>
  );
}

function ProductModal({ id, cats, p, onClose, onSaved }) {
  const [f, setF] = useState(p);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const up = (k, v) => setF((o) => ({ ...o, [k]: v }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const r = await post(id, 'prod.save', { ...f, unlimited: f.mode === 'unlimited', pick_random: f.mode === 'random' });
      if (f.lines.trim() && f.mode !== 'unlimited') await post(id, 'stock.add', { productId: f.id || r.id, lines: f.lines });
      onSaved();
    } catch (x) { setMsg(x.message); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={save} style={{ display: 'grid', gap: 4 }}>
        <h3>{f.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
        <label className="label">ชื่อสินค้า</label><input className="input" value={f.name} onChange={(e) => up('name', e.target.value)} maxLength={80} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="label">หมวดหมู่</label><select className="input" value={f.category_id} onChange={(e) => up('category_id', e.target.value)}><option value="">— ไม่มี —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">ราคา (บาท)</label><input className="input" type="number" min="0" step="0.01" value={f.price} onChange={(e) => up('price', e.target.value)} required /></div>
        </div>
        <label className="label">ลิงก์รูปสินค้า (ไม่บังคับ)</label><input className="input" value={f.image} onChange={(e) => up('image', e.target.value)} placeholder="https://…" />
        <label className="label">รายละเอียด</label><textarea className="input" rows={3} value={f.description} onChange={(e) => up('description', e.target.value)} maxLength={600} />
        <label className="label">รูปแบบการส่งสินค้า</label>
        <select className="input" value={f.mode} onChange={(e) => up('mode', e.target.value)}>
          <option value="normal">ปกติ — ส่งจากสต็อกตามลำดับที่ใส่</option>
          <option value="random">สุ่ม — สุ่มชิ้นจากสต็อก</option>
          <option value="unlimited">ส่งข้อความเดิมอัตโนมัติ (ไม่จำกัดจำนวน)</option>
        </select>
        {f.mode === 'unlimited'
          ? <><label className="label">ข้อความที่ส่งให้ลูกค้าหลังซื้อ</label><textarea className="input" rows={3} value={f.delivery_text} onChange={(e) => up('delivery_text', e.target.value)} maxLength={1000} placeholder="เช่น ลิงก์เข้ากลุ่ม / ขั้นตอนรับบริการ" /></>
          : <><label className="label">{f.id ? 'เติมสต็อกเพิ่ม' : 'สต็อกเริ่มต้น'} (1 บรรทัด = 1 ชิ้น)</label><textarea className="input" rows={4} value={f.lines} onChange={(e) => up('lines', e.target.value)} placeholder={'KEY-AAAA\nKEY-BBBB'} />{f.id && <p className="subtle" style={{ fontSize: 12.5 }}>สต็อกคงเหลือตอนนี้ {f.stock} ชิ้น — ดู/ลบรายชิ้นได้ที่ปุ่ม “จัดการ” ในตาราง</p>}</>}
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '12px 0 4px' }}><input type="checkbox" checked={f.active} onChange={(e) => up('active', e.target.checked)} /> <span>แสดงในหน้าร้าน</span></label>
        <Err m={msg} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>{busy ? <span className="spin" /> : 'บันทึก'}</button><button type="button" className="btn" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </Modal>
  );
}

function Stock({ id, product, onClose }) {
  const { rows, load, setErr, err } = useView(id, 'stock', `&productId=${product.id}`);
  const [lines, setLines] = useState('');
  const [msg, setMsg] = useState(null);
  async function add() { setMsg(null); try { const r = await post(id, 'stock.add', { productId: product.id, lines }); setLines(''); setMsg({ t: 'ok', m: `เพิ่ม ${r.added} รายการแล้ว` }); load(); } catch (e) { setMsg({ t: 'err', m: e.message }); } }
  return (
    <Modal onClose={onClose} wide>
      <h3>สต็อก: {product.name}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>1 บรรทัด = 1 ชิ้นที่ส่งให้ลูกค้า (คีย์/โค้ด/ไอดีพาส) เพิ่มได้ครั้งละไม่เกิน 5,000 บรรทัด</p>
      <textarea className="input" rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA\nKEY-BBBB'} />
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={add} disabled={!lines.trim()}>เพิ่มสต็อก</button>
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}<Err m={err} />
      <div className="row" style={{ margin: '18px 0 8px' }}><b>ยังไม่ขาย ({(rows || []).length}{(rows || []).length >= 500 ? '+' : ''})</b>
        {(rows || []).length > 0 && <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('ลบสต็อกที่ยังไม่ขายทั้งหมดของสินค้านี้?')) { await post(id, 'stock.clear', { productId: product.id }).catch((e) => setErr(e.message)); load(); } }}>ลบทั้งหมด</button>}</div>
      <div style={{ maxHeight: 240, overflow: 'auto' }}>
        {(rows || []).map((r) => <div key={r.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}><code style={{ fontSize: 13, wordBreak: 'break-all' }}>{r.content}</code><button className="btn btn-sm" onClick={async () => { await post(id, 'stock.delete', { id: r.id }); load(); }}>ลบ</button></div>)}
        {rows && rows.length === 0 && <div className="subtle" style={{ padding: 8 }}>ไม่มีสต็อกที่ยังไม่ขาย</div>}
      </div>
    </Modal>
  );
}

/* ===================== หมวดหมู่ ===================== */
function Categories({ id }) {
  const { rows, err, load, setErr } = useView(id, 'categories');
  const [name, setName] = useState('');
  const run = (p) => p.then(load).catch((e) => setErr(e.message));
  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
      <form className="panel" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); run(post(id, 'cat.save', { name })); setName(''); }}>
        <input className="input" placeholder="ชื่อหมวดหมู่ใหม่" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /><button className="btn btn-primary">+ เพิ่ม</button>
      </form>
      <Err m={err} />
      {(rows || []).map((c, i) => (
        <div className="panel" key={c.id + ':' + c.name + c.image} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, flexWrap: 'wrap' }}>
          {c.image ? <img src={c.image} alt="" style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 8 }} /> : <span className="subtle" style={{ width: 52, fontSize: 11 }}>ไม่มีรูป</span>}
          <input className="input" defaultValue={c.name} maxLength={40} style={{ flex: '1 1 140px' }} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run(post(id, 'cat.save', { id: c.id, name: e.target.value, image: c.image }))} />
          <input className="input" defaultValue={c.image} placeholder="ลิงก์รูปหมวดหมู่ https://…" style={{ flex: '2 1 200px' }} onBlur={(e) => e.target.value !== c.image && run(post(id, 'cat.save', { id: c.id, name: c.name, image: e.target.value }))} />
          <button className="btn btn-sm" disabled={i === 0} onClick={() => run(post(id, 'cat.move', { id: c.id, dir: 'up' }))}>↑</button>
          <button className="btn btn-sm" disabled={i === rows.length - 1} onClick={() => run(post(id, 'cat.move', { id: c.id, dir: 'down' }))}>↓</button>
          <button className="btn btn-sm btn-danger" onClick={() => confirm(`ลบหมวด “${c.name}” ? (สินค้าในหมวดจะไม่หาย)`) && run(post(id, 'cat.delete', { id: c.id }))}>ลบ</button>
        </div>
      ))}
      {rows && rows.length === 0 && <Empty>ยังไม่มีหมวดหมู่</Empty>}
    </div>
  );
}

/* ===================== ออเดอร์ ===================== */
function SearchBar({ onSearch, ph }) {
  const [v, setV] = useState('');
  return <form onSubmit={(e) => { e.preventDefault(); onSearch(v); }} style={{ display: 'flex', gap: 8 }}><input className="input" style={{ width: 230 }} placeholder={ph} value={v} onChange={(e) => setV(e.target.value)} /><button className="btn btn-sm">ค้นหา</button></form>;
}
function Orders({ id }) {
  const [q, setQ] = useState('');
  const { rows, err } = useView(id, 'orders', q ? `&q=${encodeURIComponent(q)}` : '');
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>ออเดอร์ล่าสุด</h3><SearchBar onSearch={setQ} ph="ค้นหาลูกค้า / สินค้า / เลขออเดอร์" /></div>
      <Err m={err} />
      {rows && rows.length === 0 ? <Empty>ยังไม่มีออเดอร์</Empty> : (
        <Table head={['#', 'ลูกค้า', 'สินค้า', 'ยอด', 'เมื่อ', '']}>
          {(rows || []).map((o) => (
            <React.Fragment key={o.id}>
              <tr><td>#{o.id}</td><td>{o.username || '—'}</td><td>{o.product_name} × {o.qty}{o.coupon && <div className="subtle" style={{ fontSize: 12 }}>โค้ด {o.coupon} (-{baht(o.discount)} ฿)</div>}</td><td>{baht(o.total)} ฿</td><td className="subtle">{fmtDate(o.created_at)}</td>
                <td><button className="btn btn-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? 'ซ่อน' : 'ดูคีย์'}</button></td></tr>
              {open === o.id && <tr><td colSpan={6}><pre className="codebox" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{o.delivered}</pre></td></tr>}
            </React.Fragment>
          ))}
        </Table>
      )}
    </>
  );
}

/* ===================== โค้ดส่วนลด ===================== */
function Coupons({ id }) {
  const { rows, err, load, setErr } = useView(id, 'coupons');
  const [ed, setEd] = useState(null);
  const blank = { code: '', kind: 'percent', value: 10, min_total: 0, max_uses: 0, once_per_user: true, expires_at: '', active: true };
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>โค้ดส่วนลด</h3><button className="btn btn-primary btn-sm" onClick={() => setEd({ ...blank })}>+ สร้างโค้ด</button></div>
      <Err m={err} />
      {rows && rows.length === 0 ? <Empty>ยังไม่มีโค้ดส่วนลด</Empty> : (
        <Table head={['โค้ด', 'ส่วนลด', 'ขั้นต่ำ', 'ใช้แล้ว', 'หมดอายุ', 'สถานะ', '']}>
          {(rows || []).map((c) => (
            <tr key={c.id}><td><b>{c.code}</b></td><td>{c.kind === 'percent' ? `${c.value}%` : `${baht(c.value)} ฿`}</td><td>{c.min_total ? `${baht(c.min_total)} ฿` : '—'}</td>
              <td>{c.used}{c.max_uses ? ` / ${c.max_uses}` : ''}</td><td className="subtle">{c.expires_at ? fmtDate(c.expires_at) : '—'}</td>
              <td><span className={'tag ' + (c.active ? 'ok' : '')}>{c.active ? 'ใช้งาน' : 'ปิด'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm" onClick={() => setEd({ ...c, value: c.kind === 'fixed' ? c.value / 100 : c.value, min_total: c.min_total / 100, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '' })}>แก้ไข</button>{' '}
                <button className="btn btn-sm btn-danger" onClick={() => confirm(`ลบโค้ด ${c.code} ?`) && post(id, 'coupon.delete', { id: c.id }).then(load).catch((e) => setErr(e.message))}>ลบ</button></td></tr>
          ))}
        </Table>
      )}
      {ed && <CouponModal id={id} c={ed} onClose={() => setEd(null)} onSaved={() => { setEd(null); load(); }} />}
    </>
  );
}
function CouponModal({ id, c, onClose, onSaved }) {
  const [f, setF] = useState(c); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const up = (k, v) => setF((o) => ({ ...o, [k]: v }));
  async function save(e) { e.preventDefault(); setBusy(true); setMsg(''); try { await post(id, 'coupon.save', { ...f, expires_at: f.expires_at ? `${f.expires_at}T23:59:59+07:00` : '' }); onSaved(); } catch (x) { setMsg(x.message); } finally { setBusy(false); } }
  return (
    <Modal onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 4 }}>
        <h3>{f.id ? 'แก้ไขโค้ด' : 'สร้างโค้ดส่วนลด'}</h3>
        <label className="label">โค้ด (A-Z 0-9 - _)</label><input className="input" value={f.code} onChange={(e) => up('code', e.target.value.toUpperCase())} maxLength={30} placeholder="WELCOME10" required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="label">ประเภท</label><select className="input" value={f.kind} onChange={(e) => up('kind', e.target.value)}><option value="percent">เปอร์เซ็นต์ (%)</option><option value="fixed">ลดเป็นบาท</option></select></div>
          <div><label className="label">{f.kind === 'percent' ? 'ลดกี่ %' : 'ลดกี่บาท'}</label><input className="input" type="number" min="1" max={f.kind === 'percent' ? 100 : undefined} step={f.kind === 'percent' ? 1 : 0.01} value={f.value} onChange={(e) => up('value', e.target.value)} required /></div>
          <div><label className="label">ยอดสั่งซื้อขั้นต่ำ (บาท)</label><input className="input" type="number" min="0" step="0.01" value={f.min_total} onChange={(e) => up('min_total', e.target.value)} /></div>
          <div><label className="label">ใช้ได้สูงสุด (0 = ไม่จำกัด)</label><input className="input" type="number" min="0" value={f.max_uses} onChange={(e) => up('max_uses', e.target.value)} /></div>
        </div>
        <label className="label">หมดอายุ (ไม่บังคับ)</label><input className="input" type="date" value={f.expires_at} onChange={(e) => up('expires_at', e.target.value)} />
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '12px 0 2px' }}><input type="checkbox" checked={f.once_per_user} onChange={(e) => up('once_per_user', e.target.checked)} /> <span>ใช้ได้คนละ 1 ครั้ง</span></label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.active} onChange={(e) => up('active', e.target.checked)} /> <span>เปิดใช้งาน</span></label>
        <Err m={msg} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>{busy ? <span className="spin" /> : 'บันทึก'}</button><button type="button" className="btn" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </Modal>
  );
}

/* ===================== เติมเงิน ===================== */
function Topups({ id }) {
  const { rows, err, load, setErr } = useView(id, 'topups');
  const tag = { credited: ['ok', 'เติมแล้ว'], review: ['warn', 'รอตรวจสอบ'], redeemed: ['warn', 'รับซองแล้ว (ยังไม่เติม)'], failed: ['bad', 'ไม่สำเร็จ'], pending: ['', 'กำลังดำเนินการ'] };
  return (
    <>
      <p className="subtle" style={{ fontSize: 13, marginBottom: 12 }}>ลูกค้าเติมเงินด้วยซองอั่งเปา เงินเข้ากระเป๋า TrueMoney ของคุณโดยตรง ถ้าสถานะ “รอตรวจสอบ” ให้เช็กกระเป๋า ถ้าเงินเข้าแล้วกด “เติมให้ลูกค้า” แล้วใส่ยอดที่ได้รับ</p>
      <Err m={err} />
      {rows && rows.length === 0 ? <Empty>ยังไม่มีรายการเติมเงิน</Empty> : (
        <Table head={['#', 'ลูกค้า', 'ยอด', 'สถานะ', 'เมื่อ', '']}>
          {(rows || []).map((t) => { const [c, l] = tag[t.status] || ['', t.status]; return (
            <tr key={t.id}><td>#{t.id}</td><td>{t.username || '—'}</td><td>{t.amount ? `${baht(t.amount)} ฿` : '—'}</td><td><span className={'tag ' + c}>{l}</span></td><td className="subtle">{fmtDate(t.created_at)}</td>
              <td>{['review', 'redeemed', 'failed', 'pending'].includes(t.status) && <button className="btn btn-sm btn-primary" onClick={() => { const v = prompt('ยอดที่เงินเข้าจริง (บาท)'); if (v && Number(v) > 0) post(id, 'topup.credit', { id: t.id, amount: Number(v) }).then(load).catch((e) => setErr(e.message)); }}>เติมให้ลูกค้า</button>}</td></tr>); })}
        </Table>
      )}
    </>
  );
}

/* ===================== ลูกค้า ===================== */
function Customers({ id }) {
  const [q, setQ] = useState('');
  const { rows, err, load, setErr } = useView(id, 'customers', q ? `&q=${encodeURIComponent(q)}` : '');
  const run = (p) => p.then(load).catch((e) => setErr(e.message));
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>ลูกค้า</h3><SearchBar onSearch={setQ} ph="ค้นหาชื่อผู้ใช้" /></div>
      <Err m={err} />
      {rows && rows.length === 0 ? <Empty>ยังไม่มีลูกค้า</Empty> : (
        <Table head={['ชื่อผู้ใช้', 'ยอดคงเหลือ', 'ซื้อรวม', 'สมัครเมื่อ', 'สถานะ', '']}>
          {(rows || []).map((u) => (
            <tr key={u.id}><td><b>{u.username}</b></td><td>{baht(u.balance)} ฿</td><td>{baht(u.spent)} ฿</td><td className="subtle">{fmtDate(u.created_at)}</td>
              <td><span className={'tag ' + (u.banned ? 'bad' : 'ok')}>{u.banned ? 'ระงับ' : 'ปกติ'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => { const v = prompt('เพิ่ม/ลดยอด (บาท) เช่น 50 หรือ -20'); if (v && !isNaN(Number(v))) run(post(id, 'cust.adjust', { userId: u.id, delta: Number(v) })); }}>ปรับยอด</button>{' '}
                <button className="btn btn-sm" onClick={() => { const v = prompt(`ตั้งรหัสผ่านใหม่ให้ ${u.username} (อย่างน้อย 8 ตัว)`); if (v) run(post(id, 'cust.password', { userId: u.id, password: v }).then(() => alert('เปลี่ยนรหัสผ่านแล้ว'))); }}>รีเซ็ตรหัส</button>{' '}
                <button className="btn btn-sm" onClick={() => run(post(id, 'cust.ban', { userId: u.id, banned: !u.banned }))}>{u.banned ? 'ปลดระงับ' : 'ระงับ'}</button></td></tr>
          ))}
        </Table>
      )}
    </>
  );
}

/* ===================== ดีไซน์ & โทนสี (พรีวิวสด) ===================== */
const PALETTE = ['#ffffff', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#00ff9d', '#84cc16', '#eab308', '#d4af37', '#f97316', '#ef4444', '#ff5c8a', '#ec4899', '#111111'];

function useSite(id) {
  const [site, setSite] = useState(null);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get(id, 'site').then((r) => { setSite(r.site); setMeta(r); }).catch((e) => setErr(e.message)); }, [id]);
  const save = async (next) => { const r = await api('/api/rent', 'PUT', { rentalId: id, site: next }); setSite(r.rental.site); return r; };
  return { site, setSite, meta, err, save };
}

function Design({ id }) {
  const { site, setSite, meta, err, save } = useSite(id);
  const frame = useRef(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dev, setDev] = useState('desktop');
  const push = useCallback(() => { if (site && frame.current?.contentWindow) frame.current.contentWindow.postMessage({ tnPreview: { color: site.color, theme: site.theme, skin: site.template } }, location.origin); }, [site]);
  useEffect(() => { push(); }, [push]);
  if (err) return <Err m={err} />;
  if (!site) return <div className="muted">กำลังโหลด…</div>;
  const up = (k, v) => { setSite((o) => ({ ...o, [k]: v })); setMsg(null); };
  async function onSave() { setBusy(true); setMsg(null); try { await save(site); setMsg({ t: 'ok', m: 'บันทึกแล้ว — หน้าร้านจริงเปลี่ยนตามนี้ทันที' }); } catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setBusy(false); } }
  return (
    <div className="dz">
      <div className="dz-ctl">
        <div className="panel">
          <h3 style={{ marginBottom: 4 }}>แบบหน้าร้าน</h3>
          <p className="subtle" style={{ fontSize: 13, marginBottom: 12 }}>โครงหน้าเหมือนกันทุกแบบ ต่างกันที่สไตล์</p>
          <div className="dz-skins">{TEMPLATES.map((x) => (
            <button type="button" key={x.slug} className={'dz-skin' + (site.template === x.slug ? ' on' : '')} onClick={() => up('template', x.slug)}>
              <span className="dz-sw" style={{ background: x.swatch[0] }}><i style={{ background: x.swatch[1] }} /><i style={{ background: x.swatch[2] }} /></span><b>{x.name}</b>
            </button>))}</div>
        </div>
        <div className="panel">
          <h3 style={{ marginBottom: 12 }}>โทนสีหลัก</h3>
          <div className="dz-pal">{PALETTE.map((c) => <button type="button" key={c} className={'dz-dot' + (site.color?.toLowerCase() === c ? ' on' : '')} style={{ background: c }} onClick={() => up('color', c)} aria-label={c} />)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input type="color" className="plain" value={site.color} onChange={(e) => up('color', e.target.value)} style={{ width: 52, height: 42, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'none', padding: 2, cursor: 'pointer' }} />
            <input className="input" value={site.color} maxLength={7} onChange={(e) => up('color', e.target.value)} />
          </div>
          <h3 style={{ margin: '18px 0 10px' }}>ธีมเริ่มต้น</h3>
          <div className="dz-seg">{[['dark', 'มืด'], ['light', 'สว่าง']].map(([k, l]) => <button type="button" key={k} className={site.theme === k ? 'on' : ''} onClick={() => up('theme', k)}>{l}</button>)}</div>
          <p className="subtle" style={{ fontSize: 12.5, marginTop: 8 }}>ลูกค้ายังสลับสว่าง/มืดและ TH/EN ได้เองที่หัวเว็บ — ค่านี้คือค่าที่เห็นครั้งแรก</p>
        </div>
        <Err m={msg?.t === 'err' ? msg.m : ''} />{msg?.t === 'ok' && <div className="msg ok">{msg.m}</div>}
        <button className="btn btn-primary" onClick={onSave} disabled={busy}>{busy ? <span className="spin" /> : 'บันทึกดีไซน์'}</button>
      </div>
      <div className="dz-pv">
        <div className="dz-bar"><span>พรีวิวสด</span><div className="dz-seg sm">{[['desktop', 'คอม'], ['mobile', 'มือถือ']].map(([k, l]) => <button key={k} type="button" className={dev === k ? 'on' : ''} onClick={() => setDev(k)}>{l}</button>)}</div></div>
        <div className={'dz-frame ' + dev}><iframe ref={frame} src={`/site/${meta.sub}?embed=1`} title="พรีวิวร้าน" onLoad={push} /></div>
      </div>
    </div>
  );
}

/* ===================== ตั้งค่าร้าน ===================== */
function Settings({ id }) {
  const { site, setSite, err, save } = useSite(id);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  if (err) return <Err m={err} />;
  if (!site) return <div className="muted">กำลังโหลด…</div>;
  const up = (k, v) => { setSite((o) => ({ ...o, [k]: v })); setMsg(null); };
  const links = site.links || [];
  const upL = (i, f, v) => up('links', links.map((x, n) => (n === i ? { ...x, [f]: v } : x)));
  async function onSave(e) { e.preventDefault(); setBusy(true); setMsg(null); try { await save(site); setMsg({ t: 'ok', m: 'บันทึกแล้ว' }); } catch (x) { setMsg({ t: 'err', m: x.message }); } finally { setBusy(false); } }
  const F = ({ k, l, ph, max, area }) => <div><label className="label" style={{ marginTop: 0 }}>{l}</label>{area ? <textarea className="input" rows={3} maxLength={max} value={site[k] || ''} onChange={(e) => up(k, e.target.value)} placeholder={ph} /> : <input className="input" maxLength={max} value={site[k] || ''} onChange={(e) => up(k, e.target.value)} placeholder={ph} />}</div>;
  return (
    <form onSubmit={onSave} style={{ display: 'grid', gap: 16, maxWidth: 820 }}>
      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <h3>ข้อมูลร้าน</h3>
        <div className="row2"><F k="title" l="ชื่อร้าน" max={40} /><F k="title_en" l="Shop name (English)" max={40} /></div>
        <div className="row2"><F k="tagline" l="คำโปรย" max={120} /><F k="tagline_en" l="Tagline (English)" max={120} /></div>
        <F k="about" l="เกี่ยวกับร้าน" max={600} area /><F k="about_en" l="About (English)" max={600} area />
        <F k="logo" l="ลิงก์โลโก้ (https://…)" ph="https://…" />
      </div>
      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <h3>ประกาศหน้าร้าน</h3>
        <p className="subtle" style={{ fontSize: 13 }}>ข้อความวิ่งใต้แบนเนอร์หน้าแรก เว้นว่างถ้าไม่ต้องการ</p>
        <div className="row2"><F k="announce" l="ประกาศ" max={200} /><F k="announce_en" l="Announcement (English)" max={200} /></div>
      </div>
      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <h3>ช่องทางติดต่อ</h3>
        {links.map((l, i) => (
          <div className="mini-row" key={i}>
            <input className="input" placeholder="ชื่อปุ่ม เช่น Discord" maxLength={30} value={l.label} onChange={(e) => upL(i, 'label', e.target.value)} />
            <input className="input" placeholder="https://…" value={l.url} onChange={(e) => upL(i, 'url', e.target.value)} />
            <button type="button" className="btn btn-sm btn-danger" onClick={() => up('links', links.filter((_, n) => n !== i))}>ลบ</button>
          </div>))}
        {links.length < 6 && <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => up('links', [...links, { label: '', url: '' }])}>+ เพิ่มช่องทาง</button>}
      </div>
      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <h3>🧧 รับเงินด้วยซองอั่งเปา TrueMoney</h3>
        <label className="label" style={{ marginTop: 0 }}>เบอร์ TrueMoney Wallet ของคุณ (10 หลัก)</label>
        <input className="input" inputMode="numeric" maxLength={10} placeholder="0812345678" value={site.pay_phone || ''} onChange={(e) => up('pay_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        <p className="subtle" style={{ fontSize: 12.5 }}>ลูกค้าวางลิงก์ซองเพื่อเติมเงินเข้าร้านคุณ ระบบรับซองเข้าเบอร์นี้ทันทีและเติมยอดให้ลูกค้าอัตโนมัติ เงินเข้ากระเป๋าคุณโดยตรง ถ้าเว้นว่าง ลูกค้าจะเติมเงินไม่ได้</p>
      </div>
      <Err m={msg?.t === 'err' ? msg.m : ''} />{msg?.t === 'ok' && <div className="msg ok">{msg.m}</div>}
      <button className="btn btn-primary" disabled={busy} style={{ justifySelf: 'start', minWidth: 180 }}>{busy ? <span className="spin" /> : 'บันทึกการตั้งค่า'}</button>
    </form>
  );
}
