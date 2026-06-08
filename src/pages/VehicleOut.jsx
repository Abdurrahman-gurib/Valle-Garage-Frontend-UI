import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table, Badge } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function fmt(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function secondsBetween(a,b,nowOverride=null){ const s=a?new Date(a):null; const e=b?new Date(b):(nowOverride || new Date()); if(!s || Number.isNaN(s.getTime())) return 0; return Math.max(0, Math.floor((e-s)/1000)); }
function hoursBetween(a,b,nowOverride=null){ return secondsBetween(a,b,nowOverride)/3600; }
function niceDuration(seconds){ const s=Math.max(0,Math.floor(seconds||0)); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return `${h}h ${m}m ${sec}s`; }

export default function VehicleOut(){
  const { vehicles, vehicleOutActivities, addVehicleOutActivity, apiStatus, nowLocalInput, findVehicleByPlate, refreshAll } = useApp();
  const [plateSearch,setPlateSearch]=useState('');
  const [tab,setTab]=useState('out');
  const [message,setMessage]=useState('');
  const [clock,setClock]=useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setClock(new Date()),1000); return ()=>clearInterval(id); },[]);
  const [form,setForm]=useState({ vehicleId:'', invoiceNumber:'', guideName:'', quadActivity:'', tripDuration:'1 hour', customTripDuration:'', destination:'', driverName:'', startDateTime:nowLocalInput(), endDateTime:'', notes:'' });

  const suggestions = useMemo(()=>{
    const q=plateSearch.trim().toLowerCase();
    if(!q) return [];
    return vehicles.filter(v=>`${v.plate} ${v.model} ${v.vin} ${v.type}`.toLowerCase().includes(q)).slice(0,8);
  },[plateSearch,vehicles]);

  function selectVehicle(v){ setPlateSearch(v.plate); setForm(prev=>({...prev, vehicleId:v.dbId || v.id})); }
  const selectedVehicle = vehicles.find(v=>v.id===form.vehicleId || v.dbId===form.vehicleId) || findVehicleByPlate(plateSearch);

  const openTrips = useMemo(()=> vehicleOutActivities.filter(o=>!o.endDateTime), [vehicleOutActivities]);
  const selectedHistory = useMemo(()=>{
    const plate = selectedVehicle?.plate || plateSearch;
    if(!plate) return [];
    return vehicleOutActivities.filter(o=>String(o.vehicle||'').toUpperCase().includes(String(plate).toUpperCase()));
  },[vehicleOutActivities, selectedVehicle, plateSearch]);
  const totalTimes = selectedHistory.length;
  const totalSeconds = selectedHistory.reduce((s,o)=>s+secondsBetween(o.startDateTime,o.endDateTime,clock),0);
  const today = nowLocalInput().slice(0,10);
  const todaysTrips = vehicleOutActivities.filter(o => String(o.startDateTime || '').slice(0,10) === today);
  const previousTrips = vehicleOutActivities.filter(o => String(o.startDateTime || '').slice(0,10) !== today).slice(0,30);

  async function submitOut(e){
    e.preventDefault();
    const vehicle = selectedVehicle;
    if(!vehicle){ setMessage('Please select a valid vehicle from the database dropdown.'); return; }
    const tripDuration = form.tripDuration === 'manual' ? form.customTripDuration : form.tripDuration;
    await addVehicleOutActivity({ ...form, vehicleId: vehicle.dbId || vehicle.id, activityType: form.quadActivity || 'Quad Activity', tripDuration });
    setMessage(`${vehicle.plate} has been recorded OUT. Reports are available in Reports.`);
    setForm(prev=>({...prev, invoiceNumber:'', guideName:'', quadActivity:'', tripDuration:'1 hour', customTripDuration:'', destination:'', driverName:'', startDateTime:nowLocalInput(), endDateTime:'', notes:''}));
  }

  async function markIn(record){
    // Use direct API if exposed in context via backend fallback is handled by refresh after local call unavailable.
    const endDateTime = nowLocalInput();
    try {
      const { api } = await import('../services/api.js');
      await api.vehicleOut.update(record.id, { endDateTime });
      setMessage(`${record.vehicle} recorded IN at ${endDateTime.replace('T',' ')}.`);
      await refreshAll();
    } catch (err) {
      setMessage(err.message || 'Could not update vehicle in time.');
    }
  }

  return <div className="page">
    <PageHeader title="Vehicles Management System" subtitle="Record quad / vehicle OUT and IN activity with invoice, guide, activity, trip duration and exact time tracking." />

    <div className="tabs"><button className={tab==='out'?'active':''} onClick={()=>setTab('out')}>Vehicle Out</button><button className={tab==='in'?'active':''} onClick={()=>setTab('in')}>Vehicle In</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Vehicle Activity Summary</button></div>

    {message && <Card className="section-small"><div className="notice success">{message}</div></Card>}

    {tab==='out' && <Card className="section-small">
      <h2>Record Vehicle Out</h2>
      <p className="muted">Start typing a plate. Vehicles are populated directly from the database.</p>
      <form onSubmit={submitOut} className="form-grid four">
        <Field label="Search / Select Vehicle Plate"><Input list="vehicle-out-list" placeholder="Type plate" value={plateSearch} onChange={e=>{setPlateSearch(e.target.value.toUpperCase()); setForm(prev=>({...prev,vehicleId:''}));}} /><datalist id="vehicle-out-list">{vehicles.map(v=><option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist>{suggestions.length>0 && <div className="suggestion-panel">{suggestions.map(v=><button type="button" key={v.dbId || v.id} onClick={()=>selectVehicle(v)}><b>{v.plate}</b><span>{v.model || v.type}</span></button>)}</div>}</Field>
        <Field label="Invoice Number"><Input value={form.invoiceNumber} onChange={e=>setForm({...form,invoiceNumber:e.target.value})} placeholder="INV-0001" /></Field>
        <Field label="Guide Name"><Input value={form.guideName} onChange={e=>setForm({...form,guideName:e.target.value})} placeholder="Guide / staff name" /></Field>
        <Field label="Quad Activity (optional)"><Input value={form.quadActivity} onChange={e=>setForm({...form,quadActivity:e.target.value})} placeholder="Safari / Luge / Zipline support" /></Field>
        <Field label="Trip Duration"><select className="input" value={form.tripDuration} onChange={e=>setForm({...form,tripDuration:e.target.value})}><option value="1 hour">1 hour</option><option value="2 hours">2 hours</option><option value="manual">Input manually</option></select></Field>
        {form.tripDuration==='manual' && <Field label="Manual Duration"><Input value={form.customTripDuration} onChange={e=>setForm({...form,customTripDuration:e.target.value})} placeholder="e.g. 45 minutes" /></Field>}
        <Field label="Time Out"><Input type="datetime-local" value={form.startDateTime} onChange={e=>setForm({...form,startDateTime:e.target.value})} /></Field>
        <Field label="Destination / Area"><Input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} placeholder="Optional" /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional" /></Field>
        <Field label="Save"><Button>Record Vehicle Out</Button></Field>
      </form>
    </Card>}

    {tab==='in' && <Card>
      <h2>Record Vehicle In</h2>
      <p className="muted">These are vehicles currently out. Click Record In when the quad returns, then it can go out again for another activity.</p>
      <Table headers={["Vehicle", "Invoice", "Guide", "Activity", "Time Out", "Current Time Out", "Action"]}>
        {openTrips.map(o=><tr key={o.id}><td><b>{o.vehicle}</b></td><td>{o.invoiceNumber || '-'}</td><td>{o.guideName || '-'}</td><td>{o.quadActivity || o.activityType || '-'}</td><td>{fmt(o.startDateTime)}</td><td>{niceDuration(secondsBetween(o.startDateTime,null,clock))}</td><td><Button onClick={()=>markIn(o)}>Record In</Button></td></tr>)}
        {!openTrips.length && <tr><td colSpan="7">No vehicles currently out.</td></tr>}
      </Table>
    </Card>}

    {tab==='history' && <Card>
      <h2>Vehicle Activity Summary</h2>
      <div className="form-grid three"><Field label="Search Plate"><Input list="vehicle-history-list" value={plateSearch} onChange={e=>setPlateSearch(e.target.value.toUpperCase())} /><datalist id="vehicle-history-list">{vehicles.map(v=><option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist></Field><div className="metric-card"><span>Total Times Out</span><b>{totalTimes}</b></div><div className="metric-card"><span>Total Time Out</span><b>{niceDuration(totalSeconds)}</b></div></div>
      <Table headers={["Out", "In", "Vehicle", "Invoice", "Guide", "Activity", "Duration", "Total Time"]}>
        {selectedHistory.map(o=><tr key={o.id}><td>{fmt(o.startDateTime)}</td><td>{fmt(o.endDateTime)}</td><td><b>{o.vehicle}</b></td><td>{o.invoiceNumber || '-'}</td><td>{o.guideName || '-'}</td><td>{o.quadActivity || o.activityType || '-'}</td><td>{o.tripDuration || '-'}</td><td>{niceDuration(secondsBetween(o.startDateTime,o.endDateTime,clock))}</td></tr>)}
        {!selectedHistory.length && <tr><td colSpan="8">Search/select a vehicle to see activity history.</td></tr>}
      </Table>
      <p className="muted">CSV, Excel and PDF extraction is available in the Reports page.</p>
    </Card>}
    <Card className="section-small"><h2>Today's Vehicle Activity</h2><Table headers={["Out","In","Vehicle","Invoice","Guide","Activity","Time Out"]}>{todaysTrips.map(r=><tr key={r.id}><td>{fmt(r.startDateTime)}</td><td>{fmt(r.endDateTime)}</td><td><b>{r.vehicle}</b></td><td>{r.invoiceNumber || '-'}</td><td>{r.guideName || '-'}</td><td>{r.quadActivity || r.activityType || '-'}</td><td>{niceDuration(secondsBetween(r.startDateTime,r.endDateTime,clock))}</td></tr>)}{!todaysTrips.length && <tr><td colSpan="7">No vehicle activity today.</td></tr>}</Table></Card>
    <Card className="section-small"><h2>Previous Vehicle Activity</h2><Table headers={["Out","In","Vehicle","Invoice","Guide","Activity","Time Out"]}>{previousTrips.map(r=><tr key={r.id}><td>{fmt(r.startDateTime)}</td><td>{fmt(r.endDateTime)}</td><td><b>{r.vehicle}</b></td><td>{r.invoiceNumber || '-'}</td><td>{r.guideName || '-'}</td><td>{r.quadActivity || r.activityType || '-'}</td><td>{niceDuration(secondsBetween(r.startDateTime,r.endDateTime,clock))}</td></tr>)}{!previousTrips.length && <tr><td colSpan="7">No previous records yet.</td></tr>}</Table></Card>
  </div>;
}
