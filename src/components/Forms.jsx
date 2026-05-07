import { useMemo, useState } from 'react';
import { Button, Field, Input, Select, TextArea } from './UI.jsx';
import { useApp } from '../context/AppContext.jsx';

const vehicleTypeSuggestions = ['Quad', 'Buggy', 'Jeep', 'UTV', 'Motorcycle', 'Other'];
const issueSuggestions = ['Brake issue', 'Engine vibration', 'Routine service', 'Electrical fault', 'Tyre replacement', 'Oil leak', 'Transmission noise', 'Other'];
const operationTypes = ['Repair', 'Maintenance', 'Servicing', 'Build / Assembly', 'Testing', 'Pre Delivery Inspection'];

export function VehicleForm({ onDone, transaction }) {
  const { addVehicle, currentUser } = useApp();
  const [form, setForm] = useState({
    plate: transaction ? `BUILD-${Math.floor(100 + Math.random() * 899)}` : '',
    vin: '',
    type: transaction?.type?.includes('Vehicle') ? 'Quad' : 'Quad',
    customType: '',
    ownership: transaction ? 'External' : 'Internal',
    owner: transaction?.supplier || 'Vallé Adventure Park',
    companyName: transaction?.supplier || '',
    deliveryPersonName: '',
    contactNumber: '',
    email: transaction?.supplierEmail || '',
    checkInDateTime: new Date().toISOString().slice(0, 16),
    status: transaction ? 'Build in Progress' : 'Active',
    hours: 0,
    nextService: 100,
    mechanic: currentUser?.role === 'mechanic' ? currentUser.name : '',
    expectedDeliveryDate: transaction?.expectedDeliveryDate || '',
    sourceTransactionId: transaction?.id || '',
    notes: transaction ? `Created from ${transaction.poNumber || transaction.id}` : ''
  });
  function save(e){ e.preventDefault(); addVehicle(form); onDone?.(); }
  const isExternal = form.ownership === 'External';
  return <form onSubmit={save} className="form-grid">
    <Field label="Plate Number"><Input required placeholder="e.g. CFM-1042" value={form.plate} onChange={e=>setForm({...form, plate:e.target.value})}/></Field>
    <Field label="VIN / Chassis No."><Input required placeholder="VIN / chassis number" value={form.vin} onChange={e=>setForm({...form, vin:e.target.value})}/></Field>
    <Field label="Vehicle Type"><div className="inline-fields two"><Select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>{vehicleTypeSuggestions.map(v=><option key={v}>{v}</option>)}</Select>{form.type==='Other' && <Input placeholder="Manual type" value={form.customType} onChange={e=>setForm({...form, customType:e.target.value})}/>}</div></Field>
    <Field label="Internal / External"><Select value={form.ownership} onChange={e=>setForm({...form, ownership:e.target.value, owner:e.target.value==='Internal'?'Vallé Adventure Park':''})}><option>Internal</option><option>External</option></Select></Field>
    {isExternal && <>
      <Field label="Company Name"><Input value={form.companyName} onChange={e=>setForm({...form, companyName:e.target.value, owner:e.target.value})}/></Field>
      <Field label="Delivery Person Name"><Input value={form.deliveryPersonName} onChange={e=>setForm({...form, deliveryPersonName:e.target.value})}/></Field>
      <Field label="Contact Number"><Input value={form.contactNumber} onChange={e=>setForm({...form, contactNumber:e.target.value})}/></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></Field>
    </>}
    {!isExternal && <Field label="Vehicle Owner"><Input value={form.owner} onChange={e=>setForm({...form, owner:e.target.value})}/></Field>}
    <Field label="Check-in Date & Time"><Input type="datetime-local" value={form.checkInDateTime} onChange={e=>setForm({...form, checkInDateTime:e.target.value})}/></Field>
    <Field label="Status"><Select value={form.status} onChange={e=>setForm({...form, status:e.target.value})}><option>Active</option><option>Under Repair</option><option>Out of Service</option><option>Build in Progress</option><option>Built and Testing</option><option>Delivered</option></Select></Field>
    <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDeliveryDate} onChange={e=>setForm({...form, expectedDeliveryDate:e.target.value})}/></Field>
    <Field label="Hour Meter"><Input type="number" value={form.hours} onChange={e=>setForm({...form, hours:e.target.value})}/></Field>
    <Field label="Next Service Hours"><Input type="number" value={form.nextService} onChange={e=>setForm({...form, nextService:e.target.value})}/></Field>
    <Field label="Assigned Mechanic"><Input list="mechanics" value={form.mechanic} onChange={e=>setForm({...form, mechanic:e.target.value})}/><datalist id="mechanics"><option value="Jean Marc"/><option value="Kevin"/><option value="Arvind"/><option value="Workshop Team"/></datalist></Field>
    <Field label="Photo Upload"><Input type="file" multiple /></Field>
    <Field label="Notes"><TextArea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/></Field>
    <div className="form-actions"><Button>Save Vehicle</Button></div>
  </form>;
}

