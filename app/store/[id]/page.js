import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/shop';
import { getUser } from '@/lib/auth';
import BuyBox from '@/components/BuyBox';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = /^\d+$/.test(id) ? await getProduct(parseInt(id, 10)) : null;
  return { title: p ? p.name : 'ไม่พบสินค้า' };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const [p, user] = await Promise.all([getProduct(parseInt(id, 10)), getUser()]);
  if (!p) notFound();
  return (
    <div className="wrap">
      <div className="crumb">
        <Link href="/store">ร้านค้า</Link>/
        {p.category_name && <><Link href={`/store?category=${p.category_id}`}>{p.category_name}</Link>/</>}
        <span>{p.name}</span>
      </div>
      <div className="pd">
        <div className="pd-img rv rv-left">{p.image ? <img src={p.image} alt={p.name} /> : null}</div>
        <div className="rv rv-right" style={{ '--i': 1 }}>
          <div className="panel">
            <h1>{p.name}</h1>
            <BuyBox
              loggedIn={!!user}
              balance={user ? user.balance : 0}
              product={{ id: p.id, name: p.name, price: p.price, stock: p.stock, sold: p.sold }}
            />
          </div>
        </div>
      </div>
      <div className="panel rv rv-up" style={{ marginTop: 18, '--i': 2 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>รายละเอียดสินค้า</h2>
        <div className="desc">{p.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div>
      </div>
    </div>
  );
}
