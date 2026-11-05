'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, baht, fmtDate } from './api';
import { Modal, useShell } from './Shell';
import { useT } from './Prefs';
import Icon from './Icons';

const clean = (v) => v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
const PERKS = ['ลิงก์ชื่อที่คุณตั้งเอง', 'แก้ไขหน้าเว็บได้เองตลอดเวลา', 'เปิดใช้งานทันทีหลังชำระเงิน', 'ต่ออายุได้ง่ายจากกระเป๋าเงิน'];

/* ======================= หน้าเลือกแพ็กเกจ ======================= */
export function RentPlans({ plans, root, balance, loggedIn }) {
  const t = useT();
  const { openAuth } = useShell();
  const [sel, setSel] = useState(null);
  return (
    <>
      <div className="plans">
        {plans.map((p, i) => (
          <div key={p.id} className={'plan rv' + (i === 0 ? ' pop' : '')} style={{ '--i': i }}>
            {i === 0 && <span className="pill">{t('เริ่มต้น')}</span>}
            <h3>{p.name}</h3>
            <div className="pr">{baht(p.price)}<small>฿ / {p.days} {t('วัน')}</small></div>
            {p.description && <p className="muted" style={{ fontSize: 14 }}>{p.description}</p>}
            <ul>{PERKS.map((x) => <li key={x}><Icon n="check" size={15} />{t(x)}</li>)}</ul>
            <button className="btn btn-primary" onClick={() => (loggedIn ? setSel(p) : openAuth('login'))}>{t('สั่งซื้อ')}</button>
          </div>
        ))}
        {plans.length === 0 && <div className="empty">—</div>}
      </div>
      {sel && <OrderModal plan={sel} root={root} balance={balance} onClose={() => setSel(null)} />}
    </>
  );
}

