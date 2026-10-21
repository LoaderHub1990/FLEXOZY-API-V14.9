'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, baht, fmtDate } from './api';
import { Modal } from './Shell';
import RobloxChip from './RobloxChip';
import { fmtDuration, keyStatus } from '@/lib/duration';

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

function Loading({ err, onRetry }) {
  if (!err) return <div className="muted">กำลังโหลด…</div>;
  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="msg err">{err}</div>
      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>ลองใหม่</button>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); api(A('stats')).then(setS).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!s) return <Loading err={err} onRetry={load} />;
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

const UNITS = [['60', 'นาที'], ['3600', 'ชั่วโมง'], ['86400', 'วัน'], ['0', 'ตลอดชีพ']];
function splitSecs(sec) {
  sec = Number(sec) || 0;
  if (sec === 0) return { kv: 1, ku: '0' };
  for (const u of [86400, 3600, 60]) if (sec % u === 0) return { kv: sec / u, ku: String(u) };
  return { kv: Math.max(1, Math.round(sec / 60)), ku: '60' };
}
const toSecs = (kv, ku) => (ku === '0' ? 0 : Math.max(60, Math.round(Number(kv) * Number(ku))));

function Products() {
  const { rows, err, load } = useList('products');
  const cats = useList('categories');
  const [ed, setEd] = useState(null);
  const [st, setSt] = useState(null);
  const [e2, setE2] = useState('');
  async function save() {
    setE2('');
    try { await api(A(ed.id ? 'products/' + ed.id : 'products'), ed.id ? 'PUT' : 'POST', { ...ed, price: Number(ed.price), key_seconds: toSecs(ed.kv, ed.ku) }); setEd(null); load(); } catch (x) { setE2(x.message); }
  }
  async function del(r) {
    if (!confirm(`ลบสินค้า “${r.name}” ? (ถ้ามีออเดอร์แล้วจะถูกซ่อนแทน)`)) return;
    const o = await api(A('products/' + r.id), 'DELETE'); if (o.hidden) alert('สินค้านี้มีประวัติขายแล้ว จึงถูกซ่อนจากหน้าร้านแทนการลบ'); load();
  }
  const blank = { name: '', category_id: cats.rows?.[0]?.id || '', price: 0, image: '', description: '', type: 'normal', active: true, sold_base: 0, sort: 0, key_prefix: 'FLEXOZY', key_start: 'activate', key_hwid: true, kv: 1, ku: '86400' };
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>สินค้า</h3><button className="btn btn-primary btn-sm" onClick={() => setEd(blank)}>+ เพิ่มสินค้า</button></div>
      <Err m={err} />
      <Table head={['รูป', 'ชื่อ', 'ราคา', 'สต็อก', 'ขายแล้ว', 'สถานะ', '']}>
        {(rows || []).map((r) => (
          <tr key={r.id}>
            <td>{r.image && <img src={r.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />}</td>
            <td><div>{r.name}</div><div className="subtle" style={{ fontSize: 12 }}>#{r.id} · {r.category_name || 'ไม่มีหมวด'}{r.type === 'random' ? ' · สุ่ม' : ''}{r.type === 'key' ? ` · คีย์อัตโนมัติ ${fmtDuration(r.key_seconds)}` : ''}</div></td>
            <td>{baht(r.price)} ฿</td>
            <td>{r.type === 'key' ? <span className="tag ok">อัตโนมัติ ∞</span> : <button className="btn btn-sm" onClick={() => setSt(r)}>{r.stock} · จัดการ</button>}</td>
            <td>{r.sold}</td>
            <td><span className={'tag ' + (r.active ? 'ok' : '')}>{r.active ? 'แสดง' : 'ซ่อน'}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm" onClick={() => setEd({ ...r, price: r.price / 100, ...splitSecs(r.key_seconds) })}>แก้ไข</button> <button className="btn btn-sm btn-danger" onClick={() => del(r)}>ลบ</button></td>
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
                <option value="normal">ปกติ (ส่งตามลำดับที่ใส่)</option><option value="random">สุ่ม (สุ่มชิ้นจากสต็อก)</option><option value="key">คีย์อัตโนมัติ (สุ่มคีย์ตอนซื้อ + ตั้งอายุได้)</option>
              </select></div>
            <div><label className="label">ยอดขายเริ่มต้น (แสดงบวกเพิ่ม)</label><input className="input" type="number" min="0" value={ed.sold_base} onChange={(e) => setEd({ ...ed, sold_base: e.target.value })} /></div>
            <div><label className="label">ลำดับ</label><input className="input" type="number" value={ed.sort} onChange={(e) => setEd({ ...ed, sort: e.target.value })} /></div>
            <div><label className="label">สถานะ</label>
              <select className="input" value={ed.active ? '1' : '0'} onChange={(e) => setEd({ ...ed, active: e.target.value === '1' })}>
                <option value="1">แสดงหน้าร้าน</option><option value="0">ซ่อน</option>
              </select></div>
          </div>
          {ed.type === 'key' && (
            <div className="panel" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
              <b>ตั้งค่าคีย์อัตโนมัติ</b>
              <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 10px' }}>ลูกค้ากดซื้อแล้วระบบสุ่มคีย์รูปแบบ <code>{(ed.key_prefix || 'FLEXOZY').toUpperCase()}-XXXX-XXXX-XXXX</code> ให้ทันที ไม่ต้องเติมสต็อก และตรวจคีย์ได้ผ่าน API (ดูวิธีที่แท็บ “คีย์”)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label" style={{ marginTop: 0 }}>คำนำหน้าคีย์</label><input className="input" maxLength={12} value={ed.key_prefix} onChange={(e) => setEd({ ...ed, key_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></div>
                <div><label className="label" style={{ marginTop: 0 }}>อายุคีย์ของแพ็กนี้</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ed.ku !== '0' && <input className="input" type="number" min="1" style={{ width: 90 }} value={ed.kv} onChange={(e) => setEd({ ...ed, kv: e.target.value })} />}
                    <select className="input" value={ed.ku} onChange={(e) => setEd({ ...ed, ku: e.target.value })}>{UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </div></div>
                <div><label className="label">เริ่มนับเวลา</label>
                  <select className="input" value={ed.key_start} onChange={(e) => setEd({ ...ed, key_start: e.target.value })}>
                    <option value="activate">เมื่อใช้งานครั้งแรก (แนะนำ)</option><option value="purchase">ตั้งแต่ตอนซื้อ</option>
                  </select></div>
                <div><label className="label">ผูกเครื่องอัตโนมัติ (HWID)</label>
                  <select className="input" value={ed.key_hwid ? '1' : '0'} onChange={(e) => setEd({ ...ed, key_hwid: e.target.value === '1' })}>
                    <option value="1">ผูก — ใช้ครั้งแรกจำเครื่องไว้ เครื่องอื่นใช้ไม่ได้</option><option value="0">ไม่บังคับ (แค่บันทึกเครื่อง)</option>
                  </select></div>
              </div>
              <div className="subtle" style={{ fontSize: 12.5, marginTop: 10 }}>สรุป: คีย์อายุ <b>{ed.ku === '0' ? 'ตลอดชีพ' : fmtDuration(toSecs(ed.kv, ed.ku))}</b></div>
            </div>
          )}
          <label className="label">ลิงก์รูป (/uploads/... หรือ https://...)</label><input className="input" value={ed.image} onChange={(e) => setEd({ ...ed, image: e.target.value })} />
          <label className="label">รายละเอียด</label><textarea className="input" rows={6} value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} />
          <Err m={e2} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={save}>บันทึก</button>
        </Modal>
      )}
    </>
  );
}

function Keys() {
  const [term, setTerm] = useState('');
  const [q2, setQ2] = useState('');
  const { rows, err, load } = useList('keys' + (q2 ? '?q=' + encodeURIComponent(q2) : ''));
  const prods = useList('products');
  const keyProds = (prods.rows || []).filter((p) => p.type === 'key');
  const [g, setG] = useState({ productId: '', qty: 1, custom: false, kv: 1, ku: '86400', note: '' });
  const [out, setOut] = useState(null);
  const [e2, setE2] = useState('');
  const [doc, setDoc] = useState(false);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  async function gen() {
    setE2(''); setOut(null);
    try {
      const pid = g.productId || keyProds[0]?.id;
      const r = await api(A('keys'), 'POST', { productId: Number(pid), qty: Number(g.qty), seconds: g.custom ? toSecs(g.kv, g.ku) : undefined, note: g.note });
      setOut(r.keys); load();
    } catch (x) { setE2(x.message); }
  }
  const act = async (id, a, body) => { try { await api(A(`keys/${id}/${a}`), 'PUT', body || {}); load(); } catch (x) { alert(x.message); } };
  async function del(id) { if (!confirm('ลบคีย์นี้ถาวร?')) return; await api(A('keys/' + id), 'DELETE'); load(); }
  const copy = (t) => navigator.clipboard?.writeText(t);
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><h3>คีย์อัตโนมัติ</h3><button className="btn btn-sm" onClick={() => setDoc(!doc)}>{doc ? 'ซ่อน' : 'วิธีเชื่อมระบบตรวจคีย์'}</button></div>
      {doc && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>ระบบใดก็ได้ (สคริปต์, บอท, โปรแกรม, เว็บ) เรียก API นี้เพื่อตรวจคีย์ — ตรวจครั้งแรกจะเริ่มนับเวลาให้อัตโนมัติ ผลลัพธ์ <code>valid: true</code> = ใช้ได้</p>
          <div className="codebox" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{`# curl (hwid = รหัสเครื่อง, roblox_id/roblox_name = บัญชี Roblox ของผู้ใช้)
curl "${base}/api/keys/verify?key=FLEXOZY-XXXX-XXXX-XXXX&hwid=เครื่องผู้ใช้&roblox_id=123456&roblox_name=ชื่อในเกม"

# Lua (Roblox executor) — ส่งเครื่อง + บัญชี Roblox ไปด้วย ระบบผูกเครื่องให้ออโต้และบันทึกโปรไฟล์
local Players = game:GetService("Players")
local lp = Players.LocalPlayer
local hwid = (gethwid and gethwid()) or game:GetService("RbxAnalyticsService"):GetClientId()
local url = "${base}/api/keys/verify?key="..key.."&hwid="..hwid.."&roblox_id="..lp.UserId.."&roblox_name="..lp.Name
local d = game:GetService("HttpService"):JSONDecode(game:HttpGet(url))
if d.valid then print("OK หมดอายุ:", d.expires_at) else warn(d.message) end

# Python
import requests
d = requests.post("${base}/api/keys/verify", json={"key": key, "hwid": hwid, "roblox_id": uid, "roblox_name": name}).json()
print(d["valid"], d["message"], d.get("roblox"))

# JavaScript / Node
const d = await (await fetch("${base}/api/keys/verify", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({key, hwid, roblox_id, roblox_name})})).json();

# PowerShell
Invoke-RestMethod "${base}/api/keys/verify?key=$key&hwid=$env:COMPUTERNAME"

# ผลลัพธ์แบบข้อความสั้น (เหมาะกับระบบที่อ่าน JSON ไม่ได้)
${base}/api/keys/verify?key=...&format=text   →  VALID|2026-11-20T10:00:00.000Z  /  VALID|LIFETIME  /  INVALID|EXPIRED

# ดูสถานะเฉยๆ ไม่เริ่มนับเวลา: เพิ่ม &check=1`}</div>
          <p className="subtle" style={{ fontSize: 12.5, marginTop: 8 }}>code ที่ได้: OK · UNUSED · NOT_FOUND · BAD_FORMAT · EXPIRED · REVOKED · HWID_REQUIRED · HWID_MISMATCH · RATE_LIMITED (ตรวจผิดเกิน 30 ครั้ง/10 นาที ต่อ IP)</p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <b>สร้างคีย์เอง (แจก / ทดสอบ)</b>
        {!keyProds.length ? <p className="subtle" style={{ fontSize: 13, marginTop: 8 }}>ยังไม่มีสินค้าประเภท “คีย์อัตโนมัติ” — ไปแท็บสินค้า เพิ่มสินค้าแล้วเลือกประเภทคีย์อัตโนมัติก่อน</p> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 8 }}>
              <div><label className="label" style={{ marginTop: 0 }}>แพ็ก</label>
                <select className="input" value={g.productId || keyProds[0].id} onChange={(e) => setG({ ...g, productId: e.target.value })}>{keyProds.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmtDuration(p.key_seconds)})</option>)}</select></div>
              <div><label className="label" style={{ marginTop: 0 }}>จำนวน</label><input className="input" type="number" min="1" max="200" value={g.qty} onChange={(e) => setG({ ...g, qty: e.target.value })} /></div>
              <div><label className="label" style={{ marginTop: 0 }}>หมายเหตุ</label><input className="input" value={g.note} maxLength={120} onChange={(e) => setG({ ...g, note: e.target.value })} placeholder="เช่น แจกกิจกรรม" /></div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 13.5 }}><input type="checkbox" checked={g.custom} onChange={(e) => setG({ ...g, custom: e.target.checked })} /> กำหนดอายุเองสำหรับชุดนี้ (แทนค่าของแพ็ก)</label>
            {g.custom && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 300 }}>
                {g.ku !== '0' && <input className="input" type="number" min="1" style={{ width: 90 }} value={g.kv} onChange={(e) => setG({ ...g, kv: e.target.value })} />}
                <select className="input" value={g.ku} onChange={(e) => setG({ ...g, ku: e.target.value })}>{UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
            )}
            <Err m={e2} />
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={gen}>สร้างคีย์</button>
            {out && (
              <div style={{ marginTop: 12 }}>
                <div className="codebox">{out.join('\n')}</div>
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => copy(out.join('\n'))}>คัดลอกทั้งหมด</button>
              </div>
            )}
          </>
        )}
      </div>

      <form className="row" style={{ marginBottom: 12, gap: 8 }} onSubmit={(e) => { e.preventDefault(); setQ2(term.trim()); }}>
        <input className="input" style={{ maxWidth: 360 }} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ค้นหา คีย์ / สินค้า / ผู้ซื้อ / หมายเหตุ" />
        <button className="btn btn-sm">ค้นหา</button>
      </form>
      <Err m={err} />
      <Table head={['คีย์', 'แพ็ก', 'ผู้ซื้อ', 'ผู้ใช้ Roblox', 'สถานะ', 'หมดอายุ', 'เครื่อง (HWID)', '']}>
        {(rows || []).map((k) => {
          const [cls, txt] = keyStatus(k);
          return (
            <tr key={k.id}>
              <td><code style={{ cursor: 'pointer' }} title="คลิกเพื่อคัดลอก" onClick={() => copy(k.key)}>{k.key}</code>{k.note && <div className="subtle" style={{ fontSize: 11.5 }}>{k.note}</div>}</td>
              <td>{k.product_name}<div className="subtle" style={{ fontSize: 11.5 }}>{fmtDuration(k.seconds)}</div></td>
              <td>{k.username || <span className="subtle">แอดมินสร้าง</span>}</td>
              <td style={{ minWidth: 210 }}>{k.roblox_id ? <RobloxChip id={k.roblox_id} name={k.roblox_name} display={k.roblox_display} avatar={k.roblox_avatar} /> : <span className="subtle">ยังไม่มีข้อมูล</span>}</td>
              <td style={{ minWidth: 150 }}><span className={'tag ' + cls}>{txt}</span></td>
              <td className="subtle" style={{ minWidth: 110 }}>{k.expires_at ? fmtDate(k.expires_at) : '-'}</td>
              <td className="subtle" style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }} title={k.hwid || ''}>{k.hwid ? <>{k.hwid_lock ? '🔒 ' : ''}{k.hwid}</> : (k.hwid_lock ? 'รอผูกตอนใช้ครั้งแรก' : '-')}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => act(k.id, k.revoked ? 'unrevoke' : 'revoke')}>{k.revoked ? 'ปลดระงับ' : 'ระงับ'}</button>{' '}
                <button className="btn btn-sm" onClick={() => { const d = prompt('ต่อเวลากี่วัน? (ใส่ค่าลบเพื่อลด)', '7'); if (d) act(k.id, 'extend', { days: Number(d) }); }}>ต่อเวลา</button>{' '}
                {k.hwid && <><button className="btn btn-sm" onClick={() => act(k.id, 'reset-hwid')}>รีเซ็ตเครื่อง</button>{' '}</>}
                <button className="btn btn-sm btn-danger" onClick={() => del(k.id)}>ลบ</button>
              </td>
            </tr>
          );
        })}
        {rows && !rows.length && <tr><td colSpan={8} className="subtle" style={{ textAlign: 'center' }}>ยังไม่มีคีย์</td></tr>}
      </Table>
    </>
  );
}

