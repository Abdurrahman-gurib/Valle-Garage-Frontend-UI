import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { Button, Card, Field, Input, PageHeader, TextArea } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function nowLocal(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
function norm(v){ return String(v||'').toLowerCase(); }

export default function GuestDropoff(){
  const navigate = useNavigate();
  const { vehicleCatalog, findVehicleByPlate, createGuestTicket } = useApp();
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({ name:'', plate:'', vin:'', model:'', cc:'', type:'', contactNumber:'', email:'', notes:'', createdAt:nowLocal(), imageUrl:'' });
  const suggestions = useMemo(()=>{ 
    const q=norm(form.plate); 
    if(!q) return []; 
    return vehicleCatalog
      .filter(v=>norm(v.plate).includes(q))
      .sort((a,b)=>{
        const ap=String(a.plate||'').toUpperCase(), bp=String(b.plate||'').toUpperCase(), query=String(form.plate||'').toUpperCase();
        const score=p=>p===query?0:p.startsWith(query)?1:2;
        return score(ap)-score(bp) || ap.length-bp.length || ap.localeCompare(bp);
      })
      .slice(0,8); 
  }, [form.plate, vehicleCatalog]);
  function pick(v){ setForm(prev=>({...prev, plate:v.plate, vin:v.vin||'', model:v.model||'', cc:v.cc||'', type:v.type||'', imageUrl:v.imageUrl||'', createdAt:nowLocal()})); }
  function changePlate(value){ 
    const upper=value.toUpperCase();
    const exact = findVehicleByPlate(upper); 
    setForm(prev=>({...prev, plate:upper, ...((exact && String(exact.plate||'').toUpperCase()===upper) ? {vin:exact.vin||'',model:exact.model||'',cc:exact.cc||'',type:exact.type||'',imageUrl:exact.imageUrl||''} : {}) })); 
  }
  async function submit(e){ e.preventDefault(); const required=['name','plate','model','cc','type','contactNumber']; const missing=required.find(k=>!String(form[k]||'').trim()); if(missing) return alert('Please fill all mandatory fields before submitting.'); const ticket=await createGuestTicket({...form, deliveryPersonName:form.name, status:'Pending'}); setDone(ticket); }
  if(done) return <div className="guest-page"><Card><Logo/><h1>Garage Drop-off Created</h1><p>Your ticket was created successfully.</p><h2>{done.id}</h2><p><b>Plate:</b> {done.plate}</p><p><b>Date/Time:</b> {(done.createdAt || '').replace('T',' ')}</p><p>A mechanic will take this ticket and continue the normal garage process.</p><div className="form-actions"><Button onClick={()=>setDone(null)}>Create Another Ticket</Button><Button variant="secondary" onClick={()=>navigate('/login')}>Back to Login</Button></div></Card></div>;
  return <div className="guest-page"><Card className="guest-card"><Logo/><PageHeader title="Guest Garage Drop-off" subtitle="Use this when a vehicle must be placed in garage and no mechanic is currently around." />
    <form className="form-grid" onSubmit={submit}>
      <Field label="Name of Person Delivering"><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label="Plate Number"><Input required value={form.plate} onChange={e=>changePlate(e.target.value)}/>{suggestions.length>0 && <div className="inline-suggestions">{suggestions.map(v=><button type="button" key={v.plate} onMouseDown={(e)=>{e.preventDefault(); pick(v);}}><b>{v.plate}</b><span>{v.model}</span><small>{v.vin}</small></button>)}</div>}</Field>
      <Field label="VIN / Chassis No. Auto-filled / Optional"><Input value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})}/></Field>
      <Field label="Model Auto-filled"><Input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></Field>
      <Field label="CC / Power Auto-filled"><Input required value={form.cc} onChange={e=>setForm({...form,cc:e.target.value})}/></Field>
      <Field label="Vehicle Type Auto-filled"><Input required value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></Field>
      <Field label="Contact Number"><Input required value={form.contactNumber} onChange={e=>setForm({...form,contactNumber:e.target.value})}/></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
      <Field label="Date & Time"><Input readOnly value={form.createdAt.replace('T',' ')}/></Field>
      <Field label="Reason / Notes"><TextArea required value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      {form.imageUrl && <div className="vehicle-form-preview form-actions"><img src={form.imageUrl}/><section><h3>{form.model}</h3><p>{form.plate} • {form.cc}</p></section></div>}
      <div className="form-actions"><Button>Create Guest Garage Ticket</Button><Button type="button" variant="secondary" onClick={()=>navigate('/login')}>Back</Button></div>
    </form>
  </Card></div>
}
