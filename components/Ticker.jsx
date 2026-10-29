// แถบประกาศวิ่ง (CSS ล้วน)
import Icon from './Icons';
export default function AnnounceBar({ text }) {
  if (!text) return null;
  const t = Array.from({ length: 6 }, (_, i) => <span key={i}>{text}</span>);
  return (
    <div className="annc rv rv-up" role="status">
      <div className="annc-tag"><Icon n="bell" size={15} /> ประกาศ</div>
      <div className="annc-run"><div className="annc-track">{t}{t}</div></div>
    </div>
  );
}
