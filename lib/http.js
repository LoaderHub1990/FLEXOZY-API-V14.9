import { NextResponse } from 'next/server';
export const ok = (data, status = 200) => NextResponse.json({ ok: true, data }, { status });
export const fail = (error, status = 400) => NextResponse.json({ ok: false, error }, { status });
export const site = (req) => (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
export function wrap(fn) {
  return async (req, ctx) => {
    try { return await fn(req, ctx); } catch (e) { console.error(e); return fail('server_error: ' + (e?.message || e), 500); }
  };
}
