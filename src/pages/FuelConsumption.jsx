import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useApp } from '../context/AppContext.jsx';

function fmtDate(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function normPlate(v){ return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function dayKey(v){ return String(v || '').slice(0,10); }
function ymKey(v){ return String(v || '').slice(0,7); }
function yearKey(v){ return String(v || '').slice(0,4); }
function addDays(dateStr, days){ const d = new Date(`${dateStr}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10); }
function inDateRange(rowDate, from, to){ if(!rowDate) return false; if(from && rowDate < from) return false; if(to && rowDate > to) return false; return true; }
function monthName(ym){ if(!ym) return '-'; const [y,m]=ym.split('-').map(Number); if(!y || !m) return ym; return new Date(y,m-1,1).toLocaleString('en-GB',{month:'long',year:'numeric'}); }
function vehicleTypeForFuel(row, vehicles){
  const p = normPlate(row.vehicle || row.vehiclePlate || '');
  const v = (vehicles || []).find(x => normPlate(x.plate || x.plateNumber) === p || x.id === row.vehicleId || x.dbId === row.vehicleId);
  return String(v?.vehicleType || v?.type || 'Unknown').toUpperCase();
}
function vehiclePlateForFuel(row){ return String(row.vehicle || row.vehiclePlate || '-').toUpperCase(); }
function fuelValue(row){ return Number(row.fuelLitres ?? row.litres ?? 0) || 0; }

const CHART_COLORS = ['#6f3cff', '#24f66f', '#ff8b00', '#2bb7ff', '#a7a0b2', '#ff315f', '#7c3aed', '#0ea5e9'];

function ChartTooltip({ active, payload, label, suffix = '' }){
  if(!active || !payload?.length) return null;
  return <div className="analytics-tooltip"><b>{label}</b>{payload.map((p,i)=><span key={i}>{p.name}: {p.value}{suffix}</span>)}</div>;
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
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'chart'}-data.xlsx`);
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
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'chart'}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }
  return <div className="chart-export-menu">
    <button type="button" className="mini-export-btn" onClick={()=>setOpen(v=>!v)}>Download ▾</button>
    {open && <div className="chart-export-popover"><button type="button" onClick={exportXlsx}>Excel XLSX</button><button type="button" onClick={exportCsv}>CSV</button></div>}
  </div>;
}

function FuelChartCard({ title, subtitle, rows, children }){
  return <Card className="chart-card pro-chart-card">
    <div className="card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><ChartExportMenu title={title} rows={rows}/></div>
    <div className="chart-box">{children}</div>
  </Card>;
}

