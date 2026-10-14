import { route, json, body } from '@/lib/api';
import { one, q, HttpError } from '@/lib/db';
import { str, int } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { topupView } from '@/lib/topup';

async function mine(user, params) {
  const { id } = await params;
  const t = await one('SELECT * FROM topups WHERE id=$1 AND user_id=$2', [int(id, { min: 1 }), user.id]);
  if (!t) throw new HttpError(404, 'ไม่พบรายการ');
  return t;
}

// ดู QR ของรายการที่ยังค้างอยู่
export const GET = route(async (req, { params }) => {
  const user = await requireUser();
  const t = await mine(user, params);
  if (t.status !== 'pending') throw new HttpError(400, 'รายการนี้ไม่อยู่ในสถานะรอชำระ');
  return json({ topup: await topupView(t) });
});

// ผู้ใช้แจ้งว่าโอนแล้ว (ใส่หมายเหตุ/เลขอ้างอิงได้) หรือยกเลิกรายการ
export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const t = await mine(user, params);
  const b = await body(req);
  if (t.status !== 'pending') throw new HttpError(400, 'รายการนี้ปิดไปแล้ว');
  if (b.action === 'cancel') {
    await q("UPDATE topups SET status='cancelled', decided_at=now() WHERE id=$1 AND status='pending'", [t.id]);
  } else {
    await q('UPDATE topups SET ref=$1 WHERE id=$2', [str(b.ref, { max: 100 }), t.id]);
  }
  return json({ ok: true });
});
