'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, baht, fmtDate } from './api';
import { useShell, Modal } from './Shell';
import Icon from './Icons';
import { ProfileCard } from './Avatar';
import { keyStatus } from '@/lib/duration';
import RobloxChip from './RobloxChip';

const ST = {
  approved: ['ok', 'สำเร็จ'], pending: ['warn', 'รอตรวจสอบ'], processing: ['warn', 'รอแอดมินตรวจสอบ'],
  rejected: ['bad', 'ไม่สำเร็จ'], cancelled: ['', 'ยกเลิก'], expired: ['', 'หมดอายุ'],
};
const MT = {
  bank: { name: 'โอนผ่านธนาคาร', sub: 'ตรวจสลิปอัตโนมัติ', cls: 'bank', ico: '🏦' },
  truemoney: { name: 'TrueMoney Gift', sub: 'รับซองอัตโนมัติ', cls: 'tmn', ico: '🎁' },
  manual: { name: 'PromptPay (เดิม)', sub: 'แอดมินอนุมัติ', cls: 'old', ico: '🧾' },
};

// ย่อรูปที่ใหญ่เกิน 3MB ก่อนอัปโหลด (Vercel รับ body ได้ไม่เกิน ~4.5MB)
async function shrink(file) {
  if (file.size <= 3 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
    return blob ? new File([blob], 'slip.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

function Topup({ user, minTopup, canPay, canTrueMoney, promptpayEnabled = true, truemoneyEnabled = true, receiver = {} }) {
  const router = useRouter();
  const [amount, setAmount] = useState('100');
  const [method, setMethod] = useState(promptpayEnabled ? 'bank' : truemoneyEnabled ? 'truemoney' : null);
  const [voucher, setVoucher] = useState('');
  const [tmBusy, setTmBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [qr, setQr] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [drag, setDrag] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [data, setData] = useState({ topups: [], summary: { total: 0, count: 0 } });
  const [flt, setFlt] = useState('all');
  const [balance, setBalance] = useState(user?.balance || 0);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => api('/api/topup').then(setData).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const baht0 = Number(amount) || 0;
  const pick = (m) => { setMethod(m); setMsg(null); setDone(null); };

  async function makeQr() {
    setMsg(null); setQrBusy(true);
    try { const r = await api('/api/topup/qr', 'POST', { amount: baht0 }); setQr(r.topup); setStep(2); }
    catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setQrBusy(false); }
  }
  async function chooseFile(f) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setMsg({ t: 'err', m: 'รองรับเฉพาะรูป JPG / PNG / WEBP' }); return; }
    setMsg(null); setFile(await shrink(f));
  }
  async function upload() {
    if (!file) return;
    setMsg(null); setUpBusy(true);
    try {
      const fd = new FormData(); fd.append('slip', file);
      const res = await fetch('/api/topup/slip', { method: 'POST', body: fd, credentials: 'same-origin' });
      let out = {}; try { out = await res.json(); } catch {}
      if (!res.ok) throw new Error(out.error || 'ตรวจสลิปไม่สำเร็จ');
      setDone(out); setBalance(out.balance); setFile(null); setQr(null); setStep(1); load(); router.refresh();
    } catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setUpBusy(false); }
  }
  async function redeemTrueMoneyVoucher() {
    setMsg(null); setDone(null); setTmBusy(true);
    try {
      const r = await api('/api/topup/truemoney', 'POST', { voucher: voucher.trim() });
      setVoucher(''); setBalance(r.balance); setDone({ amount: r.amount, balance: r.balance, tm: true }); load(); router.refresh();
    } catch (e) { setMsg({ t: 'err', m: e.message }); }
    finally { setTmBusy(false); }
  }

  const list = data.topups.filter((t) => flt === 'all' || (flt === 'bank' ? t.method === 'bank' || t.method === 'manual' : t.method === flt));
  const STEPS = ['เลือกยอด', 'สแกนจ่าย', 'ส่งสลิป'];

  return (
    <div className="topup-rzx">
      <div className="topup-rzx-head">
        <div className="topup-rzx-eyebrow"><span>✓</span> เติมเงินอัตโนมัติ ไม่มีค่าธรรมเนียม</div>
        <h2>เติมเงินเข้ากระเป๋า</h2>
        <p>เติม 10 บาท ได้ 10 บาท · เครดิตเข้าทันทีหลังระบบตรวจสอบ</p>
      </div>

      <div className="tp-stats">
        <div className="tp-stat main"><span>ยอดเงินคงเหลือ</span><b>{baht(balance)} ฿</b></div>
        <div className="tp-stat"><span>เติมแล้วทั้งหมด</span><b>{baht(data.summary.total)} ฿</b></div>
        <div className="tp-stat"><span>จำนวนครั้ง</span><b>{data.summary.count}</b></div>
      </div>

      <div className="topup-rzx-methods" aria-label="ช่องทางเติมเงิน">
        <button type="button" className={'topup-rzx-card' + (method === 'bank' ? ' selected' : '') + (promptpayEnabled ? '' : ' disabled')} disabled={!promptpayEnabled} onClick={() => pick('bank')}>
          <span className="topup-rzx-icon"><img src="/uploads/payments/promptpay.svg" alt="PromptPay" /></span>
          <span className="topup-rzx-copy"><b>โอนผ่านธนาคาร</b><small>สแกน QR แล้วส่งสลิป<br />ระบบตรวจสลิปให้อัตโนมัติ</small>{promptpayEnabled ? <em><i />ค่าธรรมเนียม 0 บาท</em> : <em className="off">ปิดใช้งานชั่วคราว</em>}</span>
          <span className="topup-rzx-arrow">›</span>
        </button>
        <button type="button" className={'topup-rzx-card' + (method === 'truemoney' ? ' selected' : '') + (truemoneyEnabled ? '' : ' disabled')} disabled={!truemoneyEnabled} onClick={() => pick('truemoney')}>
          <span className="topup-rzx-icon"><img src="/uploads/payments/truemoney-gift.png" alt="TrueMoney Gift" /></span>
          <span className="topup-rzx-copy"><b>TrueMoney Gift</b><small>วางลิงก์ซองของขวัญ<br />ระบบรับซองให้อัตโนมัติ</small>{truemoneyEnabled ? <em><i />ค่าธรรมเนียม 0 บาท</em> : <em className="off">ปิดใช้งานชั่วคราว</em>}</span>
          <span className="topup-rzx-arrow">›</span>
        </button>
      </div>

      <div className="topup-rzx-detail">
        {done && (
          <div className="tp-done">
            <div className="tp-done-ico">✓</div>
            <div className="tp-done-t">เติมเงินสำเร็จ</div>
            <div className="tp-done-amt">+{baht(done.amount)} ฿</div>
            <div className="tp-done-s">ยอดคงเหลือตอนนี้ {baht(done.balance)} ฿</div>
            {!done.tm && done.transRef && <div className="tp-done-meta">{done.bank} {done.sender && `· ${done.sender}`}<br />อ้างอิง {done.transRef}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <a className="btn btn-primary" href="/store">ไปเลือกซื้อสินค้า</a>
              <button className="btn" onClick={() => setDone(null)}>เติมเพิ่ม</button>
            </div>
          </div>
        )}

        {!done && method === 'truemoney' && truemoneyEnabled && (
          <div className="topup-rzx-form">
            {!canTrueMoney && <div className="msg err">ร้านยังไม่ได้ตั้งค่า TRUEMONEY_MOBILE</div>}
            <div className="topup-rzx-form-title">TrueMoney Gift</div>
            <div className="topup-rzx-form-sub">วางลิงก์ซองของขวัญ ระบบจะกดรับเข้ากระเป๋าร้านแล้วเติมเครดิตเท่ายอดในซองทันที</div>
            <input className="input" value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." autoComplete="off" />
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={tmBusy || !canTrueMoney || !voucher.trim()} onClick={redeemTrueMoneyVoucher}>
              {tmBusy ? <><span className="spin" /> กำลังรับซอง...</> : 'รับซองและเติมเงิน'}
            </button>
            <ul className="tp-tips">
              <li>สร้างซองแบบ <b>ผู้รับ 1 คน</b> เท่านั้น</li>
              <li>ขั้นต่ำ {minTopup} บาท · ซองที่รับแล้วใช้ซ้ำไม่ได้</li>
              <li>ได้เครดิตเท่ายอดที่ TrueMoney ยืนยันว่าเข้าจริง</li>
            </ul>
          </div>
        )}

        {!done && method === 'bank' && promptpayEnabled && (
          <div className="topup-rzx-form">
            {!canPay && <div className="msg err">ร้านยังไม่เปิดรับเติมเงิน (ตั้งค่า PROMPTPAY_ID และ EASYSLIP_API_KEY)</div>}
            <div className="tp-steps">
              {STEPS.map((l, i) => (
                <button key={l} type="button" className={'tp-step' + (step === i + 1 ? ' on' : '') + (step > i + 1 ? ' ok' : '')} onClick={() => { if (i === 0 || (i === 2)) setStep(i + 1); else if (qr) setStep(2); }}>
                  <i>{step > i + 1 ? '✓' : i + 1}</i><span>{l}</span>
                </button>
              ))}
            </div>

            {step === 1 && (
              <>
                <div className="topup-rzx-form-sub">เลือกจำนวนเงินที่ต้องการเติม ระบบจะสร้าง QR ตามยอดนั้นพอดี</div>
                <div className="topup-rzx-amounts">
                  {[50, 100, 200, 500, 1000].map((v) => <button key={v} className={'filter' + (baht0 === v ? ' on' : '')} onClick={() => setAmount(String(v))}>{v} ฿</button>)}
                </div>
                <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder={`จำนวนเงิน (ขั้นต่ำ ${minTopup} บาท)`} />
                <div className="tp-recv"><span>จ่าย</span><b>{baht0 ? baht0.toLocaleString('th-TH') : 0} ฿</b><span>→ ได้เครดิต</span><b className="g">{baht0 ? baht0.toLocaleString('th-TH') : 0} ฿</b></div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={qrBusy || !canPay || baht0 < minTopup} onClick={makeQr}>{qrBusy ? <span className="spin" /> : 'สร้าง QR Code'}</button>
                <button type="button" className="tp-link" onClick={() => setStep(3)}>โอนไปแล้ว? ส่งสลิปได้เลย ›</button>
              </>
            )}

            {step === 2 && qr && (
              <div style={{ textAlign: 'center' }}>
                <img className="qr" src={qr.qr} alt="PromptPay QR" />
                <div className="muted" style={{ marginTop: 12, fontSize: 14 }}>สแกนด้วยแอปธนาคารใดก็ได้</div>
                <div className="big">{baht(qr.amount)} ฿</div>
                {receiver.name && <div className="subtle" style={{ fontSize: 13 }}>บัญชีผู้รับ: {receiver.name}</div>}
                {receiver.bankAccount && <div className="tp-bank"><span>{receiver.bankName || 'บัญชีธนาคาร'}</span><b>{receiver.bankAccount}</b>{receiver.bankAccountName && <em>{receiver.bankAccountName}</em>}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>โอนแล้ว ส่งสลิป</button>
                  <button className="btn" onClick={() => { setStep(1); setQr(null); }}>เปลี่ยนยอด</button>
                </div>
                <div className="note">โอนตามยอดที่แสดง ไม่มีค่าธรรมเนียมจากร้าน · ถ้าโอนยอดอื่น ระบบเติมเครดิตตามยอดในสลิปจริง</div>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="topup-rzx-form-sub">อัปโหลดสลิปโอนเงิน (เห็น QR Code บนสลิปชัดเจน) ระบบตรวจกับธนาคารแล้วเติมเครดิตให้ทันที</div>
                <label className={'tp-drop' + (drag ? ' drag' : '') + (preview ? ' has' : '')}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files?.[0]); }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} />
                  {preview ? <img src={preview} alt="สลิป" /> : <><span className="tp-drop-ico">🧾</span><b>แตะเพื่อเลือกรูปสลิป</b><small>หรือลากไฟล์มาวางที่นี่ · JPG / PNG / WEBP · ไม่เกิน 4 MB</small></>}
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!file || upBusy || !canPay} onClick={upload}>{upBusy ? <><span className="spin" /> กำลังตรวจสลิป...</> : 'ตรวจสลิปและเติมเงิน'}</button>
                  {file && !upBusy && <button className="btn" onClick={() => setFile(null)}>ล้าง</button>}
                </div>
                <button type="button" className="tp-link" onClick={() => setStep(1)}>‹ กลับไปเลือกยอด</button>
                <ul className="tp-tips">
                  <li>สลิป 1 ใบใช้ได้ครั้งเดียว และต้องโอนเข้าบัญชีของร้านเท่านั้น</li>
                  <li>สลิปต้องไม่เก่าเกิน 24 ชั่วโมง</li>
                </ul>
              </>
            )}
          </div>
        )}
        {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      </div>

      <div className="topup-rzx-history">
        <div className="topup-rzx-history-head">
          <h3>ประวัติการเติมเงิน</h3>
          <div className="tp-flt">
            {[['all', 'ทั้งหมด'], ['bank', 'ธนาคาร'], ['truemoney', 'TrueMoney']].map(([k, l]) => <button key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}
          </div>
        </div>
        <div className="tp-list">
          {list.map((t) => {
            const m = MT[t.method] || MT.manual; const st = ST[t.status] || ['', t.status];
            return (
              <div key={t.key} className="tp-item">
                <span className={'tp-ico ' + m.cls}>{m.ico}</span>
                <div className="tp-main">
                  <div className="tp-row1"><b>{m.name}</b><span className={'tag ' + st[0]}>{st[1]}</span></div>
                  <div className="tp-row2">{fmtDate(t.created_at)}{t.ref ? ` · ${t.ref}` : ''}</div>
                  {t.note && <div className="tp-row2">{t.note}</div>}
                </div>
                <div className={'tp-amt' + (t.status === 'approved' ? ' plus' : ' dim')}>{t.status === 'approved' ? '+' : ''}{baht(t.amount)} ฿</div>
              </div>
            );
          })}
          {!list.length && <div className="tp-empty"><span>🪙</span>ยังไม่มีรายการเติมเงิน<small>เติมเงินครั้งแรกแล้วประวัติจะแสดงที่นี่</small></div>}
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ order, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/api/reviews', 'POST', { orderId: order.id, rating, comment: text }); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const shown = hover || rating;
  return (
    <Modal onClose={onClose}>
      <h3>รีวิวสินค้า</h3>
      <p className="muted" style={{ fontSize: 14, margin: '4px 0 14px' }}>{order.product_name}</p>
      <form onSubmit={send}>
        <div className="star-pick" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button type="button" key={i} className={i <= shown ? 'on' : ''} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} aria-label={`${i} ดาว`}><Icon n="star" size={30} /></button>
          ))}
        </div>
        <label className="label">ความคิดเห็น</label>
        <textarea className="input" rows={4} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="สินค้าเป็นอย่างไร ใช้งานดีไหม (อย่างน้อย 5 ตัวอักษร)" required />
        <div className="subtle" style={{ fontSize: 12, textAlign: 'right', marginTop: 4 }}>{text.length}/300</div>
        <p className="subtle" style={{ fontSize: 12.5, margin: '8px 0 0' }}>รีวิวจะแสดงบนหน้าแรกพร้อมรูปโปรไฟล์และชื่อที่แสดงของคุณ</p>
        {err && <div className="msg err">{err}</div>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy}>{busy ? <span className="spin" /> : 'ส่งรีวิว'}</button>
      </form>
    </Modal>
  );
}

