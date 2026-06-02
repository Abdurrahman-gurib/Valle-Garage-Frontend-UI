import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Modal, PageHeader, Table } from '../components/UI.jsx';
import { VehicleForm, AssessmentForm } from '../components/Forms.jsx';

export default function Vehicles() {
  const { vehicles = [], vehicleCatalog = [], can, setLastVehicleForAssessment } = useApp();
  const navigate = useNavigate();

  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('');

  const getVehiclePlate = (v) => {
    return v?.plate || v?.plateNumber || '';
  };

  const getVehicleImage = (v) => {
    const raw = String(v?.imageUrl || '').trim();

    if (
      raw &&
      raw !== '-' &&
      raw.toLowerCase() !== 'null' &&
      raw.toLowerCase() !== 'undefined'
    ) {
      return raw;
    }

    const modelText = `${v?.model || ''} ${v?.type || ''} ${v?.vehicleType || ''}`.toLowerCase();

    if (modelText.includes('520')) return '/vehicles/quad-520l.jpeg';
    if (modelText.includes('450')) return '/vehicles/quad-450l.jpeg';
    if (modelText.includes('uforce') && modelText.includes('800')) return '/vehicles/uforce-800xl.jpeg';
    if (modelText.includes('uforce') && modelText.includes('600')) return '/vehicles/uforce-600.jpeg';
    if (modelText.includes('u6')) return '/vehicles/uforce-u6-ev.jpeg';
    if (modelText.includes('ut10') && modelText.includes('xl')) return '/vehicles/ut10-pro-xl-highland.jpeg';
    if (modelText.includes('ut10')) return '/vehicles/ut10-pro-highland.jpeg';

    return '/vehicles/quad-450l.jpeg';
  };

  const suggestions = useMemo(() => {
    const q = filter.toLowerCase().trim();

    if (!q) return [];

    const all = [...vehicles, ...vehicleCatalog];
    const seen = new Set();

    return all
      .filter((v) => {
        const plate = getVehiclePlate(v).toUpperCase();

        if (!plate) return false;
        if (seen.has(plate)) return false;

        seen.add(plate);

        return JSON.stringify(v).toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [filter, vehicles, vehicleCatalog]);

  const shown = useMemo(() => {
    const q = filter.toLowerCase().trim();

    if (!q) return vehicles;

    return vehicles.filter((v) =>
      JSON.stringify(v).toLowerCase().includes(q)
    );
  }, [filter, vehicles]);

  const openVehicleHistory = (plate) => {
    if (!plate) return;
    navigate(`/vehicles/${encodeURIComponent(plate)}`);
  };

  const startAssessmentForVehicle = (vehicle) => {
    setLastVehicleForAssessment?.(vehicle);
    setModal({ type: 'assessment', vehicle });
  };

  return (
    <div className="page">
      <PageHeader
        title="Vehicles"
        subtitle="Search a plate number to open the full garage history, assessments, parts issued, mechanics and repair records."
        action={can?.('vehicles') ? () => setModal({ type: 'add' }) : null}
        actionLabel="Add Vehicle"
      />

      <div className="vehicle-search-zone">
        <input
          className="page-filter"
          placeholder="Search plate, VIN, model, company, mechanic..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {suggestions.length > 0 && (
          <div className="vehicle-search-results">
            {suggestions.map((v) => {
              const plate = getVehiclePlate(v);

              return (
                <button
                  key={`${plate}-${v.vin || v.id || v.plateNumber}`}
                  type="button"
                  onClick={() => openVehicleHistory(plate)}
                >
                  <div className="vehicle-search-img-box">
                    <img
                      src={getVehicleImage(v)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/vehicles/quad-450l.jpeg';
                      }}
                    />
                  </div>

                  <span>
                    <b>{plate}</b>
                    <small>
                      {v.model || v.type || v.vehicleType || 'Unknown model'} •{' '}
                      {v.vin || 'No VIN'}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Table
        headers={[
          'Plate',
          'Image',
          'Model / Type',
          'Internal/External',
          'Owner / Company',
          'Status',
          'Check-in',
          'Action',
        ]}
      >
        {shown.map((v) => {
          const plate = getVehiclePlate(v);

          return (
            <tr key={v.id || plate}>
              <td>
                <b>{plate || '-'}</b>
                <br />
                <small>{v.vin || '-'}</small>
              </td>

              <td>
                <div className="vehicle-img-box">
                  <img
                    className="table-vehicle-img"
                    src={getVehicleImage(v)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/vehicles/quad-450l.jpeg';
                    }}
                  />
                </div>
              </td>

              <td>
                {v.model || v.type || v.vehicleType || '-'}
                <br />
                <small>{v.cc || v.type || '-'}</small>
              </td>

              <td>{v.ownership || '-'}</td>

              <td>{v.companyName || v.owner || '-'}</td>

              <td>
                <Badge
                  tone={
                    v.status === 'Active'
                      ? 'success'
                      : v.status === 'Under Repair' ||
                        v.status === 'Build in Progress'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {v.status || 'Unknown'}
                </Badge>
              </td>

              <td>{v.checkInDateTime?.replace('T', ' ') || '-'}</td>

              <td>
                <div className="table-action-stack">
                  <button
                    className="open-btn"
                    type="button"
                    onClick={() => openVehicleHistory(plate)}
                  >
                    Open History
                  </button>
                  <button
                    className="open-btn secondary-open-btn"
                    type="button"
                    onClick={() => startAssessmentForVehicle(v)}
                  >
                    Start Assessment
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>

      {modal?.type === 'add' && (
        <Modal title="Add Vehicle" onClose={() => setModal(null)} wide>
          <VehicleForm onDone={(saved) => { setLastVehicleForAssessment?.(saved); setModal({ type: 'assessment', vehicle: saved }); }} />
        </Modal>
      )}

      {modal?.type === 'assessment' && (
        <Modal title={`Start Assessment - ${modal.vehicle?.plate || 'Vehicle'}`} onClose={() => setModal(null)} wide>
          <AssessmentForm
            prefillVehicleId={modal.vehicle?.id || modal.vehicle?.dbId || ''}
            prefillVehiclePlate={modal.vehicle?.plate || ''}
            onDone={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}