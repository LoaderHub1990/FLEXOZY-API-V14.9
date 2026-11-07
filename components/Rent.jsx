'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, baht, fmtDate } from './api';
import { Modal, useShell } from './Shell';
import { useT } from './Prefs';
import Icon from './Icons';
import { EXAMPLE_SUB, TEMPLATES, getTemplate } from '@/lib/templates';

const clean = (v) => v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
const PERKS = [['store', 'ร้านค้าเต็มระบบ สมาชิก/เติมเงิน/ส่งสินค้าอัตโนมัติ'], ['dash', 'หลังบ้านจัดการสินค้า สต็อก ออเดอร์ โค้ดส่วนลด'], ['layers', 'ดีไซน์ 6 แบบ ปรับสีและธีมได้เอง'], ['ext', 'ลิงก์ชื่อที่คุณตั้งเอง เปิดใช้งานทันที']];

/* ตัวอย่างเว็บจริง (ย่อส่วน) ใต้แพ็กเกจ — คลิกเพื่อเปิดดูเต็มหน้า */
function Shot({ slug }) {
  const box = useRef(null), fr = useRef(null);
  useEffect(() => {
    const el = box.current; if (!el || !fr.current) return;
    const fit = () => { fr.current.style.transform = `scale(${el.clientWidth / 1280})`; };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  return <div className="shw-f" ref={box}><iframe ref={fr} src={`/${slug}?embed=1`} loading="lazy" tabIndex={-1} title={slug} aria-hidden="true" /></div>;
}
/* ======================= หน้าเลือกแพ็กเกจ ======================= */
export function TemplatePicker({ value, onChange, compact }) {
  const t = useT();
  return (
    <div className={'tpl-grid' + (compact ? ' compact' : '')}>
      {TEMPLATES.map((x) => (
        <div key={x.slug} className={'tpl' + (value === x.slug ? ' on' : '')} onClick={() => onChange(x.slug)} role="radio" aria-checked={value === x.slug} tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(x.slug); } }}>
          {compact
            ? <div className="tpl-dots" style={{ background: x.swatch[0] }}><i style={{ background: x.swatch[1] }} /><i style={{ background: x.swatch[2] }} /><u aria-hidden="true"><Icon n="check" size={13} /></u></div>
            : <div className="tpl-pv"><Shot slug={x.slug} />{x.tag && <em>{t(x.tag)}</em>}<u aria-hidden="true"><Icon n="check" size={14} /></u></div>}
          <div className="tpl-b">
            <b>{x.name}</b>
            {!compact && <p>{t(x.desc)}</p>}
            <a href={'/' + x.slug} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{t('ดูตัวอย่าง')} <Icon n="ext" size={12} /></a>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RentPlans({ plans, root, balance, loggedIn, initialTpl }) {
  const t = useT();
  const { openAuth } = useShell();
  const [sel, setSel] = useState(null);
  const [tpl, setTpl] = useState(TEMPLATES.some((x) => x.slug === initialTpl) ? initialTpl : TEMPLATES[0].slug);
  const cur = getTemplate(tpl);
  const best = plans.length ? plans.reduce((a, b) => (b.price / b.days < a.price / a.days ? b : a)) : null;
  return (
    <>
      <div className="plans">
        {plans.map((p, i) => (
          <div key={p.id} className={'plan rv in' + (best && p.id === best.id && plans.length > 1 ? ' pop' : i === 0 && plans.length === 1 ? ' pop' : '')} style={{ '--i': i }}>
            {(best && p.id === best.id) && <span className="pill">{plans.length > 1 ? t('คุ้มที่สุด') : t('เริ่มต้น')}</span>}
            <h3>{p.name}</h3>
            <div className="pr">{baht(p.price)}<small>฿ / {p.days} {t('วัน')}</small></div>
            <div className="plan-per">≈ {(p.price / 100 / p.days).toFixed(2)} ฿ / {t('วัน')}</div>
            {p.description && <p className="muted" style={{ fontSize: 14 }}>{p.description}</p>}
            <ul>{PERKS.map(([ic, x]) => <li key={x}><span><Icon n={ic} size={14} /></span>{t(x)}</li>)}</ul>
            <button className="btn btn-primary" onClick={() => (loggedIn ? setSel(p) : openAuth('login'))}>{t('สั่งซื้อ')} <Icon n="arrow" size={15} /></button>
          </div>
        ))}
        {plans.length === 0 && <div className="empty">—</div>}
      </div>

      <div className="rent-gal">
        <div className="rent-gal-h">
          <div><h2 className="sec-h">{t('เลือกแบบหน้าร้าน')}</h2><p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{t('ทุกแบบคือร้านจริงเต็มระบบ ลองสมัคร เติมเงิน ซื้อของได้ที่หน้าตัวอย่าง')}</p></div>
          <div className="rent-picked">{t('แบบที่เลือก')}: <b>{cur.name}</b></div>
        </div>
        <TemplatePicker value={tpl} onChange={setTpl} />
      </div>
      {sel && <OrderModal plan={sel} root={root} balance={balance} tpl={tpl} setTpl={setTpl} onClose={() => setSel(null)} />}
    </>
  );
}

function OrderModal({ plan, root, balance, tpl, setTpl, onClose }) {
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
    try { const r = await api('/api/rent', 'POST', { planId: plan.id, sub: name, template: tpl }); setDone(r.rental); router.refresh(); }
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
        <input autoFocus value={name} onChange={(e) => setName(clean(e.target.value))} placeholder={EXAMPLE_SUB} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={32} aria-label={t('ชื่อเว็บที่ต้องการ')} />
        <span>.{root}</span>
      </div>
      <div className={'sub-hint ' + hint[0]}>{hint[1] || <span className="subtle">{t('a-z 0-9 และ - ยาว 3-32 ตัว')}</span>}</div>
      <label className="label">{t('แบบหน้าเว็บ')}</label>
      <TemplatePicker value={tpl} onChange={setTpl} compact />
      <div className="cf-rows" style={{ marginTop: 14 }}>
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
      {d.rentals.map((r) => <RentalCard key={r.id} r={r} root={d.root} onRenew={() => setRenew(r)} />)}
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

function RentalCard({ r, root, onRenew }) {
  const t = useT();
  const tag = TAG[r.status] || TAG.active;
  const left = Math.ceil((new Date(r.expires_at) - Date.now()) / 86400000);
  return (
    <div className="rent-card rv in">
      <header>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{r.sub}.{root}</div>
          <div className="subtle" style={{ fontSize: 13, marginTop: 2 }}>{r.plan_name} · {t('หมดอายุเมื่อ')} {fmtDate(r.expires_at)}{r.status === 'active' && left <= 7 && left > 0 ? ` · ${t('เหลือ')} ${left} ${t('วัน')}` : ''}</div>
        </div>
        <span className={'tag ' + tag[0]}>{t(tag[1])}</span>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <Link className="btn btn-sm btn-primary" href={`/rent/my/${r.id}`}>🛍 {t('จัดการร้าน')}</Link>
        <a className="btn btn-sm" href={r.url} target="_blank" rel="noopener noreferrer">{t('เปิดเว็บ')} <Icon n="ext" size={13} /></a>
        <button className="btn btn-sm" onClick={onRenew}>{t('ต่ออายุ')}</button>
      </div>
    </div>
  );
}
