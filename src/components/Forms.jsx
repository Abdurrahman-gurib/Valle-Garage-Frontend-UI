import VehicleChecklist from '../components/VehicleChecklist.jsx';
import MultipleMechanicsSelect from '../components/MultipleMechanicsSelect.jsx';
import PartsCostTable from '../components/PartsCostTable.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Input, Select, TextArea } from './UI.jsx';
import { useApp } from '../context/AppContext.jsx';


const vehicleTypeSuggestions = ['Quad', 'Buggy', 'Jeep', 'UTV', 'Motorcycle', 'Other'];
const issueSuggestions = ['Brake issue', 'Engine vibration', 'Routine service', 'Electrical fault', 'Tyre replacement', 'Oil leak', 'Transmission noise', 'Accident damage', 'Battery issue', 'Other'];
const operationTypes = ['Repair', 'Maintenance', 'Servicing', 'Build / Assembly', 'Testing', 'Pre Delivery Inspection'];
const vehicleCheckItems = ['Brake pads','Oil level','Brake fluid','Suspension','Wheel alignment','Tyre pressure','Radiator / coolant','Battery','Lights','Steering','Drive belt / chain','Leaks','Horn','Mirrors','Safety belt / harness'];

function toLocalInputValue(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
function today(){ return toLocalInputValue().slice(0,10); }
function norm(v){ return String(v || '').trim().toLowerCase(); }

function SuggestBox({ items, onPick }){
  if(!items.length) return null;
  return <div className="inline-suggestions">{items.slice(0,8).map(item=><button type="button" key={item.plate} onMouseDown={(e)=>{e.preventDefault(); onPick(item);}}><b>{item.plate}</b><span>{item.model || item.type}</span><small>{item.vin || 'No VIN'}</small></button>)}</div>;
}

export function VehicleForm({ onDone, transaction, initialVehicle }) {
  const { addVehicle, updateVehicle, currentUser, vehicleCatalog, vehicles, mechanics, findVehicleByPlate } = useApp();
  const [form, setForm] = useState(() => ({
    plate: transaction ? `BUILD-${Math.floor(100 + Math.random() * 899)}` : initialVehicle?.plate || '',
    vin: initialVehicle?.vin || '',
    type: initialVehicle?.type || (transaction?.type?.includes('Vehicle') ? 'Quad' : 'Quad'),
    customType: initialVehicle?.customType || '',
    ownership: initialVehicle?.ownership || (transaction ? 'External' : 'Internal'),
    owner: initialVehicle?.owner || transaction?.supplier || 'Vallé Adventure Park',
    companyName: initialVehicle?.companyName || transaction?.supplier || '',
    deliveryPersonName: initialVehicle?.deliveryPersonName || '',
    contactNumber: initialVehicle?.contactNumber || '',
    email: initialVehicle?.email || transaction?.supplierEmail || '',
    checkInDateTime: initialVehicle?.checkInDateTime || toLocalInputValue(),
    status: initialVehicle?.status || (transaction ? 'Build in Progress' : 'Active'),
    hours: initialVehicle?.hours || 0,
    nextService: initialVehicle?.nextService || 100,
    mechanic: initialVehicle?.mechanic || (currentUser?.role === 'mechanic' ? currentUser.name : ''),
    expectedDeliveryDate: initialVehicle?.expectedDeliveryDate || transaction?.expectedDeliveryDate || '',
    sourceTransactionId: initialVehicle?.sourceTransactionId || transaction?.id || '',
    notes: initialVehicle?.notes || (transaction ? `Created from ${transaction.poNumber || transaction.id}` : ''),
    model: initialVehicle?.model || '',
    cc: initialVehicle?.cc || '',
    imageUrl: initialVehicle?.imageUrl || ''
  }));
  const [dirty, setDirty] = useState(false);
const [checklist, setChecklist] = useState(
  initialVehicle?.vehicleChecks || {}
);

const [manualMechanic, setManualMechanic] = useState(
  initialVehicle?.manualMechanic || ''
);
  const suggestions = useMemo(() => {
    const q = norm(form.plate);
    if(!q || q.length < 1) return [];
    const all = [...vehicles, ...vehicleCatalog];
    const seen = new Set();
    return all.filter(v => {
      const key = String(v.plate || v.plateNumber || '').toUpperCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return norm(v.plate || v.plateNumber).includes(q);
    }).sort((a,b)=>{
      const ap = String(a.plate || a.plateNumber || '').toUpperCase();
      const bp = String(b.plate || b.plateNumber || '').toUpperCase();
      const query = form.plate.toUpperCase();
      const score = p => p === query ? 0 : p.startsWith(query) ? 1 : 2;
      return score(ap) - score(bp) || ap.length - bp.length || ap.localeCompare(bp);
    });
  }, [form.plate, vehicles, vehicleCatalog]);
  function applyVehicle(v){
    const src = findVehicleByPlate(v.plate || v.plateNumber) || v;
    setForm(prev => ({ ...prev, ...src, plate: src.plate || src.plateNumber || prev.plate, vin: src.vin || prev.vin, type: src.type || src.vehicleType || prev.type, ownership: src.ownership || prev.ownership, owner: src.owner || prev.owner, companyName: src.companyName || prev.companyName, deliveryPersonName: src.deliveryPersonName || prev.deliveryPersonName, contactNumber: src.contactNumber || prev.contactNumber, email: src.email || prev.email, model: src.model || prev.model, cc: src.cc || prev.cc, imageUrl: src.imageUrl || prev.imageUrl, hours: src.hours ?? prev.hours, status: src.status || prev.status }));
    setDirty(false);
  }
  useEffect(() => {
    if(!dirty) return;
    const exact = findVehicleByPlate(form.plate);
    if(exact && String(exact.plate || '').toUpperCase() === String(form.plate || '').toUpperCase()) applyVehicle(exact);
  }, [form.plate]);
  function change(key, value){ setDirty(true); setForm(prev=>({...prev,[key]:value})); }
  async function save(e){
    e.preventDefault();
    const payload = {
      ...form,
      vin: form.vin || '',
      mechanic: form.mechanic === 'manual' ? manualMechanic : form.mechanic,
      vehicleChecks: checklist
    };
    const saved = initialVehicle?.id
      ? await updateVehicle(initialVehicle.id, payload)
      : await addVehicle(payload);
    onDone?.(saved || { ...payload, id: payload.id || initialVehicle?.id || payload.plate });
  }
  const isExternal = form.ownership === 'External';
  return <form onSubmit={save} className="form-grid">
    <div className="vehicle-form-preview form-actions">
  <div>
    <img
      src={
        form.imageUrl &&
        form.imageUrl !== '-' &&
        form.imageUrl.toLowerCase?.() !== 'null' &&
        form.imageUrl.toLowerCase?.() !== 'undefined'
          ? form.imageUrl
          : '/vehicles/quad-450l.jpeg'
      }
      alt=""
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/vehicles/quad-450l.jpeg';
      }}
    />
  </div>

  <section>
    <h3>{form.plate || 'Vehicle preview'}</h3>

    <p>
      {form.model || form.type} {form.cc ? `• ${form.cc}` : ''}
    </p>

    <small>
      Typing/selecting a known plate auto-fills VIN, model, CC, ownership and
      image from the vehicle database.
    </small>
  </section>
