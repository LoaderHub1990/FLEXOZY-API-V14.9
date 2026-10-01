'use client';
import { useState } from 'react';
import Editor from '@/components/Editor';
import { useApp } from '@/components/AppProvider';
import { Discord, Key } from '@/components/Icons';

export default function Create() {
  const { me, site, copy, api, toast, reloadMe } = useApp();
  const [slug, setSlug] = useState(''), [prefix, setPrefix] = useState('KEY');
  if (me === undefined) return <main className="wrap"><div className="empty"><i className="spin" /></div></main>;
  if (!me?.user) return (
    <main className="wrap narrow">
      <div className="panel gate"><div className="ico big-ico"><Key /></div><h2>เข้าสู่ระบบเพื่อสร้างหน้าแจกคีย์</h2><p>ล็อกอินด้วย Discord ก่อน แล้วระบบจะแสดงสถานะสิทธิ์ของคุณ</p><a className="btn primary lg" href="/api/auth/discord?next=/create"><Discord />เข้าสู่ระบบด้วย Discord</a></div>
    </main>
  );
  if (!me.creator) {
    async function selfApprove() {
      const j = await api('admin', { act: 'approve', id: me.user.id, slug, prefix });
      if (j.error) return toast({ slug: 'slug ต้องเป็น a-z 0-9 - (ตัวแรกเป็นตัวอักษร 2-30 ตัว)', taken: 'slug นี้ถูกใช้แล้ว' }[j.error] || 'ไม่สำเร็จ', 'bad');
      toast('สร้างสิทธิ์แล้ว', 'ok'); reloadMe();
    }
    return (
      <main className="wrap narrow">
        <div className="panel gate">
          <div className="ico big-ico"><Key /></div>
          <h2>รอแอดมินอนุมัติสิทธิ์</h2>
          <p>ส่ง Discord ID ด้านล่างให้แอดมิน แล้วกลับมารีเฟรชหน้านี้</p>
          <div className="pcard w100"><small>Discord ID ของคุณ</small><span className="mono">{me.user.id}</span></div>
          <div className="row"><button className="btn" onClick={() => copy(me.user.id, 'คัดลอก ID แล้ว')}>คัดลอก ID</button>{site.discord && <a className="btn" href={site.discord} target="_blank" rel="noreferrer">เข้า Discord ↗</a>}<button className="btn" onClick={reloadMe}>รีเฟรชสถานะ</button></div>
          {me.admin && (
            <div className="stack w100" style={{ borderTop: '1px dashed var(--soft)', paddingTop: 16, textAlign: 'left' }}>
              <b>คุณเป็นแอดมิน — สร้างหน้าให้ตัวเองได้ทันที</b>
              <div className="row"><label>slug (ลิงก์หน้า)<input value={slug} placeholder="myhub" onChange={e => setSlug(e.target.value.toLowerCase())} /></label><label>นำหน้าคีย์<input value={prefix} maxLength={12} onChange={e => setPrefix(e.target.value)} /></label></div>
              <button className="btn primary" onClick={selfApprove}>สร้างสิทธิ์ให้ฉัน</button>
            </div>
          )}
        </div>
      </main>
    );
  }
  return <main className="wrap"><Editor /></main>;
}
