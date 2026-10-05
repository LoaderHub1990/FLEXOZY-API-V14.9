'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, baht, fmtDate } from './api';
import { Modal } from './Shell';

const A = (p) => '/api/admin/' + p;

function useList(path) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api(A(path)).then((r) => { setRows(r.rows); setErr(''); }).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return { rows, err, load };
}
const Err = ({ m }) => (m ? <div className="msg err">{m}</div> : null);
const Table = ({ head, children }) => (
  <div className="table-w"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api(A('stats')).then(setS).catch(() => {}); }, []);
  if (!s) return <div className="muted">กำลังโหลด…</div>;
  const K = [['สมาชิก', s.users], ['ออเดอร์', s.orders], ['รายได้รวม', baht(s.revenue) + ' ฿'], ['รายได้ 24 ชม.', baht(s.revenue_today) + ' ฿'], ['เติมเงินรอตรวจ', s.pending_topups], ['สต็อกคงเหลือ', s.stock], ['ยอดเงินในระบบ', baht(s.balances) + ' ฿']];
  return <div className="kv">{K.map(([l, v]) => <div className="panel" key={l}><span className="muted">{l}</span><b>{v}</b></div>)}</div>;
}

function Categories() {
  const { rows, err, load } = useList('categories');
  const [ed, setEd] = useState(null);
  const [e2, setE2] = useState('');
  async function save() {
    setE2('');
    try { await api(A(ed.id ? 'categories/' + ed.id : 'categories'), ed.id ? 'PUT' : 'POST', ed); setEd(null); load(); } catch (x) { setE2(x.message); }
  }
  async function del(r) { if (confirm(`ลบหมวดหมู่ “${r.name}” ? (สินค้าในหมวดจะไม่ถูกลบ)`)) { await api(A('categories/' + r.id), 'DELETE'); load(); } }
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>หมวดหมู่</h3><button className="btn btn-primary btn-sm" onClick={() => setEd({ name: '', image: '', sort: 0 })}>+ เพิ่มหมวดหมู่</button></div>
      <Err m={err} />
      <Table head={['รูป', 'ชื่อ', 'ลำดับ', '']}>
        {(rows || []).map((r) => (
          <tr key={r.id}>
            <td>{r.image && <img src={r.image} alt="" style={{ width: 60, height: 34, objectFit: 'cover', borderRadius: 6 }} />}</td>
            <td>{r.name}</td><td>{r.sort}</td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm" onClick={() => setEd(r)}>แก้ไข</button> <button className="btn btn-sm btn-danger" onClick={() => del(r)}>ลบ</button></td>
          </tr>
        ))}
      </Table>
      {ed && (
        <Modal onClose={() => setEd(null)}>
          <h3>{ed.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h3>
          <label className="label">ชื่อ</label><input className="input" value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} />
          <label className="label">ลิงก์รูป (/uploads/... หรือ https://...)</label><input className="input" value={ed.image} onChange={(e) => setEd({ ...ed, image: e.target.value })} />
          <label className="label">ลำดับ (น้อยขึ้นก่อน)</label><input className="input" type="number" value={ed.sort} onChange={(e) => setEd({ ...ed, sort: e.target.value })} />
          <Err m={e2} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={save}>บันทึก</button>
        </Modal>
      )}
    </>
  );
}

