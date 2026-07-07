import React from 'react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Table } from '../components/UI.jsx';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useApp } from '../context/AppContext.jsx';

function money(value){ return `Rs ${Number(value || 0).toLocaleString('en-MU', { minimumFractionDigits:2, maximumFractionDigits:2 })}`; }
function cleanPart(p){ return { ...p, sku:p.sku||'', name:p.name || p.part || '', category:p.category || '', barcode:p.barcode || '', costPrice:Number(p.costPrice ?? 0), sellingPrice:Number(p.sellingPrice ?? p.lastPrice ?? p.price ?? 0), stock:Number(p.stock ?? p.currentStock ?? 0), currentStock:Number(p.stock ?? p.currentStock ?? 0), reorderLevel:Number(p.reorderLevel ?? 0), supplier:p.supplier || p.supplierName || '', supplierName:p.supplierName || p.supplier || '', supplierEmail:p.supplierEmail || '', location:p.location || '' }; }

function shortSku(value){
  const text = String(value || '-').trim();
  if(text.length <= 16) return text;
  return `${text.slice(0,7)}…${text.slice(-6)}`;
}
function lowStockTooltip({ active, payload, label }){
  if(!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return <div className="analytics-tooltip"><b>{row.fullLabel || label}</b><span>Current stock: {row.stock}</span><span>Reorder level: {row.reorder}</span><span>Part: {row.name || '-'}</span><span>Location: {row.location || '-'}</span></div>;
}

function chartRowsForExport(rows){
  return (rows || []).map(p => ({
    sku: p.sku || '-',
    name: p.name || '-',
    category: p.category || '-',
    barcode: p.barcode || '-',
    currentStock: Number(p.stock ?? p.currentStock ?? 0),
    reorderLevel: Number(p.reorderLevel ?? 0),
    costPrice: Number(p.costPrice ?? 0),
    sellingPrice: Number(p.sellingPrice ?? 0),
    supplierName: p.supplierName || p.supplier || '-',
    supplierEmail: p.supplierEmail || '-',
    location: p.location || '-',
    status: Number(p.stock ?? p.currentStock ?? 0) <= 0 ? 'ZERO STOCK' : 'LOW STOCK'
  }));
}

function stockChartTooltip({ active, payload, label }){
  if(!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return <div className="analytics-tooltip"><b>{row.fullLabel || label}</b><span>Current stock: {row.stock}</span><span>Reorder level: {row.reorder}</span><span>Part: {row.name || '-'}</span><span>Category: {row.category || '-'}</span><span>Location: {row.location || '-'}</span></div>;
}

function InventoryChartCard({ title, subtitle, rows, exportLabel, onExport, children }){
  return <Card className="chart-card pro-chart-card inventory-full-stock-chart">
    <div className="card-head chart-card-head">
      <div><h2>{title}</h2><p className="muted">{subtitle}</p></div>
      {onExport && <Button variant="secondary" type="button" onClick={()=>onExport(rows, exportLabel || title)}>Download XLSX</Button>}
    </div>
    <div className="inventory-scroll-chart-box">{children}</div>
  </Card>;
}

function StockItemsFitCard({ title, subtitle, rows, exportLabel, onExport, emptyText }){
  const cleanRows = (rows || []).map(cleanPart);
  return (
    <Card className="chart-card pro-chart-card stock-fit-card">
      <div className="card-head chart-card-head">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          <span className="stock-fit-count">{cleanRows.length} item(s)</span>
        </div>
        {onExport && <Button variant="secondary" type="button" onClick={()=>onExport(cleanRows, exportLabel || title)}>Download XLSX</Button>}
      </div>

      {cleanRows.length ? (
        <div className="stock-fit-list">
          <div className="stock-fit-head">
            <span>SKU</span>
            <span>Part</span>
            <span>Stock</span>
            <span>Reorder</span>
            <span>Location</span>
          </div>
          {cleanRows.map((p, idx) => (
            <div className="stock-fit-row" key={`${p.id || p.sku || p.name}-${idx}`}>
              <span title={p.sku}>{p.sku || '-'}</span>
              <span title={p.name}><b>{p.name || '-'}</b><small>{p.category || '-'}</small></span>
              <span className={p.stock <= 0 ? 'stock-zero-pill' : 'stock-low-pill'}>{p.stock}</span>
              <span>{p.reorderLevel}</span>
              <span title={p.location}>{p.location || '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-chart">{emptyText || 'No matching stock items.'}</div>
      )}
    </Card>
  );
}

export default function Inventory(){
  const { inventory=[], createInventoryItem, updateInventoryItem, addInventoryStock } = useApp();
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(null);
  const allItems=useMemo(()=>inventory.map(cleanPart),[inventory]);
  const lowStockItems=useMemo(()=>allItems.filter(p=>Number(p.stock)<=Number(p.reorderLevel||0)),[allItems]);
  const zeroStockItems=useMemo(()=>allItems.filter(p=>Number(p.stock)<=0),[allItems]);
  const items=useMemo(()=>{ if(search==='LOW_STOCK_FILTER') return lowStockItems; return allItems.filter(p=>JSON.stringify(p).toLowerCase().includes(search.toLowerCase())); },[allItems,lowStockItems,search]);
  const categoryChartData=useMemo(()=>{ const map={}; allItems.forEach(p=>{ const k=p.category||'Uncategorised'; map[k]=(map[k]||0)+1; }); return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8); },[allItems]);
  const stockRiskData=useMemo(()=>[
    {label:'OK', value:allItems.filter(p=>Number(p.stock)>Number(p.reorderLevel||0)).length},
    {label:'Low stock', value:lowStockItems.length},
    {label:'Zero stock', value:allItems.filter(p=>Number(p.stock)<=0).length}
  ],[allItems,lowStockItems]);
  const lowStockChartData=useMemo(()=>lowStockItems.map(p=>({label:shortSku(p.sku || p.name || '-'), fullLabel:`${p.sku || '-'} - ${p.name || ''}`, name:p.name || '', category:p.category || '', location:p.location || '', stock:Number(p.stock||0), reorder:Number(p.reorderLevel||0)})).sort((a,b)=>(a.stock-b.stock)||(b.reorder-a.reorder)),[lowStockItems]);
  const zeroStockChartData=useMemo(()=>zeroStockItems.map(p=>({label:shortSku(p.sku || p.name || '-'), fullLabel:`${p.sku || '-'} - ${p.name || ''}`, name:p.name || '', category:p.category || '', location:p.location || '', stock:Number(p.stock||0), reorder:Number(p.reorderLevel||0)})).sort((a,b)=>(b.reorder-a.reorder)||String(a.label).localeCompare(String(b.label))),[zeroStockItems]);
  async function exportPartsXlsx(rows, name){
    const XLSX = await import('xlsx');
    const data = [
      ['VALLÉ GARAGE OPERATIONS'],
      [name],
      ['Generated At', new Date().toLocaleString()],
      ['Rows Exported', rows.length],
      [],
      ['SKU','Part','Category','Barcode','Current Stock','Reorder Level','Cost Price','Selling Price','Supplier','Supplier Email','Location','Status'],
      ...rows.map(p=>[p.sku,p.name,p.category,p.barcode,p.stock,p.reorderLevel,p.costPrice,p.sellingPrice,p.supplier,p.supplierEmail,p.location,Number(p.stock)<=Number(p.reorderLevel||0)?'LOW STOCK':'OK']),
      [],
      ['Analysis Prompt'],
      ['Analyze the data in the selected worksheet to uncover meaningful and interesting data insights. Help me understand what the worksheet contains and any initial insights, findings, or takeaways. Insert the analysis in a new sheet and make it visually appealing. Include charts when appropriate. When creating charts, explicitly enable the option to include data from hidden rows or columns to ensure complete and accurate visualizations.']
    ];
    const ws=XLSX.utils.aoa_to_sheet(data); ws['!cols']=[{wch:20},{wch:38},{wch:18},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14},{wch:24},{wch:28},{wch:18},{wch:14}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Parts Report'); XLSX.writeFile(wb,`${name.toLowerCase().replaceAll(' ','-')}.xlsx`);
  } 
  return <div className="page inventory-page">
    <PageHeader title="Store Keeper / Parts" subtitle="Editable DB InventoryItem fields: SKU, name, category, barcode, current stock, reorder level, cost price, selling price, supplier name, supplier email and location. Issued parts are deducted from database stock." action={()=>setModal({type:'add'})} actionLabel="Add Part" />
    <div className="inventory-kpi-grid inventory-action-cards">
      <button className="metric-card clickable-card" onClick={()=>setSearch('')}><span>Total Parts</span><b>{allItems.length}</b><small>Full database parts list</small></button>
      <button className="metric-card clickable-card danger-card" onClick={()=>setSearch('LOW_STOCK_FILTER')}><span>Low Stock</span><b>{lowStockItems.length}</b><small>Show all low-stock rows below</small></button>
      <button className="metric-card clickable-card danger-card" onClick={()=>exportPartsXlsx(lowStockItems,'Low Stock Parts Report')}><span>Low Stock XLSX</span><b>Download</b><small>Stock available + reorder level</small></button>
      <button className="metric-card clickable-card danger-card" onClick={()=>exportPartsXlsx(zeroStockItems,'Zero Stock Parts Report')}><span>Zero Stock XLSX</span><b>{zeroStockItems.length}</b><small>All zero-stock parts + reorder level</small></button>
      <button className="metric-card clickable-card" onClick={()=>exportPartsXlsx(allItems,'Full Parts Inventory Report')}><span>Full Inventory</span><b>XLSX</b><small>All parts with full details</small></button>
    </div>
    <div className="inventory-search-panel">
      <Input placeholder="Search SKU, part name, barcode, supplier, category or location..." value={search==='LOW_STOCK_FILTER'?'':search} onChange={e=>setSearch(e.target.value)} />
      <Button variant="secondary" onClick={()=>setModal({type:'stock'})}>Input New Stock</Button>
    </div>
    <div className="store-analytics-grid section-small">
      <Card className="chart-card pro-chart-card"><h2>Stock Risk Overview</h2><p className="muted">Accurate live DB count by stock risk level.</p><div className="chart-box">{stockRiskData.some(x=>x.value>0) ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stockRiskData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} label={({label,value})=>`${label}: ${value}`}>{stockRiskData.map((_,i)=><Cell key={i} fill={['#24f66f','#ff8b00','#ff315f'][i%3]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer> : <div className="empty-chart">No inventory data.</div>}</div></Card>
      <Card className="chart-card pro-chart-card"><h2>Parts by Category</h2><p className="muted">Category distribution from InventoryItem table.</p><div className="chart-box">{categoryChartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={categoryChartData} layout="vertical" margin={{left:80,right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={110}/><Tooltip/><Legend/><Bar dataKey="value" name="Parts count" fill="#6f3cff"/></BarChart></ResponsiveContainer> : <div className="empty-chart">No category data.</div>}</div></Card>
      <StockItemsFitCard title="All Low Stock Items" subtitle="All items at or below reorder level. The list fits the page and exports every detail." rows={lowStockItems} exportLabel="Low Stock Parts Report" onExport={exportPartsXlsx} emptyText="No low stock items." />
      <StockItemsFitCard title="Zero Stock Items" subtitle="All items where current stock is 0. The report includes stock available and reorder level." rows={zeroStockItems} exportLabel="Zero Stock Parts Report" onExport={exportPartsXlsx} emptyText="No zero stock items." />
    </div>

    <Table headers={["SKU","Name","Stock","Reorder","Cost","Selling","Supplier","Status","Actions"]}>
      {items.length === 0 && <tr>
        <td colSpan={8}>No inventory items found.</td>
        <td className="row-actions">
          <button className="open-btn details-btn" type="button" disabled>Details</button>
        </td>
      </tr>}
      {items.map(p=>{ const low=p.stock<=Number(p.reorderLevel||0); return <tr key={p.id || p.sku}>
        <td><b>{p.sku}</b></td>
        <td>{p.name}</td>
        <td>{p.stock}</td>
        <td>{p.reorderLevel}</td>
        <td>{money(p.costPrice)}</td>
        <td><b>{money(p.sellingPrice)}</b></td>
        <td>{p.supplier || '-'}</td>
        <td><Badge tone={low?'danger':'success'}>{low?'Re-order':'OK'}</Badge></td>
        <td className="row-actions">
          <button className="open-btn details-btn" type="button" onClick={()=>setModal({type:'details',item:p})}>Details</button>
          <button className="open-btn" type="button" onClick={()=>setModal({type:'edit',item:p})}>Edit</button>
        </td>
      </tr>})}
    </Table>
    {modal?.type==='details' && <Modal title="Part Details" onClose={()=>setModal(null)} wide><PartDetails part={modal.item} /></Modal>}
    {modal?.type==='add' && <Modal title="Add New Part" onClose={()=>setModal(null)} wide><PartForm onSave={async f=>{await createInventoryItem(f); setModal(null);}} /></Modal>}
    {modal?.type==='edit' && <Modal title="Edit Part" onClose={()=>setModal(null)} wide><PartForm initial={modal.item} onSave={async f=>{await updateInventoryItem(modal.item.dbId || modal.item.id, f); setModal(null);}} /></Modal>}
    {modal?.type==='stock' && <Modal title="Input New Stock" onClose={()=>setModal(null)}><StockPicker parts={allItems} onSave={async (part,qty,reason)=>{await addInventoryStock(part.dbId || part.id, qty, reason); setModal(null);}} /></Modal>}
    {modal?.type==='po' && <Modal title="Purchase Order Form" onClose={()=>setModal(null)} wide><POForm part={modal.item} createPO={createPO} /></Modal>}
  </div>
}

function PartDetails({part}){ const p=cleanPart(part||{}); const rows=[['SKU',p.sku],['Name',p.name],['Category',p.category || '-'],['Barcode',p.barcode || '-'],['Current Stock',p.stock],['Reorder Level',p.reorderLevel],['Cost Price',money(p.costPrice)],['Selling Price',money(p.sellingPrice)],['Supplier Name',p.supplier || '-'],['Supplier Email',p.supplierEmail || '-'],['Location',p.location || '-']]; return <div className="detail-grid compact-detail-grid">{rows.map(([k,v])=><div key={k} className="detail-tile"><span>{k}</span><b>{v}</b></div>)}</div> }

function PartForm({initial={},onSave}){ const [f,setF]=useState({ sku:initial.sku||'', name:initial.name||'', category:initial.category||'', barcode:initial.barcode||'', stock:initial.stock ?? initial.currentStock ?? '', reorderLevel:initial.reorderLevel ?? '', costPrice:initial.costPrice ?? '', sellingPrice:initial.sellingPrice ?? initial.lastPrice ?? '', supplier:initial.supplier||initial.supplierName||'', supplierEmail:initial.supplierEmail||'', location:initial.location||'' }); return <form onSubmit={e=>{e.preventDefault(); onSave({...f,currentStock:f.stock,supplierName:f.supplier});}}><div className="form-grid"><Field label="SKU"><Input required value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/></Field><Field label="Name"><Input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field label="Category"><Input value={f.category} onChange={e=>setF({...f,category:e.target.value})}/></Field><Field label="Barcode"><Input value={f.barcode} onChange={e=>setF({...f,barcode:e.target.value})}/></Field><Field label="Current Stock"><Input type="number" value={f.stock} onChange={e=>setF({...f,stock:e.target.value})}/></Field><Field label="Reorder Level"><Input type="number" value={f.reorderLevel} onChange={e=>setF({...f,reorderLevel:e.target.value})}/></Field><Field label="Cost Price"><Input type="number" step="0.01" value={f.costPrice} onChange={e=>setF({...f,costPrice:e.target.value})}/></Field><Field label="Selling Price"><Input type="number" step="0.01" value={f.sellingPrice} onChange={e=>setF({...f,sellingPrice:e.target.value})}/></Field><Field label="Supplier Name"><Input value={f.supplier} onChange={e=>setF({...f,supplier:e.target.value})}/></Field><Field label="Supplier Email"><Input value={f.supplierEmail} onChange={e=>setF({...f,supplierEmail:e.target.value})}/></Field><Field label="Location"><Input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></Field></div><Button>Save to Database</Button></form> }
function POForm({part,createPO}){ const price=Number(part.sellingPrice||0); const [qty,setQty]=useState(10); const [msg,setMsg]=useState(`Dear Supplier,\n\nPlease process this purchase order for ${part.name}.`); async function save(){ await createPO(part, qty, { quantity:qty, item:part.name, supplier:part.supplier, supplierEmail:part.supplierEmail, amount:price*qty, message:msg }); } return <div><p><b>{part.sku}</b> - {part.name}</p><Field label="Quantity"><Input type="number" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Amount"><Input readOnly value={money(price*Number(qty||0))}/></Field><Field label="Message"><textarea className="input textarea" value={msg} onChange={e=>setMsg(e.target.value)}/></Field><Button onClick={save}>Create PO Transaction</Button></div> }


function StockPicker({parts=[], onSave}){
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [qty,setQty]=useState(1);
  const [reason,setReason]=useState('Stock intake / manual correction');
  const matches=useMemo(()=>{
    const q=String(query||'').toLowerCase().trim();
    if(!q) return [];
    return parts.filter(p=>`${p.sku} ${p.name} ${p.barcode} ${p.supplier} ${p.location}`.toLowerCase().includes(q)).slice(0,12);
  },[query,parts]);
  return <div className="stock-picker-page">
    <Field label="Search item to update"><Input placeholder="Type SKU, part name, barcode, supplier or location" value={query} onChange={e=>{setQuery(e.target.value); setSelected(null);}} /></Field>
    {matches.length>0 && !selected && <div className="stock-picker-results">{matches.map(p=><button type="button" key={p.id||p.sku} onClick={()=>{setSelected(p); setQuery(`${p.sku} - ${p.name}`);}}><b>{p.sku}</b><span>{p.name}</span><small>Current: {p.stock} • Reorder: {p.reorderLevel} • {p.location || 'No location'}</small></button>)}</div>}
    {selected && <div className="stock-selected-card"><b>{selected.sku} - {selected.name}</b><span>Current stock: {selected.stock}</span><span>Location: {selected.location || '-'}</span></div>}
    <Field label="Quantity to add"><Input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} /></Field>
    <Field label="Reason / reference"><Input value={reason} onChange={e=>setReason(e.target.value)} /></Field>
    <Button disabled={!selected || Number(qty)<=0} onClick={()=>onSave(selected, Number(qty), reason)}>Save Stock Movement to DB</Button>
  </div>
}
