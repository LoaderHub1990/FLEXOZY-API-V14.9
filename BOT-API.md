# API เดียวสำหรับบอท: https://flexozy.site/api/v1/shop
ทุกคำสั่งส่ง header `Authorization: Bot <fxk_...>` (สร้างที่ /admin → API Key)

| คำสั่ง | ทำอะไร |
|---|---|
| `GET /api/v1/shop` | (บอท) ได้ **ทุกร้านที่ผูกเซิร์ฟเวอร์แล้ว** พร้อมสินค้า/สต็อก/ปุ่ม/อีโมจิ และบล็อก `bot`: `guild_id, channel_id, verified, owner_discord_id, topup{enabled,phone}` → บอทเทียบ `version` แล้วสร้าง/อัปเดตไฟล์ `data/guilds/<guildId>.json` เอง (ร้านใหม่โผล่เองอัตโนมัติ) · คนทั่วไปเห็นเฉพาะรายชื่อสาธารณะ |
| `GET /api/v1/shop/<slug>` | ร้านเดียว (เพิ่ม `?since=<version>` ถ้าไม่เปลี่ยนได้ `{"unchanged":true}`) |
| `POST /api/v1/shop` `{action:"status",guildId,inGuild,verified,guildName,note}` | บอทรายงานสถานะเซิร์ฟเวอร์ |
| `POST /api/v1/shop` `{action:"buy",guildId,productId,qty}` + `X-Discord-Id` | ซื้อสินค้า |
อีโมจิในปุ่ม/สินค้าเป็นรูปแบบ Discord ตรงๆ เช่น `<a:name:123>` (เคลื่อนไหว) ใช้ใส่ปุ่มได้เลย

## รีเมนูใหม่ (panel_nonce)
เจ้าของร้านกดปุ่ม **รีเมนูใหม่** ที่แดชบอร์ด → เว็บเพิ่ม `panel_nonce` ของร้านนั้น +1 และเพิ่ม `version`
- `GET /api/v1/shop` (บอท): ในบล็อก `bot` มี `panel_nonce`
- `GET /api/bot/shops`: แต่ละร้านมี `panelNonce` · `?guild=<id>` ก็มี `panelNonce`

ฝั่งบอท (ใส่ในลูปที่ซิงก์ร้านทุก 5 วิ): เก็บ `panelNonce` ที่โพสต์ล่าสุดไว้ใน `data/guilds/<guildId>.json`
```js
if (shop.bot.panel_nonce !== saved.panelNonce) {
  // 1) ลบข้อความแผงเดิม (saved.messageId) ถ้ายังอยู่ — ลบไม่ได้/ไม่เจอก็ข้ามได้
  // 2) โพสต์แผงใหม่ในห้อง shop.bot.channel_id แล้วเก็บ messageId ใหม่
  // 3) saved.panelNonce = shop.bot.panel_nonce; เขียนไฟล์
}
```