function Orders() {
  const [d, setD] = useState(null);
  const [rv, setRv] = useState(null);
  const load = useCallback(() => api('/api/account/orders').then(setD).catch(() => setD({ orders: [], wallet: [] })), []);
  useEffect(() => { load(); }, [load]);
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
          {o.keys?.length ? (
            <div className="keylist">
              {o.keys.map((k) => {
                const [cls, txt] = keyStatus(k);
                return (
                  <div className="keyrow" key={k.key}>
                    <code>{k.key}</code>
                    <span className={'tag ' + cls}>{txt}</span>
                    <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(k.key)}><Icon n="copy" size={14} /> คัดลอก</button>
                    {(k.roblox_id || k.hwid_bound) && (
                      <div className="keyuse">
                        {k.roblox_id && <><span className="subtle">ใช้งานโดย</span><RobloxChip id={k.roblox_id} name={k.roblox_name} display={k.roblox_display} avatar={k.roblox_avatar} /></>}
                        {k.hwid_bound && <span className="tag ok">ผูกเครื่องแล้ว</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <div className="codebox" style={{ marginTop: 12 }}>{o.items.join('\n') || '—'}</div>}
          <div className="rv-line">
            {o.review ? (
              <><span className="stars">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} n="star" size={15} className={i <= o.review.rating ? 'on' : ''} />)}</span><span className="muted" style={{ fontSize: 13 }}>รีวิวของคุณ: {o.review.comment}</span></>
            ) : (
              <button className="btn btn-sm" onClick={() => setRv(o)}><Icon n="star" size={14} /> รีวิวสินค้านี้</button>
            )}
          </div>
        </div>
      ))}
      {rv && <ReviewModal order={rv} onClose={() => setRv(null)} onDone={() => { setRv(null); load(); }} />}
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

/* ---------- ตั้งค่าโปรไฟล์ ---------- */
function resizeToJpeg(file, w, h) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return reject(new Error('รองรับเฉพาะไฟล์ PNG / JPG / WebP'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('ไฟล์ใหญ่เกิน 10 MB'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#18181c'; x.fillRect(0, 0, w, h);
      const r = Math.max(w / img.width, h / img.height); // ตัดให้เต็มกรอบ (cover)
      const dw = img.width * r, dh = img.height * r;
      x.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดไฟล์รูปไม่ได้')); };
    img.src = url;
  });
}

function ProfileSettings({ user, discordLogin }) {
  const router = useRouter();
  const p = user.profile;
  const [name, setName] = useState(p.displayName || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  useEffect(() => setName(p.displayName || ''), [p.displayName]);

  async function run(key, fn, okMsg) {
    setMsg(null); setBusy(key);
    try { await fn(); setMsg({ t: 'ok', m: okMsg }); router.refresh(); }
    catch (e) { setMsg({ t: 'err', m: e.message }); }
    finally { setBusy(''); }
  }
  const saveName = (e) => { e.preventDefault(); run('name', () => api('/api/account/profile', 'POST', { displayName: name }), 'บันทึกชื่อแล้ว'); };
  const upload = (kind, w, h) => (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    run(kind, async () => api('/api/account/media', 'POST', { kind, data: await resizeToJpeg(f, w, h) }), kind === 'avatar' ? 'เปลี่ยนรูปโปรไฟล์แล้ว' : 'เปลี่ยนแบนเนอร์แล้ว');
  };
  const remove = (kind) => run(kind + '-rm', () => api('/api/account/media', 'DELETE', { kind }), 'ลบรูปที่อัปโหลดแล้ว (กลับไปใช้ของ Discord / ค่าเริ่มต้น)');
  const hasFrame = !!p.decoration;

  return (
    <div className="prof-grid">
      <div>
        <ProfileCard p={p} />
        {p.discord && (
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="row"><b>Discord</b><a className="btn btn-sm btn-discord" style={{ width: 'auto', marginTop: 0 }} href={p.discord.profileUrl} target="_blank" rel="noopener noreferrer"><Icon n="discord" size={14} /> ดูโปรไฟล์</a></div>
            <p className="subtle" style={{ fontSize: 12.5, marginTop: 8 }}>กรอบโปรไฟล์/แบนเนอร์จาก Discord อัปเดตเมื่อคุณเข้าสู่ระบบด้วย Discord ครั้งถัดไป หรือกด “ซิงก์ใหม่” ด้านล่าง</p>
            <a className="btn btn-sm" style={{ marginTop: 10 }} href="/api/auth/discord?mode=link">ซิงก์ข้อมูลจาก Discord ใหม่</a>
          </div>
        )}
      </div>

      <div className="cols">
        <form className="panel" onSubmit={saveName}>
          <h3 style={{ fontSize: 18 }}>ชื่อที่แสดง</h3>
          <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 10px' }}>เปลี่ยนชื่อที่แสดงในเว็บได้ (ชื่อผู้ใช้สำหรับล็อกอิน “{p.username}” ยังเหมือนเดิม) — เว้นว่างเพื่อใช้ชื่อผู้ใช้</p>
          <input className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={p.username} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={busy === 'name'}>{busy === 'name' ? <span className="spin" /> : 'บันทึกชื่อ'}</button>
        </form>

        <div className="panel">
          <h3 style={{ fontSize: 18 }}>รูปโปรไฟล์</h3>
          <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 12px' }}>อัปโหลดรูปของคุณเอง (ระบบตัดเป็นสี่เหลี่ยมจัตุรัสให้) ถ้าไม่อัปโหลดจะใช้รูปจาก Discord</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>{busy === 'avatar' ? <span className="spin" /> : 'เลือกรูปโปรไฟล์'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload('avatar', 256, 256)} /></label>
            {p.customAvatar && <button type="button" className="btn" onClick={() => remove('avatar')} disabled={busy === 'avatar-rm'}>ลบรูปที่อัปโหลด</button>}
          </div>
        </div>

        <div className="panel">
          <h3 style={{ fontSize: 18 }}>แบนเนอร์โปรไฟล์</h3>
          <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 12px' }}>ขนาดแนะนำ 960×320 (อัตราส่วน 3:1) ถ้าไม่อัปโหลดจะใช้แบนเนอร์จาก Discord</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>{busy === 'banner' ? <span className="spin" /> : 'เลือกแบนเนอร์'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload('banner', 960, 320)} /></label>
            {p.customBanner && <button type="button" className="btn" onClick={() => remove('banner')} disabled={busy === 'banner-rm'}>ลบแบนเนอร์ที่อัปโหลด</button>}
          </div>
        </div>

        <div className="panel">
          <h3 style={{ fontSize: 18 }}>กรอบโปรไฟล์ Discord</h3>
          {p.discord ? (
            hasFrame ? (
              <label className="cookie-opt" style={{ marginTop: 10 }}>
                <span><b>แสดงกรอบโปรไฟล์จาก Discord</b><small>ครอบรอบรูปโปรไฟล์ของคุณบนเว็บนี้</small></span>
                <input type="checkbox" checked={p.showFrame} onChange={(e) => run('frame', () => api('/api/account/profile', 'POST', { showFrame: e.target.checked }), 'บันทึกแล้ว')} />
              </label>
            ) : <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>บัญชี Discord ของคุณยังไม่ได้ใส่กรอบโปรไฟล์ (ตั้งใน Discord แล้วกด “ซิงก์ใหม่”)</p>
          ) : discordLogin ? (
            <>
              <p className="muted" style={{ fontSize: 14, margin: '8px 0 12px' }}>ผูกบัญชี Discord เพื่อดึงกรอบโปรไฟล์และแบนเนอร์มาใช้</p>
              <a className="btn btn-discord" style={{ marginTop: 0 }} href="/api/auth/discord?mode=link"><Icon n="discord" size={18} /> ผูกบัญชี Discord</a>
            </>
          ) : <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>ร้านยังไม่ได้เปิดใช้ล็อกอินด้วย Discord</p>}
        </div>
        {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      </div>
    </div>
  );
}

function DiscordLink({ user, discordLogin }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const d = user.discord;
  async function unlink() {
    setMsg(null);
    try { await api('/api/auth/discord/unlink', 'POST', {}); router.refresh(); }
    catch (x) { setMsg({ t: 'err', m: x.message }); }
  }
  return (
    <div className="panel" style={{ maxWidth: 440, marginBottom: 16 }}>
      <h3 style={{ fontSize: 18 }}>บัญชี Discord</h3>
      {d ? (
        <>
          <div className="dprof" style={{ margin: '14px 0' }}>
            <img className="dprof-av" src={d.avatar} alt="" width="56" height="56" referrerPolicy="no-referrer" style={{ width: 56, height: 56 }} />
            <div style={{ minWidth: 0 }}><div className="dprof-name" style={{ fontSize: 17 }}>{d.name}</div><div className="muted" style={{ fontSize: 13 }}>@{d.username}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a className="btn btn-discord" style={{ flex: 1, marginTop: 0 }} href={d.profileUrl} target="_blank" rel="noopener noreferrer"><Icon n="discord" size={16} /> ดูโปรไฟล์</a>
            <button className="btn" onClick={unlink}>ยกเลิกการผูก</button>
          </div>
        </>
      ) : discordLogin ? (
        <>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>ผูกบัญชี Discord เพื่อเข้าสู่ระบบได้ในคลิกเดียว</p>
          <a className="btn btn-discord" style={{ marginTop: 0 }} href="/api/auth/discord?mode=link"><Icon n="discord" size={18} /> ผูกบัญชี Discord</a>
        </>
      ) : <p className="muted" style={{ fontSize: 14 }}>ร้านยังไม่ได้เปิดใช้ล็อกอินด้วย Discord</p>}
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
    </div>
  );
}

function Security({ user, discordLogin }) {
  const [f, setF] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState(null);
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try { await api('/api/account/password', 'POST', f); setF({ current: '', next: '' }); setMsg({ t: 'ok', m: 'เปลี่ยนรหัสผ่านแล้ว' }); }
    catch (x) { setMsg({ t: 'err', m: x.message }); }
  }
  const dcOnly = String(user.email || '').endsWith('@discord.local');
  return (
    <>
    <DiscordLink user={user} discordLogin={discordLogin} />
    {dcOnly ? (
      <div className="panel" style={{ maxWidth: 440 }}><h3 style={{ fontSize: 18 }}>รหัสผ่าน</h3><p className="muted" style={{ fontSize: 14, marginTop: 8 }}>บัญชีนี้สมัครผ่าน Discord จึงเข้าสู่ระบบด้วย Discord เท่านั้น ไม่ต้องใช้รหัสผ่าน</p></div>
    ) : (
    <form className="panel" style={{ maxWidth: 440 }} onSubmit={save}>
      <h3 style={{ fontSize: 18 }}>เปลี่ยนรหัสผ่าน</h3>
      <label className="label">รหัสผ่านเดิม</label>
      <input className="input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
      <label className="label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label>
      <input className="input" type="password" autoComplete="new-password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required />
      {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>บันทึก</button>
    </form>
    )}
    </>
  );
}

export default function Account({ user, discordLogin, initialTab, minTopup, canPay, canTrueMoney, promptpayEnabled, truemoneyEnabled, receiver }) {
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
  const T = [['topup', 'เติมเงิน'], ['orders', 'ประวัติการสั่งซื้อ'], ['profile', 'ตั้งค่าโปรไฟล์'], ['security', 'ความปลอดภัย']];
  if (tab === 'topup') {
    return <Topup user={user} minTopup={minTopup} canPay={canPay} canTrueMoney={canTrueMoney} promptpayEnabled={promptpayEnabled} truemoneyEnabled={truemoneyEnabled} receiver={receiver} />;
  }
  return (
    <>
      <div className="page-h">
        <div><h1>สวัสดี, {user.profile?.name || user.username}</h1><div className="muted">{user.email}</div></div>
        <div className="panel" style={{ padding: '12px 20px' }}><span className="muted" style={{ fontSize: 13 }}>ยอดเงินคงเหลือ</span><div className="big" style={{ fontSize: 28 }}>{baht(user.balance)} ฿</div></div>
      </div>
      <div className="atabs">
        {T.map(([k, l]) => <button key={k} className={'filter' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); router.replace('/account?tab=' + k, { scroll: false }); }}>{l}</button>)}
      </div>
      {tab === 'orders' && <Orders />}
      {tab === 'profile' && <ProfileSettings user={user} discordLogin={discordLogin} />}
      {tab === 'security' && <Security user={user} discordLogin={discordLogin} />}
    </>
  );
}
