import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// แคชในหน่วยความจำ 5 นาที ไม่ให้ยิง Discord ทุกครั้งที่มีคนเข้าเว็บ
const cache = new Map();
const TTL = 5 * 60 * 1000;

/** ดึงชื่อ/จำนวนสมาชิก/จำนวนออนไลน์จากลิงก์เชิญ (ไม่ต้องเปิด Server Widget) */
export async function GET(req) {
  const code = (new URL(req.url).searchParams.get('code') || '').trim();
  if (!/^[A-Za-z0-9-]{2,32}$/.test(code)) {
    return NextResponse.json({ error: 'bad code' }, { status: 400 });
  }
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data, { headers: { 'Cache-Control': 'public, max-age=60' } });

  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error('discord ' + r.status);
    const d = await r.json();
    const g = d.guild || {};
    const data = {
      name: g.name || 'Discord',
      online: d.approximate_presence_count ?? null,
      members: d.approximate_member_count ?? null,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
    };
    cache.set(code, { at: Date.now(), data });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    if (hit) return NextResponse.json(hit.data); // ใช้ค่าเก่าถ้า Discord ล่ม
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
}
