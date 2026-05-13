import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import SearchBox from '../components/SearchBox.jsx';
import { useApp } from '../context/AppContext.jsx';

const nav = [
  { to:'/dashboard', key:'dashboard', label:'Dashboard', icon:'⌂' },
  { to:'/guest-pending', key:'guest-pending', label:'Guest Pending', icon:'!' },
  { to:'/vehicles', key:'vehicles', label:'Vehicles', icon:'▣' },
  { to:'/assessments', key:'assessments', label:'Assessments', icon:'✓' },
  { to:'/inventory', key:'inventory', label:'Parts', icon:'▥' },
  { to:'/garage', key:'garage', label:'Garage Work', icon:'⚙' },
  { to:'/transactions', key:'transactions', label:'Transactions', icon:'▤' },
  { to:'/reports', key:'reports', label:'Reports', icon:'▦' },
  { to:'/settings', key:'settings', label:'Settings', icon:'⚑' }
];

export default function AppLayout() {
  const { currentUser, logout, can, notifications } = useApp();
  const navigate = useNavigate();
  const items = nav.filter(n => can(n.key));
  return <div className="app-shell">
    <aside className="sidebar">
      <Logo />
      <div className="role-pill"><b>{currentUser?.name}</b><span>{currentUser?.label}</span></div>
      <nav>{items.map(n=><NavLink key={n.to} to={n.to}><span>{n.icon}</span>{n.label}</NavLink>)}</nav>
      <button className="logout" onClick={()=>{logout(); navigate('/login');}}>Logout</button>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><b>Internal Garage System</b><span>Simple workflow for employees</span></div><SearchBox/><div className="top-actions"><button className="notif" onClick={()=>navigate('/notifications')}>🔔 {notifications.length}</button><button className="user-chip"><b>{currentUser?.name}</b><small>{currentUser?.label}</small></button></div></header>
      <Outlet />
    </main>
  </div>;
}
