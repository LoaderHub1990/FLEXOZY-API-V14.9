'use client';

import { useEffect, useMemo, useState } from 'react';

function pct(q) { return Math.max(0, Math.min(100, Number(q?.percent || 0))); }

export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState('');
  const [quests, setQuests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAccounts() {
    try { const r = await fetch('/api/accounts', { cache:'no-store' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setAccounts(d.accounts || []); if (!account && d.accounts?.[0]) setAccount(d.accounts[0]); }
    catch(e) { setError(e.message); }
  }
  async function loadQuests() {
    if (!account) return;
    setLoading(true); setError('');
    try { const r = await fetch(`/api/quests?accountId=${encodeURIComponent(account)}`, { cache:'no-store' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setQuests(d.quests || []); setSelected([]); }
    catch(e) { setError(e.message); } finally { setLoading(false); }
  }
  async function start() {
    if (!account || !selected.length) return;
    setError('');
    try { const r = await fetch('/api/jobs/start', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({accountId:account, questIds:selected}) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); await refreshJob(d.jobId); }
    catch(e) { setError(e.message); }
  }
  async function refreshJob(id = job?.id) {
    if (!id) return;
    try { const r = await fetch(`/api/jobs/${id}`, { cache:'no-store' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setJob(d.job); }
    catch(e) { setError(e.message); }
  }
  async function stop() { if (!job?.id) return; await fetch(`/api/jobs/${job.id}/stop`, { method:'POST' }); refreshJob(); }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (job?.id && !['finished','failed'].includes(job.state)) { const t=setInterval(()=>refreshJob(),1000); return()=>clearInterval(t); } }, [job?.id, job?.state]);

  const total = job?.total || 0;
  const completed = job?.completed || 0;
  const overall = total ? Math.round(completed / total * 100) : 0;

  return <main className="shell">
    <header className="topbar">
      <div><div className="eyebrow">QUEST CONTROL</div><h1>H_RealHigh</h1><p>Next.js Dashboard</p></div>
      <div className={`pill ${job?.state === 'running' ? 'live' : ''}`}><span/> {job?.state || 'READY'}</div>
    </header>

    <section className="grid stats">
      <div className="panel stat"><small>ACCOUNTS</small><b>{accounts.length}</b><span>TokenStore accounts</span></div>
      <div className="panel stat"><small>AVAILABLE QUESTS</small><b>{quests.length}</b><span>Current account</span></div>
      <div className="panel stat"><small>JOB PROGRESS</small><b>{overall}%</b><span>{completed} / {total || 0} completed</span></div>
    </section>

    <section className="panel controls">
      <div className="section-head"><div><small>ACCOUNT</small><h2>เลือกบัญชี</h2></div><button className="ghost" onClick={loadAccounts}>Refresh</button></div>
      <div className="row">
        <select value={account} onChange={e=>setAccount(e.target.value)}><option value="">เลือกบัญชี</option>{accounts.map(a=><option key={a} value={a}>{a}</option>)}</select>
        <button onClick={loadQuests} disabled={!account || loading}>{loading ? 'Loading…' : 'Load Quests'}</button>
      </div>
    </section>

    <section className="panel">
      <div className="section-head"><div><small>QUESTS</small><h2>เลือกเควสที่จะทำ</h2></div><div className="actions"><button onClick={()=>setSelected(quests.map(q=>q.id))} className="ghost">Select all</button><button onClick={start} disabled={!selected.length || !!job && ['running','connecting','queued'].includes(job.state)}>Start selected</button></div></div>
      <div className="quest-list">
        {quests.map(q=><label className="quest" key={q.id}><input type="checkbox" checked={selected.includes(q.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,q.id]:s.filter(x=>x!==q.id))}/><div className="quest-main"><div className="quest-title"><b>{q.name}</b><span>{q.type}</span></div><div className="bar"><i style={{width:`${pct(q)}%`}}/></div><small>{q.current} / {q.target} • {pct(q)}%</small></div></label>)}
        {!quests.length && <div className="empty">ยังไม่มี Quest — เลือกบัญชีแล้วกด Load Quests</div>}
      </div>
    </section>

    <section className="grid two">
      <div className="panel"><div className="section-head"><div><small>ACTIVE JOB</small><h2>Progress</h2></div>{job && <button className="danger" onClick={stop} disabled={['finished','failed'].includes(job.state)}>Stop</button>}</div><div className="big-progress"><i style={{width:`${overall}%`}}/></div><div className="progress-meta"><b>{overall}%</b><span>{job?.state || 'No active job'}</span></div><div className="job-items">{job && Object.values(job.quests||{}).map(q=><div className="job-item" key={q.id}><span>{q.name}</span><b>{q.state}</b><small>{q.current}/{q.target}</small></div>)}</div></div>
      <div className="panel"><div className="section-head"><div><small>RUNTIME</small><h2>Log</h2></div></div><div className="logs">{(job?.logs||[]).slice().reverse().map((l,i)=><div className={`log ${l.type||''}`} key={i}><time>{new Date(l.time).toLocaleTimeString()}</time><span>{l.message}</span></div>)}{!job?.logs?.length && <div className="empty">No runtime logs</div>}</div></div>
    </section>
    {error && <div className="error">{error}</div>}
  </main>;
}
