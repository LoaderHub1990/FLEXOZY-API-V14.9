// แสดงระหว่างรอข้อมูลหน้าใดๆ (เซิร์ฟเวอร์กำลังดึงข้อมูล)
export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="กำลังโหลด">
      <div className="sk sk-line" style={{ width: 120, height: 12, marginBottom: 14 }} />
      <div className="sk sk-line" style={{ width: 'min(320px,70%)', height: 34, marginBottom: 26 }} />
      <div className="stats">
        {[0, 1, 2, 3].map((i) => <div key={i} className="sk sk-card" style={{ height: 82, '--i': i }} />)}
      </div>
      <div className="cats" style={{ marginTop: 28 }}>
        {[0, 1].map((i) => <div key={i} className="sk sk-card" style={{ height: 260 }} />)}
      </div>
    </div>
  );
}