</div>
    <Field label="Plate Number"><Input required placeholder="Start typing plate number" value={form.plate} onChange={e=>change('plate', e.target.value.toUpperCase())}/><SuggestBox items={suggestions} onPick={applyVehicle}/></Field>
    <Field label="VIN / Chassis No. (Optional)"><Input placeholder="Auto-filled, manual, or leave blank" value={form.vin} onChange={e=>change('vin',e.target.value)}/></Field>
    <Field label="Model"><Input placeholder="e.g. CFORCE 520L" value={form.model} onChange={e=>change('model',e.target.value)}/></Field>
    <Field label="CC / Power"><Input placeholder="e.g. 495 CC / 35KW" value={form.cc} onChange={e=>change('cc',e.target.value)}/></Field>
    <Field label="Vehicle Type"><div className="inline-fields two"><Select value={form.type} onChange={e=>change('type',e.target.value)}>{vehicleTypeSuggestions.map(v=><option key={v}>{v}</option>)}</Select>{form.type==='Other' && <Input placeholder="Manual type" value={form.customType} onChange={e=>change('customType',e.target.value)}/>}</div></Field>
    <Field label="Internal / External"><Select value={form.ownership} onChange={e=>setForm({...form, ownership:e.target.value, owner:e.target.value==='Internal'?'Vallé Adventure Park':form.owner})}><option>Internal</option><option>External</option></Select></Field>
    {isExternal && <>
      <Field label="Company Name"><Input value={form.companyName} onChange={e=>change('companyName',e.target.value)}/></Field>
      <Field label="Delivery Person Name"><Input value={form.deliveryPersonName} onChange={e=>change('deliveryPersonName',e.target.value)}/></Field>
      <Field label="Contact Number"><Input value={form.contactNumber} onChange={e=>change('contactNumber',e.target.value)}/></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={e=>change('email',e.target.value)}/></Field>
    </>}
    {!isExternal && <Field label="Vehicle Owner"><Input value={form.owner} onChange={e=>change('owner',e.target.value)}/></Field>}
    <Field label="Check-in Date & Time"><Input type="datetime-local" value={form.checkInDateTime} onChange={e=>change('checkInDateTime',e.target.value)}/></Field>
    
    <Field label="Status"><Select value={form.status} onChange={e=>change('status',e.target.value)}><option>Active</option><option>Under Repair</option><option>Out of Service</option><option>Build in Progress</option><option>Built and Testing</option><option>Delivered</option></Select></Field>
    <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDeliveryDate} onChange={e=>change('expectedDeliveryDate',e.target.value)}/></Field>
    <Field label="Hour Meter"><Input type="number" value={form.hours} onChange={e=>change('hours',e.target.value)}/></Field>
    <Field label="Next Service Hours"><Input type="number" value={form.nextService} onChange={e=>change('nextService',e.target.value)}/></Field>
    <Field label="Assigned Mechanic">
      <div className="inline-fields">
        <Select value={form.mechanic} onChange={e=>change('mechanic',e.target.value)}>
          <option value="">Choose mechanic</option>
          {mechanics.map(m=><option key={m.id || m.email} value={m.name}>{m.name}</option>)}
          <option value="manual">Manual input</option>
          <option value="Workshop Team">Workshop Team</option>
        </Select>
        {form.mechanic==='manual' && <Input placeholder="Type mechanic name manually" value={manualMechanic} onChange={e=>{setManualMechanic(e.target.value); change('manualMechanic',e.target.value)}}/>}
      </div>
    </Field>
    <Field label="Vehicle Checklist">
  <VehicleChecklist
    checklist={checklist}
    setChecklist={setChecklist}
  />
