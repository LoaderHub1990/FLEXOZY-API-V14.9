'use client';
import { useState } from 'react';
import Copy from './Copy';
export default function Code({ tabs }) {
  const keys = Object.keys(tabs); const [k, setK] = useState(keys[0]);
  return (
    <div className="codebox">
      <div className="tabs">{keys.map((x) => <button key={x} type="button" className={x === k ? 'on' : ''} onClick={() => setK(x)}>{x}</button>)}<span style={{ flex: 1 }} /><Copy text={tabs[k]} small /></div>
      <pre className="code">{tabs[k]}</pre>
    </div>
  );
}
