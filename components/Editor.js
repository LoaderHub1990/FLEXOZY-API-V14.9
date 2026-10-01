'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Tabs from './Tabs';
import GkView, { T } from './GkView';
import { Field, Toggle, Range, Seg, Color, Media } from './Ui';
import { useApp } from './AppProvider';
import { Brand, PRESETS as ICONS, Trash } from './Icons';
import { DEFAULT_THEME, PRESETS, FONTS, FX, cleanTheme, resolveMedia, iconUrl } from '@/lib/theme';

const ERR = { yt: 'ลิงก์ YouTube ไม่ถูกต้อง', dc: 'ลิงก์ Discord ไม่ถูกต้อง', link: 'มีลิงก์ปุ่มที่ไม่ถูกต้อง (ต้องขึ้นต้น https://)', not_approved: 'ยังไม่ได้รับอนุมัติ', nf: 'ไม่พบหน้านี้' };
const fmt = t => new Date(t).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });

// ตัวแก้ไขหน้าแจกคีย์ + พรีวิวสด · as = slug ของผู้สร้างอื่น (โหมดแอดมิน)
export default function Editor({ as, onBack }) {
  const { api, toast, copy } = useApp();
  const [c, setC] = useState(null), [f, setF] = useState(null), [saved, setSaved] = useState(''), [imgv, setImgv] = useState({}), [max, setMax] = useState(72), [busy, setBusy] = useState(false), [pv, setPv] = useState('0');

  const load = useCallback(async () => {
    const j = await api('creator', { act: 'get', as });
    if (j.error) return toast(ERR[j.error] || 'โหลดไม่สำเร็จ', 'bad');
    const p = j.page, d = { title: p?.title ?? j.creator.slug, desc: p?.desc || '', yt: p?.yt || '', dc: p?.dc || '', wait: p?.wait ?? 15, hours: p?.hours ?? 24, off: p?.off || 0, links: p?.links || [], theme: cleanTheme(p?.theme) };
    setC(j.creator); setF(d); setSaved(JSON.stringify(d)); setImgv(j.imgv || {}); setMax(j.max);
  }, [api, as, toast]);
  useEffect(() => { load(); }, [load]);
  const dirty = f && JSON.stringify(f) !== saved;
  useEffect(() => { if (!dirty) return; const h = e => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const th = (k, v) => setF(s => ({ ...s, theme: { ...s.theme, [k]: v } }));
  const sub = (g, k, v) => setF(s => ({ ...s, theme: { ...s.theme, [g]: { ...s.theme[g], [k]: v } } }));
  const common = { api, toast, as, slug: c?.slug, imgv, setImgv };

  async function save() {
    setBusy(true);
    const j = await api('creator', { ...f, as });
    setBusy(false);
    if (j.error) return toast(ERR[j.error] || 'บันทึกไม่สำเร็จ', 'bad');
    setSaved(JSON.stringify(f)); toast('บันทึกแล้ว', 'ok');
  }

  const links = f?.links || [];
  const freeSlot = () => [0, 1, 2, 3, 4, 5].find(i => !links.some(l => l.slot === i));
  const addLink = () => { const s = freeSlot(); if (s != null) set('links', [...links, { slot: s, label: '', url: '', icon: 'website' }]); };
  const upLink = (i, k, v) => set('links', links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const th2 = f ? f.theme : DEFAULT_THEME;
  const prev = useMemo(() => {
    if (!f || !c) return null;
    const theme = cleanTheme(f.theme), media = resolveMedia(c.slug, theme, imgv);
    return {
      d: { title: f.title, desc: f.desc, theme, media, off: pv === 'off', site: { name: 'ชื่อเว็บ' }, links: f.links.map(l => ({ label: l.label || 'ลิงก์', url: l.url, icon: l.icon, img: l.icon === 'img' ? iconUrl(c.slug, l.slot, imgv) : '' })) },
      ui: { t: T.th, lang: 'th', step: pv === '1' ? 1 : pv === '2' ? 2 : pv === '3' ? 3 : 0, left: 0, powOk: true, busy: false, user: pv === 'anon' ? null : 'ตัวอย่าง', key: pv === 'key' ? { key: c.prefix + '-XXXXXXX-XXXXX', exp: Date.now() + f.hours * 36e5 } : null, sitekey: '', loginHref: '#' },
    };
  }, [f, c, imgv, pv]);

  if (!f || !c) return <div className="empty"><i className="spin" /></div>;
  const origin = typeof location !== 'undefined' ? location.origin : '';

  const general = (
    <div className="stack">
      <Field label="ชื่อหน้า"><input value={f.title} maxLength={60} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="คำอธิบายสั้นๆ"><input value={f.desc} maxLength={140} onChange={e => set('desc', e.target.value)} /></Field>
      <Field label="ลิงก์ขั้นที่ 1 (เช่น ช่อง YouTube / ลิงก์ที่อยากให้เปิด)"><input value={f.yt} onChange={e => set('yt', e.target.value)} placeholder="https://youtube.com/@yourchannel" /></Field>
      <Field label="ลิงก์ขั้นที่ 2 (ลิงก์เชิญ Discord)"><input value={f.dc} onChange={e => set('dc', e.target.value)} placeholder="https://discord.gg/xxxx" /></Field>
      <div className="row">
        <Field label="เวลารอแต่ละขั้น (วินาที)"><input type="number" min="10" max="120" value={f.wait} onChange={e => set('wait', e.target.value)} /></Field>
        <Field label={`อายุคีย์ (ชม.) สูงสุด ${max}`}><input type="number" min="1" max={max} value={f.hours} onChange={e => set('hours', e.target.value)} /></Field>
      </div>
      <Toggle label="เปิดให้ใช้งานหน้านี้" v={!f.off} set={v => set('off', v ? 0 : 1)} />
      <div className="pcard"><small>ลิงก์หน้าของคุณ</small><span className="mono">{origin}/getkey/{c.slug}</span></div>
      <div className="row"><button className="btn sm" onClick={() => copy(`${origin}/getkey/${c.slug}`, 'คัดลอกลิงก์แล้ว')}>คัดลอกลิงก์</button><a className="btn sm" href={`/getkey/${c.slug}`} target="_blank" rel="noreferrer">เปิดหน้าจริง ↗</a></div>
    </div>
  );

  const style = (
    <div className="stack">
      <span className="lbl">สไตล์การ์ด</span>
      <div className="presets">{PRESETS.map(([k, n, d]) => <button type="button" key={k} className={'preset' + (th2.preset === k ? ' on' : '')} onClick={() => th('preset', k)}><b>{n}</b><small>{d}</small></button>)}</div>
      <Color label="สีเน้น (ปุ่ม / แถบ / เงา)" v={th2.accent} set={v => th('accent', v)} />
      <div className="row">
        <Field label="ฟอนต์"><select value={th2.font} onChange={e => th('font', e.target.value)}>{Object.entries(FONTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></Field>
        <label>จัดตำแหน่ง<Seg v={th2.align} set={v => th('align', v)} opts={[['left', 'ชิดซ้าย'], ['center', 'กึ่งกลาง']]} /></label>
      </div>
      <Range label="ความโค้งมุม" v={th2.radius} set={v => th('radius', v)} max={28} unit="px" />
      <Range label="ความทึบของการ์ด" v={th2.cardAlpha} set={v => th('cardAlpha', v)} min={20} unit="%" />
      <div className="row">
        <label>รูปโลโก้<Seg v={th2.logoShape} set={v => th('logoShape', v)} opts={[['round', 'วงกลม'], ['square', 'เหลี่ยม']]} /></label>
        <Toggle label="เงาแข็งแบบ Flexozy" v={th2.shadow} set={v => th('shadow', v)} />
      </div>
      <span className="lbl">เอฟเฟกต์ลอย</span>
      <div className="chips">{FX.map(([k, l]) => <button type="button" key={k} className={th2.fx === k ? 'on' : ''} onClick={() => th('fx', k)}>{l}</button>)}</div>
      <hr className="hr" />
      <span className="lbl">ข้อความที่กำหนดเอง (เว้นว่าง = ใช้ค่าเริ่มต้น)</span>
      <Field label="ป้ายเล็กเหนือชื่อ (เช่น VIP KEY)"><input value={th2.text.badge} maxLength={24} onChange={e => sub('text', 'badge', e.target.value)} /></Field>
      <Field label="ข้อความต้อนรับ"><input value={th2.text.welcome} maxLength={90} onChange={e => sub('text', 'welcome', e.target.value)} /></Field>
      <div className="row">
        <Field label="ปุ่มเริ่ม"><input value={th2.text.start} maxLength={28} onChange={e => sub('text', 'start', e.target.value)} placeholder="เริ่มขั้นตอน" /></Field>
        <Field label="ปุ่มรับคีย์"><input value={th2.text.claim} maxLength={28} onChange={e => sub('text', 'claim', e.target.value)} placeholder="รับคีย์" /></Field>
      </div>
      <Field label="ข้อความท้ายหน้า"><input value={th2.text.foot} maxLength={80} onChange={e => sub('text', 'foot', e.target.value)} /></Field>
    </div>
  );

  const media = (
    <div className="stack">
      <span className="lbl">พื้นหลัง</span>
      <Seg v={th2.bg.type} set={v => sub('bg', 'type', v)} opts={[['grid', 'กริด (เดิม)'], ['solid', 'สีเดียว'], ['image', 'รูป / GIF']]} />
      {th2.bg.type === 'solid' && <Color label="สีพื้นหลัง" v={th2.bg.color} set={v => sub('bg', 'color', v)} />}
      {th2.bg.type === 'image' && (
        <>
          <Media {...common} kind="bg" label="รูป / GIF พื้นหลัง" accept="image/png,image/jpeg,image/webp,image/gif" url={th2.bg.url} setUrl={v => sub('bg', 'url', v)} hint="GIF อัปโหลดได้ไม่เกิน 2.8MB — ไฟล์ใหญ่กว่านั้นวางลิงก์ .gif ตรงๆ (Discord / Tenor / Giphy)" />
          <Range label="ความมืดทับพื้นหลัง" v={th2.bg.overlay} set={v => sub('bg', 'overlay', v)} max={95} unit="%" />
          <Range label="เบลอ" v={th2.bg.blur} set={v => sub('bg', 'blur', v)} max={24} unit="px" />
          <Toggle label="ทำเป็นขาวดำ (คุมโทนเดิม)" v={th2.bg.gray} set={v => sub('bg', 'gray', v)} />
        </>
      )}
      <hr className="hr" />
      <span className="lbl">เพลงพื้นหลัง</span>
      <Media {...common} kind="music" audio label="ไฟล์เพลง หรือ ลิงก์ (mp3 / YouTube)" accept="audio/*" url={th2.music.url} setUrl={v => sub('music', 'url', v)} urlPlaceholder="https://… .mp3  หรือ  https://youtu.be/…" hint="อัปโหลดได้ไม่เกิน 4.2MB (mp3/ogg/wav/m4a) · เบราว์เซอร์บังคับให้ผู้เข้าชมแตะหน้าจอก่อนจึงจะเล่นเสียงได้ จะมีปุ่มเพลงลอยมุมขวาล่าง" />
      <Range label="ระดับเสียงเริ่มต้น" v={th2.music.vol} set={v => sub('music', 'vol', v)} unit="%" />
      <div className="row"><Toggle label="เล่นอัตโนมัติ" v={th2.music.auto} set={v => sub('music', 'auto', v)} /><Field label="ชื่อเพลง (แสดงที่ปุ่ม)"><input value={th2.music.title} maxLength={40} onChange={e => sub('music', 'title', e.target.value)} /></Field></div>
      <hr className="hr" />
      <Media {...common} kind="logo" label="โลโก้" accept="image/png,image/jpeg,image/webp,image/gif" url={th2.logoUrl} setUrl={v => th('logoUrl', v)} />
      <Media {...common} kind="banner" label="แบนเนอร์ด้านบน (แนะนำ 1200×400)" accept="image/png,image/jpeg,image/webp,image/gif" url={th2.bannerUrl} setUrl={v => th('bannerUrl', v)} />
    </div>
  );

  const linksTab = (
    <div className="stack">
      <p className="dim" style={{ margin: 0 }}>ปุ่มลิงก์ใต้ชื่อหน้า (สูงสุด 6) — เช่น ช่อง YouTube, TikTok, เว็บไซต์</p>
      {links.map((l, i) => (
        <div className="linkrow" key={l.slot}>
          <span className="lico">{l.icon === 'img' && imgv['i' + l.slot] ? <img src={iconUrl(c.slug, l.slot, imgv)} alt="" width="22" height="22" /> : <Brand name={l.icon} />}</span>
          <input placeholder="ชื่อปุ่ม" maxLength={24} value={l.label} onChange={e => upLink(i, 'label', e.target.value)} />
          <input placeholder="https://…" value={l.url} onChange={e => upLink(i, 'url', e.target.value)} />
          <select value={l.icon} onChange={e => upLink(i, 'icon', e.target.value)}>{ICONS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}<option value="img">ไอคอนเอง</option></select>
          <button type="button" className="icon-btn" onClick={() => set('links', links.filter((_, j) => j !== i))} aria-label="ลบ"><Trash /></button>
          {l.icon === 'img' && <div className="linkup"><Media {...common} kind={'i' + l.slot} label="ไอคอนของปุ่มนี้" accept="image/png,image/jpeg,image/webp,image/gif" url="" setUrl={() => {}} urlPlaceholder="อัปโหลดรูปไอคอน →" /></div>}
        </div>
      ))}
      {links.length < 6 && <button type="button" className="btn" onClick={addLink}>+ เพิ่มปุ่มลิงก์</button>}
    </div>
  );

  return (
    <div className="ed">
      <div className="ed-form">
        <div className="ed-head">
          <div>
            {as && <span className="badge">โหมดแอดมิน</span>}
            <h2 style={{ margin: 0 }}>{as ? `แก้ไขหน้าของ /${c.slug}` : 'หน้าแจกคีย์ของฉัน'}</h2>
          </div>
          <div className="row" style={{ flex: 'none' }}>
            {onBack && <button className="btn sm" onClick={() => (!dirty || confirm('ยังไม่ได้บันทึก ออกเลยไหม?')) && onBack()}>← กลับ</button>}
            <button className="btn primary" onClick={save} disabled={busy || !dirty}>{busy ? <i className="spin" /> : null}{dirty ? 'บันทึก' : 'บันทึกแล้ว'}</button>
          </div>
        </div>
        <Tabs tabs={[['g', 'ทั่วไป', general], ['s', 'สไตล์', style], ['m', 'พื้นหลัง & เพลง', media], ['l', 'ลิงก์', linksTab], ['k', 'คีย์', <Keys key="k" as={as} slug={c.slug} />], ['t', 'สถิติ', <Stats key="t" as={as} />]]} />
      </div>
      <aside className="ed-pv">
        <div className="pv-bar">
          <span className="lbl">พรีวิวสด</span>
          <div className="chips">{[['anon', 'ยังไม่ล็อกอิน'], ['0', 'ขั้น 1'], ['1', 'ขั้น 2'], ['2', 'ขั้น 3'], ['3', 'รับคีย์'], ['key', 'ได้คีย์'], ['off', 'ปิดหน้า']].map(([k, l]) => <button type="button" key={k} className={pv === k ? 'on' : ''} onClick={() => setPv(k)}>{l}</button>)}</div>
        </div>
        <div className="pv-frame">{prev && <GkView d={prev.d} ui={prev.ui} preview />}</div>
        <small className="hint">พรีวิวไม่เล่นเพลงและไม่ทำงานจริง · บันทึกแล้วดูที่หน้าจริงได้เลย</small>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- คีย์ของหน้านี้
function Keys({ as, slug }) {
  const { api, toast, copy } = useApp();
  const [ks, setKs] = useState(null), [now, setNow] = useState(Date.now());
  const load = useCallback(async () => { const j = await api('creator', { act: 'keys', as }); if (!j.error) { setKs(j.keys); setNow(j.now); } }, [api, as]);
  useEffect(() => { load(); }, [load]);
  const act = async (a, key, extra) => { const j = await api('creator', { act: a, as, key, ...extra }); if (j.error) return toast('ไม่สำเร็จ', 'bad'); load(); return j; };
  if (!ks) return <div className="empty"><i className="spin" /></div>;
  return (
    <div className="stack">
      <div className="ph"><h3 style={{ margin: 0 }}>{ks.length} คีย์</h3><button className="btn sm" onClick={async () => { const j = await api('creator', { act: 'purge', as }); toast(`ลบที่หมดอายุ/ยกเลิก ${j.n || 0} คีย์`, 'ok'); load(); }}>ล้างที่หมดอายุ</button></div>
      {!ks.length ? <div className="empty">ยังไม่มีคีย์</div> : (
        <div className="tblwrap"><table className="tbl2"><thead><tr><th>คีย์</th><th>ผู้ใช้</th><th>สถานะ</th><th>หมดอายุ</th><th /></tr></thead><tbody>
          {ks.map(k => { const st = k.off ? ['ยกเลิก', 'bad'] : k.exp <= now ? ['หมดอายุ', 'mute'] : ['ใช้ได้', 'ok']; return (
            <tr key={k.key}>
              <td className="mono"><button className="lnk" onClick={() => copy(k.key)}>{k.key}</button></td>
              <td className="mono dim">{k.uid}</td><td><span className={'tag ' + st[1]}>{st[0]}</span></td><td className="dim">{fmt(k.exp)}</td>
              <td className="acts"><button className="btn sm" onClick={() => act('keyextend', k.key, { hours: 24 })}>+24ชม.</button><button className="btn sm" onClick={() => act('keyoff', k.key)}>{k.off ? 'เปิด' : 'ยกเลิก'}</button><button className="btn sm danger" onClick={() => confirm('ลบคีย์นี้?') && act('keydel', k.key)}>ลบ</button></td>
            </tr>); })}
        </tbody></table></div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- สถิติ
function Stats({ as }) {
  const { api } = useApp();
  const [s, setS] = useState(null);
  useEffect(() => { api('creator', { act: 'stats', as }).then(j => !j.error && setS(j)); }, [api, as]);
  if (!s) return <div className="empty"><i className="spin" /></div>;
  const mx = Math.max(1, ...s.days.map(d => d.v));
  return (
    <div className="stack">
      <div className="numbers sm">{[['เข้าชม', s.views], ['ผู้เข้าชมไม่ซ้ำ', s.visitors], ['เริ่มขั้นตอน', s.started], ['รับคีย์แล้ว', s.claims]].map(([l, n]) => <div key={l}><b>{n.toLocaleString()}</b><span>{l}</span></div>)}</div>
      <span className="lbl">7 วันล่าสุด (แท่ง = เข้าชม · ขีด = รับคีย์)</span>
      <div className="bars">{s.days.map(d => <div key={d.d} title={`${d.d}: ${d.v} เข้าชม, ${d.c} คีย์`}><i style={{ height: Math.max(4, d.v / mx * 100) + '%' }}><u style={{ height: d.v ? Math.min(100, d.c / d.v * 100) + '%' : 0 }} /></i><small>{d.d.slice(5)}</small></div>)}</div>
    </div>
  );
}
