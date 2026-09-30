import { Discord } from './Icons';
export default function LoginGate({ text = 'เข้าสู่ระบบด้วย Discord เพื่อเริ่มทดสอบ' }) {
  return (
    <div className="panel gate">
      <img src="/logo.png" alt="" width="72" height="72" style={{ filter: 'grayscale(1) brightness(1.5)' }} />
      <h3>{text}</h3>
      <p>ล็อกอินครั้งเดียว ใช้ได้ทุกฟังก์ชัน</p>
      <a className="btn primary" href="/api/auth/discord"><Discord />เข้าสู่ระบบด้วย Discord</a>
    </div>
  );
}
