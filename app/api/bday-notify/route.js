import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// แจ้งเตือนเข้า Discord เมื่อมีคนเปิดหน้า /happybirthday/warisara
// ตั้งลิงก์ webhook ที่ตัวแปร BDAY_DISCORD_WEBHOOK (Vercel → Settings → Environment Variables)
const NAMES = {
  open: 'เปิดเว็บแล้ว',
  envelope: 'แตะเปิดซองจดหมายแล้ว',
  blow: 'กดเป่าเทียนแล้ว',
  photos: 'ถึงหน้ารูปแล้ว',
};

export async function POST(req) {
  const hook = process.env.BDAY_DISCORD_WEBHOOK;
  if (!hook) return NextResponse.json({ ok: false }, { status: 500 });
  let e = '';
  try { e = (await req.json()).e; } catch {}
  if (!NAMES[e]) return NextResponse.json({ ok: false }, { status: 400 });
  const t = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `${NAMES[e]} (${t})` }),
    });
  } catch {}
  return NextResponse.json({ ok: true });
}
