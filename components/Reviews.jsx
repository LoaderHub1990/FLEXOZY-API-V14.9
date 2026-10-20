import Icon from './Icons';
import { Avatar } from './Avatar';

export const Stars = ({ n, size = 14 }) => (
  <span className="stars" aria-label={`${n} จาก 5 ดาว`}>
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} n="star" size={size} className={i <= Math.round(n) ? 'on' : ''} />)}
  </span>
);

const fmt = (iso) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' });

function Card({ r, hidden }) {
  const p = { name: r.name, avatar: r.avatar, decoration: r.decoration, showFrame: r.showFrame };
  return (
    <article className="rv-card" aria-hidden={hidden ? 'true' : undefined}>
      <header>
        <Avatar p={p} size={44} />
        <div className="rv-who">
          <b title={r.name}>{r.name}</b>
          <Stars n={r.rating} />
        </div>
      </header>
      <p className="rv-text">{r.comment}</p>
      <footer><Icon n="bag" size={13} /> <span>{r.product}</span><i /><time>{fmt(r.at)}</time></footer>
    </article>
  );
}

/** รีวิวจากลูกค้า — มากกว่า 4 ใบเลื่อนวนอัตโนมัติ น้อยกว่านั้นแสดงเป็นกริด */
export default function Reviews({ reviews, stats }) {
  if (!reviews.length) return null;
  const scroll = reviews.length >= 5;
  let base = reviews;
  while (scroll && base.length < 8) base = base.concat(reviews);
  const dur = Math.max(40, base.length * 7);
  return (
    <section className="section reviews rv rv-up">
      <div className="sec-head">
        <span className="sec-ic"><Icon n="star" size={18} /></span>
        <div>
          <h2 className="sec-title">รีวิวจากลูกค้า</h2>
          <p className="sub" style={{ margin: 0 }}>
            <b className="rv-avg">{stats.avg.toFixed(1)}</b> <Stars n={stats.avg} size={12} /> จาก {stats.count.toLocaleString('th-TH')} รีวิว
          </p>
        </div>
      </div>
      {scroll ? (
        <div className="ticker rv-ticker">
          <div className="ticker-track" style={{ animationDuration: `${dur}s` }}>
            {[...base, ...base].map((r, i) => <Card key={i} r={r} hidden={i >= base.length} />)}
          </div>
        </div>
      ) : (
        <div className="rv-grid">{reviews.map((r) => <Card key={r.id} r={r} />)}</div>
      )}
    </section>
  );
}
