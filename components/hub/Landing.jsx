'use client';
import { useEffect, useRef, useState } from 'react';
import Captcha from '@/components/Captcha';
import { Mark } from './Logo';
import DiscordPreview from './DiscordPreview';
import { Backdrop, Cursor, Icon } from './Fx';

const TICKER = ['ส่งสินค้าอัตโนมัติ 24/7', 'สต็อกเรียลไทม์', 'อีโมจิเคลื่อนไหวจากเซิร์ฟเวอร์', 'เติมเงิน TrueMoney', 'บอทสร้างแผงร้านเอง', 'API เดียวจบ', 'หน้าร้านส่วนตัว', 'ล็อกอิน Discord ปลอดภัย'];

const DEMO = {
  shop: { name: 'Nova Store', tagline: 'ส่งออโต้ 24 ชม. · สต็อกสด', color: '#5865f2', logo: '', banner: '', topup_enabled: true, buttons: { buy: { label: 'ซื้อสินค้า', emoji: '🛒' }, stock: { label: 'เช็คสต็อก', emoji: '📦' }, balance: { label: 'ยอดเงิน', emoji: '💰' }, topup: { label: 'เติมเงิน', emoji: '💳' } } },
  products: [
    { id: 1, name: 'Netflix Premium 30 วัน', price: 5900, emoji: '🎬', stock: 128, active: true },
    { id: 2, name: 'Spotify Family', price: 3500, emoji: '🎧', stock: 54, active: true },
    { id: 3, name: 'Nitro Boost 1 เดือน', price: 9900, emoji: '🚀', stock: 0, active: true },
  ],
};

const FEATURES = [
  ['shield', 'ล็อกอิน Discord + แคปช่า', 'เข้าร้านได้เฉพาะบัญชี Discord ของเจ้าของ ไม่มีรหัสผ่านให้โดนขโมย'],
  ['bot', 'บอทสร้างร้านให้เอง', 'ใส่ไอดีเซิร์ฟเวอร์ บอทตรวจสิทธิ์ แล้วโพสต์แผงร้านในห้องที่คุณเลือกอัตโนมัติ'],
  ['palette', 'ตั้งปุ่ม รูป อีโมจิได้เอง', 'ชื่อปุ่ม สินค้า สีธีม และอีโมจิ Discord ตรงกับในเซิร์ฟเวอร์ เห็นผลทันที'],
  ['zap', 'สต็อกเรียลไทม์', 'เติมสต็อกครั้งเดียว ทั้งหน้าร้านและแผงใน Discord อัปเดตตามภายในไม่กี่วินาที'],
  ['code', 'API เช็คสต็อก', 'ลิงก์สั้นๆ เอาไปใช้กับเว็บหรือบอทอื่นได้ทันที เปิด CORS ไว้ให้แล้ว'],
  ['wallet', 'กระเป๋าเงินเดียวกัน', 'ผู้ซื้อใช้กระเป๋าเงินเดียวกับ flexozy.site รายได้เข้ากระเป๋าคุณทันที'],
];
const STEPS = [
  ['01', 'ล็อกอินด้วย Discord', 'กดปุ่มด้านบน ผ่านแคปช่า แล้วระบบสร้างลิงก์ร้านจากชื่อ Discord ของคุณให้'],
  ['02', 'เพิ่มสินค้า & เติมสต็อก', 'ตั้งชื่อ ราคา อีโมจิ แล้ววางคีย์ทีละบรรทัด 1 บรรทัด = 1 ชิ้น'],
  ['03', 'เชื่อมเซิร์ฟเวอร์ แล้วขาย', 'เลือกเซิร์ฟเวอร์และห้อง บอทสร้างแผงร้านให้ ลูกค้ากดซื้อได้เลย'],
];
const FAQ = [
  ['Flexozy Shop คืออะไร?', 'แพลตฟอร์มให้ใครก็ได้เปิดร้านขายของดิจิทัลผ่านบอท Discord พร้อมหน้าร้านบนเว็บ ระบบสต็อก และ API เช็คสต็อก'],
  ['ลิงก์ร้านของฉันคืออะไร?', 'ระบบสร้างจากชื่อ Discord (username) ของคุณอัตโนมัติ เช่น flexozy.site/ชื่อของคุณ ถ้าชื่อซ้ำหรือเป็นชื่อสงวนจะต่อเลขให้'],
  ['ต้องเสียค่าใช้จ่ายไหม?', 'เปิดร้านได้ทันที ผู้ดูแลระบบอาจหักค่าธรรมเนียมแพลตฟอร์มจากยอดขายตามที่ประกาศไว้'],
  ['ผู้ซื้อจ่ายเงินอย่างไร?', 'จ่ายจากกระเป๋าเงินของ flexozy.site (เติมผ่าน TrueMoney) เมื่อซื้อ ระบบส่งสินค้าให้ทันทีและโอนรายได้เข้ากระเป๋าเจ้าของร้าน'],
  ['ข้อมูลและบัญชีปลอดภัยไหม?', 'ล็อกอินด้วย Discord OAuth ผ่านการตรวจแคปช่า ไม่เก็บรหัสผ่าน และเข้าแดชบอร์ดได้เฉพาะเจ้าของบัญชีนั้น'],
];

