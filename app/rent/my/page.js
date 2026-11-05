import { getT } from '@/lib/lang';
import { RentManage } from '@/components/Rent';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'เว็บที่เช่าไว้', robots: { index: false } };

export default async function MyRent() {
  const { t } = await getT();
  return (
    <div className="wrap">
      <div className="page-h rv rv-up">
        <div>
          <div className="crumb"><a href="/">{t('หน้าหลัก')}</a>/<a href="/rent">{t('เช่าเว็บ')}</a>/<span>{t('เว็บที่เช่าไว้')}</span></div>
          <h1>{t('เว็บที่เช่าไว้ของฉัน')}</h1>
        </div>
        <a className="btn btn-primary" href="/rent">+ {t('เช่าเว็บ')}</a>
      </div>
      <RentManage />
    </div>
  );
}
