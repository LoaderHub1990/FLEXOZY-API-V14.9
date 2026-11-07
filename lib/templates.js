// แม่แบบหน้าเว็บให้ลูกค้าเลือกก่อนเช่า — ดูตัวอย่างได้ที่ https://<โดเมนหลัก>/<slug>
// slug เหล่านี้ถูกสงวนไว้ (ห้ามใช้เป็นชื่อร้าน Hub)
export const EXAMPLE_SUB = 'mystore'; // ชื่อตัวอย่างที่แสดงในหน้าสั่งซื้อ

const L = (label, url = 'https://discord.com') => ({ label, url });
export const TEMPLATES = [
  { slug: 'aurora', taglineEn: 'Quality digital goods, fast delivery and 24/7 after-sales care.', aboutEn: 'A violet-glow demo shop — great for game, premium-app and online-service stores.', name: 'Aurora', desc: 'ออโรร่าเรืองแสง กลางหน้า สะอาดตา เหมาะร้านขายของทั่วไป', theme: 'dark', color: '#8b5cf6', tag: 'ยอดนิยม',
    swatch: ['#0b0716', '#8b5cf6', '#22d3ee'],
    demo: { title: 'Aurora Store', tagline: 'สินค้าดิจิทัลคุณภาพ ส่งไวทันใจ ดูแลหลังการขายตลอด 24 ชม.', about: 'ร้านตัวอย่างโทนม่วงเรืองแสง เหมาะกับร้านเกม แอปพรีเมียม และบริการออนไลน์', links: [L('ทักแชท Discord'), L('LINE Official', 'https://line.me')],
      items: [['Premium 30 วัน', '฿89', 'ใช้งานได้เต็มทุกฟีเจอร์'], ['Premium 90 วัน', '฿229', 'คุ้มกว่า ประหยัด 15%'], ['Lifetime', '฿590', 'จ่ายครั้งเดียว ใช้ตลอดไป'], ['Starter Pack', '฿39', 'เริ่มต้นง่ายๆ ราคาเบา']] } },
  { slug: 'minimal', taglineEn: 'Less, but better — simple design services that get to the point.', aboutEn: 'A clean light template with list-style items, easy to read on any device.', name: 'Minimal', desc: 'ขาว-ดำเรียบหรู ตัวอักษรใหญ่ จัดชิดซ้าย เน้นอ่านง่าย', theme: 'light', color: '#111111', tag: '',
    swatch: ['#fafafa', '#111111', '#a1a1aa'],
    demo: { title: 'Studio Minimal', tagline: 'น้อยแต่ดี — งานออกแบบและบริการที่เรียบง่าย ตรงประเด็น', about: 'แม่แบบโทนสว่าง เรียบ สะอาด จัดเป็นรายการ อ่านง่ายทั้งบนมือถือและคอมพิวเตอร์', links: [L('ติดต่อเรา'), L('Instagram', 'https://instagram.com')],
      items: [['ออกแบบโลโก้', '฿500', 'ส่งไฟล์ครบ แก้ไขได้ 2 ครั้ง'], ['ทำแบนเนอร์', '฿150', 'ขนาดตามต้องการ'], ['ชุดโซเชียล 10 โพสต์', '฿350', 'โทนเดียวกันทั้งชุด']] } },
  { slug: 'neon', taglineEn: '> Game servers, bots and scripts — quick setup, rock solid.', aboutEn: 'A terminal-style template for bot shops, game servers and tech sellers.', name: 'Neon', desc: 'ไซเบอร์พังก์ เส้นกริด ขอบเรืองแสง ฟอนต์โมโนสเปซ', theme: 'dark', color: '#00ff9d', tag: '',
    swatch: ['#020806', '#00ff9d', '#00b4ff'],
    demo: { title: 'NEON//GRID', tagline: '> เซิร์ฟเวอร์เกม บอท และสคริปต์ ติดตั้งไว เสถียร', about: 'แม่แบบสไตล์เทอร์มินัล เหมาะร้านบอท เซิร์ฟเวอร์เกม และสายเทค', links: [L('เข้า Discord'), L('GitHub', 'https://github.com')],
      items: [['Bot Hosting', '฿59/เดือน', 'รันบอท 24/7 ไม่หลุด'], ['VPS Mini', '฿199/เดือน', '2 vCPU · 2GB RAM'], ['Script Pack', '฿99', 'สคริปต์พร้อมใช้ 10 ชุด'], ['Setup Service', '฿150', 'ติดตั้งให้ถึงที่']] } },
  { slug: 'luxe', taglineEn: 'A curated premium collection for those who care about details.', aboutEn: 'A black-and-gold boutique template with elegant serif type for upscale brands.', name: 'Luxe', desc: 'ดำ-ทอง หรูหรา ฟอนต์เซริฟ เหมาะสินค้าพรีเมียม', theme: 'dark', color: '#d4af37', tag: 'พรีเมียม',
    swatch: ['#0a0805', '#d4af37', '#f5e6b3'],
    demo: { title: 'Maison Luxe', tagline: 'คอลเลกชันพรีเมียมคัดสรร สำหรับคนที่ใส่ใจรายละเอียด', about: 'โทนดำทองสไตล์บูติก ตัวอักษรเซริฟสง่างาม เหมาะแบรนด์ที่ต้องการภาพลักษณ์หรู', links: [L('นัดหมาย'), L('LINE', 'https://line.me')],
      items: [['Signature Set', '฿1,290', 'ชุดคัดพิเศษ จำนวนจำกัด'], ['Gift Box', '฿890', 'แพ็กเกจของขวัญพร้อมการ์ด'], ['Private Order', 'สอบถาม', 'สั่งทำตามต้องการ']] } },
  { slug: 'glass', taglineEn: 'New-style apps and services — clean, clear and easy to use.', aboutEn: 'Frosted-glass cards over a soft gradient — light and modern.', name: 'Glass', desc: 'กระจกฝ้าโปร่งแสง พื้นหลังไล่สีนุ่มๆ ดูทันสมัย', theme: 'dark', color: '#38bdf8', tag: '',
    swatch: ['#0f172a', '#38bdf8', '#f472b6'],
    demo: { title: 'Glass Lab', tagline: 'แอปและบริการสไตล์ใหม่ ใสสะอาด ใช้งานง่าย', about: 'การ์ดกระจกโปร่งบนพื้นหลังไล่สี ให้ความรู้สึกเบาและทันสมัย', links: [L('เริ่มใช้งาน'), L('Facebook', 'https://facebook.com')],
      items: [['Basic', '฿49', 'เริ่มต้นสำหรับมือใหม่'], ['Pro', '฿149', 'ฟีเจอร์ครบ ซัพพอร์ตไว'], ['Team', '฿399', 'ใช้ร่วมกันได้ 5 คน'], ['Custom', 'สอบถาม', 'ปรับแต่งตามธุรกิจ']] } },
  { slug: 'pop', taglineEn: 'Cute stuff, great prices, shipped nationwide!', aboutEn: 'A neo-brutalist template with thick borders and bright colors for fun shops.', name: 'Pop', desc: 'สีสดจัดจ้าน ขอบหนา เงาแข็ง สไตล์ป๊อปสนุกๆ', theme: 'light', color: '#ff5c8a', tag: 'สดใส',
    swatch: ['#fff7e6', '#ff5c8a', '#ffd23f'],
    demo: { title: 'Pop Shop!', tagline: 'ของน่ารัก ราคาโดนใจ ส่งทั่วไทย', about: 'แม่แบบสไตล์ neo-brutalism ขอบดำหนา สีสด เหมาะร้านของน่ารัก เกม และอีเวนต์', links: [L('สั่งเลย!'), L('TikTok', 'https://tiktok.com')],
      items: [['Sticker Pack', '฿59', 'สติกเกอร์ 20 ชิ้น'], ['Mystery Box', '฿199', 'สุ่มของจุใจ'], ['Cute Mug', '฿129', 'แก้วลายเฉพาะ'], ['Poster A3', '฿99', 'พิมพ์คมชัด']] } },
  { slug: 'studio', taglineEn: 'Games, apps and premium services — delivered instantly after payment.', aboutEn: 'A classic store layout: light theme, purple accent, Kanit font and product rows grouped by category.',
    name: 'Studio', desc: 'โครงร้านคลาสสิก ธีมสว่าง สีม่วง ฟอนต์ Kanit แยกแถวสินค้าตามหมวดหมู่ ตั้งรูปแบนเนอร์/พื้นหลังได้', theme: 'light', color: '#9c38ff', tag: 'ใหม่', font: 'kanit',
    swatch: ['#ffffff', '#9c38ff', '#e9d5ff'],
    demo: { title: 'Studio Shop', tagline: 'เติมเกม แอปพรีเมียม และบริการออนไลน์ ส่งทันทีหลังชำระเงิน', about: 'ร้านตัวอย่างโครงคลาสสิก แยกหมวดหมู่ชัดเจน เหมาะร้านเติมเกมและสินค้าดิจิทัล', links: [L('ติดต่อแอดมิน'), L('Facebook', 'https://facebook.com')],
      items: [['คีย์เกม Steam', '฿129', 'ส่งคีย์ทันที'], ['เติมเงินเกม 100', '฿99', 'เติมผ่านไอดีเกม'], ['แอป Premium 1 เดือน', '฿59', 'ใช้งานได้ทุกฟีเจอร์'], ['แพ็กโปรโมชั่น', '฿199', 'คุ้มกว่าซื้อแยก'], ['บัตรของขวัญ', '฿300', 'ใช้ได้ทุกร้านพันธมิตร'], ['บริการตั้งค่าให้', '฿150', 'ทีมงานทำให้ถึงที่']] } },
];
export const TEMPLATE_SLUGS = TEMPLATES.map((t) => t.slug);
export const getTemplate = (slug) => TEMPLATES.find((t) => t.slug === slug) || TEMPLATES[0];

