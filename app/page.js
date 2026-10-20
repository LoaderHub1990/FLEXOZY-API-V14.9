import Link from 'next/link';
import { getCategories, getSettings, getStats, getRecentOrders, getReviews, getReviewStats } from '@/lib/shop';
import Reviews from '@/components/Reviews';
import RecentPurchases from '@/components/RecentPurchases';
import HeroButtons from '@/components/HeroButtons';
import CountUp from '@/components/CountUp';
import Icon from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [s, stats, cats, recent, reviews, rstats] = await Promise.all([getSettings(), getStats(), getCategories(), getRecentOrders(12), getReviews(12), getReviewStats()]);
  const items = [
    ['users', 'ผู้ใช้งาน', stats.users, 'คน'],
    ['box', 'สินค้า', stats.products, 'รายการ'],
    ['layers', 'คลังสินค้า', stats.stock, 'ชิ้น'],
    ['bag', 'ขายแล้ว', stats.sold, 'ชิ้น'],
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-bg" />
        <h1 className="rv rv-up" style={{ '--i': 0 }}><span className="hero-title">{s.shop_name.toUpperCase()}</span></h1>
        <p className="rv rv-up" style={{ '--i': 1 }}>{s.tagline}</p>
        <HeroButtons />
      </section>
      <div className="wrap">
        <section className="stats">
          {items.map(([ic, l, v, u], i) => (
            <div className="stat rv" style={{ '--i': i }} key={l}>
              <div className="stat-wm" aria-hidden="true"><Icon n={ic} size={58} /></div>
              <div className="stat-ic"><Icon n={ic} /></div>
              <div className="stat-tx">
                <div className="stat-l">{l}</div>
                <div className="stat-v"><CountUp to={v} /><small>{u}</small></div>
              </div>
            </div>
          ))}
        </section>

        <section className="section why rv rv-up">
          <h2 className="why-title">ทำไมต้องเลือก <span>{s.shop_name.toUpperCase()}</span></h2>
          <div className="why-grid">
            <div className="why-card">
              <span className="why-ic"><Icon n="shield" size={22} /></span>
              <div>
                <h3>ปลอดภัย รวดเร็ว</h3>
                <p>ใส่ใจในคุณภาพของสินค้าและบริการ ด้วยระบบรักษาความปลอดภัยที่ทันสมัย พร้อมการส่งสินค้าอัตโนมัติที่รวดเร็วและเชื่อถือได้</p>
              </div>
            </div>
            <div className="why-card">
              <span className="why-ic"><Icon n="headset" size={22} /></span>
              <div>
                <h3>บริการลูกค้า</h3>
                <p>ทีมงานมืออาชีพพร้อมให้คำปรึกษาและแก้ไขปัญหา ด้วยใจที่ใส่ใจในทุกรายละเอียด เพื่อความพึงพอใจสูงสุดของลูกค้า</p>
              </div>
            </div>
          </div>
        </section>

        <RecentPurchases initial={recent} />

        <section className="section">
          <h2 className="rv rv-up">เลือกหมวดหมู่สินค้า</h2>
          <p className="sub rv rv-up" style={{ '--i': 1 }}>เรียกดูสินค้าตามหมวดหมู่ที่คุณสนใจ</p>
          <div className="cats">
            {cats.map((c, i) => (
              <Link key={c.id} href={`/store?category=${c.id}`} className="cat rv" style={{ '--i': i % 4 }}>
                <i className="cat-lines" aria-hidden="true" />
                <div className="cat-img">{c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : null}</div>
                <div className="cat-body">
                  <h3>{c.name}</h3>
                  <div className="cat-count"><Icon n="box" size={16} />{c.count} รายการ</div>
                </div>
              </Link>
            ))}
            {cats.length === 0 && <div className="empty">ยังไม่มีหมวดหมู่สินค้า</div>}
          </div>
        </section>

        <Reviews reviews={reviews} stats={rstats} />
      </div>
    </>
  );
}
