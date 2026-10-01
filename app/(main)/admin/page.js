'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Tabs from '@/components/Tabs';
import Editor from '@/components/Editor';
import { Field, Toggle, Range, Seg, Color, Media } from '@/components/Ui';
import { useApp } from '@/components/AppProvider';
import { FX, cleanTheme } from '@/lib/theme';

const fmt = t => new Date(t).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
const ERR = { id: 'Discord ID ไม่ถูกต้อง', slug: 'slug ไม่ถูกต้อง (a-z 0-9 - เริ่มด้วยตัวอักษร 2-30 ตัว)', taken: 'slug นี้ถูกใช้แล้ว', hasPage: 'ผู้ใช้นี้มีหน้าอยู่แล้ว เปลี่ยน slug ไม่ได้', forbidden: 'ทำรายการนี้ไม่ได้', owner_only: 'เฉพาะเจ้าของ (ADMIN_IDS)' };
const TYPES = { bot_ua: 'สคริปต์/บอท (UA)', origin: 'Origin ผิด', pow: 'PoW ไม่ผ่าน', too_fast: 'กดก่อนเวลา', device: 'เปลี่ยนอุปกรณ์', ip_change: 'IP เปลี่ยน', skip_steps: 'ข้ามขั้นตอน', account_age: 'บัญชีใหม่', not_member: 'ไม่อยู่ในเซิร์ฟเวอร์', ip_cap: 'IP รับคีย์ครบ', auto_block: 'บล็อกอัตโนมัติ' };

export default function Admin() {
  const { me, api, toast, copy, reloadSite } = useApp();
  const [D, setD] = useState(null), [edit, setEdit] = useState(null), [denied, setDenied] = useState(false);
  const load = useCallback(async () => { const j = await api('admin'); if (j.error) return setDenied(true); setD(j); }, [api]);
  useEffect(() => { if (me?.admin) load(); }, [me?.admin]); // eslint-disable-line
  const post = useCallback(async (act, extra = {}, ok) => { const j = await api('admin', { act, ...extra }); if (j.error) { toast(ERR[j.error] || 'ไม่สำเร็จ: ' + j.error, 'bad'); return j; } if (ok) toast(ok, 'ok'); await load(); return j; }, [api, toast, load]);

  if (me === undefined) return <main className="wrap"><div className="empty"><i className="spin" /></div></main>;
  if (!me?.admin || denied) return <main className="wrap narrow"><div className="panel gate"><h2>เฉพาะแอดมิน</h2><p>ล็อกอินด้วยบัญชีที่อยู่ใน ADMIN_IDS หรือที่เจ้าของเพิ่มสิทธิ์ให้</p></div></main>;
  if (!D) return <main className="wrap"><div className="empty"><i className="spin" /></div></main>;
  if (edit) return <main className="wrap"><Editor as={edit} onBack={() => { setEdit(null); load(); }} /></main>;

  const S = D.summary;
  return (
    <main className="wrap">
      <div className="head"><h1>แผงแอดมิน</h1><p className="dim">คุมได้ทั้งเว็บ — กด “แก้ไข/ตกแต่ง” ในแท็บหน้าเพื่อเข้าไปจัดการหน้าของคนอื่น</p></div>
      <Tabs tabs={[
        ['o', 'ภาพรวม', <Overview key="o" D={D} post={post} api={api} toast={toast} />],
        ['k', 'คีย์', <KeysTab key="k" D={D} post={post} copy={copy} toast={toast} />],
        ['p', 'หน้า & ผู้สร้าง', <Pages key="p" D={D} post={post} setEdit={setEdit} />],
        ['s', 'ความปลอดภัย', <Security key="s" D={D} post={post} />],
        ['w', 'ตั้งค่าเว็บ', <SiteTab key="w" D={D} post={post} api={api} toast={toast} reloadSite={reloadSite} />],
        ['l', 'Log', <Logs key="l" D={D} post={post} />],
      ]} />
      <p className="dim" style={{ fontSize: 13, marginTop: 24 }}>คีย์ทั้งหมด {S.total} · ใช้ได้ {S.active} · หมดอายุ {S.expired} · ยกเลิก {S.revoked}</p>
    </main>
  );
}

