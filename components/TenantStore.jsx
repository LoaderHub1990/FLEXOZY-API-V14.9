'use client';
// หน้าร้านของผู้เช่า — ระบบจริง: สมัคร/เข้าสู่ระบบ · เติมเงินด้วยซอง TrueMoney · ซื้อสินค้า · ประวัติออเดอร์
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const dt = (d) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });

async function call(method, url, data) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
  return j;
}

function Overlay({ onClose, children }) {
  const [host, setHost] = useState(null);
  useEffect(() => { setHost(document.querySelector('.tn')); }, []);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  if (!host) return null;
  return createPortal(
    <div className="tn-ov" onClick={onClose}>
      <div className="tn-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tn-md-x" onClick={onClose} aria-label="ปิด">×</button>
        {children}
      </div>
    </div>, host);
}

export default function TenantStore({ sub, demo, shop, initial }) {
  const [data, setData] = useState(initial);
  const [cat, setCat] = useState(0);
  const [view, setView] = useState(null); // {t:'product',p} | {t:'auth',mode} | {t:'account'}
  const [toast, setToast] = useState('');
  const me = data.me;

  const reload = useCallback(() => call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}`).then(setData).catch(() => {}), [sub]);
  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 3500); };
  const close = useCallback(() => setView(null), []);
  const products = useMemo(() => data.products.filter((p) => !cat || p.category_id === cat), [data.products, cat]);

  async function logout() { await call('POST', '/api/tstore', { sub, action: 'logout' }).catch(() => {}); reload(); say('ออกจากระบบแล้ว'); }

  return (
    <>
      <header className="tn-nav">
        <div className="tn-brand">{shop.logo ? <img src={shop.logo} alt="" width="34" height="34" /> : <span className="tn-dot" />}<b>{shop.title}</b></div>
        <div className="tn-nav-r">
          {me ? (
            <>
              <button className="tn-wallet" onClick={() => setView({ t: 'account' })}>💰 ฿{baht(me.balance)} <span>· {me.username}</span></button>
              <button className="tn-link" onClick={logout}>ออกจากระบบ</button>
            </>
          ) : (
            <>
              <button className="tn-link" onClick={() => setView({ t: 'auth', mode: 'login' })}>เข้าสู่ระบบ</button>
              <button className="tn-btn pri tn-sm" onClick={() => setView({ t: 'auth', mode: 'register' })}>สมัครสมาชิก</button>
            </>
          )}
        </div>
      </header>

      <main className="tn-main">
        <section className="tn-hero">
          <h1>{shop.title}</h1>
          {shop.tagline && <p>{shop.tagline}</p>}
          <div className="tn-cta">
            {me
              ? <button className="tn-btn pri" onClick={() => setView({ t: 'account', tab: 'topup' })}>+ เติมเงิน</button>
              : <button className="tn-btn pri" onClick={() => setView({ t: 'auth', mode: 'register' })}>เริ่มต้นใช้งาน</button>}
            {(shop.links || []).map((l, i) => <a key={i} className="tn-btn" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>)}
          </div>
        </section>

        {data.categories.length > 0 && (
          <div className="tn-chips" role="tablist">
            <button className={'tn-chip' + (!cat ? ' on' : '')} onClick={() => setCat(0)}>ทั้งหมด</button>
            {data.categories.map((c) => <button key={c.id} className={'tn-chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
          </div>
        )}

        {products.length === 0 ? <div className="tn-empty">ยังไม่มีสินค้า</div> : (
          <section className="tn-grid">
            {products.map((p, i) => {
              const out = p.stock !== null && p.stock <= 0;
              return (
                <article key={p.id} className={'tn-card tn-click' + (out ? ' tn-out' : '')} style={{ '--i': i % 8 }} role="button" tabIndex={0}
                  onClick={() => setView({ t: 'product', p })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView({ t: 'product', p }); } }}>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : null}
                  <div className="tn-card-b">
                    <h3>{p.name}</h3>
                    {p.description && <p>{p.description}</p>}
                    <div className="tn-price">฿{baht(p.price)}</div>
                    <span className={'tn-stock' + (out ? ' no' : '')}>{out ? 'สินค้าหมด' : p.stock === null ? 'ส่งทันที' : `คงเหลือ ${p.stock}`}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
        {shop.about && <section className="tn-about" style={{ marginTop: 40 }}><p>{shop.about}</p></section>}
      </main>

      {toast && <div className="tn-toast" role="status">{toast}</div>}
      {view?.t === 'auth' && <AuthModal sub={sub} mode={view.mode} onClose={close} onDone={() => { close(); reload(); say('เข้าสู่ระบบสำเร็จ'); }} />}
      {view?.t === 'product' && <ProductModal sub={sub} p={view.p} me={me} onClose={close} onAuth={() => setView({ t: 'auth', mode: 'login' })} onTopup={() => setView({ t: 'account', tab: 'topup' })} onBought={reload} />}
      {view?.t === 'account' && me && <AccountModal sub={sub} me={me} demo={demo} hasPhone={shop.canTopup} tab0={view.tab} onClose={close} onChange={reload} />}
    </>
  );
}

function AuthModal({ sub, mode: m0, onClose, onDone }) {
  const [mode, setMode] = useState(m0);
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await call('POST', '/api/tstore', { sub, action: mode, username: u, password: p }); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <Overlay onClose={onClose}>
      <form className="tn-md-b tn-form" onSubmit={go}>
        <h3>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h3>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="ชื่อผู้ใช้" autoFocus autoComplete="username" maxLength={20} required />
        <input value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder={mode === 'register' ? 'รหัสผ่าน (อย่างน้อย 8 ตัว)' : 'รหัสผ่าน'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={72} required />
        {err && <div className="tn-err">{err}</div>}
        <button className="tn-btn pri" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
        <button type="button" className="tn-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>
      </form>
    </Overlay>
  );
}

function ProductModal({ sub, p, me, onClose, onAuth, onTopup, onBought }) {
  const [qty, setQty] = useState(1);
  const [step, setStep] = useState('view'); // view | confirm | done
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const out = p.stock !== null && p.stock <= 0;
  const max = Math.min(20, p.stock === null ? 20 : p.stock);
  const total = p.price * qty;
  async function buy() {
    setErr(''); setBusy(true);
    try { const r = await call('POST', '/api/tstore', { sub, action: 'buy', productId: p.id, qty }); setRes(r); setStep('done'); onBought(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <Overlay onClose={onClose}>
      {p.image ? <img src={p.image} alt="" /> : <div className="tn-md-ph" aria-hidden="true">{p.name.slice(0, 1)}</div>}
      <div className="tn-md-b">
        {step === 'done' ? (
          <>
            <h3>✓ สั่งซื้อสำเร็จ</h3>
            <p>{res.name} × {qty} · ฿{baht(res.total)}</p>
            <pre className="tn-keys">{res.items.join('\n')}</pre>
            <button className="tn-btn" onClick={() => navigator.clipboard?.writeText(res.items.join('\n'))}>คัดลอก</button>
            <p className="tn-md-n">ดูย้อนหลังได้ที่ “ออเดอร์ของฉัน” · ยอดคงเหลือ ฿{baht(res.balance)}</p>
          </>
        ) : (
          <>
            <h3>{p.name}</h3>
            <div className="tn-price">฿{baht(p.price)}</div>
            {p.description && <p>{p.description}</p>}
            <span className={'tn-stock' + (out ? ' no' : '')}>{out ? 'สินค้าหมด' : p.stock === null ? 'ส่งทันทีหลังชำระเงิน' : `คงเหลือ ${p.stock} ชิ้น`}</span>
            {!out && step === 'view' && (
              <div className="tn-qty">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="ลด">−</button><b>{qty}</b><button type="button" onClick={() => setQty(Math.min(max, qty + 1))} aria-label="เพิ่ม">+</button>
                <span>รวม ฿{baht(total)}</span>
              </div>
            )}
            {step === 'confirm' && <div className="tn-sum"><div><span>สินค้า</span><b>{p.name} × {qty}</b></div><div><span>ยอดชำระ</span><b>฿{baht(total)}</b></div><div><span>ยอดคงเหลือหลังซื้อ</span><b>฿{baht(Math.max(0, me.balance - total))}</b></div></div>}
            {err && <div className="tn-err">{err}</div>}
            {out ? null : !me ? <button className="tn-btn pri" onClick={onAuth}>เข้าสู่ระบบเพื่อสั่งซื้อ</button>
              : me.balance < total ? <button className="tn-btn pri" onClick={onTopup}>ยอดเงินไม่พอ — เติมเงิน</button>
              : step === 'view' ? <button className="tn-btn pri" onClick={() => setStep('confirm')}>ซื้อเลย</button>
              : <div className="tn-row2"><button className="tn-btn" onClick={() => setStep('view')} disabled={busy}>ย้อนกลับ</button><button className="tn-btn pri" onClick={buy} disabled={busy}>{busy ? 'กำลังสั่งซื้อ…' : 'ยืนยันสั่งซื้อ'}</button></div>}
          </>
        )}
      </div>
    </Overlay>
  );
}

function AccountModal({ sub, me, demo, hasPhone, tab0, onClose, onChange }) {
  const [tab, setTab] = useState(tab0 || 'topup');
  const [link, setLink] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState(null);
  useEffect(() => { if (tab === 'orders') call('GET', `/api/tstore?sub=${encodeURIComponent(sub)}&orders=1`).then((d) => setOrders(d.rows)).catch(() => setOrders([])); }, [tab, sub]);
  async function topup(e) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try { const r = await call('POST', '/api/tstore', { sub, action: 'topup', voucher: link }); setOk(`เติมเงินสำเร็จ +฿${baht(r.amount)}`); setLink(''); onChange(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <Overlay onClose={onClose}>
      <div className="tn-md-b">
        <h3>บัญชีของฉัน</h3>
        <div className="tn-bal">ยอดคงเหลือ <b>฿{baht(me.balance)}</b><small>{me.username}</small></div>
        <div className="tn-chips" style={{ margin: 0 }}>
          <button className={'tn-chip' + (tab === 'topup' ? ' on' : '')} onClick={() => setTab('topup')}>เติมเงิน</button>
          <button className={'tn-chip' + (tab === 'orders' ? ' on' : '')} onClick={() => setTab('orders')}>ออเดอร์ของฉัน</button>
        </div>
        {tab === 'topup' ? (
          hasPhone || demo ? (
            <form className="tn-form" onSubmit={topup}>
              {demo && <div className="tn-note">🧪 ร้านทดลอง: วางลิงก์ซองรูปแบบใดก็ได้ จะได้เงินเดโม ฿100 ต่อครั้ง ไม่มีเงินจริง</div>}
              <ol className="tn-pay-s"><li>1. สร้างซองอั่งเปาใน TrueMoney Wallet (จำนวน 1 คน)</li><li>2. ใส่ยอดที่ต้องการเติม แล้วคัดลอกลิงก์ซอง</li><li>3. วางลิงก์ด้านล่างแล้วกดยืนยัน — เติมเข้ายอดคงเหลือทันที</li></ol>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." inputMode="url" autoCapitalize="none" spellCheck={false} required />
              {err && <div className="tn-err">{err}</div>}{ok && <div className="tn-ok">{ok}</div>}
              <button className="tn-btn pri" disabled={busy || !link.trim()}>{busy ? 'กำลังตรวจสอบซอง…' : 'ยืนยันเติมเงิน'}</button>
            </form>
          ) : <div className="tn-note">ร้านนี้ยังไม่เปิดรับเติมเงิน กรุณาติดต่อเจ้าของร้าน</div>
        ) : (
          <div className="tn-orders">
            {orders === null ? <div className="tn-empty">กำลังโหลด…</div> : orders.length === 0 ? <div className="tn-empty">ยังไม่มีออเดอร์</div> : orders.map((o) => (
              <div key={o.id} className="tn-order">
                <div><b>{o.product_name} × {o.qty}</b><span>฿{baht(o.total)}</span></div>
                <small>#{o.id} · {dt(o.created_at)}</small>
                <pre className="tn-keys">{o.delivered}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}
