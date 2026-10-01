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

// ---------------------------------------------------------------- เอฟเฟกต์ลอย (canvas) — มีหลายแบบ + โหมดผสม
const TAU = Math.PI * 2;
const PINK = ['#f9a8d4', '#fbcfe8', '#f472b6', '#fce7f3'], LEAF = ['#f59e0b', '#ea580c', '#84cc16', '#16a34a', '#dc2626'];
const CONF = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'], HEART = ['#fb7185', '#f472b6', '#f43f5e', '#fda4af'], EMBER = ['#fb923c', '#f97316', '#fbbf24', '#ef4444'];
const pick = (a, R) => a[(R() * a.length) | 0];
const star4 = (cx, s) => { cx.beginPath(); cx.moveTo(0, -s); cx.quadraticCurveTo(s * .12, -s * .12, s, 0); cx.quadraticCurveTo(s * .12, s * .12, 0, s); cx.quadraticCurveTo(-s * .12, s * .12, -s, 0); cx.quadraticCurveTo(-s * .12, -s * .12, 0, -s); cx.fill(); };
const glow = (cx, x, y, r, rgb, a) => { const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); };

// f = ความหนาแน่นเทียบกับค่าพื้นฐาน, make = สร้างอนุภาค, draw = เคลื่อนที่ + วาด (s = { cx, w, h, T, R, color })
const KINDS = {
  snow: { f: 1, make: (w, h, R) => ({ x: R() * w, y: R() * h, r: 1 + R() * 2.4, v: .4 + R() * 1.2, d: R() * 6, a: .3 + R() * .6 }),
    draw(p, s) { p.y += p.v; p.x += Math.sin(s.T + p.d) * .5; if (p.y > s.h + 5) { p.y = -5; p.x = s.R() * s.w; } s.cx.globalAlpha = p.a; s.cx.fillStyle = s.color; s.cx.beginPath(); s.cx.arc(p.x, p.y, p.r, 0, TAU); s.cx.fill(); } },
  stars: { f: 1.2, make: (w, h, R) => ({ x: R() * w, y: R() * h, r: 1 + R() * 2.2, v: .4 + R() * 1.2, d: R() * 6 }),
    draw(p, s) { s.cx.globalAlpha = .15 + .85 * Math.abs(Math.sin(s.T * p.v + p.d)); s.cx.fillStyle = s.color; s.cx.fillRect(p.x, p.y, p.r, p.r); } },
  rain: { f: 1.2, make: (w, h, R) => ({ x: R() * w, y: R() * h, r: 1 + R() * 2, v: .5 + R() * 1.1, a: .3 + R() * .6 }),
    draw(p, s) { p.y += p.v * 9; p.x -= 1.5; if (p.y > s.h) { p.y = -20; p.x = s.R() * s.w; } s.cx.globalAlpha = p.a * .6; s.cx.strokeStyle = s.color; s.cx.lineWidth = 1; s.cx.beginPath(); s.cx.moveTo(p.x, p.y); s.cx.lineTo(p.x - 2, p.y + 10 + p.r * 4); s.cx.stroke(); } },
  bubbles: { f: .7, make: (w, h, R) => ({ x: R() * w, y: R() * h, r: 1 + R() * 2.4, v: .4 + R() * 1.1, d: R() * 6, a: .3 + R() * .6 }),
    draw(p, s) { p.y -= p.v * .7; p.x += Math.sin(s.T + p.d) * .4; if (p.y < -20) { p.y = s.h + 20; p.x = s.R() * s.w; } s.cx.globalAlpha = p.a * .7; s.cx.strokeStyle = s.color; s.cx.lineWidth = 1.2; s.cx.beginPath(); s.cx.arc(p.x, p.y, p.r * 3, 0, TAU); s.cx.stroke(); } },
  matrix: { col: true, make: (w, h, R, i) => ({ x: i * 18, y: R() * h, v: 2 + R() * 3 }),
    draw(p, s) { const ch = '01アイウエオカキクケコ#$%+<>'; p.y += p.v; if (p.y > s.h + 220) p.y = -20; s.cx.fillStyle = s.color; s.cx.font = '14px monospace'; for (let j = 0; j < 12; j++) { s.cx.globalAlpha = Math.max(0, 1 - j / 12) * .8; s.cx.fillText(ch[(Math.floor(p.y / 14) + j * 7 + p.x) % ch.length | 0], p.x, p.y - j * 14); } } },
  sakura: { f: .5, make: (w, h, R) => ({ x: R() * w, y: R() * h, s: 5 + R() * 6, v: .6 + R() * .8, d: R() * 6, rot: R() * TAU, vr: (R() - .5) * .05, c: pick(PINK, R) }),
    draw(p, s) { p.y += p.v; p.x += Math.sin(s.T * .8 + p.d) * .9 + .3; p.rot += p.vr; if (p.y > s.h + 14) { p.y = -14; p.x = s.R() * s.w; } if (p.x > s.w + 14) p.x = -14;
      const c = s.cx; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, .45 + .55 * Math.abs(Math.cos(s.T * 1.5 + p.d))); c.globalAlpha = .85; c.fillStyle = p.c; c.beginPath(); c.moveTo(0, -p.s); c.quadraticCurveTo(p.s * .9, -p.s * .3, 0, p.s); c.quadraticCurveTo(-p.s * .9, -p.s * .3, 0, -p.s); c.fill(); c.restore(); } },
  leaves: { f: .4, make: (w, h, R) => ({ x: R() * w, y: R() * h, s: 7 + R() * 7, v: .7 + R() * .9, d: R() * 6, rot: R() * TAU, vr: (R() - .5) * .06, c: pick(LEAF, R) }),
    draw(p, s) { p.y += p.v; p.x += Math.sin(s.T * .7 + p.d) * 1.1; p.rot += p.vr; if (p.y > s.h + 16) { p.y = -16; p.x = s.R() * s.w; }
      const c = s.cx; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = .8; c.fillStyle = p.c; c.beginPath(); c.moveTo(-p.s, 0); c.quadraticCurveTo(0, -p.s * .65, p.s, 0); c.quadraticCurveTo(0, p.s * .65, -p.s, 0); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-p.s, 0); c.lineTo(p.s * .8, 0); c.stroke(); c.restore(); } },
  hearts: { f: .4, make: (w, h, R) => ({ x: R() * w, y: R() * h, s: 6 + R() * 10, v: .5 + R() * .9, d: R() * 6, c: pick(HEART, R) }),
    draw(p, s) { p.y -= p.v; p.x += Math.sin(s.T + p.d) * .6; if (p.y < -24) { p.y = s.h + 24; p.x = s.R() * s.w; }
      const c = s.cx, k = p.s; c.save(); c.translate(p.x, p.y); c.globalAlpha = .45 + .4 * Math.sin(s.T * 2 + p.d); c.fillStyle = p.c; c.beginPath(); c.moveTo(0, k * .35); c.bezierCurveTo(-k, -k * .35, -k * .55, -k, 0, -k * .45); c.bezierCurveTo(k * .55, -k, k, -k * .35, 0, k * .35); c.fill(); c.restore(); } },
  fireflies: { f: .45, make: (w, h, R) => ({ x: R() * w, y: R() * h, vx: 0, vy: 0, d: R() * 6, r: 1.5 + R() * 1.6 }),
    draw(p, s) { const R = s.R; p.vx = Math.max(-.6, Math.min(.6, p.vx + (R() - .5) * .06)); p.vy = Math.max(-.6, Math.min(.6, p.vy + (R() - .5) * .06)); p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = s.w + 10; if (p.x > s.w + 10) p.x = -10; if (p.y < -10) p.y = s.h + 10; if (p.y > s.h + 10) p.y = -10;
      const a = .25 + .75 * (.5 + .5 * Math.sin(s.T * 1.6 + p.d)); s.cx.globalAlpha = 1; glow(s.cx, p.x, p.y, p.r * 7, '253,224,71', a * .7); s.cx.globalAlpha = a; s.cx.fillStyle = '#fef9c3'; s.cx.beginPath(); s.cx.arc(p.x, p.y, p.r, 0, TAU); s.cx.fill(); } },
  confetti: { f: .45, make: (w, h, R) => ({ x: R() * w, y: R() * h, w: 5 + R() * 5, h: 3 + R() * 4, v: .8 + R() * 1.4, d: R() * 6, rot: R() * TAU, vr: (R() - .5) * .12, c: pick(CONF, R) }),
    draw(p, s) { p.y += p.v; p.x += Math.sin(s.T + p.d) * .8; p.rot += p.vr; if (p.y > s.h + 10) { p.y = -10; p.x = s.R() * s.w; }
      const c = s.cx; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(s.T * 2 + p.d)); c.globalAlpha = .85; c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); } },
  embers: { f: .5, make: (w, h, R) => ({ x: R() * w, y: R() * h, v: .5 + R() * 1.3, d: R() * 6, r: 1 + R() * 2, c: pick(EMBER, R) }),
    draw(p, s) { p.y -= p.v; p.x += Math.sin(s.T * 2 + p.d) * .7 + .15; if (p.y < -6) { p.y = s.h + 6; p.x = s.R() * s.w; }
      const a = Math.max(0, Math.min(1, p.y / s.h)) * (.6 + .4 * Math.sin(s.T * 5 + p.d)); s.cx.fillStyle = p.c; s.cx.globalAlpha = a * .25; s.cx.beginPath(); s.cx.arc(p.x, p.y, p.r * 3.2, 0, TAU); s.cx.fill(); s.cx.globalAlpha = a; s.cx.beginPath(); s.cx.arc(p.x, p.y, p.r, 0, TAU); s.cx.fill(); } },
  meteor: { f: .07, make: (w, h, R) => ({ x: R() * w * 1.4, y: -R() * h * .5, sp: 6 + R() * 6, len: 70 + R() * 110, wait: R() * 160, a: .5 + R() * .5 }),
    draw(p, s) { if (p.wait > 0) { p.wait--; return; } const k = .7; p.x -= p.sp * k; p.y += p.sp * k;
      if (p.x < -p.len || p.y > s.h + p.len) { p.x = s.R() * s.w * 1.4; p.y = -20; p.wait = 40 + s.R() * 260; return; }
      const c = s.cx, tx = p.x + p.len * k, ty = p.y - p.len * k, g = c.createLinearGradient(p.x, p.y, tx, ty); g.addColorStop(0, s.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = p.a; c.strokeStyle = g; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(tx, ty); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 1.9, 0, TAU); c.fill(); } },
  orbs: { f: .28, make: (w, h, R) => ({ x: R() * w, y: R() * h, r: 22 + R() * 50, vx: (R() - .5) * .35, vy: (R() - .5) * .35, d: R() * 6, hue: pick([280, 200, 320, 170, 40], R) }),
    draw(p, s) { p.x += p.vx; p.y += p.vy; if (p.x < -p.r) p.x = s.w + p.r; if (p.x > s.w + p.r) p.x = -p.r; if (p.y < -p.r) p.y = s.h + p.r; if (p.y > s.h + p.r) p.y = -p.r;
      const r = p.r * (1 + .12 * Math.sin(s.T + p.d)); s.cx.globalAlpha = 1; const g = s.cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `hsla(${p.hue},90%,65%,.30)`); g.addColorStop(1, `hsla(${p.hue},90%,65%,0)`); s.cx.fillStyle = g; s.cx.beginPath(); s.cx.arc(p.x, p.y, r, 0, TAU); s.cx.fill(); } },
  sparkle: { f: .45, make: (w, h, R) => ({ x: R() * w, y: R() * h, s: 3 + R() * 7, d: R() * 6, v: .6 + R() * 1.4, ph: -1 }),
    draw(p, s) { const t = s.T * p.v + p.d, ph = Math.floor(t / TAU); if (ph !== p.ph) { if (p.ph !== -1) { p.x = s.R() * s.w; p.y = s.R() * s.h; } p.ph = ph; }
      const k = Math.max(0, Math.sin(t)); s.cx.save(); s.cx.translate(p.x, p.y); s.cx.globalAlpha = .15 + .85 * k; s.cx.fillStyle = s.color; star4(s.cx, p.s * (.4 + .6 * k)); s.cx.restore(); } },
};
const MIX = ['orbs', 'sparkle', 'sakura', 'meteor'];

