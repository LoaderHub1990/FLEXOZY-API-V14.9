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

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_key_idx ON attempts (key, at);
`;

export const DEFAULT_SETTINGS = {
  shop_name: 'Flexozy Hub',
  tagline: 'บริการทันใจ สคริปต์ จากค่าย Flexozy Hub',
  footer_text: 'Flexozy Hub - บริการทันใจ',
  discord_url: 'https://discord.gg/WFUejxeggt',
  logo: '/uploads/logo/1791190000000-flexozy.webp',
  min_topup: '10',
  topup_promptpay_enabled: '1',
  topup_truemoney_enabled: '1',
  discord_widget_id: '1491087978800611530',
  popup_enabled: '1',
  popup_items: '[]',
  popup_version: '1',
};

export async function ensureSchema(pool) {
  const client = await pool.connect();
  try {
    // กัน cold start หลายตัวสร้างตารางพร้อมกัน
    await client.query('SELECT pg_advisory_lock(7272001)');
    try {
      await client.query(DDL);
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        await client.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING', [k, v]);
      }
      await migrateBrand(client);
      await seedAdmin(client);
      await seedDemo(client);
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
