import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { rentalState, ROOT_DOMAIN } from '@/lib/rent';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import { validPhone } from '@/lib/phone';
import { loadRental, getCatalog, getTUser } from '@/lib/tstore';
import { makeT } from '@/lib/i18n';
import TenantApp from '@/components/TenantApp';

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
  const jar = await cookies();
  const ck = jar.get('fx_theme')?.value;
  const theme = ck === 'light' || ck === 'dark' ? ck : (s.theme === 'light' ? 'light' : 'dark'); // ผู้เข้าชมเลือกเองได้ ไม่เลือก = ใช้ธีมที่เจ้าของร้านตั้ง
  const lang = jar.get('fx_lang')?.value === 'en' ? 'en' : 'th';
  const color = hex(s.color);
  
  const vars = { '--ac': color, '--ac-rgb': rgb(color), '--on-ac': onColor(color) };
  if (st !== 'active') {
    return (
      <div className="tsk" data-skin={tpl} data-theme={theme} lang={lang} style={vars}>
        <main className="tn-gone">
          <div className="tn-gone-ic">{st === 'suspended' ? '⏸' : '⌛'}</div>
          <h1>{st === 'suspended' ? makeT(lang)('ร้านนี้ถูกระงับ') : makeT(lang)('ร้านนี้หมดอายุแล้ว')}</h1>
          <p>{makeT(lang)('เจ้าของร้านสามารถต่ออายุได้ที่')} <a href={`https://${ROOT_DOMAIN}/rent/my`}>{ROOT_DOMAIN}/rent/my</a></p>
        </main>
      </div>
    );
  }
  const [catalog, me] = await Promise.all([getCatalog(r.id, { demo }), getTUser(r)]);
  const shop = {
    title: s.title || r.sub, tagline: s.tagline || '', about: s.about || '', announce: s.announce || '', announce_en: s.announce_en || '', title_en: s.title_en || '', tagline_en: s.tagline_en || '', about_en: s.about_en || '', logo: s.logo || '', root: ROOT_DOMAIN, embed,
    links: (s.links || []).map((l) => ({ label: l.label, url: safeHref(l.url) })), canTopup: validPhone(s.pay_phone),
  };
  return <TenantApp sub={r.sub} demo={demo} shop={shop} initial={{ ...catalog, me }} skin={tpl} theme={theme} lang={lang} vars={vars} others={TEMPLATES.map((x) => ({ slug: x.slug, name: x.name }))} />;
}
