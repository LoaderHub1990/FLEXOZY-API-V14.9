'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
// เอฟเฟกต์ทั้งเว็บ: แถบเลื่อน, reveal ตอนเลื่อน, ripple ตอนคลิก, แสงตามเมาส์บนการ์ด
export default function Fx() {
  const path = usePathname();
  useEffect(() => {
    const bar = document.getElementById('prog');
    const nav = document.querySelector('.nav');
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
      nav?.classList.toggle('sc', h.scrollTop > 12);
      const st = document.querySelector('[data-par]');
      if (st) st.style.transform = `translateY(${Math.min(h.scrollTop * 0.18, 60)}px)`;
    };
    const onClick = (e) => {
      const t = e.target.closest('.btn,.tabbar button,.seg button,.chips button,.icon-btn');
      if (!t || t.disabled) return;
      const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
      const el = document.createElement('span');
      el.className = 'rip';
      el.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
      t.style.overflow = 'hidden';
      t.appendChild(el); setTimeout(() => el.remove(), 650);
    };
    const onMove = (e) => {
      const c = e.target.closest?.('.card');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('click', onClick); document.removeEventListener('mousemove', onMove); };
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('.rv:not(.in)').forEach((el) => { if (!seen.has(el)) { seen.add(el); io.observe(el); } });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);
  return <div id="prog" aria-hidden="true" />;
}
