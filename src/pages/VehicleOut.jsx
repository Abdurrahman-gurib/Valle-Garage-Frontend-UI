import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useApp } from '../context/AppContext.jsx';
import { formatDateTime, secondsBetween, durationLabel, todayInput, formatInput, mauritiusNowDate } from '../utils/time.js';

const BIKING_TYPES = ['Quad Single', 'Quad Double', 'Buggy'];
const DESTINATION_ROUTES = ['Adventure', 'Discovery'];

function fmt(v){ return formatDateTime(v, false); }
function niceDuration(seconds){ return durationLabel(seconds); }
function normPlate(v){ return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function dateKey(v){ return String(v || '').slice(0,10); }
function ymKey(v){ return String(v || '').slice(0,7); }
function yearKey(v){ return String(v || '').slice(0,4); }
function addDays(dateStr, days){
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function monthName(ym){
  if(!ym) return '-';
  const [y,m] = ym.split('-').map(Number);
  if(!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month:'long', year:'numeric' });
}
function inDateRange(rowDate, from, to){
  if(!rowDate) return false;
  if(from && rowDate < from) return false;
  if(to && rowDate > to) return false;
  return true;
}
function activityLabel(o){
  return bikingTypeLabel(o);
}
function routeLabel(o){
  const raw = o.destinationRoute || o.destination || '';
  const value = String(raw || '').trim();
  return value && value !== '-' ? value : 'Not specified';
}
function bikingTypeLabel(o){
  const raw = o.bikingVehicleType || o.quadActivity || o.activityType || '';
  const value = String(raw || '').trim();
  const lower = value.toLowerCase();
  if(lower.includes('quad') && lower.includes('single')) return 'Quad Single';
  if(lower.includes('quad') && lower.includes('double')) return 'Quad Double';
  if(lower === 'quad' || lower.includes('quad')) return 'Quad Single';
  if(lower.includes('buggy')) return 'Buggy';
  return 'Unspecified Type';
}
const ROUTE_TYPE_SERIES = ['Quad Single', 'Quad Double', 'Buggy', 'Unspecified Type'];

function plannedDurationSeconds(value){
  const text = String(value || '').toLowerCase().trim();
  if(!text) return 0;
  const num = Number((text.match(/\d+(?:\.\d+)?/) || [0])[0]);
  if(!num) return 0;
  if(text.includes('day')) return Math.round(num * 86400);
  if(text.includes('hour') || text.includes('hr')) return Math.round(num * 3600);
  if(text.includes('min')) return Math.round(num * 60);
  return Math.round(num * 3600);
}

const CHART_COLORS = ['#6f3cff', '#24f66f', '#ff8b00', '#2bb7ff', '#a7a0b2', '#ff315f'];
function compactTimeLabel(v){
  const s = String(v || '');
  return s.includes('T') ? s.slice(11,16) : s.slice(11,16) || s.slice(0,10) || '-';
}
function vehicleTypeOf(record, vehicles){
  const p = normPlate(record.vehicle || record.vehiclePlate || '');
  const v = (vehicles || []).find(x => normPlate(x.plate) === p || x.id === record.vehicleId || x.dbId === record.vehicleId);
  return String(v?.vehicleType || v?.type || 'Unknown').toUpperCase();
}
function dateRangeDays(from, to){
  const out=[];
  const s=new Date(`${from}T00:00:00`);
  const e=new Date(`${to}T00:00:00`);
  if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return out;
  for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)) out.push(d.toISOString().slice(0,10));
  return out;
}
function vehicleChartTooltip({active,payload,label}){
  if(!active || !payload?.length) return null;
  return <div className="analytics-tooltip"><b>{label}</b>{payload.map((p,i)=><span key={i}>{p.name}: {p.value}</span>)}</div>;
}

