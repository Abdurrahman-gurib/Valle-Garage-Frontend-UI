import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Badge, Card, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function n(v){ return Number(v || 0); }
function money(v){ return `MUR ${n(v).toLocaleString(undefined,{maximumFractionDigits:0})}`; }
function ym(v){ const d = v ? new Date(v) : new Date(); return Number.isNaN(d.getTime()) ? 'Unknown' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function hoursBetween(a,b){ const s=a?new Date(a):null; const e=b?new Date(b):new Date(); return s && !Number.isNaN(s.getTime()) ? Math.max(0,(e-s)/36e5) : 0; }
function group(rows, key, val=()=>1){
  return Object.entries(rows.reduce((a,r)=>{ const k=key(r)||'Unknown'; a[k]=(a[k]||0)+val(r); return a; },{}))
    .map(([label,value])=>({label,value:Number(value||0)}))
    .sort((a,b)=>b.value-a.value);
}
function partName(p){ return p?.name || p?.partName || p?.part || p?.sku || 'Manual Part'; }
function partCost(p){ return n(p?.lineTotal) || n(p?.qty || p?.quantity || 1) * n(p?.sellingPrice || p?.price || p?.lastPrice || 0); }
function chartRows(rows, limit=8){ return (rows || []).slice(0,limit).map(r=>({ ...r, short: String(r.label).length > 12 ? `${String(r.label).slice(0,12)}…` : r.label })); }
function roleLabel(role){ return role === 'admin' ? 'Admin' : role === 'mechanic' ? 'Mechanic' : role === 'store' ? 'Store Keeper' : 'User'; }

const chartColors = ['#24f66f', '#6f3cff', '#ff315f', '#ffd84d', '#2b0048'];

function Kpi({ label, value, note, tone='neutral', onClick }){
  return <Card onClick={onClick} className={`metric-card kpi-card kpi-${tone}`}>
    <span>{label}</span>
    <b>{value}</b>
    <small>{note}</small>
  </Card>;
}
function ChartCard({ title, subtitle, children, badge, tone='neutral' }){
  return <Card className="chart-card live-chart-card">
    <div className="card-head">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {badge && <Badge tone={tone}>{badge}</Badge>}
    </div>
    <div className="chart-box">{children}</div>
  </Card>;
}
function EmptyChart({ text='No data yet.' }){ return <div className="empty-chart"><span>{text}</span></div>; }
function BarList({ rows, suffix='', cost=false }){
  const max = Math.max(...rows.map(x=>n(x.value)), 1);
  return <div className="bar-list-chart">{rows.map((x,i)=><div key={`${x.label}-${i}`} className="bar-list-row">
    <div className="bar-list-meta"><b>{x.label}</b><span>{cost ? money(x.value) : `${n(x.value).toLocaleString()}${suffix}`}</span></div>
    <div className="bar-list-track"><em style={{width:`${Math.min(100,n(x.value)/max*100)}%`}} /></div>
  </div>)}</div>;
}

export default function Dashboard(){
  const navigate = useNavigate();
  const {
    currentUser,
    vehicles,
    inventory,
    assessments,
    garageOps,
    fuelConsumptions,
    vehicleOutActivities,
    guestTickets,
  } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const isMechanic = currentUser?.role === 'mechanic';

  const activeGarage = garageOps.filter(g => !['Completed','Cancelled','Delivered'].includes(g.status));
  const lowStock = inventory.filter(i => n(i.stock) <= n(i.reorderLevel));
  const openAssessments = assessments.filter(a => !['Completed'].includes(a.status));
  const pendingGuests = (guestTickets || []).filter(t => String(t.status || '').toLowerCase() === 'pending');
  const garageTickets = garageOps.filter(g => !['Completed','Cancelled'].includes(g.status));
  const totalFuel = fuelConsumptions.reduce((s,f)=>s+n(f.fuelLitres),0);
  const repairCost = garageOps.reduce((s,g)=>s+(g.partsUsed||[]).reduce((x,p)=>x+partCost(p),0),0);
  const outHours = vehicleOutActivities.reduce((s,o)=>s+hoursBetween(o.startDateTime,o.endDateTime),0);
  const partsIssued = garageOps.flatMap(g => (g.partsUsed || []).map(p => ({...p, vehicle:g.vehicle})));

  const monthlyFuel = useMemo(()=>group(fuelConsumptions, f=>ym(f.recordedAt), f=>n(f.fuelLitres)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-8),[fuelConsumptions]);
  const monthlyRepair = useMemo(()=>group(garageOps, g=>ym(g.createdAt || g.checkInDateTime), g=>(g.partsUsed||[]).reduce((s,p)=>s+partCost(p),0)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-8),[garageOps]);
  const mostRepaired = useMemo(()=>group(garageOps, g=>g.vehicle).slice(0,10),[garageOps]);
  const topParts = useMemo(()=>group(partsIssued, p=>partName(p), p=>n(p.qty||p.quantity||1)).slice(0,10),[partsIssued]);
  const vehicleOutFreq = useMemo(()=>group(vehicleOutActivities, o=>o.vehicle).slice(0,10),[vehicleOutActivities]);
  const mechanicWork = useMemo(()=>group(garageOps.flatMap(g => g.mechanicHours?.length ? g.mechanicHours : [{ mechanic:g.mechanic, hours:n(String(g.labor||'0').replace('hrs','')) || 1 }]), m=>m.mechanic || 'Unassigned', m=>n(m.hours||1)).slice(0,10),[garageOps]);

  const dashboardCards = isMechanic ? [
    ['Vehicles', vehicles.length, 'Open fleet records', '/vehicles', 'neutral'],
    ['In Garage', activeGarage.length, 'Repair / service queue', '/garage', 'warning'],
    ['Assessments', openAssessments.length, 'Open diagnosis records', '/assessments', 'neutral'],
    ['Garage Tickets', garageTickets.length, 'Active garage jobs', '/garage', 'warning'],
    ['Guest Tickets', pendingGuests.length, 'Drop-off waiting mechanic', '/guest-pending', pendingGuests.length ? 'danger' : 'success'],
  ] : [
    ['Vehicles', vehicles.length, 'Open fleet records', '/vehicles', 'neutral'],
    ['In Garage', activeGarage.length, 'Repair / service queue', '/garage', 'warning'],
    ['Low Stock', lowStock.length, 'Needs reorder', '/inventory', lowStock.length ? 'danger' : 'success'],
    ['Assessments', openAssessments.length, 'Open diagnosis records', '/assessments', 'neutral'],
    ['Garage Tickets', garageTickets.length, 'Active garage jobs', '/garage', 'warning'],
    ['Guest Tickets', pendingGuests.length, 'Drop-off waiting mechanic', '/guest-pending', pendingGuests.length ? 'danger' : 'success'],
  ];

  return <div className="page dashboard-analytics-page">
    <PageHeader
      title={isAdmin ? 'Admin Analytics Dashboard' : `Today’s ${roleLabel(currentUser?.role)} Dashboard`}
      subtitle={isAdmin ? 'Advanced operational visibility with fuel, repair cost, vehicle movement, stock risk and mechanic productivity.' : 'Simple view of tasks and records that need attention.'}
      action={isAdmin ? ()=>navigate('/reports') : undefined}
      actionLabel="Open Advanced Reports"
    />

    <div className={`stats-grid same-row-stats ${isMechanic ? 'mechanic-stats-grid' : 'admin-stats-grid'}`}>
      {dashboardCards.map(([label,value,note,path,tone]) => <Kpi key={label} label={label} value={value} note={note} tone={tone} onClick={()=>navigate(path)} />)}
    </div>

    {isAdmin && <>
      <div className="stats-grid analytics-grid admin-analytics-kpis">
        <Kpi label="Fuel Used" value={`${Math.round(totalFuel)} L`} note="All recorded fuel entries" tone="success" onClick={()=>navigate('/reports')} />
        <Kpi label="Repair Cost" value={money(repairCost)} note="Parts cost from garage records" tone="warning" onClick={()=>navigate('/reports')} />
        <Kpi label="Vehicle Out Time" value={`${Math.round(outHours)}h`} note="Total activity duration" tone="neutral" onClick={()=>navigate('/vehicle-out')} />
        <Kpi label="Parts Risk" value={lowStock.length} note="Items at/below reorder level" tone={lowStock.length?'danger':'success'} onClick={()=>navigate('/inventory')} />
      </div>

      <div className="chart-grid two-column-charts">
        <ChartCard title="Monthly Fuel Consumption" subtitle="Litres by month from fuel records" badge="Fuel" tone="success">
          {monthlyFuel.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyFuel}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#24f66f" fill="#24f66f" fillOpacity={0.24} strokeWidth={3} /></AreaChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Repair Cost per Month" subtitle="Parts selling value used in garage work" badge="Cost" tone="warning">
          {monthlyRepair.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRepair}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(v)=>money(v)} /><Bar dataKey="value" fill="#6f3cff" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Most Repaired Vehicles" subtitle="Top vehicles by garage frequency" badge="Fleet" tone="neutral">
          {mostRepaired.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartRows(mostRepaired,10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="short" /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(label, data)=>data?.[0]?.payload?.label || label} /><Line type="monotone" dataKey="value" stroke="#ff315f" strokeWidth={4} dot={{ r: 5 }} /></LineChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Mechanic Productivity" subtitle="Hours recorded per mechanic" badge="Team" tone="success">
          {mechanicWork.length ? <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={chartRows(mechanicWork,8)}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="short" width={90} /><Tooltip labelFormatter={(label, data)=>data?.[0]?.payload?.label || label} /><Bar dataKey="value" fill="#24f66f" radius={[0,8,8,0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Top 10 Parts Used" subtitle="Fast-moving parts from repair jobs" badge="Parts" tone="warning">
          {topParts.length ? <BarList rows={topParts} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Vehicle Out Frequency" subtitle="How many times each vehicle went out" badge="Activity" tone="neutral">
          {vehicleOutFreq.length ? <BarList rows={vehicleOutFreq} /> : <EmptyChart />}
        </ChartCard>
      </div>
    </>}

    <div className="dashboard-grid">
      <Card><div className="card-head"><h2>Vehicle Work Queue</h2><button onClick={() => navigate('/vehicles')} className="outline-btn">View all</button></div><p>Latest vehicle records and status.</p><div className="mini-table">{vehicles.slice(0,10).map(v=><button key={v.id} onClick={()=>navigate(`/vehicles/${encodeURIComponent(v.plate)}`)}><b>{v.plate}</b><span>{v.type}</span><Badge tone={v.status==='Active'?'success':'warning'}>{v.status}</Badge><span>{v.checkInDateTime || `${v.hours} hrs`}</span></button>)}</div></Card>
      <Card><h2>Next Actions</h2><p>Operational alerts for management.</p><div className="task-list"><button onClick={()=>navigate('/inventory')}>Review {lowStock.length} low-stock items</button><button onClick={()=>navigate('/garage')}>Close {activeGarage.length} active garage tickets</button><button onClick={()=>navigate('/assessments')}>Review {openAssessments.length} open assessments</button>{isMechanic && <button onClick={()=>navigate('/guest-pending')}>Review {pendingGuests.length} guest tickets</button>}{isAdmin && <button onClick={()=>navigate('/audit-trail')}>Open audit trail</button>}<button onClick={()=>navigate('/reports')}>Export management report</button></div></Card>
    </div>
  </div>;
}
