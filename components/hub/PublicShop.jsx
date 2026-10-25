'use client';
import { useEffect, useRef, useState } from 'react';
import { Emo } from './Logo';
import { Backdrop, Cursor, Icon } from './Fx';

const baht = (n) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });

// หน้าร้านสาธารณะ — ดึงข้อมูลสดทุก 3 วินาที (ถ้า version ไม่เปลี่ยนจะได้คำตอบสั้นๆ ไม่เปลืองแบนด์วิดท์)
export default function PublicShop({ initial }) {
  const [shop, setShop] = useState(initial);
  const [flash, setFlash] = useState({});
  const prev = useRef(Object.fromEntries(initial.products.map((p) => [p.id, p.stock])));
  const ver = useRef(initial.version);

  useEffect(() => {
    let dead = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await (await fetch(`/api/v1/shop/${initial.slug}?since=${ver.current}`, { cache: 'no-store' })).json();
        if (dead || !r.ok || r.unchanged) return;
        ver.current = r.shop.version;
        const ch = {};
        for (const p of r.shop.products) if (prev.current[p.id] !== undefined && prev.current[p.id] !== p.stock) ch[p.id] = Date.now();
        prev.current = Object.fromEntries(r.shop.products.map((p) => [p.id, p.stock]));
        setFlash(ch); setShop(r.shop);
      } catch {}
    };
    const t = setInterval(tick, 3000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [initial.slug]);

  const ready = shop.products.filter((p) => p.in_stock).length;
  return (
    <div className="hb" style={{ '--c': shop.color }}>
      <Backdrop /><Cursor />
      <div className="ps">
        <div className="ps-card rim">
          <div className="ps-banner" style={shop.banner ? { backgroundImage: `url(${shop.banner})` } : undefined} />
          <div className="ps-id">
            {shop.logo ? <img className="ps-logo" src={shop.logo} alt="" /> : <i className="ps-logo">{shop.name.slice(0, 1).toUpperCase()}</i>}
            <div><h1>{shop.name}</h1>{shop.tagline && <p>{shop.tagline}</p>}</div>
          </div>
          <div className="ps-chips">
            <span className="badge ok">สต็อกสด</span>
            <span className="badge plain">สินค้า {shop.products.length} รายการ</span>
            <span className="badge plain">พร้อมขาย {ready}</span>
          </div>
          <div className="ps-list">
            {shop.products.length === 0 && <div className="h-empty" style={{ gridColumn: '1/-1' }}><Icon n="box" s={34} /><b>ยังไม่มีสินค้า</b></div>}
            {shop.products.map((p) => (
              <div key={p.id + ':' + (flash[p.id] || 0)} className={'pi rim glow' + (flash[p.id] ? ' flash' : '') + (p.in_stock ? '' : ' out')}>
                <div className="pi-top">
                  <span className="pi-em">{p.emoji ? <Emo v={p.emoji} size={30} /> : '🛍️'}</span>
                  <div className="pi-nm"><b>{p.name}</b>{p.description && <span>{p.description}</span>}</div>
                </div>
                <div className="pi-ft">
                  <span className="pr">฿{baht(p.price_baht)}</span>
                  <span className={'stk ' + (p.in_stock ? (p.stock <= 3 ? 'warn' : 'ok') : 'bad')}>{p.in_stock ? `เหลือ ${p.stock}` : 'หมด'}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="ps-foot">ซื้อสินค้าได้ผ่านบอทในเซิร์ฟเวอร์ Discord ของร้าน · ขับเคลื่อนโดย Flexozy Shop</p>
        </div>
      </div>
    </div>
  );
}
