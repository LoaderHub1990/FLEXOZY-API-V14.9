import CreateTester from '@/components/CreateTester';
import Code from '@/components/Code';
import Tabs from '@/components/Tabs';
import { createTabs } from '@/lib/docs';
export const metadata = { title: 'สร้างสลิป — Flexozy' };
const Docs = () => (
  <div className="grid2 docs">
    <div>
      <h2>ตัวอย่างการเรียกใช้</h2>
      <Code tabs={createTabs} />
    </div>
    <div>
      <h2>พารามิเตอร์</h2>
      <table className="tbl"><tbody>
        <tr><td>amount</td><td>ยอดเงิน ทศนิยมไม่เกิน 2 ตำแหน่ง</td></tr>
        <tr><td>type</td><td><code>phone</code> <code>national_id</code> <code>ewallet</code> <code>bank_account</code></td></tr>
        <tr><td>target</td><td>เบอร์ 10 หลัก / บัตร 13 หลัก / e-Wallet 15 หลัก / เลขบัญชี 10-15 หลัก</td></tr>
        <tr><td>bank</td><td>ใช้เมื่อ type เป็น bank_account</td></tr>
        <tr><td>name</td><td>ชื่อบัญชีที่แสดงในหน้าชำระเงิน</td></tr>
      </tbody></table>
      <h2>ผลลัพธ์ (data)</h2>
      <table className="tbl"><tbody>
        <tr><td>link</td><td>ลิงก์หน้าชำระเงิน รูปแบบ =%fl#S!xxxxxxxxxx</td></tr>
        <tr><td>code / id</td><td>รหัสอ้างอิงของสลิป</td></tr>
        <tr><td>qrPayload</td><td>ข้อความ QR พร้อมเพย์ (ไม่มีเมื่อเป็นเลขบัญชี)</td></tr>
      </tbody></table>
    </div>
  </div>
);
export default function Page() {
  return (
    <main className="wrap">
      <div className="head"><span className="chip"><i />POST /api/v1/slip/create</span><h1>สร้างสลิป</h1><p className="lead">ใส่ยอดและปลายทาง ได้หน้าชำระเงินพร้อม QR และลิงก์แชร์</p></div>
      <Tabs tabs={[['test', 'ทดสอบ', <CreateTester key="t" />], ['docs', 'เอกสาร API', <Docs key="d" />]]} />
    </main>
  );
}
