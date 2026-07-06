import React from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Modal, PageHeader, Table } from '../components/UI.jsx';
import { VehicleForm, AssessmentForm } from '../components/Forms.jsx';

const VEHICLE_TYPES = ['BUGGY', 'QUAD', 'JEEP', 'HEAVY DUTY', 'TOOLS', 'CAR', 'UTV', 'MOTORCYCLE', 'TRUCK', 'TRAILER', 'EQUIPMENT', 'OTHER'];
const DEFAULT_TYPES = ['BUGGY', 'QUAD'];

function normalizeType(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizePlateKey(plate) {
  return String(plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function typeLabel(value) {
  const t = normalizeType(value);
  return t || 'UNKNOWN';
}

export default function Vehicles() {
  const { vehicles = [], vehicleCatalog = [], garageOps = [], assessments = [], can, setLastVehicleForAssessment } = useApp();
  const navigate = useNavigate();

  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('DEFAULT');

  const getVehiclePlate = (v) => v?.plate || v?.plateNumber || '';
  const displayPlate = (plate) => String(plate || '').replace(/\s*-\s*$/, '').trim();

  const getVehicleType = (v) => normalizeType(v?.vehicleType || v?.type || v?.customType || '');

  const formatDateTime = (value) => {
    if (!value || value === 'Pending') return '-';
    return String(value).replace('T', ' ').slice(0, 16);
  };

  const getLatestVehicleTimes = (vehicle) => {
    const plateKey = normalizePlateKey(getVehiclePlate(vehicle));
    const vehicleId = vehicle?.id || vehicle?.dbId;
    const relatedGarage = (garageOps || []).filter((g) => {
      const sameId = vehicleId && (g.vehicleId === vehicleId || g.dbVehicleId === vehicleId);
      const samePlate = plateKey && normalizePlateKey(g.vehicle) === plateKey;
      return sameId || samePlate;
    });
    const relatedAssessments = (assessments || []).filter((a) => {
      const sameId = vehicleId && (a.vehicleId === vehicleId || a.dbVehicleId === vehicleId);
      const samePlate = plateKey && normalizePlateKey(a.vehicle) === plateKey;
      return sameId || samePlate;
    });

    const checkIns = [
      vehicle?.checkInDateTime,
      ...relatedGarage.map((g) => g.checkInDateTime || g.start || g.createdAt),
      ...relatedAssessments.map((a) => a.checkInDateTime || a.createdAt),
    ].filter(Boolean);
    const checkOuts = relatedGarage
      .map((g) => g.endDateTime || (g.end && g.end !== 'Pending' ? g.end : ''))
      .filter(Boolean);

    const latest = (values) => values
      .map((v) => ({ raw: v, date: new Date(v) }))
      .filter((x) => !Number.isNaN(x.date.getTime()))
      .sort((a, b) => b.date - a.date)[0]?.raw || '';

    return {
      checkIn: latest(checkIns),
      checkOut: latest(checkOuts),
    };
  };

  const getVehicleImage = (v) => {
    const raw = String(v?.imageUrl || '').trim();
    if (raw && raw !== '-' && raw.toLowerCase() !== 'null' && raw.toLowerCase() !== 'undefined') return raw;

    const modelText = `${v?.model || ''} ${v?.type || ''} ${v?.vehicleType || ''}`.toLowerCase();
    if (modelText.includes('jeep')) return '/vehicles/JEEP.png';
    if (modelText.includes('buggy')) return '/vehicles/uforce-800xl.jpeg';
    if (modelText.includes('520')) return '/vehicles/quad-520l.jpeg';
    if (modelText.includes('450')) return '/vehicles/quad-450l.jpeg';
    if (modelText.includes('uforce') && modelText.includes('800')) return '/vehicles/uforce-800xl.jpeg';
    if (modelText.includes('uforce') && modelText.includes('600')) return '/vehicles/uforce-600.jpeg';
    if (modelText.includes('u6')) return '/vehicles/uforce-u6-ev.jpeg';
    if (modelText.includes('ut10') && modelText.includes('xl')) return '/vehicles/ut10-pro-xl-highland.jpeg';
    if (modelText.includes('ut10')) return '/vehicles/ut10-pro-highland.jpeg';

    return '/vehicles/quad-450l.jpeg';
  };

  const filteredByType = useMemo(() => {
    if (typeFilter === 'ALL') return vehicles;
    const allowed = typeFilter === 'DEFAULT' ? DEFAULT_TYPES : [typeFilter];
    return vehicles.filter((v) => allowed.includes(getVehicleType(v)));
  }, [vehicles, typeFilter]);

  const suggestions = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return [];
    if ([...vehicles, ...vehicleCatalog].some(v => normalizePlateKey(getVehiclePlate(v)) === normalizePlateKey(q))) return [];

    const all = [...vehicles, ...vehicleCatalog];
    const seen = new Set();
    return all
      .filter((v) => {
        const plate = getVehiclePlate(v).toUpperCase();
        if (!plate || seen.has(plate)) return false;
        seen.add(plate);
        return JSON.stringify(v).toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [filter, vehicles, vehicleCatalog]);

  const shown = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const base = filteredByType;
    if (!q) return base;

    const exactPlateExists = base.some(v => normalizePlateKey(getVehiclePlate(v)) === normalizePlateKey(q));
    return base.filter((v) => exactPlateExists
      ? normalizePlateKey(getVehiclePlate(v)) === normalizePlateKey(q)
      : JSON.stringify(v).toLowerCase().includes(q)
    );
  }, [filter, filteredByType]);

  const typeCounts = useMemo(() => {
    const counts = {};
    vehicles.forEach((v) => {
      const t = getVehicleType(v) || 'UNKNOWN';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [vehicles]);

  const openVehicleHistory = (plate) => {
    if (!plate) return;
    navigate(`/vehicles/${encodeURIComponent(plate)}`);
  };

  const startAssessmentForVehicle = (vehicle) => {
    setLastVehicleForAssessment?.(vehicle);
    setModal({ type: 'assessment', vehicle });
  };

  return (
    <div className="page vehicle-page">
      <PageHeader
        title="Vehicles"
        subtitle="Search by plate or filter by vehicle type. Each vehicle profile has history and assessment actions."
        action={can?.('vehicles') ? () => setModal({ type: 'add' }) : null}
        actionLabel="Add Vehicle"
      />

      <div className="vehicle-filter-panel">
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
                  <button key={`${plate}-${v.vin || v.id || v.plateNumber}`} type="button" onClick={() => setFilter(plate)}>
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
                      <small>{v.model || v.type || v.vehicleType || 'Unknown model'} • {v.vin || 'No VIN'}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="vehicle-type-tabs" aria-label="Vehicle type filters">
          <button type="button" className={typeFilter === 'DEFAULT' ? 'active' : ''} onClick={() => setTypeFilter('DEFAULT')}>
            Default: Buggy + Quad
          </button>
          <button type="button" className={typeFilter === 'ALL' ? 'active' : ''} onClick={() => setTypeFilter('ALL')}>
            All ({vehicles.length})
          </button>
          {VEHICLE_TYPES.filter((t) => (typeCounts[t] || 0) > 0).map((t) => (
            <button key={t} type="button" className={typeFilter === t ? 'active' : ''} onClick={() => setTypeFilter(t)}>
              {t} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="vehicle-table-scroll-shell force-visible-scroll">
  <Table
    className="vehicles-wide-table"
    headers={[
          'Plate',
          'Vehicle Type',
          'Image',
          'Model / Type',
          'Internal/External',
          'Owner / Company',
          'Status',
          'Latest Check-in',
          'Latest Check-out',
          'Action',
        ]}
      >
        {shown.map((v) => {
          const plate = getVehiclePlate(v);
          const latestTimes = getLatestVehicleTimes(v);
          const vType = getVehicleType(v);

          return (
            <tr key={v.id || plate}>
              <td>
                <b>{displayPlate(plate) || '-'}</b>
                <br />
                {v.vin ? <small>{v.vin}</small> : null}
              </td>

              <td><Badge tone="neutral">{typeLabel(vType)}</Badge></td>

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
                      : v.status === 'Under Repair' || v.status === 'Build in Progress'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {v.status || 'Unknown'}
                </Badge>
              </td>

              <td>{formatDateTime(latestTimes.checkIn)}</td>
              <td>{formatDateTime(latestTimes.checkOut)}</td>

              <td>
                <div className="table-action-stack">
                  <button className="open-btn" type="button" onClick={() => openVehicleHistory(plate)}>Open History</button>
                  <button className="open-btn secondary-open-btn" type="button" onClick={() => startAssessmentForVehicle(v)}>Start Assessment</button>
                </div>
              </td>
            </tr>
          );
        })}
        {!shown.length && (
          <tr>
            <td colSpan="10">No vehicles found for the selected type/filter.</td>
          </tr>
        )}
      </Table>
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Vehicle" onClose={() => setModal(null)} wide>
          <VehicleForm onDone={(saved) => { setLastVehicleForAssessment?.(saved); setModal({ type: 'assessment', vehicle: saved }); }} />
        </Modal>
      )}

      {modal?.type === 'assessment' && (
        <Modal title={`Start Assessment - ${modal.vehicle?.plate || 'Vehicle'}`} onClose={() => setModal(null)} wide>
          <div className="professional-assessment-start-modal">
            <AssessmentForm
              prefillVehicleId={modal.vehicle?.id || modal.vehicle?.dbId || ''}
              prefillVehiclePlate={modal.vehicle?.plate || ''}
              onDone={() => setModal(null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
