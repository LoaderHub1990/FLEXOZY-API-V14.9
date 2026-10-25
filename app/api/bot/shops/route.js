import { route, json, body } from '@/lib/api';
import { q, one, HttpError } from '@/lib/db';
import { requireBot } from '@/lib/auth';
import { shopProducts, publicShop } from '@/lib/hub';

export const dynamic = 'force-dynamic';

// บอท: GET /api/bot/shops            → รายการร้านที่ผูกเซิร์ฟเวอร์แล้ว (แบบย่อ + เลขเวอร์ชัน) ใช้เช็กว่ามีอะไรเปลี่ยน
//      GET /api/bot/shops?guild=<id> → ข้อมูลเต็มของร้านนั้น (สินค้า สต็อก ชื่อปุ่ม) ใช้สร้างไฟล์ data ของเซิร์ฟเวอร์
export const GET = route(async (req) => {
  await requireBot();
  const guild = new URL(req.url).searchParams.get('guild');
  if (guild) {
    if (!/^\d{15,25}$/.test(guild)) throw new HttpError(400, 'guild ไม่ถูกต้อง');
    const s = await one(
      `SELECT s.*,u.discord_id AS owner_discord_id FROM shops s JOIN users u ON u.id=s.owner_id WHERE s.guild_id=$1 AND s.active AND NOT u.banned`, [guild]);
    if (!s) throw new HttpError(404, 'ไม่พบร้านของเซิร์ฟเวอร์นี้');
    const origin = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');
    return json({
      ...publicShop(s, await shopProducts(s.id), { origin }),
      guildId: s.guild_id, channelId: s.channel_id, verified: s.guild_verified, ownerDiscordId: s.owner_discord_id, panelNonce: Number(s.panel_nonce || 0),
    });
  }
  const { rows } = await q(
    `SELECT s.id,s.slug,s.guild_id,s.channel_id,s.version,s.guild_verified,s.panel_nonce,u.discord_id AS owner_discord_id
       FROM shops s JOIN users u ON u.id=s.owner_id WHERE s.guild_id IS NOT NULL AND s.active AND NOT u.banned ORDER BY s.id`);
  return json({
    shops: rows.map((r) => ({ id: r.id, slug: r.slug, guildId: r.guild_id, channelId: r.channel_id, version: Number(r.version), verified: r.guild_verified, ownerDiscordId: r.owner_discord_id, panelNonce: Number(r.panel_nonce || 0) })),
  });
});

// บอท: รายงานสถานะเซิร์ฟเวอร์ { guildId, inGuild, verified, guildName, note }  (บอทตรวจแล้วว่าเจ้าของร้านมีสิทธิ์ Manage Server จริง)
export const POST = route(async (req) => {
  await requireBot();
  const b = await body(req);
  const guildId = String(b.guildId || '');
  if (!/^\d{15,25}$/.test(guildId)) throw new HttpError(400, 'guildId ไม่ถูกต้อง');
  const inGuild = !!b.inGuild, verified = !!b.verified;
  const name = String(b.guildName || '').slice(0, 100), note = String(b.note || '').slice(0, 200);
  await q(
    `UPDATE shops SET guild_verified=$2,bot_in_guild=$3,guild_name=$4,bot_note=$5,version=version+1,updated_at=now()
      WHERE guild_id=$1 AND (guild_verified IS DISTINCT FROM $2 OR bot_in_guild IS DISTINCT FROM $3 OR guild_name IS DISTINCT FROM $4 OR bot_note IS DISTINCT FROM $5)`,
    [guildId, verified, inGuild, name, note]
  );
  await q('UPDATE shops SET bot_seen_at=now() WHERE guild_id=$1', [guildId]);
  return json({ ok: true });
});
