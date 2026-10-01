import { NextResponse as R } from 'next/server';
import { cookies } from 'next/headers';
import { unsign, COOKIE, pickBase, cookieOpts } from '../core';
import { kvReady } from '../db';
import { getSettings } from '../settings';
import { clientInfo, sameSite } from '../security';
import * as auth from './auth';
import * as pub from './pub';
import { gate } from './gate';
import { creator } from './creator';
import { admin } from './admin';
import { bot } from './bot';

export const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
export const J = (o, s = 200, h = {}) => R.json(o, { status: s, headers: { 'Cache-Control': 'no-store', ...h } });

export async function handle(req, { params }) {
  try {
    const M = req.method, [a, b, c] = (await params).a || [];
    if (M === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    let body = M === 'POST' ? await req.json().catch(() => ({})) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
    const base = pickBase(req);
    const ctx = { req, M, a, b, c, body, q: new URL(req.url).searchParams, base, co: cookieOpts(base), ...clientInfo(req), ses: unsign((await cookies()).get(COOKIE)?.value), J, CORS };
    if (M === 'POST' && a !== 'bot' && !sameSite(req)) return J({ error: 'origin' }, 403); // ต้องมาจากหน้าเว็บของเราเอง
    ctx.site = await getSettings();
    switch (a) {
      case 'health': return pub.health(ctx);
      case 'site': return pub.siteInfo(ctx);
      case 'me': return pub.me(ctx);
      case 'stats': return pub.stats(ctx);
      case 'human': return pub.human(ctx);
      case 'img': return pub.img(ctx);
      case 'page': return pub.page(ctx);
      case 'verify': return pub.verify(ctx);
      case 'login': return auth.start(ctx);
      case 'auth': return b === 'discord' ? auth.start(ctx) : b === 'callback' ? auth.callback(ctx) : b === 'logout' ? auth.logout(ctx) : J({ error: 'nf' }, 404);
      case 'gate': return gate(ctx);
      case 'creator': return creator(ctx);
      case 'admin': return admin(ctx);
      case 'bot': return bot(ctx);
      default: return J({ error: 'nf' }, 404);
    }
  } catch (e) {
    console.error('API error', e);
    return J({ error: 'server', detail: String(e?.message || e).slice(0, 200), db: kvReady }, 500);
  }
}
