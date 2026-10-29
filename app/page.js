import Link from 'next/link';
import { getCategories, getProducts, getSettings, getStats, getRecentOrders, getReviews, getReviewStats } from '@/lib/shop';
import { baht } from '@/lib/util';
import Reviews from '@/components/Reviews';
import RecentPurchases from '@/components/RecentPurchases';
import ContactCard from '@/components/ContactCard';
import AnnounceBar from '@/components/Ticker';
import CountUp from '@/components/CountUp';
import Icon from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [s, stats, cats, products, recent, reviews, rstats] = await Promise.all([
    getSettings(), getStats(), getCategories(), getProducts(), getRecentOrders(12), getReviews(12), getReviewStats(),
  ]);
  const featured = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 10);
  const items = [
    ['users', 'ผู้ใช้งานทั้งหมด', stats.users],
    ['box', 'สินค้าพร้อมขาย', stats.stock],
    ['bag', 'ขายแล้วทั้งหมด', stats.sold],
  ];
  const brand = s.shop_name.toUpperCase();
  return (
    <div className="wrap wide home">
      {/* แบนเนอร์ใหญ่ (GIF/WebP เคลื่อนไหว) — เปลี่ยนได้ที่ /admin → ตั้งค่า */}
      <section className="banner rv rv-up" aria-label={s.shop_name}>
        {s.banner_image
          ? <img src={s.banner_image} alt={s.shop_name} width="986" height="399" decoding="async" fetchPriority="high" />
          : <div className="banner-ph"><h1>{brand}</h1><p>{s.tagline}</p></div>}
        <h1 className="sr-only">{s.shop_name}</h1>
        <i className="banner-edge" aria-hidden="true" />
      </section>

      <section className="stats">
        {items.map(([ic, l, v], i) => (
          <div className="stat rv" style={{ '--i': i }} key={l}>
            <div className="stat-ic"><Icon n={ic} /></div>
            <div className="stat-tx">
              <div className="stat-l">{l}</div>
              <div className="stat-v"><CountUp to={v} /></div>
            </div>
          </div>
        ))}
        <ContactCard />
      </section>

      <AnnounceBar text={s.announce_text} />

      <RecentPurchases initial={recent} />

      <section className="section">
        <div className="sh rv rv-up">
          <div>
            <div className="sh-eye">{brand}</div>
            <h2>หมวดหมู่สินค้า</h2>
          </div>
          <Link href="/store" className="sh-more">ดูทั้งหมด <Icon n="arrow" size={14} /></Link>
        </div>
        <div className="cats">
          {cats.map((c, i) => (
            <Link key={c.id} href={`/store?category=${c.id}`} className="cat rv" style={{ '--i': i % 4 }}>
              <i className="cat-lines" aria-hidden="true" />
              <div className="cat-img">{c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : null}</div>
              <div className="cat-body">
                <div>
                  <h3>{c.name}</h3>
                  <div className="cat-count">{c.count} รายการ</div>
                </div>
                <span className="cat-go"><Icon n="arrow" size={16} /></span>
              </div>
            </Link>
          ))}
          {cats.length === 0 && <div className="empty">ยังไม่มีหมวดหมู่สินค้า</div>}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="sh rv rv-up">
            <div>
              <div className="sh-eye">{brand}</div>
              <h2>สินค้าแนะนำ</h2>
            </div>
            <Link href="/store" className="sh-more">ดูทั้งหมด <Icon n="arrow" size={14} /></Link>
          </div>
          <div className="feat">
            {featured.map((p, i) => (
              <Link key={p.id} href={`/store/${p.id}`} className="fcard rv" style={{ '--i': i % 5 }}>
                <span className="fcard-badge"><Icon n="flame" size={12} /> แนะนำ</span>
                <div className="fcard-img">
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : null}
                  {p.stock === 0 && <span className="badge-out">สินค้าหมด</span>}
                </div>
                <div className="fcard-body">
                  <div className="fcard-cat">{p.category_name || 'สินค้า'}</div>
                  <div className="fcard-name">{p.name}</div>
                  <div className="fcard-foot">
                    <span className="price">{baht(p.price)}<small>฿</small></span>
                    <span className="fcard-sold">ขายแล้ว {p.sold}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section why rv rv-up">
        <h2 className="why-title">ทำไมต้องเลือก <span>{brand}</span></h2>
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

      <Reviews reviews={reviews} stats={rstats} />
    </div>
  );
}
