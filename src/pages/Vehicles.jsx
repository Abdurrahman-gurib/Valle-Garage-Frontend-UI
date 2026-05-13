import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Card, Modal, PageHeader, Table } from '../components/UI.jsx';
import { VehicleForm } from '../components/Forms.jsx';

export default function Vehicles() {
  const { vehicles, vehicleCatalog, can } = useApp();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('');
  const suggestions = useMemo(() => {
    const q = filter.toLowerCase();
    if(!q) return [];
    const all = [...vehicles, ...vehicleCatalog];
    const seen = new Set();
    return all.filter(v => {
      const plate = (v.plate || v.plateNumber || '').toUpperCase();
      if(seen.has(plate)) return false;
      seen.add(plate);
      return JSON.stringify(v).toLowerCase().includes(q);
    }).slice(0,8);
  }, [filter, vehicles, vehicleCatalog]);
  const shown = vehicles.filter(v => JSON.stringify(v).toLowerCase().includes(filter.toLowerCase()));
  return <div className="page">
    <PageHeader title="Vehicles" subtitle="Search a plate number to open the full garage history, assessments, parts issued, mechanics and repair records." action={can('vehicles') ? () => setModal({ type:'add' }) : null} actionLabel="Add Vehicle" />
    <div className="vehicle-search-zone">
      <input className="page-filter" placeholder="Search plate, VIN, model, company, mechanic..." value={filter} onChange={e=>setFilter(e.target.value)} />
      {suggestions.length > 0 && <div className="vehicle-search-results">{suggestions.map(v=><button key={`${v.plate || v.plateNumber}-${v.vin}`} onClick={()=>navigate(`/vehicles/${encodeURIComponent(v.plate || v.plateNumber)}`)}><img src={v.imageUrl || '/vehicles/quad-450l.jpeg'} /><span><b>{v.plate || v.plateNumber}</b><small>{v.model || v.type || v.vehicleType} • {v.vin || 'No VIN'}</small></span></button>)}</div>}
    </div>
    <Table headers={["Plate","Image","Model / Type","Internal/External","Owner / Company","Status","Check-in","Action"]}>
      {shown.map(v => <tr key={v.id}>
        <td><b>{v.plate}</b><br/><small>{v.vin || '-'}</small></td>
        <td><img className="table-vehicle-img" src={v.imageUrl || '/vehicles/quad-450l.jpeg'} /></td>
        <td>{v.model || v.type}<br/><small>{v.cc || v.type}</small></td>
        <td>{v.ownership}</td>
        <td>{v.companyName || v.owner}</td>
        <td><Badge tone={v.status === 'Active' ? 'success' : v.status === 'Under Repair' || v.status === 'Build in Progress' ? 'warning' : 'danger'}>{v.status}</Badge></td>
        <td>{v.checkInDateTime?.replace('T',' ') || '-'}</td>
        <td><button className="open-btn" onClick={()=>navigate(`/vehicles/${encodeURIComponent(v.plate)}`)}>Open History</button></td>
      </tr>)}
    </Table>
    {modal?.type === 'add' && <Modal title="Add Vehicle" onClose={()=>setModal(null)} wide><VehicleForm onDone={()=>setModal(null)} /></Modal>}
  </div>;
}