function Stock({ product, onClose }) {
  const [rows, setRows] = useState([]);
  const [lines, setLines] = useState('');
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => api(A('stock/' + product.id)).then((r) => setRows(r.rows)), [product.id]);
  useEffect(() => { load(); }, [load]);
  async function add() {
    setMsg(null);
    try { const r = await api(A('stock/' + product.id), 'POST', { lines }); setLines(''); setMsg({ t: 'ok', m: `เพิ่ม ${r.added} รายการแล้ว` }); load(); } catch (e) { setMsg({ t: 'err', m: e.message }); }
  }
  async function delOne(id) { await api(A(`stock/${product.id}/${id}`), 'DELETE'); load(); }
  async function delAll() { if (confirm('ลบสต็อกที่ยังไม่ขายทั้งหมดของสินค้านี้?')) { await api(A('stock/' + product.id), 'DELETE'); load(); } }
  return (
    <Modal onClose={onClose} wide>
      <h3>สต็อก: {product.name}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>1 บรรทัด = 1 ชิ้นที่ส่งให้ลูกค้า (คีย์/โค้ด/ไอดีพาส) เพิ่มได้ครั้งละไม่เกิน 5,000 บรรทัด</p>
      <textarea className="input" rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA\nKEY-BBBB'} />
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={add}>เพิ่มสต็อก</button>
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      <div className="row" style={{ margin: '18px 0 8px' }}><b>ยังไม่ขาย ({product.stock})</b>{rows.length > 0 && <button className="btn btn-sm btn-danger" onClick={delAll}>ลบทั้งหมด</button>}</div>
      <div style={{ maxHeight: 240, overflow: 'auto' }}>
        {rows.map((r) => (
          <div key={r.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{r.content}</code>
            <button className="btn btn-sm" onClick={() => delOne(r.id)}>ลบ</button>
          </div>
        ))}
        {product.stock > rows.length && <div className="subtle" style={{ padding: 8, fontSize: 13 }}>แสดง {rows.length} รายการแรก</div>}
      </div>
    </Modal>
  );
}

