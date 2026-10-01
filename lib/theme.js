// สคีมาธีมของ "หน้าแจกคีย์" และ "ตัวเว็บ" — ไฟล์นี้ใช้ร่วมกันทั้งเซิร์ฟเวอร์และเบราว์เซอร์ (ห้ามใช้ API ของ Node)

export const PRESETS = [
  ['brutal', 'Brutal', 'ขาวดำ เงาแข็ง (โทนเดิม)'],
  ['glass', 'Glass', 'กระจกโปร่ง เบลอ'],
  ['outline', 'Outline', 'เส้นบางเรียบ'],
  ['terminal', 'Terminal', 'เทอร์มินัล มุมเหลี่ยม'],
];
export const FONTS = {
  plex: { name: 'IBM Plex Sans Thai', css: "'IBM Plex Sans Thai',system-ui,sans-serif" },
  bai: { name: 'Bai Jamjuree', css: "'Bai Jamjuree','IBM Plex Sans Thai',sans-serif" },
  kanit: { name: 'Kanit', css: "'Kanit','IBM Plex Sans Thai',sans-serif" },
  prompt: { name: 'Prompt', css: "'Prompt','IBM Plex Sans Thai',sans-serif" },
  sarabun: { name: 'Sarabun', css: "'Sarabun','IBM Plex Sans Thai',sans-serif" },
  mono: { name: 'JetBrains Mono', css: "'JetBrains Mono',ui-monospace,monospace" },
};
export const FX = [['none', 'ไม่มี'], ['snow', 'หิมะ'], ['stars', 'ดาว'], ['rain', 'ฝน'], ['matrix', 'Matrix'], ['bubbles', 'ฟองอากาศ']];
export const SWATCHES = ['#ffffff', '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee'];

// ขีดจำกัดการอัปโหลด (เก็บใน KV เป็นก้อนย่อย ก้อนละ CHUNK ไบต์)
export const UP = { CHUNK: 340000, IMG: 2800000, AUDIO: 4200000 };

const hexc = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '').trim()) ? String(v).trim().toLowerCase() : d);
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
const one = (v, arr, d) => (arr.includes(v) ? v : d);
const txt = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
export const httpsUrl = v => { try { const s = String(v || '').trim(); const u = new URL(s); return u.protocol === 'https:' && s.length <= 700 ? u.toString() : ''; } catch { return ''; } };

export const DEFAULT_THEME = {
  preset: 'brutal', accent: '#ffffff', font: 'plex', radius: 14, align: 'left', shadow: true, cardAlpha: 82, logoShape: 'round',
  bg: { type: 'grid', color: '#000000', url: '', overlay: 55, blur: 0, gray: false },
  fx: 'none',
  music: { url: '', vol: 40, auto: true, title: '' },
  logoUrl: '', bannerUrl: '',
  text: { badge: '', welcome: '', start: '', claim: '', foot: '' },
};

export function cleanTheme(t) {
  t = t && typeof t === 'object' ? t : {};
  const b = t.bg && typeof t.bg === 'object' ? t.bg : {}, m = t.music && typeof t.music === 'object' ? t.music : {}, x = t.text && typeof t.text === 'object' ? t.text : {};
  const D = DEFAULT_THEME;
  return {
    preset: one(t.preset, PRESETS.map(p => p[0]), D.preset),
    accent: hexc(t.accent, D.accent),
    font: one(t.font, Object.keys(FONTS), D.font),
    radius: num(t.radius, 0, 28, D.radius),
    align: one(t.align, ['left', 'center'], D.align),
    shadow: t.shadow === undefined ? D.shadow : !!t.shadow,
    cardAlpha: num(t.cardAlpha, 20, 100, D.cardAlpha),
    logoShape: one(t.logoShape, ['round', 'square'], D.logoShape),
    bg: { type: one(b.type, ['grid', 'solid', 'image'], D.bg.type), color: hexc(b.color, D.bg.color), url: httpsUrl(b.url), overlay: num(b.overlay, 0, 95, D.bg.overlay), blur: num(b.blur, 0, 24, D.bg.blur), gray: !!b.gray },
    fx: one(t.fx, FX.map(f => f[0]), 'none'),
    music: { url: httpsUrl(m.url), vol: num(m.vol, 0, 100, D.music.vol), auto: m.auto === undefined ? true : !!m.auto, title: txt(m.title, 40) },
    logoUrl: httpsUrl(t.logoUrl), bannerUrl: httpsUrl(t.bannerUrl),
    text: { badge: txt(x.badge, 24), welcome: txt(x.welcome, 90), start: txt(x.start, 28), claim: txt(x.claim, 28), foot: txt(x.foot, 80) },
  };
}

// สีตัวอักษรที่อ่านออกบนพื้นสี accent
export function textOn(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0, r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000000' : '#ffffff';
}
export function themeStyle(t) {
  return { '--acc': t.accent, '--onacc': textOn(t.accent), '--rad': t.radius + 'px', '--ca': t.cardAlpha / 100, '--gf': FONTS[t.font].css, '--ov': t.bg.overlay / 100, '--bl': t.bg.blur + 'px' };
}

// ลิงก์เพลง YouTube → video id (ไม่ใช่ = null)
export function youtubeId(u) {
  try {
    const x = new URL(u);
    if (/(^|\.)youtu\.be$/.test(x.hostname)) return x.pathname.slice(1, 12) || null;
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(x.hostname)) return x.searchParams.get('v') || (/^\/(embed|shorts|live)\/([\w-]{11})/.exec(x.pathname) || [])[2] || null;
  } catch {}
  return null;
}

// ลิงก์ไฟล์มีเดียที่ใช้จริง: URL ที่ผู้ใช้วางมาก่อน ถ้าไม่มีใช้ไฟล์ที่อัปโหลดไว้ (imgv = { kind: เวอร์ชัน })
export function resolveMedia(slug, theme, imgv) {
  imgv = imgv || {};
  const f = k => (imgv[k] ? `/api/img/${slug}/${k}?v=${imgv[k]}` : '');
  return { logo: theme.logoUrl || f('logo'), banner: theme.bannerUrl || f('banner'), bg: theme.bg.url || f('bg'), music: theme.music.url || f('music') };
}
export const iconUrl = (slug, slot, imgv) => (imgv && imgv['i' + slot] ? `/api/img/${slug}/i${slot}?v=${imgv['i' + slot]}` : '');
