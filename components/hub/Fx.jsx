'use client';
import { useEffect, useRef } from 'react';

/** พื้นหลังออโรร่า: ก้อนแสงม่วง/น้ำเงินลอยช้าๆ + ตารางจางๆ */
export function Aurora() {
  return <div className="fx-aurora" aria-hidden="true"><i /><i /><i /><b /></div>;
}

/** ประกายแสงลอยขึ้น (canvas เบาๆ หยุดเองเมื่อซ่อนแท็บ / ผู้ใช้ตั้งลดแอนิเมชัน) */
export function Sparks({ count = 48 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const mk = (init) => ({ x: Math.random() * w, y: init ? Math.random() * h : h + 10, r: Math.random() * 1.6 + .4, v: Math.random() * .35 + .12, a: Math.random() * Math.PI * 2, s: Math.random() * .02 + .008, hue: Math.random() < .7 ? 270 : 225 });
    const ps = Array.from({ length: count }, () => mk(true));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y -= p.v; p.a += p.s; p.x += Math.sin(p.a) * .25;
        if (p.y < -10) Object.assign(p, mk(false));
        const al = (.25 + .75 * Math.abs(Math.sin(p.a))) * Math.min(1, p.y / (h * .35 + 1)) * .8;
        ctx.beginPath(); ctx.fillStyle = `hsla(${p.hue},90%,75%,${al})`; ctx.shadowColor = `hsla(${p.hue},95%,65%,.9)`; ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); };
    document.addEventListener('visibilitychange', vis); window.addEventListener('resize', size);
    vis();
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); window.removeEventListener('resize', size); };
  }, [count]);
  return <canvas ref={ref} className="fx-sparks" aria-hidden="true" />;
}

const GLOW = '.fx-card,.hb-pn,.hb-stat,.hb-card,.lp-card,.hb-item,.hb-g,.hb-steps button,.lp-stats div,.lp-preview,.hb-create-card';
/** แสงสปอตไลต์ตามเมาส์บนการ์ด (ตั้ง --mx/--my ให้ CSS วาด) */
export function useSpotlight(rootRef) {
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mv = (e) => {
      const t = e.target.closest?.(GLOW);
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', mv, { passive: true });
    return () => el.removeEventListener('pointermove', mv);
  }, [rootRef]);
}
