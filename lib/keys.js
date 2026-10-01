import { kv } from './db';
import { rnd, clean, unbk, live } from './core';

// สร้างคีย์: PREFIX-XXXXXXX-XXXXX  (เก็บ 7 วันหลังหมดอายุเพื่อให้ตรวจสถานะ "หมดอายุ" ได้)
export async function mint(page, uid, hours, prefix) {
  hours = Math.max(1, +hours || 24);
  const key = (clean(prefix, /[^A-Za-z0-9]/g, 12) || 'KEY') + '-' + rnd(7) + '-' + rnd(5), exp = Date.now() + hours * 36e5;
  await kv.set('key:' + key, { key, page, uid: String(uid), exp, off: 0 }, { ex: Math.ceil(hours * 3600) + 604800 });
  await kv.sadd('keys', key);
  if (page && page !== 'bot' && page !== 'admin') await kv.sadd('pk:' + page, key);
  return { key, exp };
}
export const keyTtl = k => Math.max(60, Math.ceil((k.exp - Date.now()) / 1000) + 604800);

// คีย์ของหน้านั้นๆ (เก็บเป็น set pk:slug · คีย์เก่าจาก keygate-v3 จะถูกดึงเข้า set ให้อัตโนมัติครั้งเดียว)
export async function ownKeys(slug) {
  if (!await kv.get('pkfill:' + slug)) {
    const ks = await kv.smembers('keys'), vs = ks.length ? await kv.mget(...ks.map(x => 'key:' + x)) : [];
    const mine = ks.filter((x, i) => vs[i] && vs[i].page === slug);
    if (mine.length) await kv.sadd('pk:' + slug, ...mine);
    await kv.set('pkfill:' + slug, 1);
  }
  const ids = await kv.smembers('pk:' + slug), vs = ids.length ? await kv.mget(...ids.map(x => 'key:' + x)) : [];
  const gone = ids.filter((_, i) => !vs[i]); if (gone.length) await kv.srem('pk:' + slug, ...gone);
  return vs.filter(Boolean).sort((x, y) => y.exp - x.exp).slice(0, 300);
}

// ผู้สร้างหน้า (creator) จาก slug — ใช้ตอนแอดมินเข้าไปจัดการหน้าของคนอื่น
export async function creatorBySlug(slug) {
  slug = String(slug || '').toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,29}$/.test(slug)) return null;
  const id = await kv.getRaw('slug:' + slug);
  if (id) { const c = await kv.get('cr:' + id); if (c && c.slug === slug) return c; }
  const cs = await kv.smembers('crs'), all = cs.length ? await kv.mget(...cs.map(x => 'cr:' + unbk(x))) : [];
  const c = all.find(x => x && x.slug === slug) || null;
  if (c) { await kv.set('slug:' + slug, c.id).catch(() => {}); return c; }
  const pg = await kv.get('page:' + slug); // ผู้สร้างถูกถอนสิทธิ์แต่หน้ายังอยู่ → ให้แอดมินยังแก้/ลบหน้านั้นได้
  return pg ? { id: pg.owner, slug, prefix: pg.prefix || 'KEY', orphan: true } : null;
}
export const keyLive = live;