</Field>
    <Field label="Photo Upload"><Input type="file" multiple /></Field>
    <Field label="Notes"><TextArea value={form.notes} onChange={e=>change('notes',e.target.value)}/></Field>
    <div className="form-actions"><Button>{initialVehicle ? 'Save Vehicle Updates' : 'Save Vehicle'}</Button></div>
  </form>;
}

export function AssessmentForm({ onDone, prefillVehicleId = '', prefillVehiclePlate = '' }) {
  const app = useApp();
  const vehicles = app?.vehicles || [];
  const inventory = app?.inventory || [];
  const addAssessment = app?.addAssessment;
  const currentUser = app?.currentUser || { name: 'Mechanic' };

  const firstVehicleId = vehicles[0]?.id || '';
  const [vehicleMode, setVehicleMode] = useState(prefillVehicleId || firstVehicleId ? 'existing' : 'manual');
  const [vehicleId, setVehicleId] = useState(prefillVehicleId || firstVehicleId);
  const [manualVehicle, setManualVehicle] = useState(prefillVehiclePlate || '');
  const [issue, setIssue] = useState('');
  const [conclusion, setConclusion] = useState('');
const [partId, setPartId] = useState('');
const [partSearch, setPartSearch] = useState('');
const [manualPart, setManualPart] = useState('');
const [qty, setQty] = useState(1);
const [parts, setParts] = useState([]);
 const partsTotalCost = parts.reduce((sum, p) => {
  return sum + Number(p.lineTotal ?? Number(p.qty || 0) * Number(p.sellingPrice || 0));
}, 0);

const filteredInventory = useMemo(() => {
  const q = partSearch.trim().toLowerCase();

  if (!q) return inventory.slice(0, 30);

  return inventory
    .filter((p) => {
      const text = `
        ${p.sku || ''}
        ${p.name || ''}
        ${p.category || ''}
        ${p.location || ''}
        ${p.supplier || ''}
        ${p.supplierName || ''}
      `.toLowerCase();

      return text.includes(q);
    })
    .slice(0, 30);
}, [inventory, partSearch]);

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function selectPartFromSearch(item) {
  setPartId(item.id);
  setPartSearch(`${item.sku || item.id} - ${item.name}`);
}

async function fetchFreshInventoryItem(id) {
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      '';

    const res = await fetch(`http://localhost:3000/api/inventory/${id}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch fresh inventory item:', err);
    return null;
  }
}

function getPartSellingPrice(item) {
  return Number(
    item?.sellingPrice ??
      item?.SellingPrice ??
      item?.selling_price ??
      item?.price ??
      item?.unitPrice ??
      item?.lastPrice ??
      0
  );
}
async function fetchFreshInventoryItem(id) {
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      '';

    const res = await fetch(`http://localhost:3000/api/inventory/${id}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch fresh inventory item:', err);
    return null;
  }
}

function getPartSellingPrice(item) {
  return Number(
    item?.sellingPrice ??
      item?.SellingPrice ??
      item?.selling_price ??
      item?.price ??
      item?.unitPrice ??
      item?.lastPrice ??
      0
  );
}

function buildPartLine(item, quantity) {
  const qtyNum = Number(quantity || 1);
  const sellingPrice = getPartSellingPrice(item);

  return {
    partId: item.id,
    sku: item.sku,
    name: item.name,
    qty: qtyNum,
    sellingPrice,
    lineTotal: qtyNum * sellingPrice,
    stockBefore: item.stock ?? item.currentStock ?? 0,
    location: item.location,
  };
}

async function addPart() {
  if (partId === 'manual') {
    if (!manualPart.trim()) return;

    const qtyNum = Number(qty || 1);

    setParts((prev) => [
      ...prev,
      {
        partId: 'manual',
        sku: 'MANUAL',
        name: manualPart.trim(),
        qty: qtyNum,
        sellingPrice: 0,
        lineTotal: 0,
      },
    ]);

    setManualPart('');
    setPartSearch('');
    setPartId('');
    setQty(1);
    return;
  }

  const localItem = inventory.find((p) => p.id === partId);

  if (!localItem) {
    alert('Please select a valid part from inventory.');
    return;
  }

  const freshItem = await fetchFreshInventoryItem(partId);
  const item = freshItem || localItem;

  const partLine = buildPartLine(item, qty);

  setParts((prev) => [...prev, partLine]);

  setPartSearch('');
  setPartId('');
  setQty(1);
}


  function removePart(index) {
    setParts(prev => prev.filter((_, i) => i !== index));
  }

  async function save(e) {
    e.preventDefault();

    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
   const payload = {
  vehicleMode,
  vehicleId: vehicleMode === 'existing' ? vehicleId : '',
  vehicle:
    vehicleMode === 'existing'
      ? selectedVehicle?.plate || selectedVehicle?.plateNumber || selectedVehicle?.id || ''
      : manualVehicle,
  issue,
  conclusion,
  parts,
  partsTotalCost,
  mechanic: currentUser?.name || 'Mechanic',
};

    if (!payload.vehicle && !payload.vehicleId) {
      alert('Please select a vehicle or input a vehicle plate/reference.');
      return;
    }

    if (!payload.issue.trim()) {
      alert('Please enter the issue detected.');
      return;
    }

    const saved = addAssessment ? await addAssessment(payload) : payload;
    onDone?.(saved || payload);
  }

  return (
    <form onSubmit={save} className="form-grid">
      <Field label="Vehicle Selection">
        <Select value={vehicleMode} onChange={e => setVehicleMode(e.target.value)}>
          <option value="existing">Select existing vehicle</option>
          <option value="manual">Input manually</option>
        </Select>
      </Field>

      {vehicleMode === 'existing' ? (
        <Field label="Vehicle">
          <Select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {vehicles.length === 0 && <option value="">No vehicles available</option>}
            {vehicles.map(v => (
              <option value={v.id} key={v.id}>
                {v.plate} - {v.model || v.type} - {v.status}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Vehicle Plate / Ref">
          <Input value={manualVehicle} onChange={e => setManualVehicle(e.target.value)} placeholder="Enter plate number or vehicle reference" />
        </Field>
      )}

      <Field label="Issue Detected">
        <Input required value={issue} onChange={e => setIssue(e.target.value)} placeholder="Example: Brake issue, engine noise, oil leak..." />
      </Field>

      <Field label="Conclusion / Initial Diagnosis">
        <TextArea value={conclusion} onChange={e => setConclusion(e.target.value)} placeholder="Write diagnosis or inspection notes..." />
      </Field>

   <Field label="Required Part">
  <div className="part-search-picker">
    <Input
      placeholder="Type SKU, part name, category, or location..."
      value={partSearch}
      onChange={(e) => {
        setPartSearch(e.target.value);
        setPartId('');
      }}
    />

    <Select
      value={partId}
      onChange={(e) => {
        const value = e.target.value;
        setPartId(value);

        if (value === 'manual') {
          setPartSearch('');
          return;
        }

        const selected = inventory.find((p) => p.id === value);

        if (selected) {
          setPartSearch(`${selected.sku || selected.id} - ${selected.name}`);
        }
      }}
    >
      <option value="">Choose matching part</option>

      {filteredInventory.map((p) => (
        <option value={p.id} key={p.id}>
          {p.sku || p.id} | {p.name} | Qty: {p.stock ?? p.currentStock ?? 0} | {formatMoney(p.sellingPrice)} | {p.location || 'No location'}
        </option>
      ))}

      <option value="manual">Manual input</option>
    </Select>

    {partSearch.trim() && filteredInventory.length > 0 && (
      <div className="part-search-results">
        {filteredInventory.slice(0, 8).map((p) => (
          <button
            type="button"
            key={p.id}
            onMouseDown={(e) => {
              e.preventDefault();
              selectPartFromSearch(p);
            }}
          >
            <b>{p.sku || p.id}</b>
            <span>{p.name}</span>
            <small>
              Stock: {p.stock ?? p.currentStock ?? 0} • Price: {formatMoney(p.sellingPrice)} • {p.location || 'No location'}
            </small>
          </button>
        ))}
      </div>
    )}

    <div className="part-search-actions">
      <Input
        type="number"
        min="1"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />

      <Button type="button" variant="secondary" onClick={addPart}>
        Add
      </Button>
    </div>
  </div>
</Field>

      {partId === 'manual' && (
        <Field label="Manual Part Name">
          <Input placeholder="Type part name" value={manualPart} onChange={e => setManualPart(e.target.value)} />
        </Field>
      )}

       <PartsCostTable parts={parts} />
     <div className="part-list editable-parts">
  {parts.map((p, i) => (
    <span key={`${p.name}-${i}`}>
      <b>{p.name}</b>
      x {p.qty}
      — Rs {Number(p.sellingPrice || 0).toFixed(2)}
      — Total Rs {Number(p.lineTotal ?? Number(p.qty || 0) * Number(p.sellingPrice || 0)).toFixed(2)}

      <button
        type="button"
        className="part-remove"
        onClick={() => removePart(i)}
      >
        Remove
      </button>
    </span>
  ))}
</div>

<div className="form-actions assessment-cost-summary">
  <b>Total Assessment Parts Cost:</b> Rs {Number(partsTotalCost || 0).toFixed(2)}
</div>

      <Field label="Photo Upload">
        <Input type="file" multiple />
      </Field>

      <div className="form-actions">
        <Button>Save Assessment</Button>
      </div>
    </form>
  );
}


export function GarageOpForm({ onDone, transaction }) {
  const { vehicles, assessments, addGarageOp, currentUser, mechanics } = useApp();
  const openAssessments = assessments.filter(a=>a.status!=='Completed').sort((a,b)=> (a.status==='Parts Issued' ? -1 : 0) - (b.status==='Parts Issued' ? -1 : 0));
  const selectedAssessment = openAssessments[0];
  const transactionVehicle = vehicles.find(v=>v.sourceTransactionId === transaction?.id);
  const [form, setForm] = useState({ vehicleMode:'existing', vehicleId: transactionVehicle?.id || selectedAssessment?.vehicleId || vehicles[0]?.id || '', manualVehicle:'', assessmentId: selectedAssessment?.id || '', transactionId: transaction?.id || '', type: transaction ? 'Build / Assembly' : 'Repair', checkInDateTime: toLocalInputValue(), expectedDeliveryDate: transaction?.expectedDeliveryDate || '', workDone: transaction ? 'Build/assembly started from purchase order.' : '', labor:'1 hr', status: transaction ? 'Build in Progress' : 'Ongoing', paymentStatus: 'Pending', mechanic: currentUser?.name || 'Workshop Team' });
  const selectedVehicle = vehicles.find(v=>v.id===form.vehicleId);
  const [selectedMechanics, setSelectedMechanics] = useState([]);
  useEffect(()=>{ if(selectedVehicle?.ownership === 'Internal' && form.paymentStatus === 'Pending') setForm(prev=>({...prev,paymentStatus:'None'})); }, [form.vehicleId]);
  function save(e){ e.preventDefault(); addGarageOp({
  ...form,
  mechanicIds: selectedMechanics
}); onDone?.(); }
  return <form onSubmit={save} className="form-grid">
    {transaction && <div className="notice form-actions"><b>Admin Request:</b> This garage ticket is linked to {transaction.id} / {transaction.poNumber}. Mechanic can update expected delivery and progress.</div>}
    <Field label="Vehicle Selection"><Select value={form.vehicleMode} onChange={e=>setForm({...form, vehicleMode:e.target.value})}><option value="existing">Select vehicle</option><option value="manual">Input manually</option></Select></Field>
    {form.vehicleMode==='existing' ? <Field label="Vehicle"><Select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId:e.target.value})}>{vehicles.map(v=><option value={v.id} key={v.id}>{v.plate} - {v.model || v.type} - {v.status}</option>)}</Select></Field> : <Field label="Vehicle Plate / Ref"><Input value={form.manualVehicle} onChange={e=>setForm({...form, manualVehicle:e.target.value})}/></Field>}
    <Field label="Assessment Ticket"><Select value={form.assessmentId} onChange={e=>setForm({...form, assessmentId:e.target.value})}><option value="">No assessment / build from PO</option>{openAssessments.map(a=><option value={a.id} key={a.id}>{a.id} - {a.vehicle} - {(a.parts||[]).map(p=>p.name).join(', ')}</option>)}</Select></Field>
    <Field label="Process Type"><Select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>{operationTypes.map(t=><option key={t}>{t}</option>)}</Select></Field>
    <Field label="Check-in Date & Time"><Input type="datetime-local" value={form.checkInDateTime} onChange={e=>setForm({...form, checkInDateTime:e.target.value})}/></Field>
    <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDeliveryDate} onChange={e=>setForm({...form,expectedDeliveryDate:e.target.value})}/></Field>
    <Field label="Mechanic"><Select value={form.mechanic} onChange={e=>setForm({...form,mechanic:e.target.value})}><option value="">Select mechanic</option>{mechanics.map(m=><option key={m.id || m.email} value={m.name}>{m.name}</option>)}<option value="Workshop Team">Workshop Team</option></Select></Field>
    <Field label="Assigned Mechanics">
  <MultipleMechanicsSelect
    mechanics={mechanics}
    selectedMechanics={selectedMechanics}
    setSelectedMechanics={setSelectedMechanics}
  />
