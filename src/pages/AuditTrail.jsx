
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { api } from '../services/api.js';

function fmt(v){ return v ? String(v).replace('T',' ').slice(0,19) : '-'; }
function csv(rows){ return rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }
function download(name, text){ const blob = new Blob([text], { type:'text/csv;charset=utf-8' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }

export default function AuditTrail(){
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(false);
  const [filter,setFilter] = useState({ search:'', from:'', to:'', status:'' });

  async function load(){
    setLoading(true);
    try { setRows(await api.auditTrail.list(filter)); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const filtered = useMemo(()=>{
    const q = filter.search.toLowerCase();
    return rows.filter(r => !q || `${r.userName} ${r.userEmail} ${r.action} ${r.entity} ${r.path} ${r.summary}`.toLowerCase().includes(q));
  },[rows, filter.search]);

  function exportCsv(){
    const header = ['User','Email','Action','Entity','Entity ID','Path','Status','Date','Details'];
    const body = filtered.map(r => [r.userName, r.userEmail, r.action, r.entity, r.entityId, r.path, r.statusCode, fmt(r.createdAt), JSON.stringify(r.details || {})]);
    download(`audit-trail-${new Date().toISOString().slice(0,10)}.csv`, csv([header, ...body]));
  }

  return <div className="page admin-analytics-page">
    <PageHeader title="Admin Audit Trail" subtitle="See every important activity done on the website by logged-in users." action={exportCsv} actionLabel="Export CSV" />
    <Card className="report-filters">
      <div className="form-grid four">
        <Field label="Search user, email, action or page"><Input value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})} placeholder="admin@, stock, /api/inventory..." /></Field>
        <Field label="From"><Input type="date" value={filter.from} onChange={e=>setFilter({...filter,from:e.target.value})} /></Field>
        <Field label="To"><Input type="date" value={filter.to} onChange={e=>setFilter({...filter,to:e.target.value})} /></Field>
        <div className="report-apply-row no-border"><Button disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Apply Filter'}</Button></div>
      </div>
    </Card>
    <Card className="report-result-card">
      <div className="card-head"><div><h2>Website Activity Log</h2><p>User, email, action, API/page, timestamp, status and details.</p></div><Badge tone="neutral">{filtered.length} rows</Badge></div>
      <Table headers={['User','Email','Action','Page/API Path','Entity','Date/Time','Status','Details']}>
        {filtered.map(r => <tr key={r.id}>
          <td><b>{r.userName || '-'}</b></td>
          <td>{r.userEmail || '-'}</td>
          <td>{r.action}</td>
          <td>{r.path || '-'}</td>
          <td>{r.entity}{r.entityId ? ` / ${String(r.entityId).slice(0,8)}` : ''}</td>
          <td>{fmt(r.createdAt)}</td>
          <td><Badge tone={Number(r.statusCode || 200) >= 400 ? 'danger' : 'success'}>{r.statusCode || 200}</Badge></td>
          <td><small>{r.summary || JSON.stringify(r.details || {}).slice(0,80)}</small></td>
        </tr>)}
      </Table>
    </Card>
  </div>;
}
