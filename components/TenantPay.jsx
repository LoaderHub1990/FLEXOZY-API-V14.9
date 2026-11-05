'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ฟอร์มจ่ายด้วยซองอั่งเปา TrueMoney บนเว็บของผู้เช่า (ข้อความทั้งหมดส่งมาจากเซิร์ฟเวอร์ตามภาษา)
export default function TenantPay({ sub, items, masked, L, demo }) {
  const [item, setItem] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    const h = (e) => { setItem(e.detail || ''); setOk(null); box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    window.addEventListener('tn-pick', h);
    return () => window.removeEventListener('tn-pick', h);
  }, []);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/tenant-pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sub, voucher: link, item, name, contact }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'error');
      setOk(d.amount); setLink('');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <section className="tn-pay" id="pay" ref={box}>
      {demo && <div className="tn-pay-demo">🧪 {L.demo}</div>}
      <div className="tn-pay-h">
        <span className="tn-pay-ic">🧧</span>
        <div><h2>{L.title}</h2><p>{L.sub} {masked}</p></div>
      </div>
      {ok != null ? (
        <div className="tn-pay-ok">
          <b>✓ {L.done}</b>
          <span>฿{(ok / 100).toLocaleString('th-TH')}</span>
          <small>{L.doneNote}</small>
          <button type="button" className="tn-btn" onClick={() => setOk(null)}>{L.again}</button>
        </div>
      ) : (
        <form onSubmit={submit} className="tn-pay-f">
          <ol className="tn-pay-s"><li>{L.s1}</li><li>{L.s2}</li><li>{L.s3}</li></ol>
          {items.length > 0 && (
            <select value={item} onChange={(e) => setItem(e.target.value)} aria-label={L.item}>
              <option value="">{L.item}</option>
              {items.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          )}
          <div className="tn-pay-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={L.name} autoComplete="name" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={60} placeholder={L.contact} />
          </div>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." required inputMode="url" autoCapitalize="none" spellCheck={false} />
          {err && <div className="tn-pay-e">{err}</div>}
          <button className="tn-btn pri" disabled={busy || !link.trim()}>{busy ? L.wait : L.submit}</button>
        </form>
      )}
    </section>
  );
}

export function PayPick({ name, label }) {
  return <button type="button" className="tn-qr-d-btn" onClick={() => window.dispatchEvent(new CustomEvent('tn-pick', { detail: name }))}>{label}</button>;
}


/* การ์ดสินค้า: คลิกเปิดรายละเอียด + ปุ่มสั่งซื้อ (ทำงานทั้งเว็บจริงและหน้าตัวอย่าง) */
export function TenantItem({ it, i, payOn, L }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(null);
  useEffect(() => { setHost(document.querySelector('.tn')); }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open]);
  const order = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('tn-pick', { detail: it.name }));
  };
  const modal = open && host ? createPortal(
    <div className="tn-ov" onClick={() => setOpen(false)}>
      <div className="tn-md" role="dialog" aria-modal="true" aria-label={it.name} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tn-md-x" onClick={() => setOpen(false)} aria-label={L.close}>×</button>
        {it.image ? <img src={it.image} alt="" /> : <div className="tn-md-ph" aria-hidden="true">{it.name.slice(0, 1)}</div>}
        <div className="tn-md-b">
          <h3>{it.name}</h3>
          {it.price && <div className="tn-price">{it.price}</div>}
          {it.desc && <p>{it.desc}</p>}
          {payOn
            ? <button type="button" className="tn-btn pri" onClick={order}>{L.order}</button>
            : <p className="tn-md-n">{L.contact}</p>}
        </div>
      </div>
    </div>, host) : null;
  return (
    <>
      <article className="tn-card tn-click" style={{ '--i': i % 8 }} role="button" tabIndex={0} onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}>
        {it.image ? <img src={it.image} alt="" loading="lazy" /> : null}
        <div className="tn-card-b">
          <h3>{it.name}</h3>
          {it.desc && <p>{it.desc}</p>}
          {it.price && <div className="tn-price">{it.price}</div>}
          {payOn && <span className="tn-qr-d-btn" onClick={(e) => { e.stopPropagation(); order(); }}>{L.order}</span>}
        </div>
      </article>
      {modal}
    </>
  );
}
