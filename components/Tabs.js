'use client';
import { useEffect, useRef, useState } from 'react';
// tabs: [[key, label, node], ...]
export default function Tabs({ tabs }) {
  const [k, setK] = useState(tabs[0][0]);
  const refs = useRef({});
  const [pill, setPill] = useState({ left: 4, width: 0 });
  useEffect(() => { const el = refs.current[k]; if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth }); }, [k]);
  return (
    <>
      <div className="tabbar" role="tablist">
        <i className="pill" style={pill} />
        {tabs.map(([key, label]) => <button key={key} ref={(e) => (refs.current[key] = e)} role="tab" aria-selected={k === key} className={k === key ? 'on' : ''} onClick={() => setK(key)}>{label}</button>)}
      </div>
      {tabs.map(([key, , node]) => k === key && <div className="pane" key={key}>{node}</div>)}
    </>
  );
}
