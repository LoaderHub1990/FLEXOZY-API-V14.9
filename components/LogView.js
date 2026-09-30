const IC = { ok: '✓', warn: '!', error: '✕', info: '·' };
const ms = (n) => (n < 1000 ? n + 'ms' : (n / 1000).toFixed(2) + 's');
export default function LogView({ lines, title = 'log' }) {
  return (
    <div className="log">
      <div className="log-h"><span>{title}</span><span>{lines.length} รายการ</span></div>
      <div className="log-b">
        {lines.map((l, i) => (
          <div key={i} className={'ll ' + l.level} style={{ '--i': i }}>
            <time>{ms(l.ms)}</time><span className="ic">{IC[l.level] || '·'}</span><span>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
