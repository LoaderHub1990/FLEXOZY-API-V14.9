'use client';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { reduced, onReady } from './fx';

/* ---------- 1) หน้าโหลดตอนเข้าเว็บ (#boot อยู่ใน layout) ---------- */
function Boot() {
  useEffect(() => {
    const html = document.documentElement;
    const finish = () => {
      html.dataset.ready = '1';
      window.dispatchEvent(new Event('dh:ready'));
      const boot = document.getElementById('boot');
      // ห้าม remove() — node นี้ React ดูแลอยู่ ถ้าลบเองจะพังตอนเปลี่ยนหน้า จึงแค่ซ่อน
      if (boot) { boot.classList.add('out'); setTimeout(() => { boot.style.display = 'none'; }, 700); }
    };
    // แสดงอย่างน้อย ~0.9 วิ ให้แอนิเมชันเล่นจบ แม้เว็บโหลดเร็ว
    const go = () => setTimeout(finish, Math.max(0, 900 - performance.now()));
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => window.removeEventListener('load', go);
  }, []);
  return null;
}

/* ---------- 2) แถบโหลดด้านบนตอนเปลี่ยนหน้า ---------- */
function RouteBar() {
  const path = usePathname();
  const sp = useSearchParams();
  const el = useRef(null);
  const st = useRef({ t: null, g: null, v: 0, on: false });
  const key = path + '?' + sp.toString();

  const done = () => {
    const s = st.current, b = el.current;
    if (!b || !s.on) return;
    clearInterval(s.t); clearTimeout(s.g); s.on = false;
    b.style.transition = 'transform .2s ease-out';
    b.style.transform = 'scaleX(1)';
    setTimeout(() => { b.style.transition = 'opacity .35s'; b.style.opacity = '0'; }, 220);
  };

  useEffect(() => { done(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const start = () => {
      const s = st.current, b = el.current;
      if (!b || s.on) return;
      s.on = true; s.v = 8;
      b.style.transition = 'none'; b.style.opacity = '1'; b.style.transform = 'scaleX(.08)';
      void b.offsetWidth;
      clearInterval(s.t);
      s.t = setInterval(() => {
        s.v += (92 - s.v) * 0.09;
        b.style.transition = 'transform .25s ease-out';
        b.style.transform = `scaleX(${s.v / 100})`;
      }, 200);
      clearTimeout(s.g);
      s.g = setTimeout(done, 8000); // กันค้าง
    };
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="route-bar" ref={el} aria-hidden="true" />;
}

/* ---------- 3) เอฟเฟกต์ตอนคลิก: อนุภาค + วงแหวน + ริปเปิลบนปุ่ม/การ์ด ---------- */
const RIPPLE = '.btn,.filter,.tab,.nav-link,.pcard,.cat,.search-btn,.menu-pop a,.menu-pop button,.sr';
function ClickFX() {
  const cv = useRef(null);
  useEffect(() => {
    if (reduced()) return;
    const c = cv.current;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, parts = [], raf = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const COLORS = ['139,108,240', '93,48,217', '196,181,253', '255,255,255'];
    const burst = (x, y) => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const sp = 1.6 + Math.random() * 3.2;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.4 + Math.random() * 2.2, life: 1, decay: 0.025 + Math.random() * 0.02, c: COLORS[(Math.random() * COLORS.length) | 0] });
      }
      parts.push({ x, y, ring: true, r: 4, life: 1, decay: 0.045 });
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        const l = Math.max(p.life, 0);
        if (p.ring) {
          p.r += 2.6; p.life -= p.decay;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
          ctx.strokeStyle = `rgba(139,108,240,${l * 0.7})`; ctx.lineWidth = 1.5; ctx.stroke();
          continue;
        }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy = p.vy * 0.93 + 0.06; p.life -= p.decay;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * l, 0, 7);
        ctx.fillStyle = `rgba(${p.c},${l})`; ctx.fill();
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
      if (!raf) ctx.clearRect(0, 0, w, h);
    };
    const ripple = (e) => {
      const t = e.target.closest?.(RIPPLE);
      if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      const r = t.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      t.appendChild(s);
      s.addEventListener('animationend', () => s.remove(), { once: true });
      setTimeout(() => s.remove(), 900);
    };
    const down = (e) => {
      if (e.button > 0) return;
      burst(e.clientX, e.clientY);
      ripple(e);
    };
    document.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('resize', size);
    return () => {
      document.removeEventListener('pointerdown', down);
      window.removeEventListener('resize', size);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={cv} className="click-cv" aria-hidden="true" />;
}

/* ---------- 4) เลื่อนถึงแล้วค่อยโผล่ (stagger) สำหรับ .rv ----------
   เฝ้าดู DOM ตลอด (MutationObserver) เพราะเนื้อหาหน้าอาจมาทีหลัง skeleton (loading.js)
   ถ้าเช็กแค่ตอนเปลี่ยน path จะพลาดการ์ดที่ stream เข้ามาทีหลัง แล้วค้างโปร่งใส */
function Reveal() {
  useEffect(() => {
    let io, mo;
    const SEL = '.rv:not(.in)';
    const show = (el) => el.classList.add('in');
    const watch = (el) => { if (io) io.observe(el); else show(el); };
    const scan = (root) => {
      if (root.matches?.(SEL)) watch(root);
      root.querySelectorAll?.(SEL).forEach(watch);
    };
    const setup = () => {
      if (!reduced() && 'IntersectionObserver' in window) {
        io = new IntersectionObserver((ents) => {
          for (const en of ents) if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      }
      scan(document.body);
      mo = new MutationObserver((muts) => {
        for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    };
    const off = onReady(setup);
    return () => { off(); io && io.disconnect(); mo && mo.disconnect(); };
  }, []);
  return null;
}

/* ---------- 5) สถานะเลื่อนหน้า (แถบเมนูใส → กระจก) + แสงตามเมาส์บนการ์ด ---------- */
function Pointer() {
  useEffect(() => {
    const html = document.documentElement;
    const sc = () => { html.dataset.scrolled = window.scrollY > 8 ? '1' : '0'; };
    sc();
    window.addEventListener('scroll', sc, { passive: true });

    let raf = 0, ev = null;
    const move = (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const t = ev.target.closest?.('.pcard,.cat,.stat');
        if (!t) return;
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', ev.clientX - r.left + 'px');
        t.style.setProperty('--my', ev.clientY - r.top + 'px');
      });
    };
    const fine = window.matchMedia('(pointer: fine)').matches && !reduced();
    if (fine) document.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('scroll', sc);
      document.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

export default function Effects() {
  return (
    <>
      <Boot />
      <Pointer />
      <ClickFX />
      <Suspense fallback={null}>
        <RouteBar />
        <Reveal />
      </Suspense>
    </>
  );
}
