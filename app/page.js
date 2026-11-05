import Link from 'next/link';
import { getCategories, getProducts, getSettings, getStats, getRecentOrders, getReviews, getReviewStats } from '@/lib/shop';
import { baht } from '@/lib/util';
import Reviews from '@/components/Reviews';
import RecentPurchases from '@/components/RecentPurchases';
import ContactCard from '@/components/ContactCard';
import AnnounceBar from '@/components/Ticker';
import CountUp from '@/components/CountUp';
import Icon from '@/components/Icons';
import { getT } from '@/lib/lang';
import { getRentPlans, ROOT_DOMAIN } from '@/lib/rent';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [s, stats, cats, products, recent, reviews, rstats, { t, lang }, plans] = await Promise.all([
    getSettings(), getStats(), getCategories(), getProducts(), getRecentOrders(12), getReviews(12), getReviewStats(), getT(), getRentPlans().catch(() => []),
  ]);
  const en = lang === 'en';
  const cheapest = plans.length ? plans.reduce((a, b) => (Number(b.price) < Number(a.price) ? b : a)) : null;
  const featured = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 10);
  const items = [
    ['users', t('ผู้ใช้งานทั้งหมด'), stats.users],
    ['box', t('สินค้าพร้อมขาย'), stats.stock],
    ['bag', t('ขายแล้วทั้งหมด'), stats.sold],
  ];
  const brand = s.shop_name.toUpperCase();
  return (
    <div className="wrap wide home">
      {/* แบนเนอร์: ข้อความ (แก้ได้ที่ /admin → ตั้งค่า) — ถ้าใส่ลิงก์รูปในตั้งค่า จะแสดงรูปแทน */}
      <section className="banner rv rv-up" aria-label={s.shop_name}>
        {s.banner_image
          ? <img src={s.banner_image} alt={s.shop_name} width="986" height="399" decoding="async" fetchPriority="high" />
          : (
            <div className="banner-ph">
              <span className="banner-chip"><i />{t('เปิดให้บริการ')}</span>
              <h1>{(en && s.banner_title_en) || s.banner_title || brand}</h1>
              <p>{(en && s.banner_subtitle_en) || s.banner_subtitle || (en && s.tagline_en) || s.tagline}</p>
              <div className="banner-cta">
                <Link href="/store" className="btn btn-primary">{t('เลือกซื้อสินค้า')}</Link>
                <Link href="/rent" className="btn">{t('เช่าเว็บ')}</Link>
              </div>
            </div>
          )}
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

      <AnnounceBar text={s.announce_text} label={t('ประกาศ')} />

      {cheapest && (
        <section className="rent-promo rv rv-up">
          <div>
            <h3>{t('เช่าเว็บของคุณเอง')} · {t('เริ่มต้นเพียง')} {baht(cheapest.price)} ฿ / {cheapest.days} {t('วัน')}</h3>
            <p>{t('ได้ลิงก์ชื่อที่คุณตั้งเอง เช่น')} <code>128bit.{ROOT_DOMAIN}</code></p>
          </div>
          <Link href="/rent" className="btn btn-primary">{t('ดูแพ็กเกจ')} <Icon n="arrow" size={15} /></Link>
        </section>
      )}

      <RecentPurchases initial={recent} />

      <section className="section">
        <div className="sh rv rv-up">
          <div>
            <div className="sh-eye">{brand}</div>
            <h2>{t('หมวดหมู่สินค้า')}</h2>
          </div>
          <Link href="/store" className="sh-more">{t('ดูทั้งหมด')} <Icon n="arrow" size={14} /></Link>
        </div>
        <div className="cats">
          {cats.map((c, i) => (
            <Link key={c.id} href={`/store?category=${c.id}`} className="cat rv" style={{ '--i': i % 4 }}>
              <i className="cat-lines" aria-hidden="true" />
              <div className="cat-img">{c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : null}</div>
              <div className="cat-body">
                <div>
                  <h3>{c.name}</h3>
                  <div className="cat-count">{c.count} {t('รายการ')}</div>
                </div>
                <span className="cat-go"><Icon n="arrow" size={16} /></span>
              </div>
            </Link>
          ))}
          {cats.length === 0 && <div className="empty">{t('ยังไม่มีหมวดหมู่สินค้า')}</div>}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="sh rv rv-up">
            <div>
              <div className="sh-eye">{brand}</div>
              <h2>{t('สินค้าแนะนำ')}</h2>
            </div>
            <Link href="/store" className="sh-more">{t('ดูทั้งหมด')} <Icon n="arrow" size={14} /></Link>
          </div>
          <div className="feat">
            {featured.map((p, i) => (
              <Link key={p.id} href={`/store/${p.id}`} className="fcard rv" style={{ '--i': i % 5 }}>
                <span className="fcard-badge"><Icon n="flame" size={12} /> {t('แนะนำ')}</span>
                <div className="fcard-img">
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : null}
                  {p.stock === 0 && <span className="badge-out">{t('สินค้าหมด')}</span>}
                </div>
                <div className="fcard-body">
                  <div className="fcard-cat">{p.category_name || 'สินค้า'}</div>
                  <div className="fcard-name">{p.name}</div>
                  <div className="fcard-foot">
                    <span className="price">{baht(p.price)}<small>฿</small></span>
                    <span className="fcard-sold">{t('ขายแล้ว')} {p.sold}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Reviews reviews={reviews} stats={rstats} />
    </div>
  );
}
