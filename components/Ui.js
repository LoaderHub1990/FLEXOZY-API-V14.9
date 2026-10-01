'use client';
import { useState } from 'react';
import { uploadFile } from './upload';
import { SWATCHES } from '@/lib/theme';
import { Upload, Trash } from './Icons';

export const Field = ({ label, hint, children }) => (<label>{label}{children}{hint && <small className="hint">{hint}</small>}</label>);
export const Toggle = ({ label, v, set }) => (<label className="sw"><input type="checkbox" checked={!!v} onChange={e => set(e.target.checked)} /><i />{label}</label>);
export const Range = ({ label, v, set, min = 0, max = 100, unit = '' }) => (
  <label>{label}<span className="rng"><input type="range" min={min} max={max} value={v} onChange={e => set(+e.target.value)} /><b className="mono">{v}{unit}</b></span></label>
);
export const Seg = ({ v, set, opts }) => (<div className="seg2">{opts.map(([k, l]) => <button type="button" key={k} className={v === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>)}</div>);

export function Color({ label, v, set }) {
  return (
    <div className="colorf">
      <span className="lbl">{label}</span>
      <div className="swatches">
        {SWATCHES.map(c => <button type="button" key={c} className={'swt' + (v === c ? ' on' : '')} style={{ background: c }} onClick={() => set(c)} aria-label={c} />)}
        <input type="color" value={v} onChange={e => set(e.target.value)} aria-label="เลือกสีเอง" />
        <code>{v}</code>
      </div>
    </div>
  );
}

// ช่องมีเดีย: วางลิงก์ หรืออัปโหลดไฟล์ (รูป/GIF/เพลง) — แสดงสถานะและปุ่มลบ
export function Media({ kind, label, hint, accept, endpoint = 'creator', as, slug, imgv, setImgv, api, toast, url, setUrl, urlPlaceholder, audio = false }) {
  const [p, setP] = useState(null);
  const has = imgv && imgv[kind];
  async function pick(e) {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    setP(0);
    try { const v = await uploadFile({ api, endpoint, as, kind, file, onProg: setP }); setImgv(s => ({ ...s, [kind]: v })); toast('อัปโหลดแล้ว', 'ok'); }
    catch (er) { toast(er.message, 'bad'); }
    setP(null);
  }
  async function del() { const r = await api(endpoint, { act: 'imgdel', as, kind }); if (r.error) return toast('ลบไม่สำเร็จ', 'bad'); setImgv(s => { const n = { ...s }; delete n[kind]; return n; }); }
  return (
    <div className="media">
      <span className="lbl">{label}</span>
      <div className="media-row">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder={urlPlaceholder || 'วางลิงก์ https://… (หรืออัปโหลดไฟล์ด้านขวา)'} />
        <label className="btn sm up-btn"><Upload />{p == null ? 'อัปโหลด' : p + '%'}<input type="file" accept={accept} onChange={pick} disabled={p != null} hidden /></label>
      </div>
      {p != null && <div className="meter"><i style={{ width: p + '%' }} /></div>}
      {has && !url && (
        <div className="media-has">
          {audio ? <audio controls preload="none" src={`/api/img/${slug}/${kind}?v=${has}`} /> : <span>ใช้ไฟล์ที่อัปโหลดไว้ ✓</span>}
          <button type="button" className="btn sm danger" onClick={del}><Trash />ลบไฟล์</button>
        </div>
      )}
      {has && url && <small className="hint">มีทั้งลิงก์และไฟล์ — ระบบใช้ลิงก์ก่อน (ล้างลิงก์เพื่อใช้ไฟล์ที่อัปโหลด)</small>}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}