// ---------------------------------------------------------------- ภาพรวม
function Overview({ D, post, api, toast }) {
  const [g, setG] = useState(null), [hrs, setHrs] = useState(D.max);
  const S = D.summary, E = D.env;
  const cards = [['คีย์ใช้ได้', S.active], ['คีย์ทั้งหมด', S.total], ['หน้า', D.pages.length], ['ผู้สร้าง', D.creators.length], ['ผู้ใช้', D.users], ['ถูกแบน', D.bans.length]];
  return (
    <div className="stack">
      <div className="numbers">{cards.map(([l, n]) => <div key={l}><b>{n.toLocaleString()}</b><span>{l}</span></div>)}</div>
      <div className="grid2">
        <div className="panel"><h3>สถานะระบบ</h3>
          {[['ฐานข้อมูล', E.dbReady ? 'Redis ✓' : 'ไฟล์ในเครื่อง (' + E.db + ')', E.dbReady], ['บอท Discord (เพิ่มคนเข้าเซิร์ฟเวอร์)', E.bot ? 'ตั้งแล้ว ✓' : 'ยังไม่ตั้ง DISCORD_BOT_TOKEN', E.bot], ['Guild ID', D.site.guildId || 'ยังไม่ตั้ง (ไปที่ ตั้งค่าเว็บ)', !!D.site.guildId], ['Turnstile (captcha)', E.turnstile ? 'ตั้งแล้ว ✓' : 'ยังไม่ตั้ง', E.turnstile]].map(([l, v, ok]) => <div className="pcard" key={l}><small>{l}</small><span className={ok ? 'ok-t' : 'warn-t'}>{v}</span></div>)}
          <button className="btn sm" onClick={async () => { const j = await api('admin', { act: 'guildtest' }); setG(j.guild || { error: j.bot ? 'ยังไม่ได้ตั้ง Guild ID' : 'ยังไม่มี DISCORD_BOT_TOKEN' }); }}>ทดสอบบอท + เซิร์ฟเวอร์</button>
          {g && <div className={g.error ? 'err' : 'pcard'}>{g.error ? g.error : <><small>เซิร์ฟเวอร์</small><span>{g.name} · {g.members} สมาชิก ✓</span></>}</div>}
          <a className="btn sm" href="/api/health" target="_blank" rel="noreferrer">เปิด /api/health ↗</a>
        </div>
        <div className="panel"><h3>เครื่องมือ</h3>
          <Field label="อายุคีย์สูงสุดที่ผู้สร้างตั้งได้ (ชม.)"><div className="row"><input type="number" min="1" max="8760" value={hrs} onChange={e => setHrs(e.target.value)} /><button className="btn" style={{ flex: 'none' }} onClick={() => post('max', { hours: hrs }, 'บันทึกแล้ว')}>บันทึก</button></div></Field>
          <button className="btn" onClick={async () => { const j = await post('purge'); if (j.ok) toast(`ลบคีย์หมดอายุ/ยกเลิก ${j.n} คีย์`, 'ok'); }}>ล้างคีย์ที่หมดอายุ/ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- คีย์
function KeysTab({ D, post, copy, toast }) {
  const [q, setQ] = useState(''), [hours, setHours] = useState(24), [prefix, setPrefix] = useState('KEY'), [count, setCount] = useState(1), [made, setMade] = useState([]);
  const rows = useMemo(() => D.keys.filter(k => !q || (k.key + k.uid + k.page).toLowerCase().includes(q.toLowerCase())), [D.keys, q]);
  return (
    <div className="stack">
      <div className="panel"><h3>สร้างคีย์เอง</h3>
        <div className="row"><Field label="อายุ (ชม.)"><input type="number" min="1" value={hours} onChange={e => setHours(e.target.value)} /></Field><Field label="นำหน้า"><input value={prefix} maxLength={12} onChange={e => setPrefix(e.target.value)} /></Field><Field label="จำนวน (1-50)"><input type="number" min="1" max="50" value={count} onChange={e => setCount(e.target.value)} /></Field></div>
        <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={async () => { const j = await post('bulkgen', { hours, prefix, count }); if (j.keys) setMade(j.keys); }}>สร้าง</button>
        {made.length > 0 && <div className="stack"><textarea readOnly rows={Math.min(8, made.length)} value={made.join('\n')} /><button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => copy(made.join('\n'), 'คัดลอกทั้งหมดแล้ว')}>คัดลอกทั้งหมด</button></div>}
      </div>
      <input placeholder="ค้นหา คีย์ / Discord ID / หน้า" value={q} onChange={e => setQ(e.target.value)} />
      <div className="tblwrap"><table className="tbl2"><thead><tr><th>คีย์</th><th>หน้า</th><th>ผู้ใช้</th><th>สถานะ</th><th>หมดอายุ</th><th /></tr></thead><tbody>
        {rows.map(k => { const st = k.off ? ['ยกเลิก', 'bad'] : k.exp <= D.now ? ['หมดอายุ', 'mute'] : ['ใช้ได้', 'ok']; return (
          <tr key={k.key}><td className="mono"><button className="lnk" onClick={() => copy(k.key)}>{k.key}</button></td><td className="mono">{k.page}</td><td className="mono dim">{k.uid}</td><td><span className={'tag ' + st[1]}>{st[0]}</span></td><td className="dim">{fmt(k.exp)}</td>
            <td className="acts"><button className="btn sm" onClick={() => post('extend', { key: k.key, hours: 24 })}>+24ชม.</button><button className="btn sm" onClick={() => post('keyoff', { key: k.key })}>{k.off ? 'เปิด' : 'ยกเลิก'}</button><button className="btn sm danger" onClick={() => confirm('ลบคีย์นี้?') && post('keydel', { key: k.key })}>ลบ</button></td></tr>); })}
      </tbody></table></div>
      {!rows.length && <div className="empty">ไม่พบคีย์</div>}
    </div>
  );
}

// ---------------------------------------------------------------- หน้า & ผู้สร้าง (แอดมินเข้าไปแก้ของคนอื่นได้)
function Pages({ D, post, setEdit }) {
  const [f, setF] = useState({ id: '', slug: '', prefix: 'KEY' });
  const pageOf = Object.fromEntries(D.pages.map(p => [p.slug, p]));
  const orphans = D.pages.filter(p => !D.creators.some(c => c.slug === p.slug));
  return (
    <div className="stack">
      <div className="panel"><h3>อนุมัติ / สร้างสิทธิ์ผู้สร้างหน้า</h3>
        <div className="row"><Field label="Discord ID"><input value={f.id} onChange={e => setF({ ...f, id: e.target.value.replace(/\D/g, '') })} /></Field><Field label="slug (ลิงก์)"><input value={f.slug} placeholder="myhub" onChange={e => setF({ ...f, slug: e.target.value.toLowerCase() })} /></Field><Field label="นำหน้าคีย์"><input value={f.prefix} maxLength={12} onChange={e => setF({ ...f, prefix: e.target.value })} /></Field></div>
        <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={async () => { const j = await post('approve', f, 'อนุมัติแล้ว'); if (j.ok) { setF({ id: '', slug: '', prefix: 'KEY' }); setEdit(f.slug); } }}>อนุมัติ แล้วเปิดตัวแก้ไข</button>
      </div>
      <div className="tblwrap"><table className="tbl2"><thead><tr><th>slug</th><th>เจ้าของ</th><th>เข้าชม</th><th>คีย์</th><th>สถานะ</th><th /></tr></thead><tbody>
        {[...D.creators, ...orphans.map(p => ({ id: p.owner, slug: p.slug, orphan: true }))].map(c => { const p = pageOf[c.slug]; return (
          <tr key={c.slug}><td className="mono"><a href={'/getkey/' + c.slug} target="_blank" rel="noreferrer">/{c.slug}</a></td><td className="mono dim">{c.id}{c.orphan && ' (ถอนสิทธิ์แล้ว)'}</td><td>{p ? p.views : '—'}</td><td>{p ? p.claims : '—'}</td>
            <td>{p ? <span className={'tag ' + (p.off ? 'bad' : 'ok')}>{p.off ? 'ปิด' : 'เปิด'}</span> : <span className="tag mute">ยังไม่สร้าง</span>}</td>
            <td className="acts"><button className="btn sm primary" onClick={() => setEdit(c.slug)}>แก้ไข/ตกแต่ง</button>{p && <button className="btn sm" onClick={() => post('pageoff', { slug: c.slug })}>{p.off ? 'เปิดหน้า' : 'ปิดหน้า'}</button>}{p && <button className="btn sm danger" onClick={() => confirm(`ลบหน้า /${c.slug} พร้อมรูป/เพลงทั้งหมด?`) && post('pagedel', { slug: c.slug }, 'ลบแล้ว')}>ลบหน้า</button>}{!c.orphan && <button className="btn sm danger" onClick={() => confirm('ถอนสิทธิ์ผู้สร้างคนนี้? (หน้ายังอยู่)') && post('unapprove', { id: c.id })}>ถอนสิทธิ์</button>}</td></tr>); })}
      </tbody></table></div>
      {!D.creators.length && <div className="empty">ยังไม่มีผู้สร้างหน้า</div>}
    </div>
  );
}

// ---------------------------------------------------------------- ความปลอดภัย
function Security({ D, post }) {
  const [s, setS] = useState(D.site.sec), set = (k, v) => setS(x => ({ ...x, [k]: v }));
  return (
    <div className="stack">
      <div className="panel"><h3>ระบบกัน bypass</h3>
        <p className="dim" style={{ margin: 0 }}>ตรวจฝั่งเซิร์ฟเวอร์ทั้งหมด ผู้ใช้ทั่วไปแทบไม่รู้สึก — ระบบ strike จะบล็อกชั่วคราวเมื่อพยายามข้ามขั้นตอนซ้ำๆ</p>
        <Toggle label="แสดง captcha ตอนเข้าเว็บ (ใช้ Turnstile ถ้าตั้งค่าไว้ ไม่งั้นใช้ captcha ในตัว)" v={s.humanGate} set={v => set('humanGate', v)} />
        <Toggle label="บล็อก User-Agent ของสคริปต์ (curl / python / axios / headless …)" v={s.blockBots} set={v => set('blockBots', v)} />
        <Toggle label="ตรวจว่ายังอยู่ในเซิร์ฟเวอร์ Discord จริง (ต้องมีบอท)" v={s.verifyMember} set={v => set('verifyMember', v)} />
        <Toggle label="เข้มงวด Sec-Fetch (ต้องเป็นเบราว์เซอร์รุ่นใหม่)" v={s.strictFetch} set={v => set('strictFetch', v)} />
        <Toggle label="ผูกขั้นตอนกับ IP (เปลี่ยนเน็ตกลางทางทำต่อไม่ได้)" v={s.strictIp} set={v => set('strictIp', v)} />
        <Range label={s.powBits ? `Proof-of-Work: ${s.powBits} บิต (ยิ่งสูงยิ่งหนักสำหรับสคริปต์ · 0 = ปิด)` : 'Proof-of-Work: ปิด'} v={s.powBits} set={v => set('powBits', v)} max={20} />
        <div className="row">
          <Field label="อายุบัญชี Discord ขั้นต่ำ (วัน, 0 = ปิด)"><input type="number" min="0" value={s.minAccountDays} onChange={e => set('minAccountDays', e.target.value)} /></Field>
          <Field label="คีย์ต่อ IP ต่อหน้าต่อวัน (0 = ปิด)" hint="ระวัง: เครือข่ายมือถือไทยใช้ IP ร่วมกันหลายคน"><input type="number" min="0" value={s.ipCap} onChange={e => set('ipCap', e.target.value)} /></Field>
          <Field label="ผิดกติกากี่ครั้ง/ชม. ถึงบล็อก"><input type="number" min="2" value={s.strikeLimit} onChange={e => set('strikeLimit', e.target.value)} /></Field>
        </div>
        <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => post('site', { site: { sec: s } }, 'บันทึกแล้ว')}>บันทึก</button>
      </div>
      <div className="panel"><h3>หน้า "กำลังทำการตรวจสอบความปลอดภัย"</h3>
        <p className="dim" style={{ margin: 0 }}>ผู้ใช้ที่ผ่านแล้วจะไม่เห็นหน้านี้อีกจนกว่าจะครบเวลาที่ตั้งไว้ · ตั้งเป็น 0 = แสดงทุกครั้งที่เข้าเว็บ</p>
        <div className="row">
          <Field label="แสดงหน้าตรวจสอบซ้ำทุกกี่นาที (0 = ทุกครั้ง)" hint="เช่น 5 · 60 (1 ชม.) · 720 (12 ชม.) · 1440 (1 วัน) · สูงสุด 43200 (30 วัน)"><input type="number" min="0" max="43200" value={s.scMinutes} onChange={e => set('scMinutes', e.target.value)} /></Field>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <button className="btn primary" onClick={() => post('site', { site: { sec: s } }, 'บันทึกเวลาแล้ว')}>บันทึกเวลา</button>
          <button className="btn danger" onClick={() => confirm('รีเซ็ตการตรวจสอบ?\nทุกคนจะต้องผ่านหน้าตรวจสอบความปลอดภัยใหม่ในการเข้าเว็บครั้งถัดไป') && post('screset', {}, 'รีเซ็ตแล้ว — ทุกคนต้องตรวจสอบใหม่ตอนเข้าเว็บครั้งหน้า')}>รีเซ็ต: ให้ทุกคนตรวจสอบใหม่</button>
        </div>
        <p className="dim" style={{ margin: 0 }}>{D.site.sec.scEpoch ? 'รีเซ็ตล่าสุด: ' + new Date(D.site.sec.scEpoch).toLocaleString('th-TH') : 'ยังไม่เคยรีเซ็ต'}</p>
      </div>
      <BanBox D={D} post={post} />
    </div>
  );
}
function BanBox({ D, post }) {
  const [id, setId] = useState('');
  return (
    <div className="panel"><h3>แบน / ปลดแบน</h3>
      <div className="row"><input placeholder="Discord ID หรือ IP" value={id} onChange={e => setId(e.target.value.trim())} /><button className="btn danger" style={{ flex: 'none' }} onClick={() => id && post('ban', { id }, 'แบนแล้ว').then(() => setId(''))}>แบน</button><button className="btn" style={{ flex: 'none' }} onClick={() => id && post('unblock', { id }, 'ปลดบล็อกชั่วคราวแล้ว')}>ปลดบล็อกชั่วคราว</button></div>
      <div className="chips">{D.bans.map(b => <button key={b} title="คลิกเพื่อปลดแบน" onClick={() => post('unban', { id: b }, 'ปลดแล้ว')}>{b} ✕</button>)}{!D.bans.length && <span className="dim">ยังไม่มีผู้ถูกแบน</span>}</div>
    </div>
  );
}

