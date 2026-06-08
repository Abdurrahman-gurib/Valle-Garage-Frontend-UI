import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function fmtDate(v){ return v ? String(v).replace('T',' ').slice(0,16) : '-'; }

export default function FuelConsumption(){
  const { vehicles, fuelConsumptions, addFuelConsumption, nowLocalInput, findVehicleByPlate } = useApp();
  const [plateSearch, setPlateSearch] = useState('');
  const [form,setForm] = useState({ vehicleId:'', fuelType:'PETROL', meterType:'KM', meterReading:'', fuelLitres:'', recordedAt:nowLocalInput(), notes:'' });
  const [message,setMessage] = useState('');

  const suggestions = useMemo(()=>{
    const q = plateSearch.trim().toLowerCase();
    if(!q) return [];
    return vehicles
      .filter(v => `${v.plate} ${v.model} ${v.vin} ${v.type}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [plateSearch, vehicles]);

  function selectVehicle(v){
    setPlateSearch(v.plate);
    setForm(prev => ({ ...prev, vehicleId: v.dbId || v.id }));
  }

  async function submit(e){
    e.preventDefault();
    let selected = vehicles.find(v => v.id === form.vehicleId || v.dbId === form.vehicleId) || findVehicleByPlate(plateSearch);
    if(!selected){ setMessage('Please select a valid vehicle from the dropdown.'); return; }
    if(!form.fuelLitres || Number(form.fuelLitres) <= 0){ setMessage('Please enter fuel consumption in litres.'); return; }
    await addFuelConsumption({ ...form, vehicleId: selected.dbId || selected.id });
    setMessage(`Fuel saved for ${selected.plate}. Reports are available in the Reports page.`);
    setForm(prev => ({ ...prev, meterReading:'', fuelLitres:'', notes:'', recordedAt:nowLocalInput() }));
  }

  const today = nowLocalInput().slice(0,10);
  const todaysRecords = fuelConsumptions.filter(r => String(r.recordedAt || '').slice(0,10) === today);
  const oldRecords = fuelConsumptions.filter(r => String(r.recordedAt || '').slice(0,10) !== today).slice(0, 30);
  const recent = todaysRecords;

  return <div className="page">
    <PageHeader title="Fuel Management System" subtitle="Record petrol or diesel usage only. Report extraction is managed from the Reports module." />

    <Card className="section-small">
      <h2>Record Fuel Entry</h2>
      <p className="muted">Start typing the quad / vehicle plate. Data is loaded from the database and appears in the dropdown.</p>
      {message && <div className="notice success">{message}</div>}
      <form onSubmit={submit} className="form-grid four">
        <Field label="Search / Select Vehicle Plate">
          <Input list="fuel-vehicle-list" placeholder="Type plate, e.g. AP 100" value={plateSearch} onChange={e=>{ setPlateSearch(e.target.value.toUpperCase()); setForm(prev=>({...prev, vehicleId:''})); }} />
          <datalist id="fuel-vehicle-list">
            {vehicles.map(v => <option key={v.dbId || v.id} value={v.plate}>{v.model || v.type}</option>)}
          </datalist>
          {suggestions.length > 0 && <div className="suggestion-panel">
            {suggestions.map(v => <button type="button" key={v.dbId || v.id} onClick={()=>selectVehicle(v)}><b>{v.plate}</b><span>{v.model || v.type} {v.cc ? `• ${v.cc}` : ''}</span></button>)}
          </div>}
        </Field>
        <Field label="Fuel Type"><select className="input" value={form.fuelType} onChange={e=>setForm({...form,fuelType:e.target.value})}><option value="PETROL">Petrol</option><option value="DIESEL">Diesel</option><option value="OIL">Oil</option></select></Field>
        <Field label="Meter Type"><select className="input" value={form.meterType} onChange={e=>setForm({...form,meterType:e.target.value})}><option value="KM">Kilometres / KM</option><option value="HRS">Hours / HRS</option></select></Field>
        <Field label="Meter Reading"><Input type="number" step="0.01" value={form.meterReading} onChange={e=>setForm({...form,meterReading:e.target.value})} /></Field>
        <Field label="Fuel Consumption / L"><Input type="number" step="0.01" value={form.fuelLitres} onChange={e=>setForm({...form,fuelLitres:e.target.value})} /></Field>
        <Field label="Recorded Date & Time"><Input type="datetime-local" value={form.recordedAt} onChange={e=>setForm({...form,recordedAt:e.target.value})} /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional" /></Field>
        <Field label="Save"><Button>Save Fuel Entry</Button></Field>
      </form>
    </Card>

    <Card>
      <h2>Today's Fuel Records</h2>
      <p className="muted">This page refreshes daily. Older fuel records remain stored below and in Reports.</p>
      <Table headers={["Date", "Vehicle", "Fuel", "Meter", "Litres", "Recorded By"]}>
        {recent.map(r => <tr key={r.id}><td>{fmtDate(r.recordedAt)}</td><td><b>{r.vehicle}</b></td><td>{r.fuelType}</td><td>{r.meterReading} {r.meterType}</td><td><b>{r.fuelLitres} L</b></td><td>{r.recordedBy || '-'}</td></tr>)}
        {!recent.length && <tr><td colSpan="6">No fuel records yet.</td></tr>}
      </Table>
    </Card>
    <Card><h2>Previous Fuel Records</h2><Table headers={["Date", "Vehicle", "Fuel", "Meter", "Litres", "Recorded By"]}>{oldRecords.map(r => <tr key={r.id}><td>{fmtDate(r.recordedAt)}</td><td><b>{r.vehicle}</b></td><td>{r.fuelType}</td><td>{r.meterReading} {r.meterType}</td><td><b>{r.fuelLitres} L</b></td><td>{r.recordedBy || '-'}</td></tr>)}{!oldRecords.length && <tr><td colSpan="6">No previous records yet.</td></tr>}</Table></Card>
  </div>;
}
