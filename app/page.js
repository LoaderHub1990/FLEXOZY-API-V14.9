import Link from 'next/link';
import TermDemo from '@/components/TermDemo';
import { Arrow, Discord } from '@/components/Icons';
export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            <span className="chip"><i />Flexozy Slip API</span>
            <h1 className="big">เช็คสลิปและสร้างลิงก์รับเงิน<br />ผ่าน API เดียว</h1>
            <p className="lead">ตรวจสลิปจาก QR จับสลิปซ้ำ และสร้างหน้าชำระเงินพร้อมเพย์ในไม่กี่บรรทัดโค้ด</p>
            <div className="cta">
              <Link className="btn primary lg" href="/dashboard"><Discord />เริ่มใช้งาน</Link>
              <Link className="btn lg" href="/slip-check">ลองเช็คสลิป</Link>
            </div>
          </div>
          <TermDemo />
        </div>
      </section>
      <section className="wrap">
        <div className="feat rv">
          <Link href="/slip-check" className="card"><h3>เช็คสลิป<Arrow /></h3><p>ส่งรูปสลิป ได้ผลตรวจพร้อมรายการที่ตรวจและ log ทุกขั้นตอน</p></Link>
          <Link href="/slip-create" className="card"><h3>สร้างสลิป<Arrow /></h3><p>ใส่ยอดและเบอร์หรือบัญชี ได้ลิงก์ชำระเงินพร้อม QR</p></Link>
          <Link href="/dashboard" className="card"><h3>แดชบอร์ด<Arrow /></h3><p>ล็อกอิน Discord แล้วสร้างและจัดการ API Key</p></Link>
        </div>
        <h2 style={{ marginTop: 70 }} className="rv">เริ่มใช้งานใน 3 ขั้นตอน</h2>
        <div className="steps">
          <div className="step rv"><b>1</b><h3>ล็อกอิน</h3><p>เข้าสู่ระบบด้วย Discord</p></div>
          <div className="step rv" style={{ '--d': '.1s' }}><b>2</b><h3>สร้าง API Key</h3><p>กดสร้างคีย์ที่แดชบอร์ด</p></div>
          <div className="step rv" style={{ '--d': '.2s' }}><b>3</b><h3>เรียกใช้</h3><p>ส่งคีย์ใน Header x-api-key</p></div>
        </div>
        <div className="band rv">
          <h2>พร้อมลองแล้ว</h2>
          <Link className="btn primary lg" href="/slip-create">สร้างสลิปแรก</Link>
        </div>
      </section>
    </main>
  );
}
