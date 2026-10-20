import { route, json } from '@/lib/api';
import { q } from '@/lib/db';
import { requireUser } from '@/lib/auth';

// ประวัติเติมเงินรวมทุกช่องทาง + สรุปยอด
export const GET = route(async () => {
  const user = await requireUser();
  const [slips, tms, olds] = await Promise.all([
    q('SELECT * FROM slip_topups WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [user.id]),
    q('SELECT * FROM truemoney_topups WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [user.id]),
    q('SELECT * FROM topups WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [user.id]),
  ]);
  const now = Date.now();
  const mask = (v) => (v.length > 8 ? `${v.slice(0, 4)}••••${v.slice(-3)}` : v);
  const bank = slips.rows.map((t) => ({
    key: `b-${t.id}`, id: t.id, method: 'bank', amount: t.amount, status: 'approved',
    ref: t.trans_ref, note: [t.sender_bank, t.sender_name].filter(Boolean).join(' · '), created_at: t.created_at,
  }));
  const tm = tms.rows.map((t) => ({
    key: `t-${t.id}`, id: t.id, method: 'truemoney', amount: t.amount,
    status: t.status === 'credited' ? 'approved' : t.status === 'failed' ? 'rejected' : t.status === 'redeemed' || t.status === 'review' ? 'processing' : t.status,
    ref: mask(t.voucher_code), note: t.status === 'failed' ? t.error_code || '' : '', created_at: t.created_at,
  }));
  const old = olds.rows.map((t) => ({
    key: `p-${t.id}`, id: t.id, method: 'manual', amount: t.amount, ref: t.ref || '', note: '', created_at: t.created_at,
    status: t.status === 'pending' && now - new Date(t.created_at).getTime() > 86400000 ? 'expired' : t.status,
  }));
  const topups = [...bank, ...tm, ...old].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  const ok = topups.filter((t) => t.status === 'approved');
  const summary = {
    total: ok.reduce((n, t) => n + Number(t.amount), 0),
    count: ok.length,
    last: ok[0]?.created_at || null,
  };
  return json({ topups, summary });
});
