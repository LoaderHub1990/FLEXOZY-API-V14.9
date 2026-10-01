'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TermDemo from '@/components/TermDemo';
import { useApp } from '@/components/AppProvider';
import { Arrow, Discord, Shield, Palette, Key, Crown, Bolt, Users } from '@/components/Icons';

const FEATS = [
  [Discord, 'ล็อกอิน Discord + เข้าเซิร์ฟเวอร์ให้อัตโนมัติ', 'กดครั้งเดียว ระบบเพิ่มคุณเข้าเซิร์ฟเวอร์ให้เลย พร้อมใส่ยศให้ได้'],
  [Shield, 'กันบายพาสหลายชั้น', 'Proof-of-Work · Turnstile · ตรวจสมาชิกจริงด้วยบอท · จับเวลาฝั่งเซิร์ฟเวอร์ · ระบบ strike'],
  [Palette, 'ตกแต่งหน้าได้เต็มที่', 'พื้นหลัง GIF/รูป · เพลง/YouTube · เอฟเฟกต์ · ฟอนต์ · สี · พรีวิวสดทันที'],
  [Key, 'คีย์พร้อมใช้กับ Roblox', 'API /api/verify ตรวจคีย์ได้จากสคริปต์ มีตัวอย่าง Lua ให้'],
  [Bolt, 'ตั้งค่าง่าย ไม่ต้อง redeploy', 'ปรับชื่อเว็บ พื้นหลัง เพลง ความปลอดภัยจากหน้าเว็บได้เลย'],
  [Crown, 'แอดมินคุมได้ทุกอย่าง', 'เข้าไปแก้/ตกแต่งหน้าของทุกคน จัดการคีย์ แบน และดู log ครบ'],
];

export default function Home() {
  const { me, api, site } = useApp();
  const [st, setSt] = useState(null);
  useEffect(() => { api('stats').then(j => !j.dbError && setSt(j)); }, [api]);
  const u = me?.user;
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            <div className="chip rv"><i />Discord Key System</div>
            <h1 className="big rv" style={{ '--d': '.05s' }}>แจกคีย์ให้เป็นระบบ<br />หน้าตาแบบที่คุณชอบ</h1>
            <p className="lead rv" style={{ '--d': '.12s' }}>{site.tagline}. ล็อกอินด้วย Discord ทำตามขั้นตอน รับคีย์ — ผู้สร้างตกแต่งหน้าได้อิสระ ใส่ GIF ใส่เพลงได้ ส่วนระบบกันบายพาสทำงานอยู่เบื้องหลัง</p>
            <div className="cta rv" style={{ '--d': '.2s' }}>
              {u ? <Link className="btn primary lg" href="/create">{me.creator ? 'จัดการหน้าของฉัน' : 'ไปที่แผงสร้างหน้า'} <Arrow /></Link>
                : <a className="btn primary lg" href="/api/auth/discord"><Discord />เข้าสู่ระบบด้วย Discord</a>}
              <a className="btn lg" href="/getkey">ดูหน้าตัวอย่าง</a>
            </div>
          </div>
          <div className="rv" style={{ '--d': '.15s' }}><TermDemo /></div>
        </div>
      </section>

      <div className="wrap">
        <div className="feat rv">
          {FEATS.map(([I, t, d], i) => (
            <div className="card" key={i}><h3>{t}<I /></h3><p>{d}</p></div>
          ))}
        </div>

        <div className="head" style={{ marginTop: 70 }}><h2>เริ่มใช้งานใน 3 ขั้น</h2></div>
        <div className="steps">
          {[['เข้าสู่ระบบ', 'กดล็อกอินด้วย Discord ระบบจะพาคุณเข้าเซิร์ฟเวอร์ให้อัตโนมัติ'], ['ขออนุมัติสิทธิ์สร้างหน้า', 'ส่ง Discord ID ให้แอดมิน แล้วรอเปิดสิทธิ์ ใช้เวลาไม่นาน'], ['ตกแต่งแล้วแชร์ลิงก์', 'ตั้งขั้นตอน ลิงก์ ธีม พื้นหลัง เพลง ดูพรีวิวสด แล้วส่งลิงก์ให้ผู้เล่น']].map(([t, d], i) => (
            <div className="step rv" style={{ '--d': i * 0.08 + 's' }} key={i}><b>{i + 1}</b><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>

        {st && (
          <div className="numbers rv">
            {[['คีย์ที่แจกแล้ว', st.keys], ['หน้าแจกคีย์', st.pages], ['ผู้สร้างหน้า', st.creators], ['ผู้ใช้', st.users]].map(([l, n]) => <div key={l}><b>{(n || 0).toLocaleString()}</b><span>{l}</span></div>)}
          </div>
        )}

        <div className="band rv">
          <div><h2>พร้อมสร้างหน้าแจกคีย์ของคุณหรือยัง?</h2><p className="dim" style={{ margin: 0 }}>ล็อกอิน แล้วขอสิทธิ์จากแอดมิน</p></div>
          {u ? <Link className="btn primary lg" href="/create">เปิดแผงสร้างหน้า <Arrow /></Link> : <a className="btn primary lg" href="/api/auth/discord"><Users />เริ่มเลย</a>}
        </div>
      </div>
    </main>
  );
}
