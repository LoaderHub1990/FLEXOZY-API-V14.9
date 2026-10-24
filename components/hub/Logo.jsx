// โลโก้ Flexozy Shop — เครื่องหมาย "F" แบบมุมตัดเฉียง (วาดด้วยเส้นก่อน แล้วเติมสีขาว)
export function Mark({ size = 28, draw = false }) {
  return (
    <svg className={'hb-mark' + (draw ? ' draw' : '')} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M16 12H86L72 33H42V44H68L57 61H42V90H16Z" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Emo({ v, size = 18 }) {
  const m = /^<(a?):([A-Za-z0-9_]{2,32}):(\d{15,25})>$/.exec(v || '');
  if (m) return <img className="hb-emo" alt={m[2]} width={size} height={size} src={`https://cdn.discordapp.com/emojis/${m[3]}.${m[1] ? 'gif' : 'webp'}?size=64&quality=lossless`} />;
  return v ? <span className="hb-emo-c" style={{ fontSize: size - 2 }}>{v}</span> : null;
}
