import { kv } from '../db';
import { E, bk, live } from '../core';
import { mint, keyTtl } from '../keys';

// สำหรับบอท Discord ของคุณ: POST /api/bot  Authorization: Bearer BOT_SECRET
export async function bot({ req, body, J }) {
  if (!E.BOT_SECRET || req.headers.get('authorization') !== 'Bearer ' + E.BOT_SECRET) return J({ error: 'auth' }, 401);
  const A = body.act;
  if (A === 'gen') return J(await mint('bot', body.uid || 'bot', body.hours, body.prefix));
  if (A === 'revoke') { const k = await kv.get('key:' + body.key); if (k) await kv.set('key:' + body.key, { ...k, off: 1 }, { ex: keyTtl(k) }); return J({ ok: 1 }); }
  if (A === 'ban' && body.id) { await kv.sadd('bans', bk(String(body.id).trim())); return J({ ok: 1 }); }
  if (A === 'unban' && body.id) { await kv.srem('bans', bk(String(body.id).trim())); return J({ ok: 1 }); }
  if (A === 'check') { const k = await kv.get('key:' + body.key); return J({ valid: live(k), key: k || null }); }
  return J({ error: 'act' }, 400);
}
