// ทดสอบ flow จริงทั้งระบบ: node scripts/e2e.mjs http://localhost:3100
const BASE = process.argv[2] || 'http://localhost:3100';
const ORIGIN = new URL(BASE).origin;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

class Client {
  constructor() { this.cookie = ''; }
  async req(path, method = 'GET', body, { origin = ORIGIN } = {}) {
    const h = { Cookie: this.cookie };
    if (body) h['Content-Type'] = 'application/json';
    if (origin && method !== 'GET') h.Origin = origin;
    const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const sc = r.headers.getSetCookie?.() || [];
    for (const c of sc) {
      const [kv] = c.split(';'); const [k, v] = kv.split('=');
      const jar = Object.fromEntries(this.cookie.split('; ').filter(Boolean).map((x) => x.split('=')));
      if (c.includes('Max-Age=0') || v === '') delete jar[k]; else jar[k] = v;
      this.cookie = Object.entries(jar).map(([a, b]) => `${a}=${b}`).join('; ');
    }
    let j = null; try { j = await r.json(); } catch {}
    return { s: r.status, j, headers: r.headers };
  }
}
const rnd = Math.random().toString(36).slice(2, 8);

const admin = new Client(), u1 = new Client(), anon = new Client();

console.log('# auth');
let r = await admin.req('/api/auth/login', 'POST', { username: 'admin', password: 'wrong' });
ok(r.s === 401, 'login ผิดรหัส -> 401');
r = await admin.req('/api/auth/login', 'POST', { username: 'admin', password: 'Admin12345' });
ok(r.s === 200, 'admin login');
r = await u1.req('/api/auth/register', 'POST', { username: 'u_' + rnd, email: `${rnd}@t.co`, password: 'short' });
ok(r.s === 400, 'รหัสผ่านสั้น -> 400');
r = await u1.req('/api/auth/register', 'POST', { username: 'bad name!', email: `${rnd}@t.co`, password: 'password123' });
ok(r.s === 400, 'ชื่อผู้ใช้มีอักขระต้องห้าม -> 400');
r = await u1.req('/api/auth/register', 'POST', { username: 'u_' + rnd, email: `${rnd}@t.co`, password: 'password123' });
ok(r.s === 200, 'สมัครสมาชิก');
const dup = new Client();
r = await dup.req('/api/auth/register', 'POST', { username: ('U_' + rnd), email: `x${rnd}@t.co`, password: 'password123' });
ok(r.s === 409, 'ชื่อซ้ำ (ไม่สนตัวพิมพ์) -> 409');

console.log('# security');
r = await anon.req('/api/purchase', 'POST', { productId: 1, qty: 1 });
ok(r.s === 401, 'ซื้อโดยไม่ล็อกอิน -> 401');
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: 1 }, { origin: 'https://evil.example' });
ok(r.s === 403, 'CSRF: origin ผิดโดเมน -> 403');
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: 1 }, { origin: null });
ok(r.s === 403, 'CSRF: ไม่มี origin -> 403');
r = await u1.req('/api/admin/stats');
ok(r.s === 403, 'user ธรรมดาเข้า admin API -> 403');
r = await anon.req('/api/admin/stats');
ok(r.s === 401, 'ไม่ล็อกอินเข้า admin API -> 401');
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: 1 });
ok(r.s === 402, 'ยอดเงินไม่พอ -> 402');
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: -3 });
ok(r.s === 400, 'qty ติดลบ -> 400');
const rl = new Client(); let last;
for (let i = 0; i < 8; i++) last = await rl.req('/api/auth/login', 'POST', { username: 'rl_' + rnd, password: 'x' + i });
ok(last.s === 429, 'ลองรหัสผิดหลายครั้ง -> 429 rate limit');

