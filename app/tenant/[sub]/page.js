import { notFound } from 'next/navigation';
import { rentalBySub, rentalState, ROOT_DOMAIN } from '@/lib/rent';
import { getPrefs } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { TEMPLATES, getTemplate, demoSite } from '@/lib/templates';
import QRCode from 'qrcode';
import { promptPayPayload, validPhone, fmtPhone, priceNumber } from '@/lib/promptpay';
import CopyBtn from '@/components/CopyBtn';

const qrSvg = (payload) => QRCode.toString(payload, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const sub = (await params).sub;
  if (sub.startsWith('~')) { const d = TEMPLATES.find((x) => x.slug === sub.slice(1)); return { title: { absolute: d ? `${d.name} — ตัวอย่างเว็บเช่า` : '404' }, robots: { index: true } }; }
  const r = await rentalBySub(sub);
  const s = r?.site || {};
  return r ? { title: { absolute: s.title || r.sub }, description: s.tagline || undefined, robots: { index: rentalState(r) === 'active' } } : { title: { absolute: '404' } };
}

const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff');
const rgb = (c) => { const h = hex(c).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
const onColor = (c) => { const [r, g, b] = rgb(c).split(',').map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000' : '#fff'; };
const safeHref = (u) => (/^https?:\/\//i.test(u) ? u : '#');

export default async function Tenant({ params, searchParams }) {
  const { sub } = await params;
  const embed = (await searchParams)?.embed === '1';
  const demo = sub.startsWith('~');
  if (demo && !TEMPLATES.some((x) => x.slug === sub.slice(1))) notFound();
  const r = demo ? { sub, site: demoSite(sub.slice(1)), status: 'active', expires_at: new Date(Date.now() + 864e5) } : await rentalBySub(sub);
  if (!r) notFound();
  const { lang } = await getPrefs();
  const t = makeT(lang);
  const st = rentalState(r);
  const tpl = getTemplate(r.site?.template).slug;
  const s = r.site || {};
  const theme = s.theme === 'light' ? 'light' : 'dark';
  const color = hex(s.color);
  const style = { '--ac': color, '--ac-rgb': rgb(color), '--on-ac': onColor(color) };

  if (st !== 'active') {
    return (
      <div className="tn" data-theme={theme} data-tpl={tpl} style={style}>
        <main className="tn-gone">
          <div className="tn-gone-ic">{st === 'suspended' ? '⏸' : '⌛'}</div>
          <h1>{st === 'suspended' ? t('เว็บนี้ถูกระงับ') : t('เว็บนี้หมดอายุแล้ว')}</h1>
          <p>{t('เจ้าของเว็บสามารถต่ออายุได้ที่')} <a href={`https://${ROOT_DOMAIN}/rent/my`}>{ROOT_DOMAIN}/rent/my</a></p>
        </main>
      </div>
    );
  }
  const title = s.title || r.sub;
  const payOn = validPhone(s.pay_phone);
  const payQr = payOn ? await qrSvg(promptPayPayload(s.pay_phone)) : '';
  const itemQr = payOn ? await Promise.all((s.items || []).map(async (it) => { const n = priceNumber(it.price); return n ? { n, svg: await qrSvg(promptPayPayload(s.pay_phone, n)) } : null; })) : [];
  return (
    <div className="tn" data-theme={theme} data-tpl={tpl} style={style}>
      <i className="tn-glow" aria-hidden="true" /><i className="tn-deco" aria-hidden="true" />
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
                  {itemQr[i] && (
                    <details className="tn-qr-d">
                      <summary>{t('จ่ายด้วย QR')}</summary>
                      <div className="tn-qr-box"><div className="tn-qr" dangerouslySetInnerHTML={{ __html: itemQr[i].svg }} /><b>฿{itemQr[i].n.toLocaleString('th-TH')}</b><small>{s.pay_name || fmtPhone(s.pay_phone)}</small></div>
                    </details>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      {payOn && (
        <section className="tn-pay" id="pay">
          <div className="tn-qr" dangerouslySetInnerHTML={{ __html: payQr }} />
          <div className="tn-pay-i">
            <h2>{t('ช่องทางชำระเงิน')}</h2>
            <p className="tn-pay-m">PromptPay / TrueMoney</p>
            <div className="tn-pay-n">{fmtPhone(s.pay_phone)} <CopyBtn text={s.pay_phone} label={t('คัดลอกเบอร์')} done={t('คัดลอกแล้ว')} /></div>
            {s.pay_name && <p className="tn-pay-m">{t('ชื่อบัญชี')}: {s.pay_name}</p>}
            {s.pay_note && <p className="tn-pay-m">{s.pay_note}</p>}
            <small>{t('สแกนด้วยแอปธนาคาร/ทรูมันนี่ แล้วแจ้งโอนกับเจ้าของเว็บ')}</small>
          </div>
        </section>
      )}
      {demo && !embed && (
        <div className="tn-demo" role="navigation">
          <span>{t('นี่คือเว็บตัวอย่าง')}</span>
          <div className="tn-demo-sw">{TEMPLATES.map((x) => <a key={x.slug} href={'/' + x.slug} className={x.slug === tpl ? 'on' : ''}>{x.name}</a>)}</div>
          <a className="tn-demo-cta" href={`/rent?tpl=${tpl}`}>{t('เลือกแบบนี้')} →</a>
        </div>
      )}
      <footer className="tn-foot">{t('สร้างด้วย')} <a href={`https://${ROOT_DOMAIN}/rent`}>{ROOT_DOMAIN}</a></footer>
    </div>
  );
}
