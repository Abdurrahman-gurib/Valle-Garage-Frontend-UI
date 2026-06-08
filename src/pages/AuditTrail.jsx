import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { api } from '../services/api.js';

function fmt(v){
  if(!v) return '-';
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return String(v).replace('T',' ').slice(0,19);
  const pad = x => String(x).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function niceAction(row){
  const method = String(row.method || row.action || '').toUpperCase();
  const path = String(row.path || '');
  const entity = String(row.entity || '').toLowerCase();

  if(method.includes('POST')) return `Created / Added ${entity || 'record'}`;
  if(method.includes('PATCH') || method.includes('PUT')) return `Updated ${entity || 'record'}`;
  if(method.includes('DELETE')) return `Deleted / Deactivated ${entity || 'record'}`;
  if(path.includes('/auth/login')) return 'Logged in';
  if(method.includes('GET')) return `Viewed ${entity || 'page/data'}`;
  return row.summary || row.action || 'Activity recorded';
}

function nicePage(row){
  const path = String(row.path || '');
  if(path.includes('/vehicles')) return 'Vehicles';
  if(path.includes('/assessments')) return 'Assessments';
  if(path.includes('/garage-ops')) return 'Garage Work';
  if(path.includes('/inventory')) return 'Parts / Inventory';
  if(path.includes('/fuel')) return 'Fuel System';
  if(path.includes('/vehicle-out')) return 'Vehicles In / Out';
  if(path.includes('/transactions')) return 'Transactions / Purchases';
  if(path.includes('/reports')) return 'Reports';
  if(path.includes('/support')) return 'Support Assistance';
  if(path.includes('/users')) return 'Users / Settings';
  if(path.includes('/auth')) return 'Login / Account';
  return path || '-';
}

function niceStatus(row){
  const code = Number(row.statusCode || 200);
  if(code >= 500) return 'Failed - Server Error';
  if(code >= 400) return 'Rejected / Not Allowed';
  if(code >= 300) return 'Redirected';
  return 'Success';
}

function detailsText(row){
  const details = row.details || {};
  if(row.summary) return row.summary;
  const pieces = [];
  if(details.plateNumber || details.plate) pieces.push(`Vehicle ${details.plateNumber || details.plate}`);
  if(details.ticketNo || details.ticket) pieces.push(`Ticket ${details.ticketNo || details.ticket}`);
  if(details.name) pieces.push(`Name ${details.name}`);
  if(details.email) pieces.push(`Email ${details.email}`);
  if(details.role) pieces.push(`Role ${details.role}`);
  return pieces.join(' • ') || JSON.stringify(details).slice(0,120) || '-';
}

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

  const enhancedRows = useMemo(() => rows.map((r) => ({
    ...r,
    friendlyAction: niceAction(r),
    friendlyPage: nicePage(r),
    friendlyStatus: niceStatus(r),
    friendlyDetails: detailsText(r),
  })), [rows]);

  const filtered = useMemo(()=>{
    const q = filter.search.toLowerCase();
    return enhancedRows.filter(r => !q || `${r.userName} ${r.userEmail} ${r.friendlyAction} ${r.friendlyPage} ${r.friendlyDetails}`.toLowerCase().includes(q));
  },[enhancedRows, filter.search]);

  function exportCsv(){
    const header = ['User','Email','What Was Done','Page / Module','Record Type','Record ID','Date Time','Status','Readable Details'];
    const body = filtered.map(r => [r.userName, r.userEmail, r.friendlyAction, r.friendlyPage, r.entity, r.entityId, fmt(r.createdAt), r.friendlyStatus, r.friendlyDetails]);
    download(`audit-trail-readable-${new Date().toISOString().slice(0,10)}.csv`, csv([header, ...body]));
  }

  return <div className="page audit-readable-page">
    <PageHeader
      title="Readable Audit Trail"
      subtitle="A simple activity history for management: who did what, on which page, when it happened, and whether it succeeded."
      action={exportCsv}
      actionLabel="Export Activity CSV"
    />

    <div className="metrics-grid audit-kpi-grid">
      <Card className="metric-card"><span>Total Activities</span><b>{enhancedRows.length}</b><small>All loaded records</small></Card>
      <Card className="metric-card"><span>Successful</span><b>{enhancedRows.filter(r=>Number(r.statusCode||200)<400).length}</b><small>Saved or viewed successfully</small></Card>
      <Card className="metric-card"><span>Rejected / Failed</span><b>{enhancedRows.filter(r=>Number(r.statusCode||200)>=400).length}</b><small>Needs review</small></Card>
      <Card className="metric-card"><span>Users</span><b>{new Set(enhancedRows.map(r=>r.userEmail).filter(Boolean)).size}</b><small>People active in system</small></Card>
    </div>

    <Card className="report-filters">
      <div className="form-grid four">
        <Field label="Search person, email, page, action or details">
          <Input value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})} placeholder="e.g. stock, AP 88, reset password, garage..." />
        </Field>
        <Field label="From"><Input type="date" value={filter.from} onChange={e=>setFilter({...filter,from:e.target.value})} /></Field>
        <Field label="To"><Input type="date" value={filter.to} onChange={e=>setFilter({...filter,to:e.target.value})} /></Field>
        <div className="report-apply-row no-border">
          <Button disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Apply Filter'}</Button>
        </div>
      </div>
    </Card>

    <Card className="report-result-card">
      <div className="card-head">
        <div>
          <h2>Whole Website Activity</h2>
          <p>Shows user, email, action, page/module, record, date/time, status and readable details.</p>
        </div>
        <Badge tone="neutral">{filtered.length} rows</Badge>
      </div>

      <Table headers={['User','Email','What Was Done','Page / Module','Record','Date / Time','Status','Details']}>
        {filtered.map(r => <tr key={r.id}>
          <td><b>{r.userName || '-'}</b></td>
          <td>{r.userEmail || '-'}</td>
          <td>{r.friendlyAction}</td>
          <td>{r.friendlyPage}</td>
          <td>{r.entity}{r.entityId ? ` / ${String(r.entityId).slice(0,8)}` : ''}</td>
          <td>{fmt(r.createdAt)}</td>
          <td><Badge tone={Number(r.statusCode || 200) >= 400 ? 'danger' : 'success'}>{r.friendlyStatus}</Badge></td>
          <td><small>{r.friendlyDetails}</small></td>
        </tr>)}
      </Table>
    </Card>
  </div>;
}
