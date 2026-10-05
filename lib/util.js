import { HttpError } from './db';

export const baht = (satang) =>
  (Number(satang) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function str(v, { min = 0, max = 500, name = 'ข้อมูล' } = {}) {
  if (typeof v !== 'string') v = v == null ? '' : String(v);
  v = v.trim();
  if (v.length < min) throw new HttpError(400, `${name}สั้นเกินไป`);
  if (v.length > max) throw new HttpError(400, `${name}ยาวเกินไป`);
  return v;
}

export function int(v, { min = -Infinity, max = Infinity, name = 'ตัวเลข' } = {}) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name}ไม่ถูกต้อง`);
  return n;
}

export function safeImage(v) {
  v = str(v, { max: 500 });
  if (!v) return '';
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^https:\/\/[^\s]+$/i.test(v)) return v;
  throw new HttpError(400, 'ลิงก์รูปต้องขึ้นต้นด้วย / หรือ https://');
}

export function safeUrl(v) {
  v = str(v, { max: 300 });
  if (!v) return '';
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v;
  throw new HttpError(400, 'ลิงก์ไม่ถูกต้อง');
}

export function thDate(d) {
  return new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });
}
