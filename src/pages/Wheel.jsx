import React, { useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function fmt(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }
function norm(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function periodOk(value, period, custom={}){
  if(!period || period==='all') return true;
  const d=value?new Date(value):null; if(!d || Number.isNaN(d.getTime())) return false;
  const now=new Date();
  if(period==='today') return d.toISOString().slice(0,10)===todayKey();
  if(period==='7days') return d>=new Date(now.getTime()-7*86400000);
  if(period==='month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  if(period==='year') return d.getFullYear()===now.getFullYear();
  if(period==='manual'){
    const from=custom.from?new Date(custom.from):null;
    const to=custom.to?new Date(custom.to+'T23:59:59'):null;
    return (!from||d>=from)&&(!to||d<=to);
  }
  return true;
}

const DEFAULT_WHEELS=[
  {id:'WHEEL-QF', sku:'WH-QUAD-FRONT', wheelType:'Quad Front Wheel', vehicleClass:'Quad', size:'Front 10 inch', stock:12, reorderLevel:4, location:'Wheel rack A', condition:'Ready'},
  {id:'WHEEL-QR', sku:'WH-QUAD-REAR', wheelType:'Quad Rear Wheel', vehicleClass:'Quad', size:'Rear 10 inch', stock:10, reorderLevel:4, location:'Wheel rack A', condition:'Ready'},
  {id:'WHEEL-QSET', sku:'WH-QUAD-SET', wheelType:'Quad Full Set', vehicleClass:'Quad', size:'Front/Rear set', stock:6, reorderLevel:2, location:'Wheel rack A', condition:'Ready'},
  {id:'WHEEL-BUGGY-F', sku:'WH-BUGGY-FRONT', wheelType:'Buggy Front Wheel', vehicleClass:'Buggy', size:'12 inch front', stock:8, reorderLevel:3, location:'Wheel rack B', condition:'Ready'},
  {id:'WHEEL-BUGGY-R', sku:'WH-BUGGY-REAR', wheelType:'Buggy Rear Wheel', vehicleClass:'Buggy', size:'12 inch rear', stock:8, reorderLevel:3, location:'Wheel rack B', condition:'Ready'},
  {id:'WHEEL-HD', sku:'WH-HD-JEEP', wheelType:'Heavy Duty Jeep Wheel', vehicleClass:'Heavy Duty / Jeep', size:'Heavy duty', stock:4, reorderLevel:2, location:'Wheel rack C', condition:'Ready'}
];

export default function Wheel(){
  const { currentUser, vehicles, wheelRequests=[], addWheelRequest, updateWheelRequest, nowLocalInput } = useApp();
  const [q,setQ]=useState('');
  const [stockSearch,setStockSearch]=useState('');
  const [period,setPeriod]=useState('today');
  const [custom,setCustom]=useState({from:'',to:''});
  const [editStock,setEditStock]=useState(null);
  const [stock,setStock]=useState(()=>{ try{return JSON.parse(localStorage.getItem('valle-wheel-stock')||'null')||DEFAULT_WHEELS}catch{return DEFAULT_WHEELS} });
  const [form,setForm]=useState({ vehicleId:'', reason:'', wheels:[{wheelType:'Quad Front Wheel', quantity:1}] });
  const [msg,setMsg]=useState('');
  const isStore = ['admin','store'].includes(currentUser?.role);
  const isMechanic = ['admin','mechanic'].includes(currentUser?.role);
  const suggestions = useMemo(()=>{ const qq=q.toLowerCase().trim(); if(!qq) return []; if(vehicles.some(v=>norm(v.plate)===norm(q))) return []; return vehicles.filter(v=>`${v.plate} ${v.type} ${v.model}`.toLowerCase().includes(qq)).slice(0,8); },[q,vehicles]);
  const selected = vehicles.find(v=>v.id===form.vehicleId || v.dbId===form.vehicleId) || vehicles.find(v=>norm(v.plate)===norm(q));
  const filteredRequests = wheelRequests.filter(w=>periodOk(w.issuedAt || w.createdAt, period, custom));
  const issuedToday = wheelRequests.filter(w=>String(w.issuedAt||'').slice(0,10)===todayKey() && w.status==='ISSUED').reduce((s,w)=>s+Number(w.quantity||1),0);
  const pending = wheelRequests.filter(w=>w.status==='REQUESTED').length;
  const filteredStock=stock.filter(w=>`${w.sku} ${w.wheelType} ${w.vehicleClass} ${w.size} ${w.location} ${w.condition}`.toLowerCase().includes(stockSearch.toLowerCase()));
  const wheelDestinationRows = Object.values(filteredRequests.reduce((acc,w)=>{ const k=w.vehicleType||'Unknown'; acc[k]=acc[k]||{label:k,value:0}; acc[k].value+=Number(w.quantity||1); return acc;},{})).sort((a,b)=>b.value-a.value);
  function saveStock(next){ setStock(next); localStorage.setItem('valle-wheel-stock',JSON.stringify(next)); }
  function updateWheelLine(i,patch){ setForm(f=>({...f,wheels:f.wheels.map((w,idx)=>idx===i?{...w,...patch}:w)})); }
  function addWheelLine(){ setForm(f=>({...f,wheels:[...f.wheels,{wheelType:'Quad Front Wheel', quantity:1}]})); }
  function removeWheelLine(i){ setForm(f=>({...f,wheels:f.wheels.filter((_,idx)=>idx!==i)})); }
  async function submit(e){ e.preventDefault(); if(!selected){ setMsg('Select a vehicle first.'); return; } const lines=form.wheels.filter(w=>w.wheelType && Number(w.quantity)>0); if(!lines.length){ setMsg('Add at least one wheel line.'); return; } for(const line of lines){ await addWheelRequest({...line, reason:form.reason, vehicleId:selected.dbId||selected.id, vehicleType:selected.type}); } setMsg(`${lines.length} wheel request line(s) sent for ${selected.plate}.`); setForm({ vehicleId:'', reason:'', wheels:[{wheelType:'Quad Front Wheel', quantity:1}] }); setQ(''); }
  async function issue(w){ await updateWheelRequest(w.id,{status:'ISSUED', issuedAt:nowLocalInput?.() || new Date().toISOString()}); const qty=Number(w.quantity||1); saveStock(stock.map(s=>s.wheelType===w.wheelType?{...s,stock:Math.max(0,Number(s.stock||0)-qty)}:s)); }
  async function exportXlsx(){ const XLSX=await import('xlsx'); const rows=[...filteredStock.map(x=>({...x, section:'Wheel Stock'})), ...filteredRequests.map(x=>({section:'Wheel Request', createdAt:fmt(x.createdAt), vehicle:x.vehicle, vehicleType:x.vehicleType, wheelType:x.wheelType, quantity:x.quantity, reason:x.reason, status:x.status, issuedAt:fmt(x.issuedAt)}))]; const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{note:'No data'}]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Wheel Report'); XLSX.writeFile(wb,`wheel-report-${period}.xlsx`); }
  return <div className="page wheel-page"><PageHeader title="Wheel" subtitle="Wheel stock, sizes, multiple mechanic requests, store issuing, period filters and XLSX reporting." />{msg && <div className="notice success">{msg}</div>}
    <div className="stats-grid section-small"><Card className="metric-card"><span>Pending Wheel Requests</span><b>{pending}</b><small>Waiting store action</small></Card><Card className="metric-card"><span>Wheel Issued Today</span><b>{issuedToday}</b><small>Live issued quantity today</small></Card><Card className="metric-card"><span>Total Wheel Stock</span><b>{stock.reduce((s,w)=>s+Number(w.stock||0),0)}</b><small>All wheel quantities</small></Card><Card className="metric-card"><span>Low Wheel Stock</span><b>{stock.filter(w=>Number(w.stock||0)<=Number(w.reorderLevel||0)).length}</b><small>At/below reorder</small></Card></div>
    {isMechanic && <Card><h2>Mechanic Wheel Request</h2><p className="muted">One vehicle can request multiple wheel types in one flow.</p><form className="form-grid four" onSubmit={submit}><Field label="Search / Select Vehicle"><Input value={q} onChange={e=>{setQ(e.target.value.toUpperCase()); setForm({...form,vehicleId:''});}} placeholder="Type plate" />{suggestions.length>0 && <div className="suggestion-panel professional-suggestion-panel">{suggestions.map(v=><button type="button" key={v.dbId||v.id} onClick={()=>{setQ(v.plate); setForm({...form,vehicleId:v.dbId||v.id});}}><b>{v.plate}</b><span>{v.type} {v.model}</span></button>)}</div>}</Field><Field label="Vehicle Type"><Input value={selected?.type || ''} readOnly /></Field><Field label="Reason"><Input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Puncture, damage, replacement..." /></Field><Field label="Submit"><Button>Send Wheel Request</Button></Field></form><div className="table-wrap"><table><thead><tr><th>Wheel Type</th><th>Size / Location</th><th>Qty</th><th>Action</th></tr></thead><tbody>{form.wheels.map((line,i)=>{ const wh=stock.find(s=>s.wheelType===line.wheelType); return <tr key={i}><td><select className="input" value={line.wheelType} onChange={e=>updateWheelLine(i,{wheelType:e.target.value})}>{stock.map(s=><option key={s.id}>{s.wheelType}</option>)}</select></td><td>{wh?.size || '-'} • {wh?.location || '-'}</td><td><Input type="number" min="1" value={line.quantity} onChange={e=>updateWheelLine(i,{quantity:e.target.value})}/></td><td>{form.wheels.length>1 && <Button type="button" variant="secondary" onClick={()=>removeWheelLine(i)}>Remove</Button>}</td></tr>})}</tbody></table></div><Button type="button" variant="secondary" onClick={addWheelLine}>+ Add Another Wheel Type</Button></Card>}
    <Card className="section-small"><div className="card-head"><div><h2>Wheel Stock Table</h2><p>Like Parts: edit stock, wheel type, size, quantity, reorder and location.</p></div><Button onClick={exportXlsx}>Export XLSX</Button></div><div className="toolbar"><Input value={stockSearch} onChange={e=>setStockSearch(e.target.value)} placeholder="Search wheel type, size, SKU, location..." /> <select className="input" value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="7days">Last 7 Days</option><option value="month">This Month</option><option value="year">This Year</option><option value="all">All</option><option value="manual">Manual Date</option></select>{period==='manual'&&<><Input type="date" value={custom.from} onChange={e=>setCustom({...custom,from:e.target.value})}/><Input type="date" value={custom.to} onChange={e=>setCustom({...custom,to:e.target.value})}/></>}</div><Table headers={["SKU", "Wheel Type", "Vehicle", "Size", "Stock", "Reorder", "Location", "Condition", "Status", "Action"]}>{filteredStock.map(w=><tr key={w.id}><td><b>{w.sku}</b></td><td>{editStock===w.id?<Input value={w.wheelType} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,wheelType:e.target.value}:x))}/>:w.wheelType}</td><td>{editStock===w.id?<Input value={w.vehicleClass} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,vehicleClass:e.target.value}:x))}/>:w.vehicleClass}</td><td>{editStock===w.id?<Input value={w.size} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,size:e.target.value}:x))}/>:w.size}</td><td><Input type="number" value={w.stock} disabled={!isStore} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,stock:e.target.value}:x))}/></td><td>{editStock===w.id?<Input type="number" value={w.reorderLevel} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,reorderLevel:e.target.value}:x))}/>:w.reorderLevel}</td><td>{editStock===w.id?<Input value={w.location} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,location:e.target.value}:x))}/>:w.location}</td><td>{editStock===w.id?<Input value={w.condition} onChange={e=>saveStock(stock.map(x=>x.id===w.id?{...x,condition:e.target.value}:x))}/>:w.condition}</td><td><span className={Number(w.stock)<=Number(w.reorderLevel)?'badge danger':'badge ok'}>{Number(w.stock)<=Number(w.reorderLevel)?'Low':'OK'}</span></td><td>{isStore?<><Button onClick={()=>setEditStock(editStock===w.id?null:w.id)}>{editStock===w.id?'Done':'Edit'}</Button><Button variant="secondary" onClick={()=>saveStock(stock.map(x=>x.id===w.id?{...x,stock:Number(x.stock||0)+1}:x))}>+1</Button></>:'-'}</td></tr>)}</Table></Card>
    <Card className="section-small"><h2>Wheel Requests / Issue Table</h2><p className="muted">Filtered period applies to issue date or request date. Wheel requests are included in store/admin reporting.</p><div className="dashboard-chart-grid mini"><Card><h3>Wheel Issued by Vehicle Type</h3>{wheelDestinationRows.map(r=><p key={r.label}><b>{r.label}</b>: {r.value} wheel(s)</p>)}</Card></div><Table headers={["Created", "Vehicle", "Type", "Wheel", "Qty", "Reason", "Status", "Issued At", "Action"]}>{filteredRequests.map(w=><tr key={w.id}><td>{fmt(w.createdAt)}</td><td><b>{w.vehicle}</b></td><td>{w.vehicleType}</td><td>{w.wheelType}</td><td>{w.quantity}</td><td>{w.reason||'-'}</td><td><span className={w.status==='ISSUED'?'badge ok':'badge warn'}>{w.status}</span></td><td>{fmt(w.issuedAt)}</td><td>{isStore && w.status==='REQUESTED' ? <Button onClick={()=>issue(w)}>Issue Wheel</Button> : '-'}</td></tr>)}{!filteredRequests.length && <tr><td colSpan="9">No wheel requests for selected period.</td></tr>}</Table></Card>
  </div>;
}
