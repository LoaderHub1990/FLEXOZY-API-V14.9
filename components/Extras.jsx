'use client';
import { useEffect, useState } from 'react';
import { Modal } from './Shell';
import { readConsent, saveConsent } from './consent';

/* ---------- แบนเนอร์/ตั้งค่าคุกกี้ ---------- */
export function CookieBanner({ forceOpen, onClose }) {
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
    <div className="cookie" role="dialog" aria-label="การตั้งค่าคุกกี้">
      <div className="cookie-txt">
        <b>เว็บไซต์นี้ใช้คุกกี้</b>
        <p>
          เราใช้คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบและความปลอดภัย และมีคุกกี้เพื่อความเร็วเว็บไซต์ให้คุณเลือกได้
          เราไม่มีคุกกี้โฆษณาและไม่ติดตามพฤติกรรมข้ามเว็บไซต์ <a href="/privacy">อ่านนโยบายความเป็นส่วนตัว</a>
        </p>
        {detail && (
          <div className="cookie-opts">
            <label className="cookie-opt">
              <span><b>คุกกี้ที่จำเป็น</b><small>เข้าสู่ระบบ ป้องกันคำขอปลอม และจำตัวเลือกคุกกี้ — ปิดไม่ได้</small></span>
              <input type="checkbox" checked disabled />
            </label>
            <label className="cookie-opt">
              <span><b>ประสิทธิภาพ</b><small>จำข้อมูลหน้าเว็บไว้ชั่วคราวในแท็บ ให้เปิดหน้าถัดไปเร็วขึ้น (หายเมื่อปิดแท็บ)</small></span>
              <input type="checkbox" checked={perf} onChange={(e) => setPerf(e.target.checked)} />
            </label>
          </div>
        )}
      </div>
      <div className="cookie-act">
        {detail ? (
          <button className="btn btn-primary" onClick={() => done(perf)}>บันทึกการตั้งค่า</button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => done(true)}>ยอมรับทั้งหมด</button>
            <button className="btn" onClick={() => done(false)}>เฉพาะที่จำเป็น</button>
            <button className="btn" onClick={() => { setPerf(false); setDetail(true); }}>ตั้งค่า</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- ป๊อปอัปประกาศร้าน ---------- */
export function AnnouncementPopup({ enabled, items, version }) {
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
      <div className="eyebrow" style={{ marginBottom: 6 }}>ประกาศจากร้าน{items.length > 1 ? ` · ${i + 1}/${items.length}` : ''}</div>
      <h3 style={{ paddingRight: 36 }}>{it.title}</h3>
      {it.body && <div className="desc" style={{ marginTop: 10 }}>{it.body}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {it.link && <a className="btn btn-primary" href={it.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>{it.button || 'ดูรายละเอียด'}</a>}
        {!last ? (
          <button className="btn" style={{ flex: 1 }} onClick={() => setI(i + 1)}>ถัดไป</button>
        ) : (
          <button className={'btn' + (it.link ? '' : ' btn-primary')} style={{ flex: 1 }} onClick={close}>ปิด</button>
        )}
      </div>
    </Modal>
  );
}

/* ---------- วิดเจ็ต Discord ท้ายเว็บ (350x320 เหมือนต้นฉบับ) ---------- */
export function DiscordWidget({ serverId }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="dwidget">
      {mounted && (
        <iframe
          title="Discord"
          src={`https://discord.com/widget?id=${encodeURIComponent(serverId)}&theme=dark`}
          width="350"
          height="320"
          loading="lazy"
          allowtransparency="true"
          frameBorder="0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
}
