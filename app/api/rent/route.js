import { route, json, body } from '@/lib/api';
import { q, one, tx, HttpError } from '@/lib/db';
import { int } from '@/lib/util';
import { getUser, requireUser, clientIp } from '@/lib/auth';
import { seedSite } from '@/lib/templates';
import { ownerRental } from '@/lib/tstore';
import { ROOT_DOMAIN, parseSub, isSubFree, getRentPlans, rentalState, cleanSite, lightLimit, siteUrl, GRACE_DAYS } from '@/lib/rent';

export const dynamic = 'force-dynamic';

const view = (r) => ({
  id: r.id, sub: r.sub, plan_name: r.plan_name, status: rentalState(r), expires_at: r.expires_at, created_at: r.created_at,
  site: r.site || {}, url: siteUrl(r.sub), preview: `/site/${r.sub}`,
});

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  // ตรวจว่าชื่อเว็บว่างไหม (สาธารณะ)
  if (sp.has('check')) {
    lightLimit('chk:' + (await clientIp()), 40, 60000);
    const p = parseSub(sp.get('check'));
    if (!p.ok) return json({ ok: false, available: false, reason: p.reason, sub: p.sub });
    return json({ ok: true, available: await isSubFree(p.sub), sub: p.sub, url: siteUrl(p.sub) });
  }
  const user = await getUser();
  const plans = (await getRentPlans()).map((p) => ({ ...p, price: Number(p.price) }));
  const out = { root: ROOT_DOMAIN, plans, balance: user ? Number(user.balance) : null, loggedIn: !!user, graceDays: GRACE_DAYS };
  if (user) {
    const { rows } = await q('SELECT * FROM rentals WHERE user_id=$1 ORDER BY id DESC', [user.id]);
    out.rentals = rows.map(view);
  }
  return json(out);
});

// สั่งซื้อ (เช่าใหม่) / ต่ออายุ — หักจากกระเป๋าเงินในธุรกรรมเดียว
export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const planId = int(b.planId, { min: 1, name: 'แพ็กเกจ' });
  const renewId = b.rentalId != null ? int(b.rentalId, { min: 1, name: 'เว็บ' }) : null;
  const parsed = renewId ? null : parseSub(b.sub);
  if (!renewId && !parsed.ok) throw new HttpError(400, parsed.reason === 'reserved' ? 'ชื่อนี้สงวนไว้ กรุณาใช้ชื่ออื่น' : 'ชื่อเว็บต้องเป็น a-z 0-9 และ - ยาว 3-32 ตัว (ห้ามขึ้นต้น/ลงท้ายด้วย -)');

  const result = await tx(async (c) => {
    const u = (await c.query('SELECT id,balance,banned FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
    if (!u || u.banned) throw new HttpError(403, 'บัญชีนี้ถูกระงับ');
    const plan = (await c.query('SELECT * FROM rent_plans WHERE id=$1 AND active', [planId])).rows[0];
    if (!plan) throw new HttpError(404, 'ไม่พบแพ็กเกจนี้');
    const price = Number(plan.price);
    if (u.balance < price) throw new HttpError(402, 'ยอดเงินคงเหลือไม่พอ กรุณาเติมเงินก่อน');

    let rental, kind;
    if (renewId) {
      rental = (await c.query('SELECT * FROM rentals WHERE id=$1 AND user_id=$2 FOR UPDATE', [renewId, u.id])).rows[0];
      if (!rental) throw new HttpError(404, 'ไม่พบเว็บที่ต้องการต่ออายุ');
      // ต่อจากวันหมดอายุเดิม (ถ้ายังไม่หมด) ไม่เสียวันที่เหลือ
      rental = (await c.query(
        `UPDATE rentals SET expires_at = greatest(expires_at, now()) + ($1 || ' days')::interval, plan_name=$2, plan_id=$3, status=CASE WHEN status='suspended' THEN status ELSE 'active' END
          WHERE id=$4 RETURNING *`, [String(plan.days), plan.name, plan.id, rental.id])).rows[0];
      kind = 'renew';
    } else {
      // ปล่อยชื่อที่หมดอายุเกินช่วงเก็บไว้ แล้วจองใหม่ (unique index กันชนกันเอง)
      await c.query(`DELETE FROM rentals WHERE lower(sub)=$1 AND expires_at < now() - ($2 || ' days')::interval`, [parsed.sub, String(GRACE_DAYS)]);
      try {
        rental = (await c.query(
          `INSERT INTO rentals(user_id,plan_id,plan_name,sub,expires_at,site)
           VALUES($1,$2,$3,$4, now() + ($5 || ' days')::interval, $6::jsonb) RETURNING *`,
          [u.id, plan.id, plan.name, parsed.sub, String(plan.days), JSON.stringify(seedSite(b.template, parsed.sub))])).rows[0];
      } catch (e) {
        if (e.code === '23505') throw new HttpError(409, `ชื่อ “${parsed.sub}” ถูกใช้แล้ว ลองชื่ออื่น`);
        throw e;
      }
      kind = 'new';
    }
    const nb = (await c.query('UPDATE users SET balance = balance - $1 WHERE id=$2 RETURNING balance', [price, u.id])).rows[0].balance;
    if (price > 0) await c.query('INSERT INTO wallet_tx(user_id,delta,reason) VALUES($1,$2,$3)', [u.id, -price, `${kind === 'renew' ? 'ต่ออายุ' : 'เช่าเว็บ'} ${rental.sub}.${ROOT_DOMAIN} (${plan.name})`]);
    await c.query('INSERT INTO rent_orders(rental_id,user_id,sub,plan_name,days,total,kind) VALUES($1,$2,$3,$4,$5,$6,$7)', [rental.id, u.id, rental.sub, plan.name, plan.days, price, kind]);
    return { rental, balance: Number(nb), kind };
  });
  return json({ ok: true, kind: result.kind, balance: result.balance, rental: view(result.rental) });
});

// แก้ไขเนื้อหาเว็บ (เจ้าของเท่านั้น)
export const PUT = route(async (req) => {
  const b = await body(req);
  const id = int(b.rentalId, { min: 1, name: 'เว็บ' });
  await ownerRental(id); // ล็อกอินเว็บหลัก หรือเป็นเจ้าของร้านบนเว็บของร้านเอง
  const site = cleanSite(b.site);
  const row = (await q('UPDATE rentals SET site=$1::jsonb WHERE id=$2 RETURNING *', [JSON.stringify(site), id])).rows[0];
  return json({ ok: true, rental: view(row) });
});
