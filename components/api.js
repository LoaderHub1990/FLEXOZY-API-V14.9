export async function api(url, method = 'GET', data) {
  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'same-origin',
  });
  let out = {};
  try { out = await res.json(); } catch {}
  if (!res.ok) {
    const e = new Error(out.error || 'เกิดข้อผิดพลาด');
    e.status = res.status;
    throw e;
  }
  return out;
}
export const baht = (s) => (Number(s) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtDate = (d) => new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });
