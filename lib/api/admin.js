import { kv } from '../db';
import { isAdmin, isOwner, ownerIds, clean, clamp, bk, unbk, live, toUnix } from '../core';
import { mint, keyTtl, creatorBySlug } from '../keys';
import { cleanSite, getSettings, invalidateSettings, getImgv, botReady, turnstileReady } from '../settings';
import { putChunk, delFile, wipeFiles } from '../files';
import { guildInfo } from '../discord';
import { kvMode, kvReady } from '../db';

// แผงแอดมิน — ตรวจสิทธิ์จาก Discord ID ที่ล็อกอิน (env ADMIN_IDS = เจ้าของ, แอดมินเพิ่มเติมเก็บใน KV)
export async function admin({ M, body, ses: s, J, site }) {
  if (!s) return J({ error: 'auth' }, 401);
  if (!await isAdmin(s.id)) return J({ error: 'forbidden' }, 403);
  const owner = isOwner(s.id);

  if (M === 'GET') {
    const [ks, ps, cs, bs, lg, max, ad, ul, sl, users] = await Promise.all([kv.smembers('keys'), kv.smembers('pages'), kv.smembers('crs'), kv.smembers('bans'), kv.lrange('log', 0, 49), kv.get('max'), kv.smembers('admins'), kv.lrange('ulog', 0, 49), kv.lrange('seclog', 0, 99), kv.scard('users')]);
    const get = async (pre, arr) => arr.length ? await kv.mget(...arr.map(x => pre + x)) : [];
    const [keyv, pagev, crv, views, claims] = await Promise.all([get('key:', ks), get('page:', ps), get('cr:', cs.map(unbk)), ps.length ? kv.mget(...ps.map(x => `st:${x}:views`)) : [], ps.length ? kv.mget(...ps.map(x => `st:${x}:claims`)) : []]);
    const gone = ks.filter((_, i) => !keyv[i]); if (gone.length) await kv.srem('keys', ...gone); // เก็บกวาดคีย์ที่หมดอายุและถูกลบแล้ว
    const now = Date.now(), all = keyv.filter(Boolean);
    return J({
      me: { id: s.id, owner }, max: max || 72, now, users,
      summary: { total: all.length, active: all.filter(k => live(k)).length, expired: all.filter(k => k.exp <= now).length, revoked: all.filter(k => k.off && k.exp > now).length },
      keys: all.sort((x, y) => y.exp - x.exp).slice(0, 500).map(k => ({ ...k, expiresAt: toUnix(k.exp) })),
      pages: pagev.map((p, i) => p && { ...p, views: +views[i] || 0, claims: +claims[i] || 0 }).filter(Boolean),
      creators: crv.filter(Boolean),
      bans: bs.map(unbk),
      admins: [...new Set([...ownerIds(), ...ad.map(unbk)])].map(id => ({ id, owner: isOwner(id) })),
      log: lg, ulog: ul, seclog: sl,
      site, siteImgv: await getImgv('_site'),
      env: { bot: botReady(), turnstile: turnstileReady(), db: kvMode, dbReady: kvReady },
    });
  }

  const A = body.act;
  if (A === 'gen') return J(await mint('admin', s.id, body.hours, body.prefix));
  if (A === 'keyoff') { const k = await kv.get('key:' + body.key); if (!k) return J({ error: 'nf' }, 404); await kv.set('key:' + body.key, { ...k, off: k.off ? 0 : 1 }, { ex: keyTtl(k) }); return J({ ok: 1, off: k.off ? 0 : 1 }); }
  if (A === 'extend') { // เพิ่มเวลาให้คีย์ (นับต่อจากวันหมดอายุเดิม ถ้ายังไม่หมด / นับจากตอนนี้ถ้าหมดแล้ว)
    const k = await kv.get('key:' + body.key); if (!k) return J({ error: 'nf' }, 404);
    const exp = Math.max(k.exp, Date.now()) + clamp(body.hours, 1, 8760) * 36e5;
    await kv.set('key:' + body.key, { ...k, exp }, { ex: keyTtl({ ...k, exp }) });
    return J({ ok: 1, exp, expiresAt: toUnix(exp) });
  }
  if (A === 'bulkgen') { const n = clamp(body.count, 1, 50), keys = []; for (let i = 0; i < n; i++) keys.push((await mint('admin', s.id, body.hours, body.prefix)).key); return J({ ok: 1, keys }); }
  if (A === 'purge') {
    const ks = await kv.smembers('keys'), vs = ks.length ? await kv.mget(...ks.map(x => 'key:' + x)) : [];
    const dead = ks.filter((x, i) => !vs[i] || vs[i].exp <= Date.now() || vs[i].off);
    for (const x of dead) await kv.del('key:' + x);
    if (dead.length) await kv.srem('keys', ...dead);
    return J({ ok: 1, n: dead.length });
  }
  if (A === 'keydel') { const k0 = await kv.get('key:' + body.key); await kv.del('key:' + body.key); await kv.srem('keys', body.key); if (k0?.page) await kv.srem('pk:' + k0.page, body.key); return J({ ok: 1 }); }

  // ---- ผู้สร้างหน้า / หน้า ----
  if (A === 'approve') {
    const id = clean(body.id, /\D/g, 25), slug = String(body.slug || '').trim().toLowerCase(), prefix = clean(body.prefix, /[^A-Za-z0-9]/g, 12) || 'KEY';
    if (id.length < 5) return J({ error: 'id' }, 400);
    if (!/^[a-z][a-z0-9-]{1,29}$/.test(slug) || ['true', 'false', 'null'].includes(slug)) return J({ error: 'slug' }, 400);
    const ex = await creatorBySlug(slug);
    if (ex && ex.id !== id) return J({ error: 'taken' }, 409);
    const mine = await kv.get('cr:' + id);
    if (mine && mine.slug !== slug && await kv.get('page:' + mine.slug)) return J({ error: 'hasPage' }, 409); // มีหน้าอยู่แล้ว เปลี่ยน slug ไม่ได้
    await kv.set('cr:' + id, { id, slug, prefix }); await kv.sadd('crs', 'id:' + id); await kv.set('slug:' + slug, id);
    const pg = await kv.get('page:' + slug); if (pg && pg.prefix !== prefix) await kv.set('page:' + slug, { ...pg, prefix });
    return J({ ok: 1 });
  }
  if (A === 'unapprove') { const id = clean(body.id, /\D/g, 25), c = await kv.get('cr:' + id); await kv.del('cr:' + id); await kv.srem('crs', 'id:' + id); if (c) await kv.del('slug:' + c.slug); return J({ ok: 1 }); }
  if (A === 'pagedel') {
    const slug = String(body.slug || ''); if (!/^[a-z][a-z0-9-]{1,29}$/.test(slug)) return J({ error: 'slug' }, 400);
    await kv.del('page:' + slug); await kv.srem('pages', slug); await wipeFiles(slug);
    await kv.del(...['views', 'claims', 'uv', 'sn', 'cl'].map(x => `st:${slug}:${x}`), 'sd:' + slug).catch(() => {});
    return J({ ok: 1 });
  }
  if (A === 'pageoff') { const p = await kv.get('page:' + body.slug); if (!p) return J({ error: 'nf' }, 404); await kv.set('page:' + body.slug, { ...p, off: p.off ? 0 : 1 }); return J({ ok: 1, off: p.off ? 0 : 1 }); }

  // ---- แบน / ปลดบล็อก ----
  if (A === 'ban') { const id = String(body.id || '').trim(); if (!id) return J({ error: 'id' }, 400); if (isOwner(id)) return J({ error: 'forbidden' }, 403); await kv.sadd('bans', bk(id)); return J({ ok: 1 }); }
  if (A === 'unban') { await kv.srem('bans', bk(String(body.id || '').trim())); return J({ ok: 1 }); }
  if (A === 'unblock') { const id = clean(body.id, /\D/g, 25); await kv.del('tb:' + id, 'sk:' + id); return J({ ok: 1 }); }

  // ---- ตั้งค่าเว็บ / ความปลอดภัย ----
  if (A === 'max') { await kv.set('max', clamp(body.hours, 1, 8760)); return J({ ok: 1 }); }
  if (A === 'site') { const next = cleanSite(body.site, await getSettings()); await kv.set('site', next); invalidateSettings(); return J({ ok: 1, site: next }); }
  if (A === 'up') { if (!['logo', 'bg', 'music'].includes(body.kind)) return J({ error: 'kind' }, 400); const r = await putChunk('_site', body.kind, body); return r.error ? J(r, 400) : J(r); }
  if (A === 'imgdel') { if (!['logo', 'bg', 'music'].includes(body.kind)) return J({ error: 'kind' }, 400); await delFile('_site', body.kind); return J({ ok: 1 }); }
  if (A === 'guildtest') return J({ bot: botReady(), guild: await guildInfo(site.guildId) });
  if (A === 'clearlog') { const w = ['log', 'ulog', 'seclog'].includes(body.what) ? body.what : ''; if (!w) return J({ error: 'act' }, 400); await kv.del(w); return J({ ok: 1 }); }

  // ---- แอดมินเพิ่มเติม (เจ้าของเท่านั้น) ----
  if (A === 'addadmin' || A === 'rmadmin') {
    if (!owner) return J({ error: 'owner_only' }, 403);
    const id = clean(body.id, /\D/g, 25); if (id.length < 5) return J({ error: 'id' }, 400);
    if (A === 'addadmin') await kv.sadd('admins', 'id:' + id); else await kv.srem('admins', 'id:' + id);
    return J({ ok: 1 });
  }
  return J({ error: 'act' }, 400);
}
