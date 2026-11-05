'use client';
import { useEffect, useState } from 'react';
import { Modal } from './Shell';
import { useT } from './Prefs';
import { readConsent, saveConsent } from './consent';

/* ---------- แบนเนอร์/ตั้งค่าคุกกี้ ---------- */
export function CookieBanner({ forceOpen, onClose }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(false);
  const [perf, setPerf] = useState(false);

  useEffect(() => { if (!readConsent()) setShow(true); }, []);
  useEffect(() => {
    if (forceOpen) { setPerf(!!readConsent()?.performance); setDetail(true); setShow(true); }
  }, [forceOpen]);

  function done(p) { saveConsent(p); setShow(false); setDetail(false); onClose?.(); }
  if (!show) return null;

  return (
    <div className="cookie" role="dialog" aria-label={t('การตั้งค่าคุกกี้')}>
      <div className="cookie-txt">
        <b>{t('เว็บไซต์นี้ใช้คุกกี้')}</b>
        <p>
          {t('เราใช้คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบและความปลอดภัย และมีคุกกี้เพื่อความเร็วเว็บไซต์ให้คุณเลือกได้')}
          {t('เราไม่มีคุกกี้โฆษณาและไม่ติดตามพฤติกรรมข้ามเว็บไซต์')} <a href="/privacy">{t('อ่านนโยบายความเป็นส่วนตัว')}</a>
        </p>
        {detail && (
          <div className="cookie-opts">
            <label className="cookie-opt">
              <span><b>{t('คุกกี้ที่จำเป็น')}</b><small>{t('เข้าสู่ระบบ ป้องกันคำขอปลอม และจำตัวเลือกคุกกี้ — ปิดไม่ได้')}</small></span>
              <input type="checkbox" checked disabled />
            </label>
            <label className="cookie-opt">
              <span><b>{t('ประสิทธิภาพ')}</b><small>{t('จำข้อมูลหน้าเว็บไว้ชั่วคราวในแท็บ ให้เปิดหน้าถัดไปเร็วขึ้น (หายเมื่อปิดแท็บ)')}</small></span>
              <input type="checkbox" checked={perf} onChange={(e) => setPerf(e.target.checked)} />
            </label>
          </div>
        )}
      </div>
      <div className="cookie-act">
        {detail ? (
          <button className="btn btn-primary" onClick={() => done(perf)}>{t(t('บันทึกการตั้งค่า'))}</button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => done(true)}>{t(t('ยอมรับทั้งหมด'))}</button>
            <button className="btn" onClick={() => done(false)}>{t(t('เฉพาะที่จำเป็น'))}</button>
            <button className="btn" onClick={() => { setPerf(false); setDetail(true); }}>{t(t('ตั้งค่า'))}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- ป๊อปอัปประกาศร้าน ---------- */
export function AnnouncementPopup({ enabled, items, version }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!enabled || !items.length) return;
    try { if (localStorage.getItem('dh_popup_seen') === String(version)) return; } catch {}
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [enabled, items.length, version]);

  function close() {
    setOpen(false);
    try { localStorage.setItem('dh_popup_seen', String(version)); } catch {}
  }
  if (!open) return null;
  const it = items[i];
  const last = i === items.length - 1;
  return (
    <Modal onClose={close} wide>
      {it.image && <img src={it.image} alt="" className="pop-img" />}
      <div className="eyebrow" style={{ marginBottom: 6 }}>{t('ประกาศจากร้าน')}{items.length > 1 ? ` · ${i + 1}/${items.length}` : ''}</div>
      <h3 style={{ paddingRight: 36 }}>{it.title}</h3>
      {it.body && <div className="desc" style={{ marginTop: 10 }}>{it.body}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {it.link && <a className="btn btn-primary" href={it.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>{it.button || t('ดูรายละเอียด')}</a>}
        {!last ? (
          <button className="btn" style={{ flex: 1 }} onClick={() => setI(i + 1)}>{t(t('ถัดไป'))}</button>
        ) : (
          <button className={'btn' + (it.link ? '' : ' btn-primary')} style={{ flex: 1 }} onClick={close}>{t(t('ปิด'))}</button>
        )}
      </div>
    </Modal>
  );
}

/* ---------- การ์ด Discord ท้ายเว็บ (ดึงจำนวนคนจากลิงก์เชิญ ไม่ต้องเปิด Server Widget) ---------- */
const inviteCode = (url) => {
  const m = String(url || '').match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return m ? m[1] : null;
};

export function DiscordWidget({ inviteUrl }) {
  const t = useT();
  const code = inviteCode(inviteUrl);
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!code) return;
    let off = false;
    fetch(`/api/discord?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!off && d && !d.error) setInfo(d); })
      .catch(() => {});
    return () => { off = true; };
  }, [code]);
  const n = (v) => (v == null ? '-' : Number(v).toLocaleString('en-US'));
  return (
    <div className="dcard">
      <div className="dcard-top">
        {info?.icon ? <img src={info.icon} alt="" width="48" height="48" className="dcard-ic" /> : <div className="dcard-ic" />}
        <div style={{ minWidth: 0 }}>
          <div className="dcard-name">{info?.name || 'Discord'}</div>
          <div className="dcard-stat">
            <span><i className="dot on" />{n(info?.online)} {t('ออนไลน์')}</span>
            <span><i className="dot" />{n(info?.members)} {t('คน')}</span>
          </div>
        </div>
      </div>
      <a className="btn btn-primary" style={{ width: '100%' }} href={inviteUrl} target="_blank" rel="noopener noreferrer">{t(t('เข้าร่วม Discord'))}</a>
    </div>
  );
}
