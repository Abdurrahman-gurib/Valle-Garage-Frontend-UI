import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssessmentForm, VehicleForm } from '../components/Forms.jsx';
import { Badge, Button, Card, Modal, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';



function VehiclePartsMap({ vehicle }) {
  const isBuggy = String(vehicle.type || vehicle.model || '').toLowerCase().includes('buggy') || String(vehicle.model || '').toLowerCase().includes('uforce');
  const points = isBuggy ? [
    { name: 'Front Lights', x: 23, y: 42, note: 'Check lamps, indicators, front wiring, lens condition and visibility during night rides.', risk: 'Electrical / safety' },
    { name: 'Front Suspension', x: 30, y: 68, note: 'Inspect shocks, arms, bushes, ball joints and steering play after trail use.', risk: 'Handling / stability' },
    { name: 'Cabin / Roll Cage', x: 48, y: 24, note: 'Check roll cage, frame bolts, dashboard, safety belts and protective structure.', risk: 'Passenger safety' },
    { name: 'Seat Area', x: 51, y: 48, note: 'Inspect seat mounts, belt clips, rider position and cabin comfort.', risk: 'Rider control' },
    { name: 'Engine Bay', x: 63, y: 62, note: 'Check engine oil, coolant, belt, filters, leaks, overheating and service intervals.', risk: 'Mechanical failure' },
    { name: 'Rear Cargo Bed', x: 76, y: 36, note: 'Inspect cargo bed, hinges, rear body panel, mounts and load area damage.', risk: 'Body / utility' },
    { name: 'Rear Wheel / Brake', x: 78, y: 78, note: 'Inspect tyre, rim, rear brake, bearing, axle and abnormal vibration.', risk: 'Braking / traction' }
  ] : [
    { name: 'Handlebar / Controls', x: 45, y: 18, note: 'Throttle, brake lever, switch controls, steering alignment and cable movement.', risk: 'Control loss' },
    { name: 'Front Lights', x: 25, y: 36, note: 'Headlight, indicators, wiring, lens cracks and front electrical connectors.', risk: 'Visibility / electrical' },
    { name: 'Front Wheel / Brake', x: 25, y: 75, note: 'Tyre, rim, disc, caliper, brake pads and front wheel bearing condition.', risk: 'Braking / steering' },
    { name: 'Seat', x: 56, y: 34, note: 'Seat lock, rider comfort, mounting clips and water/dust damage.', risk: 'Rider stability' },
    { name: 'Engine / Belt Area', x: 55, y: 62, note: 'Engine, drive belt, oil, filters, cooling fan, leaks and abnormal noise.', risk: 'Powertrain' },
    { name: 'Rear Suspension', x: 72, y: 62, note: 'Rear shocks, swing arm, bushes, mounts and trail-impact damage.', risk: 'Ride quality' },
    { name: 'Rear Wheel / Drivetrain', x: 78, y: 78, note: 'Rear tyre, axle, chain/shaft drive, rear brake and wheel bearing.', risk: 'Traction / drivetrain' }
  ];

  const safetyGear = [
    { name: 'Certified Helmet', detail: 'Must be worn and securely fastened before operating the vehicle.' },
    { name: 'Eye Protection / Goggles', detail: 'Protects eyes from dust, branches, stones and trail debris.' },
    { name: 'Gloves', detail: 'Improves grip and protects hands during long rides or rough terrain.' },
    { name: 'Closed Shoes / Boots', detail: 'No sandals. Use strong closed footwear with ankle support where possible.' },
    { name: 'Long Pants / Protective Clothing', detail: 'Reduces scratches, burns and impact injuries.' },
    { name: 'Seat Belt / Harness', detail: 'Mandatory for buggy/UTV vehicles before moving.' },
    { name: 'Passenger Briefing', detail: 'Explain speed limits, hand placement, no standing, and emergency stop rules.' },
    { name: 'Pre-ride Check', detail: 'Check brakes, lights, tyre pressure, steering, fuel/battery and abnormal leaks.' }
  ];

  return <div className="inspection-modal-grid">
    <div className="inspection-map-stage" title="Click or hover markers to inspect mapped vehicle parts">
      <img src={vehicle.imageUrl || '/vehicles/quad-450l.jpeg'} alt={vehicle.model || vehicle.type || 'Vehicle'} />
      {points.map((p, i) => (
        <button key={p.name} className="part-hotspot inspection-hotspot" style={{ left: `${p.x}%`, top: `${p.y}%` }} type="button">
          <span className="hotspot-dot">{i + 1}</span>
          <span className="hotspot-card"><b>{p.name}</b><small>{p.note}</small></span>
        </button>
      ))}
    </div>
    <div className="inspection-info-panel">
      <h3>Mapped Inspection Points</h3>
      <p>Click or hover the numbered points on the centered vehicle image. Each marker explains what mechanics should inspect and which risk area it belongs to.</p>
      <div className="inspection-point-list">
        {points.map((p, i) => <div className="inspection-point-row" key={p.name}>
          <b>{i + 1}. {p.name}</b>
          <span>{p.note}</span>
          <small>Risk area: {p.risk}</small>
        </div>)}
      </div>
      <div className="safety-equipment-panel">
        <h3>Mandatory Safety Accessories & Equipment</h3>
        <p>Before this vehicle is used, the rider/operator must confirm these items.</p>
        <div className="safety-check-grid">
          {safetyGear.map((item, index) => <label key={item.name} className="safety-check-card">
            <input type="checkbox" />
            <span><b>{index + 1}. {item.name}</b><small>{item.detail}</small></span>
          </label>)}
        </div>
      </div>
    </div>
  </div>
}


export default function VehicleHistory(){
  const { plate } = useParams();
  const navigate = useNavigate();
  const { findVehicleByPlate, getVehicleHistory, exportVehicleHistory } = useApp();
  const [filter, setFilter] = useState({ type:'all', from:'', to:'' });
  const [modal, setModal] = useState(null);
  const vehicle = findVehicleByPlate(decodeURIComponent(plate || ''));
  const history = useMemo(()=>getVehicleHistory(vehicle?.plate || plate, filter), [vehicle?.plate, plate, filter, getVehicleHistory]);
  if(!vehicle) return <div className="page"><PageHeader title="Vehicle not found" subtitle="No record found for this plate."/><button className="open-btn" onClick={()=>navigate('/vehicles')}>Back to Vehicles</button></div>;
  const totalParts = history.parts.reduce((s,p)=>s+Number(p.qty||1),0);
  return <div className="page">
    <PageHeader title={`${vehicle.plate} Full Garage History`} subtitle="Complete visibility of this vehicle: assessments, repair jobs, mechanics, issued parts, visit frequency and exportable history report." action={()=>setModal({type:'edit'})} actionLabel="Edit Vehicle" />
    <div className="vehicle-hero-card vehicle-wow-card clean-vehicle-hero">
      <div className="normal-vehicle-photo">
        <img src={vehicle.imageUrl || '/vehicles/quad-450l.jpeg'} alt={vehicle.model || vehicle.type || 'Vehicle'} />
      </div>
      <div><h2>{vehicle.model || vehicle.type}</h2><p><b>VIN:</b> {vehicle.vin || '-'} • <b>CC:</b> {vehicle.cc || '-'} • <b>Type:</b> {vehicle.type}</p><p><b>Ownership:</b> {vehicle.ownership} • <b>Status:</b> {vehicle.status} • <b>Hour Meter:</b> {vehicle.hours}</p><p><b>Owner/Company:</b> {vehicle.companyName || vehicle.owner || '-'} • <b>Delivery Person:</b> {vehicle.deliveryPersonName || '-'}</p><p className="subtitle">Open the inspection map to view key mechanical areas and component notes.</p><button className="inspect-small-btn clean-inspect-btn" type="button" onClick={()=>setModal({type:'parts-map'})}>Inspect vehicle</button></div>
    </div>
    <div className="history-toolbar">
      <Button variant={filter.type==='all'?'primary':'secondary'} onClick={()=>setFilter({type:'all'})}>All</Button>
      <Button variant={filter.type==='week'?'primary':'secondary'} onClick={()=>setFilter({type:'week'})}>Week</Button>
      <Button variant={filter.type==='month'?'primary':'secondary'} onClick={()=>setFilter({type:'month'})}>Month</Button>
      <Button variant={filter.type==='year'?'primary':'secondary'} onClick={()=>setFilter({type:'year'})}>Year</Button>
      <input className="input" type="date" value={filter.from || ''} onChange={e=>setFilter({...filter,type:'manual',from:e.target.value})}/>
      <input className="input" type="date" value={filter.to || ''} onChange={e=>setFilter({...filter,type:'manual',to:e.target.value})}/>
      <Button onClick={()=>exportVehicleHistory(vehicle.plate, filter, 'csv')}>Export CSV</Button>
      <Button variant="secondary" onClick={()=>exportVehicleHistory(vehicle.plate, filter, 'excel')}>Export Excel</Button>
    </div>
    <div className="stats-grid">
      <Card><h3>Garage Visits</h3><strong>{history.visits}</strong><p>Total assessments + work jobs</p></Card>
      <Card><h3>Assessments</h3><strong>{history.assessments.length}</strong><p>Diagnostic records</p></Card>
      <Card><h3>Parts Issued/Used</h3><strong>{totalParts}</strong><p>Total quantity tracked</p></Card>
      <Card><h3>Mechanics</h3><strong>{history.mechanics.length}</strong><p>{history.mechanics.join(', ') || 'None'}</p></Card>
    </div>
    <div className="two-grid">
      <Card><h2>Vehicle Full Details</h2><p><b>Plate:</b> {vehicle.plate}</p><p><b>VIN/Chassis:</b> {vehicle.vin || '-'}</p><p><b>Model:</b> {vehicle.model || '-'}</p><p><b>CC / Power:</b> {vehicle.cc || '-'}</p><p><b>Check-in:</b> {vehicle.checkInDateTime?.replace('T',' ') || '-'}</p><p><b>Expected Delivery:</b> {vehicle.expectedDeliveryDate || '-'}</p><p><b>Notes:</b> {vehicle.notes || '-'}</p></Card>
      <Card><h2>Quick Actions</h2><div className="task-list"><button onClick={()=>setModal({type:'assessment'})}>Create New Assessment</button><button onClick={()=>setModal({type:'edit'})}>Edit Vehicle Details</button><button onClick={()=>window.print()}>Print History Page</button></div></Card>
    </div>
    <h2 className="section-small">Assessment Records</h2>
    <Table headers={["Ticket","Date","Mechanic","Status","Issue","Required / Issued Parts"]}>{history.assessments.map(a=><tr key={a.id}><td><b>{a.id}</b></td><td>{a.createdAt || '-'}</td><td>{a.mechanic || '-'}</td><td><Badge tone={a.status==='Completed'?'success':'warning'}>{a.status}</Badge></td><td>{a.issue}<br/><small>{a.conclusion}</small></td><td>{(a.parts||[]).map(p=>`${p.name} x${p.qty}`).join(', ') || 'None'}{a.issuedPartsNote && <small><br/>Issued note: {a.issuedPartsNote}</small>}</td></tr>)}</Table>
    <h2 className="section-small">Garage Work / Repair History</h2>
    <Table headers={["Process","Check-in","Mechanic","Type","Status","Work Done","Parts Used","Payment"]}>{history.garageOps.map(g=><tr key={g.id}><td><b>{g.id}</b></td><td>{g.checkInDateTime?.replace('T',' ') || '-'}</td><td>{g.mechanic || '-'}</td><td>{g.type}</td><td><Badge tone={g.status==='Completed'?'success':'warning'}>{g.status}</Badge></td><td>{g.workDone}</td><td>{(g.partsUsed||[]).map(p=>`${p.name} x${p.qty}`).join(', ') || 'None'}</td><td>{g.paymentStatus || 'None'}</td></tr>)}</Table>
    {modal?.type==='parts-map' && <Modal title={`${vehicle.plate} Interactive Inspection Map`} onClose={()=>setModal(null)} wide>
      <VehiclePartsMap vehicle={vehicle} />
    </Modal>}
    {modal?.type==='edit' && <Modal title={`Edit ${vehicle.plate}`} onClose={()=>setModal(null)} wide><VehicleForm initialVehicle={vehicle} onDone={()=>setModal(null)} /></Modal>}
    {modal?.type==='assessment' && <Modal title={`New Assessment for ${vehicle.plate}`} onClose={()=>setModal(null)} wide><AssessmentForm prefillVehicleId={vehicle.id} onDone={()=>setModal(null)} /></Modal>}
  </div>;
}
