import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime, secondsBetween, durationLabel, todayInput, mauritiusNowDate } from '../utils/time.js';

const BIKING_TYPES = ['Quad', 'Quad Single', 'Quad Double', 'Buggy', 'Buggy VIP 2PAX', 'Buggy VIP 4PAX'];
const OUT_ROUTES = ['Adventure', 'Discovery'];
function fmt(v){ return formatDateTime(v, false); }
function norm(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function dateKey(v){ return String(v||'').slice(0,10); }
function safeId(){ return `TT-${Date.now()}-${Math.random().toString(16).slice(2,8)}`; }
function parsePlannedSeconds(value){
  const s=String(value||'').toLowerCase();
  const h=(s.match(/(\d+(?:\.\d+)?)\s*h/)||[])[1];
  const m=(s.match(/(\d+(?:\.\d+)?)\s*m/)||[])[1];
  const sec=(s.match(/(\d+(?:\.\d+)?)\s*s/)||[])[1];
  if(h||m||sec) return Math.round(Number(h||0)*3600+Number(m||0)*60+Number(sec||0));
  const n=Number(s.replace(/[^0-9.]/g,''));
  return n>0 ? Math.round(n*60) : 0;
}
function vehicleTypeOf(record, vehicles){ const p=norm(record.vehicle||record.vehiclePlate||''); const v=vehicles.find(x=>norm(x.plate)===p || x.id===record.vehicleId || x.dbId===record.vehicleId); return v?.type || v?.vehicleType || v?.model || 'Unknown'; }
function vehicleForPlate(vehicles, plate){ return vehicles.find(v=>norm(v.plate)===norm(plate) || norm(v.plateNumber)===norm(plate)); }
function exportRows(rows){ import('xlsx').then(XLSX=>{ const data=rows.length?rows:[{note:'No data'}]; const ws=XLSX.utils.json_to_sheet(data); ws['!cols']=Object.keys(data[0]).map(k=>({wch:Math.max(16,k.length+4)})); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Vehicle Activity'); XLSX.writeFile(wb,'vehicle-activity-report.xlsx'); }); }

export default function VehicleOut(){
  const { vehicles, vehicleOutActivities, addVehicleOutActivity, nowLocalInput, findVehicleByPlate, refreshAll } = useApp();
  const [tab,setTab]=useState('test-track');
  const [clock,setClock]=useState(mauritiusNowDate());
  const [msg,setMsg]=useState('');
  const [pending,setPending]=useState(()=>{ try{return JSON.parse(localStorage.getItem('valle-test-track-queue')||'[]')}catch{return []} });
  const [editingId,setEditingId]=useState('');
  const [edit,setEdit]=useState({});
  const [track,setTrack]=useState({ invoiceNumber:'', guideName:'', bikingVehicleType:'Quad', testFinishTime: nowLocalInput(), notes:'' });

  useEffect(()=>{ const id=setInterval(()=>setClock(mauritiusNowDate()),1000); return ()=>clearInterval(id); },[]);
  useEffect(()=>localStorage.setItem('valle-test-track-queue',JSON.stringify(pending)),[pending]);
  const today=todayInput();
  const todaysTrips=useMemo(()=>vehicleOutActivities.filter(o=>dateKey(o.startDateTime)===today).sort((a,b)=>String(b.startDateTime||'').localeCompare(String(a.startDateTime||''))),[vehicleOutActivities,today]);
  const todayActive=useMemo(()=>todaysTrips.filter(o=>!o.endDateTime),[todaysTrips]);
  const openTrips = useMemo(()=>vehicleOutActivities.filter(o=>!o.endDateTime).sort((a,b)=>String(b.startDateTime||'').localeCompare(String(a.startDateTime||''))),[vehicleOutActivities]);
  const totals=useMemo(()=>{ const out=todaysTrips.length; const inCount=todaysTrips.filter(x=>x.endDateTime).length; const active=todayActive.length; const sec=todaysTrips.reduce((s,o)=>s+secondsBetween(o.startDateTime,o.endDateTime,clock),0); return {out,inCount,active,sec}; },[todaysTrips,todayActive,clock]);
  const byType=useMemo(()=>{ const map={}; todaysTrips.forEach(o=>{ const t=o.bikingVehicleType||o.quadActivity||o.activityType||'Unknown'; map[t]=(map[t]||0)+1; }); return Object.entries(map).map(([type,count])=>({type,count})); },[todaysTrips]);
  const timeline=useMemo(()=>{ const map={}; vehicleOutActivities.forEach(o=>{ const k=dateKey(o.startDateTime); if(!k)return; map[k]=map[k]||{date:k,OUT:0,IN:0}; map[k].OUT++; if(o.endDateTime)map[k].IN++; }); return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date)); },[vehicleOutActivities]);
  const estimatedOut=useMemo(()=>openTrips.map(o=>{ const planned=parsePlannedSeconds(o.tripDuration); const elapsed=secondsBetween(o.startDateTime,null,clock); return {...o, plannedSeconds:planned, elapsedSeconds:elapsed, remainingSeconds:planned?Math.max(0,planned-elapsed):0}; }),[openTrips,clock]);
  const reportRows=useMemo(()=>vehicleOutActivities.map(o=>({outTime:fmt(o.startDateTime), inTime:o.endDateTime?fmt(o.endDateTime):'Still out', plate:o.vehicle, vehicleType:vehicleTypeOf(o,vehicles), invoice:o.invoiceNumber||'', guide:o.guideName||'', bikingVehicleType:o.bikingVehicleType||o.quadActivity||o.activityType||'', route:o.destinationRoute||o.destination||'', plannedDuration:o.tripDuration||'', actualDuration:durationLabel(secondsBetween(o.startDateTime,o.endDateTime,clock)), status:o.endDateTime?'IN':'OUT'})),[vehicleOutActivities,vehicles,clock]);

  function addTestTrack(e){
    e.preventDefault();
    const row={ id:safeId(), createdAt:nowLocalInput(), testStartedAt:nowLocalInput(), testFinishTime: track.testFinishTime || nowLocalInput(), invoiceNumber:track.invoiceNumber, guideName:track.guideName, bikingVehicleType:track.bikingVehicleType || 'Quad', destinationRoute:'Test Track', tripDuration:'', driverName:'', notes:track.notes||'', vehicle:'', vehicleId:'', vehicleType:'' };
    setPending(p=>[row,...p]);
    setTrack(prev=>({...prev, invoiceNumber:'', guideName:'', testFinishTime: nowLocalInput(), notes:''}));
    setMsg('Test Track saved. Edit the row in Vehicle Out to select plate, route and final details, then Record Out.');
    setTab('out');
  }
  function startEdit(row){ setEditingId(row.id); setEdit({...row, destinationRoute: OUT_ROUTES.includes(row.destinationRoute) ? row.destinationRoute : 'Adventure'}); }
  function editVehicleSuggestions(){ const q=String(edit.vehicle||'').toLowerCase().trim(); if(!q) return []; if(vehicles.some(v=>norm(v.plate)===norm(q))) return []; return vehicles.filter(v=>`${v.plate} ${v.model} ${v.type} ${v.vin}`.toLowerCase().includes(q)).slice(0,8); }
  function selectEditVehicle(v){ setEdit({...edit, vehicle:v.plate, vehicleId:v.dbId||v.id, vehicleType:v.type||v.model||''}); }
  function saveEdit(){ const selected=vehicleForPlate(vehicles, edit.vehicle) || findVehicleByPlate(edit.vehicle); setPending(p=>p.map(r=>r.id===editingId?{...r,...edit, vehicleId:selected?.dbId||selected?.id||edit.vehicleId, vehicle:selected?.plate||edit.vehicle, vehicleType:selected?.type||selected?.model||edit.vehicleType}:r)); setEditingId(''); setEdit({}); setMsg('Vehicle Out row updated. Click Record Out when the vehicle leaves for the real activity.'); }
  async function recordOut(row){ const vehicle=vehicleForPlate(vehicles,row.vehicle) || vehicles.find(v=>v.id===row.vehicleId||v.dbId===row.vehicleId); if(!vehicle){ setMsg('Cannot record OUT: edit the row and select a valid vehicle plate from DB first.'); startEdit(row); return; } await addVehicleOutActivity({ vehicleId:vehicle.dbId||vehicle.id, invoiceNumber:row.invoiceNumber, guideName:row.guideName, bikingVehicleType:row.bikingVehicleType||'Quad', quadActivity:row.bikingVehicleType||'Quad', destinationRoute:OUT_ROUTES.includes(row.destinationRoute)?row.destinationRoute:'Adventure', destination:OUT_ROUTES.includes(row.destinationRoute)?row.destinationRoute:'Adventure', tripDuration:row.tripDuration || durationLabel(secondsBetween(row.testStartedAt,row.testFinishTime)), driverName:row.driverName, notes:`Test Track started: ${fmt(row.testStartedAt)} | Testing finish: ${fmt(row.testFinishTime)} | ${row.notes||''}` }); setPending(p=>p.filter(x=>x.id!==row.id)); setMsg(`Vehicle OUT recorded for ${vehicle.plate}. Official OUT time is exact backend time at Record Out.`); setTab('in'); await refreshAll(); }
  async function markIn(row){ await api.vehicleOut.update(row.id, { recordIn:true }); await refreshAll(); setMsg(`Vehicle IN recorded for ${row.vehicle}. Exact total time is updated.`); }

  return <div className="page vehicle-out-page professional-vehicle-flow">
    <PageHeader title="Vehicles Management System" subtitle="Test Track first, then official Vehicle OUT, Vehicle IN, summary, report and live remaining time." />
    {msg && <div className="notice success">{msg}</div>}
    <div className="tabs"><button className={tab==='test-track'?'active':''} onClick={()=>setTab('test-track')}>Test Track</button><button className={tab==='out'?'active':''} onClick={()=>setTab('out')}>Vehicle Out</button><button className={tab==='in'?'active':''} onClick={()=>setTab('in')}>Vehicle In</button><button className={tab==='summary'?'active':''} onClick={()=>setTab('summary')}>Vehicle Activity Summary</button></div>
    <div className="vehicle-today-card-row section-small"><Card className="metric-card"><span>Today Test Track Waiting</span><b>{pending.length}</b><small>Rows ready for Record Out</small></Card><Card className="metric-card"><span>Vehicles Out Today</span><b>{totals.out}</b><small>Only today's official OUT</small></Card><Card className="metric-card"><span>Vehicles In Today</span><b>{totals.inCount}</b><small>Returned today</small></Card><Card className="metric-card"><span>Currently Out</span><b>{totals.active}</b><small>Need Record In</small></Card><Card className="metric-card"><span>Time Out Today</span><b>{durationLabel(totals.sec)}</b><small>Total actual time today</small></Card></div>

    {tab==='test-track' && <Card><h2>Test Track Form</h2><p className="muted">No plate required here. Save each test track row; the vehicle plate and final route are completed in the Vehicle Out table before official Record Out.</p><form onSubmit={addTestTrack} className="form-grid four">
      <Field label="Invoice Number"><Input value={track.invoiceNumber} onChange={e=>setTrack({...track,invoiceNumber:e.target.value})}/></Field>
      <Field label="Guide Name"><Input value={track.guideName} onChange={e=>setTrack({...track,guideName:e.target.value})}/></Field>
      <Field label="Biking Vehicle Type"><select className="input" value={track.bikingVehicleType} onChange={e=>setTrack({...track,bikingVehicleType:e.target.value})}>{BIKING_TYPES.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Testing Finish Time"><Input type="datetime-local" value={track.testFinishTime} onChange={e=>setTrack({...track,testFinishTime:e.target.value})}/></Field>
      <Field label="Destination"><Input value="Test Track" readOnly /></Field>
      <Field label="Notes"><Input value={track.notes} onChange={e=>setTrack({...track,notes:e.target.value})}/></Field>
      <Field label="Save"><Button>Save Test Track Row</Button></Field>
    </form></Card>}

    {tab==='out' && <Card><div className="card-head"><div><h2>Vehicle Out - Test Track Rows Ready</h2><p>Click Edit, select the plate from DB, choose Adventure/Discovery route, then Record Out. Official Time Out is locked by the backend at click.</p></div></div><Table headers={["Test Finish", "Plate", "Vehicle Type", "Invoice", "Guide", "Biking Type", "Route", "Testing Duration", "Action"]}>{pending.map(row=>{
      const testDuration=durationLabel(secondsBetween(row.testStartedAt,row.testFinishTime));
      const sug=editingId===row.id?editVehicleSuggestions():[];
      return editingId===row.id?<tr key={row.id} className="editing-row"><td>{fmt(edit.testFinishTime)}</td><td className="plate-edit-cell"><Input value={edit.vehicle||''} onChange={e=>setEdit({...edit,vehicle:e.target.value.toUpperCase(),vehicleId:''})} placeholder="Type plate" />{sug.length>0 && <div className="suggestion-panel professional-suggestion-panel table-suggestion-panel">{sug.map(v=><button type="button" key={v.dbId||v.id} onClick={()=>selectEditVehicle(v)}><b>{v.plate}</b><span>{v.type} {v.model}</span></button>)}</div>}</td><td>{edit.vehicleType||vehicleTypeOf(edit,vehicles)||'-'}</td><td><Input value={edit.invoiceNumber||''} onChange={e=>setEdit({...edit,invoiceNumber:e.target.value})}/></td><td><Input value={edit.guideName||''} onChange={e=>setEdit({...edit,guideName:e.target.value})}/></td><td><select className="input" value={edit.bikingVehicleType||'Quad'} onChange={e=>setEdit({...edit,bikingVehicleType:e.target.value})}>{BIKING_TYPES.map(x=><option key={x}>{x}</option>)}</select></td><td><select className="input" value={edit.destinationRoute||'Adventure'} onChange={e=>setEdit({...edit,destinationRoute:e.target.value})}>{OUT_ROUTES.map(x=><option key={x}>{x}</option>)}</select></td><td><b>{testDuration}</b></td><td><Button onClick={saveEdit}>Save</Button></td></tr>:<tr key={row.id} onClick={()=>startEdit(row)}><td>{fmt(row.testFinishTime)}</td><td><b>{row.vehicle||'Plate pending'}</b></td><td>{row.vehicleType||'-'}</td><td>{row.invoiceNumber||'-'}</td><td>{row.guideName||'-'}</td><td>{row.bikingVehicleType}</td><td>{OUT_ROUTES.includes(row.destinationRoute)?row.destinationRoute:'Route pending'}</td><td><b>{testDuration}</b></td><td><Button onClick={(e)=>{e.stopPropagation();startEdit(row);}}>Edit</Button> <Button onClick={(e)=>{e.stopPropagation();recordOut(row);}}>Record Out</Button></td></tr>})}{!pending.length && <tr><td colSpan="9">No Test Track rows waiting. Add from Test Track tab.</td></tr>}</Table></Card>}

    {tab==='in' && <Card><h2>Vehicle In - Currently Out</h2><Table headers={["Time Out", "Vehicle", "Invoice", "Guide", "Biking Type", "Route", "Planned", "Elapsed", "Remaining", "Action"]}>{estimatedOut.map(o=><tr key={o.id}><td>{fmt(o.startDateTime)}</td><td><b>{o.vehicle}</b></td><td>{o.invoiceNumber||'-'}</td><td>{o.guideName||'-'}</td><td>{o.bikingVehicleType||o.quadActivity||o.activityType||'-'}</td><td>{o.destinationRoute||o.destination||'-'}</td><td>{o.tripDuration||'-'}</td><td>{durationLabel(o.elapsedSeconds)}</td><td><b>{o.plannedSeconds?durationLabel(o.remainingSeconds):'No estimate'}</b></td><td><Button onClick={()=>markIn(o)}>Record In</Button></td></tr>)}{!openTrips.length && <tr><td colSpan="10">No vehicles currently out.</td></tr>}</Table></Card>}

    {tab==='summary' && <Card><div className="card-head"><div><h2>Vehicle Activity Summary & Reports</h2><p>Official OUT/IN records with type, guide, route, planned duration, exact elapsed time and remaining time for active vehicles.</p></div><Button onClick={()=>exportRows(reportRows)}>Export XLSX</Button></div><div className="vehicle-analytics-grid section-small"><Card className="chart-card"><h2>OUT / IN Timeline</h2><div className="chart-box">{timeline.length?<ResponsiveContainer width="100%" height="100%"><LineChart data={timeline}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line dataKey="OUT" stroke="#6f3cff" strokeWidth={3}/><Line dataKey="IN" stroke="#24f66f" strokeWidth={3}/></LineChart></ResponsiveContainer>:<div className="empty-chart">No data</div>}</div></Card><Card className="chart-card"><h2>Today Activity by Type</h2><div className="chart-box">{byType.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={byType}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="type"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#6f3cff"/></BarChart></ResponsiveContainer>:<div className="empty-chart">No data</div>}</div></Card></div><Table headers={["Out", "In", "Plate", "Vehicle Type", "Invoice", "Guide", "Biking Type", "Route", "Planned", "Actual", "Status"]}>{reportRows.map((r,i)=><tr key={i}><td>{r.outTime}</td><td>{r.inTime}</td><td><b>{r.plate}</b></td><td>{r.vehicleType}</td><td>{r.invoice}</td><td>{r.guide}</td><td>{r.bikingVehicleType}</td><td>{r.route}</td><td>{r.plannedDuration}</td><td>{r.actualDuration}</td><td>{r.status}</td></tr>)}{!reportRows.length && <tr><td colSpan="11">No vehicle activity yet.</td></tr>}</Table></Card>}

    {tab!=='summary' && <Card className="section-small"><h2>Today's Confirmed OUT / IN Records</h2><Table headers={["Out", "In", "Vehicle", "Guide", "Type", "Route", "Actual Time"]}>{todaysTrips.map(o=><tr key={o.id}><td>{fmt(o.startDateTime)}</td><td>{o.endDateTime?fmt(o.endDateTime):'Still out'}</td><td><b>{o.vehicle}</b></td><td>{o.guideName||'-'}</td><td>{o.bikingVehicleType||o.quadActivity||o.activityType||'-'}</td><td>{o.destinationRoute||o.destination||'-'}</td><td>{durationLabel(secondsBetween(o.startDateTime,o.endDateTime,clock))}</td></tr>)}{!todaysTrips.length && <tr><td colSpan="7">No confirmed vehicle activity today.</td></tr>}</Table></Card>}
  </div>;
}