// ---------------------------------------------------------------- ตั้งค่าเว็บ
function SiteTab({ D, post, api, toast, reloadSite }) {
  const [s, setS] = useState(D.site), [iv, setIv] = useState(D.siteImgv || {}), [g, setG] = useState(null), [aid, setAid] = useState('');
  const set = (k, v) => setS(x => ({ ...x, [k]: v })), th = (k, v) => setS(x => ({ ...x, theme: { ...x.theme, [k]: v } })), sub = (g2, k, v) => setS(x => ({ ...x, theme: { ...x.theme, [g2]: { ...x.theme[g2], [k]: v } } }));
  const t = s.theme, common = { api, toast, endpoint: 'admin', slug: '_site', imgv: iv, setImgv: fn => { setIv(fn); setTimeout(reloadSite, 80); } };
  async function save() { const { sec, ...rest } = s; const j = await post('site', { site: { ...rest, theme: cleanTheme(s.theme) } }, 'บันทึกแล้ว'); if (j.ok) reloadSite(); } // eslint-disable-line no-unused-vars
  return (
    <div className="stack">
      <div className="panel"><h3>ข้อมูลเว็บ</h3>
        <div className="row"><Field label="ชื่อเว็บ"><input value={s.name} maxLength={32} onChange={e => set('name', e.target.value)} /></Field><Field label="สโลแกน"><input value={s.tagline} maxLength={80} onChange={e => set('tagline', e.target.value)} /></Field></div>
        <div className="row"><Field label="ลิงก์เชิญ Discord"><input value={s.discord} placeholder="https://discord.gg/…" onChange={e => set('discord', e.target.value)} /></Field><Field label="slug หน้าตัวอย่าง (/getkey)"><input value={s.demo} onChange={e => set('demo', e.target.value.toLowerCase())} /></Field></div>
        <Field label="ข้อความท้ายเว็บ"><input value={s.footer} maxLength={100} onChange={e => set('footer', e.target.value)} /></Field>
        <Toggle label="แสดงแถบประกาศด้านบน" v={s.announce.on} set={v => set('announce', { ...s.announce, on: v })} />
        {s.announce.on && <div className="row"><Field label="ข้อความประกาศ"><input value={s.announce.text} maxLength={160} onChange={e => set('announce', { ...s.announce, text: e.target.value })} /></Field><Field label="ลิงก์ (ไม่บังคับ)"><input value={s.announce.link} onChange={e => set('announce', { ...s.announce, link: e.target.value })} /></Field></div>}
      </div>

      <div className="panel"><h3>เซิร์ฟเวอร์ Discord (เพิ่มคนเข้าตอนล็อกอิน)</h3>
        <p className="dim" style={{ margin: 0 }}>ต้องตั้ง <code>DISCORD_BOT_TOKEN</code> ใน env และเชิญบอทเข้าเซิร์ฟเวอร์ (สิทธิ์ Create Invite) · ใส่ยศให้อัตโนมัติต้องมีสิทธิ์ Manage Roles และยศบอทอยู่เหนือยศนั้น</p>
        <div className="row"><Field label="Guild ID (ID เซิร์ฟเวอร์)"><input value={s.guildId} onChange={e => set('guildId', e.target.value.replace(/\D/g, ''))} /></Field><Field label="ID ยศที่จะให้ (ไม่บังคับ)"><input value={s.joinRole} onChange={e => set('joinRole', e.target.value.replace(/\D/g, ''))} /></Field></div>
        <Toggle label="ต้องอยู่ในเซิร์ฟเวอร์จึงจะล็อกอินได้ (แอดมินยกเว้น)" v={s.requireGuild} set={v => set('requireGuild', v)} />
        <div className="row" style={{ flexWrap: 'nowrap' }}><button className="btn" style={{ flex: 'none' }} onClick={async () => { await post('site', { site: { guildId: s.guildId, joinRole: s.joinRole, requireGuild: s.requireGuild } }); const j = await api('admin', { act: 'guildtest' }); setG(j.guild || { error: j.bot ? 'ยังไม่ได้ตั้ง Guild ID' : 'ยังไม่มี DISCORD_BOT_TOKEN' }); }}>บันทึก + ทดสอบบอท</button>{g && <div className={g.error ? 'err' : 'pcard'} style={{ flex: 1 }}>{g.error || `${g.name} · ${g.members} สมาชิก ✓`}</div>}</div>
      </div>

      <div className="panel"><h3>ตกแต่งทั้งเว็บ</h3>
        <Media {...common} kind="logo" label="โลโก้เว็บ (แถบเมนู)" accept="image/png,image/jpeg,image/webp,image/gif" url={t.logoUrl} setUrl={v => th('logoUrl', v)} />
        <span className="lbl">พื้นหลัง</span>
        <Seg v={t.bg.type} set={v => sub('bg', 'type', v)} opts={[['grid', 'กริด (เดิม)'], ['solid', 'สีเดียว'], ['image', 'รูป / GIF']]} />
        {t.bg.type === 'solid' && <Color label="สีพื้นหลัง" v={t.bg.color} set={v => sub('bg', 'color', v)} />}
        {t.bg.type === 'image' && <>
          <Media {...common} kind="bg" label="รูป / GIF พื้นหลัง" accept="image/png,image/jpeg,image/webp,image/gif" url={t.bg.url} setUrl={v => sub('bg', 'url', v)} hint="ไฟล์ใหญ่ให้วางลิงก์ตรง .gif แทนการอัปโหลด" />
          <Range label="ความมืดทับพื้นหลัง" v={t.bg.overlay} set={v => sub('bg', 'overlay', v)} max={95} unit="%" />
          <Range label="เบลอ" v={t.bg.blur} set={v => sub('bg', 'blur', v)} max={24} unit="px" />
          <Toggle label="ทำเป็นขาวดำ (คุมโทนเดิม)" v={t.bg.gray} set={v => sub('bg', 'gray', v)} />
        </>}
        <span className="lbl">เอฟเฟกต์ลอย</span>
        <div className="chips">{FX.map(([k, l]) => <button type="button" key={k} className={t.fx === k ? 'on' : ''} onClick={() => th('fx', k)}>{l}</button>)}</div>
        <Color label="สีเอฟเฟกต์" v={t.accent} set={v => th('accent', v)} />
        <span className="lbl">เพลงทั้งเว็บ</span>
        <Media {...common} kind="music" audio label="ไฟล์เพลง หรือ ลิงก์ (mp3 / YouTube)" accept="audio/*" url={t.music.url} setUrl={v => sub('music', 'url', v)} />
        <Range label="ระดับเสียงเริ่มต้น" v={t.music.vol} set={v => sub('music', 'vol', v)} unit="%" />
        <div className="row"><Toggle label="เล่นอัตโนมัติ" v={t.music.auto} set={v => sub('music', 'auto', v)} /><Field label="ชื่อเพลง"><input value={t.music.title} maxLength={40} onChange={e => sub('music', 'title', e.target.value)} /></Field></div>
      </div>
      <button className="btn primary lg" style={{ alignSelf: 'flex-start' }} onClick={save}>บันทึกการตั้งค่าเว็บ</button>

      <div className="panel"><h3>แอดมิน</h3>
        <div className="chips">{D.admins.map(a => <button key={a.id} title={a.owner ? 'เจ้าของ (ถอนไม่ได้)' : 'คลิกเพื่อถอนสิทธิ์'} onClick={() => !a.owner && confirm('ถอนสิทธิ์แอดมิน?') && post('rmadmin', { id: a.id })}>{a.owner ? '👑 ' : ''}{a.id}{!a.owner && ' ✕'}</button>)}</div>
        {D.me.owner ? <div className="row"><input placeholder="Discord ID แอดมินใหม่" value={aid} onChange={e => setAid(e.target.value.replace(/\D/g, ''))} /><button className="btn" style={{ flex: 'none' }} onClick={() => aid && post('addadmin', { id: aid }, 'เพิ่มแล้ว').then(() => setAid(''))}>เพิ่มแอดมิน</button></div> : <p className="dim" style={{ margin: 0 }}>เฉพาะเจ้าของ (ADMIN_IDS) เพิ่ม/ถอนแอดมินได้</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Log
function Logs({ D, post }) {
  const clear = w => confirm('ล้าง log นี้?') && post('clearlog', { what: w }, 'ล้างแล้ว');
  return (
    <div className="stack">
      <div className="panel"><div className="ph"><h3 style={{ margin: 0 }}>เหตุการณ์ความปลอดภัย</h3><button className="btn sm" onClick={() => clear('seclog')}>ล้าง</button></div>
        <div className="tblwrap"><table className="tbl2"><tbody>{D.seclog.map((e, i) => <tr key={i}><td className="dim">{fmt(e.t)}</td><td><span className={'tag ' + (e.type === 'auto_block' ? 'bad' : 'warn')}>{TYPES[e.type] || e.type}</span></td><td>{e.name || ''}<div className="mono dim">{e.uid} · {e.ip}</div></td><td className="dim">{e.page || ''} {e.note || ''}</td><td className="acts">{e.uid && <button className="btn sm danger" onClick={() => confirm('แบนผู้ใช้นี้?') && post('ban', { id: e.uid }, 'แบนแล้ว')}>แบน</button>}</td></tr>)}</tbody></table></div>
        {!D.seclog.length && <div className="empty">ยังไม่มีเหตุการณ์ 👍</div>}
      </div>
      <div className="panel"><div className="ph"><h3 style={{ margin: 0 }}>รับคีย์ล่าสุด</h3><button className="btn sm" onClick={() => clear('log')}>ล้าง</button></div>
        <div className="tblwrap"><table className="tbl2"><tbody>{D.log.map((e, i) => <tr key={i}><td className="dim">{fmt(e.t)}</td><td className="mono">{e.page}</td><td>{e.name}<div className="mono dim">{e.uid} · {e.ip}</div></td><td className="mono">{e.key}</td></tr>)}</tbody></table></div>
        {!D.log.length && <div className="empty">ยังไม่มี</div>}
      </div>
      <div className="panel"><div className="ph"><h3 style={{ margin: 0 }}>ล็อกอินล่าสุด</h3><button className="btn sm" onClick={() => clear('ulog')}>ล้าง</button></div>
        <div className="tblwrap"><table className="tbl2"><tbody>{D.ulog.map((e, i) => <tr key={i}><td className="dim">{fmt(e.t)}</td><td>{e.name}<div className="mono dim">{e.id}</div></td><td className="mono dim">{e.ip}</td><td><span className={'tag ' + (e.join === 'fail' ? 'bad' : e.join === 'joined' ? 'ok' : 'mute')}>{{ joined: 'เพิ่มเข้าเซิร์ฟเวอร์', already: 'อยู่แล้ว', fail: 'เพิ่มไม่สำเร็จ', skip: '—' }[e.join] || '—'}</span></td><td className="acts"><button className="btn sm danger" onClick={() => confirm('แบนผู้ใช้นี้?') && post('ban', { id: e.id }, 'แบนแล้ว')}>แบน</button></td></tr>)}</tbody></table></div>
        {!D.ulog.length && <div className="empty">ยังไม่มี</div>}
      </div>
    </div>
  );
}
