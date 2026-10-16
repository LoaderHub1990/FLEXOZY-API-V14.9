'use client';
import { useEffect, useRef, useState } from 'react';
import { reduced, onReady } from './fx';

// นับเลขขึ้นจาก 0 เมื่อเลื่อนมาเห็นการ์ด (หลังหน้าโหลดเล่นจบ)
export default function CountUp({ to, dur = 1500 }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const target = Number(to) || 0;
    if (!el) return;
    if (reduced()) { setN(target); setDone(true); return; }
    let raf, io, started = false;
    const run = () => {
      if (started) return;
      started = true;
      let t0;
      const step = (t) => {
        t0 ??= t;
        const p = Math.min((t - t0) / dur, 1);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
        setN(Math.round(target * e));
        if (p < 1) raf = requestAnimationFrame(step);
        else setDone(true);
      };
      raf = requestAnimationFrame(step);
    };
    const off = onReady(() => {
      io = new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { run(); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(el);
    });
    return () => { off(); io && io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, dur]);

  return <span ref={ref} className={'num' + (done ? ' done' : '')}>{n.toLocaleString('th-TH')}</span>;
}
