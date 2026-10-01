'use client';
import { useEffect, useState } from 'react';
import { themeStyle } from '@/lib/theme';
import { Backdrop, MusicPlayer } from './Media';
import { Brand, Discord, Shield, Key, Lock } from './Icons';

export const T = {
  th: {
    login: 'เข้าสู่ระบบด้วย Discord', hello: 'สวัสดี', s1: 'เปิดลิงก์แรก', s2: 'เข้าดิสคอร์ด', s3: 'ยืนยันตัวตน', start: 'เริ่มขั้นตอน', next: 'ไปต่อ', claim: 'ปลดล็อกรับคีย์', wait: 'รออีก', sec: 'วินาที',
    h0: 'กดเริ่มเพื่อเปิดลิงก์ แล้วรอจนครบเวลา', h1: 'ไปทำตามลิงก์ที่เปิดขึ้น แล้วกลับมาที่หน้านี้', h2: 'เข้าร่วมดิสคอร์ดแล้วทำ captcha', h3: 'ครบทุกขั้นตอนแล้ว — ขั้นสุดท้าย กดปลดล็อกเพื่อรับคีย์',
    yours: 'คีย์ของคุณ', copy: 'คัดลอก', copied: 'คัดลอกแล้ว', exp: 'หมดอายุใน', expired: 'หมดอายุแล้ว', closed: 'หน้านี้ปิดชั่วคราว', checking: 'กำลังตรวจสอบเบราว์เซอร์…',
    logout: 'ออกจากระบบ', powered: 'ขับเคลื่อนโดย', open: 'เปิดลิงก์',
    e: { wait: 'ยังไม่ครบเวลา', steps: 'ทำขั้นตอนให้ครบก่อน', captcha: 'ยืนยัน captcha ไม่ผ่าน', pow: 'ตรวจสอบเบราว์เซอร์ไม่ผ่าน ลองรีเฟรชหน้า', rate: 'ทำเร็วเกินไป รอสักครู่', bot: 'ตรวจพบการเข้าใช้ที่ไม่ใช่เบราว์เซอร์ปกติ', origin: 'คำขอไม่ถูกต้อง รีเฟรชหน้าแล้วลองใหม่', device: 'ตรวจพบการเปลี่ยนอุปกรณ์ระหว่างขั้นตอน เริ่มใหม่อีกครั้ง', ipchg: 'เครือข่ายเปลี่ยนระหว่างขั้นตอน เริ่มใหม่อีกครั้ง', blocked: 'ถูกบล็อกชั่วคราวเพราะทำผิดกติกาหลายครั้ง ลองใหม่ใน 1 ชม.', banned: 'บัญชีนี้ถูกระงับ', age: 'บัญชี Discord ใหม่เกินไป', ipcap: 'IP นี้รับคีย์ครบจำนวนต่อวันแล้ว', notmember: 'ยังไม่ได้อยู่ในเซิร์ฟเวอร์ Discord — เข้าร่วมก่อนแล้วกดอีกครั้ง', closed: 'หน้านี้ปิดอยู่', server: 'เซิร์ฟเวอร์ขัดข้อง ลองใหม่', network: 'เชื่อมต่อไม่ได้' },
    joinDc: 'เข้าร่วมเซิร์ฟเวอร์',
  },
  en: {
    login: 'Login with Discord', hello: 'Hi', s1: 'Open link 1', s2: 'Join Discord', s3: 'Verify', start: 'Start', next: 'Continue', claim: 'Unlock & get key', wait: 'Wait', sec: 's',
    h0: 'Press start to open the link, then wait for the timer', h1: 'Complete the opened link, then come back here', h2: 'Join the Discord and solve the captcha', h3: 'All done — final step: unlock to get your key',
    yours: 'Your key', copy: 'Copy', copied: 'Copied', exp: 'Expires in', expired: 'Expired', closed: 'This page is temporarily closed', checking: 'Checking your browser…',
    logout: 'Log out', powered: 'Powered by', open: 'Open link',
    e: { wait: 'Timer not finished', steps: 'Finish the steps first', captcha: 'Captcha failed', pow: 'Browser check failed, refresh the page', rate: 'Too fast, wait a moment', bot: 'Non-browser access detected', origin: 'Bad request, refresh and retry', device: 'Device changed mid-flow, start again', ipchg: 'Network changed mid-flow, start again', blocked: 'Temporarily blocked for repeated violations, retry in 1h', banned: 'Account suspended', age: 'Discord account too new', ipcap: 'Daily key limit reached for this IP', notmember: 'You are not in the Discord server — join, then try again', closed: 'This page is closed', server: 'Server error, retry', network: 'Network error' },
    joinDc: 'Join the server',
  },
};

export function Countdown({ exp, t }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.floor((exp - now) / 1000));
  if (!s) return <span className="bad-t">{t.expired}</span>;
  const p = n => String(n).padStart(2, '0');
  return <span>{t.exp} <b className="mono">{p(Math.floor(s / 3600))}:{p(Math.floor(s % 3600 / 60))}:{p(s % 60)}</b></span>;
}

