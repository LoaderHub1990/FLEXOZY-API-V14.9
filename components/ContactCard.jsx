'use client';
import Icon from './Icons';
import { useShell } from './Shell';

// การ์ดสถิติใบที่ 4 — กดแล้วเปิดหน้าต่างติดต่อทีมงาน
export default function ContactCard() {
  const { openContact } = useShell();
  return (
    <button type="button" className="stat stat-contact rv" style={{ '--i': 3 }} onClick={openContact}>
      <div className="stat-ic"><Icon n="headset" /></div>
      <div className="stat-tx">
        <div className="stat-l">สอบถามและขอความช่วยเหลือ</div>
        <div className="stat-v stat-cta">ติดต่อทีมงาน</div>
      </div>
      <Icon n="arrow" size={16} className="stat-go" />
    </button>
  );
}