function OrderModal({ plan, root, balance, onClose }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [st, setSt] = useState({ s: 'idle' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const tick = useRef(0);

  useEffect(() => {
    if (name.length < 3) { setSt({ s: 'idle' }); return; }
    setSt({ s: 'wait' });
    const my = ++tick.current;
    const h = setTimeout(() => {
      api('/api/rent?check=' + encodeURIComponent(name))
        .then((r) => { if (my === tick.current) setSt(r.available ? { s: 'ok' } : { s: 'no', reason: r.reason }); })
        .catch((e) => { if (my === tick.current) setSt({ s: 'no', reason: 'err', msg: e.message }); });
    }, 350);
    return () => clearTimeout(h);
  }, [name]);

  const short = balance < plan.price;
  async function buy() {
    setErr(''); setBusy(true);
    try { const r = await api('/api/rent', 'POST', { planId: plan.id, sub: name }); setDone(r.rental); router.refresh(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Modal onClose={onClose}>
        <h3>🎉 {t('สั่งซื้อสำเร็จ! เว็บของคุณพร้อมแล้ว')}</h3>
        <p style={{ margin: '14px 0' }}><span className="rent-url">{done.sub}.{root}</span></p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/rent/my" className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>{t('ไปจัดการเว็บ')}</Link>
          <a href={done.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ flex: 1 }}>{t('เปิดเว็บ')} <Icon n="ext" size={14} /></a>
        </div>
      </Modal>
    );
  }
  const hint = { idle: ['', ''], wait: ['wait', t('กำลังตรวจสอบ…')], ok: ['ok', '✓ ' + t('ชื่อนี้ใช้ได้')],
    no: ['no', st.reason === 'reserved' ? t('ชื่อนี้สงวนไว้') : st.reason === 'invalid' ? t('ชื่อไม่ถูกต้อง') : st.reason === 'err' ? st.msg : t('ชื่อนี้ถูกใช้แล้ว')] }[st.s];
  return (
    <Modal onClose={onClose}>
      <h3>{plan.name} · {baht(plan.price)} ฿</h3>
      <p className="muted" style={{ fontSize: 14, margin: '4px 0 16px' }}>{t('ตั้งชื่อเว็บของคุณ')}</p>
      <label className="label" style={{ marginTop: 0 }}>{t('ชื่อเว็บที่ต้องการ')}</label>
      <div className="sub-in">
        <input autoFocus value={name} onChange={(e) => setName(clean(e.target.value))} placeholder="128bit" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={32} aria-label={t('ชื่อเว็บที่ต้องการ')} />
        <span>.{root}</span>
      </div>
      <div className={'sub-hint ' + hint[0]}>{hint[1] || <span className="subtle">{t('a-z 0-9 และ - ยาว 3-32 ตัว')}</span>}</div>
      <div className="cf-rows" style={{ marginTop: 10 }}>
        <div><span>{t('อายุการใช้งาน')}</span><b>{plan.days} {t('วัน')}</b></div>
        <div className="cf-total"><span>{t('ราคา')}</span><b>{baht(plan.price)} ฿</b></div>
        <div><span>{t('ยอดเงินคงเหลือ')}</span><b>{baht(balance)} ฿</b></div>
      </div>
      {err && <div className="msg err">{err}</div>}
      {short ? (
        <Link href="/account?tab=topup" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>{t('ยอดเงินไม่พอ — เติมเงินก่อน')}</Link>
      ) : (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy || st.s !== 'ok'} onClick={buy}>{busy ? <span className="spin" /> : t('ยืนยันสั่งซื้อ')}</button>
      )}
    </Modal>
  );
}

/* ======================= หน้าเว็บที่เช่าไว้ ======================= */
const TAG = { active: ['ok', 'ใช้งานอยู่'], expired: ['bad', 'หมดอายุ'], suspended: ['warn', 'ถูกระงับ'] };

export function RentManage() {
  const t = useT();
  const { openAuth } = useShell();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [renew, setRenew] = useState(null);
  const load = useCallback(() => api('/api/rent').then((r) => { setD(r); setErr(''); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (err) return <div className="panel" style={{ maxWidth: 480 }}><div className="msg err">{err}</div><button className="btn btn-sm" style={{ marginTop: 10 }} onClick={load}>{t('ลองใหม่')}</button></div>;
  if (!d) return <div className="muted">{t('กำลังโหลด…')}</div>;
  if (!d.loggedIn) return <div className="empty"><p style={{ marginBottom: 14 }}>{t('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ')}</p><button className="btn btn-primary" onClick={() => openAuth('login')}>{t('เข้าสู่ระบบ')}</button></div>;
  if (!d.rentals?.length) return <div className="empty"><p style={{ marginBottom: 14 }}>{t('ยังไม่มีเว็บที่เช่า')}</p><Link href="/rent" className="btn btn-primary">{t('เช่าเว็บเลย')}</Link></div>;
  return (
    <div className="my-rent">
      {d.rentals.map((r) => <RentalCard key={r.id} r={r} root={d.root} onRenew={() => setRenew(r)} onSaved={load} />)}
      {renew && <RenewModal r={renew} plans={d.plans} balance={d.balance} root={d.root} onClose={() => setRenew(null)} onDone={() => { setRenew(null); load(); }} />}
    </div>
  );
}

function RenewModal({ r, plans, balance, onClose, onDone }) {
  const t = useT();
  const [pid, setPid] = useState(plans[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const plan = plans.find((p) => p.id === Number(pid));
  if (!plan) return <Modal onClose={onClose}><div className="empty">—</div></Modal>;
  async function go() { setBusy(true); setErr(''); try { await api('/api/rent', 'POST', { planId: plan.id, rentalId: r.id }); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <Modal onClose={onClose}>
      <h3>{t('ต่ออายุ')} · {r.sub}</h3>
      {plans.length > 1 && <select className="input" style={{ marginTop: 14 }} value={pid} onChange={(e) => setPid(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {baht(p.price)} ฿ / {p.days} {t('วัน')}</option>)}</select>}
      <div className="cf-rows" style={{ marginTop: 14 }}>
        <div><span>{t('หมดอายุเมื่อ')}</span><b>{fmtDate(r.expires_at)}</b></div>
        <div className="cf-total"><span>{t('ราคา')}</span><b>{baht(plan.price)} ฿</b></div>
        <div><span>{t('ยอดเงินคงเหลือ')}</span><b>{baht(balance)} ฿</b></div>
      </div>
      {err && <div className="msg err">{err}</div>}
      {balance < plan.price
        ? <Link href="/account?tab=topup" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>{t('ยอดเงินไม่พอ — เติมเงินก่อน')}</Link>
        : <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy} onClick={go}>{busy ? <span className="spin" /> : t('ยืนยันสั่งซื้อ')}</button>}
    </Modal>
  );
}

function RentalCard({ r, root, onRenew, onSaved }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState({ title: '', tagline: '', about: '', logo: '', color: '#ffffff', theme: 'dark', links: [], items: [], ...r.site });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const tag = TAG[r.status] || TAG.active;
  const up = (k, v) => setS((o) => ({ ...o, [k]: v }));
  const upList = (k, i, f, v) => setS((o) => ({ ...o, [k]: o[k].map((x, n) => (n === i ? { ...x, [f]: v } : x)) }));
  async function save(e) {
    e.preventDefault(); setMsg(null); setBusy(true);
    try { await api('/api/rent', 'PUT', { rentalId: r.id, site: s }); setMsg({ t: 'ok', m: t('บันทึกแล้ว') }); onSaved(); }
    catch (x) { setMsg({ t: 'err', m: x.message }); } finally { setBusy(false); }
  }
  return (
    <div className="rent-card rv in">
      <header>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{r.sub}.{root}</div>
          <div className="subtle" style={{ fontSize: 13, marginTop: 2 }}>{r.plan_name} · {t('หมดอายุเมื่อ')} {fmtDate(r.expires_at)}</div>
        </div>
        <span className={'tag ' + tag[0]}>{t(tag[1])}</span>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <a className="btn btn-sm" href={r.url} target="_blank" rel="noopener noreferrer">{t('เปิดเว็บ')} <Icon n="ext" size={13} /></a>
        <button className="btn btn-sm btn-primary" onClick={onRenew}>{t('ต่ออายุ')}</button>
        <button className="btn btn-sm" onClick={() => setOpen(!open)}>{open ? t('ซ่อน') : t('แก้ไขเว็บ')}</button>
      </div>
      {open && (
        <form onSubmit={save} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          <div className="row2">
            <div><label className="label" style={{ marginTop: 0 }}>{t('ชื่อเว็บ')}</label><input className="input" maxLength={40} value={s.title} onChange={(e) => up('title', e.target.value)} /></div>
            <div><label className="label" style={{ marginTop: 0 }}>{t('คำโปรย')}</label><input className="input" maxLength={120} value={s.tagline} onChange={(e) => up('tagline', e.target.value)} /></div>
          </div>
          <div><label className="label" style={{ marginTop: 0 }}>{t('เกี่ยวกับ')}</label><textarea className="input" rows={3} maxLength={600} value={s.about} onChange={(e) => up('about', e.target.value)} /></div>
          <div className="row2">
            <div><label className="label" style={{ marginTop: 0 }}>{t('ลิงก์โลโก้ (https://...)')}</label><input className="input" value={s.logo} onChange={(e) => up('logo', e.target.value)} placeholder="https://..." /></div>
            <div><label className="label" style={{ marginTop: 0 }}>{t('สีหลัก')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" className="plain" value={s.color} onChange={(e) => up('color', e.target.value)} style={{ width: 46, height: 42, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'none', padding: 2 }} />
                <input className="input" value={s.color} onChange={(e) => up('color', e.target.value)} maxLength={7} />
              </div></div>
            <div><label className="label" style={{ marginTop: 0 }}>{t('ธีมหน้าเว็บ')}</label>
              <select className="input" value={s.theme} onChange={(e) => up('theme', e.target.value)}><option value="dark">{t('มืด')}</option><option value="light">{t('สว่าง')}</option></select></div>
          </div>
          <div className="chips-in">
            <b style={{ fontSize: 14 }}>{t('ลิงก์ติดต่อ')}</b>
            {s.links.map((l, i) => (
              <div className="mini-row" key={i}>
                <input className="input" placeholder={t('ชื่อปุ่ม')} maxLength={30} value={l.label} onChange={(e) => upList('links', i, 'label', e.target.value)} />
                <input className="input" placeholder="https://..." value={l.url} onChange={(e) => upList('links', i, 'url', e.target.value)} />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => up('links', s.links.filter((_, n) => n !== i))}>{t('ลบ')}</button>
              </div>
            ))}
            {s.links.length < 6 && <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => up('links', [...s.links, { label: '', url: '' }])}>+ {t('เพิ่มลิงก์')}</button>}
          </div>
          <div className="chips-in">
            <b style={{ fontSize: 14 }}>{t('รายการสินค้า / บริการ')}</b>
            {s.items.map((it, i) => (
              <div key={i} className="panel" style={{ padding: 14, display: 'grid', gap: 8 }}>
                <div className="mini-row">
                  <input className="input" placeholder={t('ชื่อ')} maxLength={60} value={it.name} onChange={(e) => upList('items', i, 'name', e.target.value)} />
                  <input className="input" placeholder={t('ราคา (ข้อความ)')} maxLength={24} value={it.price} onChange={(e) => upList('items', i, 'price', e.target.value)} />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => up('items', s.items.filter((_, n) => n !== i))}>{t('ลบ')}</button>
                </div>
                <input className="input" placeholder={t('รายละเอียด')} maxLength={200} value={it.desc} onChange={(e) => upList('items', i, 'desc', e.target.value)} />
                <input className="input" placeholder="https://… (image)" value={it.image || ''} onChange={(e) => upList('items', i, 'image', e.target.value)} />
              </div>
            ))}
            {s.items.length < 24 && <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => up('items', [...s.items, { name: '', price: '', desc: '', image: '' }])}>+ {t('เพิ่มรายการ')}</button>}
          </div>
          {msg && <div className={'msg ' + msg.t}>{msg.m}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spin" /> : t('บันทึก')}</button>
        </form>
      )}
    </div>
  );
}
