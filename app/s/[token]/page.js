import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import * as db from '@/lib/db';
import { PREFIX } from '@/lib/promptpay';
import Copy from '@/components/Copy';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ชำระเงิน — Flexozy', robots: { index: false } };
const LABEL = { phone: 'พร้อมเพย์ (เบอร์โทร)', national_id: 'พร้อมเพย์ (บัตรประชาชน)', ewallet: 'พร้อมเพย์ (e-Wallet)', bank_account: 'โอนเข้าบัญชีธนาคาร' };
export default async function Slip({ params }) {
  let t = (await params).token;
  try { t = decodeURIComponent(t); } catch {}
  const id = t.startsWith(PREFIX) ? t.slice(PREFIX.length) : t;
  if (!/^[a-f0-9]{10}$/.test(id)) notFound();
  const s = await db.get('slip:' + id);
  if (!s) notFound();
  const svg = s.qr ? await QRCode.toString(s.qr, { type: 'svg', margin: 1, width: 260, errorCorrectionLevel: 'M' }) : null;
  const amount = s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <main className="wrap narrow">
      <div className="slip">
        <div className="slip-top"><img src="/logo.png" alt="" width="34" height="34" /><span>คำขอชำระเงิน</span></div>
        <div className="slip-amt"><small>จำนวนเงิน</small><b>฿{amount}</b></div>
        {svg ? <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
        <dl className="kv">
          <dt>ช่องทาง</dt><dd>{LABEL[s.type]}</dd>
          {s.bank ? (<><dt>ธนาคาร</dt><dd>{s.bank}</dd></>) : null}
          {s.name ? (<><dt>ชื่อบัญชี</dt><dd>{s.name}</dd></>) : null}
          <dt>ปลายทาง</dt><dd className="mono">{s.target} <Copy text={s.target} small /></dd>
          <dt>รหัสอ้างอิง</dt><dd className="mono">{PREFIX}{s.id}</dd>
        </dl>
      </div>
    </main>
  );
}
