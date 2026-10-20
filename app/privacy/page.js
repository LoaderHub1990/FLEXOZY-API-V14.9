import { getSettings } from '@/lib/shop';
import CookieSettingsButton from '@/components/CookieSettingsButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'นโยบายความเป็นส่วนตัว' };

export default async function Privacy() {
  const s = await getSettings();
  return (
    <div className="wrap prose" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>นโยบายความเป็นส่วนตัวและคุกกี้</h1>
      <p className="muted" style={{ marginTop: 6 }}>ของร้าน {s.shop_name} · จัดทำตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>

      <h2>ข้อมูลที่เราจัดเก็บ</h2>
      <p>เมื่อคุณสมัครสมาชิกหรือสั่งซื้อ ระบบจะเก็บข้อมูลบัญชี (ชื่อผู้ใช้ อีเมล และรหัสผ่านแบบแฮชทางเดียว) ประวัติการสั่งซื้อและการเติมเงิน เพื่อให้บริการตามที่คุณร้องขอเท่านั้น หมายเลข IP จะถูกใช้ชั่วคราวเพื่อจำกัดจำนวนครั้งที่ลองเข้าสู่ระบบ ป้องกันการเดารหัสผ่าน</p>

      <h2>คุกกี้ที่เราใช้</h2>
      <p>เว็บไซต์นี้<b>ไม่มี</b>คุกกี้โฆษณา และไม่มีการติดตามพฤติกรรมข้ามเว็บไซต์ใด ๆ</p>
      <div className="table-w" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>ใช้เพื่อ</th><th>ประเภท</th><th>อายุ</th><th>รายละเอียด</th></tr></thead>
          <tbody>
            <tr><td>การเข้าสู่ระบบ</td><td>จำเป็น</td><td>สูงสุด 7 วัน</td><td>คุกกี้ HttpOnly สำหรับ Session ที่เพิกถอนได้ (ออกจากระบบแล้วใช้ต่อไม่ได้)</td></tr>
            <tr><td>ตัวเลือกคุกกี้ของคุณ</td><td>จำเป็น</td><td>1 ปี</td><td>จดจำการตั้งค่าคุกกี้ที่คุณเลือกไว้ จะได้ไม่ถามซ้ำ</td></tr>
            <tr><td>ความเร็วเว็บไซต์</td><td>ประสิทธิภาพ (เลือกได้)</td><td>หายเมื่อปิดแท็บ</td><td>จำข้อมูลหน้าเว็บไว้ชั่วคราว ให้เปิดหน้าถัดไปเร็วขึ้น</td></tr>
            <tr><td>ประกาศของร้าน</td><td>ฟังก์ชัน</td><td>จนกว่าจะลบ</td><td>จดจำว่าคุณปิดป๊อปอัปประกาศแล้ว จะได้ไม่เด้งซ้ำ</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 12 }}>บริการภายนอกที่อาจตั้งคุกกี้ของตัวเอง: Discord (วิดเจ็ตชุมชนท้ายเว็บ เฉพาะร้านที่เปิดใช้) และ Google Fonts (ฟอนต์ของเว็บ) — บริการเหล่านี้มีนโยบายของผู้ให้บริการแต่ละราย เราไม่ใช้บริการวิเคราะห์หรือโฆษณาของบุคคลที่สาม</p>

      <h2>สิทธิของคุณตาม PDPA</h2>
      <p>คุณมีสิทธิขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณ รวมถึงถอนความยินยอมได้ทุกเมื่อ ติดต่อร้านได้ผ่านช่องทางติดต่อท้ายเว็บไซต์ หรือปุ่ม “ติดต่อเรา”</p>
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <CookieSettingsButton />
        {s.discord_url && <a className="btn btn-primary" href={s.discord_url} target="_blank" rel="noopener noreferrer">ติดต่อเรา</a>}
      </div>
    </div>
  );
}
