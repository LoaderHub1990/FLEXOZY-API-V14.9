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

const STEPS = [
  ['image', 'อ่านไฟล์รูป'],
  ['qr', 'ค้นหา QR บนสลิป'],
  ['payload', 'โครงสร้างข้อมูล QR'],
  ['crc', 'CRC ของ QR'],
  ['bank', 'ธนาคารต้นทาง'],
  ['date', 'วันที่ในเลขอ้างอิง'],
  ['dupRef', 'สลิปซ้ำ (เลขอ้างอิง)'],
  ['dupImg', 'สลิปซ้ำ (ไฟล์รูป)'],
  ['similar', 'รูปคล้ายสลิปอื่น'],
  ['edit', 'ร่องรอยโปรแกรมแต่งรูป'],
  ['quality', 'ความละเอียดของรูป'],
];

export async function checkSlip({ payload, image, userId, register = true, maxAgeDays }) {
  const flags = []; let risk = 0;
  const add = (code, w) => { flags.push(code); risk += w; };
  const t0 = Date.now();
  const log = [];
  const say = (level, msg) => log.push({ ms: Date.now() - t0, level, msg });
  const sm = new Map();
  const step = (id, status, detail) => { sm.set(id, { id, label: STEPS.find((x) => x[0] === id)[1], status, detail }); };
  const res = { status: 'ok', risk: 0, flags };
  const done = (over = {}) => {
    const r = { ...res, ...over };
    r.checks = STEPS.map(([id, label]) => sm.get(id) || { id, label, status: 'skip', detail: 'ข้าม' });
    r.registered = !!(register && r.registeredOk);
    delete r.registeredOk;
    say(r.status === 'ok' ? 'ok' : r.status === 'invalid' ? 'error' : 'warn', `สรุป: ${r.status} · ความเสี่ยง ${r.risk}/100`);
    r.log = log;
    return r;
  };
  const stop = (code, msg) => { say('error', msg); return done({ status: 'invalid', risk: 100, flags: [code] }); };
  say('info', 'เริ่มตรวจสลิป');
  let px = null, sha = null, hash = null;
  if (image) {
    sha = crypto.createHash('sha256').update(image).digest('hex');
    try { px = decodeImage(image); } catch (e) { step('image', 'fail', e.message); return stop('bad_image:' + e.message, 'อ่านรูปไม่ได้: ' + e.message); }
    res.image = { width: px.w, height: px.h, sha256: sha };
    step('image', 'pass', `${px.w}×${px.h}px`);
    say('ok', `อ่านรูปสำเร็จ ${px.w}×${px.h}px (${(image.length / 1024).toFixed(0)} KB)`);
    if (!payload) {
      payload = readQr(px);
      if (!payload) { step('qr', 'fail', 'ไม่พบ QR'); return stop('qr_not_found', 'สแกนหา QR ในรูปแล้วไม่พบ'); }
      step('qr', 'pass', `พบ QR ${payload.length} ตัวอักษร`);
      say('ok', 'พบ QR บนสลิป');
    } else { step('qr', 'pass', 'ใช้ payload ที่ส่งมา'); say('info', 'ใช้ payload ที่ส่งมาแทนการสแกนรูป'); }
    hash = dHash(px);
    const low = image.toString('latin1').toLowerCase();
    const ed = EDITORS.find((k) => low.includes(k));
    if (ed) { res.editedWith = ed; add('edited_software', 70); step('edit', 'fail', `พบร่องรอย ${ed}`); say('warn', `พบชื่อโปรแกรมแต่งรูปในไฟล์: ${ed}`); }
    else { step('edit', 'pass', 'ไม่พบร่องรอย'); say('ok', 'ไม่พบร่องรอยโปรแกรมแต่งรูป'); }
    if (Math.min(px.w, px.h) < 300) { add('low_resolution', 15); step('quality', 'warn', 'รูปเล็กกว่า 300px'); say('warn', 'รูปมีความละเอียดต่ำ'); }
    else { step('quality', 'pass', 'ความละเอียดพอ'); say('ok', 'ความละเอียดรูปเพียงพอ'); }
  } else { step('qr', 'pass', 'ใช้ payload ที่ส่งมา'); say('info', 'ไม่ได้ส่งรูป ตรวจจาก payload อย่างเดียว'); }
  payload = String(payload || '').trim();
  const top = parseTlv(payload);
  const inner = top?.['00'] ? parseTlv(top['00']) : null;
  const ref = inner?.['02'];
  if (!top || !inner || !ref || !/^[A-Za-z0-9]{10,40}$/.test(ref)) { step('payload', 'fail', 'อ่านโครงสร้างไม่ได้'); return stop('invalid_payload', 'โครงสร้างข้อมูล QR ไม่ใช่รูปแบบสลิปโอนเงิน'); }
  res.transRef = ref; res.sendingBank = inner['01'] || null; res.sendingBankName = BANKS[inner['01']] || null;
  step('payload', 'pass', `เลขอ้างอิง ${ref}`); say('ok', `อ่านเลขอ้างอิงได้: ${ref}`);
  res.crcValid = payload.slice(-4).toUpperCase() === crc16(payload.slice(0, -4));
  if (!res.crcValid) { step('crc', 'fail', 'ค่า CRC ไม่ตรง'); return stop('crc_invalid', 'CRC ไม่ตรง ข้อมูล QR ถูกแก้ไขหรือเสียหาย'); }
  step('crc', 'pass', 'CRC ถูกต้อง'); say('ok', 'CRC ถูกต้อง');
  if (!res.sendingBankName) { add('unknown_bank', 25); step('bank', 'warn', `ไม่รู้จักรหัส ${res.sendingBank || '-'}`); say('warn', `ไม่รู้จักรหัสธนาคาร ${res.sendingBank || '-'}`); }
  else { step('bank', 'pass', `${res.sendingBankName} (${res.sendingBank})`); say('ok', `ธนาคารต้นทาง ${res.sendingBankName}`); }
  const d = refDate(ref);
  res.refDate = d;
  if (d) {
    const age = (Date.now() + 7 * 36e5 - Date.parse(d + 'T00:00:00Z')) / 864e5;
    let st = 'pass', dt = d;
    if (age < -1) { add('ref_date_in_future', 60); st = 'fail'; dt = `${d} เป็นวันในอนาคต`; }
    else if (maxAgeDays && age > maxAgeDays) { add('too_old', 40); st = 'fail'; dt = `${d} เก่ากว่า ${maxAgeDays} วัน`; }
    step('date', st, dt); say(st === 'pass' ? 'ok' : 'warn', 'วันที่ในเลขอ้างอิง: ' + dt);
  } else { step('date', 'skip', 'เลขอ้างอิงไม่มีวันที่'); say('info', 'เลขอ้างอิงไม่มีวันที่ให้ตรวจ'); }
  // ---- ตรวจซ้ำ ----
  const rec = await db.get('sref:' + ref);
  const seen = rec ? { byYou: rec.owners.includes(userId), byOthers: rec.owners.some((o) => o !== userId), count: rec.n, firstSeenAt: rec.at } : { byYou: false, byOthers: false, count: 0, firstSeenAt: null };
  res.duplicate = seen;
  let dup = seen.byYou;
  if (seen.byYou) add('duplicate_ref', 100);
  if (seen.byOthers) add('used_elsewhere', 40);
  if (seen.byYou) { step('dupRef', 'fail', `คุณเคยเช็คแล้ว ${seen.count} ครั้ง`); say('warn', `เลขอ้างอิงนี้เคยถูกเช็คโดยคุณแล้ว ${seen.count} ครั้ง`); }
  else if (seen.byOthers) { step('dupRef', 'warn', 'ผู้ใช้อื่นเคยเช็ค'); say('warn', 'เลขอ้างอิงนี้เคยถูกเช็คโดยผู้ใช้อื่น'); }
  else { step('dupRef', 'pass', 'ยังไม่เคยเช็ค'); say('ok', 'ยังไม่เคยเช็คเลขอ้างอิงนี้'); }
  if (sha) {
    const ex = await db.get('simg:' + sha);
    if (ex && ex.owner === userId) { dup = true; add('duplicate_image', 100); step('dupImg', 'fail', 'เคยส่งไฟล์นี้แล้ว'); say('warn', 'ไฟล์รูปนี้เคยถูกส่งมาแล้ว'); }
    else { step('dupImg', 'pass', 'ไฟล์ใหม่'); say('ok', 'ไฟล์รูปนี้ยังไม่เคยส่งมา'); }
    const list = (await db.get('sph')) || [];
    let best = null;
    for (const e of list) { const dist = ham(hash, e.h); if (dist <= 10 && (!best || dist < best.dist)) best = { ...e, dist }; }
    if (best && best.ref !== ref) { res.similarImage = { distance: best.dist, otherRef: best.ref }; add('similar_image_other_ref', 35); step('similar', 'fail', `คล้ายสลิป ${best.ref}`); say('warn', `รูปคล้ายสลิปอื่น (ระยะห่าง ${best.dist}) เลขอ้างอิงต่างกัน`); }
    else { step('similar', 'pass', 'ไม่พบรูปคล้าย'); say('ok', `เทียบกับสลิปที่เก็บไว้ ${list.length} ใบ ไม่พบรูปคล้าย`); }
    if (register) {
      await db.set('simg:' + sha, { owner: userId, ref, at: Date.now() });
      if (!list.some((e) => e.ref === ref)) { list.push({ h: hash, ref, at: Date.now() }); await db.set('sph', list.slice(-2000)); }
    }
  } else { step('dupImg', 'skip', 'ไม่มีรูป'); step('similar', 'skip', 'ไม่มีรูป'); }
  if (register) {
    await db.set('sref:' + ref, { n: (rec?.n || 0) + 1, at: rec?.at || Date.now(), owners: [...new Set([...(rec?.owners || []), userId])].slice(-20) });
    res.registeredOk = true; say('info', 'บันทึกสลิปนี้ว่าใช้แล้ว');
  } else say('info', 'โหมดตรวจเฉย ๆ ไม่บันทึก');
  res.risk = Math.min(100, risk);
  res.status = dup ? 'duplicate' : res.risk >= 50 ? 'suspicious' : 'ok';
  return done();
}
