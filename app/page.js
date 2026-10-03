'use client';

import { useEffect, useMemo, useState } from 'react';

function pct(q) { return Math.max(0, Math.min(100, Number(q?.percent || 0))); }

export default function Home() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connected, setConnected] = useState(false);
  const [quests, setQuests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadQuests() {
    if (!token.trim()) return setError('กรุณาใส่ Token ก่อน');
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/quests', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({token:token.trim()})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'เชื่อมต่อไม่สำเร็จ');
      setQuests(d.quests || []); setSelected([]); setConnected(true);
    } catch(e) { setConnected(false); setError(e.message); }
    finally { setLoading(false); }
  }

  async function start() {
    if (!token.trim() || !selected.length) return;
    setError('');
    try {
      const r = await fetch('/api/jobs/start', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({token:token.trim(), questIds:selected})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'เริ่มงานไม่สำเร็จ');
      await refreshJob(d.jobId);
    } catch(e) { setError(e.message); }
  }

  async function refreshJob(id = job?.id) {
    if (!id) return;
    try {
      const r = await fetch(`/api/jobs/${id}`, { cache:'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setJob(d.job);
    } catch(e) { setError(e.message); }
  }

  async function stop() {
    if (!job?.id) return;
    await fetch(`/api/jobs/${job.id}/stop`, { method:'POST' });
    refreshJob();
  }

  useEffect(() => {
    if (job?.id && !['finished','failed','stopped'].includes(job.state)) {
      const t=setInterval(()=>refreshJob(),1000);
      return()=>clearInterval(t);
    }
  }, [job?.id, job?.state]);

  const total = job?.total || 0;
  const completed = job?.completed || 0;
  const overall = total ? Math.round(completed / total * 100) : 0;
  const busy = !!job && ['running','connecting','queued'].includes(job.state);

  return <main className="shell">
    <header className="topbar">
      <div><div className="eyebrow">QUEST CONTROL</div><h1>H_RealHigh</h1><p>Next.js Dashboard</p></div>
      <div className={`pill ${connected ? 'live' : ''}`}><span/> {job?.state || (connected ? 'CONNECTED' : 'READY')}</div>
    </header>

    <section className="grid stats">
      <div className="panel stat"><small>CONNECTION</small><b>{connected ? 'ON' : 'OFF'}</b><span>Current session</span></div>
      <div className="panel stat"><small>AVAILABLE QUESTS</small><b>{quests.length}</b><span>Loaded from Worker</span></div>
      <div className="panel stat"><small>JOB PROGRESS</small><b>{overall}%</b><span>{completed} / {total || 0} completed</span></div>
    </section>

    <section className="panel controls">
      <div className="section-head"><div><small>DISCORD TOKEN</small><h2>เชื่อมต่อบัญชี</h2></div><span className="token-note">ไม่แสดงใน Log</span></div>
      <div className="row token-row">
        <input className="token-input" type={showToken ? 'text' : 'password'} value={token} onChange={e=>setToken(e.target.value)} placeholder="ใส่ Token ที่นี่" autoComplete="off" spellCheck="false" disabled={busy}/>
        <button className="ghost" onClick={()=>setShowToken(v=>!v)} disabled={busy}>{showToken ? 'Hide' : 'Show'}</button>
        <button onClick={loadQuests} disabled={!token.trim() || loading || busy}>{loading ? 'Connecting…' : 'Connect & Load'}</button>
      </div>
      <small className="security-note">Token จะถูกส่งผ่าน HTTPS ไปยัง Worker และไม่ถูกใส่ใน URL, Log หรือ localStorage</small>
    </section>

    <section className="panel">
      <div className="section-head"><div><small>QUESTS</small><h2>เลือกเควสที่จะทำ</h2></div><div className="actions"><button onClick={()=>setSelected(quests.map(q=>q.id))} className="ghost" disabled={!quests.length || busy}>Select all</button><button onClick={start} disabled={!selected.length || !token.trim() || busy}>Start selected</button></div></div>
      <div className="quest-list">
        {quests.map(q=><label className="quest" key={q.id}><input type="checkbox" checked={selected.includes(q.id)} disabled={busy} onChange={e=>setSelected(s=>e.target.checked?[...new Set([...s,q.id])]:s.filter(x=>x!==q.id))}/><div className="quest-main"><div className="quest-title"><b>{q.name}</b><span>{q.type}</span></div><div className="bar"><i style={{width:`${pct(q)}%`}}/></div><small>{q.current} / {q.target} • {pct(q)}%</small></div></label>)}
        {!quests.length && <div className="empty">ใส่ Token แล้วกด Connect & Load เพื่อโหลด Quest</div>}
      </div>
    </section>

    <section className="grid two">
      <div className="panel"><div className="section-head"><div><small>ACTIVE JOB</small><h2>Progress</h2></div>{job && <button className="danger" onClick={stop} disabled={['finished','failed','stopped'].includes(job.state)}>Stop</button>}</div><div className="big-progress"><i style={{width:`${overall}%`}}/></div><div className="progress-meta"><b>{overall}%</b><span>{job?.state || 'No active job'}</span></div><div className="job-items">{job && Object.values(job.quests||{}).map(q=><div className="job-item" key={q.id}><span>{q.name}</span><b>{q.state}</b><small>{q.current}/{q.target}</small></div>)}</div></div>
      <div className="panel"><div className="section-head"><div><small>RUNTIME</small><h2>Log</h2></div></div><div className="logs">{(job?.logs||[]).slice().reverse().map((l,i)=><div className={`log ${l.type||''}`} key={i}><time>{new Date(l.time).toLocaleTimeString()}</time><span>{l.message}</span></div>)}{!job?.logs?.length && <div className="empty">No runtime logs</div>}</div></div>
    </section>
    {error && <div className="error">{error}</div>}
  </main>;
}
