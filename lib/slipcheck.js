import crypto from 'crypto';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import * as db from './db';
import { crc16, parseTlv } from './promptpay';

export const BANKS = { '002': 'BBL', '004': 'KBANK', '006': 'KTB', '011': 'TTB', '014': 'SCB', '017': 'CITI', '020': 'SCBT', '022': 'CIMBT', '024': 'UOB', '025': 'BAY', '030': 'GSB', '033': 'GHB', '034': 'BAAC', '035': 'EXIM', '066': 'ISBT', '067': 'TISCO', '069': 'KKP', '070': 'ICBC', '071': 'TCRB', '073': 'LHFG', '098': 'SME' };
const EDITORS = ['photoshop', 'adobe', 'canva', 'picsart', 'snapseed', 'gimp', 'pixlr', 'lightroom', 'fotor', 'paint.net', 'inshot', 'meitu', 'faceapp'];

export function decodeImage(buf) {
  if (buf.length > 6e6) throw new Error('image_too_large');
  let w, h, data;
  if (buf[0] === 0x89 && buf[1] === 0x50) { const p = PNG.sync.read(buf); w = p.width; h = p.height; data = p.data; }
  else if (buf[0] === 0xff && buf[1] === 0xd8) { const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 300 }); w = j.width; h = j.height; data = j.data; }
  else throw new Error('unsupported_image (รองรับ PNG/JPG)');
  return { w, h, data };
}
export function readQr({ w, h, data }) {
  const r = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), w, h, { inversionAttempts: 'attemptBoth' });
  return r ? r.data : null;
}
// dHash 256 บิต: เทียบความสว่างของบล็อก 17x16
export function dHash({ w, h, data }) {
  const C = 17, R = 16, g = [];
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const x0 = Math.floor((x * w) / C), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / C));
    const y0 = Math.floor((y * h) / R), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / R));
    let s = 0, n = 0;
    const sx = Math.max(1, Math.floor((x1 - x0) / 8)), sy = Math.max(1, Math.floor((y1 - y0) / 8));
    for (let yy = y0; yy < y1; yy += sy) for (let xx = x0; xx < x1; xx += sx) { const i = (yy * w + xx) * 4; s += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114; n++; }
    g.push(s / n);
  }
  let bits = '';
  for (let y = 0; y < R; y++) for (let x = 0; x < C - 1; x++) bits += g[y * C + x] > g[y * C + x + 1] ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(64, '0');
}
const ham = (a, b) => { let x = BigInt('0x' + a) ^ BigInt('0x' + b), n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };

export function refDate(ref) {
  const m = /^(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.exec(ref);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function checkSlip({ payload, image, userId, register = true, maxAgeDays }) {
  const flags = []; let risk = 0;
  const add = (code, w) => { flags.push(code); risk += w; };
  const res = { status: 'ok', risk: 0, flags };
  let px = null, sha = null, hash = null;
  if (image) {
    sha = crypto.createHash('sha256').update(image).digest('hex');
    try { px = decodeImage(image); } catch (e) { return { ...res, status: 'invalid', risk: 100, flags: ['bad_image:' + e.message] }; }
    res.image = { width: px.w, height: px.h, sha256: sha };
    if (!payload) payload = readQr(px);
    if (!payload) return { ...res, status: 'invalid', risk: 100, flags: ['qr_not_found'] };
    hash = dHash(px);
    const low = image.toString('latin1').toLowerCase();
    const ed = EDITORS.find((k) => low.includes(k));
    if (ed) { res.editedWith = ed; add('edited_software', 70); }
    if (Math.min(px.w, px.h) < 300) add('low_resolution', 15);
  }
  payload = String(payload || '').trim();
  const top = parseTlv(payload);
  const inner = top?.['00'] ? parseTlv(top['00']) : null;
  const ref = inner?.['02'];
  if (!top || !inner || !ref || !/^[A-Za-z0-9]{10,40}$/.test(ref)) return { ...res, status: 'invalid', risk: 100, flags: ['invalid_payload'] };
  res.transRef = ref; res.sendingBank = inner['01'] || null; res.sendingBankName = BANKS[inner['01']] || null;
  res.crcValid = payload.slice(-4).toUpperCase() === crc16(payload.slice(0, -4));
  if (!res.crcValid) return { ...res, status: 'invalid', risk: 100, flags: ['crc_invalid'] };
  if (!res.sendingBankName) add('unknown_bank', 25);
  const d = refDate(ref);
  res.refDate = d;
  if (d) {
    const age = (Date.now() + 7 * 36e5 - Date.parse(d + 'T00:00:00Z')) / 864e5;
    if (age < -1) add('ref_date_in_future', 60);
    if (maxAgeDays && age > maxAgeDays) add('too_old', 40);
  }
  // ---- ตรวจซ้ำ ----
  const rec = await db.get('sref:' + ref);
  const seen = rec ? { byYou: rec.owners.includes(userId), byOthers: rec.owners.some((o) => o !== userId), count: rec.n, firstSeenAt: rec.at } : { byYou: false, byOthers: false, count: 0, firstSeenAt: null };
  res.duplicate = seen;
  let dup = seen.byYou;
  if (seen.byYou) add('duplicate_ref', 100);
  if (seen.byOthers) add('used_elsewhere', 40);
  if (sha) {
    const ex = await db.get('simg:' + sha);
    if (ex && ex.owner === userId) { dup = true; add('duplicate_image', 100); }
    const list = (await db.get('sph')) || [];
    let best = null;
    for (const e of list) { const dist = ham(hash, e.h); if (dist <= 10 && (!best || dist < best.dist)) best = { ...e, dist }; }
    if (best && best.ref !== ref) { res.similarImage = { distance: best.dist, otherRef: best.ref }; add('similar_image_other_ref', 35); }
    if (register) {
      await db.set('simg:' + sha, { owner: userId, ref, at: Date.now() });
      if (!list.some((e) => e.ref === ref)) { list.push({ h: hash, ref, at: Date.now() }); await db.set('sph', list.slice(-2000)); }
    }
  }
  if (register) await db.set('sref:' + ref, { n: (rec?.n || 0) + 1, at: rec?.at || Date.now(), owners: [...new Set([...(rec?.owners || []), userId])].slice(-20) });
  res.risk = Math.min(100, risk);
  res.status = dup ? 'duplicate' : res.risk >= 50 ? 'suspicious' : 'ok';
  return res;
}
