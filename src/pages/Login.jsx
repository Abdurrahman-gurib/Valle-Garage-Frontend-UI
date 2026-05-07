import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { useApp } from '../context/AppContext.jsx';

const roles = [
  { role:'admin', title:'Admin', subtitle:'Full System Admin', desc:'Manage users, fleet, inventory, assessments, reports and rules.', color:'pink', email:'admin@valle.com', pass:'admin123' },
  { role:'mechanic', title:'Mechanic', subtitle:'Garage Mechanic', desc:'Create assessments and record repairs, servicing and maintenance.', color:'green', email:'mechanic@valle.com', pass:'mech123' },
  { role:'store', title:'Store Keeper', subtitle:'Spare Parts Keeper', desc:'Manage parts, barcode lookup, issuance and low-stock alerts.', color:'yellow', email:'store@valle.com', pass:'store123' }
];

export default function Login(){
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();
  function choose(r){ setSelected(r); setEmail(r.email); setPassword(r.pass); setError(''); }
  function submit(e){ e.preventDefault(); const res=login(selected.role,email,password); if(res.ok) navigate('/dashboard'); else setError(res.message); }
  return <div className="login-page"><div className="login-banner"><div className="login-banner-inner"><Logo/><h1>Garage & Spare Parts Management</h1></div></div><main className="login-main"><section className="login-card"><p className="kicker">START HERE</p>{!selected ? <><h2>Choose Access</h2><p className="login-help">Pick your job role. The system will show only what you need.</p><div className="role-grid">{roles.map(r=><button key={r.role} onClick={()=>choose(r)} className={`role-card ${r.color}`}><h3>{r.title}</h3><b>{r.subtitle}</b><span>{r.desc}</span></button>)}</div></> : <form onSubmit={submit} className="login-form"><button type="button" className="link-btn" onClick={()=>setSelected(null)}>← Back to roles</button><h2>{selected.title} Login</h2><p className="login-help">{selected.subtitle}</p>{error && <div className="error">{error}</div>}<label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn btn-primary">Login</button><small>Demo: {selected.email} / {selected.pass}</small></form>}</section></main></div>;
}
