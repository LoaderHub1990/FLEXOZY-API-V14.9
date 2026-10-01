'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import GkView, { T } from '@/components/GkView';
import { useApp } from '@/components/AppProvider';
import { solvePow } from '@/components/pow';
import { ClaimGate } from '@/components/SecurityCheck';
import { DEFAULT_THEME } from '@/lib/theme';

export default function GetKey({ params }) {
  const { slug } = use(params);
  const { api, copy, toast } = useApp();
  const [d, setD] = useState(null), [nf, setNf] = useState(false), [lang, setLang] = useState('th');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [left, setLeft] = useState(0), [powOk, setPowOk] = useState(true), [invite, setInvite] = useState(''), [vf, setVf] = useState(''), [fresh, setFresh] = useState(false);
  const tsRef = useRef(null), tsTok = useRef(''), tsId = useRef(null), pow = useRef(null), hit = useRef(false);
  const t = T[lang];

  useEffect(() => { try { const l = localStorage.getItem('fx_lang'); if (l === 'en' || l === 'th') setLang(l); } catch {} }, []);
  const load = useCallback(async () => {
    const first = !hit.current; hit.current = true;
    const j = await api('page/' + slug + (first ? '?hit=1' : ''));
    if (j._s === 404) return setNf(true);
    if (j.error) return setErr(T.th.e[j.error] || T.th.e.server);
    setD(j); setLeft(j.left || 0);
  }, [api, slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (left <= 0) return; const i = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000); return () => clearInterval(i); }, [left > 0]); // eslint-disable-line

  // แก้ Proof-of-Work ในพื้นหลังระหว่างรอ
  useEffect(() => {
    pow.current = null;
    if (!d?.pow) { setPowOk(true); return; }
    let live = true; setPowOk(false);
    solvePow(d.pow, () => live).then(r => { if (live && r) { pow.current = r; setPowOk(true); } });
    return () => { live = false; };
  }, [d?.pow?.t]); // eslint-disable-line

  // Turnstile ขั้นที่ 3
  useEffect(() => {
    if (!d || d.step !== 2 || !d.sitekey || !tsRef.current) return;
    tsTok.current = '';
    const mount = () => { if (!window.turnstile || !tsRef.current) return; tsRef.current.innerHTML = ''; tsId.current = window.turnstile.render(tsRef.current, { sitekey: d.sitekey, theme: 'dark', callback: x => { tsTok.current = x; } }); };
    if (window.turnstile) mount(); else { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s); }
  }, [d?.step, d?.sitekey]); // eslint-disable-line

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function go() {
    if (busy || !d) return;
    setErr(''); setBusy(true);
    const claim = d.step === 3;
    if (!claim && d.step === 2 && d.sitekey && !tsTok.current) { setBusy(false); return setErr(t.e.captcha); }
    if (claim) setVf('run'); // ขั้นตอนสุดท้าย: หน้าต่างตรวจสอบความปลอดภัยก่อนปลดล็อกคีย์
    const t0 = Date.now();
    const j = await api('gate/' + slug, { act: claim ? 'claim' : 'go', pow: pow.current, token: tsTok.current });
    if (j.url) { try { window.open(j.url, '_blank', 'noopener'); } catch {} }
    if (claim) { const w = 2700 - (Date.now() - t0); if (w > 0) await sleep(w); }
    if (j.error) {
      if (claim) setVf('');
      setErr(t.e[j.error] || t.e.server); if (j.invite) setInvite(j.invite);
      if (d.step === 2 && window.turnstile && tsId.current != null) { try { window.turnstile.reset(tsId.current); } catch {} tsTok.current = ''; }
      await load(); setBusy(false); return;
    }
    if (claim) { setVf('ok'); await sleep(1500); }
    await load();
    if (claim) { setFresh(true); setVf(''); }
    setBusy(false);
  }
  async function logout() { await api('auth/logout', {}); location.reload(); }

  if (nf) return <main className="wrap narrow center"><h2>ไม่พบหน้านี้</h2><p className="dim">ตรวจลิงก์ให้ถูกต้อง</p></main>;
  if (!d) return <main className="gk-load"><i className="spin" /></main>;
  const ui = {
    t, lang, onLang: () => { const n = lang === 'th' ? 'en' : 'th'; setLang(n); try { localStorage.setItem('fx_lang', n); } catch {} },
    step: d.step, left, busy, powOk, err, invite: invite || d.site?.discord, key: d.key, user: d.user, sitekey: d.sitekey, tsRef,
    loginHref: '/api/auth/discord?next=' + encodeURIComponent('/getkey/' + slug), onGo: go, onLogout: logout,
    onCopy: () => copy(d.key.key, t.copied), fresh,
  };
  return (
    <>
      <GkView d={{ ...d, theme: { ...DEFAULT_THEME, ...d.theme } }} ui={ui} />
      {vf && <ClaimGate phase={vf} lang={lang} />}
    </>
  );
}
