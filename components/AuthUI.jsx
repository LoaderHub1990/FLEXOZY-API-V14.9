'use client';
// ชุดหน้าตาล็อกอินใหม่ (ใช้ร่วมกันทั้งเว็บหลักและร้านเช่า): การ์ดแบ่งสองฝั่ง + แถบสลับโหมดเลื่อนนุ่ม + ช่องกรอกมีไอคอน
import { useState } from 'react';
import Icon from './Icons';

export function AuthShell({ mode, setMode, brand, logo, title, sub, perks, labels, hideSeg, children }) {
  const L = { login: 'เข้าสู่ระบบ', register: 'สมัครสมาชิก', ...labels };
  return (
    <div className="auth2" data-mode={mode}>
      <aside className="auth2-side" aria-hidden="true">
        <i className="o o1" /><i className="o o2" /><i className="o o3" /><i className="grid" />
        <div className="auth2-brand">{logo ? <img src={logo} alt="" width="38" height="38" /> : <span className="auth2-dot" />}<b>{brand}</b></div>
        <div className="auth2-hero">
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        <ul>{perks.map(([ic, tx]) => <li key={tx}><span><Icon n={ic} size={16} /></span>{tx}</li>)}</ul>
      </aside>
      <section className="auth2-main">
        <div className="auth2-brand-m">{logo ? <img src={logo} alt="" width="30" height="30" /> : <span className="auth2-dot" />}<b>{brand}</b></div>
        {!hideSeg && <div className="auth2-seg" role="tablist" data-mode={mode}>
          <i />
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>{L.login}</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>{L.register}</button>
        </div>}
        <div className="auth2-form">{children}</div>
      </section>
    </div>
  );
}

/** ช่องกรอกมีไอคอนซ้าย + ป้ายลอย (+ ปุ่มแสดงรหัสผ่าน) */
export function AField({ icon, label, type = 'text', value, onChange, ...rest }) {
  const [show, setShow] = useState(false);
  const pw = type === 'password';
  return (
    <label className="af">
      <span className="af-ic"><Icon n={icon} size={17} /></span>
      <input {...rest} type={pw && show ? 'text' : type} value={value} onChange={onChange} placeholder=" " />
      <span className="af-l">{label}</span>
      {pw && <button type="button" className="af-eye" onClick={() => setShow(!show)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} tabIndex={-1}><Icon n={show ? 'eyeoff' : 'eye'} size={17} /></button>}
    </label>
  );
}
