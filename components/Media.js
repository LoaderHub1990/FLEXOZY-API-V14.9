'use client';
import { useEffect, useRef, useState } from 'react';
import { youtubeId } from '@/lib/theme';
import { Music, MusicOff } from './Icons';

// ---------------------------------------------------------------- พื้นหลัง (รูป/GIF/สีเดียว/กริด) + เอฟเฟกต์
export function Backdrop({ theme, media, abs = false }) {
  const b = theme.bg;
  const img = b.type === 'image' && media.bg;
  return (
    <div className={'bd' + (abs ? ' abs' : '')} aria-hidden="true">
      {b.type === 'solid' && <div className="bd-solid" style={{ background: b.color }} />}
      {b.type === 'grid' && <div className="bd-grid" />}
      {img && <div className="bd-img" style={{ backgroundImage: `url("${media.bg}")`, filter: `${b.gray ? 'grayscale(1) ' : ''}blur(${b.blur}px)` }} />}
      <div className="bd-ov" style={{ opacity: img ? b.overlay / 100 : 0 }} />
      <Particles kind={theme.fx} color={theme.accent} />
    </div>
  );
}

export function Particles({ kind, color = '#ffffff' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!kind || kind === 'none' || !ref.current) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current, cx = cv.getContext('2d');
    let w = 1, h = 1, raf = 0, T = 0, it = [];
    const R = Math.random;
    const fit = () => { const r = cv.parentElement.getBoundingClientRect(); w = cv.width = Math.max(1, r.width | 0); h = cv.height = Math.max(1, r.height | 0); };
    const init = () => {
      fit();
      const n = kind === 'matrix' ? Math.ceil(w / 18) : Math.min(110, Math.ceil(w * h / 16000));
      it = Array.from({ length: n }, (_, i) => kind === 'matrix' ? { x: i * 18, y: R() * h, v: 2 + R() * 3 }
        : { x: R() * w, y: R() * h, r: 1 + R() * 2.4, v: 0.4 + R() * 1.2, d: R() * 6, a: 0.3 + R() * 0.6 });
    };
    init();
    const ch = '01アイウエオカキクケコ#$%+<>';
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      T += 0.016; cx.clearRect(0, 0, w, h); cx.fillStyle = cx.strokeStyle = color;
      for (const p of it) {
        if (kind === 'snow') { p.y += p.v; p.x += Math.sin(T + p.d) * 0.5; if (p.y > h + 5) { p.y = -5; p.x = R() * w; } cx.globalAlpha = p.a; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.3); cx.fill(); }
        else if (kind === 'stars') { cx.globalAlpha = 0.15 + 0.85 * Math.abs(Math.sin(T * p.v + p.d)); cx.fillRect(p.x, p.y, p.r, p.r); }
        else if (kind === 'rain') { p.y += p.v * 9; p.x -= 1.5; if (p.y > h) { p.y = -20; p.x = R() * w; } cx.globalAlpha = p.a * 0.6; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - 2, p.y + 10 + p.r * 4); cx.stroke(); }
        else if (kind === 'bubbles') { p.y -= p.v * 0.7; p.x += Math.sin(T + p.d) * 0.4; if (p.y < -20) { p.y = h + 20; p.x = R() * w; } cx.globalAlpha = p.a * 0.7; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(p.x, p.y, p.r * 3, 0, 6.3); cx.stroke(); }
        else if (kind === 'matrix') { p.y += p.v; if (p.y > h + 220) p.y = -20; cx.font = '14px monospace'; for (let j = 0; j < 12; j++) { cx.globalAlpha = Math.max(0, 1 - j / 12) * 0.8; cx.fillText(ch[(Math.floor(p.y / 14) + j * 7 + p.x) % ch.length | 0], p.x, p.y - j * 14); } }
      }
      cx.globalAlpha = 1;
    };
    frame();
    const on = () => init();
    window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', on); };
  }, [kind, color]);
  if (!kind || kind === 'none') return null;
  return <canvas ref={ref} className="bd-fx" />;
}