export default function FuelConsumption(){
  const { vehicles = [], fuelConsumptions = [], addFuelConsumption, nowLocalInput, findVehicleByPlate } = useApp();
  const [plateSearch, setPlateSearch] = useState('');
  const [form,setForm] = useState({ vehicleId:'', fuelType:'PETROL', meterType:'KM', meterReading:'', fuelLitres:'', notes:'' });
  const [message,setMessage] = useState('');
  const today = nowLocalInput().slice(0,10);
  const [period,setPeriod] = useState('today');
  const [manualFrom,setManualFrom] = useState(today);
  const [manualTo,setManualTo] = useState(today);
  const [manualMonth,setManualMonth] = useState(ymKey(today));
  const [manualYear,setManualYear] = useState(yearKey(today));

  const suggestions = useMemo(()=>{
    const q = plateSearch.trim().toLowerCase();
    if(!q) return [];
    if (vehicles.some(v => normPlate(v.plate) === normPlate(q))) return [];
    return vehicles.filter(v => `${v.plate} ${v.model} ${v.vin} ${v.type}`.toLowerCase().includes(q)).slice(0, 8);
  }, [plateSearch, vehicles]);

  function selectVehicle(v){ setPlateSearch(v.plate); setForm(prev => ({ ...prev, vehicleId: v.dbId || v.id })); }

  async function submit(e){
    e.preventDefault();
    const selected = vehicles.find(v => v.id === form.vehicleId || v.dbId === form.vehicleId) || findVehicleByPlate(plateSearch);
    if(!selected){ setMessage('Please select a valid vehicle from the dropdown.'); return; }
    if(!form.fuelLitres || Number(form.fuelLitres) <= 0){ setMessage('Please enter fuel consumption in litres.'); return; }
    await addFuelConsumption({ ...form, vehicleId: selected.dbId || selected.id });
    setMessage(`Fuel saved for ${selected.plate}. Reports are available in the Reports page.`);
    setForm(prev => ({ ...prev, meterReading:'', fuelLitres:'', notes:'' }));
  }

  const periodLabel = useMemo(()=>{
    if(period === 'today') return 'Today';
    if(period === 'last7') return 'Last 7 days';
    if(period === 'month') return monthName(manualMonth);
    if(period === 'year') return `Year ${manualYear}`;
    return `${manualFrom || '-'} to ${manualTo || '-'}`;
  },[period,manualFrom,manualTo,manualMonth,manualYear]);

  const filteredFuel = useMemo(()=>{
    const from7 = addDays(today, -6);
    return fuelConsumptions.filter(r => {
      const d = dayKey(r.recordedAt || r.createdAt);
      if(!d) return false;
      if(period === 'today') return d === today;
      if(period === 'last7') return inDateRange(d, from7, today);
      if(period === 'month') return ymKey(r.recordedAt || r.createdAt) === manualMonth;
      if(period === 'year') return yearKey(r.recordedAt || r.createdAt) === String(manualYear || yearKey(today));
      if(period === 'manual') return inDateRange(d, manualFrom, manualTo);
      return d === today;
    }).sort((a,b)=>String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')));
  },[fuelConsumptions,period,manualFrom,manualTo,manualMonth,manualYear,today]);

  const oldRecords = useMemo(()=>fuelConsumptions.filter(r => dayKey(r.recordedAt) !== today).slice(0,30),[fuelConsumptions,today]);

  const fuelTrend = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => { const k = dayKey(r.recordedAt || r.createdAt); if(k) map[k] = (map[k] || 0) + fuelValue(r); });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([label, litres]) => ({ label, litres: Number(litres.toFixed(2)) }));
  }, [filteredFuel]);

  const fuelByVehicleType = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => { const k = vehicleTypeForFuel(r, vehicles); map[k] = (map[k] || 0) + fuelValue(r); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [filteredFuel, vehicles]);

  const fuelByVehiclePlate = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => { const k = vehiclePlateForFuel(r); map[k] = (map[k] || 0) + fuelValue(r); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([label, litres]) => ({ label, litres: Number(litres.toFixed(2)) }));
  }, [filteredFuel]);

  const fuelByType = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => { const k = String(r.fuelType || 'UNKNOWN').toUpperCase(); map[k] = (map[k] || 0) + fuelValue(r); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
  }, [filteredFuel]);

  const fuelVisitCountByVehicleType = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => {
      const k = vehicleTypeForFuel(r, vehicles);
      map[k] = map[k] || { label:k, entries:0, litres:0 };
      map[k].entries += 1;
      map[k].litres += fuelValue(r);
    });
    return Object.values(map).sort((a,b)=>b.entries-a.entries).map(x => ({ ...x, litres:Number(x.litres.toFixed(2)) }));
  }, [filteredFuel, vehicles]);

  const fuelVisitCountByPlate = useMemo(() => {
    const map = {};
    filteredFuel.forEach((r) => {
      const plate = vehiclePlateForFuel(r);
      const type = vehicleTypeForFuel(r, vehicles);
      const key = `${plate} • ${type}`;
      map[key] = map[key] || { label:key, vehiclePlate:plate, vehicleType:type, entries:0, litres:0 };
      map[key].entries += 1;
      map[key].litres += fuelValue(r);
    });
    return Object.values(map).sort((a,b)=>b.entries-a.entries || b.litres-a.litres).slice(0,20).map(x => ({ ...x, litres:Number(x.litres.toFixed(2)) }));
  }, [filteredFuel, vehicles]);

  const fuelReportRows = useMemo(() => filteredFuel.map((r) => ({
    recordedDateTime: fmtDate(r.recordedAt || r.createdAt),
    vehiclePlate: vehiclePlateForFuel(r),
    vehicleType: vehicleTypeForFuel(r, vehicles),
    fuelType: String(r.fuelType || '').toUpperCase(),
    litres: fuelValue(r),
    meterReading: r.meterReading ?? '-',
    meterType: r.meterType || 'KM',
    recordedBy: r.recordedBy || '-',
    notes: r.notes || '-'
  })), [filteredFuel, vehicles]);

  const totalLitres = filteredFuel.reduce((s,r)=>s+fuelValue(r),0);
  const avgLitres = filteredFuel.length ? totalLitres / filteredFuel.length : 0;

  return <div className="page fuel-page">
    <PageHeader title="Fuel Management System" subtitle="Record fuel entries and view accurate live fuel analytics from database records." />

    <Card className="section-small">
      <h2>Record Fuel Entry</h2>
      <p className="muted">Start typing the quad / vehicle plate. Data is loaded from the database and appears in the dropdown.</p>
      {message && <div className="notice success">{message}</div>}
      <form onSubmit={submit} className="form-grid four">
        <Field label="Search / Select Vehicle Plate">
          <Input list="fuel-vehicle-list" placeholder="Type plate, e.g. AP 100" value={plateSearch} onChange={e=>{ setPlateSearch(e.target.value.toUpperCase()); setForm(prev=>({...prev, vehicleId:''})); }} />
          <datalist id="fuel-vehicle-list">{vehicles.map(v => <option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}</datalist>
          {suggestions.length > 0 && <div className="suggestion-panel">{suggestions.map(v => <button type="button" key={v.dbId || v.id} onClick={()=>selectVehicle(v)}><b>{v.plate}</b><span>{v.model || v.type} {v.cc ? `• ${v.cc}` : ''}</span></button>)}</div>}
        </Field>
        <Field label="Fuel Type"><select className="input" value={form.fuelType} onChange={e=>setForm({...form,fuelType:e.target.value})}><option value="PETROL">Petrol</option><option value="DIESEL">Diesel</option><option value="OIL">Oil</option></select></Field>
        <Field label="Meter Type"><select className="input" value={form.meterType} onChange={e=>setForm({...form,meterType:e.target.value})}><option value="KM">Kilometres / KM</option><option value="HRS">Hours / HRS</option></select></Field>
        <Field label="Meter Reading"><Input type="number" step="0.01" value={form.meterReading} onChange={e=>setForm({...form,meterReading:e.target.value})} /></Field>
        <Field label="Fuel Consumption / L"><Input type="number" step="0.01" value={form.fuelLitres} onChange={e=>setForm({...form,fuelLitres:e.target.value})} /></Field>
        <Field label="Recorded Date & Time"><div className="locked-time-display"><b>{fmtDate(nowLocalInput())}</b></div></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional" /></Field>
        <Field label="Save"><Button>Save Fuel Entry</Button></Field>
      </form>
    </Card>

    <Card className="section-small fuel-filter-card">
      <div className="card-head"><div><h2>Fuel Analytics Filter</h2><p>Choose the period used by every chart and report below. Default is Today.</p></div><ChartExportMenu title="Full Fuel Analytics Report" rows={fuelReportRows}/></div>
      <div className="form-grid six">
        <Field label="Period"><select className="input" value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="last7">Last 7 days</option><option value="month">Specific month</option><option value="year">Specific year</option><option value="manual">Manual range</option></select></Field>
        {period === 'month' && <Field label="Month"><Input type="month" value={manualMonth} onChange={e=>setManualMonth(e.target.value)} /></Field>}
        {period === 'year' && <Field label="Year"><Input type="number" min="2020" max="2100" value={manualYear} onChange={e=>setManualYear(e.target.value)} /></Field>}
        {period === 'manual' && <Field label="From"><Input type="date" value={manualFrom} onChange={e=>setManualFrom(e.target.value)} /></Field>}
        {period === 'manual' && <Field label="To"><Input type="date" value={manualTo} onChange={e=>setManualTo(e.target.value)} /></Field>}
      </div>
    </Card>

    <div className="fuel-analytics-grid section-small">
      <Card className="metric-card"><span>Selected Period</span><b style={{fontSize:'1.45rem'}}>{periodLabel}</b><small>Charts below use this filter</small></Card>
      <Card className="metric-card"><span>Total Fuel Recorded</span><b>{totalLitres.toFixed(2)} L</b><small>{filteredFuel.length} database record(s)</small></Card>
      <Card className="metric-card"><span>Average Fuel Entry</span><b>{avgLitres.toFixed(2)} L</b><small>Per fuel record in selected filter</small></Card>

      <FuelChartCard title="Fuel Consumption Trend" subtitle="Litres by recorded date/time from filtered database records." rows={fuelTrend}>
        {fuelTrend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={fuelTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip content={<ChartTooltip suffix=" L"/>}/><Area type="monotone" dataKey="litres" name="Fuel litres" stroke="#6f3cff" fill="#ede7ff" strokeWidth={3}/></AreaChart></ResponsiveContainer> : <div className="empty-chart">No fuel data for selected filter.</div>}
      </FuelChartCard>

      <FuelChartCard title="Fuel by Vehicle Category" subtitle="Vehicle type keys and litres consumed in the selected filter." rows={fuelByVehicleType}>
        {fuelByVehicleType.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fuelByVehicleType} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} label={({name,value})=>`${name}: ${value}L`}>{fuelByVehicleType.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip/><Legend layout="horizontal" verticalAlign="bottom" align="center"/></PieChart></ResponsiveContainer> : <div className="empty-chart">No vehicle category fuel data for selected filter.</div>}
      </FuelChartCard>

      <FuelChartCard title="Fuel by Vehicle Plate" subtitle="Which exact vehicle plates consumed fuel in the selected filter." rows={fuelByVehiclePlate}>
        {fuelByVehiclePlate.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={fuelByVehiclePlate}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip content={<ChartTooltip suffix=" L"/>}/><Bar dataKey="litres" name="Fuel litres" fill="#6f3cff"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No vehicle plate fuel data for selected filter.</div>}
      </FuelChartCard>

      <FuelChartCard title="Fuel Type Usage" subtitle="Petrol, diesel and oil split from filtered records." rows={fuelByType}>
        {fuelByType.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={fuelByType}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip content={<ChartTooltip suffix=" L"/>}/><Bar dataKey="value" name="Fuel litres" fill="#24f66f"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No fuel type data for selected filter.</div>}
      </FuelChartCard>

      <FuelChartCard title="Fuel Visits by Vehicle Type" subtitle="Count of fuel-up records by vehicle type for the selected period." rows={fuelVisitCountByVehicleType}>
        {fuelVisitCountByVehicleType.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={fuelVisitCountByVehicleType}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="entries" name="Fuel-up count" fill="#ff8b00"/><Bar dataKey="litres" name="Litres" fill="#2bb7ff"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No fuel visit count by vehicle type.</div>}
      </FuelChartCard>

      <FuelChartCard title="Fuel Visits by Vehicle Plate" subtitle="Exact plates and vehicle types that came for fuel-up." rows={fuelVisitCountByPlate}>
        {fuelVisitCountByPlate.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={fuelVisitCountByPlate} layout="vertical" margin={{left:80,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={120}/><Tooltip/><Legend/><Bar dataKey="entries" name="Fuel-up count" fill="#6f3cff"/><Bar dataKey="litres" name="Litres" fill="#24f66f"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No fuel plate count data.</div>}
      </FuelChartCard>
    </div>

    <Card>
      <h2>Fuel Records for Selected Filter</h2>
      <p className="muted">Showing exact records used by the charts above.</p>
      <Table headers={["Date", "Vehicle", "Vehicle Type", "Fuel", "Meter", "Litres", "Recorded By", "Notes"]}>
        {filteredFuel.map(r => <tr key={r.id}><td>{fmtDate(r.recordedAt)}</td><td><b>{r.vehicle}</b></td><td>{vehicleTypeForFuel(r, vehicles)}</td><td>{r.fuelType}</td><td>{r.meterReading} {r.meterType}</td><td><b>{fuelValue(r)} L</b></td><td>{r.recordedBy || '-'}</td><td>{r.notes || '-'}</td></tr>)}
        {!filteredFuel.length && <tr><td colSpan="8">No fuel records for selected filter.</td></tr>}
      </Table>
    </Card>

    <Card><h2>Previous Fuel Records</h2><Table headers={["Date", "Vehicle", "Fuel", "Meter", "Litres", "Recorded By"]}>{oldRecords.map(r => <tr key={r.id}><td>{fmtDate(r.recordedAt)}</td><td><b>{r.vehicle}</b></td><td>{r.fuelType}</td><td>{r.meterReading} {r.meterType}</td><td><b>{fuelValue(r)} L</b></td><td>{r.recordedBy || '-'}</td></tr>)}{!oldRecords.length && <tr><td colSpan="6">No previous records yet.</td></tr>}</Table></Card>
  </div>;
}