function ChartExportMenu({ title, rows }){
  const [open,setOpen] = useState(false);
  async function exportXlsx(){
    const XLSX = await import('xlsx');
    const data = rows?.length ? rows : [{ note:'No data for selected filter' }];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(14, String(k).length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'vehicle-chart'}-data.xlsx`);
    setOpen(false);
  }
  function exportCsv(){
    const data = rows?.length ? rows : [{ note:'No data for selected filter' }];
    const cols = Object.keys(data[0] || {});
    const csv = [cols.join(','), ...data.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'vehicle-chart'}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }
  return <div className="chart-export-menu">
    <button type="button" className="mini-export-btn" onClick={()=>setOpen(v=>!v)}>Download ▾</button>
    {open && <div className="chart-export-popover"><button type="button" onClick={exportXlsx}>Excel XLSX</button><button type="button" onClick={exportCsv}>CSV</button></div>}
  </div>;
}

function VehicleChartCard({ title, subtitle, rows, children }){
  return <Card className="chart-card pro-chart-card">
    <div className="card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><ChartExportMenu title={title} rows={rows}/></div>
    <div className="chart-box">{children}</div>
  </Card>;
}

export default function VehicleOut(){
  const { vehicles, vehicleOutActivities, addVehicleOutActivity, nowLocalInput, findVehicleByPlate, refreshAll } = useApp();
  const [plateSearch,setPlateSearch]=useState('');
  const [tab,setTab]=useState('out');
  const [message,setMessage]=useState('');
  const [clock,setClock]=useState(mauritiusNowDate());
  const [summaryFilter,setSummaryFilter]=useState('today');
  const [manualFrom,setManualFrom]=useState(todayInput());
  const [manualTo,setManualTo]=useState(todayInput());
  const [manualMonth,setManualMonth]=useState(ymKey(todayInput()));
  const [manualYear,setManualYear]=useState(yearKey(todayInput()));

  useEffect(()=>{ const id=setInterval(()=>setClock(mauritiusNowDate()),1000); return ()=>clearInterval(id); },[]);
  const [form,setForm]=useState({
    vehicleId:'',
    invoiceNumber:'',
    guideName:'',
    bikingVehicleType:'Quad Single',
    destinationRoute:'Adventure',
    tripDuration:'1 hour',
    customTripDuration:'',
    driverName:'',
    notes:''
  });

  const suggestions = useMemo(()=>{
    const q=plateSearch.trim().toLowerCase();
    if(!q) return [];
    if (vehicles.some(v => normPlate(v.plate) === normPlate(q))) return [];
    return vehicles.filter(v=>`${v.plate} ${v.model} ${v.vin} ${v.type}`.toLowerCase().includes(q)).slice(0,8);
  },[plateSearch,vehicles]);

  function selectVehicle(v){ setPlateSearch(v.plate); setForm(prev=>({...prev, vehicleId:v.dbId || v.id})); }
  const selectedVehicle = vehicles.find(v=>v.id===form.vehicleId || v.dbId===form.vehicleId) || findVehicleByPlate(plateSearch);
  const openTrips = useMemo(()=> vehicleOutActivities.filter(o=>!o.endDateTime), [vehicleOutActivities]);

  const today = todayInput();
  const summaryLabel = useMemo(()=>{
    if(summaryFilter === 'today') return 'Today only';
    if(summaryFilter === 'last7') return 'Last 7 days';
    if(summaryFilter === 'month') return `Month: ${monthName(manualMonth)}`;
    if(summaryFilter === 'year') return `Year: ${manualYear || yearKey(today)}`;
    if(summaryFilter === 'manual') return `Manual: ${manualFrom || '-'} to ${manualTo || '-'}`;
    return 'Today only';
  },[summaryFilter, manualFrom, manualTo, manualMonth, manualYear, today]);

  const selectedHistory = useMemo(()=>{
    const plate = selectedVehicle?.plate || plateSearch;
    const plateKey = normPlate(plate);
    const from7 = addDays(today, -6);
    return vehicleOutActivities
      .filter(o => {
        const rowDate = dateKey(o.startDateTime);
        if(!rowDate) return false;

        if(summaryFilter === 'today' && rowDate !== today) return false;
        if(summaryFilter === 'last7' && !inDateRange(rowDate, from7, today)) return false;
        if(summaryFilter === 'month' && ymKey(o.startDateTime) !== manualMonth) return false;
        if(summaryFilter === 'year' && yearKey(o.startDateTime) !== String(manualYear || yearKey(today))) return false;
        if(summaryFilter === 'manual' && !inDateRange(rowDate, manualFrom, manualTo)) return false;

        if(plateKey && normPlate(o.vehicle) !== plateKey) return false;
        return true;
      })
      .sort((a,b)=>String(b.startDateTime || '').localeCompare(String(a.startDateTime || '')));
  },[vehicleOutActivities, selectedVehicle, plateSearch, summaryFilter, manualFrom, manualTo, manualMonth, manualYear, today]);

  const totalTimes = selectedHistory.length;
  const totalInRecords = selectedHistory.filter(o => !!o.endDateTime).length;
  const activeOutRecords = selectedHistory.filter(o => !o.endDateTime).length;
  const totalSeconds = selectedHistory.reduce((s,o)=>s+secondsBetween(o.startDateTime,o.endDateTime,clock),0);
  const avgSeconds = totalTimes ? Math.floor(totalSeconds / totalTimes) : 0;

  const vehicleReportRows = useMemo(() => selectedHistory.map(o => ({
    exactOutTime: fmt(o.startDateTime),
    exactInTime: o.endDateTime ? fmt(o.endDateTime) : 'Still out',
    vehiclePlate: o.vehicle || '-',
    vehicleType: vehicleTypeOf(o, vehicles),
    invoice: o.invoiceNumber || '-',
    guide: o.guideName || '-',
    bikingVehicleType: activityLabel(o),
    route: routeLabel(o),
    plannedDuration: o.tripDuration || '-',
    actualSeconds: secondsBetween(o.startDateTime, o.endDateTime, clock),
    actualDuration: niceDuration(secondsBetween(o.startDateTime, o.endDateTime, clock)),
    status: o.endDateTime ? 'IN' : 'OUT'
  })), [selectedHistory, vehicles, clock]);

  const vehicleOutChartData = useMemo(() => {
    const dayCounts = {};
    selectedHistory.forEach((o) => {
      const key = summaryFilter === 'today' ? compactTimeLabel(o.startDateTime) : dateKey(o.startDateTime);
      if(!key || key === '-') return;
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    return Object.entries(dayCounts).sort(([a],[b]) => String(a).localeCompare(String(b))).map(([label, out]) => ({ label, OUT: out, IN: selectedHistory.filter(o => (summaryFilter === 'today' ? compactTimeLabel(o.endDateTime) : dateKey(o.endDateTime)) === label).length, Assessments: 0 }));
  }, [selectedHistory, summaryFilter]);

  const vehicleFleetTypeData = useMemo(() => {
    const counts = {};
    selectedHistory.forEach((o) => {
      const type = vehicleTypeOf(o, vehicles);
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name, value]) => ({ name, value }));
  }, [selectedHistory, vehicles]);

  const routeData = useMemo(() => {
    const map = {};
    selectedHistory.forEach((o) => {
      const route = routeLabel(o);
      const type = ROUTE_TYPE_SERIES.includes(bikingTypeLabel(o)) ? bikingTypeLabel(o) : 'Unspecified Type';
      if(!map[route]) map[route] = { label: route, total: 0, 'Quad Single': 0, 'Quad Double': 0, Buggy: 0, 'Unspecified Type': 0 };
      map[route][type] += 1;
      map[route].total += 1;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  }, [selectedHistory]);

  const peakTimeData = useMemo(() => {
    // IMPORTANT: this chart must show the real OUT / IN event times, not rounded hour buckets.
    // Example: OUT at 13:33 and IN at 13:35 must appear as separate points: 13:33 and 13:35.
    const map = {};
    function addEvent(value, type, plate){
      const raw = String(value || '');
      if(!raw) return;
      const sortKey = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const label = raw.includes('T') ? raw.slice(11,19) : (raw.split(' ')[1] || raw).slice(0,8);
      if(!label || label === '-') return;
      if(!map[label]) map[label] = { label, sortKey, OUT:0, IN:0, outVehicles:'', inVehicles:'' };
      map[label][type] += 1;
      const key = type === 'OUT' ? 'outVehicles' : 'inVehicles';
      const existing = map[label][key] ? `${map[label][key]}, ` : '';
      map[label][key] = `${existing}${plate || '-'}`;
    }
    selectedHistory.forEach((o) => {
      addEvent(o.startDateTime, 'OUT', o.vehicle || o.vehiclePlate);
      if(o.endDateTime) addEvent(o.endDateTime, 'IN', o.vehicle || o.vehiclePlate);
    });
    return Object.values(map).sort((a,b)=>String(a.sortKey).localeCompare(String(b.sortKey)));
  }, [selectedHistory]);

  const durationByPlateData = useMemo(() => {
    const map = {};
    selectedHistory.forEach((o) => {
      const k = o.vehicle || '-';
      map[k] = map[k] || { label:k, trips:0, seconds:0, hours:0, duration:'0h 0m 0s' };
      const sec = secondsBetween(o.startDateTime,o.endDateTime,clock);
      map[k].trips += 1;
      map[k].seconds += sec;
      map[k].hours = Number((map[k].seconds / 3600).toFixed(2));
      map[k].duration = niceDuration(map[k].seconds);
    });
    return Object.values(map).sort((a,b)=>b.seconds-a.seconds).slice(0,20);
  }, [selectedHistory, clock]);

  const outInByPlateData = useMemo(() => {
    const map = {};
    selectedHistory.forEach((o) => {
      const plate = o.vehicle || o.vehiclePlate || '-';
      map[plate] = map[plate] || { label: plate, OUT: 0, IN: 0, stillOut: 0 };
      map[plate].OUT += 1;
      if(o.endDateTime) map[plate].IN += 1;
      else map[plate].stillOut += 1;
    });
    return Object.values(map).sort((a,b)=>(b.OUT-a.OUT) || String(a.label).localeCompare(String(b.label))).slice(0,18);
  }, [selectedHistory]);

  const todaysTrips = useMemo(()=> vehicleOutActivities
    .filter(o => dateKey(o.startDateTime) === today)
    .sort((a,b)=>String(b.startDateTime || '').localeCompare(String(a.startDateTime || ''))), [vehicleOutActivities, today]);
  const previousTrips = useMemo(()=> vehicleOutActivities
    .filter(o => dateKey(o.startDateTime) !== today)
    .sort((a,b)=>String(b.startDateTime || '').localeCompare(String(a.startDateTime || '')))
    .slice(0,30), [vehicleOutActivities, today]);

  const plannedVsActualData = useMemo(() => selectedHistory.slice(0, 12).map((o) => {
    const actualSeconds = secondsBetween(o.startDateTime, o.endDateTime, clock);
    const plannedSeconds = plannedDurationSeconds(o.tripDuration);
    return {
      label: `${o.vehicle || 'Vehicle'} ${compactTimeLabel(o.startDateTime)}`,
      plate: o.vehicle || '-',
      plannedHours: Number((plannedSeconds / 3600).toFixed(2)),
      actualHours: Number((actualSeconds / 3600).toFixed(2)),
      actualDuration: niceDuration(actualSeconds),
      plannedDuration: o.tripDuration || '-',
      varianceSeconds: actualSeconds - plannedSeconds,
      variance: niceDuration(Math.abs(actualSeconds - plannedSeconds)),
      status: actualSeconds > plannedSeconds && plannedSeconds ? 'Over planned' : 'Within planned'
    };
  }), [selectedHistory, clock]);

  async function submitOut(e){
    e.preventDefault();
    const vehicle = selectedVehicle;
    if(!vehicle){ setMessage('Please select a valid vehicle from the database dropdown.'); return; }
    const tripDuration = form.tripDuration === 'manual' ? form.customTripDuration : form.tripDuration;
    const payload = {
      ...form,
      vehicleId: vehicle.dbId || vehicle.id,
      activityType: form.bikingVehicleType,
      quadActivity: form.bikingVehicleType,
      destination: form.destinationRoute,
      tripDuration
    };
    await addVehicleOutActivity(payload);
    setMessage(`${vehicle.plate} has been recorded OUT for ${form.bikingVehicleType} / ${form.destinationRoute}. Reports are available in Reports.`);
    setForm(prev=>({
      ...prev,
      invoiceNumber:'',
      guideName:'',
      bikingVehicleType:'Quad Single',
      destinationRoute:'Adventure',
      tripDuration:'1 hour',
      customTripDuration:'',
      notes:''
    }));
  }

  async function markIn(record){
    try {
      const { api } = await import('../services/api.js');
      const updated = await api.vehicleOut.update(record.id, { recordIn: true });
      const finalTime = updated?.endDateTime ? fmt(updated.endDateTime) : fmt(formatInput());
      setMessage(`${record.vehicle} recorded IN at ${finalTime}.`);
      await refreshAll();
    } catch (err) {
      setMessage(err.message || 'Could not update vehicle in time.');
    }
  }

  return <div className="page">
    <PageHeader title="Vehicles Management System" subtitle="Record quad / buggy vehicle OUT and IN activity with invoice, guide, route, trip duration and exact time tracking." />

    <div className="tabs"><button className={tab==='out'?'active':''} onClick={()=>setTab('out')}>Vehicle Out</button><button className={tab==='in'?'active':''} onClick={()=>setTab('in')}>Vehicle In</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Vehicle Activity Summary</button></div>

    {message && <Card className="section-small"><div className="notice success">{message}</div></Card>}

    {tab==='out' && <Card className="section-small">
      <h2>Record Vehicle Out</h2>
      <p className="muted">Start typing a plate. Vehicles are populated directly from the database. OUT time is locked to backend Mauritius time.</p>
      <form onSubmit={submitOut} className="form-grid four">
        <Field label="Search / Select Vehicle Plate"><Input list="vehicle-out-list" placeholder="Type plate" value={plateSearch} onChange={e=>{setPlateSearch(e.target.value.toUpperCase()); setForm(prev=>({...prev,vehicleId:''}));}} /><datalist id="vehicle-out-list">{vehicles.map(v=><option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist>{suggestions.length>0 && <div className="suggestion-panel">{suggestions.map(v=><button type="button" key={v.dbId || v.id} onClick={()=>selectVehicle(v)}><b>{v.plate}</b><span>{v.model || v.type}</span></button>)}</div>}</Field>
        <Field label="Invoice Number"><Input value={form.invoiceNumber} onChange={e=>setForm({...form,invoiceNumber:e.target.value})} placeholder="INV-0001" /></Field>
        <Field label="Guide Name"><Input value={form.guideName} onChange={e=>setForm({...form,guideName:e.target.value})} placeholder="Guide / staff name" /></Field>
        <Field label="Biking Vehicle Type"><select className="input" value={form.bikingVehicleType} onChange={e=>setForm({...form,bikingVehicleType:e.target.value})}>{BIKING_TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select></Field>
        <Field label="Destination Route"><select className="input" value={form.destinationRoute} onChange={e=>setForm({...form,destinationRoute:e.target.value})}>{DESTINATION_ROUTES.map(x=><option key={x} value={x}>{x}</option>)}</select></Field>
        <Field label="Trip Duration"><select className="input" value={form.tripDuration} onChange={e=>setForm({...form,tripDuration:e.target.value})}><option value="1 hour">1 hour</option><option value="2 hours">2 hours</option><option value="manual">Input manually</option></select></Field>
        {form.tripDuration==='manual' && <Field label="Manual Duration"><Input value={form.customTripDuration} onChange={e=>setForm({...form,customTripDuration:e.target.value})} placeholder="e.g. 45 minutes" /></Field>}
        <Field label="Time Out"><div className="locked-time-display"><b>{fmt(nowLocalInput())}</b></div></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional" /></Field>
        <Field label="Save"><Button>Record Vehicle Out</Button></Field>
      </form>
    </Card>}

    {tab==='in' && <Card>
      <h2>Record Vehicle In</h2>
      <p className="muted">These are vehicles currently out. Click Record In when the vehicle returns, then it can go out again for another activity.</p>
      <Table headers={["Vehicle", "Invoice", "Guide", "Biking Type", "Route", "Time Out", "Current Time Out", "Action"]}>
        {openTrips.map(o=><tr key={o.id}><td><b>{o.vehicle}</b></td><td>{o.invoiceNumber || '-'}</td><td>{o.guideName || '-'}</td><td>{activityLabel(o)}</td><td>{routeLabel(o)}</td><td>{fmt(o.startDateTime)}</td><td>{niceDuration(secondsBetween(o.startDateTime,null,clock))}</td><td><Button onClick={()=>markIn(o)}>Record In</Button></td></tr>)}
        {!openTrips.length && <tr><td colSpan="8">No vehicles currently out.</td></tr>}
      </Table>
    </Card>}

    {tab==='history' && <Card>
      <h2>Vehicle Activity Summary</h2>
      <div className="form-grid four">
        <Field label="Period Filter">
          <select className="input" value={summaryFilter} onChange={e=>setSummaryFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="last7">Last 7 days</option>
            <option value="month">Specific month</option>
            <option value="year">Specific year</option>
            <option value="manual">Manual date range</option>
          </select>
        </Field>
        <Field label="Search Plate"><Input list="vehicle-history-list" placeholder="Optional - leave blank for all vehicles" value={plateSearch} onChange={e=>setPlateSearch(e.target.value.toUpperCase())} /><datalist id="vehicle-history-list">{vehicles.map(v=><option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist></Field>
        {summaryFilter==='month' && <Field label="Month"><Input type="month" value={manualMonth} onChange={e=>setManualMonth(e.target.value)} /></Field>}
        {summaryFilter==='year' && <Field label="Year"><Input type="number" min="2020" max="2100" value={manualYear} onChange={e=>setManualYear(e.target.value)} /></Field>}
        {summaryFilter==='manual' && <Field label="From"><Input type="date" value={manualFrom} onChange={e=>setManualFrom(e.target.value)} /></Field>}
        {summaryFilter==='manual' && <Field label="To"><Input type="date" value={manualTo} onChange={e=>setManualTo(e.target.value)} /></Field>}
      </div>

      <div className="stats-grid section-small vehicle-kpi-row">
        <div className="metric-card"><span>Selected Filter</span><b style={{fontSize:'1.4rem'}}>{summaryLabel}</b><ChartExportMenu title="Vehicle Out In Full Report" rows={vehicleReportRows}/></div>
        <div className="metric-card"><span>Total Vehicle OUT Records</span><b>{totalTimes}</b></div>
        <div className="metric-card"><span>Total Vehicle IN Records</span><b>{totalInRecords}</b></div>
        <div className="metric-card"><span>Currently OUT</span><b>{activeOutRecords}</b></div>
        <div className="metric-card"><span>Total Actual Time OUT</span><b>{niceDuration(totalSeconds)}</b></div>
        <div className="metric-card"><span>Average Actual Time OUT</span><b>{niceDuration(avgSeconds)}</b></div>
      </div>

      <div className="vehicle-analytics-grid section-small">
        <VehicleChartCard title="Exact OUT / IN Timeline" subtitle="Large exact timeline. Uses every stored OUT and IN timestamp with minute/second precision." rows={peakTimeData}>
            {peakTimeData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={peakTimeData} margin={{left:16,right:24,top:12,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" interval={0}/><YAxis allowDecimals={false}/><Tooltip content={vehicleChartTooltip}/><Legend/><Line type="linear" dataKey="OUT" stroke="#6f3cff" strokeWidth={3} dot={{r:5}}/><Line type="linear" dataKey="IN" stroke="#24f66f" strokeWidth={3} dot={{r:5}}/></LineChart></ResponsiveContainer> : <div className="empty-chart">No exact OUT/IN time data for selected filter.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Vehicle OUT / IN Count by Plate" subtitle="Shows which vehicle plates went OUT and returned IN during the selected filter." rows={outInByPlateData}>
            {outInByPlateData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={outInByPlateData} layout="vertical" margin={{left:70,right:24,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={90}/><Tooltip/><Legend/><Bar dataKey="OUT" name="OUT records" fill="#6f3cff" radius={[0,8,8,0]}/><Bar dataKey="IN" name="IN records" fill="#24f66f" radius={[0,8,8,0]}/><Bar dataKey="stillOut" name="Still out" fill="#ff8b00" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer> : <div className="empty-chart">No OUT/IN by plate data.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Actual Time OUT by Vehicle" subtitle="Total exact hours/minutes/seconds per plate for selected filter." rows={durationByPlateData}>
            {durationByPlateData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={durationByPlateData} layout="vertical" margin={{left:70,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="label" width={90}/><Tooltip/><Legend/><Bar dataKey="hours" name="Actual hours out" fill="#ff8b00"/><Bar dataKey="trips" name="Trip count" fill="#2bb7ff"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No duration by vehicle data.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Vehicle Activity Overview" subtitle="OUT and IN records for the selected filter." rows={vehicleOutChartData}>
            {vehicleOutChartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={vehicleOutChartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" interval={0}/><YAxis allowDecimals={false}/><Tooltip content={vehicleChartTooltip}/><Legend/><Line type="linear" dataKey="OUT" stroke="#6f3cff" strokeWidth={3} dot={{ r: 5 }}/><Line type="linear" dataKey="IN" stroke="#24f66f" strokeWidth={3} dot={{ r: 5 }}/><Line type="monotone" dataKey="Assessments" stroke="#2bb7ff" strokeWidth={2}/></LineChart></ResponsiveContainer> : <div className="empty-chart">No vehicle activity for selected filter.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Fleet by Type" subtitle="Vehicle types used in the selected activity period." rows={vehicleFleetTypeData}>
            {vehicleFleetTypeData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={vehicleFleetTypeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label={({name,value})=>`${name}: ${value}`}>{vehicleFleetTypeData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer> : <div className="empty-chart">No fleet type data.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Route Usage by Biking Type" subtitle="Adventure / Discovery split by Quad Single, Quad Double and Buggy for the selected filter." rows={routeData}>
            {routeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={routeData} margin={{left:10,right:20,bottom:10}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Quad Single" stackId="route" fill="#6f3cff"/><Bar dataKey="Quad Double" stackId="route" fill="#24f66f"/><Bar dataKey="Buggy" stackId="route" fill="#ff8b00"/><Bar dataKey="Unspecified Type" stackId="route" fill="#a7a0b2"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No route data.</div>}
        </VehicleChartCard>
        <VehicleChartCard title="Planned vs Actual Time OUT" subtitle="Compares planned trip duration with exact actual OUT → IN duration." rows={plannedVsActualData}>
            {plannedVsActualData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={plannedVsActualData} margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip/><Legend/><Bar dataKey="plannedHours" name="Planned hours" fill="#a7a0b2"/><Bar dataKey="actualHours" name="Actual hours" fill="#6f3cff"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No planned vs actual data.</div>}
        </VehicleChartCard>
      </div>

      <Table headers={["Exact Out Time", "Exact In Time", "Vehicle", "Invoice", "Guide", "Biking Type", "Route", "Planned Duration", "Actual Total Time Out"]}>
        {selectedHistory.map(o=><tr key={o.id}><td>{fmt(o.startDateTime)}</td><td>{o.endDateTime ? fmt(o.endDateTime) : 'Still out'}</td><td><b>{o.vehicle}</b></td><td>{o.invoiceNumber || '-'}</td><td>{o.guideName || '-'}</td><td>{activityLabel(o)}</td><td>{routeLabel(o)}</td><td>{o.tripDuration || '-'}</td><td>{niceDuration(secondsBetween(o.startDateTime,o.endDateTime,clock))}</td></tr>)}
        {!selectedHistory.length && <tr><td colSpan="9">No vehicle activity found for the selected filter.</td></tr>}
      </Table>
      <p className="muted">By default this summary shows today only. Change the filter to see last 7 days, month, year, or a manual date range.</p>
    </Card>}

    {tab!=='history' && <Card className="section-small"><h2>Today's Vehicle Activity</h2><Table headers={["Exact Out Time","Exact In Time","Vehicle","Invoice","Guide","Biking Type","Route","Actual Time Out"]}>{todaysTrips.map(r=><tr key={r.id}><td>{fmt(r.startDateTime)}</td><td>{r.endDateTime ? fmt(r.endDateTime) : 'Still out'}</td><td><b>{r.vehicle}</b></td><td>{r.invoiceNumber || '-'}</td><td>{r.guideName || '-'}</td><td>{activityLabel(r)}</td><td>{routeLabel(r)}</td><td>{niceDuration(secondsBetween(r.startDateTime,r.endDateTime,clock))}</td></tr>)}{!todaysTrips.length && <tr><td colSpan="8">No vehicle activity today.</td></tr>}</Table></Card>}
    {tab!=='history' && <Card className="section-small"><h2>Previous Vehicle Activity</h2><Table headers={["Exact Out Time","Exact In Time","Vehicle","Invoice","Guide","Biking Type","Route","Actual Time Out"]}>{previousTrips.map(r=><tr key={r.id}><td>{fmt(r.startDateTime)}</td><td>{r.endDateTime ? fmt(r.endDateTime) : 'Still out'}</td><td><b>{r.vehicle}</b></td><td>{r.invoiceNumber || '-'}</td><td>{r.guideName || '-'}</td><td>{activityLabel(r)}</td><td>{routeLabel(r)}</td><td>{niceDuration(secondsBetween(r.startDateTime,r.endDateTime,clock))}</td></tr>)}{!previousTrips.length && <tr><td colSpan="8">No previous records yet.</td></tr>}</Table></Card>}
  </div>;
}