export function AssessmentForm({ onDone }) {
  const { vehicles, inventory, addAssessment, currentUser } = useApp();
  const [partId, setPartId] = useState(inventory[0]?.id || 'manual');
  const [manualPart, setManualPart] = useState('');
  const [qty, setQty] = useState(1);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState({ vehicleMode:'existing', vehicleId: vehicles[0]?.id || '', manualVehicle:'', issue:'', conclusion:'' });
  function addPart(){
    if (partId === 'manual') {
      if (!manualPart.trim()) return;
      setParts([...parts,{partId:'manual',name:manualPart.trim(),qty:Number(qty)}]);
      setManualPart('');
      return;
    }
    const p=inventory.find(x=>x.id===partId); if(p) setParts([...parts,{partId:p.id,name:p.name,qty:Number(qty)}]);
  }
  function save(e){ e.preventDefault(); addAssessment({...form, vehicleId: form.vehicleMode==='existing' ? form.vehicleId : '', vehicle: form.manualVehicle, parts, mechanic: currentUser?.name}); onDone?.(); }
  return <form onSubmit={save} className="form-grid">
    <Field label="Vehicle Selection"><Select value={form.vehicleMode} onChange={e=>setForm({...form, vehicleMode:e.target.value})}><option value="existing">Select existing vehicle</option><option value="manual">Input manually</option></Select></Field>
    {form.vehicleMode==='existing' ? <Field label="Vehicle"><Select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId:e.target.value})}>{vehicles.map(v=><option value={v.id} key={v.id}>{v.plate} - {v.type} - {v.status}</option>)}</Select></Field> : <Field label="Vehicle Plate / Ref"><Input value={form.manualVehicle} onChange={e=>setForm({...form, manualVehicle:e.target.value})}/></Field>}
    <Field label="Issue Detected"><Input list="issue-suggestions" required value={form.issue} onChange={e=>setForm({...form, issue:e.target.value})}/><datalist id="issue-suggestions">{issueSuggestions.map(i=><option value={i} key={i}/>)}</datalist></Field>
    <Field label="Conclusion"><TextArea value={form.conclusion} onChange={e=>setForm({...form, conclusion:e.target.value})}/></Field>
    <Field label="Required Part"><div className="inline-fields"><Select value={partId} onChange={e=>setPartId(e.target.value)}>{inventory.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}<option value="manual">Manual input</option></Select><Input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/><Button type="button" variant="secondary" onClick={addPart}>Add</Button></div></Field>
    {partId==='manual' && <Field label="Manual Part Name"><Input placeholder="Type part name" value={manualPart} onChange={e=>setManualPart(e.target.value)}/></Field>}
    <div className="part-list">{parts.map((p,i)=><span key={i}>{p.name} x {p.qty}</span>)}</div>
    <Field label="Photo Upload"><Input type="file" multiple /></Field>
    <div className="form-actions"><Button>Save Assessment</Button></div>
  </form>;
}