console.log('# topup (PromptPay)');
r = await u1.req('/api/topup', 'POST', { amount: 1 });
ok(r.s === 400, 'เติมต่ำกว่าขั้นต่ำ -> 400');
r = await u1.req('/api/topup', 'POST', { amount: 100 });
ok(r.s === 200 && r.j.topup.qr.startsWith('data:image/png'), 'สร้าง QR ได้');
const t = r.j.topup;
ok(t.payAmount > 10000 && t.payAmount < 10100, `ยอดโอนมีเศษสตางค์ (${t.payAmount / 100})`);
const t2 = (await u1.req('/api/topup', 'POST', { amount: 100 })).j.topup;
ok(t2.payAmount !== t.payAmount, 'ยอดโอนไม่ซ้ำกันระหว่างรายการ');
r = await u1.req(`/api/topup/${t.id}`, 'POST', { ref: 'slip 12:30' });
ok(r.s === 200, 'แจ้งโอนแล้ว');
await u1.req(`/api/topup/${t2.id}`, 'POST', { action: 'cancel' });
r = await admin.req('/api/admin/topups');
ok(r.j.rows.some((x) => x.id === t.id && x.ref === 'slip 12:30'), 'แอดมินเห็นรายการ + เลขอ้างอิง');
r = await admin.req(`/api/admin/topups/${t.id}/approve`, 'POST', {});
ok(r.s === 200, 'แอดมินอนุมัติ');
r = await admin.req(`/api/admin/topups/${t.id}/approve`, 'POST', {});
ok(r.s === 409, 'อนุมัติซ้ำไม่ได้ (กันเครดิตซ้ำ) -> 409');
r = await admin.req(`/api/admin/topups/${t2.id}/approve`, 'POST', {});
ok(r.s === 409, 'อนุมัติรายการที่ยกเลิกแล้วไม่ได้ -> 409');

console.log('# purchase');
let before = await anon.req('/api/search?q=' + encodeURIComponent('คีย์ 1 วัน'));
const p1 = before.j.products.find((p) => p.id === 1);
ok(p1 && p1.stock > 0, `ค้นหาเจอสินค้า stock=${p1?.stock}`);
r = await u1.req('/api/coupon', 'POST', { code: 'NOPE', productId: 1, qty: 1 });
ok(r.s === 400, 'โค้ดส่วนลดผิด -> 400');
await admin.req('/api/admin/coupons', 'POST', { code: 'half' + rnd, type: 'percent', value: 50, max_uses: 1 });
r = await u1.req('/api/coupon', 'POST', { code: 'half' + rnd, productId: 1, qty: 1 });
ok(r.s === 200 && r.j.discount === 600 && r.j.total === 600, 'ตรวจโค้ดลด 50% ของ 12฿ = 6฿');
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: 2, coupon: 'half' + rnd });
ok(r.s === 200 && r.j.items.length === 2 && r.j.total === 1200, `ซื้อ 2 ชิ้นพร้อมโค้ด จ่าย ${r.j?.total / 100}฿ ได้ ${r.j?.items?.length} ชิ้น`);
ok(r.j.balance === 10000 - 1200, 'ยอดคงเหลือถูกต้อง (88฿)');
const delivered = r.j.items;
r = await u1.req('/api/purchase', 'POST', { productId: 1, qty: 1, coupon: 'half' + rnd });
ok(r.s === 400, 'โค้ดจำกัด 1 ครั้ง ใช้ซ้ำไม่ได้');
r = await u1.req('/api/account/orders');
ok(r.j.orders[0].items.length === 2 && r.j.orders[0].items[0] === delivered[0], 'ประวัติออเดอร์มีคีย์ที่ส่งให้');
r = await u1.req('/api/purchase', 'POST', { productId: 7, qty: 1 });
ok(r.s === 409 || r.s === 402, 'สินค้าหมด/เงินไม่พอ ซื้อไม่ได้ (' + r.s + ')');
const after = await anon.req('/api/search?q=' + encodeURIComponent('คีย์ 1 วัน'));
ok(after.j.products.find((p) => p.id === 1).stock === p1.stock - 2, 'สต็อกลดลง 2');

