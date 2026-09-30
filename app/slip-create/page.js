import Tester from '@/components/Tester';
import Code from '@/components/Code';
import { createTabs } from '@/lib/docs';
export const metadata = { title: 'API สร้างสลิป — Flexozy' };
export default function Page() {
  return (
    <main className="wrap">
      <span className="chip">POST /api/v1/slip/create</span>
      <h1>API สร้างสลิป</h1>
      <p className="lead">ระบุจำนวนเงิน + ปลายทาง (เบอร์โทร / เลขบัตรประชาชน / e-Wallet / เลขบัญชี) ระบบจะสร้างหน้าคำขอชำระเงินพร้อม QR พร้อมเพย์ และคืนลิงก์รูปแบบ <code>=%fl#S!xxxxxxxxxx</code></p>
      <div className="grid2">
        <div>
          <h2>ตัวอย่างการเรียกใช้</h2>
          <Code tabs={createTabs} />
          <h2>พารามิเตอร์</h2>
          <table className="tbl"><tbody>
            <tr><td className="mono">amount</td><td>number — ยอดเงิน (ทศนิยมไม่เกิน 2 ตำแหน่ง)</td></tr>
            <tr><td className="mono">type</td><td><code>phone</code> · <code>national_id</code> · <code>ewallet</code> · <code>bank_account</code></td></tr>
            <tr><td className="mono">target</td><td>เบอร์ 10 หลัก / บัตร 13 หลัก / e-Wallet 15 หลัก / เลขบัญชี 10-15 หลัก</td></tr>
            <tr><td className="mono">bank</td><td>จำเป็นเมื่อเป็น <code>bank_account</code></td></tr>
            <tr><td className="mono">name</td><td>ไม่บังคับ — ชื่อบัญชีที่แสดงในหน้าชำระเงิน</td></tr>
          </tbody></table>
        </div>
        <Tester endpoint="/api/v1/slip/create" fields={[
          { name: 'type', label: 'ประเภทปลายทาง', def: 'phone', options: [['phone', 'เบอร์โทร (พร้อมเพย์)'], ['national_id', 'เลขบัตรประชาชน'], ['ewallet', 'e-Wallet ID'], ['bank_account', 'เลขบัญชีธนาคาร']] },
          { name: 'target', label: 'เบอร์ / เลขบัตร / เลขบัญชี', ph: '0812345678' },
          { name: 'bank', label: 'ธนาคาร (เฉพาะเลขบัญชี)', ph: 'กสิกรไทย' },
          { name: 'name', label: 'ชื่อบัญชี (ไม่บังคับ)', ph: '' },
          { name: 'amount', label: 'จำนวนเงิน (บาท)', num: true, def: '100', ph: '100' },
        ]} />
      </div>
    </main>
  );
}
