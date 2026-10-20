// Relay สำหรับรับซอง TrueMoney — รันบนเซิร์ฟเวอร์ที่ TrueMoney/Cloudflare ไม่บล็อก (เช่น VPS ในไทย)
// รัน:  RELAY_KEY=รหัสลับยาวๆ PORT=8787 node tools/truemoney-relay.mjs   (Node 18+)
// แล้วตั้งใน Vercel:  TRUEMONEY_BASE_URL=https://relay.โดเมนของคุณ  และ  TRUEMONEY_RELAY_KEY=รหัสเดียวกัน
// ควรวางหลัง HTTPS (Caddy/nginx) เพราะรหัสลับวิ่งผ่านเส้นทางนี้
import http from 'node:http';

const KEY = process.env.RELAY_KEY || '';
const PORT = Number(process.env.PORT) || 8787;
if (KEY.length < 16) { console.error('ตั้ง RELAY_KEY อย่างน้อย 16 ตัวอักษร'); process.exit(1); }

http.createServer(async (req, res) => {
  try {
    if (req.headers['x-relay-key'] !== KEY) { res.writeHead(401).end('unauthorized'); return; }
    // อนุญาตเฉพาะเส้นทางรับซองเท่านั้น
    if (!/^\/campaign\/vouchers\/[A-Za-z0-9%]{10,120}\/(redeem|verify)$/.test(req.url.split('?')[0])) { res.writeHead(404).end('not found'); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await fetch('https://gift.truemoney.com' + req.url, {
      method: req.method,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        Origin: 'https://gift.truemoney.com',
        Referer: req.headers.referer || 'https://gift.truemoney.com/campaign/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
      body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
      signal: AbortSignal.timeout(15000),
    });
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json' });
    res.end(await r.text());
  } catch (e) {
    res.writeHead(502).end(String(e?.message || 'relay error'));
  }
}).listen(PORT, () => console.log('truemoney relay on :' + PORT));
