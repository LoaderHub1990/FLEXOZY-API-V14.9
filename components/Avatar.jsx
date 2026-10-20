'use client';
import Icon from './Icons';

/** รูปโปรไฟล์ (+ กรอบโปรไฟล์ Discord ถ้ามีและเปิดไว้) */
export function Avatar({ p, size = 40, frame = true }) {
  const ring = frame && p?.showFrame && p?.decoration;
  return (
    <span className="av" style={{ width: size, height: size }}>
      {p?.avatar ? (
        <img className="av-img" src={p.avatar} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="av-img av-ph" style={{ fontSize: Math.round(size * 0.42) }}>{String(p?.name || '?').slice(0, 1).toUpperCase()}</span>
      )}
      {ring && <img className="av-deco" src={p.decoration} alt="" referrerPolicy="no-referrer" />}
    </span>
  );
}

/** การ์ดโปรไฟล์: แบนเนอร์ + รูป + กรอบ + ชื่อ */
export function ProfileCard({ p, children }) {
  const bg = p.banner
    ? { backgroundImage: `url("${p.banner}")` }
    : { background: p.accent ? `linear-gradient(135deg, ${p.accent}, #1b1b3a)` : 'linear-gradient(135deg,#5d30d9,#1e3a8a 70%,#0ea5e9)' };
  return (
    <div className="pc">
      <div className="pc-banner" style={bg} />
      <div className="pc-av"><Avatar p={p} size={84} /></div>
      <div className="pc-body">
        <div className="pc-name">{p.name}</div>
        <div className="pc-user">@{p.username}</div>
        {p.discord && <div className="pc-dc"><Icon n="discord" size={14} /> {p.discord.name}{p.discord.username ? <span> · {p.discord.username}</span> : null}</div>}
        {children}
      </div>
    </div>
  );
}
