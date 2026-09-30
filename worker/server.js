// เซิร์ฟเวอร์ประมวลผล (รันบนเครื่อง/VPS ของคุณ ไม่ใช่บน Vercel)
// วางโปรเจกต์ Deobfuscator-Luraph-V15 ไว้ที่ worker/engine  (มี deob.js, core/, runtime/, bin/luau.exe ...)
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8787;
const TOKEN = process.env.WORKER_TOKEN || '';
const ENGINE = path.resolve(process.env.ENGINE_DIR || path.join(__dirname, 'engine'));
const MAX_PARALLEL = +process.env.MAX_PARALLEL || 2;
const TIMEOUT = (+process.env.TIMEOUT_SEC || 280) * 1000;
let busy = 0;

http.createServer((req, res) => {
  if (req.url === '/health') return res.end('ok');
  if (req.method !== 'POST' || req.url !== '/run') { res.statusCode = 404; return res.end(); }
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) { res.statusCode = 401; return res.end(); }
  if (busy >= MAX_PARALLEL) { res.statusCode = 429; return res.end('busy'); }

  let body = '';
  req.on('data', (d) => { body += d; if (body.length > 6e6) req.destroy(); });
  req.on('end', () => {
    let code = '';
    try { code = JSON.parse(body).code; } catch {}
    if (!code) { res.statusCode = 400; return res.end('no code'); }

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
    const send = (o) => res.write(JSON.stringify(o) + '\n');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx_'));
    const inp = path.join(dir, 'input.lua'), out = path.join(dir, 'result.lua');
    fs.writeFileSync(inp, code);
    busy++;
    send({ t: 'log', m: `รับโค้ดแล้ว (${code.length} ตัวอักษร) เริ่มประมวลผล...` });

    const p = spawn('node', [path.join(ENGINE, 'deob.js'), inp, '-o', out], { cwd: ENGINE });
    let buf = '';
    const feed = (d) => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) send({ t: 'log', m: l }); }
    };
    p.stderr.on('data', feed); p.stdout.on('data', feed);
    p.on('error', (e) => send({ t: 'error', m: `เริ่ม engine ไม่ได้: ${e.message}` }));
    const timer = setTimeout(() => { send({ t: 'log', m: 'หมดเวลา — ยกเลิกงาน' }); p.kill(); }, TIMEOUT);
    res.on('close', () => p.kill());

    p.on('close', (c) => {
      clearTimeout(timer); busy--;
      if (fs.existsSync(out)) send({ t: 'result', code: fs.readFileSync(out, 'utf8') });
      else send({ t: 'error', m: `ไม่พบผลลัพธ์ (exit code ${c})` });
      res.end();
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });
}).listen(PORT, () => console.log(`worker listening on :${PORT} engine=${ENGINE}`));
