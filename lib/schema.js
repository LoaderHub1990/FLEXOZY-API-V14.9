import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import seed from '../seed.json';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uq ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email));
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_decoration TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_banner TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_accent TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_frame BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS user_media (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_discord_uq ON users (discord_id) WHERE discord_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'normal',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sold_base INT NOT NULL DEFAULT 0,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INT NOT NULL,
  unit_price BIGINT NOT NULL,
  discount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  coupon_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, id DESC);
CREATE INDEX IF NOT EXISTS orders_recent_idx ON orders (id DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_recent_idx ON reviews (id DESC);

-- สินค้าประเภท “คีย์อัตโนมัติ” (type='key'): สุ่มคีย์ตอนซื้อ ตั้งอายุได้ต่อแพ็ก
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT 'FLEXOZY';
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_seconds BIGINT NOT NULL DEFAULT 86400;
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_start TEXT NOT NULL DEFAULT 'activate';
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_hwid BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS license_keys (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  seconds BIGINT NOT NULL DEFAULT 0,
  hwid_lock BOOLEAN NOT NULL DEFAULT FALSE,
  hwid TEXT,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL DEFAULT '',
  last_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS roblox_id BIGINT;
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS roblox_name TEXT;
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS roblox_display TEXT;
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS roblox_avatar TEXT;
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS roblox_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS license_keys_order_idx ON license_keys (order_id);
CREATE INDEX IF NOT EXISTS license_keys_product_idx ON license_keys (product_id);

CREATE TABLE IF NOT EXISTS stock_items (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sold BOOLEAN NOT NULL DEFAULT FALSE,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_prod_idx ON stock_items (product_id, sold);
CREATE INDEX IF NOT EXISTS stock_order_idx ON stock_items (order_id);

CREATE TABLE IF NOT EXISTS topups (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  pay_amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ref TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by INT
);
CREATE INDEX IF NOT EXISTS topups_user_idx ON topups (user_id, id DESC);
CREATE INDEX IF NOT EXISTS topups_status_idx ON topups (status);

CREATE TABLE IF NOT EXISTS truemoney_topups (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  error_code TEXT
);
CREATE INDEX IF NOT EXISTS truemoney_topups_user_idx ON truemoney_topups (user_id, id DESC);

-- เติมเงินผ่านสลิปธนาคาร (ตรวจด้วย EasySlip) — trans_ref ห้ามซ้ำ = สลิปใบเดียวใช้ได้ครั้งเดียว
CREATE TABLE IF NOT EXISTS slip_topups (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trans_ref TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'credited',
  sender_name TEXT NOT NULL DEFAULT '',
  sender_bank TEXT NOT NULL DEFAULT '',
  slip_at TIMESTAMPTZ,
  img_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS slip_topups_user_idx ON slip_topups (user_id, id DESC);
CREATE INDEX IF NOT EXISTS slip_topups_hash_idx ON slip_topups (img_hash);

CREATE TABLE IF NOT EXISTS wallet_tx (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'percent',
  value BIGINT NOT NULL,
  max_uses INT,
  used INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  code TEXT PRIMARY KEY,
  amount BIGINT NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  used INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redeem_uses (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL REFERENCES redeem_codes(code) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, user_id)
);
CREATE INDEX IF NOT EXISTS redeem_uses_user_idx ON redeem_uses (user_id, id DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- API key สำหรับบอท/ระบบภายนอก สร้างจากหลังบ้าน เก็บเฉพาะ hash (เห็นคีย์เต็มครั้งเดียวตอนสร้าง) เพิกถอนได้ทันที
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_hint TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attempts (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_key_idx ON attempts (key, at);
-- ===== Hub: ร้านค้าบอท Discord สำหรับบุคคลทั่วไป (flexozy.site/shop) =====
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#8b6cf0',
  logo_url TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  guild_id TEXT,
  channel_id TEXT,
  guild_verified BOOLEAN NOT NULL DEFAULT FALSE,
  guild_name TEXT NOT NULL DEFAULT '',
  bot_in_guild BOOLEAN NOT NULL DEFAULT FALSE,
  bot_note TEXT NOT NULL DEFAULT '',
  bot_seen_at TIMESTAMPTZ,
  buttons JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shops_slug_uq ON shops (lower(slug));
CREATE UNIQUE INDEX IF NOT EXISTS shops_guild_uq ON shops (guild_id) WHERE guild_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS shop_media (
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, kind)
);
CREATE TABLE IF NOT EXISTS shop_products (
  id SERIAL PRIMARY KEY,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price > 0),
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_products_shop_idx ON shop_products (shop_id, sort, id);
CREATE TABLE IF NOT EXISTS shop_stock (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sold BOOLEAN NOT NULL DEFAULT FALSE,
  order_id INT,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_stock_prod_idx ON shop_stock (product_id, sold);
CREATE TABLE IF NOT EXISTS shop_orders (
  id SERIAL PRIMARY KEY,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id INT,
  product_name TEXT NOT NULL,
  buyer_id INT NOT NULL REFERENCES users(id),
  buyer_discord_id TEXT,
  qty INT NOT NULL,
  total BIGINT NOT NULL,
  fee BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_orders_shop_idx ON shop_orders (shop_id, id DESC);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS topup_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS topup_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS panel_nonce BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS panel_requested_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS discord_oauth (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
`;

export const DEFAULT_SETTINGS = {
  shop_name: 'Flexozy Hub',
  tagline: 'บริการทันใจ สคริปต์ จากค่าย Flexozy Hub',
  footer_text: 'Flexozy Hub - บริการทันใจ',
  announce_text: 'ยินดีต้อนรับสู่ Flexozy Store — สคริปต์/คีย์อัตโนมัติ ส่งทันทีหลังชำระเงิน ติดต่อทีมงานได้ที่ Discord',
  banner_image: '/banner.webp',
  discord_url: 'https://discord.gg/WFUejxeggt',
  logo: '/uploads/logo/1792030000000-flexozy.webp',
  min_topup: '10',
  topup_promptpay_enabled: '1',
  topup_truemoney_enabled: '1',
  discord_widget_id: '1491087978800611530',
  popup_enabled: '1',
  popup_items: '[]',
  popup_version: '1',
  meta_title: 'Flexozy Hub',
  meta_description: 'บริการอย่างรวดเร็ว มีคุณภาพ บริการจำหน่ายโค้ดบอทต่างๆ',
  og_image: '/og.jpg',
};

// เพิ่มตาราง/คอลัมน์ใหม่เมื่อไหร่ ให้เปลี่ยนเลขเวอร์ชันนี้ 1 ครั้ง (ระบบจะรัน DDL ใหม่แค่ครั้งเดียวต่อเวอร์ชัน)
// เดิม: ทุก cold start รัน ALTER TABLE ~20 คำสั่ง (ล็อกตาราง users/products/license_keys) + insert ค่าตั้งต้นทีละบรรทัด
// ทำให้ทุกหน้ารอคิว/ค้าง "กำลังโหลด…" หลัง deploy หรือหลังเว็บหลับ
const SCHEMA_VERSION = '2026-10-29-redeem1';

export async function ensureSchema(pool) {
  // ทางลัด: ถ้าฐานข้อมูลเป็นเวอร์ชันล่าสุดแล้ว ใช้แค่ 1 query แล้วจบ
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key='schema_version'");
    if (r.rows[0] && r.rows[0].value === SCHEMA_VERSION) return;
  } catch (e) {
    if (e.code !== '42P01') throw e; // 42P01 = ยังไม่มีตาราง settings (ฐานข้อมูลใหม่) → ไปสร้างต่อด้านล่าง
  }
  const client = await pool.connect();
  try {
    // กัน cold start หลายตัวสร้างตารางพร้อมกัน
    await client.query('SELECT pg_advisory_lock(7272001)');
    try {
      // อาจมีตัวอื่นทำเสร็จระหว่างรอล็อก
      try {
        const r = await client.query("SELECT value FROM settings WHERE key='schema_version'");
        if (r.rows[0] && r.rows[0].value === SCHEMA_VERSION) return;
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }
      await client.query(DDL);
      const entries = Object.entries(DEFAULT_SETTINGS);
      await client.query(
        `INSERT INTO settings(key,value) SELECT * FROM unnest($1::text[],$2::text[]) ON CONFLICT DO NOTHING`,
        [entries.map((e) => e[0]), entries.map((e) => e[1])]
      );
      await migrateBrand(client);
      await migrateLogo(client);
      await seedAdmin(client);
      await seedDemo(client);
      await client.query(
        `INSERT INTO settings(key,value) VALUES('schema_version',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [SCHEMA_VERSION]
      );
    } finally {
      await client.query('SELECT pg_advisory_unlock(7272001)');
    }
  } finally {
    client.release();
  }
}

// ย้ายแบรนด์เป็น Flexozy Hub — เขียนทับค่าเก่าในฐานข้อมูลครั้งเดียว แล้วจดไว้ว่าทำแล้ว
// (รอบต่อไปไม่ทับอีก แก้ใน /admin ได้ตามปกติ) ถ้าจะบังคับย้ายอีกครั้งให้เปลี่ยนชื่อ key เป็น v3
const BRAND_MIGRATION_KEY = 'brand_migrated_flexozy_v2';
const BRAND_KEYS = ['shop_name', 'tagline', 'footer_text', 'discord_url', 'discord_widget_id', 'logo'];

async function migrateBrand(client) {
  const done = await client.query('SELECT 1 FROM settings WHERE key=$1', [BRAND_MIGRATION_KEY]);
  if (done.rows.length) return;
  for (const k of BRAND_KEYS) {
    await client.query(
      'INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',
      [k, DEFAULT_SETTINGS[k]]
    );
  }
  await client.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING', [BRAND_MIGRATION_KEY, '1']);
}

// เปลี่ยนโลโก้เป็นอันใหม่ครั้งเดียว — เปลี่ยนเฉพาะถ้ายังเป็นโลโก้เริ่มต้นเดิม (ถ้าแอดมินตั้งโลโก้เองไว้จะไม่แตะ)
const OLD_LOGOS = ['/uploads/logo/1791190000000-flexozy.webp'];
async function migrateLogo(client) {
  const done = await client.query("SELECT 1 FROM settings WHERE key='logo_migrated_v3'");
  if (done.rows.length) return;
  await client.query('UPDATE settings SET value=$1 WHERE key=\'logo\' AND value = ANY($2::text[])', [DEFAULT_SETTINGS.logo, OLD_LOGOS]);
  await client.query("INSERT INTO settings(key,value) VALUES('logo_migrated_v3','1') ON CONFLICT DO NOTHING");
}

async function seedAdmin(client) {
  const { rows } = await client.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
  if (rows.length) return;
  const u = (process.env.ADMIN_USERNAME || '').trim();
  const p = process.env.ADMIN_PASSWORD || '';
  if (!u || p.length < 8) {
    console.warn('[flexozy-hub] ยังไม่มีแอดมิน: ตั้ง ADMIN_USERNAME และ ADMIN_PASSWORD (>=8 ตัว) ใน Environment Variables');
    return;
  }
  const hash = await bcrypt.hash(p, 10);
  await client.query(
    `INSERT INTO users(username,email,password_hash,role) VALUES($1,$2,$3,'admin')
     ON CONFLICT DO NOTHING`,
    [u, `${u.toLowerCase()}@admin.local`, hash]
  );
}

async function seedDemo(client) {
  if (process.env.SEED_DEMO === '0') return;
  const { rows } = await client.query('SELECT 1 FROM categories LIMIT 1');
  const done = await client.query("SELECT 1 FROM settings WHERE key='seeded'");
  if (rows.length || done.rows.length) return;
  const catId = {};
  for (const c of seed.categories) {
    const r = await client.query('INSERT INTO categories(name,image,sort) VALUES($1,$2,$3) RETURNING id', [
      c.name,
      `/uploads/categories/${c.image}.webp`,
      c.sort,
    ]);
    catId[c.name] = r.rows[0].id;
  }
  for (const p of seed.products) {
    await client.query(
      `INSERT INTO products(id,category_id,name,price,image,description,type,sold_base,sort)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [p.id, catId[p.category], p.name, p.price * 100, `/uploads/products/${p.image}.webp`, p.desc, p.type, p.sold, p.sort]
    );
    if (process.env.SEED_DEMO_STOCK === '1') {
      const vals = [];
      const params = [];
      for (let i = 0; i < p.stock; i++) {
        params.push(p.id, `DEMO-${p.id}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`);
        vals.push(`($${params.length - 1},$${params.length})`);
      }
      if (vals.length) await client.query(`INSERT INTO stock_items(product_id,content) VALUES ${vals.join(',')}`, params);
    }
  }
  await client.query("SELECT setval(pg_get_serial_sequence('products','id'), (SELECT max(id) FROM products))");
  await client.query("INSERT INTO settings(key,value) VALUES('seeded','1') ON CONFLICT DO NOTHING");
}
