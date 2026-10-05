'use client';
import { useEffect, useState } from 'react';

export default function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf, start;
    const dur = 900;
    const step = (t) => {
      start ??= t;
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n.toLocaleString('th-TH')}</>;
}