function Products() {
  const { rows, err, load } = useList('products');
  const cats = useList('categories');
  const [ed, setEd] = useState(null);
  const [st, setSt] = useState(null);
  const [e2, setE2] = useState('');
  async function save() {
    setE2('');
    try { await api(A(ed.id ? 'products/' + ed.id : 'products'), ed.id ? 'PUT' : 'POST', { ...ed, price: Number(ed.price) }); setEd(null); load(); } catch (x) { setE2(x.message); }
  }
  async function del(r) {
    if (!confirm(`ลบสินค้า “${r.name}” ? (ถ้ามีออเดอร์แล้วจะถูกซ่อนแทน)`)) return;
    const o = await api(A('products/' + r.id), 'DELETE'); if (o.hidden) alert('สินค้านี้มีประวัติขายแล้ว จึงถูกซ่อนจากหน้าร้านแทนการลบ'); load();
  }
  const blank = { name: '', category_id: cats.rows?.[0]?.id || '', price: 0, image: '', description: '', type: 'normal', active: true, sold_base: 0, sort: 0 };
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>สินค้า</h3><button className="btn btn-primary btn-sm" onClick={() => setEd(blank)}>+ เพิ่มสินค้า</button></div>
      <Err m={err} />
      <Table head={['รูป', 'ชื่อ', 'ราคา', 'สต็อก', 'ขายแล้ว', 'สถานะ', '']}>
        {(rows || []).map((r) => (
          <tr key={r.id}>
            <td>{r.image && <img src={r.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />}</td>
            <td><div>{r.name}</div><div className="subtle" style={{ fontSize: 12 }}>#{r.id} · {r.category_name || 'ไม่มีหมวด'}{r.type === 'random' ? ' · สุ่ม' : ''}</div></td>
            <td>{baht(r.price)} ฿</td>
            <td><button className="btn btn-sm" onClick={() => setSt(r)}>{r.stock} · จัดการ</button></td>
            <td>{r.sold}</td>
            <td><span className={'tag ' + (r.active ? 'ok' : '')}>{r.active ? 'แสดง' : 'ซ่อน'}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm" onClick={() => setEd({ ...r, price: r.price / 100 })}>แก้ไข</button> <button className="btn btn-sm btn-danger" onClick={() => del(r)}>ลบ</button></td>
          </tr>
        ))}
      </Table>
      {st && <Stock product={st} onClose={() => { setSt(null); load(); }} />}
      {ed && (
        <Modal onClose={() => setEd(null)} wide>
          <h3>{ed.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
          <label className="label">ชื่อสินค้า</label><input className="input" value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">หมวดหมู่</label>
              <select className="input" value={ed.category_id || ''} onChange={(e) => setEd({ ...ed, category_id: e.target.value })}>
                <option value="">— ไม่มี —</option>
                {(cats.rows || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="label">ราคา (บาท)</label><input className="input" type="number" min="0" step="0.01" value={ed.price} onChange={(e) => setEd({ ...ed, price: e.target.value })} /></div>
            <div><label className="label">ประเภท</label>
              <select className="input" value={ed.type} onChange={(e) => setEd({ ...ed, type: e.target.value })}>
                <option value="normal">ปกติ (ส่งตามลำดับที่ใส่)</option><option value="random">สุ่ม (สุ่มชิ้นจากสต็อก)</option>
              </select></div>
            <div><label className="label">ยอดขายเริ่มต้น (แสดงบวกเพิ่ม)</label><input className="input" type="number" min="0" value={ed.sold_base} onChange={(e) => setEd({ ...ed, sold_base: e.target.value })} /></div>
            <div><label className="label">ลำดับ</label><input className="input" type="number" value={ed.sort} onChange={(e) => setEd({ ...ed, sort: e.target.value })} /></div>
            <div><label className="label">สถานะ</label>
              <select className="input" value={ed.active ? '1' : '0'} onChange={(e) => setEd({ ...ed, active: e.target.value === '1' })}>
                <option value="1">แสดงหน้าร้าน</option><option value="0">ซ่อน</option>
              </select></div>
          </div>
          <label className="label">ลิงก์รูป (/uploads/... หรือ https://...)</label><input className="input" value={ed.image} onChange={(e) => setEd({ ...ed, image: e.target.value })} />
          <label className="label">รายละเอียด</label><textarea className="input" rows={6} value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} />
          <Err m={e2} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={save}>บันทึก</button>
        </Modal>
      )}
    </>
  );
}

function Orders() {
  const { rows, err } = useList('orders');
  return (<><h3 style={{ marginBottom: 12 }}>ออเดอร์ล่าสุด</h3><Err m={err} />
    <Table head={['#', 'ผู้ซื้อ', 'สินค้า', 'จำนวน', 'ยอด', 'โค้ด', 'วันที่']}>
      {(rows || []).map((o) => <tr key={o.id}><td>{o.id}</td><td>{o.username}</td><td>{o.product_name}</td><td>{o.qty}</td><td>{baht(o.total)} ฿</td><td>{o.coupon_code || '-'}</td><td className="subtle">{fmtDate(o.created_at)}</td></tr>)}
      {rows && !rows.length && <tr><td colSpan={7} className="subtle" style={{ textAlign: 'center' }}>ยังไม่มีออเดอร์</td></tr>}
    </Table></>);
}

function Topups() {
  const { rows, err, load } = useList('topups');
  const [e2, setE2] = useState('');
  async function act(r, a) {
    if (!confirm(a === 'approve' ? `อนุมัติ เติม ${baht(r.amount)} ฿ ให้ ${r.username}? (ตรวจยอดเข้าบัญชี ${(r.pay_amount / 100).toFixed(2)} ฿ แล้ว)` : 'ปฏิเสธรายการนี้?')) return;
    setE2('');
    try { await api(A(`topups/${r.id}/${a}`), 'POST', {}); } catch (x) { setE2(x.message); }
    load();
  }
  const T = { pending: ['warn', 'รอตรวจ'], approved: ['ok', 'อนุมัติ'], rejected: ['bad', 'ปฏิเสธ'], cancelled: ['', 'ยกเลิก'] };
  return (<><h3 style={{ marginBottom: 6 }}>รายการเติมเงิน</h3>
    <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>เทียบ “ยอดที่ต้องโอน” (มีเศษสตางค์ไม่ซ้ำกัน) กับยอดที่เข้าบัญชี PromptPay แล้วกดอนุมัติ</p>
    <Err m={err || e2} />
    <Table head={['#', 'ผู้ใช้', 'ยอดที่ต้องโอน', 'เครดิต', 'อ้างอิง', 'สถานะ', 'วันที่', '']}>
      {(rows || []).map((r) => {
        const [c, l] = r.status === 'pending' && r.stale ? ['', 'หมดอายุ'] : T[r.status];
        return (<tr key={r.id}><td>{r.id}</td><td>{r.username}</td><td><b>{(r.pay_amount / 100).toFixed(2)}</b></td><td>{baht(r.amount)} ฿</td><td className="subtle">{r.ref || '-'}</td><td><span className={'tag ' + c}>{l}</span></td><td className="subtle">{fmtDate(r.created_at)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{r.status === 'pending' && <><button className="btn btn-sm btn-primary" onClick={() => act(r, 'approve')}>อนุมัติ</button> <button className="btn btn-sm btn-danger" onClick={() => act(r, 'reject')}>ปฏิเสธ</button></>}</td></tr>);
      })}
    </Table></>);
}

function Users() {
  const { rows, err, load } = useList('users');
  const [e2, setE2] = useState('');
  async function adj(u) {
    const v = prompt(`ปรับยอดเงินของ ${u.username} (ใส่ + หรือ − เป็นบาท เช่น 50 หรือ -20)`);
    if (v == null || v.trim() === '') return;
    const note = prompt('หมายเหตุ (ไม่บังคับ)') || '';
    setE2('');
    try { await api(A(`users/${u.id}/balance`), 'POST', { amount: Number(v), note }); } catch (x) { setE2(x.message); }
    load();
  }
  async function patch(u, d) { setE2(''); try { await api(A('users/' + u.id), 'PATCH', d); } catch (x) { setE2(x.message); } load(); }
  return (<><h3 style={{ marginBottom: 12 }}>สมาชิก</h3><Err m={err || e2} />
    <Table head={['#', 'ชื่อผู้ใช้', 'อีเมล', 'ยอดเงิน', 'ออเดอร์', 'สิทธิ์', 'สถานะ', '']}>
      {(rows || []).map((u) => (
        <tr key={u.id}><td>{u.id}</td><td>{u.username}</td><td className="subtle">{u.email}</td><td>{baht(u.balance)} ฿</td><td>{u.orders}</td>
          <td><span className={'tag ' + (u.role === 'admin' ? 'warn' : '')}>{u.role}</span></td>
          <td>{u.banned ? <span className="tag bad">ระงับ</span> : <span className="tag ok">ปกติ</span>}</td>
          <td style={{ whiteSpace: 'nowrap' }}>
            <button className="btn btn-sm" onClick={() => adj(u)}>ปรับยอด</button>{' '}
            <button className="btn btn-sm" onClick={() => patch(u, { banned: !u.banned })}>{u.banned ? 'ปลดระงับ' : 'ระงับ'}</button>{' '}
            <button className="btn btn-sm" onClick={() => confirm('เปลี่ยนสิทธิ์ผู้ใช้นี้?') && patch(u, { role: u.role === 'admin' ? 'user' : 'admin' })}>{u.role === 'admin' ? 'ถอดแอดมิน' : 'ตั้งแอดมิน'}</button>
          </td></tr>
      ))}
    </Table></>);
}

function Coupons() {
  const { rows, err, load } = useList('coupons');
  const [f, setF] = useState({ code: '', type: 'percent', value: 10, max_uses: '', expires_at: '' });
  const [e2, setE2] = useState('');
  async function add(e) { e.preventDefault(); setE2(''); try { await api(A('coupons'), 'POST', f); setF({ ...f, code: '' }); load(); } catch (x) { setE2(x.message); } }
  async function del(c) { await api(A('coupons/' + encodeURIComponent(c)), 'DELETE'); load(); }
  async function toggle(c) { await api(A('coupons'), 'POST', { ...c, expires_at: c.expires_at || '', active: !c.active }); load(); }
  return (<><h3 style={{ marginBottom: 12 }}>โค้ดส่วนลด</h3>
    <form className="panel" onSubmit={add} style={{ marginBottom: 16 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <div><label className="label" style={{ marginTop: 0 }}>โค้ด</label><input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="SAVE10" required /></div>
        <div><label className="label" style={{ marginTop: 0 }}>ชนิด</label><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">เปอร์เซ็นต์ (%)</option><option value="fixed">ลดเป็นบาท</option></select></div>
        <div><label className="label" style={{ marginTop: 0 }}>มูลค่า</label><input className="input" type="number" min="1" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required /></div>
        <div><label className="label" style={{ marginTop: 0 }}>ใช้ได้กี่ครั้ง (ว่าง = ไม่จำกัด)</label><input className="input" type="number" min="1" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} /></div>
        <div><label className="label" style={{ marginTop: 0 }}>หมดอายุ (ไม่บังคับ)</label><input className="input" type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
      </div>
      <Err m={e2} /><button className="btn btn-primary" style={{ marginTop: 14 }}>บันทึกโค้ด</button>
    </form>
    <Err m={err} />
    <Table head={['โค้ด', 'ส่วนลด', 'ใช้แล้ว', 'หมดอายุ', 'สถานะ', '']}>
      {(rows || []).map((c) => (
        <tr key={c.code}><td><b>{c.code}</b></td><td>{c.type === 'percent' ? `${c.value}%` : `${c.value} ฿`}</td><td>{c.used}{c.max_uses != null ? ` / ${c.max_uses}` : ''}</td><td className="subtle">{c.expires_at ? fmtDate(c.expires_at) : '-'}</td>
          <td><span className={'tag ' + (c.active ? 'ok' : '')}>{c.active ? 'เปิด' : 'ปิด'}</span></td>
          <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm" onClick={() => toggle(c)}>{c.active ? 'ปิด' : 'เปิด'}</button> <button className="btn btn-sm btn-danger" onClick={() => del(c.code)}>ลบ</button></td></tr>
      ))}
    </Table></>);
}

function Settings() {
  const [s, setS] = useState(null);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    api(A('settings')).then((r) => {
      setS(r.settings);
      try { setItems(JSON.parse(r.settings.popup_items || '[]')); } catch { setItems([]); }
    });
  }, []);
  if (!s) return <div className="muted">กำลังโหลด…</div>;
  const F = ([k, l, t = 'text']) => (<div key={k}><label className="label">{l}</label><input className="input" type={t} value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>);
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try {
      await api(A('settings'), 'PUT', { ...s, popup_enabled: s.popup_enabled === '1', popup_items: items });
      setMsg({ t: 'ok', m: 'บันทึกแล้ว (รีเฟรชหน้าเพื่อดูผล)' });
    } catch (x) { setMsg({ t: 'err', m: x.message }); }
  }
  return (
    <form className="panel" style={{ maxWidth: 640 }} onSubmit={save}>
      <h3>ตั้งค่าร้าน</h3>
      {[['shop_name', 'ชื่อร้าน'], ['tagline', 'คำโปรยหน้าแรก'], ['footer_text', 'ข้อความท้ายเว็บ'], ['discord_url', 'ลิงก์ Discord (https://...) ใช้กับปุ่ม “ติดต่อเรา”'], ['discord_widget_id', 'Discord Server ID สำหรับวิดเจ็ตท้ายเว็บ (ว่าง = ไม่แสดงวิดเจ็ต)'], ['logo', 'ลิงก์โลโก้ (/uploads/... หรือ https://...)'], ['min_topup', 'ยอดเติมเงินขั้นต่ำ (บาท)', 'number']].map(F)}
      <div className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>วิดเจ็ตจะแสดงได้ต้องเปิด “Server Widget” ใน Discord: Server Settings → Widget</div>

      <h3 style={{ marginTop: 28 }}>ช่องทางเติมเงิน</h3>
      <div className="panel" style={{ background: 'var(--surface-2)' }}>
        <label className="cookie-opt" style={{ marginTop: 0 }}>
          <span><b>เปิดรับ PromptPay</b><small>ปิดชั่วคราวได้ ลูกค้าจะไม่สามารถสร้าง QR เติมเงินใหม่ได้</small></span>
          <input type="checkbox" checked={s.promptpay_enabled !== '0'} onChange={(e) => setS({ ...s, promptpay_enabled: e.target.checked ? '1' : '0' })} />
        </label>
        <label className="cookie-opt" style={{ marginTop: 12 }}>
          <span><b>เปิดรับ TrueMoney Gift</b><small>ปิดชั่วคราวได้ ลูกค้าจะไม่สามารถแลกซอง TrueMoney ได้</small></span>
          <input type="checkbox" checked={s.truemoney_enabled !== '0'} onChange={(e) => setS({ ...s, truemoney_enabled: e.target.checked ? '1' : '0' })} />
        </label>
        <div className="subtle" style={{ fontSize: 12.5, marginTop: 10 }}>การตั้งค่านี้มีผลทั้งหน้าลูกค้าและ API เพื่อป้องกันการเรียก API ตรงขณะปิดช่องทาง</div>
      </div>

      <h3 style={{ marginTop: 28 }}>ป๊อปอัปประกาศร้าน</h3>
      <label className="cookie-opt" style={{ marginTop: 10 }}>
        <span><b>เปิดใช้ป๊อปอัปประกาศ</b><small>แสดงครั้งเดียวต่อเบราว์เซอร์ จนกว่าคุณจะแก้ไขประกาศ</small></span>
        <input type="checkbox" checked={s.popup_enabled === '1'} onChange={(e) => setS({ ...s, popup_enabled: e.target.checked ? '1' : '0' })} />
      </label>
      {items.map((it, i) => (
        <div key={i} className="panel" style={{ marginTop: 12, background: 'var(--surface-2)' }}>
          <div className="row"><b>ประกาศ #{i + 1}</b><button type="button" className="btn btn-sm btn-danger" onClick={() => setItems(items.filter((_, n) => n !== i))}>ลบ</button></div>
          <label className="label">หัวข้อ</label><input className="input" value={it.title} maxLength={100} onChange={(e) => setItem(i, 'title', e.target.value)} />
          <label className="label">ข้อความ</label><textarea className="input" rows={4} value={it.body} maxLength={1500} onChange={(e) => setItem(i, 'body', e.target.value)} />
          <label className="label">ลิงก์รูป (ไม่บังคับ)</label><input className="input" value={it.image} onChange={(e) => setItem(i, 'image', e.target.value)} placeholder="/uploads/... หรือ https://..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">ลิงก์ปุ่ม (ไม่บังคับ)</label><input className="input" value={it.link} onChange={(e) => setItem(i, 'link', e.target.value)} placeholder="https://..." /></div>
            <div><label className="label">ข้อความบนปุ่ม</label><input className="input" value={it.button} maxLength={30} onChange={(e) => setItem(i, 'button', e.target.value)} placeholder="ดูรายละเอียด" /></div>
          </div>
        </div>
      ))}
      {items.length < 5 && <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => setItems([...items, { title: '', body: '', image: '', link: '', button: '' }])}>+ เพิ่มประกาศ</button>}

      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }}>บันทึก</button>
    </form>
  );
}

const TABS = [['overview', 'ภาพรวม', Overview], ['products', 'สินค้า/สต็อก', Products], ['categories', 'หมวดหมู่', Categories], ['topups', 'เติมเงิน', Topups], ['orders', 'ออเดอร์', Orders], ['users', 'สมาชิก', Users], ['coupons', 'โค้ดส่วนลด', Coupons], ['settings', 'ตั้งค่า', Settings]];

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const Cur = TABS.find((t) => t[0] === tab)[2];
  return (
    <>
      <div className="page-h"><h1>จัดการหลังบ้าน</h1></div>
      <div className="atabs">{TABS.map(([k, l]) => <button key={k} className={'filter' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
      <Cur key={tab} />
    </>
  );
}