/** ค่าเริ่มต้นของเว็บใหม่ตามแม่แบบ (ลูกค้าแก้ทับได้) — สินค้าอยู่ในตาราง t_products ไม่ใช่ใน site */
export function seedSite(slug, sub) {
  const t = getTemplate(slug);
  const d = t.demo;
  return { template: t.slug, title: sub, tagline: d.tagline, about: d.about, logo: '', color: t.color, theme: t.theme, pay_phone: '', font: t.font || '', links: d.links.map((l) => ({ ...l })), items: [] };
}
/** แบนเนอร์ตัวอย่างของร้านทดลอง (SVG) — ร้านจริงของผู้เช่าไม่มีแบนเนอร์จนกว่าจะอัปโหลดเอง */
export function demoBanner(slug) {
  const t = getTemplate(slug); const w = slug === 'studio' ? 2000 : 1972, h = slug === 'studio' ? 500 : 798;
  const light = t.theme === 'light';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.color}"/><stop offset="1" stop-color="${t.swatch[2]}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="${light ? '#faf7ff' : '#06060a'}"/><circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.7}" fill="url(#g)" opacity=".55"/><circle cx="${w * 0.12}" cy="${h * 1.1}" r="${h * 0.6}" fill="url(#g)" opacity=".35"/><text x="${w * 0.07}" y="${h * 0.52}" font-family="Kanit,Inter,sans-serif" font-size="${h * 0.2}" font-weight="800" fill="${light ? '#1c1528' : '#ffffff'}">${t.demo.title.replace(/[<>&]/g, '')}</text><text x="${w * 0.07}" y="${h * 0.7}" font-family="Kanit,Inter,sans-serif" font-size="${h * 0.075}" fill="${light ? '#52525b' : '#d4d4d8'}">${t.taglineEn.replace(/[<>&]/g, '')}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
export function demoSite(slug) {
  const t = getTemplate(slug); const d = t.demo;
  return { template: t.slug, title: d.title, tagline: d.tagline, about: d.about, tagline_en: t.taglineEn, about_en: t.aboutEn, banner: demoBanner(slug), logo: '', color: t.color, theme: t.theme, pay_phone: '', links: d.links, items: [] };
}
/** สินค้าตัวอย่างของร้านทดลอง (สร้างอัตโนมัติ ส่งของแบบสุ่มโค้ดเดโม) */
export function demoCatalog(slug) {
  const t = getTemplate(slug);
  const cats = ['สินค้ายอดนิยม', 'แพ็กเกจพิเศษ'];
  const num = (p) => { const m = String(p).replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : 199; };
  return { categories: cats, products: t.demo.items.map(([name, price, desc], i) => ({ name, desc, price: num(price), cat: i % 2 })) };
}
