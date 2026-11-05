// ชื่อที่ห้ามใช้เป็นลิงก์ร้าน (flexozy.site/<ชื่อ>) เพราะชนกับหน้า/เส้นทางของเว็บ
// ไฟล์นี้ไม่ import อะไรเลย เพื่อให้ middleware (Edge) และฝั่งเซิร์ฟเวอร์ใช้ร่วมกันได้
export const RESERVED_SLUGS = new Set([
  // เส้นทางของเว็บ
  'api', 'admin', 'account', 'store', 'privacy', 'shop', 'hub', 'dashboard', 'login', 'register', 'logout',
  '_next', 'uploads', 'favicon.ico', 'og.jpg', 'robots.txt', 'sitemap.xml',
  // ชื่อสงวน
  'www', 's', 'v1', 'discord', 'bot', 'flexozy', 'support', 'help', 'status', 'docs', 'terms', 'favicon', 'robots', 'og',
]);
// (เช่าเว็บ) ชื่อเส้นทางที่เพิ่มเข้ามา ห้ามใช้เป็นลิงก์ร้าน Hub
RESERVED_SLUGS.add('rent'); RESERVED_SLUGS.add('site'); RESERVED_SLUGS.add('tenant');
// (เช่าเว็บ) slug ของหน้าตัวอย่างแม่แบบ — flexozy.site/aurora ฯลฯ
for (const s of ['aurora', 'minimal', 'neon', 'luxe', 'glass', 'pop']) RESERVED_SLUGS.add(s);
