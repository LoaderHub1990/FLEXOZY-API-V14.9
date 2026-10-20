import crypto from 'crypto';
import { tx } from './db';
import { fmtDuration, startText } from './duration';
import { resolveRoblox, robloxProfileUrl } from './roblox';

// ตัดตัวที่สับสนง่าย (0/O, 1/I) ออก เหลือ 32 ตัว → คีย์ 12 ตัวสุ่ม = 60 บิต เดาไม่ได้
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randGroup = (n) => Array.from({ length: n }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

export const cleanPrefix = (p) => {
  const v = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return v.length >= 2 ? v : 'FLEXOZY';
};
export const KEY_RE = /^[A-Z0-9]{2,12}(-[A-Z0-9]{4}){3}$/;
const newKey = (prefix) => `${prefix}-${randGroup(4)}-${randGroup(4)}-${randGroup(4)}`;

/**
 * สร้างคีย์ใหม่ลงฐานข้อมูล (เรียกภายใน transaction)
 * product: { id, name, key_prefix, key_seconds, key_start, key_hwid }
 */
export async function issueKeys(c, { product, qty, orderId = null, userId = null, seconds, note = '' }) {
  const secs = seconds ?? Number(product.key_seconds);
  const start = product.key_start === 'purchase';
  const timed = start && secs > 0; // เริ่มนับตั้งแต่ซื้อ + มีอายุ → ตั้งวันหมดอายุทันที
  const prefix = cleanPrefix(product.key_prefix);
  const out = [];
  for (let i = 0; i < qty; i++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const key = newKey(prefix);
      const r = await c.query(
        `INSERT INTO license_keys(key,product_id,product_name,order_id,user_id,seconds,hwid_lock,activated_at,expires_at,note)
         VALUES($1,$2,$3,$4,$5,$6,$7, ${start ? 'now()' : 'NULL'}, ${timed ? 'now() + make_interval(secs => $9)' : 'NULL'}, $8)
         ON CONFLICT (key) DO NOTHING RETURNING id,key`,
        [key, product.id, product.name, orderId, userId, secs, !!product.key_hwid, note, ...(timed ? [Number(secs)] : [])]
      );
      if (r.rows[0]) { out.push(r.rows[0].key); break; }
      if (attempt === 7) throw new Error('สร้างคีย์ไม่สำเร็จ');
    }
  }
  return out;
}

export const keyNote = (product, seconds) =>
  `อายุคีย์ ${fmtDuration(seconds ?? product.key_seconds)}${Number(seconds ?? product.key_seconds) > 0 ? ` (${startText(product.key_start)})` : ''}${product.key_hwid ? ' · ผูกกับ 1 เครื่อง' : ''}`;

const MSG = {
  OK: 'คีย์ใช้งานได้',
  UNUSED: 'คีย์ยังไม่ถูกใช้งาน (ยังไม่เริ่มนับเวลา)',
  NOT_FOUND: 'ไม่พบคีย์นี้',
  BAD_FORMAT: 'รูปแบบคีย์ไม่ถูกต้อง',
  EXPIRED: 'คีย์หมดอายุแล้ว',
  REVOKED: 'คีย์ถูกระงับ',
  HWID_REQUIRED: 'คีย์นี้ต้องส่งรหัสเครื่อง (hwid) มาด้วย',
  HWID_MISMATCH: 'คีย์นี้ถูกผูกกับเครื่องอื่นแล้ว',
};

function view(row, code, extra = {}) {
  const valid = code === 'OK' || code === 'UNUSED';
  const exp = row?.expires_at ? new Date(row.expires_at) : null;
  return {
    valid,
    code,
    message: MSG[code],
    ...(row && {
      key: row.key,
      product: row.product_name,
      lifetime: Number(row.seconds) === 0,
      duration_seconds: Number(row.seconds),
      activated_at: row.activated_at ? new Date(row.activated_at).toISOString() : null,
      expires_at: exp ? exp.toISOString() : null,
      remaining_seconds: exp ? Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000)) : (row.activated_at ? null : Number(row.seconds) || null),
      hwid_locked: !!row.hwid_lock,
      hwid_bound: !!row.hwid,
      roblox: row.roblox_id
        ? { id: String(row.roblox_id), name: row.roblox_name, display_name: row.roblox_display || row.roblox_name, avatar: row.roblox_avatar || null, profile_url: robloxProfileUrl(row.roblox_id) }
        : null,
    }),
    ...extra,
  };
}

/**
 * ตรวจคีย์ (ใช้กับ API สาธารณะ)
 *  - ปกติ: ตรวจ + เริ่มนับเวลาครั้งแรก + ผูกเครื่อง (hwid) อัตโนมัติตั้งแต่ครั้งแรกที่ส่งมา + บันทึกโปรไฟล์ Roblox
 *  - check=true: ดูสถานะเฉยๆ ไม่เริ่มนับเวลา ไม่ผูกเครื่อง (ให้ลูกค้าเช็กอายุคีย์)
 *  - roblox: { id, name } จาก LocalPlayer ของผู้ใช้ (ไม่บังคับ)
 */
export async function verifyKey(rawKey, { hwid = '', check = false, roblox = null } = {}) {
  const key = String(rawKey || '').trim().toUpperCase();
  if (!KEY_RE.test(key)) return { valid: false, code: 'BAD_FORMAT', message: MSG.BAD_FORMAT };
  const hw = String(hwid || '').trim().slice(0, 128);

  // ดึงโปรไฟล์ Roblox ก่อนเข้า transaction (เรียกเครือข่ายภายนอก ไม่ควรถือล็อกฐานข้อมูล)
  const rb = !check && roblox ? await resolveRoblox(roblox) : null;

  return tx(async (c) => {
    const row = (await c.query('SELECT * FROM license_keys WHERE key=$1 FOR UPDATE', [key])).rows[0];
    if (!row) return { valid: false, code: 'NOT_FOUND', message: MSG.NOT_FOUND };
    if (row.revoked) return view(row, 'REVOKED');
    if (row.expires_at && new Date(row.expires_at) <= new Date()) return view(row, 'EXPIRED');

    if (check) return view(row, row.activated_at ? 'OK' : 'UNUSED');

    if (row.hwid_lock) {
      if (!hw) return view(row, 'HWID_REQUIRED');
      if (row.hwid && row.hwid !== hw) return view(row, 'HWID_MISMATCH');
    }
    // ผูกเครื่องอัตโนมัติ: ครั้งแรกที่ส่ง hwid มา จะจำเครื่องนั้นไว้ (ถ้าสินค้าตั้งล็อกไว้ ครั้งต่อไปต้องเป็นเครื่องเดิม)
    const bind = hw || null;
    const sets = ['last_check_at=now()', 'hwid=COALESCE(hwid,$2)'];
    const args = [row.id, bind];
    if (!row.activated_at) {
      sets.push('activated_at=now()', "expires_at = CASE WHEN seconds>0 THEN now() + (seconds || ' seconds')::interval END");
    }
    if (rb?.id) {
      args.push(rb.id, rb.name, rb.display, rb.avatar);
      sets.push(`roblox_id=$${args.length - 3}`, `roblox_name=$${args.length - 2}`, `roblox_display=$${args.length - 1}`, `roblox_avatar=$${args.length}`, 'roblox_seen_at=now()');
    }
    const r = (await c.query(`UPDATE license_keys SET ${sets.join(',')} WHERE id=$1 RETURNING *`, args)).rows[0];
    return view(r, 'OK');
  });
}
