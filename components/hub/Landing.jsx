'use client';
import { useEffect, useState } from 'react';
import Captcha from '@/components/Captcha';
import { Mark } from './Logo';

const SLUG_OK = /^[a-z0-9][a-z0-9-]{2,23}$/;

export default function Landing() {
  const [intro, setIntro] = useState('play'); // play | out | done
  const [slug, setSlug] = useState('');
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('auth_error');
    if (p) { setErr(p); history.replaceState(null, '', location.pathname); }
    const seen = sessionStorage.getItem('hb-intro');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduce || p) { setIntro('done'); return; }
    sessionStorage.setItem('hb-intro', '1');
    const t1 = setTimeout(() => setIntro('out'), 3600);
    const t2 = setTimeout(() => setIntro('done'), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const valid = SLUG_OK.test(slug);
  const go = () => {
    if (!valid || !token || busy) return;
    setBusy(true);
    try { localStorage.setItem('hb-slug', slug); } catch {}
    location.href = `/api/auth/discord?cap=${encodeURIComponent(token)}`;
  };
  const shown = slug || 'yourname';

  return (
    <div className={'hb hb-land' + (intro === 'done' ? ' ready' : '')}>
      {intro !== 'done' && (
        <div className={'hb-intro' + (intro === 'out' ? ' out' : '')} onClick={() => setIntro('out')} role="presentation">
          <div className="hb-beams">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
          <div className="hb-intro-logo">
            <Mark size={120} draw />
            <div className="hb-word" aria-label="Flexozy Shop">
              {'Flexozy'.split('').map((c, i) => <span key={i} style={{ '--i': i }}>{c}</span>)}
              <em>shop</em>
            </div>
          </div>
          <div className="hb-skip">แตะเพื่อข้าม</div>
        </div>
      )}

      <div className="hb-spot" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>

      <header className="hb-nav">
        <a className="hb-brand" href="/"><Mark size={22} /><b>flexozy</b><span>.shop</span></a>
        <a className="hb-btn" href="#start">เริ่มต้นใช้งาน</a>
      </header>

      <main className="hb-hero" id="start">
        <div className="hb-hero-logo rv" style={{ '--d': 0 }}><Mark size={84} /><span>Flexozy<em>shop</em></span></div>
        <h1 className="rv" style={{ '--d': 1 }}>ร้านค้าบอท Discord ของคุณ<br /><span>พร้อมขายใน 1 นาที</span></h1>
        <p className="rv" style={{ '--d': 2 }}>ล็อกอินด้วย Discord เพิ่มสินค้า ใส่ไอดีเซิร์ฟเวอร์ แล้วบอทจะสร้างร้านให้ในห้องของคุณ — สต็อกและอีโมจิอัปเดตตามเว็บแบบเรียลไทม์</p>

        {err && <div className="hb-err rv" style={{ '--d': 2 }}>{err}</div>}

        <form className="hb-claim rv" style={{ '--d': 3 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
          <span className="hb-claim-pre">shop.flexozy.site/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24))}
            placeholder="yourname" autoComplete="off" spellCheck="false" aria-label="ชื่อร้านในลิงก์" maxLength={24}
          />
          <button type="submit" className="hb-go" disabled={!valid || !token || busy}>
            {busy ? 'กำลังไปที่ Discord…' : !token && valid ? 'กำลังตรวจสอบ…' : 'ล็อกอินด้วย Discord'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="hb-hint rv" style={{ '--d': 3 }}>{slug && !valid ? 'ชื่อต้องยาว 3-24 ตัว ใช้ a-z 0-9 และ -' : 'ตั้งชื่อร้านได้ทีหลัง · ใช้บัญชี Discord ของคุณเท่านั้น'}</div>
        <div className="hb-cap rv" style={{ '--d': 4 }}><Captcha onToken={setToken} /></div>
      </main>

      <section className="hb-feats">
        {[
          ['01', 'ล็อกอิน Discord + แคปช่า', 'เข้าร้านได้เฉพาะบัญชี Discord ของเจ้าของ ไม่มีรหัสผ่านให้โดนขโมย'],
          ['02', 'บอทสร้างร้านให้เอง', 'ใส่ไอดีเซิร์ฟเวอร์ บอทตรวจสิทธิ์ ฝังระบบ แล้วสร้างแผงร้านพร้อมไฟล์ข้อมูลของเซิร์ฟเวอร์'],
          ['03', 'ตั้งปุ่ม รูป อีโมจิได้เอง', 'ชื่อปุ่ม สินค้า และอีโมจิ Discord ตรงกับในเซิร์ฟเวอร์ เห็นผลทันที'],
          ['04', 'API เช็คสต็อก', 'ลิงก์สั้นๆ เอาไปใช้กับเว็บหรือบอทอื่นได้ทันที'],
        ].map(([n, t, d]) => (
          <article key={n} className="hb-card"><i>{n}</i><h3>{t}</h3><p>{d}</p></article>
        ))}
      </section>

      <section className="hb-api">
        <h2>เช็คสต็อกผ่านลิงก์เดียว</h2>
        <pre><code><b>GET</b> https://flexozy.site/api/v1/shop/<u>{shown}</u>{'\n\n'}{`{ "ok": true,\n  "shop": { "name": "…", "version": 42,\n    "products": [{ "name": "…", "price_baht": 59, "stock": 128, "emoji": "<:vip:1234…>" }] } }`}</code></pre>
      </section>

      <footer className="hb-foot">© Flexozy · ระบบเติมเงินกระเป๋าเดียวกับ flexozy.site</footer>
    </div>
  );
}