console.log('# race: ซื้อพร้อมกัน 6 คำขอ ด้วยเงินพอซื้อได้ 3 ชิ้น');
const rc = new Client();
await rc.req('/api/auth/register', 'POST', { username: 'rc_' + rnd, email: `rc${rnd}@t.co`, password: 'password123' });
const me = (await admin.req('/api/admin/users')).j.rows.find((x) => x.username === 'rc_' + rnd);
await admin.req(`/api/admin/users/${me.id}/balance`, 'POST', { amount: 15, note: 'test' }); // 15฿ = 3 x 5฿
const rs = await Promise.all(Array.from({ length: 6 }, () => rc.req('/api/purchase', 'POST', { productId: 6, qty: 1 })));
const succ = rs.filter((x) => x.s === 200), bad = rs.filter((x) => x.s === 402);
ok(succ.length === 3 && bad.length === 3, `สำเร็จ ${succ.length} / เงินไม่พอ ${bad.length} (ต้อง 3/3)`);
ok(new Set(succ.map((x) => x.j.items[0])).size === 3, 'ไม่มีคีย์ซ้ำที่ส่งให้ต่างคำขอ');
const bal = (await admin.req('/api/admin/users')).j.rows.find((x) => x.id === me.id).balance;
ok(bal === 0, 'ยอดเงินเหลือ 0 ไม่ติดลบ');

console.log('# admin CRUD');
r = await admin.req('/api/admin/categories', 'POST', { name: 'ทดสอบ ' + rnd, image: '/uploads/x.webp', sort: 9 });
ok(r.s === 200, 'เพิ่มหมวดหมู่'); const cat = r.j.row;
r = await admin.req('/api/admin/categories', 'POST', { name: 'x', image: 'javascript:alert(1)' });
ok(r.s === 400, 'กัน URL รูปแบบ javascript: -> 400');
r = await admin.req('/api/admin/products', 'POST', { name: 'สินค้าทดสอบ', category_id: cat.id, price: 7.5, description: '<script>alert(1)</script>', type: 'normal', active: true });
ok(r.s === 200 && r.j.row.price === 750, 'เพิ่มสินค้า ราคา 7.50฿'); const prod = r.j.row;
r = await admin.req('/api/admin/stock/' + prod.id, 'POST', { lines: 'AAA-1\nAAA-2\n\nAAA-3\n' });
ok(r.j.added === 3, 'เพิ่มสต็อก 3 บรรทัด (ข้ามบรรทัดว่าง)');
r = await anon.req('/store/' + prod.id);
const html = await (await fetch(BASE + '/store/' + prod.id)).text();
ok(html.includes('สินค้าทดสอบ') && !html.includes('<script>alert(1)</script>'), 'หน้าสินค้าแสดงผล + escape HTML ในรายละเอียด');
r = await admin.req('/api/admin/products/' + prod.id, 'PUT', { ...prod, price: 9, name: 'สินค้าทดสอบ2' });
ok(r.s === 200 && r.j.row.price === 900, 'แก้ไขสินค้า');
r = await admin.req('/api/admin/users/' + me.id, 'PATCH', { banned: true });
r = await rc.req('/api/account/orders');
ok(r.s === 401, 'ผู้ใช้ที่ถูกระงับ ใช้ session เดิมไม่ได้');
await admin.req('/api/admin/users/' + me.id, 'PATCH', { banned: false });
r = await admin.req('/api/admin/settings', 'PUT', { shop_name: 'Dolly Hub', tagline: 'x', footer_text: 'y', discord_url: 'javascript:alert(1)', logo: '/a.png', min_topup: 10 });
ok(r.s === 400, 'กัน discord_url แบบ javascript: -> 400');
r = await admin.req('/api/admin/stats');
ok(r.s === 200 && r.j.orders >= 4, 'dashboard stats');
r = await admin.req('/api/admin/products/' + prod.id, 'DELETE');
ok(r.s === 200, 'ลบสินค้า (ไม่มีออเดอร์)');
r = await u1.req('/api/account/password', 'POST', { current: 'password123', next: 'newpassword123' });
ok(r.s === 200, 'เปลี่ยนรหัสผ่าน');
r = await u1.req('/api/auth/logout', 'POST', {});
r = await u1.req('/api/account/orders');
ok(r.s === 401, 'logout แล้วใช้ session เดิมไม่ได้');
r = await u1.req('/api/auth/login', 'POST', { username: 'u_' + rnd, password: 'newpassword123' });
ok(r.s === 200, 'login ด้วยรหัสผ่านใหม่');

console.log(`\nผล: ผ่าน ${pass} / ล้มเหลว ${fail}`);
process.exit(fail ? 1 : 0);
