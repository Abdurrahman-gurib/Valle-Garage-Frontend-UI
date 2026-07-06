import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Badge, Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';

const RECEIVER_TYPES = ['Workshop Yard Coco','Welder Department','Equipment Bay','Tools','External Client','Walking Client','Internal Department','Other'];
const PAYMENT_MODES = ['Internal','Cash','Invoice','FOC','Other'];
const COLORS = ['#6f3cff','#24f66f','#ff8b00','#2997ff','#ff315f','#8b5cf6'];
function money(v){ return `Rs ${Number(v||0).toLocaleString('en-MU',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmt(v){ return v ? String(v).replace('T',' ').slice(0,19) : '-'; }
function preciseLocation(v){ const txt=String(v||'').trim(); if(!txt || txt.toLowerCase()==='historical import') return 'No precise SP location'; return /^SP/i.test(txt) ? txt : 'No precise SP location'; }
function sum(rows,key){ return rows.reduce((s,r)=>s+Number(r[key]||0),0); }
function group(rows,keyFn,valFn=()=>1){ const m={}; rows.forEach(r=>{const k=keyFn(r)||'Unknown'; m[k]=(m[k]||0)+Number(valFn(r)||0);}); return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,10); }
function chartExport(rows,name){ const header=Object.keys(rows[0]||{empty:''}); const csv=[header.join(','), ...rows.map(r=>header.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${name}.csv`; a.click(); URL.revokeObjectURL(a.href); }

