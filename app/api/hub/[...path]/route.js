import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { str, int, safeImage } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { publicDiscord } from '@/lib/discord';
import { slugFromDiscord, cleanEmoji, cleanColor, cleanButtons, mergeButtons, bump, shopProducts, mediaUrl, MAX_PRODUCTS, MAX_STOCK_PER_ADD, MAX_MEDIA_BYTES, FEE_PERCENT } from '@/lib/hub';

export const dynamic = 'force-dynamic';

const toSatang = (v) => {
  const n = Math.round(Number(v) * 100);
  if (!Number.isFinite(n) || n < 1 || n > 1_000_000_00) throw new HttpError(400, 'ราคาไม่ถูกต้อง (0.01 - 1,000,000 บาท)');
  return n;
};
const snowflake = (v, name) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (!/^\d{15,25}$/.test(s)) throw new HttpError(400, `${name}ต้องเป็นตัวเลข 15-25 หลัก (คัดลอกจาก Discord โหมดนักพัฒนา)`);
  return s;
};
const MAGIC = [
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/gif', [0x47, 0x49, 0x46, 0x38]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]],
];

function ownerShop(s, user) {
  if (!s) return null;
  return {
    id: s.id, slug: s.slug, name: s.name, tagline: s.tagline, color: s.color,
    logo_url: s.logo_url, banner_url: s.banner_url,
    logo: mediaUrl(s, 'logo'), banner: mediaUrl(s, 'banner'),
    guild_id: s.guild_id, channel_id: s.channel_id, guild_verified: s.guild_verified, guild_name: s.guild_name,
    bot_in_guild: s.bot_in_guild, bot_note: s.bot_note, bot_seen_at: s.bot_seen_at,
    buttons: mergeButtons(s.buttons), is_public: s.is_public, active: s.active,
    version: Number(s.version),
  };
}

