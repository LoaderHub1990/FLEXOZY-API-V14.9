import CheckTester from '@/components/CheckTester';
import Code from '@/components/Code';
import Tabs from '@/components/Tabs';
import { checkTabs } from '@/lib/docs';
export const metadata = { title: 'เช็คสลิป — Flexozy' };
const R = [
  ['status', 'ok · duplicate · suspicious · invalid'],
  ['risk', 'คะแนนความเสี่ยง 0-100'],
  ['checks', 'รายการที่ตรวจ พร้อมสถานะ pass / warn / fail / skip'],
  ['log', 'log ทีละขั้นตอนพร้อมเวลา'],
  ['flags', 'รหัสเหตุผล เช่น duplicate_ref, crc_invalid, edited_software'],
  ['transRef / sendingBank', 'เลขอ้างอิงและธนาคารต้นทางจาก QR'],
  ['duplicate', 'byYou · byOthers · count · firstSeenAt'],
  ['similarImage', 'รูปคล้ายสลิปอื่นแต่เลขอ้างอิงต่างกัน'],
];
const Docs = () => (
  <div className="grid2 docs">
    <div>
      <h2>ตัวอย่างการเรียกใช้</h2>
      <Code tabs={checkTabs} />
    </div>
    <div>
      <h2>พารามิเตอร์</h2>
      <table className="tbl"><tbody>
        <tr><td>image</td><td>ไฟล์ PNG/JPG (multipart) หรือ base64 (JSON) ไม่เกิน 4MB</td></tr>
        <tr><td>payload</td><td>ข้อความ QR แทนการส่งรูป</td></tr>
        <tr><td>amount</td><td>ยอดที่ต้องการยืนยัน ใช้เทียบกับยอดใน QR พร้อมเพย์</td></tr>
        <tr><td>register</td><td>false = ตรวจเฉย ๆ ไม่บันทึก (ค่าเริ่มต้น true)</td></tr>
        <tr><td>maxAgeDays</td><td>ถ้าเลขอ้างอิงเก่ากว่านี้ จะติดธง too_old</td></tr>
      </tbody></table>
      <h2>ผลลัพธ์ (data)</h2>
      <table className="tbl"><tbody>{R.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
    </div>
  </div>
);
export default function Page() {
  return (
    <main className="wrap">
      <div className="head"><span className="chip"><i />POST /api/v1/slip/check</span><h1>เช็คสลิป</h1><p className="lead">อ่าน QR ตรวจ CRC จับสลิปซ้ำและรูปแต่ง แล้วสรุปเป็นคะแนนความเสี่ยง</p></div>
      <Tabs tabs={[['test', 'ทดสอบ', <CheckTester key="t" />], ['docs', 'เอกสาร API', <Docs key="d" />]]} />
    </main>
  );
}
