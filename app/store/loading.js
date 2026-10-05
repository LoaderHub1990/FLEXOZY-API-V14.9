export default function StoreLoading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="กำลังโหลดสินค้า">
      <div className="sk sk-line" style={{ width: 180, height: 12, marginBottom: 14 }} />
      <div className="sk sk-line" style={{ width: 'min(280px,70%)', height: 34, marginBottom: 24 }} />
      <div className="filters" style={{ overflow: 'hidden' }}>
        {[90, 110, 80, 100].map((w, i) => <div key={i} className="sk" style={{ width: w, height: 38, borderRadius: 999, flex: 'none' }} />)}
      </div>
      <div className="grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk-pcard" style={{ '--i': i % 4 }}>
            <div className="sk" style={{ aspectRatio: '1/1' }} />
            <div style={{ padding: 14, display: 'grid', gap: 10 }}>
              <div className="sk sk-line" style={{ height: 14, width: '85%' }} />
              <div className="sk sk-line" style={{ height: 22, width: '45%' }} />
              <div className="sk sk-line" style={{ height: 32, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
