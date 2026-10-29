// พื้นหลังเคลื่อนไหว: แสงออโรร่าลอย + กริดเรืองแสง + ประกายลอยขึ้น (CSS ล้วน ไม่กิน JS)
const DOTS = Array.from({ length: 28 }, (_, i) => ({
  l: (i * 37 + 11) % 100,
  s: 2 + ((i * 5) % 4),
  d: 14 + ((i * 7) % 16),
  dl: -((i * 3.1) % 20),
  o: 0.25 + ((i * 13) % 50) / 100,
}));
export default function Backdrop() {
  return (
    <div className="fxbg" aria-hidden="true">
      <i className="fxbg-blob b1" /><i className="fxbg-blob b2" /><i className="fxbg-blob b3" />
      <i className="fxbg-grid" />
      <div className="fxbg-dots">
        {DOTS.map((d, i) => (
          <b key={i} style={{ left: d.l + '%', width: d.s, height: d.s, animationDuration: d.d + 's', animationDelay: d.dl + 's', '--o': d.o }} />
        ))}
      </div>
      <i className="fxbg-vig" />
    </div>
  );
}
