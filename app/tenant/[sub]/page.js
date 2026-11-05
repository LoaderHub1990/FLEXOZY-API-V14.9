import { notFound } from 'next/navigation';
import { rentalBySub, rentalState, ROOT_DOMAIN } from '@/lib/rent';
import { getPrefs } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await rentalBySub((await params).sub);
  const s = r?.site || {};
  return r ? { title: { absolute: s.title || r.sub }, description: s.tagline || undefined, robots: { index: rentalState(r) === 'active' } } : { title: { absolute: '404' } };
}

const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff');
const rgb = (c) => { const h = hex(c).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
const onColor = (c) => { const [r, g, b] = rgb(c).split(',').map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000' : '#fff'; };
const safeHref = (u) => (/^https?:\/\//i.test(u) ? u : '#');

export default async function Tenant({ params }) {
  const { sub } = await params;
  const r = await rentalBySub(sub);
  if (!r) notFound();
  const { lang } = await getPrefs();
  const t = makeT(lang);
  const st = rentalState(r);
  const s = r.site || {};
  const theme = s.theme === 'light' ? 'light' : 'dark';
  const color = hex(s.color);
  const style = { '--ac': color, '--ac-rgb': rgb(color), '--on-ac': onColor(color) };

  if (st !== 'active') {
    return (
      <div className="tn" data-theme={theme} style={style}>
        <main className="tn-gone">
          <div className="tn-gone-ic">{st === 'suspended' ? '⏸' : '⌛'}</div>
          <h1>{st === 'suspended' ? t('เว็บนี้ถูกระงับ') : t('เว็บนี้หมดอายุแล้ว')}</h1>
          <p>{t('เจ้าของเว็บสามารถต่ออายุได้ที่')} <a href={`https://${ROOT_DOMAIN}/rent/my`}>{ROOT_DOMAIN}/rent/my</a></p>
        </main>
      </div>
    );
  }
  const title = s.title || r.sub;
  return (
    <div className="tn" data-theme={theme} style={style}>
      <i className="tn-glow" aria-hidden="true" />
      <header className="tn-nav">
        <div className="tn-brand">{s.logo ? <img src={s.logo} alt="" width="34" height="34" /> : <span className="tn-dot" />}<b>{title}</b></div>
        <nav>{(s.links || []).slice(0, 3).map((l, i) => <a key={i} href={safeHref(l.url)} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>)}</nav>
      </header>
      <main className="tn-main">
        <section className="tn-hero">
          <h1>{title}</h1>
          {s.tagline && <p>{s.tagline}</p>}
          {(s.links || []).length > 0 && (
            <div className="tn-cta">{s.links.map((l, i) => <a key={i} className={i === 0 ? 'tn-btn pri' : 'tn-btn'} href={safeHref(l.url)} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>)}</div>
          )}
        </section>
        {s.about && <section className="tn-about"><p>{s.about}</p></section>}
        {(s.items || []).length > 0 && (
          <section className="tn-grid">
            {s.items.map((it, i) => (
              <article className="tn-card" key={i} style={{ '--i': i % 8 }}>
                {it.image ? <img src={it.image} alt="" loading="lazy" /> : null}
                <div className="tn-card-b">
                  <h3>{it.name}</h3>
                  {it.desc && <p>{it.desc}</p>}
                  {it.price && <div className="tn-price">{it.price}</div>}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      <footer className="tn-foot">{t('สร้างด้วย')} <a href={`https://${ROOT_DOMAIN}/rent`}>{ROOT_DOMAIN}</a></footer>
    </div>
  );
}
