import { getUser } from '@/lib/auth';
import { getT } from '@/lib/lang';
import { getRentPlans, ROOT_DOMAIN } from '@/lib/rent';
import { RentPlans } from '@/components/Rent';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'เช่าเว็บ' };

export default async function RentPage() {
  const [{ t }, user, plans] = await Promise.all([getT(), getUser(), getRentPlans()]);
  return (
    <div className="wrap">
      <div className="page-h rv rv-up">
        <div>
          <div className="crumb"><a href="/">{t('หน้าหลัก')}</a>/<span>{t('เช่าเว็บ')}</span></div>
          <h1>{t('เลือกแพ็กเกจเช่าเว็บ')}</h1>
          <p className="muted" style={{ marginTop: 6 }}>{t('ตั้งชื่อเว็บ ชำระเงินจากกระเป๋าเงิน ใช้งานได้ทันที')} · <span className="rent-url">128bit.{ROOT_DOMAIN}</span></p>
        </div>
        {user && <a className="btn" href="/rent/my">{t('เว็บที่เช่าไว้')}</a>}
      </div>
      <RentPlans plans={plans.map((p) => ({ ...p, price: Number(p.price) }))} root={ROOT_DOMAIN} balance={user ? Number(user.balance) : 0} loggedIn={!!user} />
    </div>
  );
}
