export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};
const json = (body, status = 200) => Response.json(body, { status, headers: cors });

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

export const GET = () => json({
  name: 'Flexozy Luraph v15 Deobfuscator API',
  method: 'POST',
  body: { code: 'string (หรือ multipart/form-data ฟิลด์ file)' },
  online: Boolean(process.env.WORKER_URL),
});

export async function POST(req) {
  const worker = process.env.WORKER_URL;
  if (!worker) return json({ ok: false, error: 'ยังไม่ได้ตั้งค่า WORKER_URL' }, 503);

  let code = '';
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      const f = await req.formData();
      const file = f.get('file');
      code = file && typeof file !== 'string' ? await file.text() : String(f.get('code') || '');
    } else if (ct.includes('application/json')) {
      code = String((await req.json()).code || '');
    } else code = await req.text();
  } catch { return json({ ok: false, error: 'อ่านข้อมูลที่ส่งมาไม่ได้' }, 400); }

  if (!code.trim()) return json({ ok: false, error: 'ไม่พบโค้ด (ฟิลด์ code หรือ file)' }, 400);
  if (code.length > 4_000_000) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 4MB' }, 413);

  let up;
  try {
    up = await fetch(`${worker.replace(/\/$/, '')}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WORKER_TOKEN || ''}` },
      body: JSON.stringify({ code }),
      signal: req.signal,
    });
  } catch { return json({ ok: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ประมวลผลไม่ได้' }, 502); }
  if (!up.ok) return json({ ok: false, error: up.status === 429 ? 'ระบบกำลังคิวเต็ม ลองใหม่อีกครั้ง' : `worker error ${up.status}` }, up.status === 429 ? 429 : 502);

  if ((req.headers.get('accept') || '').includes('ndjson')) {
    return new Response(up.body, { headers: { ...cors, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
  }
  const logs = []; let output = null; let error = null;
  for (const line of (await up.text()).split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.t === 'log') logs.push(o.m); else if (o.t === 'result') output = o.code; else if (o.t === 'error') error = o.m;
    } catch {}
  }
  return json({ ok: output !== null, output, logs, ...(error && { error }) }, output !== null ? 200 : 422);
}