// หน้าแจกคีย์ — ใช้ร่วมกันระหว่างหน้าจริงและพรีวิวในตัวแก้ไข (preview = ไม่มี action จริง)
export default function GkView({ d, ui, preview = false }) {
  const th = d.theme, t = ui.t, tx = th.text, step = ui.step, steps = [t.s1, t.s2, t.s3];
  const hint = [t.h0, t.h1, t.h2, t.h3][step];
  const label = ui.left > 0 ? `${t.wait} ${ui.left} ${t.sec}` : !ui.powOk ? t.checking : step === 0 ? (tx.start || t.start) : step === 3 ? (tx.claim || t.claim) : t.next;
  return (
    <div className={'gk' + (preview ? ' pv' : ' full')} data-p={th.preset} data-align={th.align} data-shadow={th.shadow ? 1 : 0} data-logo={th.logoShape} style={themeStyle(th)}>
      <Backdrop theme={th} media={d.media} abs={preview} />
      {!preview && <MusicPlayer src={d.media.music} vol={th.music.vol} auto={th.music.auto} title={th.music.title} />}
      <div className="gk-page">
        {ui.onLang && <div className="gk-top"><button className="gk-lang" onClick={ui.onLang}>{ui.lang === 'th' ? 'EN' : 'TH'}</button></div>}
        <section className="gk-card gk-hero">
          {d.media.banner ? <img className="gk-banner" src={d.media.banner} alt="" /> : <div className="gk-banner ph" />}
          <div className="gk-hd">
            {d.media.logo ? <img className="gk-logo" src={d.media.logo} alt="" /> : <div className="gk-logo ph"><Key /></div>}
            <div>
              {tx.badge && <span className="gk-badge">{tx.badge}</span>}
              <h1>{d.title || 'ชื่อหน้าของคุณ'}</h1>
              {d.desc && <p>{d.desc}</p>}
            </div>
          </div>
        </section>
        {tx.welcome && <p className="gk-welcome">{tx.welcome}</p>}

        {d.links?.length > 0 && (
          <div className="gk-links">
            {d.links.map((l, i) => (
              <a key={i} className="gk-link" href={preview ? undefined : l.url} target="_blank" rel="noreferrer" onClick={e => preview && e.preventDefault()}>
                {l.icon === 'img' && l.img ? <img src={l.img} alt="" width="22" height="22" /> : <Brand name={l.icon} />}<span>{l.label}</span>
              </a>
            ))}
          </div>
        )}

        <section className="gk-card gk-main">
          {d.off ? <div className="gk-msg">{t.closed}</div>
            : !ui.user ? (
              <div className="gk-msg">
                <a className="gk-btn" href={preview ? undefined : ui.loginHref}><Discord />{t.login}</a>
              </div>
            ) : ui.key ? (
              <div className={'gk-reveal' + (ui.fresh ? ' fresh' : '')}>
                <div className="gk-lab">{t.yours}</div>
                <div className="gk-key mono">{ui.key.key}</div>
                <div className="gk-row">
                  <button className="gk-btn" onClick={ui.onCopy}>{t.copy}</button>
                  <span className="gk-exp"><Countdown exp={ui.key.exp} t={t} /></span>
                </div>
              </div>
            ) : (
              <>
                <div className="gk-steps">
                  {steps.map((s, i) => <div key={i} className={'gk-st' + (step > i ? ' done' : step === i ? ' now' : '')}><b>{step > i ? '✓' : i + 1}</b><span>{s}</span></div>)}
                </div>
                <div className="gk-bar"><i style={{ width: (step / 3) * 100 + '%' }} /></div>
                <p className="gk-hint">{hint}</p>
                {step === 2 && ui.sitekey && <div className="gk-ts" ref={ui.tsRef} />}
                {ui.err && <div className="gk-err">{ui.err}{ui.err === t.e.notmember && ui.invite && <> · <a href={ui.invite} target="_blank" rel="noreferrer">{t.joinDc}</a></>}</div>}
                <button className={'gk-btn big' + (step === 3 && !ui.busy && ui.left <= 0 ? ' unlock' : '')} disabled={ui.busy || ui.left > 0 || !ui.powOk} onClick={ui.onGo}>{ui.busy ? <i className="spin" /> : step === 3 ? <Lock /> : <Shield />}{label}</button>
              </>
            )}
        </section>

        <footer className="gk-foot">
          {ui.user && !preview && <span>{t.hello} {ui.user} · <a href="#" onClick={e => { e.preventDefault(); ui.onLogout && ui.onLogout(); }}>{t.logout}</a></span>}
          <span>{tx.foot || `${t.powered} ${d.site?.name || ''}`}</span>
        </footer>
      </div>
    </div>
  );
}
