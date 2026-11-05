import { notFound } from 'next/navigation';
import { rentalState, ROOT_DOMAIN } from '@/lib/rent';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import { validPhone } from '@/lib/phone';
import { loadRental, getCatalog, getTUser } from '@/lib/tstore';
import TenantStore from '@/components/TenantStore';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }) {
  const sub = (await params).sub;
  const r = await loadRental(sub);
  const s = r?.site || {};
  if (!r) return { title: { absolute: '404' } };
  const demo = !!r.demo;
  return { title: { absolute: demo ? `${s.title} — ร้านตัวอย่าง` : s.title || r.sub }, description: s.tagline || undefined, robots: { index: demo || rentalState(r) === 'active' } };
}

const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff');
const rgb = (c) => { const h = hex(c).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
const onColor = (c) => { const [r, g, b] = rgb(c).split(',').map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000' : '#fff'; };
const safeHref = (u) => (/^https?:\/\//i.test(u) ? u : '#');

export default async function Tenant({ params, searchParams }) {
  const { sub } = await params;
  const embed = (await searchParams)?.embed === '1';
  const r = await loadRental(sub);
  if (!r) notFound();
  const demo = !!r.demo;
  const st = rentalState(r);
  const s = r.site || {};
  const tpl = getTemplate(s.template).slug;
  const theme = s.theme === 'light' ? 'light' : 'dark';
  const color = hex(s.color);
  const style = { '--ac': color, '--ac-rgb': rgb(color), '--on-ac': onColor(color) };

  if (st !== 'active') {
    return (
      <div className="tn" data-theme={theme} data-tpl={tpl} style={style}>
        <main className="tn-gone">
          <div className="tn-gone-ic">{st === 'suspended' ? '⏸' : '⌛'}</div>
          <h1>{st === 'suspended' ? 'ร้านนี้ถูกระงับ' : 'ร้านนี้หมดอายุแล้ว'}</h1>
          <p>เจ้าของร้านสามารถต่ออายุได้ที่ <a href={`https://${ROOT_DOMAIN}/rent/my`}>{ROOT_DOMAIN}/rent/my</a></p>
        </main>
      </div>
    );
  }
  const [catalog, me] = await Promise.all([getCatalog(r.id), getTUser(r)]);
  const shop = {
    title: s.title || r.sub, tagline: s.tagline || '', about: s.about || '', logo: s.logo || '',
    links: (s.links || []).map((l) => ({ label: l.label, url: safeHref(l.url) })), canTopup: validPhone(s.pay_phone),
  };
  return (
    <div className="tn" data-theme={theme} data-tpl={tpl} style={style}>
      <i className="tn-glow" aria-hidden="true" /><i className="tn-deco" aria-hidden="true" />
      <TenantStore sub={r.sub} demo={demo} shop={shop} initial={{ ...catalog, me }} />
      {demo && !embed && (
        <div className="tn-demo" role="navigation">
          <span>ร้านตัวอย่าง — ลองสมัคร เติมเงิน ซื้อของได้จริง</span>
          <div className="tn-demo-sw">{TEMPLATES.map((x) => <a key={x.slug} href={'/' + x.slug} className={x.slug === tpl ? 'on' : ''}>{x.name}</a>)}</div>
          <a className="tn-demo-cta" href={`/rent?tpl=${tpl}`}>เลือกแบบนี้ →</a>
        </div>
      )}
      <footer className="tn-foot">สร้างด้วย <a href={`https://${ROOT_DOMAIN}/rent`}>{ROOT_DOMAIN}</a></footer>
    </div>
  );
}
