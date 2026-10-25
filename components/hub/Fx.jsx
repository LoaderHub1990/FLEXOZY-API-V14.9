'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* =====================================================================
   ชุดคอมโพเนนต์กลางของ Flexozy Shop (สไตล์เดียวกับ UI สคริปต์ Lua:
   มุมโค้งมาก, ขอบไล่เฉด, ปุ่มกดแล้วยุบ/เด้ง, สวิตช์, Toast ลอยล่าง)
   ===================================================================== */

/* ---------------------------------------------------------- ไอคอน */
const PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  store: 'M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M9 20v-6h6v6',
  cursor: 'M5 4l6 16 2.5-6.5L20 11z',
  chat: 'M4 5h16v11H9l-5 4z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  out: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
  sold: 'M4 12l5 5L20 6M4 20h16',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M6 9l6 6 6-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  warn: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  bot: 'M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 10.7C21 6.4 17 3 12 3zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  zap: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  wallet: 'M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2M3 6v13a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  save: 'M5 4h12l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
};
export function Icon({ n, s = 18, sw = 1.8, className = '' }) {
  return (
    <svg className={'ic ' + className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n] || ''} />
    </svg>
  );
}

/* ---------------------------------------------------------- เมาส์ (เฉพาะคอม) + ริปเปิลตอนกด */
const HOVERABLE = 'a,button,[role="button"],[role="tab"],[role="option"],[role="switch"],label,select,summary,input[type="checkbox"],input[type="file"],.hov';
const TEXTY = 'input:not([type="checkbox"]):not([type="file"]):not([type="color"]),textarea';
export function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    /* ริปเปิลตอนกด — ทำงานทั้งคอมและมือถือ ผ่าน event delegation (ไม่ผูกทีละปุ่ม จึงไม่หลุด/ไม่ซ้อน) */
    const onDown = (e) => {
      if (reduce || (e.button !== undefined && e.button > 0)) return;
      const t = e.target.closest?.('.rp');
      if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      const r = t.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'rp-wave';
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      t.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    document.addEventListener('pointerdown', onDown, { passive: true });

    if (!fine || reduce) return () => document.removeEventListener('pointerdown', onDown);

    root.classList.add('has-cursor');
    let tx = -100, ty = -100, rx = -100, ry = -100, raf = 0, shown = false;
    const d = dot.current, r = ring.current;
    const place = () => {
      rx += (tx - rx) * 0.2; ry += (ty - ry) * 0.2;
      if (d) d.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      if (r) r.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      raf = requestAnimationFrame(place);
    };
    raf = requestAnimationFrame(place);

    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; rx = tx; ry = ty; root.classList.add('cursor-on'); }
      const el = e.target;
      const text = !!el.closest?.(TEXTY);
      const hot = !text && !!el.closest?.(HOVERABLE);
      root.classList.toggle('cursor-hot', hot);
      root.classList.toggle('cursor-text', text);
      const card = el.closest?.('.glow');
      if (card) { // ไฟสปอตไลต์ตามเมาส์บนการ์ดที่อยู่ใต้เมาส์
        const b = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - b.left}px`);
        card.style.setProperty('--my', `${e.clientY - b.top}px`);
      }
      root.style.setProperty('--px', `${e.clientX}px`);
      root.style.setProperty('--py', `${e.clientY}px`);
    };
    const leave = () => { shown = false; root.classList.remove('cursor-on', 'cursor-hot', 'cursor-text', 'cursor-down'); };
    const down = () => root.classList.add('cursor-down');
    const up = () => root.classList.remove('cursor-down');
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('blur', leave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      window.removeEventListener('blur', leave);
      root.classList.remove('has-cursor', 'cursor-on', 'cursor-hot', 'cursor-text', 'cursor-down');
    };
  }, []);
  return (
    <>
      <div className="cur-ring" ref={ring} aria-hidden="true"><i /></div>
      <div className="cur-dot" ref={dot} aria-hidden="true" />
    </>
  );
}

/* พื้นหลังนิ่งๆ แบบ UI เกม: แสงขาวจางด้านบน + ตารางจุด + แสงตามเมาส์ */
export function Backdrop() {
  return <div className="bd" aria-hidden="true"><i /><b /></div>;
}

/* ---------------------------------------------------------- Toast (เหมือน notify ในสคริปต์ Lua) */
const NOOP = { ok() {}, bad() {}, warn() {}, close() {} };
const ToastCtx = createContext(NOOP);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const seq = useRef(0);
  const timers = useRef(new Map());

  const drop = useCallback((id) => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setList((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t)));
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 380);
  }, []);

  const push = useCallback((kind, title, msg, ms = 3000) => {
    const id = ++seq.current;
    setList((l) => {
      const live = l.filter((t) => !t.out);
      const keep = live.length >= 4 ? l.filter((t) => t.id !== live[0].id) : l; // เกิน 4 ใบ → ตัดใบเก่าสุด
      return [...keep, { id, kind, title, msg }];
    });
    if (ms) timers.current.set(id, setTimeout(() => drop(id), ms));
    return id;
  }, [drop]);

  const api = useRef(null);
  if (!api.current) {
    api.current = {
      ok: (t, m) => push('ok', t, m),
      bad: (t, m) => push('bad', t, m, 4200),
      warn: (t, m) => push('warn', t, m, 3600),
      close: (id) => drop(id),
    };
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <ToastCtx.Provider value={api.current}>
      {children}
      <div className="hb tl"><div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={'h-toast ' + t.kind + (t.out ? ' out' : '')} onClick={() => drop(t.id)}>
            <span className="toast-badge"><Icon n={t.kind === 'ok' ? 'check' : 'warn'} s={16} sw={2.2} /></span>
            <span className="toast-tx"><b>{t.title}</b>{t.msg ? <em>{t.msg}</em> : null}</span>
          </div>
        ))}
      </div></div>
    </ToastCtx.Provider>
  );
}

/* ---------------------------------------------------------- สวิตช์ (เหมือนปุ่ม Auto Sell / Anti AFK) */
export function Switch({ on, onChange, label, sub, disabled, id }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={!!on} disabled={disabled} className={'sw-row rp glow' + (on ? ' on' : '')}
      onClick={() => !disabled && onChange(!on)}>
      <span className="sw-tx"><b>{label}</b>{sub ? <em>{sub}</em> : null}</span>
      <span className="sw-track"><span className="sw-knob" /></span>
    </button>
  );
}

/* ---------------------------------------------------------- แท็บที่มีแถบเลื่อนตามจริง */
export function Tabs({ tabs, value, onChange }) {
  const wrap = useRef(null);
  const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const el = w.querySelector(`[data-tab="${value}"]`);
    if (!el) return;
    setBar({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
    // เลื่อนแถบให้เห็นแท็บที่เลือกเสมอ (มือถือเลื่อนซ้าย-ขวาได้)
    if (w.scrollWidth > w.clientWidth) w.scrollTo({ left: el.offsetLeft - (w.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [value]);

  useLayoutEffect(() => { measure(); }, [measure, tabs.length]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready?.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const onKey = (e) => {
    const i = tabs.findIndex((t) => t[0] === value);
    if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length][0]);
    else if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length][0]);
    else return;
    e.preventDefault();
  };

  return (
    <div className="tabs-shell rim glow">
      <div className="h-tabs" ref={wrap} role="tablist" onKeyDown={onKey}>
        <span className={'tabs-bar' + (bar.ready ? ' ready' : '')} style={{ width: bar.w, transform: `translateX(${bar.x}px)` }} />
        {tabs.map(([k, label, ic]) => (
          <button key={k} type="button" role="tab" data-tab={k} aria-selected={value === k} tabIndex={value === k ? 0 : -1}
            className={'h-tab rp' + (value === k ? ' on' : '')} onClick={() => onChange(k)}>
            {ic ? <Icon n={ic} s={16} /> : null}<span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Select แบบเลื่อนเปิด (แทน <select> ธรรมดา) */
export function Select({ value, options, onChange, placeholder = 'เลือก…', disabled, empty = 'ไม่มีตัวเลือก', loading }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const root = useRef(null);
  const cur = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  useEffect(() => { setHi(open ? Math.max(0, options.findIndex((o) => o.value === value)) : -1); }, [open]); // eslint-disable-line

  const pick = (o) => { if (o.disabled) return; onChange(o.value); setOpen(false); };
  const key = (e) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && options[hi]) { e.preventDefault(); pick(options[hi]); }
  };

  return (
    <div className={'h-sel' + (open ? ' open' : '') + (disabled ? ' off' : '')} ref={root} onKeyDown={key}>
      <button type="button" className="sel-btn rp" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {cur?.icon ? <span className="sel-ic">{cur.icon}</span> : null}
        <span className={'sel-v' + (cur && !loading ? '' : ' ph')}>{loading ? 'กำลังโหลด…' : cur ? cur.label : placeholder}</span>
        <Icon n="chevron" s={16} className="sel-chev" />
      </button>
      <div className="sel-pop" role="listbox" aria-hidden={!open}>
        <div className="sel-list">
          {options.length === 0 && <div className="sel-empty">{empty}</div>}
          {options.map((o, i) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} disabled={o.disabled} tabIndex={-1}
              className={'sel-o rp' + (o.value === value ? ' on' : '') + (i === hi ? ' hi' : '')}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o)}>
              {o.icon ? <span className="sel-ic">{o.icon}</span> : null}
              <span className="sel-t"><b>{o.label}</b>{o.sub ? <em className={o.subClass || ''}>{o.sub}</em> : null}</span>
              {o.value === value ? <Icon n="check" s={15} sw={2.4} /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Modal (หัวไอคอน + ชื่อ + คำอธิบาย เหมือนหน้า "เช่าบอท" ในรูป) */
const modalStack = [];
export function Modal({ onClose, icon = 'box', title, sub, wide, children }) {
  const cb = useRef(onClose);
  cb.current = onClose;
  const [leaving, setLeaving] = useState(false);
  const closing = useRef(false);
  const me = useRef({});
  const close = useCallback(() => {
    if (closing.current) return; // กดปิดรัวๆ ก็ปิดครั้งเดียว
    closing.current = true; setLeaving(true);
    setTimeout(() => cb.current(), 220);
  }, []);
  useEffect(() => {
    const id = me.current;
    modalStack.push(id);
    const k = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && modalStack[modalStack.length - 1] === id) close(); }; // เฉพาะหน้าต่างบนสุดเท่านั้นที่ปิดด้วย Esc
    addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', k);
      const i = modalStack.indexOf(id); if (i >= 0) modalStack.splice(i, 1);
      document.body.style.overflow = modalStack.length ? 'hidden' : prev;
    };
  }, [close]);
  return (
    <div className={'mask' + (leaving ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={'h-modal rim' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-h">
          <span className="modal-ic"><Icon n={icon} s={20} /></span>
          <div><h3>{title}</h3>{sub ? <p>{sub}</p> : null}</div>
          <button type="button" className="h-x rp" onClick={close} aria-label="ปิด"><Icon n="close" s={16} sw={2.2} /></button>
        </header>
        <div className="modal-b">{typeof children === 'function' ? children(close) : children}</div>
      </div>
    </div>
  );
}

/* ปุ่มคัดลอก (ไม่ค้างสถานะถ้ากดรัว) */
export function CopyBtn({ text, label = 'คัดลอก', done = 'คัดลอกแล้ว', className = 'h-btn ghost sm', onDone }) {
  const [ok, setOk] = useState(false);
  const t = useRef(0);
  useEffect(() => () => clearTimeout(t.current), []);
  const go = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {} ta.remove();
    }
    setOk(true); clearTimeout(t.current); t.current = setTimeout(() => setOk(false), 1400);
    onDone?.();
  };
  return <button type="button" className={className + ' rp'} onClick={go}><Icon n={ok ? 'check' : 'copy'} s={14} sw={2} />{ok ? done : label}</button>;
}
