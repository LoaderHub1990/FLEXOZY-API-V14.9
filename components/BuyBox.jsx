'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, baht } from './api';
import { useShell, Modal } from './Shell';
import Icon from './Icons';

export default function BuyBox({ product: p, loggedIn, balance }) {
  const router = useRouter();
  const { openAuth } = useShell();
  const [qty, setQty] = useState(1);
  const [code, setCode] = useState('');
  const [disc, setDisc] = useState(null); // {discount,total,code}
  const [err, setErr] = useState('');
  const [cmsg, setCmsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);

  const max = Math.max(1, Math.min(p.stock, 50));
  const sub = p.price * qty;
  const total = disc ? Math.max(0, sub - disc.discount) : sub;

  function setQ(v) {
    v = Math.max(1, Math.min(max, parseInt(v, 10) || 1));
    setQty(v);
    setDisc(null); setCmsg('');
  }
  async function applyCoupon() {
    setCmsg(''); setErr('');
    if (!code.trim()) return;
    try {
      const r = await api('/api/coupon', 'POST', { code, productId: p.id, qty });
      setDisc({ ...r, code });
      setCmsg(`ใช้โค้ดสำเร็จ ลด ${baht(r.discount)} ฿`);
    } catch (e) { setDisc(null); setCmsg('!' + e.message); }
  }
  async function buy() {
    setErr(''); setBusy(true);
    try {
      const r = await api('/api/purchase', 'POST', { productId: p.id, qty, coupon: disc ? disc.code : '' });
      setDone(r);
      router.refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const out = p.stock <= 0;
  const short = loggedIn && balance < total;

  return (
    <>
      <div className="meta">
        <span className="chip">คงเหลือ {p.stock}</span>
        {p.sold > 0 && <span className="chip">ขายแล้ว {p.sold}</span>}
      </div>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <span className="muted">ราคา</span>
        <span className="price" style={{ fontSize: 30 }}>{baht(p.price)}<small>฿</small></span>
      </div>

      <label className="label">จำนวน</label>
      <div className="qty">
        <button type="button" onClick={() => setQ(qty - 1)} aria-label="ลด">−</button>
        <input value={qty} inputMode="numeric" onChange={(e) => setQ(e.target.value)} aria-label="จำนวน" />
        <button type="button" onClick={() => setQ(qty + 1)} aria-label="เพิ่ม">+</button>
      </div>

      <label className="label">โค้ดส่วนลด (ถ้ามี)</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={code} onChange={(e) => { setCode(e.target.value); setDisc(null); setCmsg(''); }} placeholder="CODE" />
        <button type="button" className="btn" onClick={applyCoupon}>ใช้โค้ด</button>
      </div>
      {cmsg && <div className={'msg ' + (cmsg[0] === '!' ? 'err' : 'ok')}>{cmsg.replace(/^!/, '')}</div>}

      <div className="total">
        <span className="muted">ราคารวม</span>
        <b>{baht(total)} ฿</b>
      </div>
      {err && <div className="msg err" style={{ marginTop: 0, marginBottom: 12 }}>{err}</div>}

      {out ? (
        <button className="btn" style={{ width: '100%' }} disabled>สินค้าหมด</button>
      ) : loggedIn ? (
        short ? (
          <Link href="/account?tab=topup" className="btn btn-primary" style={{ width: '100%' }}>ยอดเงินไม่พอ — เติมเงิน (มี {baht(balance)} ฿)</Link>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={buy} disabled={busy}>{busy ? <span className="spin" /> : 'ซื้อเลย'}</button>
        )
      ) : (
        <>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => openAuth('login')}>เข้าสู่ระบบเพื่อสั่งซื้อ</button>
          <div className="note">เข้าสู่ระบบก่อนเพื่อสั่งซื้อ</div>
        </>
      )}

      {done && (
        <Modal onClose={() => setDone(null)}>
          <h3>สั่งซื้อสำเร็จ 🎉</h3>
          <p className="muted" style={{ fontSize: 14, margin: '4px 0 14px' }}>ออเดอร์ #{done.orderId} · ยอดคงเหลือ {baht(done.balance)} ฿ · ข้อมูลนี้เก็บไว้ที่ “ประวัติการสั่งซื้อ” ด้วย</p>
          <div className="codebox">{done.items.join('\n')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { try { await navigator.clipboard.writeText(done.items.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>
              <Icon n={copied ? 'check' : 'copy'} size={16} /> {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
            <Link href="/account?tab=orders" className="btn" style={{ flex: 1 }}>ดูประวัติ</Link>
          </div>
        </Modal>
      )}
    </>
  );
}
