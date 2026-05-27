import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function n(v){ return Number(v || 0); }
function money(v){ return `MUR ${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmt(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function hBetween(a,b){ const s=a?new Date(a):null; const e=b?new Date(b):new Date(); if(!s || Number.isNaN(s)) return 0; return Math.max(0,(e-s)/36e5); }
function niceHours(h){ const hrs=Math.floor(h); const mins=Math.round((h-hrs)*60); return `${hrs}h ${mins}m`; }
function csv(rows){ return rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); }
function download(name, text, type='text/csv;charset=utf-8'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function printPdf(title){ const old=document.title; document.title=title; window.print(); setTimeout(()=>{document.title=old;},500); }
function periodOk(date, filter){
  if(!date) return false;
  const d=new Date(date); if(Number.isNaN(d.getTime())) return false;
  const now=new Date(); let start=null; let end=null;
  if(filter.period==='day') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(filter.period==='week') start=new Date(now.getTime()-7*24*60*60*1000);
  if(filter.period==='month') start=new Date(now.getFullYear(),now.getMonth(),1);
  if(filter.period==='year') start=new Date(now.getFullYear(),0,1);
  if(filter.from) start=new Date(filter.from+'T00:00:00');
  if(filter.to) end=new Date(filter.to+'T23:59:59');
  return (!start || d>=start) && (!end || d<=end);
}
function MiniBar({label,value,max,suffix=''}){ const pct=max?Math.min(100,(value/max)*100):0; return <div className="mini-bar"><div><b>{label}</b><span>{Number(value).toLocaleString()}{suffix}</span></div><i><em style={{width:`${pct}%`}} /></i></div>; }
function groupSum(rows, keyFn, valFn){ return Object.entries(rows.reduce((a,r)=>{ const k=keyFn(r)||'Unknown'; a[k]=(a[k]||0)+valFn(r); return a; },{})).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value); }

export default function Reports(){
  const { currentUser, vehicles, fuelConsumptions, vehicleOutActivities, inventory, assessments, garageOps, transactions, mechanics, exportVehicleHistory, getVehicleHistory } = useApp();
  const [filter,setFilter]=useState({ period:'month', from:'', to:'', plate:'', report:'all' });
  const [plateSearch,setPlateSearch]=useState('');

  const suggestions = useMemo(()=>{
    const q=plateSearch.trim().toLowerCase();
    if(!q) return [];
    return vehicles.filter(v=>`${v.plate} ${v.model} ${v.vin} ${v.type}`.toLowerCase().includes(q)).slice(0,10);
  },[plateSearch,vehicles]);
  const plate = filter.plate || plateSearch;
  const plateMatch = v => !plate || String(v||'').toUpperCase().includes(String(plate).toUpperCase());

  const fuelRows = useMemo(()=>fuelConsumptions.filter(f=>plateMatch(f.vehicle) && periodOk(f.recordedAt,filter)),[fuelConsumptions,filter,plate]);
  const outRows = useMemo(()=>vehicleOutActivities.filter(o=>plateMatch(o.vehicle) && periodOk(o.startDateTime,filter)),[vehicleOutActivities,filter,plate]);
  const garageRows = useMemo(()=>garageOps.filter(g=>plateMatch(g.vehicle) && periodOk(g.checkInDateTime || g.start || g.createdAt,filter)),[garageOps,filter,plate]);
  const assessmentRows = useMemo(()=>assessments.filter(a=>plateMatch(a.vehicle) && (!a.createdAt || periodOk(a.createdAt,filter))),[assessments,filter,plate]);

  const totalFuel = fuelRows.reduce((s,f)=>s+n(f.fuelLitres),0);
  const totalOutHours = outRows.reduce((s,o)=>s+hBetween(o.startDateTime,o.endDateTime),0);
  const partsCost = garageRows.reduce((s,g)=>s+(g.partsUsed||[]).reduce((x,p)=>x+n(p.qty||1)*n(p.sellingPrice||p.price||p.unitPrice),0),0);
  const lowStock = inventory.filter(i=>n(i.stock)<=n(i.reorderLevel));
  const fuelByVehicle = groupSum(fuelRows, r=>r.vehicle, r=>n(r.fuelLitres)).slice(0,10);
  const outByVehicle = groupSum(outRows, r=>r.vehicle, ()=>1).slice(0,10);
  const repairByVehicle = groupSum(garageRows, r=>r.vehicle, r=>(r.partsUsed||[]).reduce((x,p)=>x+n(p.qty||1)*n(p.sellingPrice||p.price||p.unitPrice),0)).slice(0,10);
  const mechanicHours = Object.values(garageRows.reduce((a,g)=>{ const rows=g.mechanicHours?.length?g.mechanicHours:[{mechanic:g.mechanic,hours:String(g.labor||'0').replace(/[^0-9.]/g,'')}]; rows.forEach(m=>{ const k=m.mechanic||'Unassigned'; a[k]=a[k]||{mechanic:k,hours:0,jobs:0}; a[k].hours+=n(m.hours); a[k].jobs+=1; }); return a; },{})).sort((a,b)=>b.hours-a.hours);

  const selectedHistory = plate ? getVehicleHistory(plate,{type:'all'}) : null;

  const exportRows = {
    fuel: [['Date','Vehicle','Fuel Type','Meter Type','Meter Reading','Litres','Recorded By','Notes'],...fuelRows.map(f=>[fmt(f.recordedAt),f.vehicle,f.fuelType,f.meterType,f.meterReading,f.fuelLitres,f.recordedBy,f.notes])],
    vehicleOut: [['Out','In','Vehicle','Invoice','Guide','Activity','Trip Duration','Total Time Out','Destination','Notes'],...outRows.map(o=>[fmt(o.startDateTime),fmt(o.endDateTime),o.vehicle,o.invoiceNumber,o.guideName,o.quadActivity||o.activityType,o.tripDuration,niceHours(hBetween(o.startDateTime,o.endDateTime)),o.destination,o.notes])],
    repairCost: [['Process','Vehicle','Type','Status','Mechanic','Parts Cost','Labour','Parts Used'],...garageRows.map(g=>[g.id,g.vehicle,g.type,g.status,g.mechanic,(g.partsUsed||[]).reduce((x,p)=>x+n(p.qty||1)*n(p.sellingPrice||p.price||p.unitPrice),0),g.labor,(g.partsUsed||[]).map(p=>`${p.name} x${p.qty}`).join('; ')])],
    mechanicHours: [['Mechanic','Jobs','Hours'],...mechanicHours.map(m=>[m.mechanic,m.jobs,m.hours])],
    assessments: [['Ticket','Vehicle','Mechanic','Status','Issue','Conclusion','Created'],...assessmentRows.map(a=>[a.id,a.vehicle,a.mechanic,a.status,a.issue,a.conclusion,a.createdAt])],
    inventoryRisk: [['SKU','Part','Stock','Reorder Level','Supplier','Selling Price'],...lowStock.map(i=>[i.sku,i.name,i.stock,i.reorderLevel,i.supplier,i.lastPrice])]
  };
  function exportCsv(key){ download(`valle-${key}-report.csv`, csv(exportRows[key]||[])); }
  function exportExcel(key){ download(`valle-${key}-report.xls`, csv(exportRows[key]||[]), 'application/vnd.ms-excel;charset=utf-8'); }

  const canSeeAll = currentUser?.role === 'admin' || currentUser?.role === 'store';
  const canSeeFuel = canSeeAll || currentUser?.role === 'fuel';
  const canSeeVehicle = canSeeAll || currentUser?.role === 'vehicle_manager';

  return <div className="page report-page">
    <PageHeader title="Advanced Reports & Analytics" subtitle="Extract accurate operational reports from database records: fuel, vehicle in/out, quad activity, parts, repair cost, assessment and mechanic productivity." />

    <Card className="section-small report-filters">
      <h2>Report Filters</h2>
      <div className="form-grid five">
        <Field label="Report Area"><select className="input" value={filter.report} onChange={e=>setFilter({...filter,report:e.target.value})}><option value="all">All Available Reports</option>{canSeeFuel && <option value="fuel">Fuel Report</option>}{canSeeVehicle && <option value="vehicleOut">Vehicle In / Out Report</option>}{canSeeAll && <option value="repairCost">Repair Cost</option>}{canSeeAll && <option value="mechanicHours">Mechanic Hours</option>}{canSeeAll && <option value="inventoryRisk">Inventory Risk</option>}</select></Field>
        <Field label="Period"><select className="input" value={filter.period} onChange={e=>setFilter({...filter,period:e.target.value,from:'',to:''})}><option value="day">Today</option><option value="week">Last 7 Days</option><option value="month">This Month</option><option value="year">This Year</option><option value="manual">Manual Range</option></select></Field>
        <Field label="From"><Input type="date" value={filter.from} onChange={e=>setFilter({...filter,from:e.target.value,period:'manual'})}/></Field>
        <Field label="To"><Input type="date" value={filter.to} onChange={e=>setFilter({...filter,to:e.target.value,period:'manual'})}/></Field>
        <Field label="Search Vehicle Plate"><Input list="report-vehicle-list" placeholder="Type plate" value={plateSearch} onChange={e=>{setPlateSearch(e.target.value.toUpperCase()); setFilter({...filter,plate:''});}}/><datalist id="report-vehicle-list">{vehicles.map(v=><option key={v.dbId||v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist>{suggestions.length>0 && <div className="suggestion-panel">{suggestions.map(v=><button type="button" key={v.dbId||v.id} onClick={()=>{setPlateSearch(v.plate); setFilter({...filter,plate:v.plate});}}><b>{v.plate}</b><span>{v.model || v.type}</span></button>)}</div>}</Field>
      </div>
    </Card>

    <div className="stats-grid analytics-grid">
      {canSeeFuel && <Card className="metric-card"><span>Total Fuel</span><b>{totalFuel.toLocaleString()} L</b><small>Filtered fuel usage</small></Card>}
      {canSeeVehicle && <Card className="metric-card"><span>Times Out</span><b>{outRows.length}</b><small>Filtered vehicle activities</small></Card>}
      {canSeeVehicle && <Card className="metric-card"><span>Total Time Out</span><b>{niceHours(totalOutHours)}</b><small>Out/in duration</small></Card>}
      {canSeeAll && <Card className="metric-card"><span>Repair Parts Cost</span><b>{money(partsCost)}</b><small>Filtered repair cost</small></Card>}
      {canSeeAll && <Card className="metric-card"><span>Assessments</span><b>{assessmentRows.length}</b><small>Garage assessment records</small></Card>}
      {canSeeAll && <Card className="metric-card"><span>Low Stock Risk</span><b>{lowStock.length}</b><small>Items at reorder level</small></Card>}
    </div>

    <div className="report-grid">
      {canSeeFuel && <Card><h2>Fuel Usage by Vehicle</h2>{fuelByVehicle.map(x=><MiniBar key={x.label} label={x.label} value={x.value} max={Math.max(...fuelByVehicle.map(y=>y.value),1)} suffix=" L"/>)}{!fuelByVehicle.length && <p>No fuel records for filter.</p>}</Card>}
      {canSeeVehicle && <Card><h2>Vehicle Out Frequency</h2>{outByVehicle.map(x=><MiniBar key={x.label} label={x.label} value={x.value} max={Math.max(...outByVehicle.map(y=>y.value),1)} />)}{!outByVehicle.length && <p>No vehicle out records for filter.</p>}</Card>}
      {canSeeAll && <Card><h2>Repair Cost by Vehicle</h2>{repairByVehicle.map(x=><MiniBar key={x.label} label={x.label} value={x.value} max={Math.max(...repairByVehicle.map(y=>y.value),1)} />)}{!repairByVehicle.length && <p>No repair cost records.</p>}</Card>}
      {canSeeAll && <Card><h2>Mechanic Productivity</h2>{mechanicHours.map(x=><MiniBar key={x.mechanic} label={`${x.mechanic} (${x.jobs} job)`} value={x.hours} max={Math.max(...mechanicHours.map(y=>y.hours),1)} suffix=" hrs"/>)}{!mechanicHours.length && <p>No mechanic hours recorded.</p>}</Card>}
    </div>

    {canSeeFuel && <Card className="section-small"><h2>Fuel Report Extract</h2><div className="report-actions"><Button onClick={()=>exportCsv('fuel')}>Export CSV</Button><Button variant="secondary" onClick={()=>exportExcel('fuel')}>Export Excel</Button><Button variant="secondary" onClick={()=>printPdf('Fuel Report')}>PDF / Print</Button></div><Table headers={["Date","Vehicle","Fuel","Meter","Litres","Recorded By"]}>{fuelRows.map(r=><tr key={r.id}><td>{fmt(r.recordedAt)}</td><td><b>{r.vehicle}</b></td><td>{r.fuelType}</td><td>{r.meterReading} {r.meterType}</td><td><b>{r.fuelLitres} L</b></td><td>{r.recordedBy || '-'}</td></tr>)}{!fuelRows.length && <tr><td colSpan="6">No fuel data for selected filter.</td></tr>}</Table></Card>}

    {canSeeVehicle && <Card className="section-small"><h2>Vehicle In / Out Report Extract</h2><div className="report-actions"><Button onClick={()=>exportCsv('vehicleOut')}>Export CSV</Button><Button variant="secondary" onClick={()=>exportExcel('vehicleOut')}>Export Excel</Button><Button variant="secondary" onClick={()=>printPdf('Vehicle In Out Report')}>PDF / Print</Button></div><Table headers={["Out","In","Vehicle","Invoice","Guide","Activity","Duration","Total Time"]}>{outRows.map(r=><tr key={r.id}><td>{fmt(r.startDateTime)}</td><td>{fmt(r.endDateTime)}</td><td><b>{r.vehicle}</b></td><td>{r.invoiceNumber || '-'}</td><td>{r.guideName || '-'}</td><td>{r.quadActivity || r.activityType || '-'}</td><td>{r.tripDuration || '-'}</td><td><b>{niceHours(hBetween(r.startDateTime,r.endDateTime))}</b></td></tr>)}{!outRows.length && <tr><td colSpan="8">No vehicle activity for selected filter.</td></tr>}</Table></Card>}

    {canSeeAll && <div className="report-grid">
      <Card><h2>Repair Cost Extract</h2><p>{garageRows.length} garage operations • {money(partsCost)}</p><Button onClick={()=>exportCsv('repairCost')}>CSV</Button> <Button variant="secondary" onClick={()=>exportExcel('repairCost')}>Excel</Button> <Button variant="secondary" onClick={()=>printPdf('Repair Cost Report')}>PDF</Button></Card>
      <Card><h2>Mechanic Timesheet Extract</h2><p>{mechanicHours.length} mechanics with recorded hours.</p><Button onClick={()=>exportCsv('mechanicHours')}>CSV</Button> <Button variant="secondary" onClick={()=>exportExcel('mechanicHours')}>Excel</Button> <Button variant="secondary" onClick={()=>printPdf('Mechanic Timesheet')}>PDF</Button></Card>
      <Card><h2>Inventory Risk Extract</h2><p>{lowStock.length} item(s) at or below reorder level.</p><Button onClick={()=>exportCsv('inventoryRisk')}>CSV</Button> <Button variant="secondary" onClick={()=>exportExcel('inventoryRisk')}>Excel</Button> <Button variant="secondary" onClick={()=>printPdf('Inventory Risk Report')}>PDF</Button></Card>
      <Card><h2>Assessment Extract</h2><p>{assessmentRows.length} assessments.</p><Button onClick={()=>exportCsv('assessments')}>CSV</Button> <Button variant="secondary" onClick={()=>exportExcel('assessments')}>Excel</Button> <Button variant="secondary" onClick={()=>printPdf('Assessment Report')}>PDF</Button></Card>
    </div>}

    {selectedHistory?.vehicle && <Card className="section-small"><h2>Vehicle Story Summary: {selectedHistory.vehicle.plate}</h2><div className="stats-grid"><div><span>Fuel Filled</span><b>{n(selectedHistory.totalFuelLitres).toLocaleString()} L</b></div><div><span>Times Out</span><b>{selectedHistory.outCount}</b></div><div><span>Garage Visits</span><b>{selectedHistory.visits}</b></div><div><span>Parts Used</span><b>{selectedHistory.parts.reduce((s,p)=>s+n(p.qty||1),0)}</b></div></div><div className="report-actions"><Button variant="secondary" onClick={()=>exportVehicleHistory(selectedHistory.vehicle.plate,{type:'all'},'csv')}>Export Full Vehicle CSV</Button><Button variant="secondary" onClick={()=>exportVehicleHistory(selectedHistory.vehicle.plate,{type:'all'},'excel')}>Export Full Vehicle Excel</Button></div></Card>}
  </div>;
}