export function GarageOpForm({ onDone, transaction }) {
  const { vehicles, assessments, addGarageOp, currentUser } = useApp();
  const openAssessments = assessments.filter(a=>a.status!=='Completed');
  const selectedAssessment = openAssessments[0];
  const transactionVehicle = vehicles.find(v=>v.sourceTransactionId === transaction?.id);
  const [form, setForm] = useState({
    vehicleMode:'existing',
    vehicleId: transactionVehicle?.id || selectedAssessment?.vehicleId || vehicles[0]?.id || '',
    manualVehicle:'',
    assessmentId: selectedAssessment?.id || '',
    transactionId: transaction?.id || '',
    type: transaction ? 'Build / Assembly' : 'Repair',
    checkInDateTime: new Date().toISOString().slice(0, 16),
    expectedDeliveryDate: transaction?.expectedDeliveryDate || '',
    workDone: transaction ? 'Build/assembly started from purchase order.' : '',
    labor:'1 hr',
    status: transaction ? 'Build in Progress' : 'Ongoing',
    paymentStatus: 'Pending',
    mechanic: currentUser?.name || 'Workshop Team'
  });
  function save(e){ e.preventDefault(); addGarageOp(form); onDone?.(); }
  return <form onSubmit={save} className="form-grid">
    {transaction && <div className="notice form-actions"><b>Admin Request:</b> This garage ticket is linked to {transaction.id} / {transaction.poNumber}. Mechanic can update expected delivery and progress.</div>}
    <Field label="Vehicle Selection"><Select value={form.vehicleMode} onChange={e=>setForm({...form, vehicleMode:e.target.value})}><option value="existing">Select vehicle</option><option value="manual">Input manually</option></Select></Field>
    {form.vehicleMode==='existing' ? <Field label="Vehicle"><Select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId:e.target.value})}>{vehicles.map(v=><option value={v.id} key={v.id}>{v.plate} - {v.type} - {v.status}</option>)}</Select></Field> : <Field label="Vehicle Plate / Ref"><Input value={form.manualVehicle} onChange={e=>setForm({...form, manualVehicle:e.target.value})}/></Field>}
    <Field label="Assessment Ticket"><Select value={form.assessmentId} onChange={e=>setForm({...form, assessmentId:e.target.value})}><option value="">No assessment / build from PO</option>{openAssessments.map(a=><option value={a.id} key={a.id}>{a.id} - {a.vehicle}</option>)}</Select></Field>
    <Field label="Process Type"><Select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>{operationTypes.map(t=><option key={t}>{t}</option>)}</Select></Field>
    <Field label="Check-in Date & Time"><Input type="datetime-local" value={form.checkInDateTime} onChange={e=>setForm({...form, checkInDateTime:e.target.value})}/></Field>
    <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDeliveryDate} onChange={e=>setForm({...form, expectedDeliveryDate:e.target.value})}/></Field>
    <Field label="Mechanic"><Input list="mechanics" value={form.mechanic} onChange={e=>setForm({...form, mechanic:e.target.value})}/></Field>
    <Field label="Status"><Select value={form.status} onChange={e=>setForm({...form, status:e.target.value})}><option>Ongoing</option><option>Build in Progress</option><option>Built and Testing</option><option>Delivered</option><option>Completed</option></Select></Field>
    <Field label="Work Done / Work Plan"><TextArea required value={form.workDone} onChange={e=>setForm({...form, workDone:e.target.value})}/></Field>
    <Field label="Labor Hours"><Input value={form.labor} onChange={e=>setForm({...form, labor:e.target.value})}/></Field>
    <Field label="Photo Upload"><Input type="file" multiple /></Field>
    <div className="form-actions"><Button>Save Garage Work</Button></div>
  </form>;
}

export function TransactionForm({ onDone }) {
  const { createTransaction } = useApp();
  const [form, setForm] = useState({ type:'External Vehicle Order', supplier:'', supplierEmail:'', item:'CFMOTO Quad', quantity:1, status:'In Progress', poNumber:'', poFile:'', amount:0, startDate:new Date().toISOString().slice(0,10), expectedDeliveryDate:'', notes:'', message:'' });
  function save(e){ e.preventDefault(); createTransaction(form); onDone?.(); }
  return <form onSubmit={save} className="form-grid">
    <Field label="Transaction Type"><Select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>External Vehicle Order</option><option>Parts Re-order</option><option>Repair / Service Billing</option></Select></Field>
    <Field label="Status"><Select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Pending</option><option>In Progress</option><option>Build in Progress</option></Select></Field>
    <Field label="Supplier / Customer Name"><Input required value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field>
    <Field label="Supplier / Customer Email"><Input type="email" value={form.supplierEmail} onChange={e=>setForm({...form,supplierEmail:e.target.value})}/></Field>
    <Field label="Item / Order Description"><Input required value={form.item} onChange={e=>setForm({...form,item:e.target.value})}/></Field>
    <Field label="Quantity"><Input type="number" min="1" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field>
    <Field label="PO Number"><Input placeholder="Auto generated if blank" value={form.poNumber} onChange={e=>setForm({...form,poNumber:e.target.value})}/></Field>
    <Field label="Attach Purchasing Order"><Input type="file" onChange={e=>setForm({...form,poFile:e.target.files?.[0]?.name || ''})}/>{form.poFile && <small>{form.poFile}</small>}</Field>
    <Field label="Start Date"><Input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></Field>
    <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDeliveryDate} onChange={e=>setForm({...form,expectedDeliveryDate:e.target.value})}/></Field>
    <Field label="Amount"><Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field>
    <Field label="Notes / Message"><TextArea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value, message:e.target.value})}/></Field>
    <div className="form-actions"><Button>Save Transaction</Button></div>
  </form>;
}
