// อ่าน/เขียนตัวเลือกคุกกี้ (เก็บเป็นคุกกี้ dh_consent อายุ 1 ปี)
const NAME = 'dh_consent';
export function readConsent() {
  try {
    const m = document.cookie.split('; ').find((c) => c.startsWith(NAME + '='));
    if (!m) return null;
    const j = JSON.parse(decodeURIComponent(m.slice(NAME.length + 1)));
    return { performance: !!j.performance };
  } catch { return null; }
}
export function saveConsent(performance) {
  const v = encodeURIComponent(JSON.stringify({ performance: !!performance, at: Date.now() }));
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${NAME}=${v}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  if (!performance) { try { sessionStorage.removeItem('dh_search_cache'); } catch {} }
  window.dispatchEvent(new Event('dh-consent'));
}
export function perfAllowed() {
  const c = readConsent();
  return !!(c && c.performance);
}