export default function Landing() {
  const [intro, setIntro] = useState('done'); // เริ่มที่ done เพื่อให้ฝั่งเซิร์ฟเวอร์เรนเดอร์หน้าจริงก่อน (ไม่มีจอดำค้างถ้า JS พัง)
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(0);
  const [slug, setSlug] = useState('');
  const [jsOn, setJsOn] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    setJsOn(true);
    const p = new URLSearchParams(location.search).get('auth_error');
    if (p) { setErr(p); history.replaceState(null, '', location.pathname); }
    let seen = false;
    try { seen = !!sessionStorage.getItem('hb-intro'); } catch {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduce || p) return;
    try { sessionStorage.setItem('hb-intro', '1'); } catch {}
    setIntro('play');
    const t1 = setTimeout(() => setIntro('out'), 2900);
    const t2 = setTimeout(() => setIntro('done'), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // เลื่อนลงแล้วค่อยๆ โผล่ — ซ่อนเฉพาะตอน JS ทำงานแล้ว และมีตัวสำรองกันค้าง
  useEffect(() => {
    const els = root.current?.querySelectorAll('.rv') || [];
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    els.forEach((e) => io.observe(e));
    const safety = setTimeout(() => els.forEach((e) => e.classList.add('in')), 6000);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, []);

  const go = () => {
    if (!token || busy) return;
    setBusy(true);
    try { slug ? localStorage.setItem('hb-claim', slug) : localStorage.removeItem('hb-claim'); } catch {} // ชื่อลิงก์ที่อยากได้ → ใช้ตอนสร้างร้าน
    location.href = `/api/auth/discord?from=shop&cap=${encodeURIComponent(token)}`;
  };

  return (
    <div ref={root} className={'hb lp' + (jsOn ? ' rv-on' : '')}>
      <Backdrop /><Cursor />
      {intro !== 'done' && (
        <div className={'intro' + (intro === 'out' ? ' out' : '')} onClick={() => setIntro('out')} role="presentation">
          <div className="intro-in">
            <Mark size={110} draw />
            <div className="intro-word" aria-label="Flexozy Shop">
              {'Flexozy'.split('').map((c, i) => <span key={i} style={{ '--i': i }}>{c}</span>)}<em>shop</em>
            </div>
          </div>
          <div className="intro-skip">แตะเพื่อข้าม</div>
        </div>
      )}

      <header className="lp-nav">
        <div className="lp-nav-in rim">
          <a className="lp-brand" href="/shop/login"><Mark size={24} /><b>flexozy<span>.shop</span></b></a>
          <nav className="lp-links">
            <a href="#features">Feature</a><a href="#preview">Preview</a><a href="#api">API</a><a href="#faq">FAQ</a>
          </nav>
          <a className="h-btn primary sm rp" href="#start">Get Started</a>
        </div>
      </header>

      <main>
        <section className="lp-hero" id="start">
          <span className="lp-tag">ร้านค้าบอท Discord สำหรับทุกคน</span>
          <h1>Your Discord shop, <span>simplified.</span></h1>
          <p>เปิดร้านขายของดิจิทัลบน Discord ได้ในไม่กี่นาที — บอทสร้างแผงร้าน ส่งสินค้า และอัปเดตสต็อกให้อัตโนมัติ พร้อมหน้าร้านและ API ในลิงก์เดียว</p>

          {err && <div className="hb-err" role="alert">{err}</div>}

          <form className="lp-claim rim" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <span className="lp-claim-pre">flexozy.site/</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24))} placeholder="yourname" maxLength={24} autoComplete="off" spellCheck={false} aria-label="ชื่อลิงก์ร้าน" />
            <button type="submit" className="h-btn primary rp" disabled={!token || busy}>{busy ? 'กำลังไป Discord…' : !token ? 'กำลังตรวจสอบ…' : <>Get Started<Icon n="arrow" s={15} sw={2.2} /></>}</button>
          </form>
          <div className="lp-capbox"><Captcha onToken={setToken} /></div>
          <small className="lp-note">ล็อกอินด้วย Discord · เว้นว่างไว้ = ใช้ชื่อ Discord ของคุณเป็นลิงก์ร้าน</small>

          <div className="lp-stats h-rv">
            {[['24/7', 'ส่งสินค้าอัตโนมัติ'], ['< 5s', 'สต็อกอัปเดตเรียลไทม์'], ['GIF', 'อีโมจิเคลื่อนไหวจากเซิร์ฟเวอร์']].map(([n, t]) => <div key={t} className="rim glow"><b>{n}</b><span>{t}</span></div>)}
          </div>
        </section>

        <div className="lp-marq" aria-hidden="true"><div>{[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}</div></div>

        <section className="lp-sec" id="preview">
          <div className="lp-wrap narrow">
            <div className="lp-head h-rv"><p>PREVIEW</p><h2>แผงร้านใน Discord ที่ลูกค้าจะเห็น</h2></div>
            <div className="lp-preview h-rv"><DiscordPreview shop={DEMO.shop} products={DEMO.products} /></div>
          </div>
        </section>

        <section className="lp-sec" id="features">
          <div className="lp-wrap">
            <div className="lp-head h-rv"><p>FEATURES</p><h2>ทุกอย่างที่ต้องใช้ ไม่มีส่วนเกิน</h2></div>
            <div className="lp-grid">
              {FEATURES.map(([ic, t, d], i) => (
                <article key={t} className="lp-card rim glow h-rv" style={{ '--d': (i % 3) * 0.08 + 's' }}>
                  <span className="lp-chip"><Icon n={ic} s={22} /></span><h3>{t}</h3><p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <div className="lp-wrap">
            <div className="lp-head h-rv"><p>HOW IT WORKS</p><h2>เริ่มขายได้ใน 3 ขั้นตอน</h2></div>
            <div className="lp-grid">
              {STEPS.map(([n, t, d], i) => (
                <article key={n} className="lp-card step rim glow h-rv" style={{ '--d': i * 0.1 + 's' }}>
                  <i>{n}</i><h3>{t}</h3><p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="api">
          <div className="lp-wrap narrow">
            <div className="lp-head h-rv"><p>API</p><h2>เช็คสต็อกผ่านลิงก์เดียว</h2></div>
            <pre className="lp-code h-rv"><code><b>GET</b> https://flexozy.site/api/v1/shop/<u>ชื่อร้าน</u>{'\n\n'}{`{ "ok": true,\n  "shop": { "name": "…", "version": 42,\n    "products": [{ "name": "…", "price_baht": 59, "stock": 128 }] } }`}</code></pre>
          </div>
        </section>

        <section className="lp-sec" id="faq">
          <div className="lp-wrap narrow">
            <div className="lp-head h-rv"><p>FAQ</p><h2>มีคำถาม? เรามีคำตอบ</h2></div>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <div key={q} className={'lp-qa rim h-rv' + (open === i ? ' open' : '')}>
                  <button type="button" className="rp" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}><span>{q}</span><Icon n="plus" s={18} sw={2.2} /></button>
                  <div className="lp-ans"><div><p>{a}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec">
          <div className="lp-wrap narrow">
            <div className="lp-cta rim h-rv">
              <h2>พร้อมเปิดร้านของคุณหรือยัง?</h2>
              <p>ใช้เวลาไม่ถึงนาที ล็อกอินด้วย Discord แล้วเริ่มได้เลย</p>
              <a className="h-btn primary rp" style={{ height: 48, padding: '0 28px' }} href="#start">เริ่มต้นใช้งาน<Icon n="arrow" s={16} sw={2.2} /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-fgrid">
            <div><p className="lp-fb">flexozy.shop</p><p className="lp-fd">ร้านค้าบอท Discord สำหรับบุคคลทั่วไป สต็อกสด ขายอัตโนมัติ</p></div>
            <div><p className="lp-ft">ผลิตภัณฑ์</p><a href="#features">ฟีเจอร์</a><a href="#how">วิธีใช้งาน</a><a href="#api">API</a></div>
            <div><p className="lp-ft">ช่วยเหลือ</p><a href="#faq">คำถามที่พบบ่อย</a><a href="/privacy">นโยบายความเป็นส่วนตัว</a></div>
            <div><p className="lp-ft">Flexozy</p><a href="/">ร้านหลัก flexozy.site</a><a href="/store">สินค้าทั้งหมด</a></div>
          </div>
          <div className="lp-fbot"><span>© {new Date().getFullYear()} Flexozy. สงวนลิขสิทธิ์</span><span>ระบบเติมเงินกระเป๋าเดียวกับ flexozy.site</span></div>
        </div>
      </footer>
    </div>
  );
}
