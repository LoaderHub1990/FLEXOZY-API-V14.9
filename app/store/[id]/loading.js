export default function ProductLoading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="กำลังโหลดสินค้า">
      <div className="sk sk-line" style={{ width: 220, height: 12, marginBottom: 18 }} />
      <div className="pd">
        <div className="sk" style={{ aspectRatio: '1/1', borderRadius: 22 }} />
        <div className="sk-pcard" style={{ padding: 22, display: 'grid', gap: 14 }}>
          <div className="sk sk-line" style={{ height: 30, width: '75%' }} />
          <div className="sk sk-line" style={{ height: 16, width: '40%' }} />
          <div className="sk sk-line" style={{ height: 44 }} />
          <div className="sk sk-line" style={{ height: 48, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}
