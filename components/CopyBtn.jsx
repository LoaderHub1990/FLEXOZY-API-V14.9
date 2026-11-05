'use client';
import { useState } from 'react';
export default function CopyBtn({ text, label, done }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="tn-copy" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => {}); }}>
      {ok ? '✓ ' + done : label}
    </button>
  );
}
