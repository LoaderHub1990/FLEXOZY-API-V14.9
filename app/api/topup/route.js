import { route, json, body } from '@/lib/api';
import { one, q, HttpError } from '@/lib/db';
import { int } from '@/lib/util';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import { topupView } from '@/lib/topup';

// สร้างรายการเติมเงินใหม่ -> ได้ QR PromptPay ยอดไม่ซ้ำ (เศษสตางค์ใช้จับคู่โอนเงิน)
export const POST = route(async (req) => {
  const user = await requireUser();
  if (!process.env.PROMPTPAY_ID) throw new HttpError(503, 'ร้านยังไม่ได้ตั้งค่าบัญชีรับเงิน (PROMPTPAY_ID)');
  const s = await getSettings();
  const b = await body(req);
  const min = Math.max(1, parseInt(s.min_topup, 10) || 10);
  const baht = int(b.amount, { min, max: 50000, name: `จำนวนเงิน (ขั้นต่ำ ${min} บาท)` });

  // จำกัดรายการที่ค้างอยู่ต่อผู้ใช้
  const pend = await one("SELECT count(*)::int n FROM topups WHERE user_id=$1 AND status='pending' AND created_at > now() - interval '24 hours'", [user.id]);
  if (pend.n >= 5) throw new HttpError(429, 'มีรายการเติมเงินค้างอยู่มากเกินไป กรุณารอแอดมินตรวจสอบหรือยกเลิกรายการเดิม');

  let row = null;
  for (let i = 0; i < 20 && !row; i++) {
    const pay = baht * 100 + 1 + Math.floor(Math.random() * 99);
    const dup = await one("SELECT 1 FROM topups WHERE pay_amount=$1 AND status='pending' AND created_at > now() - interval '24 hours'", [pay]);
    if (!dup) row = await one('INSERT INTO topups(user_id,amount,pay_amount) VALUES($1,$2,$3) RETURNING *', [user.id, baht * 100, pay]);
  }
  if (!row) throw new HttpError(503, 'ระบบไม่ว่าง กรุณาลองใหม่อีกครั้ง');
  return json({ topup: await topupView(row) });
});

export const GET = route(async () => {
  const user = await requireUser();
  const { rows } = await q('SELECT * FROM topups WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [user.id]);
  const now = Date.now();
  return json({
    topups: rows.map((t) => ({
      id: t.id, amount: t.amount, payAmount: t.pay_amount, ref: t.ref, created_at: t.created_at,
      status: t.status === 'pending' && now - new Date(t.created_at).getTime() > 86400000 ? 'expired' : t.status,
    })),
  });
});