export default function ExternalPartsIssue(){
  const { inventory=[] } = useApp();
  const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false); const [period,setPeriod]=useState('today'); const [search,setSearch]=useState('');
  const query = useMemo(()=>{ const q=new URLSearchParams(); if(period) q.set('period', period==='today'?'today':period==='last7'?'last7':period==='month'?'month':period==='year'?'year':'all'); if(search) q.set('search',search); const s=q.toString(); return s?`?${s}`:''; },[period,search]);
  async function load(){ setLoading(true); try{ setRows(await api.partsIssues.list(query)); } finally{ setLoading(false); } }
  useEffect(()=>{ load(); },[query]);
  const byType=useMemo(()=>group(rows,r=>r.receiverType,r=>r.quantity),[rows]);
  const byPart=useMemo(()=>group(rows,r=>`${r.sku} - ${r.partName}`,r=>r.quantity),[rows]);
  const byReceiver=useMemo(()=>group(rows,r=>r.receiverName || r.receiverCompany || r.receiverType,r=>r.lineSellingTotal),[rows]);
  const byDay=useMemo(()=>group(rows,r=>String(r.issuedAt||'').slice(0,10),r=>r.quantity).reverse(),[rows]);
  return <div className="page external-parts-page">
    <PageHeader title="Parts Distribution / Sell" subtitle="Issue, distribute or sell parts to internal departments, workshop yard coco, tools, external clients and walking clients. Each movement deducts InventoryItem stock and keeps a full traceable audit report." />

    <Card className="section-small external-issue-form-card">
      <IssueForm inventory={inventory} onDone={load} />
    </Card>

    <div className="history-toolbar"><select className="input" value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="last7">Last 7 days</option><option value="month">Current month</option><option value="year">Current year</option><option value="all">All records</option></select><Input placeholder="Search receiver, company, SKU, part..." value={search} onChange={e=>setSearch(e.target.value)} /><Button variant="secondary" onClick={()=>chartExport(rows,'store-parts-distribution-report')}>Export CSV</Button></div>
    <div className="inventory-kpi-grid"><Card><h3>Total issues</h3><b>{rows.length}</b></Card><Card><h3>Total quantity</h3><b>{sum(rows,'quantity')}</b></Card><Card><h3>Charged value</h3><b>{money(sum(rows,'lineSellingTotal'))}</b></Card><Card><h3>Margin</h3><b>{money(sum(rows,'margin'))}</b></Card></div>
    <div className="store-analytics-grid section-small">
      <Card className="chart-card pro-chart-card"><h2>Parts Issued by Receiver Type</h2><p className="muted">Quantity issued outside garage workflow.</p><div className="chart-box"><ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><PieChart><Pie data={byType} dataKey="value" nameKey="label" innerRadius={55} outerRadius={92} label>{byType.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div></Card>
      <Card className="chart-card pro-chart-card"><h2>Top Parts Issued</h2><p className="muted">Most issued parts by quantity.</p><div className="chart-box"><ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={byPart} layout="vertical" margin={{left:90,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={140} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" fill="#6f3cff"/></BarChart></ResponsiveContainer></div></Card>
      <Card className="chart-card pro-chart-card"><h2>Value by Receiver</h2><p className="muted">Selling value issued to each receiver/name/company.</p><div className="chart-box"><ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={byReceiver} layout="vertical" margin={{left:90,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="label" width={140} tick={{fontSize:10}}/><Tooltip formatter={(v)=>money(v)}/><Bar dataKey="value" fill="#24f66f"/></BarChart></ResponsiveContainer></div></Card>
      <Card className="chart-card pro-chart-card"><h2>Issue Trend</h2><p className="muted">Daily non-garage parts quantity.</p><div className="chart-box"><ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><LineChart data={byDay}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Line dataKey="value" stroke="#6f3cff" strokeWidth={3}/></LineChart></ResponsiveContainer></div></Card>
    </div>
    <div className="parts-distribution-table-shell">
    <Table headers={['Issued At','Receiver Type','Receiver / Company','Collected By','SKU','Part','Qty','Charged','Issued By']}>
      {rows.map(r=><tr key={r.id}><td>{fmt(r.issuedAt)}</td><td><Badge>{r.receiverType}</Badge></td><td><b>{r.receiverName}</b><br/><small>{r.receiverCompany||'-'} • {r.paymentMode}</small></td><td>{r.collectedByName||'-'}</td><td>{r.sku}</td><td>{r.partName}</td><td>{r.quantity}</td><td>{money(r.lineSellingTotal)}</td><td>{r.issuedByName||'-'}</td></tr>)}
      {!rows.length && <tr><td colSpan="9">{loading?'Loading...':'No parts issued for this filter.'}</td></tr>}
    </Table>
    </div>
  </div>
}

function IssueForm({inventory,onDone}){
  const [q,setQ]=useState('');
  const [items,setItems]=useState([]);
  const [f,setF]=useState({receiverType:'Workshop Yard Coco',receiverName:'',receiverCompany:'',collectedByName:'',paymentMode:'Internal',referenceNo:'',notes:''});
  const matches=useMemo(()=>{ const s=q.toLowerCase().trim(); if(!s) return []; return inventory.filter(p=>`${p.sku} ${p.name} ${p.category} ${p.location}`.toLowerCase().includes(s)).slice(0,12);},[q,inventory]);
  function addItem(p){ if(!p) return; const id=p.id||p.dbId; if(items.some(x=>x.inventoryItemId===id)) return; setItems([...items,{inventoryItemId:id, sku:p.sku, name:p.name, stock:p.stock ?? p.currentStock, sellingPrice:p.sellingPrice, location:preciseLocation(p.location), quantity:1}]); setQ(''); }
  function updateQty(id,quantity){ setItems(items.map(x=>x.inventoryItemId===id?{...x,quantity}:x)); }
  function removeItem(id){ setItems(items.filter(x=>x.inventoryItemId!==id)); }
  async function submit(e){ e.preventDefault(); if(!items.length) return; for(const item of items){ await api.partsIssues.create({...f, inventoryItemId:item.inventoryItemId, quantity:Number(item.quantity||1)}); } setItems([]); setQ(''); setF({...f, receiverName:'', receiverCompany:'', collectedByName:'', referenceNo:'', notes:''}); await onDone(); }
  return <form onSubmit={submit}>
    <h2>Give Parts to Receiver</h2><p className="muted">Add one or more parts. The system deducts InventoryItem stock, stores exact timestamp, issued-by user, collected-by person and receiver details.</p>
    <div className="form-grid">
      <Field label="Search part"><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Type SKU or part name"/>{matches.length>0&&<div className="stock-picker-results">{matches.map(p=><button type="button" key={p.id||p.sku} onClick={()=>addItem(p)}><b>{p.sku}</b><span>{p.name}</span><small>Stock: {p.stock ?? p.currentStock} • Price: Rs {Number(p.sellingPrice||0).toFixed(2)} • {preciseLocation(p.location)}</small></button>)}</div>}</Field>
      <Field label="Receiver Type"><select className="input" value={f.receiverType} onChange={e=>setF({...f,receiverType:e.target.value})}>{RECEIVER_TYPES.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Receiver Name"><Input required value={f.receiverName} onChange={e=>setF({...f,receiverName:e.target.value})}/></Field>
      <Field label="Company / Department"><Input value={f.receiverCompany} onChange={e=>setF({...f,receiverCompany:e.target.value})}/></Field>
      <Field label="Collected By"><Input required value={f.collectedByName} onChange={e=>setF({...f,collectedByName:e.target.value})} placeholder="Person collecting the parts"/></Field>
      <Field label="Payment / Issue Type"><select className="input" value={f.paymentMode} onChange={e=>setF({...f,paymentMode:e.target.value})}>{PAYMENT_MODES.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Reference / Invoice"><Input value={f.referenceNo} onChange={e=>setF({...f,referenceNo:e.target.value})}/></Field>
      <Field label="Notes"><Input value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Field>
    </div>
    {items.length>0&&<div className="parts-basket"><h3>Parts to issue</h3><Table headers={['SKU','Part','Stock','Qty','Location','Action']}>{items.map(item=><tr key={item.inventoryItemId}><td>{item.sku}</td><td><b>{item.name}</b></td><td>{item.stock}</td><td><Input type="number" min="1" value={item.quantity} onChange={e=>updateQty(item.inventoryItemId,e.target.value)} /></td><td>{preciseLocation(item.location)}</td><td><Button type="button" variant="danger" onClick={()=>removeItem(item.inventoryItemId)}>Remove</Button></td></tr>)}</Table></div>}
    <Button disabled={!items.length}>Issue {items.length || ''} Part{items.length===1?'':'s'} and Deduct Stock</Button>
  </form>
}
