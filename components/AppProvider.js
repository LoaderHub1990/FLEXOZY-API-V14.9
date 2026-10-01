'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SecurityScreen } from './SecurityCheck';

export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const ERR = {
  cfg: 'ระบบล็อกอินยังตั้งค่าไม่ครบ', denied: 'คุณยกเลิกการเข้าสู่ระบบ', state: 'เซสชันหมดอายุ กรุณาลองใหม่',
  token: 'ล็อกอิน Discord ไม่สำเร็จ', ban: 'บัญชีนี้ถูกระงับการใช้งาน', guild: 'ต้องอยู่ในเซิร์ฟเวอร์ Discord ก่อนจึงจะใช้งานได้',
};
const JOIN = { joined: 'เพิ่มคุณเข้าเซิร์ฟเวอร์ Discord ให้แล้ว 🎉', already: '' };

export default function AppProvider({ initial, noMe = false, children }) {
  const [site, setSite] = useState(initial);
  const [me, setMe] = useState(noMe ? null : undefined);
  const [toasts, setToasts] = useState([]);
  const [passed, setPassed] = useState(false); // ผ่านหน้าตรวจสอบความปลอดภัยแล้วหรือยัง

  const toast = useCallback((m, kind = '') => {
    const id = Math.random();
    setToasts(t => [...t.slice(-3), { id, m, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4600);
  }, []);
  const api = useCallback(async (path, body) => {
    try {
      const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
      const j = await r.json().catch(() => ({ error: 'server' }));
      return { ...j, _s: r.status };
    } catch { return { error: 'network', _s: 0 }; }
  }, []);
  const copy = useCallback(async (v, msg = 'คัดลอกแล้ว') => {
    try { await navigator.clipboard.writeText(v); } catch {
      const t = document.createElement('textarea'); t.value = v; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove();
    }
    toast(msg, 'ok');
  }, [toast]);
  const reloadMe = useCallback(async () => { const j = await api('me'); setMe(j.user ? j : null); return j; }, [api]);
  const reloadSite = useCallback(async () => { const j = await api('site'); if (j.name) setSite(j); }, [api]);

  useEffect(() => {
    if (!noMe) reloadMe();
    const q = new URLSearchParams(location.search);
    if (q.get('ok') === 'login') { toast('เข้าสู่ระบบสำเร็จ', 'ok'); if (JOIN[q.get('join')]) toast(JOIN[q.get('join')], 'ok'); }
    if (q.get('join') === 'fail') toast('เพิ่มเข้าเซิร์ฟเวอร์อัตโนมัติไม่สำเร็จ — ลองกดเข้าร่วมเองจากลิงก์เชิญ', 'bad');
    if (q.get('err')) toast((ERR[q.get('err')] || 'เกิดข้อผิดพลาด') + (q.get('why') ? ' — ' + q.get('why') : ''), 'bad');
    if (q.has('ok') || q.has('err') || q.has('join') || q.has('why')) { ['ok', 'err', 'join', 'why'].forEach(k => q.delete(k)); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
  }, []); // eslint-disable-line

  return (
    <Ctx.Provider value={{ site, me, setMe, reloadMe, reloadSite, api, toast, copy }}>
      {children}
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.m}</div>)}</div>
      {!passed && <SecurityScreen api={api} name={site.name} sc={initial.sc} onDone={() => setPassed(true)} />}
    </Ctx.Provider>
  );
}
