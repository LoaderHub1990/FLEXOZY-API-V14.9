'use client';
import { useState } from 'react';
import CopyButton from './CopyButton';
import { EXAMPLES } from '../lib/config';
export default function CodeTabs() {
  const keys = Object.keys(EXAMPLES);
  const [k, setK] = useState(keys[0]);
  return (
    <div className="card static">
      <div className="tabs">
        {keys.map((x) => <button key={x} className={`tab ${x === k ? 'on' : ''}`} onClick={() => setK(x)}>{x}</button>)}
        <span className="grow" />
        <CopyButton text={EXAMPLES[k]} />
      </div>
      <pre className="code">{EXAMPLES[k]}</pre>
    </div>
  );
}
