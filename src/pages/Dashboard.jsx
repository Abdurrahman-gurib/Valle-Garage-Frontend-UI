import { useNavigate } from 'react-router-dom';
import { Card, PageHeader, Badge } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Dashboard(){
  const { currentUser, vehicles, inventory, assessments, garageOps, transactions, guestTickets } = useApp();
  const navigate = useNavigate();
  const lowStock = inventory.filter(i=>i.stock <= i.reorderLevel);
  const opened = assessments.filter(a=>['Opened','In Diagnosis'].includes(a.status));
  const myOpened = opened.filter(a => currentUser.role !== 'mechanic' || a.mechanic === currentUser.name);
  const ongoing = garageOps.filter(g=>['Ongoing','Build in Progress','Built and Testing'].includes(g.status));
  const myOngoing = ongoing.filter(g => currentUser.role !== 'mechanic' || g.mechanic === currentUser.name || g.mechanic === 'Workshop Team');
  const adminRequests = transactions.filter(t => ['External Vehicle Order','Repair / Service Billing'].includes(t.type) && ['Pending','In Progress','Build in Progress'].includes(t.status));
  const stats = [
    ['Vehicles', vehicles.length, 'Open fleet records', '/vehicles'],
    ['In Garage', vehicles.filter(v=>v.status!=='Active').length, 'Repair / service queue', '/garage'],
    ['Low Stock', lowStock.length, 'Needs reorder', '/inventory'],
    ['Assessments', assessments.length, 'Diagnosis records', '/assessments'],
    ['Guest Tickets', guestTickets?.filter(t=>t.status==='Pending').length || 0, 'Drop-off waiting mechanic', '/guest-pending']
  ];
  return <div className="page"><PageHeader title={`Today’s ${currentUser.label} Dashboard`} subtitle="A simple view of vehicles, parts, admin requests and work that needs attention." />
    <div className="stats-grid">{stats.map(s=><Card key={s[0]} onClick={()=>navigate(s[3])}><div className="stat-icon">▣</div><span className="arrow">›</span><h3>{s[0]}</h3><strong>{s[1]}</strong><p>{s[2]}</p></Card>)}</div>
    <div className="dashboard-grid"><Card><div className="card-head"><h2>Vehicle Work Queue</h2><button onClick={()=>navigate('/vehicles')} className="outline-btn">View all</button></div><p>Click a vehicle to view full details and history.</p><div className="mini-table">{vehicles.slice(0,4).map(v=><button key={v.id} onClick={()=>navigate('/vehicles')}><b>{v.plate}</b><span>{v.type}</span><Badge tone={v.status==='Active'?'success':v.status==='Under Repair' || v.status==='Build in Progress'?'warning':'danger'}>{v.status}</Badge><span>{v.checkInDateTime?.replace('T',' ') || `${v.hours} hrs`}</span></button>)}</div></Card>
    <Card><h2>Next Actions</h2><p>Simple task list for staff.</p><div className="task-list"><button onClick={()=>navigate('/assessments')}>Review opened assessments</button><button onClick={()=>navigate('/garage')}>Complete ongoing garage work</button><button onClick={()=>navigate('/inventory')}>Review low-stock report</button></div></Card></div>
    {currentUser.role==='mechanic' && <div className="two-grid"><Card><h2>Recent Opened Assessments</h2><p>Assessments that are opened/in progress and may need action.</p>{myOpened.map(a=><div className="list-row" key={a.id}><b>{a.id}</b><span>{a.vehicle}</span><Badge tone="warning">{a.status}</Badge></div>)}</Card><Card><h2>Ongoing Work Assigned</h2><p>Garage jobs and build requests assigned to you or the workshop team.</p>{myOngoing.map(g=><div className="list-row" key={g.id}><b>{g.id}</b><span>{g.vehicle} • {g.type}</span><Badge tone="warning">{g.status}</Badge></div>)}</Card></div>}
    {currentUser.role==='mechanic' && <Card className="section-small"><h2>Guest Pending Tickets</h2>{(guestTickets||[]).filter(t=>t.status==='Pending').map(t=><div className="list-row" key={t.id}><b>{t.id}</b><span>{t.plate} • {t.name || t.deliveryPersonName}</span><Badge tone="warning">Pending</Badge></div>)}<button className="open-btn" onClick={()=>navigate('/guest-pending')}>Open Guest Pending</button></Card>}
    {currentUser.role==='mechanic' && <Card className="section-small"><h2>Admin Build / Repair Requests</h2>{adminRequests.map(t=><div className="list-row" key={t.id}><b>{t.id}</b><span>{t.item} • Expected {t.expectedDeliveryDate || 'TBD'}</span><Badge tone="warning">{t.status}</Badge></div>)}</Card>}
    {currentUser.role==='store' && <div className="two-grid"><Card><h2>Assessments Waiting for Parts</h2><p>Open tickets from mechanics. View required parts and issue stock.</p>{opened.map(a=><div className="list-row" key={a.id}><b>{a.id}</b><span>{a.vehicle} • {a.parts.map(p=>`${p.name} x${p.qty}`).join(', ') || 'No parts added'}</span></div>)}</Card><Card><h2>Pending Transactions</h2>{transactions.filter(t=>!['Completed','Paid'].includes(t.status)).map(t=><div className="list-row" key={t.id}><b>{t.id}</b><span>{t.item}</span><Badge tone="warning">{t.status}</Badge></div>)}</Card></div>}
    {currentUser.role==='admin' && <div className="two-grid"><Card><h2>Management Overview</h2><div className="insight-grid"><div>Fleet Ready <b>82%</b></div><div>Parts Risk <b>{lowStock.length}</b></div><div>Open Tickets <b>{opened.length}</b></div><div>PO / Sales Pipeline <b>Rs {transactions.reduce((s,t)=>s+Number(t.amount||0),0).toLocaleString()}</b></div></div></Card><Card><h2>Admin Actions</h2><div className="task-list"><button onClick={()=>navigate('/transactions')}>Add / Review Transactions</button><button onClick={()=>navigate('/vehicles')}>Create vehicle from PO</button><button onClick={()=>navigate('/reports')}>Open reports</button></div></Card></div>}
  </div>;
}