// ---------------------------------------------------------------- เพลงพื้นหลัง (ไฟล์เสียง หรือ ลิงก์ YouTube)
let ytP = null;
const ytApi = () => ytP || (ytP = new Promise(res => {
  if (window.YT && window.YT.Player) return res(window.YT);
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(window.YT); };
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
}));

function driver(src, vol) {
  const id = youtubeId(src);
  if (!id) {
    const a = new Audio(src); a.loop = true; a.preload = 'auto'; a.volume = vol / 100;
    return { yt: false, play: () => a.play().then(() => true).catch(() => false), pause: () => a.pause(), vol: v => { a.volume = v / 100; }, kill: () => { a.pause(); a.removeAttribute('src'); a.load(); } };
  }
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px;opacity:0;pointer-events:none';
  const inner = document.createElement('div'); host.appendChild(inner); document.body.appendChild(host);
  let pl = null, ready = false, want = false, v0 = vol;
  ytApi().then(YT => {
    pl = new YT.Player(inner, { width: '200', height: '200', videoId: id, playerVars: { controls: 0, loop: 1, playlist: id, playsinline: 1, disablekb: 1, fs: 0 }, events: { onReady: () => { ready = true; pl.setVolume(v0); if (want) pl.playVideo(); } } });
  });
  return {
    yt: true,
    play: () => { want = true; if (ready) pl.playVideo(); return Promise.resolve(true); },
    pause: () => { want = false; if (ready) pl.pauseVideo(); },
    vol: v => { v0 = v; if (ready) pl.setVolume(v); },
    kill: () => { try { if (pl && pl.destroy) pl.destroy(); } catch {} host.remove(); },
  };
}

export function MusicPlayer({ src, vol = 40, auto = true, title = '' }) {
  const d = useRef(null);
  const [on, setOn] = useState(false), [need, setNeed] = useState(false), [v, setV] = useState(vol), [open, setOpen] = useState(false);
  useEffect(() => { setV(vol); if (d.current) d.current.vol(vol); }, [vol]);
  useEffect(() => {
    if (!src) return;
    let dead = false, muted = false, armed = false;
    try { muted = localStorage.getItem('fx_mute') === '1'; } catch {}
    const x = driver(src, vol); d.current = x;
    const go = async () => { const ok = await x.play(); if (!dead && ok) { setOn(true); setNeed(false); } return ok; };
    const gestures = ['pointerdown', 'keydown', 'touchend'];
    const arm = () => { if (armed || dead) return; armed = true; setNeed(true); const h = async () => { if (await go()) gestures.forEach(g => window.removeEventListener(g, h, true)); }; gestures.forEach(g => window.addEventListener(g, h, true)); x._h = h; };
    if (auto && !muted) { if (x.yt) arm(); else go().then(ok => { if (!ok) arm(); }); }
    return () => { dead = true; if (x._h) ['pointerdown', 'keydown', 'touchend'].forEach(g => window.removeEventListener(g, x._h, true)); x.kill(); d.current = null; setOn(false); };
  }, [src, auto]); // eslint-disable-line
  if (!src) return null;
  const toggle = async () => {
    const x = d.current; if (!x) return;
    if (on) { x.pause(); setOn(false); try { localStorage.setItem('fx_mute', '1'); } catch {} }
    else { if (await x.play()) { setOn(true); setNeed(false); try { localStorage.setItem('fx_mute', '0'); } catch {} } }
  };
  return (
    <div className={'mp' + (open ? ' open' : '') + (need && !on ? ' need' : '')} onMouseLeave={() => setOpen(false)}>
      <div className="mp-p">
        <span className="mp-t">{title || 'เพลงพื้นหลัง'}</span>
        <input type="range" min="0" max="100" value={v} aria-label="volume" onChange={e => { const n = +e.target.value; setV(n); d.current && d.current.vol(n); }} />
      </div>
      <button className="mp-b" onClick={toggle} onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)} aria-label={on ? 'ปิดเพลง' : 'เปิดเพลง'} title={need && !on ? 'แตะเพื่อเปิดเพลง' : on ? 'ปิดเพลง' : 'เปิดเพลง'}>
        {on ? <Music /> : <MusicOff />}
      </button>
    </div>
  );
}
