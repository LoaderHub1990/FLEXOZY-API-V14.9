'use client';
import { useEffect, useRef, useState } from 'react';
import { Emo } from './Logo';

const baht = (n) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });

// หน้าร้านสาธารณะ — ดึงข้อมูลสดทุก 3 วินาที (ถ้า version ไม่เปลี่ยนจะได้คำตอบสั้นๆ ไม่เปลืองแบนด์วิดท์)
export default function PublicShop({ initial }) {
  const [shop, setShop] = useState(initial);
  const [flash, setFlash] = useState({});
  const prev = useRef(Object.fromEntries(initial.products.map((p) => [p.id, p.stock])));
  const ver = useRef(initial.version);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await (await fetch(`/api/v1/shop/${initial.slug}?since=${ver.current}`, { cache: 'no-store' })).json();
        if (!r.ok || r.unchanged) return;
        ver.current = r.shop.version;
        const ch = {};
        for (const p of r.shop.products) if (prev.current[p.id] !== p.stock) ch[p.id] = Date.now();
        prev.current = Object.fromEntries(r.shop.products.map((p) => [p.id, p.stock]));
        setFlash(ch); setShop(r.shop);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [initial.slug]);

  return (
    <div className="hb" style={{ '--c': shop.color }}>
      <div className="hb-shop">
        <div className="hb-shop-banner" style={shop.banner ? { backgroundImage: `url(${shop.banner})` } : undefined} />
        <div className="hb-shop-id">
          {shop.logo ? <img src={shop.logo} alt="" /> : <div className="ph">{shop.name.slice(0, 1).toUpperCase()}</div>}
          <div><h1>{shop.name}</h1>{shop.tagline && <p>{shop.tagline}</p>}</div>
        </div>
        <div className="dc-live" style={{ margin: '0 0 12px 4px' }}>อัปเดตสด</div>
        <div className="hb-list">
          {shop.products.length === 0 && <div className="hb-item"><span className="nm">ยังไม่มีสินค้า</span></div>}
          {shop.products.map((p) => (
            <div key={p.id + ':' + (flash[p.id] || 0)} className={'hb-item' + (flash[p.id] ? ' flash' : '')}>
              <div className="em">{p.emoji ? <Emo v={p.emoji} size={26} /> : <span>🛍️</span>}</div>
              <div className="nm"><b>{p.name}</b>{p.description && <span>{p.description}</span>}</div>
              <div><div className="pr">฿{baht(p.price_baht)}</div><div className="st" style={{ color: p.in_stock ? '#4ade80' : '#f87171' }}>{p.in_stock ? `เหลือ ${p.stock}` : 'หมด'}</div></div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12.5, color: '#71717a' }}>ซื้อสินค้าได้ผ่านบอทในเซิร์ฟเวอร์ Discord ของร้าน · ขับเคลื่อนโดย Flexozy Shop</p>
      </div>
    </div>
  );
}
