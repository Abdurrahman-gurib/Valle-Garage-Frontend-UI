import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function n(v){ return Number(v || 0); }
function money(v){ return `MUR ${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmt(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function ym(v){ const d = v ? new Date(v) : new Date(); return Number.isNaN(d.getTime()) ? 'Unknown' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function day(v){ return v ? String(v).slice(0,10) : ''; }
function hoursBetween(a,b){ const s=a?new Date(a):null; const e=b?new Date(b):new Date(); return s && !Number.isNaN(s.getTime()) ? Math.max(0,(e-s)/36e5) : 0; }
function csv(rows){ return rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); }
function download(name, text, type='text/csv;charset=utf-8'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function printPdf(title){ const old=document.title; document.title=title; window.print(); setTimeout(()=>{document.title=old;},300); }
function periodOk(value, f){
  if(!value) return true;
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return true;
  const now = new Date();
  let start = null;
  let end = null;
  if(f.period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if(f.period === 'week') start = new Date(now.getTime() - 7 * 86400000);
  if(f.period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if(f.period === 'year') start = new Date(now.getFullYear(), 0, 1);
  if(f.from) start = new Date(`${f.from}T00:00:00`);
  if(f.to) end = new Date(`${f.to}T23:59:59`);
  return (!start || d >= start) && (!end || d <= end);
}
function group(rows, key, val=()=>1){
  return Object.entries(rows.reduce((a,r)=>{ const k=key(r)||'Unknown'; a[k]=(a[k]||0)+val(r); return a; },{}))
    .map(([label,value])=>({label,value:Number(value||0)}))
    .sort((a,b)=>b.value-a.value);
}
function partCost(p){ return n(p?.lineTotal) || n(p?.qty || p?.quantity || 1) * n(p?.sellingPrice || p?.price || p?.lastPrice || 0); }
function partName(p){ return p?.name || p?.partName || p?.part || p?.sku || 'Manual Part'; }
function shortRows(rows, limit=10){ return (rows || []).slice(0,limit).map(r=>({ ...r, short: String(r.label).length > 12 ? `${String(r.label).slice(0,12)}…` : r.label })); }

const COLORS = ['#24f66f', '#6f3cff', '#ff315f', '#ffd84d', '#2b0048', '#2bb7ff'];

function Kpi({ label, value, note, tone='neutral', onClick }){
  return <Card onClick={onClick} className={`metric-card report-kpi kpi-${tone} ${onClick ? 'clickable-chart' : ''}`}>
    <span>{label}</span>
    <b>{value}</b>
    <small>{note}</small>
  </Card>;
}
function ChartCard({ title, subtitle, badge, tone='neutral', children }){
  return <Card className="chart-card live-chart-card">
    <div className="card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{badge && <Badge tone={tone}>{badge}</Badge>}</div>
    <div className="chart-box interactive-chart-box">{children}</div>
  </Card>;
}
function EmptyChart({ text='No data for selected filters.' }){ return <div className="empty-chart"><span>{text}</span></div>; }
function BarList({ rows, suffix='', cost=false, onSelect }){
  const max = Math.max(...rows.map(x=>n(x.value)), 1);
  return <div className="bar-list-chart interactive-bar-list">{rows.map((x,i)=><button key={`${x.label}-${i}`} type="button" className="bar-list-row" onClick={()=>onSelect?.(x.label)} title={`Click to filter by ${x.label}`}>
    <div className="bar-list-meta"><b>{x.label}</b><span>{cost ? money(x.value) : `${n(x.value).toLocaleString()}${suffix}`}</span></div>
    <div className="bar-list-track"><em style={{width:`${Math.min(100,n(x.value)/max*100)}%`}} /></div>
  </button>)}</div>;
}
function Donut({ rows, onSelect }){
  if(!rows.length) return <EmptyChart />;
  return <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={rows} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={3} onClick={(d)=>onSelect?.(d?.label)}>
        {rows.map((_, index)=><Cell key={index} fill={COLORS[index % COLORS.length]} className="interactive-chart-slice" />)}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>;
}

export default function Reports(){
  const {
    currentUser,
    inventory,
    assessments,
    garageOps,
    fuelConsumptions,
    vehicleOutActivities,
    mechanics,
    notify,
  } = useApp();
  const role = currentUser?.role || '';
  const isAdmin = role === 'admin';
  const isFuelOnly = role === 'fuel';
  const isVehicleOnly = role === 'vehicle_manager';
  const isStore = role === 'store';

  const reportOptions = useMemo(()=>{
    if(isFuelOnly) return [{value:'fuel', label:'Fuel Consumption'}];
    if(isVehicleOnly) return [{value:'vehicle', label:'Vehicle In / Out'}];
    if(isStore) return [{value:'all', label:'All Store Reports'}, {value:'assessment', label:'Assessments'}, {value:'low', label:'Low Stock'}, {value:'parts', label:'Parts Issued'}];
    return [
      {value:'all', label:'All Reports'},
      {value:'fuel', label:'Fuel Consumption'},
      {value:'vehicle', label:'Vehicle In / Out'},
      {value:'garage', label:'Garage Work'},
      {value:'assessment', label:'Assessment'},
      {value:'low', label:'Low Stock'},
      {value:'parts', label:'Parts Issued'},
    ];
  },[isFuelOnly,isVehicleOnly,isStore]);

  const defaultReport = isFuelOnly ? 'fuel' : isVehicleOnly ? 'vehicle' : 'all';
  const [draft,setDraft] = useState({ search:'', report:defaultReport, period:'month', from:'', to:'', mechanic:'', part:'' });
  const [filter,setFilter] = useState({ search:'', report:defaultReport, period:'month', from:'', to:'', mechanic:'', part:'' });
  const [applied,setApplied] = useState(false);
  const [selectedInsight,setSelectedInsight] = useState('');

  function allowedType(type){
    if(isAdmin) return true;
    if(isFuelOnly) return type === 'Fuel';
    if(isVehicleOnly) return type === 'Vehicle Out/In';
    if(isStore) return ['Assessment','Low Stock','Parts Issued'].includes(type);
    return false;
  }
  function applyReport(nextDraft=draft){
    let cleaned = { ...nextDraft };
    if(!reportOptions.some(o=>o.value === cleaned.report)) cleaned.report = reportOptions[0]?.value || defaultReport;
    setFilter(cleaned);
    setDraft(cleaned);
    setApplied(true);
  }
  function clickPlate(plate){ if(!plate || plate === '-') return; const next = { ...draft, search:plate }; applyReport(next); setSelectedInsight(`Filtered by vehicle ${plate}`); }
  function clickPart(part){ if(!part || part === '-') return; const next = { ...draft, part, report:isAdmin ? 'parts' : draft.report }; applyReport(next); setSelectedInsight(`Filtered by part ${part}`); }
  function clickReport(report){ const next = { ...draft, report }; applyReport(next); setSelectedInsight(`Filtered ${report} report`); }

  const rows = useMemo(()=>{
    const q = String(filter.search || '').toLowerCase();
    const m = String(filter.mechanic || '').toLowerCase();
    const p = String(filter.part || '').toLowerCase();
    const all = [];

    fuelConsumptions.forEach(f => all.push({
      date: f.recordedAt,
      plate: f.vehicle,
      type:'Fuel',
      fuel:n(f.fuelLitres),
      parts:'-',
      cost:0,
      mechanic:f.recordedBy || '-',
      status:'Recorded',
      source:f,
      duration:0,
    }));
    vehicleOutActivities.forEach(o => all.push({
      date:o.startDateTime,
      plate:o.vehicle,
      type:'Vehicle Out/In',
      fuel:0,
      parts:'-',
      cost:0,
      mechanic:o.guideName || o.driverName || '-',
      status:o.endDateTime?'Returned':'Out',
      source:o,
      duration:hoursBetween(o.startDateTime,o.endDateTime),
    }));
    assessments.forEach(a => {
      const parts = a.parts || [];
      all.push({
        date:a.createdAt,
        plate:a.vehicle,
        type:'Assessment',
        fuel:0,
        parts:parts.map(x=>`${partName(x)} x${x.qty || 1}`).join(', ') || '-',
        cost:parts.reduce((s,x)=>s+partCost(x),0),
        mechanic:a.mechanic || '-',
        status:a.status,
        source:a,
        duration:0,
      });
      parts.forEach(x => all.push({
        date:a.createdAt,
        plate:a.vehicle,
        type:'Parts Issued',
        fuel:0,
        parts:`${partName(x)} x${x.qty || 1}`,
        cost:partCost(x),
        mechanic:a.mechanic || '-',
        status:a.status,
        source:x,
        duration:0,
      }));
    });
    garageOps.forEach(g => {
      const parts = g.partsUsed || [];
      all.push({
        date:g.start || g.checkInDateTime || g.createdAt,
        plate:g.vehicle,
        type:'Garage Work',
        fuel:0,
        parts:parts.map(x=>`${partName(x)} x${x.qty || 1}`).join(', ') || '-',
        cost:parts.reduce((s,x)=>s+partCost(x),0),
        mechanic:g.mechanic || '-',
        status:g.status,
        source:g,
        duration:hoursBetween(g.start || g.checkInDateTime, g.end),
      });
      parts.forEach(x => all.push({
        date:g.start || g.checkInDateTime || g.createdAt,
        plate:g.vehicle,
        type:'Parts Issued',
        fuel:0,
        parts:`${partName(x)} x${x.qty || 1}`,
        cost:partCost(x),
        mechanic:g.mechanic || '-',
        status:g.status,
        source:x,
        duration:0,
      }));
    });
    inventory.filter(i=>n(i.stock)<=n(i.reorderLevel)).forEach(i => all.push({
      date:new Date().toISOString(),
      plate:'-',
      type:'Low Stock',
      fuel:0,
      parts:i.name,
      cost:n(i.stock)*n(i.lastPrice),
      mechanic:'Store Keeper',
      status:`${i.stock}/${i.reorderLevel}`,
      source:i,
      duration:0,
    }));

    return all.filter(r =>
      allowedType(r.type) &&
      (!q || `${r.plate} ${r.type} ${r.parts} ${r.status}`.toLowerCase().includes(q)) &&
      (!m || String(r.mechanic).toLowerCase().includes(m)) &&
      (!p || String(r.parts).toLowerCase().includes(p)) &&
      (filter.report === 'all' || (filter.report === 'parts' ? r.type === 'Parts Issued' : r.type.toLowerCase().includes(filter.report))) &&
      periodOk(r.date,filter)
    ).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[filter, fuelConsumptions, vehicleOutActivities, assessments, garageOps, inventory, role]);

  const allParts = garageOps.flatMap(g => (g.partsUsed || []).map(p=>({...p, vehicle:g.vehicle, createdAt:g.createdAt || g.start}))).concat(assessments.flatMap(a => (a.parts || []).map(p=>({...p, vehicle:a.vehicle, createdAt:a.createdAt}))));
  const vehicleCosts = group(rows.filter(r=>['Garage Work','Assessment','Fuel','Vehicle Out/In','Parts Issued'].includes(r.type)), r=>r.plate, r=>n(r.cost)+n(r.fuel)*60).slice(0,10);
  const mechanicProd = group(rows.filter(r=>r.mechanic && r.mechanic !== '-'), r=>r.mechanic, r=>r.type==='Garage Work'?Math.max(1,n(r.duration)):0.5).slice(0,10);
  const inventoryProfit = inventory.map(i=>({ label:i.name, value:(n(i.lastPrice)-n(i.costPrice||0))*n(i.stock) })).sort((a,b)=>b.value-a.value).slice(0,10);
  const fuelFiltered = fuelConsumptions.filter(f=>periodOk(f.recordedAt,filter) && (!filter.search || String(f.vehicle).toLowerCase().includes(String(filter.search).toLowerCase())));
  const outFiltered = vehicleOutActivities.filter(o=>periodOk(o.startDateTime,filter) && (!filter.search || String(o.vehicle).toLowerCase().includes(String(filter.search).toLowerCase())));
  const fuelByVehicle = group(fuelFiltered, f=>f.vehicle, f=>n(f.fuelLitres)).slice(0,10);
  const monthlyFuel = group(fuelFiltered, f=>ym(f.recordedAt), f=>n(f.fuelLitres)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-8);
  const monthlyRepair = group(garageOps.filter(g=>periodOk(g.createdAt || g.start,filter)), g=>ym(g.createdAt || g.start), g=>(g.partsUsed||[]).reduce((s,p)=>s+partCost(p),0)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-8);
  const activityByVehicle = group(outFiltered, o=>o.vehicle).slice(0,10);
  const activityDurationByVehicle = group(outFiltered, o=>o.vehicle, o=>hoursBetween(o.startDateTime,o.endDateTime)).slice(0,10);
  const dailyOps = group(rows, r=>day(r.date)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-10);
  const partsMix = group(allParts.filter(p=>periodOk(p.createdAt,filter)), p=>partName(p), p=>n(p.qty||p.quantity||1)).slice(0,6);
  const lowStockRows = inventory.filter(i=>n(i.stock)<=n(i.reorderLevel)).map(i=>({ label:i.name, value:n(i.stock) }));
  const mostRepaired = group(garageOps.filter(g=>periodOk(g.createdAt || g.start,filter)), g=>g.vehicle).slice(0,10);
  const openGarage = garageOps.filter(g=>!['Completed','Cancelled'].includes(g.status)).length;
  const openAssessments = assessments.filter(a=>!['Completed'].includes(a.status)).length;
  const totalFuel = rows.reduce((s,r)=>s+n(r.fuel),0);
  const totalCost = rows.reduce((s,r)=>s+n(r.cost),0) + (isAdmin ? totalFuel * 60 : 0);
  const totalDuration = rows.reduce((s,r)=>s+n(r.duration),0);
  const totalParts = rows.filter(r=>r.type==='Parts Issued').length;

  function exportData(){ return [['Date','Plate','Report Type','Fuel L','Parts','Cost','Mechanic/Guide','Duration Hours','Status'], ...rows.map(r=>[fmt(r.date),r.plate,r.type,r.fuel,r.parts,r.cost,r.mechanic,Number(r.duration||0).toFixed(2),r.status])]; }
  function exportCsv(){ download(`valle-${role || 'admin'}-report.csv`, csv(exportData())); notify?.('CSV report exported.'); }
  function exportExcel(){ const html = `<table>${exportData().map(r=>`<tr>${r.map(c=>`<td>${String(c).replaceAll('&','&amp;').replaceAll('<','&lt;')}</td>`).join('')}</tr>`).join('')}</table>`; download(`valle-${role || 'admin'}-report.xls`, html, 'application/vnd.ms-excel'); notify?.('Excel report exported.'); }
  function exportPdf(){ printPdf(`Vallé ${role || 'Admin'} Report`); notify?.('PDF print/export opened.'); }

  if(!isAdmin && !isStore && !isFuelOnly && !isVehicleOnly) return <div className="page"><Card><h2>Reports are restricted for your role.</h2></Card></div>;

  const subtitle = isFuelOnly
    ? 'Fuel reports only: litres by vehicle, day/week/month and export for fuel management.'
    : isVehicleOnly
      ? 'Vehicle in/out reports only: trip counts, duration and returned/out status.'
      : isStore
        ? 'Store Keeper reports: assessments, parts issued and low stock only.'
        : 'Manager-level reports with advanced charts, filters, operational tracking and exports.';

  return <div className="page report-page admin-analytics-page role-aware-reports-page">
    <PageHeader title={isAdmin ? 'Advanced Analytics & Reports' : isFuelOnly ? 'Fuel Reports' : isVehicleOnly ? 'Vehicle In / Out Reports' : 'Store Keeper Reports'} subtitle={subtitle} />

    <Card className="report-filters professional-report-filters">
      <div className="report-filter-head">
        <div><h2>Report Builder</h2><p>Select report type, period and search criteria, then click Apply. Charts are hoverable and clickable for filtering.</p>{selectedInsight && <small className="selected-insight">{selectedInsight}</small>}</div>
        <div className="report-export-actions"><Button variant="secondary" onClick={exportCsv}>CSV</Button><Button variant="secondary" onClick={exportExcel}>Excel</Button><Button onClick={exportPdf}>PDF</Button></div>
      </div>
      <div className="form-grid six">
        <Field label="Search plate / ticket"><Input value={draft.search} onChange={e=>setDraft({...draft,search:e.target.value})} placeholder="AP 03, ASM..." /></Field>
        <Field label="Report"><select className="input" value={draft.report} onChange={e=>setDraft({...draft,report:e.target.value})}>{reportOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Field label="Period"><select className="input" value={draft.period} onChange={e=>setDraft({...draft,period:e.target.value})}><option value="today">Today</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option><option value="custom">Custom</option></select></Field>
        <Field label="From"><Input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})} /></Field>
        <Field label="To"><Input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})} /></Field>
        <div className="report-apply-row no-border"><Button onClick={()=>applyReport()}>Apply Filter & View Result</Button></div>
      </div>
      {(isAdmin || isStore) && <div className="form-grid two"><Field label="Mechanic"><select className="input" value={draft.mechanic} onChange={e=>setDraft({...draft,mechanic:e.target.value})}><option value="">All mechanics</option>{mechanics.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></Field><Field label="Part"><Input value={draft.part} onChange={e=>setDraft({...draft,part:e.target.value})} placeholder="Brake pads, oil filter..." /></Field></div>}
    </Card>

    <div className="stats-grid analytics-grid admin-analytics-kpis role-report-kpis">
      {isAdmin && <Kpi label="Vehicle Cost" value={money(totalCost)} note="Parts + estimated fuel" tone="warning" onClick={()=>clickReport('all')} />}
      {(isAdmin || isFuelOnly) && <Kpi label="Fuel Used" value={`${Math.round(totalFuel)} L`} note="Fuel reports only for fuel role" tone="success" onClick={()=>clickReport('fuel')} />}
      {(isAdmin || isStore) && <Kpi label="Parts Issued/Used" value={totalParts} note="Report-critical parts movement" tone="neutral" onClick={()=>clickReport('parts')} />}
      {(isAdmin || isVehicleOnly) && <Kpi label="Vehicle Activities" value={activityByVehicle.reduce((s,x)=>s+x.value,0)} note="Out/in records" tone="neutral" onClick={()=>clickReport('vehicle')} />}
      {isAdmin && <Kpi label="Garage Open" value={openGarage} note="Jobs still in progress" tone="warning" onClick={()=>clickReport('garage')} />}
      <Kpi label="Rows Returned" value={rows.length} note={applied ? 'Filtered result' : 'Default current period'} tone="neutral" />
    </div>

    <div className="chart-grid two-column-charts role-report-charts">
      {(isAdmin || isFuelOnly) && <>
        <ChartCard title="Monthly Fuel Consumption" subtitle="Litres by month from FuelConsumption" badge="Fuel" tone="success">
          {monthlyFuel.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyFuel} onClick={(e)=>e?.activeLabel && applyReport({...draft, period:'custom', search:draft.search})}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#24f66f" fill="#24f66f" fillOpacity={0.24} strokeWidth={3} /></AreaChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Fuel by Vehicle" subtitle="Click a vehicle to filter its fuel report" badge="Litres" tone="success">
          {fuelByVehicle.length ? <BarList rows={fuelByVehicle} suffix=" L" onSelect={clickPlate} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Fuel Efficiency View" subtitle="Vehicle litre distribution" badge="Pie" tone="success">
          {fuelByVehicle.length ? <Donut rows={fuelByVehicle.slice(0,6)} onSelect={clickPlate} /> : <EmptyChart />}
        </ChartCard>
      </>}

      {(isAdmin || isVehicleOnly) && <>
        <ChartCard title="Vehicle Out Frequency" subtitle="Click a vehicle to filter out/in records" badge="Trips" tone="neutral">
          {activityByVehicle.length ? <BarList rows={activityByVehicle} onSelect={clickPlate} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Vehicle Out Duration" subtitle="Total hours out by vehicle" badge="Hours" tone="neutral">
          {activityDurationByVehicle.length ? <BarList rows={activityDurationByVehicle} suffix="h" onSelect={clickPlate} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Daily Vehicle Activity" subtitle="Out/in records by date" badge="Daily" tone="success">
          {dailyOps.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={dailyOps}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#2b0048" radius={[8,8,0,0]} onClick={(d)=>setSelectedInsight(`Viewing ${d?.label || 'selected day'}`)} /></BarChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
      </>}

      {isAdmin && <>
        <ChartCard title="Repair Cost per Month" subtitle="GarageOperation parts value by month" badge="Cost" tone="warning">
          {monthlyRepair.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRepair}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(v)=>money(v)} /><Bar dataKey="value" fill="#6f3cff" radius={[8,8,0,0]} onClick={(d)=>setSelectedInsight(`Repair cost period: ${d?.label}`)} /></BarChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Vehicle Cost Report" subtitle="Total repair and estimated fuel cost per vehicle" badge="Vehicles" tone="warning">
          {vehicleCosts.length ? <BarList rows={vehicleCosts} cost onSelect={clickPlate} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Most Repaired Vehicles" subtitle="Garage frequency by vehicle" badge="Frequency" tone="neutral">
          {mostRepaired.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={shortRows(mostRepaired,10)} onClick={(e)=>e?.activePayload?.[0]?.payload?.label && clickPlate(e.activePayload[0].payload.label)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="short" /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(label, data)=>data?.[0]?.payload?.label || label} /><Line type="monotone" dataKey="value" stroke="#ff315f" strokeWidth={4} dot={{ r: 5 }} /></LineChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Mechanic Productivity" subtitle="Hours worked, jobs touched and average activity" badge="Team" tone="success">
          {mechanicProd.length ? <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={shortRows(mechanicProd,8)}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="short" width={90} /><Tooltip labelFormatter={(label, data)=>data?.[0]?.payload?.label || label} /><Bar dataKey="value" fill="#24f66f" radius={[0,8,8,0]} onClick={(d)=>{const next={...draft, mechanic:d?.label || ''}; applyReport(next);}} /></BarChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Inventory Profit / Value" subtitle="Selling price minus cost price by stock" badge="Margin" tone="warning">
          {inventoryProfit.length ? <BarList rows={inventoryProfit} cost onSelect={clickPart} /> : <EmptyChart />}
        </ChartCard>
      </>}

      {(isAdmin || isStore) && <>
        <ChartCard title="Top 10 Parts Used" subtitle="Fast-moving parts from assessment and garage" badge="Parts" tone="neutral">
          {partsMix.length ? <Donut rows={partsMix} onSelect={clickPart} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Low Stock Risk" subtitle="Items at or below reorder level" badge="Stock" tone="danger">
          {lowStockRows.length ? <BarList rows={lowStockRows.slice(0,10)} onSelect={clickPart} /> : <EmptyChart text="No low stock risk." />}
        </ChartCard>
      </>}

      {isAdmin && <ChartCard title="Operational Summary" subtitle="Current workshop control points" badge="Insight" tone="neutral">
        <div className="next-actions-panel"><button onClick={()=>clickReport('garage')}>Open garage jobs: <b>{openGarage}</b></button><button onClick={()=>clickReport('assessment')}>Open assessments: <b>{openAssessments}</b></button><button onClick={()=>clickReport('vehicle')}>Total out duration: <b>{Math.round(totalDuration)}h</b></button><button>Report rows: <b>{rows.length}</b></button></div>
      </ChartCard>}
    </div>

    <Card className="report-result-card"><div className="card-head"><div><h2>Report Result Preview</h2><p>{isFuelOnly ? 'Fuel role only sees fuel data.' : isVehicleOnly ? 'Vehicle manager only sees vehicle in/out data.' : 'Admin can export this same data as CSV, Excel or PDF.'}</p></div><Badge tone="neutral">{rows.length} rows</Badge></div><Table headers={['Date','Plate','Type','Fuel L','Parts','Cost','Mechanic/Guide','Duration','Status']}>
      {rows.map((r,i)=><tr key={i}><td>{fmt(r.date)}</td><td><b>{r.plate}</b></td><td>{r.type}</td><td>{r.fuel}</td><td>{r.parts}</td><td><b>{(isAdmin || isStore) && r.cost ? money(r.cost) : '-'}</b></td><td>{r.mechanic}</td><td>{r.duration ? `${Number(r.duration).toFixed(1)}h` : '-'}</td><td><Badge tone={String(r.status).includes('Completed')||String(r.status).includes('Returned')||String(r.status).includes('Recorded')?'success':'warning'}>{r.status}</Badge></td></tr>)}
    </Table></Card>
  </div>;
}
