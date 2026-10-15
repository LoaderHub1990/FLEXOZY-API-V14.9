'use client';
import { useEffect, useState } from 'react';
import Icon from './Icons';

function ago(iso, now) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'เมื่อสักครู่';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export default function RecentPurchases({ initial = [] }) {
  const [orders, setOrders] = useState(initial);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    const p = setInterval(() => {
      fetch('/api/recent', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.orders) setOrders(d.orders); }).catch(() => {});
    }, 45000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  if (!orders.length) return null;
  // ทำให้ยาวพอจะวนได้ไม่สะดุด: ซ้ำรายการให้ครบ ~12 ใบ แล้วคัดลอกทั้งชุดอีกรอบ (เลื่อนไป -50%)
  let base = orders;
  while (base.length < 12) base = base.concat(orders);
  const track = [...base, ...base];
  const dur = Math.max(30, base.length * 4.5);

  return (
    <section className="section recent rv rv-up">
      <div className="sec-head">
        <span className="sec-ic"><Icon n="bag" size={18} /></span>
        <div>
          <h2 className="sec-title">สินค้าที่ซื้อล่าสุด</h2>
          <p className="sub" style={{ margin: 0 }}>สินค้าที่ซื้อล่าสุด</p>
        </div>
      </div>
      <div className="ticker" aria-label="สินค้าที่ซื้อล่าสุด">
        <div className="ticker-track" style={{ animationDuration: `${dur}s` }}>
          {track.map((o, i) => (
            <div className="tk" key={i} aria-hidden={i >= base.length ? 'true' : undefined}>
              <div className="tk-img">{o.image ? <img src={o.image} alt="" loading="lazy" /> : <Icon n="box" size={22} />}</div>
              <div className="tk-tx">
                <div className="tk-name" title={o.product}>{o.product}</div>
                <div className="tk-meta">
                  <span className="tk-user"><Icon n="user" size={12} />{o.user}</span>
                  <i />
                  <span suppressHydrationWarning>{now ? ago(o.at, now) : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