async function handle(req, { params }) {
  const user = await requireUser();
  if (!user.discord_id) throw new HttpError(403, 'ต้องล็อกอินด้วย Discord เท่านั้น');
  const [res, id, act] = (await params).path;
  const m = req.method;
  const shop = await one('SELECT * FROM shops WHERE owner_id=$1', [user.id]);
  const need = () => { if (!shop) throw new HttpError(404, 'ยังไม่ได้สร้างร้าน'); if (!shop.active) throw new HttpError(403, 'ร้านนี้ถูกระงับ'); return shop; };
  const nid = () => int(id, { min: 1, name: 'รหัส' });
  const product = async (pid) => {
    const p = await one('SELECT * FROM shop_products WHERE id=$1 AND shop_id=$2', [pid, need().id]);
    if (!p) throw new HttpError(404, 'ไม่พบสินค้า');
    return p;
  };

  // ---------- ข้อมูลของฉัน ----------
  if (res === 'me' && m === 'GET') {
    const since = Number(new URL(req.url).searchParams.get('since'));
    if (shop && since && since === Number(shop.version)) return json({ unchanged: true, version: since });
    const site = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
    const botId = process.env.BOT_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '';
    return json({
      user: { id: user.id, name: user.display_name || user.discord_name || user.username, discord: publicDiscord(user) },
      shop: ownerShop(shop, user),
      suggestedSlug: shop ? null : slugFromDiscord(user.discord_username || user.username),
      products: shop ? await shopProducts(shop.id) : [],
      urls: shop && {
        page: `${site}/${shop.slug}`,
        api: `${site}/api/v1/shop/${shop.slug}`,
      },
      inviteUrl: botId ? `https://discord.com/oauth2/authorize?client_id=${botId}&scope=bot%20applications.commands&permissions=347136` : '',
      limits: { products: MAX_PRODUCTS, stockPerAdd: MAX_STOCK_PER_ADD }, fee: FEE_PERCENT(),
    });
  }

  // ---------- สร้าง/แก้ร้าน ----------
  if (res === 'shop' && m === 'POST') {
    if (shop) throw new HttpError(409, 'คุณมีร้านอยู่แล้ว');
    const b = await body(req);
    // ลิงก์ร้าน = ชื่อ Discord ของเจ้าของ → flexozy.site/<ชื่อ Discord> (ถ้าชนกับคนอื่นจะต่อเลขสุ่มให้)
    const name = str(b.name || user.discord_name || user.discord_username, { min: 2, max: 40, name: 'ชื่อร้าน' });
    let done = false;
    for (let attempt = 0; attempt < 6 && !done; attempt++) {
      try {
        await q('INSERT INTO shops(owner_id,slug,name) VALUES($1,$2,$3)', [user.id, slugFromDiscord(user.discord_username || user.username, attempt), name]);
        done = true;
      } catch (e) {
        if (e.code !== '23505') throw e;
        if (!/slug/i.test(String(e.constraint || ''))) throw new HttpError(409, 'คุณมีร้านอยู่แล้ว'); // ชนที่เจ้าของ ไม่ใช่ที่ชื่อลิงก์
      }
    }
    if (!done) throw new HttpError(409, 'สร้างลิงก์ร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    return json({ ok: true });
  }

  if (res === 'shop' && m === 'PUT') {
    need();
    const b = await body(req);
    const sets = [], args = [];
    const set = (col, v) => { args.push(v); sets.push(`${col}=$${args.length}`); };
    if ('name' in b) set('name', str(b.name, { min: 2, max: 40, name: 'ชื่อร้าน' }));
    if ('tagline' in b) set('tagline', str(b.tagline, { max: 120, name: 'คำอธิบาย' }));
    if ('color' in b) set('color', cleanColor(b.color));
    if ('is_public' in b) set('is_public', !!b.is_public);
    if ('buttons' in b) set('buttons', JSON.stringify(cleanButtons(b.buttons)));
    if ('logo_url' in b) { set('logo_url', safeImage(b.logo_url)); await q("DELETE FROM shop_media WHERE shop_id=$1 AND kind='logo'", [shop.id]); }
    if ('banner_url' in b) { set('banner_url', safeImage(b.banner_url)); await q("DELETE FROM shop_media WHERE shop_id=$1 AND kind='banner'", [shop.id]); }
    if ('channel_id' in b) set('channel_id', snowflake(b.channel_id, 'ไอดีห้อง'));
    const newGuild = 'guild_id' in b ? snowflake(b.guild_id, 'ไอดีเซิร์ฟเวอร์') : undefined;
    if (!sets.length && newGuild === undefined) return json({ ok: true });
    await tx(async (c) => {
      if (newGuild !== undefined && newGuild !== shop.guild_id) {
        if (newGuild) await c.query('UPDATE shops SET guild_id=NULL,bot_note=$2 WHERE guild_id=$1 AND id<>$3 AND NOT guild_verified', [newGuild, 'เซิร์ฟเวอร์นี้ถูกร้านอื่นยืนยันสิทธิ์แล้ว', shop.id]); // ปล่อยคนที่จองไอดีไว้แต่ยังไม่ผ่านการยืนยัน
        set('guild_id', newGuild); set('guild_verified', false); set('bot_in_guild', false); set('guild_name', ''); set('bot_note', 'รอบอทตรวจสอบเซิร์ฟเวอร์');
      }
      args.push(shop.id);
      try {
        await c.query(`UPDATE shops SET ${sets.join(',')}, version=version+1, updated_at=now() WHERE id=$${args.length}`, args);
      } catch (e) {
        if (e.code === '23505') throw new HttpError(409, 'เซิร์ฟเวอร์นี้ถูกผูกกับร้านอื่นและยืนยันแล้ว');
        throw e;
      }
    });
    return json({ ok: true });
  }

  // ---------- รูปโลโก้ / แบนเนอร์ (อัปโหลด) ----------
  if (res === 'media' && m === 'POST') {
    need();
    const b = await body(req);
    const kind = b.kind === 'banner' ? 'banner' : b.kind === 'logo' ? 'logo' : null;
    const mt = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
    if (!kind || !mt) throw new HttpError(400, 'ไฟล์รูปไม่ถูกต้อง');
    const buf = Buffer.from(mt[2], 'base64');
    if (buf.length < 100 || buf.length > MAX_MEDIA_BYTES) throw new HttpError(400, 'รูปต้องมีขนาดไม่เกิน 1.5 MB');
    const hit = MAGIC.find(([, sig]) => sig.every((v, i) => buf[i] === v));
    if (!hit) throw new HttpError(400, 'รองรับเฉพาะ PNG, JPG, GIF, WEBP');
    await tx(async (c) => {
      await c.query(
        `INSERT INTO shop_media(shop_id,kind,mime,data) VALUES($1,$2,$3,$4)
         ON CONFLICT (shop_id,kind) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data,updated_at=now()`,
        [shop.id, kind, hit[0], buf]
      );
      await c.query(`UPDATE shops SET ${kind}_url='upload' WHERE id=$1`, [shop.id]);
      await bump(c, shop.id);
    });
    return json({ ok: true });
  }
  if (res === 'media' && m === 'DELETE') {
    need();
    const kind = id === 'banner' ? 'banner' : 'logo';
    await tx(async (c) => {
      await c.query('DELETE FROM shop_media WHERE shop_id=$1 AND kind=$2', [shop.id, kind]);
      await c.query(`UPDATE shops SET ${kind}_url='' WHERE id=$1`, [shop.id]);
      await bump(c, shop.id);
    });
    return json({ ok: true });
  }

  // ---------- สินค้า ----------
  if (res === 'products' && !id && m === 'POST') {
    need();
    const b = await body(req);
    const name = str(b.name, { min: 1, max: 80, name: 'ชื่อสินค้า' });
    const price = toSatang(b.price);
    const description = str(b.description, { max: 300, name: 'รายละเอียด' });
    const emoji = cleanEmoji(b.emoji);
    await tx(async (c) => {
      const n = (await c.query('SELECT count(*)::int AS n, coalesce(max(sort),0)::int AS mx FROM shop_products WHERE shop_id=$1', [shop.id])).rows[0];
      if (n.n >= MAX_PRODUCTS) throw new HttpError(400, `เพิ่มสินค้าได้สูงสุด ${MAX_PRODUCTS} รายการ`);
      await c.query('INSERT INTO shop_products(shop_id,name,price,description,emoji,sort) VALUES($1,$2,$3,$4,$5,$6)', [shop.id, name, price, description, emoji, n.mx + 1]);
      await bump(c, shop.id);
    });
    return json({ ok: true });
  }
  if (res === 'products' && id && !act && (m === 'PUT' || m === 'DELETE')) {
    const p = await product(nid());
    if (m === 'DELETE') {
      await tx(async (c) => { await c.query('DELETE FROM shop_products WHERE id=$1', [p.id]); await bump(c, shop.id); });
      return json({ ok: true });
    }
    const b = await body(req);
    await tx(async (c) => {
      await c.query(
        'UPDATE shop_products SET name=$1,price=$2,description=$3,emoji=$4,active=$5 WHERE id=$6',
        [
          'name' in b ? str(b.name, { min: 1, max: 80, name: 'ชื่อสินค้า' }) : p.name,
          'price' in b ? toSatang(b.price) : p.price,
          'description' in b ? str(b.description, { max: 300, name: 'รายละเอียด' }) : p.description,
          'emoji' in b ? cleanEmoji(b.emoji) : p.emoji,
          'active' in b ? !!b.active : p.active,
          p.id,
        ]
      );
      await bump(c, shop.id);
    });
    return json({ ok: true });
  }

  // ---------- สต็อก ----------
  if (res === 'products' && id && act === 'stock') {
    const p = await product(nid());
    if (m === 'GET') {
      const { rows } = await q('SELECT id,content FROM shop_stock WHERE product_id=$1 AND NOT sold ORDER BY id LIMIT 200', [p.id]);
      return json({ items: rows });
    }
    if (m === 'POST') {
      const b = await body(req);
      const lines = [...new Set(String(b.lines || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
      if (!lines.length) throw new HttpError(400, 'ยังไม่ได้ใส่สต็อก (1 บรรทัด = 1 ชิ้น)');
      if (lines.length > MAX_STOCK_PER_ADD) throw new HttpError(400, `เพิ่มได้ครั้งละไม่เกิน ${MAX_STOCK_PER_ADD} ชิ้น`);
      if (lines.some((l) => l.length > 1000)) throw new HttpError(400, 'แต่ละชิ้นยาวได้ไม่เกิน 1000 ตัวอักษร');
      await tx(async (c) => {
        await c.query('INSERT INTO shop_stock(product_id,content) SELECT $1, unnest($2::text[])', [p.id, lines]);
        await bump(c, shop.id);
      });
      return json({ ok: true, added: lines.length });
    }
    if (m === 'DELETE') { // ล้างสต็อกที่ยังไม่ขายทั้งหมด
      await tx(async (c) => { await c.query('DELETE FROM shop_stock WHERE product_id=$1 AND NOT sold', [p.id]); await bump(c, shop.id); });
      return json({ ok: true });
    }
  }
  if (res === 'stock' && id && m === 'DELETE') {
    need();
    await tx(async (c) => {
      const r = await c.query(
        'DELETE FROM shop_stock s USING shop_products p WHERE s.id=$1 AND s.product_id=p.id AND p.shop_id=$2 AND NOT s.sold', [nid(), shop.id]);
      if (!r.rowCount) throw new HttpError(404, 'ไม่พบสต็อกชิ้นนี้');
      await bump(c, shop.id);
    });
    return json({ ok: true });
  }

  // ---------- ออเดอร์ล่าสุด ----------
  if (res === 'orders' && m === 'GET') {
    need();
    const { rows } = await q('SELECT id,product_name,qty,total,fee,buyer_discord_id,created_at FROM shop_orders WHERE shop_id=$1 ORDER BY id DESC LIMIT 30', [shop.id]);
    return json({ orders: rows });
  }

  throw new HttpError(404, 'ไม่พบเส้นทางนี้');
}

export const GET = route(handle);
export const POST = route(handle);
export const PUT = route(handle);
export const DELETE = route(handle);
