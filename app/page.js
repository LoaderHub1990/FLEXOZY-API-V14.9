import Link from 'next/link';
import CopyButton from '../components/CopyButton';
import CodeTabs from '../components/CodeTabs';
import { API_URL, TOOL_URL } from '../lib/config';

const routes = [
  ['/', 'หน้าหลัก แนะนำและวิธีใช้ API'],
  ['/api/v15/lura.ph', 'API กลางตัวเดียว (POST)'],
  ['/lura.ph/v15/deobfuscate', 'หน้าเครื่องมือเกะ: ใส่/แนบโค้ด + log'],
];
const steps = [
  ['01', 'คัดลอก API', 'กดคัดลอกลิงก์ API ด้านล่าง มีลิงก์เดียวใช้ได้ทุกกรณี'],
  ['02', 'ส่งโค้ด', 'POST JSON ที่มีฟิลด์ code หรืออัปโหลดไฟล์ .lua / .luau / .txt'],
  ['03', 'รับผลลัพธ์', 'ได้โค้ดที่เกะแล้วพร้อม log ทั้งหมดกลับมาในคำตอบเดียว'],
];

export default function Home() {
  return (
    <main className="wrap">
      <section className="hero fade">
        <span className="badge">LURAPH V15</span>
        <h1>เกะสคริปต์ Luraph<br />ให้อ่านออกอีกครั้ง</h1>
        <p className="sub">เว็บเครื่องมือ + API ตัวเดียว ใช้ง่าย ผลลัพธ์เป็นระเบียบ พร้อม log แบบเรียลไทม์</p>
        <div className="row center">
          <Link href="/lura.ph/v15/deobfuscate" className="btn primary">เริ่มเกะเลย →</Link>
          <a href="#api" className="btn">ดู API</a>
        </div>
      </section>

      <section className="grid3 fade">
        {steps.map(([n, t, d]) => (
          <div className="card" key={n}><div className="num">{n}</div><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>

      <section id="api" className="fade">
        <h2>API</h2>
        <p className="muted">ใช้ลิงก์เดียวนี้ ไม่ต้องมี key</p>
        <div className="card static apibox">
          <span className="method">POST</span>
          <code className="url">{API_URL}</code>
          <CopyButton text={API_URL} label="คัดลอก API" className="primary" />
        </div>
        <h3 className="mt">ตัวอย่างการใช้งาน</h3>
        <CodeTabs />
        <div className="card static mt">
          <h3>รูปแบบ Response</h3>
          <pre className="code">{`{
  "ok": true,
  "output": "-- โค้ดที่เกะแล้ว",
  "logs": ["[*] obfuscator: Luraph v15 (detected, 0.98)", "..."]
}`}</pre>
        </div>
      </section>

      <section className="fade">
        <h2>เส้นทางทั้งหมด</h2>
        <div className="routes">
          {routes.map(([p, d]) => (
            <div className="card route" key={p}><code>{p}</code><span className="muted">{d}</span></div>
          ))}
        </div>
      </section>
    </main>
  );
}
