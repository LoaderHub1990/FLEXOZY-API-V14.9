import Tester from '@/components/Tester';
import Code from '@/components/Code';
import { checkTabs } from '@/lib/docs';
export const metadata = { title: 'API เช็คสลิป — Flexozy' };
export default function Page() {
  return (
    <main className="wrap">
      <span className="chip">POST /api/v1/slip/check</span>
      <h1>API เช็คสลิป</h1>
      <p className="lead">ส่งข้อความจาก QR บนสลิปโอนเงิน ระบบจะตรวจโครงสร้าง, CRC, ธนาคารต้นทาง, เลขอ้างอิง และเช็คว่าสลิปนี้เคยถูกตรวจซ้ำหรือไม่ (<code>alreadyChecked</code>)</p>
      <div className="grid2">
        <div>
          <h2>ตัวอย่างการเรียกใช้</h2>
          <Code tabs={checkTabs} />
          <h2>พารามิเตอร์</h2>
          <table className="tbl"><tbody>
            <tr><td className="mono">x-api-key</td><td>Header — API Key จากแดชบอร์ด</td></tr>
            <tr><td className="mono">payload</td><td>string, จำเป็น — ข้อความ QR บนสลิป</td></tr>
            <tr><td className="mono">amount</td><td>number, ไม่บังคับ — ใช้เทียบยอดเมื่อเปิดตัวตรวจสลิปจริง</td></tr>
          </tbody></table>
          <p className="hint">หมายเหตุ: การยืนยันกับธนาคารจริง (<code>verified</code>) ต้องตั้งค่า <code>SLIP_VERIFY_TOKEN</code> ฝั่งเซิร์ฟเวอร์ ถ้าไม่ตั้งจะตรวจเฉพาะรูปแบบ/CRC/ซ้ำ</p>
        </div>
        <Tester endpoint="/api/v1/slip/check" fields={[{ name: 'payload', label: 'payload (QR บนสลิป)', area: true, ph: '004100060000010103014022...' }, { name: 'amount', label: 'amount (ไม่บังคับ)', num: true, ph: '199.50' }]} />
      </div>
    </main>
  );
}
