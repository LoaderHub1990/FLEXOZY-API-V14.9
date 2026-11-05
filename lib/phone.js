export const cleanPhone = (v) => String(v || '').replace(/\D/g, '');
export const validPhone = (v) => /^0\d{9}$/.test(cleanPhone(v));
export const fmtPhone = (v) => { const d = cleanPhone(v); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d; };
export const maskPhone = (v) => { const d = cleanPhone(v); return d.length === 10 ? `${d.slice(0, 3)}-xxx-${d.slice(6)}` : ''; };