function Reviews() {
  const { rows, err, load } = useList('reviews');
  async function del(id) { if (!confirm('ลบรีวิวนี้?')) return; await api(A('reviews/' + id), 'DELETE'); load(); }
  return (<><h3 style={{ marginBottom: 12 }}>รีวิวจากลูกค้า</h3><Err m={err} />
    <Table head={['#', 'ผู้รีวิว', 'สินค้า', 'คะแนน', 'ข้อความ', 'วันที่', '']}>
      {(rows || []).map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.username}</td><td>{r.product_name}</td><td>{'★'.repeat(r.rating)}</td><td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{r.comment}</td><td className="subtle">{fmtDate(r.created_at)}</td><td><button className="btn btn-sm" onClick={() => del(r.id)}>ลบ</button></td></tr>)}
      {rows && !rows.length && <tr><td colSpan={7} className="subtle" style={{ textAlign: 'center' }}>ยังไม่มีรีวิว</td></tr>}
    </Table></>);
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
  const [f, setF] = useState('all');
  async function act(r, a, text) {
    if (!confirm(text)) return;
    setE2('');
    try { await api(A(`topups/${r.id}/${a}`), 'POST', {}); } catch (x) { setE2(x.message); }
    load();
  }
  const M = { bank: 'ธนาคาร (สลิป)', truemoney: 'TrueMoney', manual: 'PromptPay (เดิม)' };
  const T = { pending: ['warn', 'รอตรวจ'], approved: ['ok', 'อนุมัติ'], rejected: ['bad', 'ปฏิเสธ'], cancelled: ['', 'ยกเลิก'], credited: ['ok', 'เติมแล้ว'], failed: ['bad', 'ไม่สำเร็จ'], redeemed: ['warn', 'รับซองแล้ว ยังไม่เครดิต'], review: ['warn', 'รอแอดมินเช็ก'] };
  const list = (rows || []).filter((r) => f === 'all' || r.kind === f);
  const ok = (rows || []).filter((r) => ['credited', 'approved'].includes(r.status));
  const sum = ok.reduce((n, r) => n + Number(r.amount), 0);
  const need = (rows || []).filter((r) => (r.kind === 'truemoney' && ['review', 'redeemed'].includes(r.status)) || (r.kind === 'manual' && r.status === 'pending' && !r.stale)).length;
  return (<><h3 style={{ marginBottom: 6 }}>รายการเติมเงิน</h3>
    <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>สลิปธนาคารและซอง TrueMoney เติมเครดิตอัตโนมัติ — หน้านี้ไว้ดูประวัติและจัดการรายการที่ค้าง (แสดงล่าสุด 100 รายการต่อช่องทาง)</p>
    <div className="tp-admin-stats">
      <div><span>เติมสำเร็จ (ในรายการนี้)</span><b>{baht(sum)} ฿</b></div>
      <div><span>จำนวนรายการสำเร็จ</span><b>{ok.length}</b></div>
      <div className={need ? 'warn' : ''}><span>รอแอดมินจัดการ</span><b>{need}</b></div>
    </div>
    <div className="filters" style={{ marginBottom: 12 }}>
      {[['all', 'ทั้งหมด'], ['bank', 'ธนาคาร'], ['truemoney', 'TrueMoney'], ['manual', 'PromptPay เดิม']].map(([k, l]) => <button key={k} className={'filter' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{l}</button>)}
    </div>
    <Err m={err || e2} />
    <Table head={['#', 'ผู้ใช้', 'ช่องทาง', 'เครดิต', 'อ้างอิง', 'สถานะ', 'วันที่', '']}>
      {list.map((r) => {
        const [c, l] = r.kind === 'manual' && r.status === 'pending' && r.stale ? ['', 'หมดอายุ'] : (T[r.status] || ['', r.status]);
        return (<tr key={r.key}><td>{r.id}</td><td>{r.username}</td><td>{M[r.kind]}</td><td><b>{baht(r.amount)} ฿</b></td>
          <td className="subtle" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.note}>{r.ref || '-'}{r.note ? ` · ${r.note}` : ''}</td>
          <td><span className={'tag ' + c}>{l}</span></td><td className="subtle">{fmtDate(r.created_at)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>
            {r.kind === 'manual' && r.status === 'pending' && !r.stale && <><button className="btn btn-sm btn-primary" onClick={() => act(r, 'approve', `อนุมัติ เติม ${baht(r.amount)} ฿ ให้ ${r.username}? (ตรวจยอดเข้าบัญชี ${(r.pay_amount / 100).toFixed(2)} ฿ แล้ว)`)}>อนุมัติ</button> <button className="btn btn-sm btn-danger" onClick={() => act(r, 'reject', 'ปฏิเสธรายการนี้?')}>ปฏิเสธ</button></>}
            {r.kind === 'truemoney' && ['review', 'redeemed'].includes(r.status) && <><button className="btn btn-sm btn-primary" onClick={() => act(r, 'tm-credit', `เช็กกระเป๋า TrueMoney แล้วว่าเงิน ${baht(r.amount)} ฿ เข้าจริง? กดตกลงเพื่อเติมเครดิตให้ ${r.username}`)}>เติมเครดิต</button> <button className="btn btn-sm btn-danger" onClick={() => act(r, 'tm-reject', 'ปฏิเสธรายการนี้? (เงินไม่เข้ากระเป๋า)')}>ปฏิเสธ</button></>}
          </td></tr>);
      })}
      {rows && !list.length && <tr><td colSpan={8} className="subtle" style={{ textAlign: 'center' }}>ยังไม่มีรายการ</td></tr>}
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
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(() => {
    setLoadErr('');
    api(A('settings')).then((r) => {
      setS(r.settings);
      try { setItems(JSON.parse(r.settings.popup_items || '[]')); } catch { setItems([]); }
    }).catch((e) => setLoadErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!s) return <Loading err={loadErr} onRetry={load} />;
  const F = ([k, l, t = 'text']) => (<div key={k}><label className="label">{l}</label><input className="input" type={t} value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>);
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try {
      await api(A('settings'), 'PUT', { ...s, popup_enabled: s.popup_enabled === '1', topup_truemoney_enabled: s.topup_truemoney_enabled !== '0', popup_items: items });
      setMsg({ t: 'ok', m: 'บันทึกแล้ว (รีเฟรชหน้าเพื่อดูผล)' });
    } catch (x) { setMsg({ t: 'err', m: x.message }); }
  }
  return (
    <form className="panel" style={{ maxWidth: 640 }} onSubmit={save}>
      <h3>ตั้งค่าร้าน</h3>
      {[['shop_name', 'ชื่อร้าน'], ['tagline', 'คำโปรยหน้าแรก'], ['footer_text', 'ข้อความท้ายเว็บ'], ['discord_url', 'ลิงก์ Discord (https://...) ใช้กับปุ่ม “ติดต่อเรา”'], ['discord_widget_id', 'Discord Server ID สำหรับวิดเจ็ตท้ายเว็บ (ว่าง = ไม่แสดงวิดเจ็ต)'], ['logo', 'ลิงก์โลโก้ (/uploads/... หรือ https://...)'], ['min_topup', 'ยอดเติมเงินขั้นต่ำ (บาท)', 'number']].map(F)}
      <h3 style={{ marginTop: 28 }}>พรีวิวตอนวางลิงก์ (Discord / Facebook / LINE)</h3>
      <div className="subtle" style={{ fontSize: 12.5, marginTop: 4 }}>รูป + ชื่อ + คำอธิบายที่จะขึ้นเมื่อมีคนวางลิงก์เว็บ — ถ้าเคยวางลิงก์ไปแล้ว แพลตฟอร์มอาจแคชของเก่าไว้สักพัก</div>
      {[['meta_title', 'ชื่อที่แสดง (เช่น Flexozy Hub)'], ['meta_description', 'ข้อความอธิบาย'], ['og_image', 'ลิงก์รูปพรีวิว (/og.jpg หรือ https://...) ขนาดแนะนำ 1200×630']].map(F)}
      <div className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>วิดเจ็ตจะแสดงได้ต้องเปิด “Server Widget” ใน Discord: Server Settings → Widget</div>

      <h3 style={{ marginTop: 28 }}>เปิด/ปิดช่องทางเติมเงิน</h3>
      <div className="subtle" style={{ fontSize: 12.5, marginTop: 4 }}>ปิดชั่วคราวได้ทุกเมื่อ ลูกค้าจะเห็นป้าย “ปิดใช้งานชั่วคราว” และกดเติมเงินช่องทางนั้นไม่ได้ (รายการที่ค้างอยู่ยังอนุมัติได้ตามปกติ)</div>
      <label className="cookie-opt" style={{ marginTop: 10 }}>
        <span><b>TrueMoney Gift (ซองของขวัญ)</b><small>{s.topup_truemoney_enabled === '0' ? 'ตอนนี้: ปิดใช้งานชั่วคราว' : 'ตอนนี้: เปิดใช้งาน'}</small></span>
        <input type="checkbox" checked={s.topup_truemoney_enabled !== '0'} onChange={(e) => setS({ ...s, topup_truemoney_enabled: e.target.checked ? '1' : '0' })} />
      </label>

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

const TABS = [['overview', 'ภาพรวม', Overview], ['products', 'สินค้า/สต็อก', Products], ['categories', 'หมวดหมู่', Categories], ['topups', 'เติมเงิน', Topups], ['orders', 'ออเดอร์', Orders], ['keys', 'คีย์', Keys], ['reviews', 'รีวิว', Reviews], ['users', 'สมาชิก', Users], ['coupons', 'โค้ดส่วนลด', Coupons], ['settings', 'ตั้งค่า', Settings]];

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
