'use client';
import { useEffect, useRef, useState } from 'react';
import Captcha from '@/components/Captcha';
import { Mark } from './Logo';

const P = {
  shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  bot: 'M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 10.7C21 6.4 17 3 12 3zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  zap: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  wallet: 'M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2M3 6v13a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  discord: 'M4 5h16v11H9l-5 4z',
};
const Ic = ({ n, s = 22 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>;

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
  ['03', 'เชื่อมเซิร์ฟเวอร์ แล้วขาย', 'ใส่ไอดีเซิร์ฟเวอร์และห้อง บอทสร้างแผงร้านให้ ลูกค้ากดซื้อได้เลย'],
];
const FAQ = [
  ['Flexozy Shop คืออะไร?', 'แพลตฟอร์มให้ใครก็ได้เปิดร้านขายของดิจิทัลผ่านบอท Discord พร้อมหน้าร้านบนเว็บ ระบบสต็อก และ API เช็คสต็อก'],
  ['ลิงก์ร้านของฉันคืออะไร?', 'ระบบสร้างจากชื่อ Discord (username) ของคุณอัตโนมัติ เช่น flexozy.site/ชื่อของคุณ ถ้าชื่อซ้ำหรือเป็นชื่อสงวนจะต่อเลขให้'],
  ['ต้องเสียค่าใช้จ่ายไหม?', 'เปิดร้านได้ทันที ผู้ดูแลระบบอาจหักค่าธรรมเนียมแพลตฟอร์มจากยอดขายตามที่ประกาศไว้'],
  ['ผู้ซื้อจ่ายเงินอย่างไร?', 'จ่ายจากกระเป๋าเงินของ flexozy.site (เติมผ่าน TrueMoney) เมื่อซื้อ ระบบส่งสินค้าให้ทันทีและโอนรายได้เข้ากระเป๋าเจ้าของร้าน'],
  ['ข้อมูลและบัญชีปลอดภัยไหม?', 'ล็อกอินด้วย Discord OAuth ผ่านการตรวจแคปช่า ไม่เก็บรหัสผ่าน และเข้าแดชบอร์ดได้เฉพาะเจ้าของบัญชีนั้น'],
];

export default function Landing() {
  const [intro, setIntro] = useState('play'); // play | out | done
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(0);
  const root = useRef(null);

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

  // เลื่อนลงแล้วค่อยๆ โผล่ (เบลอ → ชัด) เหมือนหน้า astel.bio
  useEffect(() => {
    const els = root.current?.querySelectorAll('.lp-rv') || [];
    document.documentElement.classList.add('js'); // ซ่อนก่อนโผล่ — เพิ่มตอน JS ทำงานแล้วเท่านั้น (ถ้า JS พัง เนื้อหายังเห็นปกติ)
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const go = () => {
    if (!token || busy) return;
    setBusy(true);
    location.href = `/api/auth/discord?from=shop&cap=${encodeURIComponent(token)}`;
  };

  return (
    <div ref={root} className={'hb hb-land lp' + (intro === 'done' ? ' ready' : '')}>
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

      <header className="lp-nav">
        <div className="lp-nav-in">
          <a className="lp-brand" href="/shop/login"><Mark size={26} /><b>flexozy<span>.shop</span></b></a>
          <nav className="lp-links">
            <a href="#features">ฟีเจอร์</a><a href="#how">วิธีใช้งาน</a><a href="#api">API</a><a href="#faq">คำถามที่พบบ่อย</a>
          </nav>
          <div className="lp-nav-cta">
            <a className="lp-btn ghost" href="#start">เข้าสู่ระบบ</a>
            <a className="lp-btn solid" href="#start">เริ่มต้นใช้งาน</a>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero" id="start">
          <span className="lp-pill"><i /> ร้านค้าบอท Discord สำหรับทุกคน</span>
          <h1>เปิดร้านบน Discord<br /><span>พร้อมขายใน 1 นาที</span></h1>
          <p>ล็อกอินด้วย Discord เพิ่มสินค้า เติมสต็อก ใส่ไอดีเซิร์ฟเวอร์ แล้วบอทจะสร้างร้านให้ในห้องของคุณ — สต็อกและอีโมจิอัปเดตตามเว็บแบบเรียลไทม์</p>

          {err && <div className="hb-err">{err}</div>}

          <form className="lp-login" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <div className="lp-url"><span>flexozy.site/</span><b>ชื่อ Discord ของคุณ</b></div>
            <div className="lp-cap"><Captcha onToken={setToken} /></div>
            <button type="submit" className="lp-btn primary" disabled={!token || busy}>
              <Ic n="discord" s={18} />{busy ? 'กำลังไปที่ Discord…' : !token ? 'กำลังตรวจสอบความปลอดภัย…' : 'ล็อกอินด้วย Discord'}<Ic n="arrow" s={16} />
            </button>
            <small>ลิงก์ร้านใช้ชื่อ Discord ของคุณอัตโนมัติ · ตั้งชื่อร้านได้ทีหลัง</small>
          </form>
        </section>

        <section className="lp-sec" id="features">
          <div className="lp-wrap">
            <div className="lp-head lp-rv"><p>ฟีเจอร์</p><h2>ทุกอย่างที่ต้องใช้ ไม่มีส่วนเกิน</h2></div>
            <div className="lp-grid">
              {FEATURES.map(([ic, t, d], i) => (
                <article key={t} className="lp-card lp-rv" style={{ '--d': (i % 3) * 0.08 + 's' }}>
                  <span className="lp-chip"><Ic n={ic} /></span><h3>{t}</h3><p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <div className="lp-wrap">
            <div className="lp-head lp-rv"><p>วิธีใช้งาน</p><h2>เริ่มขายได้ใน 3 ขั้นตอน</h2></div>
            <div className="lp-grid three">
              {STEPS.map(([n, t, d], i) => (
                <article key={n} className="lp-card step lp-rv" style={{ '--d': i * 0.1 + 's' }}>
                  <i>{n}</i><h3>{t}</h3><p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="api">
          <div className="lp-wrap narrow">
            <div className="lp-head lp-rv"><p>API</p><h2>เช็คสต็อกผ่านลิงก์เดียว</h2></div>
            <pre className="lp-code lp-rv"><code><b>GET</b> https://flexozy.site/api/v1/shop/<u>ชื่อ-discord</u>{'\n\n'}{`{ "ok": true,\n  "shop": { "name": "…", "version": 42,\n    "products": [{ "name": "…", "price_baht": 59, "stock": 128 }] } }`}</code></pre>
          </div>
        </section>

        <section className="lp-sec" id="faq">
          <div className="lp-wrap faq">
            <div className="lp-head lp-rv"><p>FAQ</p><h2>มีคำถาม? เรามีคำตอบ</h2></div>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <div key={q} className={'lp-qa lp-rv' + (open === i ? ' open' : '')}>
                  <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}><span>{q}</span><Ic n="plus" s={18} /></button>
                  <div className="lp-ans"><p>{a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec lp-cta-sec">
          <div className="lp-wrap narrow">
            <div className="lp-cta lp-rv">
              <h2>พร้อมเปิดร้านของคุณหรือยัง?</h2>
              <p>ใช้เวลาไม่ถึงนาที ล็อกอินด้วย Discord แล้วเริ่มได้เลย</p>
              <a className="lp-btn primary" href="#start">เริ่มต้นใช้งาน<Ic n="arrow" s={16} /></a>
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