</Field>
    <Field label="Status"><Select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Ongoing</option><option>Build in Progress</option><option>Built and Testing</option><option>Delivered</option><option>Completed</option></Select></Field>
    <Field label="Payment Status"><Select value={form.paymentStatus} onChange={e=>setForm({...form,paymentStatus:e.target.value})}><option>None</option><option>Pending</option><option>Paid</option></Select></Field>
    <Field label="Work Done / Work Plan"><TextArea required value={form.workDone} onChange={e=>setForm({...form,workDone:e.target.value})}/></Field>
    <Field label="Labor Hours"><Input value={form.labor} onChange={e=>setForm({...form,labor:e.target.value})}/></Field>
    <Field label="Photo Upload"><Input type="file" multiple /></Field>
    <div className="form-actions"><Button>Save Garage Work</Button></div>
  </form>;
}

export function TransactionForm({ onDone }) {
  const { createTransaction } = useApp();
  const [form, setForm] = useState({ type:'External Vehicle Order', supplier:'', supplierEmail:'', item:'CFMOTO Quad', quantity:1, status:'In Progress', poNumber:'', poFile:'', amount:0, startDate:today(), expectedDeliveryDate:'', notes:'', message:'' });
  function save(e){ e.preventDefault(); createTransaction(form); onDone?.(); }
  return <form onSubmit={save} className="form-grid">
    <Field label="Transaction Type"><Select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>External Vehicle Order</option><option>Parts Re-order</option><option>Repair / Service Billing</option></Select></Field>
    <Field label="Assigned Mechanics">
  <MultipleMechanicsSelect
    mechanics={mechanics}
    selectedMechanics={selectedMechanics}
    setSelectedMechanics={setSelectedMechanics}
  />
</Field>
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



