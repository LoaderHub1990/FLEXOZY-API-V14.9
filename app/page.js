import Link from 'next/link';
export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            <span className="chip">FLEXOZY API</span>
            <h1 className="big">สลิปโอนเงิน<br /><em>เช็คและสร้าง</em> ผ่าน API เดียว</h1>
            <p className="lead">ตรวจสอบสลิปจาก QR และสร้างลิงก์ชำระเงินพร้อมพร้อมเพย์ในไม่กี่บรรทัดโค้ด ล็อกอินด้วย Discord แล้วเริ่มใช้งานได้เลย</p>
            <div className="cta"><Link className="btn primary lg" href="/dashboard">เริ่มใช้งาน</Link><Link className="btn ghost lg" href="/slip-check">ดูเอกสาร API</Link></div>
          </div>
          <div className="logo-stage"><img src="/logo.png" alt="Flexozy" /></div>
        </div>
      </section>
      <section className="wrap cards">
        <Link href="/slip-check" className="card"><span className="chip">POST</span><h3>API เช็คสลิป</h3><p>ตรวจ QR บนสลิป, CRC, ธนาคารต้นทาง และสลิปซ้ำ</p></Link>
        <Link href="/slip-create" className="card"><span className="chip">POST</span><h3>API สร้างสลิป</h3><p>ระบุยอด + เบอร์/บัตร/บัญชี ได้ลิงก์ <code>=%fl#S!…</code> พร้อม QR</p></Link>
        <Link href="/dashboard" className="card"><span className="chip">DISCORD</span><h3>แดชบอร์ด</h3><p>ล็อกอินด้วย Discord สร้างและจัดการ API Key</p></Link>
      </section>
    </main>
  );
}
