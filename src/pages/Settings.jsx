import { useState } from 'react';
import { Button, Card, Field, Input, Modal, PageHeader, Select } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Settings(){
  const { users, addUser, apiStatus } = useApp();
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({ name:'', email:'', role:'mechanic', password:'password123' });
  async function save(){
    if(!form.name.trim()) return alert('Enter user name.');
    const email = form.email.includes('@') ? form.email : `${form.email || form.name.toLowerCase().replaceAll(' ', '.')}@vallepark.com`;
    await addUser({ ...form, email });
    setForm({ name:'', email:'', role:'mechanic', password:'password123' });
    setModal(false);
  }
  return <div className="page"><PageHeader title="Settings" subtitle={`Manage users, roles and simple system rules. API: ${apiStatus}`} action={()=>setModal(true)} actionLabel="Add User"/><div className="settings-grid"><Card><h2>Users</h2>{users.map(u=><div className="user-row" key={u.id || u.email}><b>{u.name}</b><span>{u.email}</span><span>{u.label || u.role}</span></div>)}</Card><Card><h2>Rules</h2>{['Prevent duplicate vehicle plates','Block issuance beyond stock','Require assessment before process','Enable audit trail','Require reason when reopening assessment','Store all frontend changes in PostgreSQL through API'].map(rule=><label className="rule-row" key={rule}><span>{rule}</span><input type="checkbox" defaultChecked /></label>)}</Card></div>{modal&&<Modal title="Add User" onClose={()=>setModal(false)}><div className="form-grid"><Field label="Name"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Email"><Input placeholder="name@vallepark.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Temporary Password"><Input value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field><Field label="Role"><Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="admin">Admin</option><option value="mechanic">Mechanic</option><option value="store">Store Keeper</option></Select></Field><Field label="Suggested Permission Template"><Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="admin">Full Access</option><option value="mechanic">Mechanic: vehicles, assessments, garage ops</option><option value="store">Store: vehicles, assessments, inventory, transactions</option></Select></Field><Button onClick={save}>Save User</Button></div></Modal>}</div>
}
