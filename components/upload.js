import { UP } from '@/lib/theme';

const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
const ERR = { audio: 'ไฟล์เสียงไม่รองรับ (ใช้ mp3 / ogg / wav / m4a)', img: 'รูปไม่รองรับ (ใช้ png / jpg / webp / gif)', big: 'ไฟล์ใหญ่เกินไป ใช้ลิงก์แทน', missing: 'อัปโหลดไม่ครบ ลองใหม่', kind: 'ชนิดไฟล์ไม่ถูกต้อง', auth: 'ต้องล็อกอินใหม่', forbidden: 'ไม่มีสิทธิ์' };
const mb = n => (n / 1e6).toFixed(1) + 'MB';

// ย่อรูปนิ่งก่อนอัปโหลด (GIF/ไฟล์เล็กส่งขึ้นตรงๆ เพื่อไม่ให้แอนิเมชันหาย)
async function shrink(file, kind) {
  const max = kind === 'logo' || /^i\d/.test(kind) ? 256 : kind === 'banner' ? 1280 : 1920;
  const bmp = await createImageBitmap(file), sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * sc)); cv.height = Math.max(1, Math.round(bmp.height * sc));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.85)) || await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
  return new Uint8Array(await blob.arrayBuffer());
}

// อัปโหลดทีละก้อน (ก้อนละ ~340KB) → คืนเลขเวอร์ชันไฟล์
export async function uploadFile({ api, endpoint = 'creator', as, kind, file, onProg }) {
  let bytes;
  if (kind === 'music') {
    if (file.size > UP.AUDIO) throw new Error(`ไฟล์เพลงใหญ่เกิน ${mb(UP.AUDIO)} — ใช้ลิงก์ mp3 หรือ YouTube แทน`);
    bytes = new Uint8Array(await file.arrayBuffer());
  } else if (file.type === 'image/gif') {
    if (file.size > UP.IMG) throw new Error(`GIF ใหญ่เกิน ${mb(UP.IMG)} — ใช้ลิงก์ GIF แทน (Discord/Tenor/Giphy ที่เป็นลิงก์ตรง .gif)`);
    bytes = new Uint8Array(await file.arrayBuffer());
  } else if (file.size <= 700000 && /^image\/(png|jpeg|webp)$/.test(file.type)) {
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    if (!file.type.startsWith('image/')) throw new Error(ERR.img);
    bytes = await shrink(file, kind);
    if (bytes.length > UP.IMG) throw new Error(ERR.big);
  }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(x => x.toString(16).padStart(2, '0')).join('');
  const total = Math.max(1, Math.ceil(bytes.length / UP.CHUNK));
  for (let i = 0; i < total; i++) {
    const r = await api(endpoint, { act: 'up', as, kind, id, idx: i, total, data: b64(bytes.subarray(i * UP.CHUNK, (i + 1) * UP.CHUNK)) });
    if (r.error) throw new Error(ERR[r.error] || 'อัปโหลดไม่สำเร็จ (' + r.error + ')');
    if (onProg) onProg(Math.round((i + 1) / total * 100));
    if (r.done) return r.v;
  }
  throw new Error('อัปโหลดไม่สำเร็จ');
}
