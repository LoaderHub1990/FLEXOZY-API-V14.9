# flexozy.site

Next.js 15 (App Router) — หน้าเว็บ + API กลาง + หน้าเครื่องมือเกะ

| Path | หน้าที่ |
|---|---|
| `/` | หน้าหลัก + คัดลอก API + ตัวอย่างโค้ด |
| `/api/v15/lura.ph` | API กลาง (`POST {code}` หรือ multipart `file`) |
| `/lura.ph/v15/deobfuscate` | หน้าเครื่องมือ: ใส่/แนบโค้ด + log |

## สำคัญ: ทำไมต้องมี worker
ตัว deobfuscator ต้องใช้ `luau.exe` / `luau-ast.exe`, Python และรันได้นานเกิน 1 นาที
จึง **รันบน Vercel โดยตรงไม่ได้** เว็บบน Vercel ทำหน้าที่เป็นหน้าบ้าน + API กลาง
แล้วส่งงานต่อไปยัง `worker/server.js` ที่รันบนเครื่อง/VPS ของคุณ

## ติดตั้ง
**1) Worker (เครื่อง Windows/VPS ที่รัน engine ได้)**
```bash
# คัดลอกโปรเจกต์ Deobfuscator-Luraph-V15-master ทั้งหมดไปไว้ที่ worker/engine
WORKER_TOKEN=รหัสลับยาวๆ node worker/server.js   # พอร์ต 8787
```
ใส่ HTTPS ให้ worker (เช่น Cloudflare Tunnel / Caddy) แล้วจดที่อยู่ไว้

**2) Vercel**
- Import repo → ตั้ง Environment Variables: `WORKER_URL`, `WORKER_TOKEN`
- Settings → Domains → เพิ่ม `flexozy.site` แล้วชี้ DNS ตามที่ Vercel แจ้ง (A `76.76.21.21` หรือ CNAME `cname.vercel-dns.com`)

**รันในเครื่อง:** `npm i && npm run dev`
