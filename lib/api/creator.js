import { kv } from '../db';
import { isAdmin, url, clamp, bkkDay } from '../core';
import { ownKeys, creatorBySlug } from '../keys';
import { keyTtl } from '../keys';
import { cleanTheme } from '../theme';
import { putChunk, delFile, KINDS } from '../files';

const PRESETS = ['youtube', 'discord', 'tiktok', 'facebook', 'instagram', 'telegram', 'x', 'website'], MAX_LINKS = 6;

// แผงผู้สร้างหน้า · แอดมินส่ง `as: <slug>` เพื่อเข้าไปจัดการ/ตกแต่งหน้าของคนอื่นได้ทุกอย่าง
export async function creator({ M, body, ses: s, J }) {
  if (M !== 'POST') return J({ error: 'act' }, 400);
  if (!s) return J({ error: 'auth' }, 401);
  const adm = await isAdmin(s.id);
  const c = adm && body.as ? await creatorBySlug(body.as) : await kv.get('cr:' + s.id);
  if (!c) return J({ error: adm && body.as ? 'nf' : 'not_approved' }, adm && body.as ? 404 : 403);
  const A = body.act, sl = c.slug;

  if (A === 'get') {
    const [page, imgv, max] = await Promise.all([kv.get('page:' + sl), kv.get('imgv:' + sl), kv.get('max')]);
    return J({ creator: c, page: page || null, imgv: imgv || {}, max: max || 72 });
  }
  if (A === 'keys') return J({ keys: await ownKeys(sl), now: Date.now() });
  if (A === 'stats') {
    const [views, claims, uv, sn, cl, sd] = await Promise.all([kv.get(`st:${sl}:views`), kv.get(`st:${sl}:claims`), kv.pfcount(`st:${sl}:uv`), kv.pfcount(`st:${sl}:sn`), kv.pfcount(`st:${sl}:cl`), kv.hgetall('sd:' + sl)]);
    const days = []; for (let i = 6; i >= 0; i--) { const d = bkkDay(Date.now() - i * 864e5); days.push({ d, v: +(sd?.[d + ':v'] || 0), c: +(sd?.[d + ':c'] || 0) }); }
    return J({ views: +views || 0, visitors: uv || 0, started: sn || 0, claims: +claims || 0, claimers: cl || 0, days });
  }
  // จัดการคีย์ของหน้านี้เท่านั้น (เช็กว่าคีย์เป็นของ slug นี้)
  if (A === 'keyoff' || A === 'keydel' || A === 'keyextend') {
    const k = await kv.get('key:' + body.key);
    if (!k || k.page !== sl) return J({ error: 'nf' }, 404);
    if (A === 'keydel') { await kv.del('key:' + body.key); await kv.srem('keys', body.key); await kv.srem('pk:' + sl, body.key); return J({ ok: 1 }); }
    if (A === 'keyextend') {
      const exp = Math.max(k.exp, Date.now()) + clamp(body.hours, 1, 8760) * 36e5, nk = { ...k, exp };
      await kv.set('key:' + body.key, nk, { ex: keyTtl(nk) });
      return J({ ok: 1, exp });
    }
    const nk = { ...k, off: k.off ? 0 : 1 };
    await kv.set('key:' + body.key, nk, { ex: keyTtl(k) });
    return J({ ok: 1, off: nk.off });
  }
  if (A === 'purge') {
    const mine = await ownKeys(sl), dead = mine.filter(k => k.exp <= Date.now() || k.off).map(k => k.key);
    for (const x of dead) await kv.del('key:' + x);
    if (dead.length) { await kv.srem('keys', ...dead); await kv.srem('pk:' + sl, ...dead); }
    return J({ ok: 1, n: dead.length });
  }
  // อัปโหลดรูป/GIF/เพลง ทีละก้อน
  if (A === 'up') { const r = await putChunk(sl, String(body.kind || ''), body); return r.error ? J(r, 400) : J(r); }
  if (A === 'imgdel') { if (!KINDS.includes(body.kind)) return J({ error: 'kind' }, 400); await delFile(sl, body.kind); return J({ ok: 1 }); }

  // ---- บันทึกหน้า ----
  const yt = body.yt ? url(body.yt) : '', dc = body.dc ? url(body.dc) : '';
  if (body.yt && !yt) return J({ error: 'yt' }, 400);
  if (body.dc && !dc) return J({ error: 'dc' }, 400);
  const links = [], used = new Set();
  for (const l of (Array.isArray(body.links) ? body.links : []).slice(0, MAX_LINKS)) {
    const slot = Math.floor(+l?.slot), u = url(l?.url), label = String(l?.label || '').trim().slice(0, 24);
    if (!(slot >= 0 && slot < MAX_LINKS) || used.has(slot) || (!label && !l?.url)) continue; // ข้ามแถวว่าง
    if (!u) return J({ error: 'link' }, 400);
    used.add(slot);
    links.push({ slot, label: label || new URL(u).hostname, url: u, icon: PRESETS.includes(l.icon) || l.icon === 'img' ? l.icon : 'website' });
  }
  const max = (await kv.get('max')) || 72;
  await kv.set('page:' + sl, {
    slug: sl, owner: c.id, prefix: c.prefix,
    title: String(body.title || sl).trim().slice(0, 60) || sl, desc: String(body.desc || '').trim().slice(0, 140),
    yt, dc, links, wait: clamp(body.wait, 10, 120), hours: clamp(body.hours, 1, max), off: body.off ? 1 : 0, theme: cleanTheme(body.theme),
  });
  await kv.sadd('pages', sl);
  return J({ ok: 1, max });
}
