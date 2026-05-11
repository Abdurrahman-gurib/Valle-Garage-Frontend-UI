import { Card, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function exportCsv(name, rows){
  const csv = rows.map(r=>r.map(v=>`"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
}
function Bar({ label, value, max, color='#2b0046' }){
  const pct = max ? Math.max(6, Math.round((value/max)*100)) : 6;
  return <div className="report-bar" title={`${label}: ${value}`}><span>{label}</span><div><i style={{width:`${pct}%`, background:color}}></i></div><b>{value}</b></div>
}
export default function Reports(){
 const { vehicles, inventory, assessments, garageOps, transactions }=useApp();
 const statusCounts = vehicles.reduce((a,v)=>({...a,[v.status]:(a[v.status]||0)+1}),{});
 const assessCounts = assessments.reduce((a,v)=>({...a,[v.status]:(a[v.status]||0)+1}),{});
 const txTotal = transactions.reduce((s,t)=>s+Number(t.amount||0),0);
 const maxStatus = Math.max(1,...Object.values(statusCounts),...Object.values(assessCounts));
 const lowStock = inventory.filter(i=>Number(i.stock)<=Number(i.reorderLevel));
 const partUsage = garageOps.flatMap(g=>g.partsUsed||[]);
 return <div className="page"><PageHeader title="Reports" subtitle="Live visual reports based on vehicles, assessments, garage work, inventory and transactions loaded from PostgreSQL through the backend API."/>
  <div className="report-grid">
    <Card><h2>Vehicle Status</h2>{Object.entries(statusCounts).map(([k,v],i)=><Bar key={k} label={k} value={v} max={maxStatus} color={i%2?'#7d42ff':'#2dfc72'}/>) }<button className="open-btn" onClick={()=>exportCsv('vehicle-status', [['Status','Count'],...Object.entries(statusCounts)])}>Export CSV</button></Card>
    <Card><h2>Assessment Pipeline</h2>{Object.entries(assessCounts).map(([k,v],i)=><Bar key={k} label={k} value={v} max={maxStatus} color={i%2?'#ff3d72':'#2b0046'}/>) }<button className="open-btn" onClick={()=>exportCsv('assessments', [['Ticket','Vehicle','Status','Issue'],...assessments.map(a=>[a.id,a.vehicle,a.status,a.issue])])}>Export CSV</button></Card>
    <Card><h2>Inventory Risk</h2><p>{lowStock.length} item(s) below reorder level.</p>{lowStock.map(i=><Bar key={i.id} label={i.name} value={Number(i.stock)} max={Math.max(Number(i.reorderLevel),1)} color="#ff3d72"/>)}<button className="open-btn" onClick={()=>exportCsv('inventory-low-stock', [['SKU','Part','Stock','Reorder Level'],...lowStock.map(i=>[i.sku,i.name,i.stock,i.reorderLevel])])}>Export CSV</button></Card>
    <Card><h2>Transactions</h2><p>Total pipeline value</p><strong className="big-number">Rs {txTotal.toLocaleString()}</strong><button className="open-btn" onClick={()=>exportCsv('transactions', [['ID','Type','Item','Status','Amount'],...transactions.map(t=>[t.id,t.type,t.item,t.status,t.amount])])}>Export CSV</button></Card>
    <Card><h2>Garage Work</h2><p>{garageOps.length} operation(s) logged</p><div className="mini-table">{garageOps.slice(0,6).map(g=><button title={`${g.workDone || ''} Parts: ${(g.partsUsed||[]).map(p=>p.name).join(', ')}`} key={g.id}><b>{g.id}</b><span>{g.vehicle}</span><span>{g.type}</span><span>{g.status}</span></button>)}</div><button className="open-btn" onClick={()=>exportCsv('garage-history', [['Process','Vehicle','Type','Status','Parts Used'],...garageOps.map(g=>[g.id,g.vehicle,g.type,g.status,(g.partsUsed||[]).map(p=>`${p.name} x${p.qty}`).join('; ')])])}>Export CSV</button></Card>
    <Card><h2>Parts Consumption</h2><p>{partUsage.length} part usage record(s)</p>{partUsage.slice(0,6).map((p,i)=><Bar key={i} label={p.name} value={Number(p.qty||1)} max={5} color="#2dfc72"/>)}<button className="open-btn" onClick={()=>window.print()}>Export PDF</button></Card>
  </div>
 </div>
}
