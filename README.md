# Flexozy — Slip API (Next.js 15)

ระบบเก่า (deobfuscator/worker) ถูกลบทั้งหมด เหลือเฉพาะ: หน้าเว็บ, ล็อกอิน Discord, API เช็คสลิป, API สร้างสลิป

## ตั้งค่า
1. คัดลอก `.env.example` → `.env.local` แล้วกรอกค่า
2. Discord Developer Portal → OAuth2 → Redirects เพิ่ม `https://flexozy.site/api/auth/callback` (และ `http://localhost:3000/api/auth/callback` ตอนทดสอบ)
3. บน Vercel ต้องต่อ **Upstash Redis** (Marketplace) เพื่อเก็บข้อมูลถาวร — ถ้าไม่ต่อ ข้อมูลจะหายเมื่อฟังก์ชันรีสตาร์ท
4. `npm i && npm run dev` (หรือ `npm run build && npm start`)

## API (ส่ง `x-api-key: fx_...`)
- `POST /api/v1/slip/check` — multipart `image=@slip.jpg` หรือ JSON `{ "image": "<base64>" | "payload": "<QR>" }` ตรวจ QR/CRC/สลิปซ้ำ/รูปคล้าย/ร่องรอยแต่งรูป (ทำเองทั้งหมด ไม่พึ่งบริการภายนอก)
- `POST /api/v1/slip/create` — `{ "type": "phone|national_id|ewallet|bank_account", "target": "...", "amount": 100, "bank": "...", "name": "..." }` → `data.link` = `/s/=%fl#S!<id>` (เข้ารหัส URL ให้แล้ว)
