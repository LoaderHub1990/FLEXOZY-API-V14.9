'use client';

/** โปรไฟล์ Roblox ของคนที่ใช้คีย์: รูป + ชื่อที่แสดง + @ชื่อ (กดเปิดโปรไฟล์บน Roblox) */
export default function RobloxChip({ id, name, display, avatar }) {
  if (!id) return null;
  const shown = display || name || id;
  return (
    <a className="rbx" href={`https://www.roblox.com/users/${id}/profile`} target="_blank" rel="noopener noreferrer" title="เปิดโปรไฟล์ Roblox">
      {avatar
        ? <img src={avatar} alt="" width="30" height="30" referrerPolicy="no-referrer" loading="lazy" />
        : <span className="rbx-ph">{String(shown).slice(0, 1).toUpperCase()}</span>}
      <span className="rbx-tx"><b>{shown}</b>{name && <small>@{name}</small>}</span>
    </a>
  );
}
