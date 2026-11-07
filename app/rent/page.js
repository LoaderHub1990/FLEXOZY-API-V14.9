import { EXAMPLE_SUB } from '@/lib/templates';
import { getUser } from '@/lib/auth';
import { getT } from '@/lib/lang';
import { getRentPlans, ROOT_DOMAIN } from '@/lib/rent';
import { RentPlans } from '@/components/Rent';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'เช่าเว็บ' };

export default async function RentPage({ searchParams }) {
  const sp = await searchParams;
  const [{ t }, user, plans] = await Promise.all([getT(), getUser(), getRentPlans()]);
  return (
    <div className="wrap">
      <section className="rent-hero rv rv-up">
        <div className="crumb"><a href="/">{t('หน้าหลัก')}</a>/<span>{t('เช่าเว็บ')}</span></div>
        <h1>{t('เช่าร้านของคุณเอง')}</h1>
        <p>{t('ได้ร้านออนไลน์เต็มระบบ พร้อมหลังบ้านและลิงก์ชื่อที่คุณตั้งเอง')} <span className="rent-url">{EXAMPLE_SUB}.{ROOT_DOMAIN}</span></p>
        <div className="rent-chips"><span>⚡ {t('เปิดร้านทันที')}</span><span>🧧 {t('รับเงินด้วยซองอั่งเปา')}</span><span>🎨 {t('ปรับสี/ธีมเอง')}</span><span>🌐 TH / EN</span></div>
        {user && <a className="btn rent-my" href="/rent/my">{t('เว็บที่เช่าไว้')}</a>}
      </section>
      <RentPlans plans={plans.map((p) => ({ ...p, price: Number(p.price) }))} root={ROOT_DOMAIN} balance={user ? Number(user.balance) : 0} loggedIn={!!user} initialTpl={sp?.tpl} />
    </div>
  );
}
