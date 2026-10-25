'use client';
import { useEffect, useRef, useState } from 'react';
import { Emo, Mark } from './Logo';
import { Icon } from './Fx';

const baht = (n) => (Number(n) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const isCustom = (v) => /^<a?:[A-Za-z0-9_]{2,32}:\d{15,25}>$/.test(v || '');

/**
 * พรีวิวแผงร้านที่บอทโพสต์ใน Discord — หน้าตาและข้อความตรงกับ buildPanel() ของบอททุกบรรทัด
 * (ไม่มีเวลา/ข้อความเสริม) รับ shop ที่เป็น "ร่าง" ได้ จึงเห็นการเปลี่ยนแปลงทันทีก่อนกดบันทึก
 */
export default function DiscordPreview({ shop, products, topupOn }) {
  const list = (products || []).filter((p) => p.active).slice(0, 25);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const b = shop.buttons;
  const showTopup = topupOn !== undefined ? topupOn : !!shop.topup_enabled;
  const buyIcon = b.buy.emoji && !isCustom(b.buy.emoji) ? b.buy.emoji + ' ' : '';
  const color = /^#[0-9a-f]{6}$/i.test(shop.color || '') ? shop.color : '#5865f2';

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  useEffect(() => { if (!list.length) setOpen(false); }, [list.length]);

  return (
    <div className="dc" ref={box}>
      <div className="dc-msg">
        <span className="dc-av"><Mark size={18} /></span>
        <div className="dc-body">
          <div className="dc-head"><b>Flexozy Shop</b><i>APP</i></div>
          <div className="dc-card" style={{ '--c': color }}>
            <div className="dc-top">
              <div className="dc-tx">
                <div className="dc-title">{shop.name || 'ชื่อร้าน'}</div>
                {shop.tagline ? <div className="dc-tag">{shop.tagline}</div> : null}
              </div>
              {shop.logo ? <img className="dc-logo" src={shop.logo} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} onLoad={(e) => { e.currentTarget.style.visibility = 'visible'; }} /> : null}
            </div>
            {shop.banner ? <img className="dc-banner" src={shop.banner} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} onLoad={(e) => { e.currentTarget.style.display = 'block'; }} /> : null}
            <div className="dc-sep" />
            <div className="dc-lines">
              {list.length === 0 && <div className="dc-empty">ยังไม่มีสินค้า</div>}
              {list.map((p) => (
                <div className="dc-line" key={p.id}>
                  {p.emoji ? <Emo v={p.emoji} size={18} /> : <span className="dc-sq">▫️</span>}
                  <span><b>{p.name}</b> — ฿{baht(p.price)} · {p.stock > 0 ? <>เหลือ <b>{p.stock}</b></> : <s>หมด</s>}</span>
                </div>
              ))}
            </div>
            <div className="dc-sep" />
            {list.length > 0 && (
              <div className={'dc-selwrap' + (open ? ' open' : '')}>
                <button type="button" className="dc-sel rp" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                  <span>{buyIcon}{b.buy.label}</span><Icon n="chevron" s={16} />
                </button>
                <div className="dc-menu" aria-hidden={!open}>
                  {list.map((p) => (
                    <div className="dc-opt" key={p.id}>
                      {p.emoji ? <Emo v={p.emoji} size={20} /> : null}
                      <div><b>{p.name}</b><em>฿{baht(p.price)} · {p.stock > 0 ? `เหลือ ${p.stock}` : 'หมด'}</em></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="dc-btns">
              <button type="button" className="dc-b rp"><Emo v={b.stock.emoji} size={16} />{b.stock.label}</button>
              <button type="button" className="dc-b rp"><Emo v={b.balance.emoji} size={16} />{b.balance.label}</button>
              {showTopup && <button type="button" className="dc-b ok rp"><Emo v={b.topup.emoji} size={16} />{b.topup.label}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
