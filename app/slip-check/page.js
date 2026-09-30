import Tester from '@/components/Tester';
import Code from '@/components/Code';
import { checkTabs } from '@/lib/docs';
export const metadata = { title: 'API เช็คสลิป — Flexozy' };
const R = [
  ['status', 'ok · duplicate · suspicious · invalid'],
  ['risk', 'คะแนนความเสี่ยง 0-100'],
  ['flags', 'รายการเหตุผล เช่น duplicate_ref, duplicate_image, similar_image_other_ref, edited_software, used_elsewhere, ref_date_in_future, unknown_bank, crc_invalid, qr_not_found'],
  ['transRef / sendingBank', 'เลขอ้างอิงและรหัสธนาคารต้นทางที่อ่านจาก QR'],
  ['duplicate', 'byYou (คุณเคยเช็ค) · byOthers (ผู้ใช้อื่นเคยเช็ค) · count · firstSeenAt'],
  ['similarImage', 'พบรูปคล้ายสลิปอื่นแต่เลขอ้างอิงต่างกัน (สัญญาณเสริม ไม่ตัดสินเดี่ยว ๆ)'],
];
export default function Page() {
  return (
    <main className="wrap">
      <span className="chip">POST /api/v1/slip/check</span>
      <h1>API เช็คสลิป</h1>
      <p className="lead">ระบบตรวจสลิปของ Flexozy เอง: อ่าน QR จากรูป, ตรวจ CRC และโครงสร้าง, จับสลิปซ้ำทั้งจากเลขอ้างอิง ไฟล์รูป และรูปที่หน้าตาเหมือนกัน, ตรวจร่องรอยโปรแกรมแต่งรูป แล้วสรุปเป็นคะแนนความเสี่ยง</p>
      <div className="grid2">
        <div>
          <h2>ตัวอย่างการเรียกใช้</h2>
          <Code tabs={checkTabs} />
          <h2>พารามิเตอร์</h2>
          <table className="tbl"><tbody>
            <tr><td className="mono">image</td><td>ไฟล์ PNG/JPG (multipart) หรือ base64 (JSON) ไม่เกิน ~4MB</td></tr>
            <tr><td className="mono">payload</td><td>ข้อความ QR แทนการส่งรูปได้ (ตรวจซ้ำจากเลขอ้างอิงอย่างเดียว)</td></tr>
            <tr><td className="mono">register</td><td>false = ตรวจเฉย ๆ ไม่บันทึกว่าใช้แล้ว (ค่าเริ่มต้น true)</td></tr>
            <tr><td className="mono">maxAgeDays</td><td>ถ้าวันที่ในเลขอ้างอิงเก่ากว่านี้ จะติดธง too_old</td></tr>
          </tbody></table>
          <h2>ผลลัพธ์ (data)</h2>
          <table className="tbl"><tbody>{R.map((r) => <tr key={r[0]}><td className="mono">{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
          <p className="hint">ข้อจำกัด: QR บนสลิปมีแค่ธนาคารต้นทางกับเลขอ้างอิง ไม่มียอดเงินหรือบัญชีปลายทาง และระบบนี้ไม่ได้ถามธนาคาร จึงยืนยันไม่ได้ 100% ว่าเงินเข้าจริง ควรใช้ร่วมกับการเช็คยอดเข้าบัญชีของคุณ</p>
        </div>
        <Tester endpoint="/api/v1/slip/check" fields={[{ name: 'image', label: 'รูปสลิป (PNG/JPG)', file: true }, { name: 'payload', label: 'หรือ payload จาก QR (ไม่บังคับ)', area: true, ph: '0041000600000101030140220...' }, { name: 'register', label: 'บันทึกว่าใช้แล้ว?', def: 'true', options: [['true', 'บันทึก (ค่าเริ่มต้น)'], ['false', 'ตรวจเฉย ๆ ไม่บันทึก']] }]} />
      </div>
    </main>
  );
}
