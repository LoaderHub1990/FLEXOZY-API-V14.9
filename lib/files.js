import { kv } from './db';
import { UP } from './theme';

// ไฟล์รูป/GIF/เพลง เก็บใน KV เป็นก้อนย่อย (ก้อนละ ~340KB) เพื่อไม่ชนเพดานขนาดคำขอของ Upstash/Vercel
export const KINDS = ['logo', 'banner', 'bg', 'music', 'i0', 'i1', 'i2', 'i3', 'i4', 'i5'];
export const isAudioKind = k => k === 'music';
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
export const b64len = s => Math.floor(s.length * 3 / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0);
const limitOf = k => (isAudioKind(k) ? UP.AUDIO : UP.IMG);

// ตรวจชนิดไฟล์จาก magic bytes จริง (ไม่เชื่อนามสกุล/Content-Type) · ไม่รับ SVG เพื่อกัน XSS
export function sniff(b) {
  const s = (a, z) => b.subarray(a, z).toString('latin1');
  if (b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (b.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'image/webp';
  if (s(0, 6) === 'GIF87a' || s(0, 6) === 'GIF89a') return 'image/gif';
  if (s(0, 4) === 'OggS') return 'audio/ogg';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav';
  if (s(4, 8) === 'ftyp') return 'audio/mp4';
  if (b.subarray(0, 4).toString('hex') === '1a45dfa3') return 'audio/webm';
  if (s(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  return null;
}

const mk = (slug, kind) => `img:${slug}:${kind}`;
const ck = (slug, kind, id, i) => `imgc:${slug}:${kind}:${id}:${i}`;
const keysOf = (slug, kind, id, n) => Array.from({ length: n }, (_, i) => ck(slug, kind, id, i));

// รับก้อนทีละก้อน · คืน { ok, done, v } หรือ { error }
export async function putChunk(slug, kind, o) {
  if (!KINDS.includes(kind)) return { error: 'kind' };
  const id = String(o.id || ''), idx = Math.floor(+o.idx), total = Math.floor(+o.total), data = String(o.data || '');
  const maxN = Math.ceil(limitOf(kind) / UP.CHUNK);
  if (!/^[a-f0-9]{16}$/.test(id) || !(total >= 1 && total <= maxN) || !(idx >= 0 && idx < total)) return { error: 'img' };
  if (!B64.test(data) || b64len(data) > UP.CHUNK) return { error: 'img' };
  if (idx === 0) {
    const t = sniff(Buffer.from(data.slice(0, 64), 'base64'));
    if (!t || (isAudioKind(kind) ? !t.startsWith('audio/') : !t.startsWith('image/'))) return { error: isAudioKind(kind) ? 'audio' : 'img' };
    await kv.set(`upm:${slug}:${kind}:${id}`, { t }, { ex: 3600 });
  }
  await kv.set(ck(slug, kind, id, idx), data, { ex: 3600 });
  if (idx < total - 1) return { ok: 1 };

  // ก้อนสุดท้าย → ประกอบและยืนยัน
  const [up, parts] = await Promise.all([kv.get(`upm:${slug}:${kind}:${id}`), kv.mgetRaw(...keysOf(slug, kind, id, total))]);
  if (!up || parts.some(p => !p)) return { error: 'missing' };
  const size = parts.reduce((n, p) => n + b64len(p), 0);
  if (size > limitOf(kind)) { await kv.del(...keysOf(slug, kind, id, total)); return { error: 'big' }; }
  const old = await kv.get(mk(slug, kind)), ts = Date.now();
  await kv.persist(keysOf(slug, kind, id, total));
  await kv.set(mk(slug, kind), { t: up.t, id, n: total, size, ts });
  if (old?.id && old.id !== id) await kv.del(...keysOf(slug, kind, old.id, old.n || 0));
  const v = (await kv.get('imgv:' + slug)) || {}; v[kind] = ts; await kv.set('imgv:' + slug, v);
  await kv.del(`upm:${slug}:${kind}:${id}`);
  return { ok: 1, done: 1, v: ts };
}

export async function delFile(slug, kind) {
  const m = await kv.get(mk(slug, kind));
  if (m?.id) await kv.del(...keysOf(slug, kind, m.id, m.n || 0));
  await kv.del(mk(slug, kind));
  const v = (await kv.get('imgv:' + slug)) || {}; delete v[kind]; await kv.set('imgv:' + slug, v);
}
export async function wipeFiles(slug) { for (const k of KINDS) { try { await delFile(slug, k); } catch {} } try { await kv.del('imgv:' + slug); } catch {} }

// อ่านไฟล์ทั้งก้อน → { t, buf } · รองรับรูปแบบเก่าของ keygate-v3 ({ t, d } ก้อนเดียว) ด้วย
export async function readFile(slug, kind) {
  if (!KINDS.includes(kind)) return null;
  const m = await kv.get(mk(slug, kind));
  if (!m) return null;
  if (m.d) return { t: m.t, buf: Buffer.from(m.d, 'base64'), ts: m.ts || 0 };
  if (!m.id) return null;
  const parts = await kv.mgetRaw(...keysOf(slug, kind, m.id, m.n));
  if (parts.some(p => !p)) return null;
  return { t: m.t, buf: Buffer.concat(parts.map(x => Buffer.from(x, 'base64'))), ts: m.ts || 0 };
}
