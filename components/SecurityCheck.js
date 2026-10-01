'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------- หน้า "กำลังทำการตรวจสอบความปลอดภัย" (เข้าเว็บครั้งแรก) + หน้าต่างตรวจสอบตอนปลดล็อกรับคีย์
export const SC_KEY = 'fx_sc', SC_TTL = 12 * 3600e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAU = Math.PI * 2;

const TXT = {
  th: {
    title: 'กำลังทำการตรวจสอบความปลอดภัย',
    desc: 'เว็บไซต์นี้ใช้บริการรักษาความปลอดภัยเพื่อป้องกันบอตที่เป็นอันตราย หน้านี้จะปรากฏขึ้นในขณะที่เว็บไซต์ตรวจสอบว่าคุณไม่ใช่บอต',
    verifying: 'กำลังตรวจสอบ…', human: 'กรุณายืนยันว่าคุณเป็นมนุษย์', ok: 'ยืนยันสำเร็จ กำลังพาเข้าเว็บไซต์…', fail: 'เชื่อมต่อไม่ได้ กรุณาลองใหม่', retry: 'ลองอีกครั้ง', badCaptcha: 'ยืนยันไม่ผ่าน ลองใหม่อีกครั้ง',
    id: 'รหัสตรวจสอบ', by: 'ปกป้องโดย',
    c: { title: 'กำลังตรวจสอบความปลอดภัย…', done: 'ปลดล็อกสำเร็จ!', doneSub: 'กำลังนำคีย์ของคุณออกมา', s: ['ตรวจสอบเบราว์เซอร์', 'ตรวจสอบความปลอดภัยของคำขอ', 'ยืนยันสิทธิ์การรับคีย์'], note: 'ขั้นตอนสุดท้าย — อย่าปิดหน้านี้' },
  },
  en: {
    title: 'Performing security verification',
    desc: 'This website uses a security service to protect against malicious bots. This page is displayed while the website verifies you are not a bot.',
    verifying: 'Verifying…', human: 'Please confirm you are human', ok: 'Verified — taking you to the site…', fail: 'Connection failed, please retry', retry: 'Retry', badCaptcha: 'Verification failed, try again',
    id: 'Verification ID', by: 'Protected by',
    c: { title: 'Running security verification…', done: 'Unlocked!', doneSub: 'Revealing your key', s: ['Checking your browser', 'Verifying request integrity', 'Confirming key eligibility'], note: 'Final step — keep this page open' },
  },
};
const getLang = () => { try { return localStorage.getItem('fx_lang') === 'en' ? 'en' : 'th'; } catch { return 'th'; } };
const fresh = () => { try { const t = +localStorage.getItem(SC_KEY); return !!t && Date.now() - t < SC_TTL; } catch { return false; } };
const mark = () => { try { localStorage.setItem(SC_KEY, String(Date.now())); } catch {} };
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

// ตรวจเบราว์เซอร์เบื้องต้น: ทำงานคำนวณสั้นๆ ให้เบราว์เซอร์จริงผ่านได้ (ตัวป้องกันจริงอยู่ฝั่งเซิร์ฟเวอร์: PoW / Turnstile / rate limit)
async function browserWork() {
  try { if (typeof crypto !== 'undefined' && crypto.subtle) { const e = new TextEncoder(); for (let i = 0; i < 400; i++) await crypto.subtle.digest('SHA-256', e.encode('fx' + i)); } } catch {}
}

