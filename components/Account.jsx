'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, baht, fmtDate } from './api';
import { useShell } from './Shell';

const ST = { pending: ['warn', 'รอตรวจสอบ'], approved: ['ok', 'สำเร็จ'], rejected: ['bad', 'ไม่อนุมัติ'], cancelled: ['', 'ยกเลิก'], expired: ['', 'หมดอายุ'] };

function Topup({ minTopup, canPay, onChange }) {
  const [amount, setAmount] = useState('100');
  const [cur, setCur] = useState(null);
  const [list, setList] = useState([]);
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api('/api/topup').then((r) => setList(r.topups)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setMsg(null); setBusy(true);
    try { const r = await api('/api/topup', 'POST', { amount: Number(amount) }); setCur(r.topup); setRef(''); load(); }
    catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setBusy(false); }
  }
  async function paid() {
    try { await api(`/api/topup/${cur.id}`, 'POST', { ref }); setMsg({ t: 'ok', m: 'แจ้งโอนแล้ว รอแอดมินตรวจสอบและเติมเครดิตให้' }); setCur(null); load(); }
    catch (e) { setMsg({ t: 'err', m: e.message }); }
  }
  async function cancel(id) {
    try { await api(`/api/topup/${id}`, 'POST', { action: 'cancel' }); if (cur?.id === id) setCur(null); load(); }
    catch (e) { setMsg({ t: 'err', m: e.message }); }
  }
  async function reopen(id) {
    try { const r = await api(`/api/topup/${id}`); setCur(r.topup); setRef(r.topup.ref || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { setMsg({ t: 'err', m: e.message }); }
  }

  return (
    <div className="cols two">
      <div className="panel">
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>เติมเงินผ่าน PromptPay</h3>
        {!canPay && <div className="msg err">ร้านยังไม่เปิดรับเติมเงิน (ยังไม่ได้ตั้งค่า PROMPTPAY_ID)</div>}
        {!cur ? (
          <>
            <p className="muted" style={{ fontSize: 14 }}>เลือกจำนวนเงิน (ขั้นต่ำ {minTopup} บาท) ระบบจะสร้าง QR Code ให้สแกน</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
              {[50, 100, 200, 500, 1000].map((v) => (
                <button key={v} className={'filter' + (Number(amount) === v ? ' on' : '')} onClick={() => setAmount(String(v))}>{v} ฿</button>
              ))}
            </div>
            <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="จำนวนเงิน (บาท)" />
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={busy || !canPay} onClick={create}>{busy ? <span className="spin" /> : 'สร้าง QR Code'}</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <img className="qr" src={cur.qr} alt="PromptPay QR" />
            <div className="muted" style={{ marginTop: 14, fontSize: 14 }}>โอนยอดนี้ให้ตรงทุกสตางค์</div>
            <div className="big">{(cur.payAmount / 100).toFixed(2)} ฿</div>
            <div className="subtle" style={{ fontSize: 13 }}>เครดิตที่จะได้รับ {baht(cur.amount)} ฿ (เศษสตางค์ใช้ระบุรายการของคุณ)</div>
            <input className="input" style={{ marginTop: 14 }} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="หมายเหตุ/เลขอ้างอิงการโอน (ไม่บังคับ)" maxLength={100} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={paid}>โอนแล้ว แจ้งแอดมิน</button>
              <button className="btn" onClick={() => cancel(cur.id)}>ยกเลิก</button>
            </div>
            <div className="note">QR มีอายุ 24 ชั่วโมง · แอดมินจะเติมเครดิตหลังตรวจสอบยอดเข้าบัญชี</div>
          </div>
        )}
        {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      </div>
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>ประวัติการเติมเงิน</h3>
        <div className="table-w">
          <table>
            <thead><tr><th>#</th><th>เครดิต</th><th>สถานะ</th><th>วันที่</th><th /></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td><td>{baht(t.amount)} ฿</td>
                  <td><span className={'tag ' + ST[t.status][0]}>{ST[t.status][1]}</span></td>
                  <td className="subtle">{fmtDate(t.created_at)}</td>
                  <td>{t.status === 'pending' && <button className="btn btn-sm" onClick={() => reopen(t.id)}>เปิด QR</button>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="subtle" style={{ textAlign: 'center' }}>ยังไม่มีรายการ</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Orders() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/account/orders').then(setD).catch(() => setD({ orders: [], wallet: [] })); }, []);
  if (!d) return <div className="muted">กำลังโหลด…</div>;
  return (
    <div className="cols">
      {d.orders.length === 0 && <div className="empty">ยังไม่มีประวัติการสั่งซื้อ</div>}
      {d.orders.map((o) => (
        <div className="panel" key={o.id}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <b>#{o.id} · {o.product_name} × {o.qty}</b>
            <span className="muted" style={{ fontSize: 13 }}>{fmtDate(o.created_at)} · {baht(o.total)} ฿</span>
          </div>
          <div className="codebox" style={{ marginTop: 12 }}>{o.items.join('\n') || '—'}</div>
        </div>
      ))}
      {d.wallet.length > 0 && (
        <>
          <h3 style={{ fontSize: 18, marginTop: 14 }}>รายการเดินบัญชีล่าสุด</h3>
          <div className="table-w">
            <table>
              <thead><tr><th>รายการ</th><th>จำนวน</th><th>วันที่</th></tr></thead>
              <tbody>
                {d.wallet.map((w, i) => (
                  <tr key={i}><td>{w.reason}</td><td style={{ color: w.delta > 0 ? '#86efac' : '#fca5a5' }}>{w.delta > 0 ? '+' : ''}{baht(w.delta)} ฿</td><td className="subtle">{fmtDate(w.created_at)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Security() {
  const [f, setF] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState(null);
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try { await api('/api/account/password', 'POST', f); setF({ current: '', next: '' }); setMsg({ t: 'ok', m: 'เปลี่ยนรหัสผ่านแล้ว' }); }
    catch (x) { setMsg({ t: 'err', m: x.message }); }
  }
  return (
    <form className="panel" style={{ maxWidth: 440 }} onSubmit={save}>
      <h3 style={{ fontSize: 18 }}>เปลี่ยนรหัสผ่าน</h3>
      <label className="label">รหัสผ่านเดิม</label>
      <input className="input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
      <label className="label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label>
      <input className="input" type="password" autoComplete="new-password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required />
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>บันทึก</button>
    </form>
  );
}

export default function Account({ user, initialTab, minTopup, canPay }) {
  const { openAuth } = useShell();
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  if (!user)
    return (
      <div className="empty">
        <p style={{ marginBottom: 14 }}>กรุณาเข้าสู่ระบบเพื่อดูบัญชีของคุณ</p>
        <button className="btn btn-primary" onClick={() => openAuth('login')}>เข้าสู่ระบบ</button>
      </div>
    );
  const T = [['topup', 'เติมเงิน'], ['orders', 'ประวัติการสั่งซื้อ'], ['security', 'ความปลอดภัย']];
  return (
    <>
      <div className="page-h">
        <div><h1>สวัสดี, {user.username}</h1><div className="muted">{user.email}</div></div>
        <div className="panel" style={{ padding: '12px 20px' }}><span className="muted" style={{ fontSize: 13 }}>ยอดเงินคงเหลือ</span><div className="big" style={{ fontSize: 28 }}>{baht(user.balance)} ฿</div></div>
      </div>
      <div className="atabs">
        {T.map(([k, l]) => <button key={k} className={'filter' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); router.replace('/account?tab=' + k, { scroll: false }); }}>{l}</button>)}
      </div>
      {tab === 'topup' && <Topup minTopup={minTopup} canPay={canPay} />}
      {tab === 'orders' && <Orders />}
      {tab === 'security' && <Security />}
    </>
  );
}
