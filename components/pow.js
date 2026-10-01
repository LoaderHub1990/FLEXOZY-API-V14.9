// แก้โจทย์ Proof-of-Work ในพื้นหลัง (ระหว่างที่ผู้ใช้รอเวลาอยู่แล้ว) — ต้องตรงกับ powCheck ใน lib/security.js
const zb = h => { let n = 0; for (const x of h) { if (x === 0) { n += 8; continue; } n += Math.clz32(x) - 24; break; } return n; };
export async function solvePow(p, alive = () => true) {
  if (!p) return null;
  if (typeof crypto === 'undefined' || !crypto.subtle) return { t: p.t, n: '0' };
  const enc = new TextEncoder();
  let n = 0;
  while (alive()) {
    for (let i = 0; i < 1200; i++, n++) {
      const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(p.t + ':' + n)));
      if (zb(h) >= p.b) return { t: p.t, n: String(n) };
    }
    await new Promise(r => setTimeout(r, 0));
  }
  return null;
}
