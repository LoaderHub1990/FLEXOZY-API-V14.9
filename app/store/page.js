import Link from 'next/link';
import { getCategories, getProducts } from '@/lib/shop';
import { baht } from '@/lib/util';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ร้านค้า' };

export default async function Store({ searchParams }) {
  const sp = await searchParams;
  const cid = parseInt(sp?.category, 10) || null;
  const [cats, products] = await Promise.all([getCategories(), getProducts({ categoryId: cid })]);
  const cur = cats.find((c) => c.id === cid);
  return (
    <div className="wrap">
      <div className="page-h rv rv-up">
        <div>
          <div className="crumb"><Link href="/">หน้าหลัก</Link>/<span>ร้านค้า</span>{cur && <>/<span>{cur.name}</span></>}</div>
          <h1>{cur ? cur.name : 'สินค้าทั้งหมด'}</h1>
        </div>
        <span className="muted">{products.length} รายการ</span>
      </div>
      <div className="filters rv rv-up" style={{ '--i': 1 }} aria-label="หมวดหมู่">
        <Link href="/store" className={'filter' + (!cid ? ' on' : '')}>สินค้าทั้งหมด</Link>
        {cats.map((c) => (
          <Link key={c.id} href={`/store?category=${c.id}`} className={'filter' + (cid === c.id ? ' on' : '')}>{c.name}</Link>
        ))}
      </div>
      {products.length === 0 ? (
        <div className="empty">ยังไม่มีสินค้าในหมวดนี้</div>
      ) : (
        <div className="grid">
          {products.map((p, i) => (
            <Link key={p.id} href={`/store/${p.id}`} className="pcard rv" style={{ '--i': i % 8 }}>
              <div className="pcard-img">
                {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : null}
                {p.stock === 0 && <span className="badge-out">สินค้าหมด</span>}
              </div>
              <div className="pcard-body">
                <div className="pcard-name">{p.name}</div>
                <div className="price">{baht(p.price)}<small>฿</small></div>
                <div className="stock">คงเหลือ <b>{p.stock}</b></div>
                <span className={'btn btn-sm ' + (p.stock > 0 ? 'btn-primary' : '')} style={p.stock === 0 ? { opacity: 0.5 } : null}>{p.stock > 0 ? 'ซื้อเลย' : 'สินค้าหมด'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
