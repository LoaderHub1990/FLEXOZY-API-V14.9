# API เดียวสำหรับบอท: https://flexozy.site/api/v1/shop
ทุกคำสั่งส่ง header `Authorization: Bot <fxk_...>` (สร้างที่ /admin → API Key)

| คำสั่ง | ทำอะไร |
|---|---|
| `GET /api/v1/shop` | (บอท) ได้ **ทุกร้านที่ผูกเซิร์ฟเวอร์แล้ว** พร้อมสินค้า/สต็อก/ปุ่ม/อีโมจิ และบล็อก `bot`: `guild_id, channel_id, verified, owner_discord_id, topup{enabled,phone}` → บอทเทียบ `version` แล้วสร้าง/อัปเดตไฟล์ `data/guilds/<guildId>.json` เอง (ร้านใหม่โผล่เองอัตโนมัติ) · คนทั่วไปเห็นเฉพาะรายชื่อสาธารณะ |
| `GET /api/v1/shop/<slug>` | ร้านเดียว (เพิ่ม `?since=<version>` ถ้าไม่เปลี่ยนได้ `{"unchanged":true}`) |
| `POST /api/v1/shop` `{action:"status",guildId,inGuild,verified,guildName,note}` | บอทรายงานสถานะเซิร์ฟเวอร์ |
| `POST /api/v1/shop` `{action:"buy",guildId,productId,qty}` + `X-Discord-Id` | ซื้อสินค้า |
อีโมจิในปุ่ม/สินค้าเป็นรูปแบบ Discord ตรงๆ เช่น `<a:name:123>` (เคลื่อนไหว) ใช้ใส่ปุ่มได้เลย
