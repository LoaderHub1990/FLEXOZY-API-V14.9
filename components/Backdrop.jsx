// พื้นหลังเบา: ใช้เฉพาะ transform/opacity (GPU) ไม่มี blur/filter หนักๆ ไม่ repaint ทุกเฟรม
const DOTS = Array.from({ length: 14 }, (_, i) => ({
  l: (i * 37 + 11) % 100, s: 2 + ((i * 5) % 3), d: 18 + ((i * 7) % 14), dl: -((i * 3.7) % 24), o: 0.2 + ((i * 13) % 40) / 100,
}));
export default function Backdrop() {
  return (
    <div className="fxbg" aria-hidden="true">
      <i className="fxbg-glow" />
      <i className="fxbg-grid" />
      <i className="fxbg-sweep" />
      <div className="fxbg-dots">
        {DOTS.map((d, i) => <b key={i} style={{ left: d.l + '%', width: d.s, height: d.s, animationDuration: d.d + 's', animationDelay: d.dl + 's', '--o': d.o }} />)}
      </div>
      <i className="fxbg-vig" />
    </div>
  );
}