export function Shield({ size = 56 }) {
  return (
    <svg className="sg-shield" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 4 7 10v12c0 11 7.4 19.2 17 22 9.6-2.8 17-11 17-22V10L24 4Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path className="sg-tick" d="m16 24 6 6 11-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- หน้าเต็มจอ: ตอนเข้าเว็บครั้งแรก
export function SecurityScreen({ api, name, onDone }) {
  const [lang] = useState(getLang), t = TXT[lang];
  const [phase, setPhase] = useState('run'); // run | challenge | ok | fail
  const [leave, setLeave] = useState(false), [host, setHost] = useState(''), [id, setId] = useState(''), [err, setErr] = useState(''), [sitekey, setSitekey] = useState(''), [n, setN] = useState(0);
  const box = useRef(null), wid = useRef(null);

  useEffect(() => { setHost(location.hostname); setId(rid()); }, []);

  const finish = async quick => { mark(); setPhase('ok'); await sleep(quick ? 0 : 800); setLeave(true); await sleep(quick ? 0 : 350); onDone(); };

  useEffect(() => {
    let dead = false; const quick = fresh();
    (async () => {
      setPhase('run'); const t0 = Date.now();
      const [j] = await Promise.all([api('human'), browserWork()]);
      const w = (quick ? 250 : 2800) - (Date.now() - t0); if (w > 0) await sleep(w);
      if (dead) return;
      if (j.error) { document.documentElement.classList.remove('sc-ok'); return setPhase('fail'); }
      if (j.ok) return finish(quick);
      document.documentElement.classList.remove('sc-ok'); setSitekey(j.sitekey); setPhase('challenge');
    })();
    return () => { dead = true; };
  }, [n]); // eslint-disable-line

  // Turnstile (เมื่อเปิดใช้งานที่เซิร์ฟเวอร์)
  useEffect(() => {
    if (phase !== 'challenge' || !sitekey || !box.current) return;
    const mount = () => {
      if (!window.turnstile || !box.current) return; box.current.innerHTML = '';
      wid.current = window.turnstile.render(box.current, { sitekey, theme: 'dark', callback: async tk => {
        const j = await api('human', { token: tk });
        if (j.ok) finish(false); else { setErr(t.badCaptcha); try { window.turnstile.reset(wid.current); } catch {} }
      } });
    };
    if (window.turnstile) mount(); else { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s); }
  }, [phase, sitekey]); // eslint-disable-line

  return (
    <div className={'sg' + (leave ? ' leave' : '')} data-phase={phase}>
      <noscript><style>{'.sg{display:none!important}'}</style></noscript>
      <div className="sg-bg" aria-hidden="true"><i /><i /><i /><b /></div>
      <main className="sg-wrap" role="status" aria-live="polite">
        <div className="sg-host">{host || '\u00a0'}</div>
        <h1 className="sg-h">{t.title}</h1>
        <p className="sg-p">{t.desc}</p>

        <div className="sg-box">
          {phase === 'run' && <div className="sg-row"><span className="sg-spin" /><span className="sg-lab">{t.verifying}</span><Shield size={26} /></div>}
          {phase === 'challenge' && <div className="sg-ch"><div className="sg-lab">{t.human}</div><div ref={box} className="sg-ts" />{err && <div className="sg-err">{err}</div>}</div>}
          {phase === 'ok' && <div className="sg-row ok"><span className="sg-okc"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="sg-tick" d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><span className="sg-lab">{t.ok}</span></div>}
          {phase === 'fail' && <div className="sg-row"><span className="sg-lab bad">{t.fail}</span><button className="sg-retry" onClick={() => setN(x => x + 1)}>{t.retry}</button></div>}
          <div className="sg-bar" aria-hidden="true"><i /></div>
        </div>

        <div className="sg-foot"><span>{t.by} <b>{name}</b></span><span className="mono">{t.id}: {id || '…'}</span></div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- เอฟเฟกต์ระเบิดคอนเฟตตี
export function Burst({ n = 48 }) {
  const items = useMemo(() => {
    const C = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#ffffff'];
    return Array.from({ length: n }, () => { const a = Math.random() * TAU, d = 90 + Math.random() * 230; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 60, r: Math.random() * 900 - 450, c: C[(Math.random() * C.length) | 0], w: 5 + Math.random() * 7, dl: Math.random() * .18 }; });
  }, [n]);
  return <div className="burst" aria-hidden="true">{items.map((p, i) => <i key={i} style={{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--r': p.r + 'deg', width: p.w, height: p.w * .55, background: p.c, animationDelay: p.dl + 's' }} />)}</div>;
}

function LockIcon({ open }) {
  return (
    <svg className={'cg-lock' + (open ? ' open' : '')} viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <path className="cg-sh" d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
      <rect x="9" y="22" width="30" height="21" rx="5.5" fill="currentColor" />
      <circle cx="24" cy="31.5" r="3" fill="#000" /><rect x="22.8" y="31.5" width="2.4" height="6.5" rx="1.2" fill="#000" />
    </svg>
  );
}

// ---------------------------------------------------------------- หน้าต่างตรวจสอบ: ขั้นตอนสุดท้ายตอนกด "ปลดล็อกรับคีย์"
export function ClaimGate({ phase, lang = 'th' }) {
  const t = TXT[lang].c, ok = phase === 'ok';
  const [k, setK] = useState(0);
  useEffect(() => { if (ok) { setK(3); return; } setK(0); const i = setInterval(() => setK(x => Math.min(2, x + 1)), 850); return () => clearInterval(i); }, [ok]);
  return (
    <div className={'cg' + (ok ? ' ok' : '')} role="alertdialog" aria-live="assertive" aria-label={t.title}>
      <div className="cg-card">
        <div className="cg-ico"><span className="cg-halo" /><span className="cg-orbit"><i /><i /><i /></span><LockIcon open={ok} /></div>
        <h2>{ok ? t.done : t.title}</h2>
        <p className="cg-sub">{ok ? t.doneSub : t.note}</p>
        <ul className="cg-steps">
          {t.s.map((s, i) => <li key={i} className={k > i ? 'done' : k === i ? 'now' : ''}><span className="cg-dot">{k > i ? '✓' : k === i ? <i className="spin" /> : ''}</span>{s}</li>)}
        </ul>
        <div className="sg-bar" aria-hidden="true"><i style={ok ? { width: '100%', animation: 'none' } : undefined} /></div>
      </div>
      {ok && <Burst />}
    </div>
  );
}