export function Particles({ kind, color = '#ffffff' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!kind || kind === 'none' || !ref.current) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const names = (kind === 'mix' ? MIX : [kind]).filter(k => KINDS[k]);
    if (!names.length) return;
    const cv = ref.current, cx = cv.getContext('2d'), R = Math.random;
    let w = 1, h = 1, raf = 0, T = 0, layers = [];
    const fit = () => { const r = cv.parentElement.getBoundingClientRect(); w = cv.width = Math.max(1, r.width | 0); h = cv.height = Math.max(1, r.height | 0); };
    const init = () => {
      fit();
      const base = Math.min(110, Math.ceil(w * h / 16000)), mul = names.length > 1 ? .7 : 1;
      layers = names.map(k => { const K = KINDS[k], n = K.col ? Math.ceil(w / 18) : Math.max(1, Math.round(base * K.f * mul)); return { K, it: Array.from({ length: n }, (_, i) => K.make(w, h, R, i)) }; });
    };
    init();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      T += .016; cx.clearRect(0, 0, w, h);
      const s = { cx, w, h, T, R, color };
      for (const L of layers) for (const p of L.it) { cx.globalAlpha = 1; L.K.draw(p, s); }
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
  const d = useRef(null), tm = useRef(0);
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
  const poke = () => { setOpen(true); clearTimeout(tm.current); tm.current = setTimeout(() => setOpen(false), 3800); };
  const toggle = async () => {
    const x = d.current; if (!x) return;
    if (on) { x.pause(); setOn(false); try { localStorage.setItem('fx_mute', '1'); } catch {} }
    else { if (await x.play()) { setOn(true); setNeed(false); try { localStorage.setItem('fx_mute', '0'); } catch {} } }
    poke();
  };
  const setVol = n => { setV(n); d.current && d.current.vol(n); };
  return (
    <div className={'mpx' + (open ? ' open' : '') + (on ? ' on' : '') + (need && !on ? ' need' : '')} style={{ '--v': v + '%' }}
      onMouseEnter={() => { clearTimeout(tm.current); setOpen(true); }} onMouseLeave={() => { clearTimeout(tm.current); tm.current = setTimeout(() => setOpen(false), 600); }}>
      <div className="mpx-panel">
        <div className="mpx-info">
          <div className="mpx-title"><span>{title || 'เพลงพื้นหลัง'}&nbsp;&nbsp;•&nbsp;&nbsp;{title || 'เพลงพื้นหลัง'}&nbsp;&nbsp;•&nbsp;&nbsp;</span></div>
          <div className="mpx-eq" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
        <label className="mpx-vol">
          <button type="button" className="mpx-mute" onClick={() => setVol(v ? 0 : 40)} aria-label="mute">{v ? <Music /> : <MusicOff />}</button>
          <input type="range" min="0" max="100" value={v} aria-label="volume" onChange={e => setVol(+e.target.value)} />
          <b>{v}</b>
        </label>
      </div>
      <div className="mpx-dock">
        <span className="mpx-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♩</i><i>♬</i></span>
        <span className="mpx-tip">แตะเพื่อเปิดเพลง ♪</span>
        <button type="button" className="mpx-disc" onClick={toggle} onFocus={() => setOpen(true)} aria-label={on ? 'ปิดเพลง' : 'เปิดเพลง'} title={need && !on ? 'แตะเพื่อเปิดเพลง' : on ? 'ปิดเพลง' : 'เปิดเพลง'}>
          <span className="mpx-ring" />
          <span className="mpx-vinyl"><span className="mpx-label" /></span>
          <span className="mpx-state">{on ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>}</span>
        </button>
      </div>
    </div>
  );
}
