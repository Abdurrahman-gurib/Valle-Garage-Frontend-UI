import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, PageHeader, TextArea } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function fmt(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function roleName(r){
  const x=String(r||'').toUpperCase();
  if(x==='ADMIN' || x==='admin') return 'Admin';
  if(x==='MECHANIC' || x==='mechanic') return 'Mechanic';
  if(x==='STORE_KEEPER' || x==='store') return 'Store Keeper';
  if(x==='FUEL_MANAGER' || x==='fuel') return 'Fuel System';
  if(x==='VEHICLE_MANAGER' || x==='vehicle_manager') return 'Vehicles In / Out';
  return r || '-';
}

export default function SupportAssistance(){
  const { currentUser, supportRequests = [], createSupportRequest, updateSupportRequest, refreshAll } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [filters,setFilters]=useState({ search:'', status:'' });
  const [form,setForm]=useState({ page:'Dashboard', subject:'', message:'', priority:'NORMAL' });
  const [reply,setReply]=useState({});

  const visible=useMemo(()=>{
    const q=filters.search.toLowerCase();
    return supportRequests.filter(r=>{
      const okStatus=!filters.status||String(r.status).toUpperCase()===filters.status;
      const okSearch=!q||[r.ticketNo,r.requesterName,r.requesterEmail,r.requesterRole,r.page,r.subject,r.message,r.status,r.priority,r.adminReply].some(x=>String(x||'').toLowerCase().includes(q));
      return okStatus && okSearch;
    });
  },[supportRequests,filters]);

  async function submit(e){
    e.preventDefault();
    if(!form.subject.trim() || !form.message.trim()) return;
    const saved = await createSupportRequest(form);
    if(saved) setForm({ page:'Dashboard', subject:'', message:'', priority:'NORMAL' });
  }

  async function adminUpdate(id, status){
    await updateSupportRequest(id, { status, adminReply: reply[id] || undefined });
    await refreshAll();
  }

  return <div className="page support-page">
    <PageHeader
      title={isAdmin ? 'Support Assistance Control Centre' : 'Support Assistance'}
      subtitle={isAdmin ? 'View and reply to support requests from mechanics, store keeper, fuel system and vehicles in/out.' : 'Send system questions or operational issues to admin. Requests are stored in the database.'}
    />

    <div className={isAdmin ? 'support-grid support-grid-admin' : 'support-grid'}>
      {!isAdmin && <Card>
        <h2>Ask for Assistance</h2>
        <p className="muted">Mention the vehicle plate, ticket, part, fuel record or page where you need help.</p>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Page / Module">
            <select className="input" value={form.page} onChange={e=>setForm({...form,page:e.target.value})}>
              <option>Dashboard</option><option>Vehicles</option><option>Assessments</option><option>Garage Work</option><option>Parts / Inventory</option><option>Fuel System</option><option>Vehicles In / Out</option><option>Reports</option><option>Other</option>
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
              <option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
            </select>
          </Field>
          <Field label="Subject"><Input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g. Cannot validate parts for AP 03"/></Field>
          <Field label="Details"><TextArea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Explain what happened and what you need."/></Field>
          <div className="form-actions"><Button type="submit">Send Support Request</Button></div>
        </form>
      </Card>}

      <Card className="support-list-card">
        <div className="card-head"><div><h2>{isAdmin ? 'All Support Requests' : 'My Support Requests'}</h2><p>{isAdmin ? 'Admin receives every query from every module.' : 'Track your request status and admin reply.'}</p></div><Badge>{visible.length} tickets</Badge></div>
        <div className="toolbar report-toolbar">
          <Field label="Search"><Input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="Search user, page, subject..."/></Field>
          <Field label="Status"><select className="input" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></Field>
          <div className="form-actions align-end"><Button variant="secondary" onClick={refreshAll}>Refresh</Button></div>
        </div>
        <div className="support-ticket-list">
          {visible.map(t=><div className="support-ticket" key={t.id}>
            <div className="support-ticket-head"><div><b>{t.ticketNo}</b><span>{t.subject}</span></div><div className="support-badges"><Badge>{t.status}</Badge><Badge>{t.priority}</Badge></div></div>
            <div className="support-meta"><span><b>User:</b> {t.requesterName || '-'}</span><span><b>Email:</b> {t.requesterEmail || '-'}</span><span><b>Role:</b> {roleName(t.requesterRole)}</span><span><b>Page:</b> {t.page || '-'}</span><span><b>Date:</b> {fmt(t.createdAt)}</span></div>
            <p className="support-message">{t.message}</p>
            {t.adminReply && <div className="notice success"><b>Admin reply:</b> {t.adminReply}</div>}
            {isAdmin && <div className="support-admin-tools"><Input placeholder="Admin reply / action taken" value={reply[t.id] ?? t.adminReply ?? ''} onChange={e=>setReply({...reply,[t.id]:e.target.value})}/><Button variant="secondary" onClick={()=>adminUpdate(t.id,'IN_PROGRESS')}>In Progress</Button><Button onClick={()=>adminUpdate(t.id,'RESOLVED')}>Resolve</Button><Button variant="ghost" onClick={()=>adminUpdate(t.id,'CLOSED')}>Close</Button></div>}
          </div>)}
          {!visible.length && <p className="muted">No support request found.</p>}
        </div>
      </Card>
    </div>
  </div>;
}
