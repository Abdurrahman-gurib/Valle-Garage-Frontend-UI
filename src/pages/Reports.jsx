import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  Scatter, ScatterChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { Badge, Button, Card, Field, Input, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function n(v){ return Number(v || 0); }
function money(v){ return `MUR ${n(v).toLocaleString(undefined,{maximumFractionDigits:0})}`; }
function toDate(v){ const d=v?new Date(v):null; return d && !Number.isNaN(d.getTime()) ? d : null; }
function dayKey(v){ const d=toDate(v)||new Date(); return d.toISOString().slice(0,10); }
function ym(v){ const d=toDate(v)||new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function weekKey(v){ const d=toDate(v)||new Date(); const first=new Date(d.getFullYear(),0,1); const diff=Math.floor((d-first)/86400000); return `${d.getFullYear()}-W${String(Math.ceil((diff+first.getDay()+1)/7)).padStart(2,'0')}`; }
function secs(a,b){ const s=toDate(a); const e=toDate(b)||new Date(); return s ? Math.max(0,Math.floor((e-s)/1000)) : 0; }
function dur(s){ s=Math.max(0,Math.floor(n(s))); const d=Math.floor(s/86400); s%=86400; const h=Math.floor(s/3600); s%=3600; const m=Math.floor(s/60); const sec=s%60; return d ? `${d}d ${h}h ${m}m ${sec}s` : `${h}h ${m}m ${sec}s`; }
function partQty(p){ return n(p?.qty || p?.quantity || 1); }
function unitCost(p){ return n(p?.costPrice ?? p?.unitCostPrice ?? p?.inventoryItem?.costPrice ?? 0); }
function unitSelling(p){ return n(p?.sellingPrice ?? p?.unitSellingPrice ?? p?.price ?? p?.lastPrice ?? p?.inventoryItem?.sellingPrice ?? 0); }
function partsCostTotal(p){ return n(p?.lineCostTotal ?? p?.costTotal) || partQty(p) * unitCost(p); }
function partsChargedTotal(p){ return n(p?.lineSellingTotal ?? p?.sellingTotal ?? p?.lineTotal) || partQty(p) * unitSelling(p); }
function partMargin(p){ return n(p?.margin) || partsChargedTotal(p) - partsCostTotal(p); }
function partCost(p){ return partsCostTotal(p); }
function group(rows,key,val=()=>1){ return Object.entries((rows||[]).reduce((a,r)=>{ const k=key(r)||'Unknown'; a[k]=(a[k]||0)+val(r); return a; },{})).map(([label,value])=>({label,value:Number(value||0)})).sort((a,b)=>b.value-a.value); }
function chrono(rows,key,val=()=>1){ return group(rows,key,val).sort((a,b)=>String(a.label).localeCompare(String(b.label))); }
function csv(rows){ return rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); }
function download(name, text, type='text/csv;charset=utf-8'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function printPdf(title){ const old=document.title; document.title=title; window.print(); setTimeout(()=>{document.title=old;},300); }

function formatFullDateTime(value){
  const d = toDate(value);
  if(!d) return value || '-';
  const pad = x => String(x).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function dateParts(value){
  const d = toDate(value);
  if(!d) return { date:'-', time:'-', day:'-', month:'-', year:'-' };
  const pad = x => String(x).padStart(2,'0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    day: pad(d.getDate()),
    month: `${d.getFullYear()}-${pad(d.getMonth()+1)}`,
    year: `${d.getFullYear()}`,
  };
}

async function exportProfessionalXlsx({ fileName, title, reportType, filters, headers, rows, summaryRows = [], currentUser = {}, sourcePage = 'Executive Reports & System Tracking' }){
  const XLSX = await import('xlsx');
  const generatedAt = formatFullDateTime(new Date());
  const readableReportType = String(reportType || '').replaceAll('-', ' ').toUpperCase();
  const meta = [
    ['VALLÉ GARAGE OPERATIONS'],
    [title || `${readableReportType} Extract`],
    [],
    ['Source Page', sourcePage],
    ['Exported From', 'Live database records displayed in Reports module'],
    ['Exported By', currentUser?.name || '-'],
    ['User Email', currentUser?.email || '-'],
    ['User Role', currentUser?.role || '-'],
    ['Exported Date/Time', generatedAt],
    ['Report Name', readableReportType],
    ['Selected Period', periodLabel(filters)],
    ['Manual From', filters.from || '-'],
    ['Manual To', filters.to || '-'],
    ['Manual Month', filters.month || '-'],
    ['Manual Year', filters.year || '-'],
    ['Plate Search', filters.plate || '-'],
    ['Rows Exported', rows?.length || 0],
    [],
    ['Summary'],
    ...summaryRows,
    [],
    headers,
    ...rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(meta);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Valle Report');

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  worksheet['!cols'] = headers.map((h, i) => ({ wch: Math.max(14, String(h).length + 4, ...rows.map(r => String(r[i] ?? '').length + 2).slice(0, 250)) }));
  worksheet['!cols'][0] = { wch: 22 };
  worksheet['!cols'][1] = { wch: 14 };
  worksheet['!cols'][2] = { wch: 14 };
  worksheet['!cols'][3] = { wch: 12 };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 14 };

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: '24F66F' } }, fill: { fgColor: { rgb: '2B0048' } } };
  }

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
function plate(v){
  const raw = v?.vehicle || v?.plate || v?.vehiclePlate || v?.vehicle?.plateNumber || '';
  const clean = String(raw || '').trim();
  return clean || 'Unknown';
}
function localStartOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function localEndOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
function daysAgo(days){ const d = new Date(); d.setDate(d.getDate() - days); return d; }
function periodOk(value, f){
  const d = toDate(value);
  if(!d) return false;

  const now = new Date();
  let start = null;
  let end = null;

  if(f.period === 'today'){
    start = localStartOfDay(now);
    end = localEndOfDay(now);
  }

  if(f.period === 'week'){
    start = localStartOfDay(daysAgo(6));
    end = localEndOfDay(now);
  }

  if(f.period === 'month'){
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if(f.period === 'year'){
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  if(f.period === 'manual-date'){
    start = f.from ? new Date(`${f.from}T00:00:00`) : null;
    end = f.to ? new Date(`${f.to}T23:59:59`) : null;
  }

  if(f.period === 'manual-month'){
    const source = f.month || f.from?.slice(0, 7);
    if(source){
      const [year, month] = source.split('-').map(Number);
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    }
  }

  if(f.period === 'manual-year'){
    const year = Number(f.year || new Date().getFullYear());
    if(year){
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }
  }

  return (!start || d >= start) && (!end || d <= end);
}
function periodLabel(filters){
  if(filters.period === 'today') return 'Today only';
  if(filters.period === 'week') return 'Last 7 days';
  if(filters.period === 'month') return 'Current month';
  if(filters.period === 'year') return 'Current year, all months';
  if(filters.period === 'manual-date') return `Manual date: ${filters.from || 'start'} to ${filters.to || 'end'}`;
  if(filters.period === 'manual-month') return `Manual month: ${filters.month || filters.from?.slice(0,7) || '-'}`;
  if(filters.period === 'manual-year') return `Manual year: ${filters.year || '-'}`;
  return filters.period || '-';
}
function chartKeyForPeriod(filters, value){
  if(filters.period === 'year' || filters.period === 'manual-year') return ym(value);
  if(filters.period === 'manual-month' || filters.period === 'month' || filters.period === 'week' || filters.period === 'today' || filters.period === 'manual-date') return dayKey(value);
  return dayKey(value);
}
function chartPeriodText(filters){
  if(filters.period === 'year' || filters.period === 'manual-year') return 'by month';
  return 'by date';
}
const COLORS=['#24f66f','#6f3cff','#ff315f','#ffd84d','#2bb7ff','#2b0048','#ff8b00'];

function Kpi({label,value,note,onClick}){ return <Card onClick={onClick} className={`metric-card ${onClick?'clickable-card':''}`}><span>{label}</span><b>{value}</b><small>{note}</small></Card>; }
function ChartCard({title,subtitle,badge,children,onExport}){ return <Card className="chart-card report-chart-card"><div className="card-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><div className="chart-card-tools">{badge&&<Badge>{badge}</Badge>}{onExport&&<Button variant="secondary" onClick={onExport}>Export XLSX</Button>}</div></div><div className="chart-box">{children}</div></Card>; }
function Empty(){ return <div className="empty-chart"><span>No data for selected filter.</span></div>; }
function BarList({rows,suffix='',cost=false,onSelect}){ const max=Math.max(...(rows||[]).map(r=>n(r.value)),1); if(!rows?.length) return <Empty/>; return <div className="bar-list-chart">{rows.map((r,i)=><button type="button" key={`${r.label}-${i}`} className="bar-list-row" onClick={()=>onSelect?.(r.label)}><div className="bar-list-meta"><b>{r.label}</b><span>{r.displayValue || r.durationLabel || (cost?money(r.value):`${n(r.value).toLocaleString()}${suffix}`)}</span></div>{r.subLabel && <small className="bar-list-sub">{r.subLabel}</small>}<div className="bar-list-track"><em style={{width:`${Math.min(100,n(r.value)/max*100)}%`}}/></div></button>)}</div>; }

function ChartTooltip({active,payload,label,valueLabel='Value',suffix='',xAxisName='X Axis',yAxisName}) {
  if(!active || !payload?.length) return null;
  const item = payload[0]?.payload || {};
  const raw = payload[0]?.value;
  const isMoney = String(valueLabel).toLowerCase().includes('cost') || String(valueLabel).toLowerCase().includes('mur') || String(valueLabel).toLowerCase().includes('amount');
  return <div className="analytics-tooltip">
    <b>{item.plate || item.label || label}</b>
    <span>{xAxisName}: {item.label || label}</span>
    <span>{yAxisName || valueLabel}: {item.displayValue || (isMoney ? money(raw) : `${n(raw).toLocaleString()}${suffix}`)}</span>
    {item.ticketCountLabel && <span>{item.ticketCountLabel}</span>}
    {item.durationLabel && <span>Duration: {item.durationLabel}</span>}
    {item.outTimesLabel && <span>Out time(s): {item.outTimesLabel}</span>}
    {item.statusLabel && <span>Status: {item.statusLabel}</span>}
  </div>;
}

export default function Reports(){
  const { currentUser, inventory, assessments, garageOps, fuelConsumptions, vehicleOutActivities, refreshAll } = useApp();
  const role=currentUser?.role;
  const [filters,setFilters]=useState({ reportType:'all', period:'today', from:'', to:'', month:'', year:String(new Date().getFullYear()), plate:'' });
  const [selected,setSelected]=useState('');
  const [liveNow,setLiveNow]=useState(()=>Date.now());
  useEffect(()=>{ const timer=setInterval(()=>setLiveNow(Date.now()),1000); return ()=>clearInterval(timer); },[]);
  const isAdmin=role==='admin', isFuel=role==='fuel', isVehicle=role==='vehicle_manager', isStore=role==='store';

  const data=useMemo(()=>{
    const plateQ=String(filters.plate||selected||'').toLowerCase();
    const fuel=fuelConsumptions.filter(f=>periodOk(f.recordedAt,filters)&&(!plateQ||String(f.vehicle).toLowerCase().includes(plateQ)));
    const out=vehicleOutActivities.filter(o=>periodOk(o.startDateTime,filters)&&(!plateQ||String(o.vehicle).toLowerCase().includes(plateQ)));
    const ass=assessments.filter(a=>periodOk(a.createdAt,filters)&&(!plateQ||String(a.vehicle).toLowerCase().includes(plateQ)));
    const ops=garageOps.filter(g=>periodOk(g.start||g.createdAt,filters)&&(!plateQ||String(g.vehicle).toLowerCase().includes(plateQ)));
    const issuedParts=ass.flatMap(a=>(a.parts||[]).map(p=>({...p, vehicle:a.vehicle, ticket:a.id, date:a.createdAt, source:'Issued / Deducted from Store'})));
    const usedParts=[];
    const partsForCost=issuedParts;
    return { fuel,out,ass,ops,issuedParts,usedParts,partsForCost };
  },[fuelConsumptions,vehicleOutActivities,assessments,garageOps,filters,selected]);

  const vehicleCostRows = useMemo(() => {
    return data.ass.map((a) => {
      const linkedGarage = data.ops.filter((g) =>
        g.assessmentId && (g.assessmentId === a.dbId || g.assessmentId === a.id)
      );
      const garageParts = linkedGarage.flatMap((g) =>
        (g.partsUsed || []).map((p) => ({ ...p, date: g.checkInDateTime || g.start || g.createdAt, source: 'Garage Parts' }))
      );
      const assessmentParts = (a.parts || []).map((p) => ({ ...p, date: a.createdAt, source: 'Assessment Parts' }));
      const finalParts = garageParts.length ? garageParts : assessmentParts;
      const totalCost = finalParts.reduce((s, p) => s + partsCostTotal(p), 0);
      const totalCharged = finalParts.reduce((s, p) => s + partsChargedTotal(p), 0);
      const totalMargin = totalCharged - totalCost;
      return {
        date: a.createdAt,
        vehicle: a.vehicle,
        assessmentId: a.id,
        status: a.status,
        mechanic: a.mechanic,
        repairDone: linkedGarage.map((g) => g.workDone || g.type || g.status).filter(Boolean).join('; ') || a.conclusion || a.issue || '',
        parts: finalParts,
        partsText: finalParts.map((p) => `${p.name || p.partName || 'Part'} x${p.qty || p.quantity || 1}`).join('; '),
        totalCost,
        totalCharged,
        totalMargin,
        costPerTicket: totalCost,
        chargedPerTicket: totalCharged,
        marginPerTicket: totalMargin,
        costPerGarageVisit: totalCost,
        chargedPerGarageVisit: totalCharged,
        marginPerGarageVisit: totalMargin,
        garageVisitCount: 1,
        garageCount: linkedGarage.length,
      };
    });
  }, [data.ass, data.ops]);

  const analytics=useMemo(()=>({
    fuelByPeriod: chrono(data.fuel,f=>chartKeyForPeriod(filters, f.recordedAt),f=>n(f.fuelLitres)),
    fuelByWeek: chrono(data.fuel,f=>weekKey(f.recordedAt),f=>n(f.fuelLitres)),
    fuelByMonth: chrono(data.fuel,f=>ym(f.recordedAt),f=>n(f.fuelLitres)),
    fuelByVehicle: group(data.fuel,f=>f.vehicle,f=>n(f.fuelLitres)).slice(0,15),
    fuelByVehicleDay: group(data.fuel,f=>`${dayKey(f.recordedAt)} • ${f.vehicle}`,f=>n(f.fuelLitres)).slice(0,20),
    outByPeriod: chrono(data.out,o=>chartKeyForPeriod(filters, o.startDateTime)),
    outByWeek: chrono(data.out,o=>weekKey(o.startDateTime)),
    outByMonth: chrono(data.out,o=>ym(o.startDateTime)),
    outByVehicle: group(data.out,o=>o.vehicle).slice(0,15),
    outVehicleDots: group(data.out,o=>o.vehicle).slice(0,15).map((row,index)=>{ const trips=data.out.filter(o=>(o.vehicle||'Unknown')===row.label); return { ...row, x:index+1, y:row.value, plate:row.label, displayValue:`${row.value} ticket(s)`, ticketCountLabel:`Tickets: ${row.value}`, outTimesLabel:trips.map(o=>formatFullDateTime(o.startDateTime)).join(', '), statusLabel:trips.some(o=>!o.endDateTime)?'Currently out / open':'Returned / closed' }; }),
    outDuration: group(data.out,o=>o.vehicle,o=>secs(o.startDateTime,o.endDateTime)).slice(0,15).map(row=>({ ...row, displayValue:dur(row.value), durationLabel:dur(row.value), subLabel:'Hours, minutes and seconds - not raw seconds' })),
    repairsByPeriod: chrono(data.ops,g=>chartKeyForPeriod(filters, g.start||g.createdAt)),
    repairsByWeek: chrono(data.ops,g=>weekKey(g.start||g.createdAt)),
    repairsByMonth: chrono(data.ops,g=>ym(g.start||g.createdAt)),
    garageVisitsByPeriod: chrono(data.ass,a=>chartKeyForPeriod(filters, a.createdAt)),
    repairCostByDay: chrono(data.partsForCost,p=>dayKey(p.date),partsCostTotal),
    repairCostByWeek: chrono(data.partsForCost,p=>weekKey(p.date),partsCostTotal),
    repairCostByMonth: chrono(data.partsForCost,p=>ym(p.date),partsCostTotal),
    repairCostByVehicle: group(data.partsForCost,p=>p.vehicle,partsCostTotal).slice(0,15),
    partsChargedByVehicle: group(data.partsForCost,p=>p.vehicle,partsChargedTotal).slice(0,15),
    partsMarginByVehicle: group(data.partsForCost,p=>p.vehicle,partMargin).slice(0,15),
    vehicleCostByPeriod: chrono(vehicleCostRows, r=>chartKeyForPeriod(filters, r.date), r=>r.totalCost),
    vehicleChargedByPeriod: chrono(vehicleCostRows, r=>chartKeyForPeriod(filters, r.date), r=>r.totalCharged),
    vehicleMarginByPeriod: chrono(vehicleCostRows, r=>chartKeyForPeriod(filters, r.date), r=>r.totalMargin),
    vehicleCostByWeek: chrono(vehicleCostRows, r=>weekKey(r.date), r=>r.totalCost),
    vehicleCostByYear: chrono(vehicleCostRows, r=>String(toDate(r.date)?.getFullYear() || 'Unknown'), r=>r.totalCost),
    vehicleCostByVehicle: group(vehicleCostRows, r=>r.vehicle, r=>r.totalCost).slice(0,20),
    vehicleChargedByVehicle: group(vehicleCostRows, r=>r.vehicle, r=>r.totalCharged).slice(0,20),
    vehicleMarginByVehicle: group(vehicleCostRows, r=>r.vehicle, r=>r.totalMargin).slice(0,20),
    partsIssued: group(data.issuedParts,p=>p.name || p.sku || 'Part',p=>n(p.qty||1)).slice(0,10),
    partsUsed: [],
    lowStock: inventory.filter(i=>n(i.stock)<=n(i.reorderLevel)).slice(0,20)
  }),[data,inventory,vehicleCostRows,filters,liveNow]);

  const allowedReports = isFuel ? ['fuel'] : isVehicle ? ['vehicle-out'] : isStore ? ['parts','low-stock','garage','vehicle-cost','cost','all'] : ['all','fuel','vehicle-out','garage','vehicle-cost','parts','cost','mechanics','low-stock'];
  const effectiveReport = allowedReports.includes(filters.reportType) ? filters.reportType : allowedReports[0];

  function reportHeaders(){
    if(effectiveReport==='fuel') return ['Stored Date/Time','Date','Time','Month','Year','Vehicle Plate','Fuel Type','Quantity (L)','Meter Type','Meter Reading','Recorded By','Notes'];
    if(effectiveReport==='vehicle-out') return ['Out Date/Time','Out Date','Out Time','Out Month','Out Year','In Date/Time','Vehicle Plate','Invoice','Guide','Activity','Duration (Days/Hrs/Mins/Secs)','Destination','Notes'];
    if(effectiveReport==='parts') return ['Stored Date/Time','Date','Time','Month','Year','Vehicle Plate','Ticket','Part Name','Quantity','Unit Cost Price','Unit Selling Price','Cost Price Total','Selling Price Total','Margin','Issued By','Source'];
    if(effectiveReport==='low-stock') return ['Extracted Date/Time','SKU','Part','Stock','Reorder Level','Supplier','Category','Location'];
    if(effectiveReport==='mechanics') return ['Stored Date/Time','Date','Time','Month','Year','Vehicle Plate','Ticket','Status','Mechanic','Issue/Work','Notes'];
    if(effectiveReport==='vehicle-cost') return ['Stored Date/Time','Date','Time','Month','Year','Vehicle Plate','Garage Visit Count','Assessment Ticket','Repair Done','Parts Given','Parts Cost','Parts Charged','Margin','Mechanic','Status'];
    return ['Stored Date/Time','Date','Time','Month','Year','Vehicle Plate','Ticket','Status','Garage Visit','Parts Cost','Parts Charged','Margin','Mechanic','Notes'];
  }

  const tableRows = useMemo(()=>{
    if(effectiveReport==='fuel') return data.fuel.map(f=>{
      const dp = dateParts(f.recordedAt);
      return [formatFullDateTime(f.recordedAt), dp.date, dp.time, dp.month, dp.year, f.vehicle, f.fuelType, f.fuelLitres, f.meterType, f.meterReading, f.recordedBy, f.notes || ''];
    });
    if(effectiveReport==='vehicle-out') return data.out.map(o=>{
      const dp = dateParts(o.startDateTime);
      return [formatFullDateTime(o.startDateTime), dp.date, dp.time, dp.month, dp.year, o.endDateTime ? formatFullDateTime(o.endDateTime) : 'Currently Out', o.vehicle, o.invoiceNumber, o.guideName, o.quadActivity, dur(secs(o.startDateTime,o.endDateTime)), o.destination || '', o.notes || ''];
    });
    if(effectiveReport==='parts') return data.issuedParts.map(p=>{
      const dp = dateParts(p.issuedAt || p.date);
      return [formatFullDateTime(p.issuedAt || p.date), dp.date, dp.time, dp.month, dp.year, p.vehicle, p.ticket, p.name, partQty(p), unitCost(p), unitSelling(p), partsCostTotal(p), partsChargedTotal(p), partMargin(p), p.issuedBy || '-', p.source];
    });
    if(effectiveReport==='low-stock') return analytics.lowStock.map(i=>[formatFullDateTime(new Date()), i.sku, i.name, i.stock, i.reorderLevel, i.supplierName||'', i.category || '', i.location || '']);
    if(effectiveReport==='vehicle-cost') return vehicleCostRows.map(r=>{ const dp = dateParts(r.date); return [formatFullDateTime(r.date), dp.date, dp.time, dp.month, dp.year, r.vehicle, r.garageVisitCount, r.assessmentId, r.repairDone, r.partsText, r.totalCost, r.totalCharged, r.totalMargin, r.mechanic, r.status]; });
    if(effectiveReport==='mechanics') return data.ops.map(g=>{
      const dp = dateParts(g.start || g.createdAt);
      return [formatFullDateTime(g.start || g.createdAt), dp.date, dp.time, dp.month, dp.year, g.vehicle, g.id, g.status, g.mechanic, g.type || g.processType || '', g.notes || ''];
    });
    return data.ass.map(a=>{
      const dp = dateParts(a.createdAt);
      const costRow = vehicleCostRows.find(r => r.assessmentId === a.id);
      const cost = Number(costRow?.totalCost || 0);
      const charged = Number(costRow?.totalCharged || 0);
      const margin = Number(costRow?.totalMargin || 0);
      return [formatFullDateTime(a.createdAt), dp.date, dp.time, dp.month, dp.year, a.vehicle, a.id, a.status, '1 visit', cost, charged, margin, a.mechanic || '', a.issue || a.issuesDetected || ''];
    });
  },[effectiveReport,data,analytics.lowStock,vehicleCostRows]);

  async function exportRows(format){
    const headers = reportHeaders();
    if(format==='pdf') return printPdf(`Valle-${effectiveReport}-report`);
    if(format==='csv') return download(`valle-${effectiveReport}-report.csv`, csv([headers,...tableRows]), 'text/csv;charset=utf-8');

    const summaryRows = [
      ['Rows Returned', tableRows.length],
      ['Fuel Litres', data.fuel.reduce((s,f)=>s+n(f.fuelLitres),0)],
      ['Vehicle Out Count', data.out.length],
      ['Garage Visits', data.ass.length],
      ['Parts Issued Rows', data.issuedParts.length],
      ['Parts Cost Total', data.partsForCost.reduce((s,p)=>s+partsCostTotal(p),0)],
      ['Parts Charged Total', data.partsForCost.reduce((s,p)=>s+partsChargedTotal(p),0)],
      ['Margin Total', data.partsForCost.reduce((s,p)=>s+partMargin(p),0)],
      ['Vehicle Cost Total', vehicleCostRows.reduce((s,r)=>s+r.totalCost,0)],
      ['Vehicle Charged Total', vehicleCostRows.reduce((s,r)=>s+r.totalCharged,0)],
      ['Vehicle Margin Total', vehicleCostRows.reduce((s,r)=>s+r.totalMargin,0)],
    ];
    return exportProfessionalXlsx({
      fileName: `valle-${effectiveReport}-report`,
      title: `${String(effectiveReport).replaceAll('-', ' ').toUpperCase()} Extract`,
      reportType: effectiveReport,
      filters,
      headers,
      rows: tableRows,
      summaryRows,
      currentUser,
      sourcePage: 'Executive Reports & System Tracking',
    });
  }


  function exportChartXlsx(name, rows, headers=['Label','Value']){
    return exportProfessionalXlsx({
      fileName:`valle-chart-${name}`,
      title:`${name.replaceAll('-', ' ').toUpperCase()} Chart Export`,
      reportType:name,
      filters,
      headers,
      rows:(rows||[]).map(r=>[r.label, r.value]),
      summaryRows:[['Rows Exported',(rows||[]).length]],
      currentUser,
      sourcePage:'Reports Chart / Analytics',
    });
  }

  return <div className="page reports-page">
    <PageHeader title="Executive Reports & System Tracking" subtitle="Super admin reporting centre with exact filters: today only, last 7 days, current month, current year by all months, manual date, manual month and manual year. Parts report shows only parts issued/deducted from store." />
    <div className="toolbar report-toolbar">
      <Field label="Report Type"><select value={effectiveReport} onChange={e=>setFilters({...filters,reportType:e.target.value})}>{allowedReports.map(r=><option key={r} value={r}>{r==='vehicle-out'?'Vehicle In / Out':r==='vehicle-cost'?'Vehicle Cost Report':r.replace('-',' ').toUpperCase()}</option>)}</select></Field>
      <Field label="Period"><select value={filters.period} onChange={e=>setFilters({...filters,period:e.target.value})}><option value="today">Today Only</option><option value="week">Last 7 Days</option><option value="month">Current Month</option><option value="year">Current Year - All Months</option><option value="manual-date">Manual Date Range</option><option value="manual-month">Manual Month</option><option value="manual-year">Manual Year</option></select></Field>
      {filters.period === 'manual-date' && <Field label="From"><Input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></Field>}
      {filters.period === 'manual-date' && <Field label="To"><Input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></Field>}
      {filters.period === 'manual-month' && <Field label="Choose Month"><Input type="month" value={filters.month} onChange={e=>setFilters({...filters,month:e.target.value})}/></Field>}
      {filters.period === 'manual-year' && <Field label="Choose Year"><Input type="number" min="2020" max="2100" value={filters.year} onChange={e=>setFilters({...filters,year:e.target.value})}/></Field>}
      <Field label="Plate Search"><Input placeholder="AP 03..." value={filters.plate} onChange={e=>setFilters({...filters,plate:e.target.value})}/></Field>
      <div className="form-actions align-end"><Button onClick={()=>{setSelected('');refreshAll();}}>Apply Filter</Button><Button variant="secondary" onClick={()=>exportRows('csv')}>CSV</Button><Button variant="secondary" onClick={()=>exportRows('excel')}>Excel XLSX</Button><Button variant="secondary" onClick={()=>exportRows('pdf')}>PDF</Button></div>
    </div>

    <Card className="report-period-indicator">
      <div>
        <b>Active filter:</b> {periodLabel(filters)}
      </div>
      <div>
        <b>Report:</b> {String(effectiveReport).replaceAll('-', ' ').toUpperCase()}
      </div>
      <div>
        <b>Rows ready:</b> {tableRows.length}
      </div>
      <div>
        <b>Export by:</b> {currentUser?.name || '-'} / {currentUser?.email || '-'}
      </div>
    </Card>

    {selected && <Card className="section-small"><div className="notice info">Interactive filter selected: <b>{selected}</b>. Clear it by clicking Apply Filter.</div></Card>}

    <div className="metrics-grid">
      {(isAdmin||isFuel) && <Kpi label="Fuel Litres" value={`${data.fuel.reduce((s,f)=>s+n(f.fuelLitres),0).toFixed(1)} L`} note={`${data.fuel.length} fuel records`} onClick={()=>setFilters({...filters,reportType:'fuel'})}/>}
      {(isAdmin||isVehicle) && <Kpi label="Vehicle Out" value={data.out.length} note={`Total duration ${dur(data.out.reduce((s,o)=>s+secs(o.startDateTime,o.endDateTime),0))}`} onClick={()=>setFilters({...filters,reportType:'vehicle-out'})}/>}
      {isAdmin && <Kpi label="Garage Visits" value={data.ass.length} note="Exact: one assessment = one visit" onClick={()=>setFilters({...filters,reportType:'garage'})}/>}
      {(isAdmin||isStore) && <Kpi label="Parts Issued" value={data.issuedParts.length} note="Not summed with garage-used parts" onClick={()=>setFilters({...filters,reportType:'parts'})}/>}
      {isAdmin && <Kpi label="Parts Cost / Charged / Margin" value={money(vehicleCostRows.reduce((s,r)=>s+r.totalCost,0))} note={`Charged ${money(vehicleCostRows.reduce((s,r)=>s+r.totalCharged,0))} • Margin ${money(vehicleCostRows.reduce((s,r)=>s+r.totalMargin,0))}`} onClick={()=>setFilters({...filters,reportType:'vehicle-cost'})}/>}
    </div>

    <div className="analytics-grid">
      {(isAdmin||isFuel) && <>
        <ChartCard title="Fuel Consumption" subtitle="Litres filtered by selected period"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.fuelByPeriod}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Date", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Fuel Litres", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Fuel" suffix=" L" xAxisName="Date" yAxisName="Fuel Litres" />}/><Area dataKey="value" fill="#24f66f" stroke="#24f66f" onClick={(d)=>setSelected(d?.payload?.label)}/></AreaChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Fuel by Vehicle Plate" subtitle="Click a bar to filter by vehicle"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.fuelByVehicle}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Vehicle Plate", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Fuel Litres", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Fuel" suffix=" L" xAxisName="Vehicle Plate" yAxisName="Fuel Litres" />}/><Bar dataKey="value" fill="#6f3cff" onClick={(d)=>setSelected(d?.label)}/></BarChart></ResponsiveContainer></ChartCard>
      </>}
      {(isAdmin||isVehicle) && <>
        <ChartCard title="Vehicle Out Frequency" subtitle="Each dot is a vehicle. Hover shows plate, ticket count and every out time for the selected period.">{analytics.outVehicleDots.length?<ResponsiveContainer width="100%" height="100%"><ScatterChart data={analytics.outVehicleDots}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="x" type="number" name="Vehicle" tickFormatter={(v)=>analytics.outVehicleDots[v-1]?.plate || v} label={{ value: "X Axis: Vehicle Plate", position: "insideBottom", offset: -3 }}/><YAxis dataKey="y" type="number" name="Tickets" allowDecimals={false} label={{ value: "Y Axis: Ticket Count", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Trips" xAxisName="Vehicle Plate" yAxisName="Ticket Count" />}/><Scatter dataKey="y" fill="#ff315f" /></ScatterChart></ResponsiveContainer>:<Empty/>}</ChartCard>
        <ChartCard title="Out Duration by Vehicle" subtitle="Exact accumulated out time by vehicle in days, hours, minutes and seconds."><BarList rows={analytics.outDuration} onSelect={setSelected}/></ChartCard>
      </>}
      {isAdmin && <>
        <ChartCard title="Repaired Vehicles" subtitle="Garage work jobs filtered by selected period" onExport={()=>exportChartXlsx('repaired-vehicles', analytics.repairsByPeriod)}><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.repairsByPeriod}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Date", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Repair Count", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Repairs" xAxisName="Date" yAxisName="Repair Count" />}/><Bar dataKey="value" fill="#2bb7ff"/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Repair Cost Per Month" subtitle="Parts cost only, no duplicate assessment/work total"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.repairCostByMonth}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Month", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Parts Cost (MUR)", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Repair Cost" xAxisName="Month" yAxisName="Parts Cost" />}/><Area dataKey="value" fill="#ffd84d" stroke="#ff315f"/></AreaChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Garage Visits" subtitle="One assessment = one garage visit" onExport={()=>exportChartXlsx('garage-visits', analytics.garageVisitsByPeriod)}><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.garageVisitsByPeriod}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Date", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Visit Count", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Garage Visits" xAxisName="Date" yAxisName="Visit Count" />}/><Line dataKey="value" stroke="#24f66f" strokeWidth={3}/></LineChart></ResponsiveContainer></ChartCard>
      </>}
      {isAdmin && <>
        <ChartCard title="Vehicle Cost Trend" subtitle="Cost per ticket/garage visit. One assessment + linked garage repair is counted once." onExport={()=>exportChartXlsx('vehicle-cost-trend', analytics.vehicleCostByPeriod)}><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.vehicleCostByPeriod}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" label={{ value: "X Axis: Month", position: "insideBottom", offset: -3 }}/><YAxis label={{ value: "Y Axis: Vehicle Cost (MUR)", angle: -90, position: "insideLeft" }}/><Tooltip content={<ChartTooltip valueLabel="Vehicle Cost" xAxisName="Month" yAxisName="Cost" />}/><Area dataKey="value" fill="#6f3cff" stroke="#2b0048"/></AreaChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Vehicle Cost / Charged by Plate" subtitle="Total and per-visit cost by vehicle plate from assessment/garage combined rows." onExport={()=>exportChartXlsx('vehicle-cost-by-plate', analytics.vehicleCostByVehicle)}><BarList rows={analytics.vehicleCostByVehicle} cost onSelect={setSelected}/></ChartCard>
      </>}
      {(isAdmin||isStore) && <>
        <ChartCard title="Parts Issued" subtitle="Store Keeper issued parts only" onExport={()=>exportChartXlsx('parts-issued', analytics.partsIssued)}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.partsIssued} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} onClick={(d)=>setSelected(d?.label)}>{analytics.partsIssued.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip content={<ChartTooltip valueLabel="Quantity" xAxisName="Part" yAxisName="Quantity" />}/></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Low Stock Risk" subtitle="Items at/below reorder level" onExport={()=>exportChartXlsx('low-stock-risk', analytics.lowStock.map(i=>({label:i.name,value:n(i.stock)})))}><BarList rows={analytics.lowStock.map(i=>({label:i.name,value:n(i.stock)}))} onSelect={setSelected}/></ChartCard>
      </>}
    </div>

    <Card>
      <div className="card-head"><div><h2>Report Result Table</h2><p>Filtered database results with stored date/time, vehicle plate, ticket, visit count, repair details and costs. Use the period dropdown below to extract by today, last 7 days, month, year or manual range.</p></div><div className="chart-card-tools"><select className="chart-period-select" value={filters.period} onChange={e=>setFilters({...filters,period:e.target.value})}><option value="today">Today Only</option><option value="week">Last 7 Days</option><option value="month">Current Month</option><option value="year">Current Year - All Months</option><option value="manual-date">Manual Date Range</option><option value="manual-month">Manual Month</option><option value="manual-year">Manual Year</option></select><Badge>{tableRows.length} rows</Badge></div></div>
      {(() => {
        const headers = reportHeaders();
        return <div className="table-wrap table-responsive" role="region" aria-label="Responsive report result table" tabIndex={0}><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{tableRows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} data-label={headers[j] || ''}>{cell || '-'}</td>)}</tr>)}</tbody></table></div>;
      })()}
    </Card>
  </div>;
}
