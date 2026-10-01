import { sign, crypto } from './core';
import { kv } from './db';

// captcha ในตัว (ใช้เมื่อไม่ได้ตั้งค่า Cloudflare Turnstile): ภาพตัวเลข 6 หลักแบบเอียง/มีเส้นรบกวน
// - เฉลยไม่อยู่ในภาพเป็นข้อความ (วาดเป็นพิกเซลบล็อก) และไม่อยู่ในโทเค็น (เก็บเป็น HMAC ด้วยความลับของเซิร์ฟเวอร์)
// - โทเค็นใช้ได้ครั้งเดียว หมดอายุ 5 นาที ตอบผิดต้องขอภาพใหม่
const TTL = 5 * 60e3, LEN = 6;
const G = {
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};
const R = (a, b) => a + Math.random() * (b - a), f = n => n.toFixed(1);
const mac = (n, e, a) => sign({ n, e, a }).split('.')[1];

function draw(ans) {
  const W = 270, H = 90, C = 6, step = 41, x0 = (W - step * LEN) / 2 + 5;
  const hue = () => `hsl(${(R(0, 360)) | 0},${(R(35, 70)) | 0}%,${(R(18, 38)) | 0}%)`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f1f1f1"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${f(R(0, 40))} ${f(R(0, H))} Q${f(R(60, 200))} ${f(R(0, H))} ${f(R(220, W))} ${f(R(0, H))}" stroke="${hue()}" stroke-opacity=".35" stroke-width="${f(R(1.5, 3))}" fill="none"/>`;
  [...ans].forEach((d, i) => {
    let g = `<g transform="translate(${f(x0 + i * step + R(-3, 3))} ${f(R(14, 26))}) rotate(${f(R(-16, 16))}) skewX(${f(R(-14, 14))})" fill="${hue()}">`;
    G[d].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g += `<rect x="${f(x * C + R(-.9, .9))}" y="${f(y * C + R(-.9, .9))}" width="${f(C + R(-.4, 1))}" height="${f(C + R(-.4, 1))}" rx="1.2"/>`; }));
    s += g + '</g>';
  });
  for (let i = 0; i < 4; i++) s += `<path d="M${f(R(0, 60))} ${f(R(5, H - 5))} C${f(R(70, 120))} ${f(R(0, H))} ${f(R(130, 190))} ${f(R(0, H))} ${f(R(210, W))} ${f(R(5, H - 5))}" stroke="${hue()}" stroke-opacity=".75" stroke-width="${f(R(1.2, 2.2))}" fill="none"/>`;
  for (let i = 0; i < 60; i++) s += `<circle cx="${f(R(0, W))}" cy="${f(R(0, H))}" r="${f(R(.6, 1.8))}" fill="${hue()}" fill-opacity=".6"/>`;
  return s + '</svg>';
}

export function captchaIssue() {
  const n = crypto.randomBytes(8).toString('hex'), e = Date.now() + TTL;
  let ans = ''; for (let i = 0; i < LEN; i++) ans += crypto.randomInt(2, 10);
  return { cid: `${n}.${e}.${mac(n, e, ans)}`, svg: draw(ans) };
}

export async function captchaCheck(cid, guess) {
  const [n, e, m] = String(cid || '').split('.');
  if (!/^[0-9a-f]{16}$/.test(n || '') || !m || !(+e > Date.now())) return false;
  if (await kv.get('cu:' + n)) return false;
  await kv.set('cu:' + n, 1, { ex: 600 }); // ใช้ได้ครั้งเดียว ไม่ว่าถูกหรือผิด
  const g = String(guess || '').replace(/\D/g, '');
  if (g.length !== LEN) return false;
  const x = mac(n, +e, g);
  return x.length === m.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(m));
}
