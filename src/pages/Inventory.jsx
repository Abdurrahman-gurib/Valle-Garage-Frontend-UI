import { useMemo, useState } from 'react';
import { Badge, Button, Field, Input, Modal, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function money(value){ return `Rs ${Number(value || 0).toLocaleString('en-MU', { minimumFractionDigits:2, maximumFractionDigits:2 })}`; }
function cleanPart(p){ return { ...p, sku:p.sku||'', name:p.name || p.part || '', category:p.category || '', barcode:p.barcode || '', costPrice:Number(p.costPrice ?? 0), sellingPrice:Number(p.sellingPrice ?? p.lastPrice ?? p.price ?? 0), stock:Number(p.stock ?? p.currentStock ?? 0), currentStock:Number(p.stock ?? p.currentStock ?? 0), reorderLevel:Number(p.reorderLevel ?? 0), supplier:p.supplier || p.supplierName || '', supplierName:p.supplierName || p.supplier || '', supplierEmail:p.supplierEmail || '', location:p.location || '' }; }

export default function Inventory(){
  const { inventory=[], createPO, createInventoryItem, updateInventoryItem, addInventoryStock } = useApp();
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(null);
  const items=useMemo(()=>inventory.map(cleanPart).filter(p=>JSON.stringify(p).toLowerCase().includes(search.toLowerCase())),[inventory,search]);
  return <div className="page inventory-page">
    <PageHeader title="Store Keeper / Parts" subtitle="Editable DB InventoryItem fields: SKU, name, category, barcode, current stock, reorder level, cost price, selling price, supplier name, supplier email and location. Issued parts are deducted from database stock." action={()=>setModal({type:'add'})} actionLabel="Add Part" />
    <div className="history-toolbar"><Input placeholder="Search SKU, part, supplier..." value={search} onChange={e=>setSearch(e.target.value)} /><Button variant="secondary" onClick={()=>setModal({type:'stock'})}>Input New Stock</Button></div>
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
          <button className="open-btn" type="button" onClick={()=>setModal({type:'addStock',item:p})}>Stock</button>
          <button className="open-btn" type="button" onClick={()=>setModal({type:'po',item:p})}>PO</button>
        </td>
      </tr>})}
    </Table>
    {modal?.type==='details' && <Modal title="Part Details" onClose={()=>setModal(null)} wide><PartDetails part={modal.item} /></Modal>}
    {modal?.type==='add' && <Modal title="Add New Part" onClose={()=>setModal(null)} wide><PartForm onSave={async f=>{await createInventoryItem(f); setModal(null);}} /></Modal>}
    {modal?.type==='edit' && <Modal title="Edit Part" onClose={()=>setModal(null)} wide><PartForm initial={modal.item} onSave={async f=>{await updateInventoryItem(modal.item.dbId || modal.item.id, f); setModal(null);}} /></Modal>}
    {modal?.type==='addStock' && <Modal title="Input New Stock" onClose={()=>setModal(null)}><StockForm part={modal.item} onSave={async (qty,reason)=>{await addInventoryStock(modal.item.dbId || modal.item.id, qty, reason); setModal(null);}} /></Modal>}
    {modal?.type==='stock' && <Modal title="Input New Stock" onClose={()=>setModal(null)}><StockPicker parts={items} onSave={async (part,qty,reason)=>{await addInventoryStock(part.dbId || part.id, qty, reason); setModal(null);}} /></Modal>}
    {modal?.type==='po' && <Modal title="Purchase Order Form" onClose={()=>setModal(null)} wide><POForm part={modal.item} createPO={createPO} /></Modal>}
  </div>
}

function PartDetails({part}){ const p=cleanPart(part||{}); const rows=[['SKU',p.sku],['Name',p.name],['Category',p.category || '-'],['Barcode',p.barcode || '-'],['Current Stock',p.stock],['Reorder Level',p.reorderLevel],['Cost Price',money(p.costPrice)],['Selling Price',money(p.sellingPrice)],['Supplier Name',p.supplier || '-'],['Supplier Email',p.supplierEmail || '-'],['Location',p.location || '-']]; return <div className="detail-grid compact-detail-grid">{rows.map(([k,v])=><div key={k} className="detail-tile"><span>{k}</span><b>{v}</b></div>)}</div> }

function PartForm({initial={},onSave}){ const [f,setF]=useState({ sku:initial.sku||'', name:initial.name||'', category:initial.category||'', barcode:initial.barcode||'', stock:initial.stock ?? initial.currentStock ?? '', reorderLevel:initial.reorderLevel ?? '', costPrice:initial.costPrice ?? '', sellingPrice:initial.sellingPrice ?? initial.lastPrice ?? '', supplier:initial.supplier||initial.supplierName||'', supplierEmail:initial.supplierEmail||'', location:initial.location||'' }); return <form onSubmit={e=>{e.preventDefault(); onSave({...f,currentStock:f.stock,supplierName:f.supplier});}}><div className="form-grid"><Field label="SKU"><Input required value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/></Field><Field label="Name"><Input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field label="Category"><Input value={f.category} onChange={e=>setF({...f,category:e.target.value})}/></Field><Field label="Barcode"><Input value={f.barcode} onChange={e=>setF({...f,barcode:e.target.value})}/></Field><Field label="Current Stock"><Input type="number" value={f.stock} onChange={e=>setF({...f,stock:e.target.value})}/></Field><Field label="Reorder Level"><Input type="number" value={f.reorderLevel} onChange={e=>setF({...f,reorderLevel:e.target.value})}/></Field><Field label="Cost Price"><Input type="number" step="0.01" value={f.costPrice} onChange={e=>setF({...f,costPrice:e.target.value})}/></Field><Field label="Selling Price"><Input type="number" step="0.01" value={f.sellingPrice} onChange={e=>setF({...f,sellingPrice:e.target.value})}/></Field><Field label="Supplier Name"><Input value={f.supplier} onChange={e=>setF({...f,supplier:e.target.value})}/></Field><Field label="Supplier Email"><Input value={f.supplierEmail} onChange={e=>setF({...f,supplierEmail:e.target.value})}/></Field><Field label="Location"><Input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></Field></div><Button>Save to Database</Button></form> }
function POForm({part,createPO}){ const price=Number(part.sellingPrice||0); const [qty,setQty]=useState(10); const [msg,setMsg]=useState(`Dear Supplier,\n\nPlease process this purchase order for ${part.name}.`); async function save(){ await createPO(part, qty, { quantity:qty, item:part.name, supplier:part.supplier, supplierEmail:part.supplierEmail, amount:price*qty, message:msg }); } return <div><p><b>{part.sku}</b> - {part.name}</p><Field label="Quantity"><Input type="number" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Amount"><Input readOnly value={money(price*Number(qty||0))}/></Field><Field label="Message"><textarea className="input textarea" value={msg} onChange={e=>setMsg(e.target.value)}/></Field><Button onClick={save}>Create PO Transaction</Button></div> }
