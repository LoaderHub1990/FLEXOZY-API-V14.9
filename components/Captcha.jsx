'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const enc = new TextEncoder();

/** หา nonce ที่ทำให้ sha256(`${id}:${nonce}`) ขึ้นต้นด้วยเลข 0 จำนวน d หลัก (hex) */
async function solve(id, d) {
  const zb = Math.floor(d / 2);
  const odd = d % 2 === 1;
  const BATCH = 512;
  for (let base = 0; base < 4_000_000; base += BATCH) {
    const hs = await Promise.all(
      Array.from({ length: BATCH }, (_, i) => crypto.subtle.digest('SHA-256', enc.encode(`${id}:${base + i}`)))
    );
    for (let i = 0; i < hs.length; i++) {
      const b = new Uint8Array(hs[i]);
      let ok = true;
      for (let k = 0; k < zb; k++) if (b[k] !== 0) { ok = false; break; }
      if (ok && odd && b[zb] >= 16) ok = false;
      if (ok) return String(base + i);
    }
  }
  throw new Error('หมดเวลา');
}

let tsLoading = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!tsLoading) {
    tsLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => res(window.turnstile);
      s.onerror = () => { tsLoading = null; rej(new Error('โหลดระบบตรวจสอบไม่สำเร็จ')); };
      document.head.appendChild(s);
    });
  }
  return tsLoading;
}

/**
 * กล่องตรวจสอบความปลอดภัย — ส่งโทเคนให้ผู้เรียกผ่าน onToken (ค่าว่าง = ยังไม่ผ่าน)
 * เปลี่ยนค่า rerun เพื่อให้ตรวจใหม่ (เช่นหลังใช้โทเคนไปแล้ว)
 */
export default function Captcha({ onToken, rerun = 0 }) {
  const [st, setSt] = useState('working'); // working | ok | error
  const [err, setErr] = useState('');
  const [mode, setMode] = useState(null);
  const [siteKey, setSiteKey] = useState('');
  const [again, setAgain] = useState(0);
  const box = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    const alive = { v: true };
    (async () => {
      setSt('working'); setErr(''); cb.current('');
      try {
        const c = await api('/api/captcha/challenge');
        if (!alive.v) return;
        if (c.mode === 'turnstile') { setMode('turnstile'); setSiteKey(c.siteKey); return; }
        setMode('pow');
        const t0 = Date.now();
        const nonce = await solve(c.id, c.d);
        await sleep(Math.max(0, 1200 - (Date.now() - t0))); // ให้เห็นขั้นตอนตรวจสอบสักครู่
        const r = await api('/api/captcha/verify', 'POST', { id: c.id, ts: c.ts, d: c.d, sig: c.sig, nonce });
        if (!alive.v) return;
        cb.current(r.token); setSt('ok');
      } catch (e) {
        if (alive.v) { setSt('error'); setErr(e?.message || 'ตรวจสอบไม่สำเร็จ'); }
      }
    })();
    return () => { alive.v = false; };
  }, [rerun, again]);

  // โหมด Cloudflare Turnstile
  useEffect(() => {
    if (mode !== 'turnstile' || !siteKey || !box.current) return;
    let id = null, dead = false;
    loadTurnstile().then((t) => {
      if (dead || !box.current) return;
      id = t.render(box.current, {
        sitekey: siteKey, theme: 'dark', language: 'th',
        callback: async (resp) => {
          try {
            const r = await api('/api/captcha/verify', 'POST', { turnstile: resp });
            if (!dead) { cb.current(r.token); setSt('ok'); }
          } catch (e) { if (!dead) { setSt('error'); setErr(e.message); } }
        },
        'error-callback': () => { if (!dead) { setSt('error'); setErr('ตรวจสอบไม่สำเร็จ'); } },
        'expired-callback': () => { cb.current(''); setSt('working'); },
      });
    }).catch((e) => { if (!dead) { setSt('error'); setErr(e?.message || 'โหลดระบบตรวจสอบไม่สำเร็จ'); } });
    return () => { dead = true; try { if (id != null) window.turnstile?.remove(id); } catch {} };
  }, [mode, siteKey, rerun, again]);

  if (st === 'ok' && mode === 'pow') {
    return <div className="cap cap-ok cap-mini" role="status"><span className="cap-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>ตรวจสอบความปลอดภัยแล้ว — กรอกข้อมูลได้เลย</div>;
  }
  return (
    <div className={'cap cap-' + st} role="status" aria-live="polite">
      <div className="cap-title">{st === 'error' ? 'ตรวจสอบความปลอดภัยไม่สำเร็จ' : 'กำลังทำการตรวจสอบความปลอดภัย'}</div>
      <div className="cap-sub">{st === 'error' ? err : 'ระบบกำลังตรวจสอบว่าคุณไม่ใช่บอท โปรดรอสักครู่ แล้วจึงจะกรอกข้อมูลได้'}</div>
      {mode === 'turnstile' ? <div ref={box} className="cap-ts" /> : (
        <div className="cap-widget">
          <span className="cap-spin" aria-hidden="true">{st === 'error' ? '!' : ''}</span>
          <span className="cap-label">{st === 'error' ? 'ไม่สำเร็จ' : 'กำลังตรวจสอบ...'}</span>
          <span className="cap-brand">FLEXOZY SHIELD</span>
        </div>
      )}
      {st === 'error' && <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setAgain((n) => n + 1)}>ลองใหม่</button>}
    </div>
  );
}
