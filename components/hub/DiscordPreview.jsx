import { Emo } from './Logo';

const baht = (n) => (Number(n) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });

// พรีวิวแผงร้านที่บอทจะโพสต์ใน Discord (อีโมจิ/ชื่อปุ่ม/สต็อก ตรงกับที่ผู้ซื้อเห็น)
export default function DiscordPreview({ shop, products }) {
  const list = products.filter((p) => p.active);
  return (
    <div className="dc">
      <div className="dc-head"><b>{shop.name}</b><i>BOT</i><span>วันนี้</span><span style={{ marginLeft: 'auto' }} className="dc-live">สด</span></div>
      <div className="dc-card" style={{ '--c': shop.color }}>
        <div className="dc-title">{shop.logo && <img src={shop.logo} alt="" />}<span>{shop.name}</span></div>
        {shop.tagline && <div style={{ color: '#b5bac1' }}>{shop.tagline}</div>}
        {shop.banner && <img className="dc-banner" src={shop.banner} alt="" />}
        <div className="dc-sep" />
        {list.length === 0 && <div style={{ color: '#949ba4' }}>ยังไม่มีสินค้า — เพิ่มที่แท็บ “สินค้า”</div>}
        {list.map((p) => (
          <div className="dc-line" key={p.id}>
            {p.emoji ? <Emo v={p.emoji} /> : <span>▫️</span>}
            <span className="n"><b style={{ color: '#fff' }}>{p.name}</b></span>
            <span className="p">฿{baht(p.price)}</span>
            <span className={'s' + (p.stock > 0 ? '' : ' z')}>{p.stock > 0 ? `เหลือ ${p.stock}` : 'หมด'}</span>
          </div>
        ))}
        <div className="dc-sep" />
        <div className="dc-sel"><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Emo v={shop.buttons.buy.emoji} />{shop.buttons.buy.label}</span><span>⌄</span></div>
        <div className="dc-btns">
          {['stock', 'balance', 'topup'].map((k, i) => (
            <span key={k} className={'dc-b' + (k === 'topup' ? ' pri' : '')}><Emo v={shop.buttons[k].emoji} size={16} />{shop.buttons[k].label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
