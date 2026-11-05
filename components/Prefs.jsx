'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeT } from '@/lib/i18n';

const Ctx = createContext({ lang: 'th', theme: 'dark', t: (s) => s, setLang() {}, toggleTheme() {} });
export const usePrefs = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;

const setCookie = (k, v) => { document.cookie = `${k}=${v};path=/;max-age=31536000;samesite=lax`; try { localStorage.setItem(k, v); } catch {} };

export function PrefsProvider({ initialLang, initialTheme, children }) {
  const router = useRouter();
  const [lang, setLangState] = useState(initialLang);
  const [theme, setThemeState] = useState(initialTheme);
  const busy = useRef(false);

  const setLang = useCallback((l) => {
    l = l === 'en' ? 'en' : 'th';
    setLangState(l); setCookie('fx_lang', l);
    document.documentElement.lang = l;
    router.refresh(); // ให้ส่วนที่เรนเดอร์ฝั่งเซิร์ฟเวอร์เปลี่ยนภาษาตาม
  }, [router]);

  const toggleTheme = useCallback((ev) => {
    if (busy.current) return;
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => { document.documentElement.dataset.theme = next; setThemeState(next); setCookie('fx_theme', next);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#fafafa' : '#000000'); };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !document.startViewTransition) { apply(); return; }
    // วงกลมขยายจากปุ่ม — ทำโดย compositor ไม่กระตุก
    const r = ev?.currentTarget?.getBoundingClientRect?.();
    const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : 0;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    busy.current = true;
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
    vt.finished.finally(() => { busy.current = false; });
  }, []);

  // หยุดแอนิเมชันพื้นหลังเมื่อสลับแท็บ (ประหยัดเครื่อง)
  useEffect(() => {
    const f = () => document.documentElement.classList.toggle('tabhidden', document.hidden);
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);

  const value = useMemo(() => ({ lang, theme, t: makeT(lang), setLang, toggleTheme }), [lang, theme, setLang, toggleTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- สวิตช์ธีม ☀ ↔ ☾ ---------- */
export function ThemeSwitch({ small }) {
  const { theme, toggleTheme, t } = usePrefs();
  return (
    <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label={t('สลับธีมสว่าง/มืด')} title={t('สลับธีมสว่าง/มืด')}
      className={'tsw' + (small ? ' sm' : '')} onClick={toggleTheme}>
      <i className="st s1" /><i className="st s2" /><i className="st s3" /><i className="cl" />
      <span className="th" />
    </button>
  );
}

/* ---------- สวิตช์ภาษา TH | EN ---------- */
export function LangSwitch({ small }) {
  const { lang, setLang, t } = usePrefs();
  return (
    <button type="button" role="switch" aria-checked={lang === 'en'} aria-label={t('สลับภาษา')} title={t('สลับภาษา')}
      className={'lsw' + (small ? ' sm' : '')} data-lang={lang} onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
      <i /><span>TH</span><span>EN</span>
    </button>
  );
}

export const Prefs = ({ small }) => (<div className="prefs"><LangSwitch small={small} /><ThemeSwitch small={small} /></div>);
