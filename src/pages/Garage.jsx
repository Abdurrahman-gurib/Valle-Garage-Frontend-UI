import React from 'react';
import MultipleMechanicsSelect from '../components/MultipleMechanicsSelect.jsx';
import { useMemo, useState } from "react";
import { GarageOpForm } from "../components/Forms.jsx";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  TextArea,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
function durationBetween(start, end){ const s=start?new Date(start):null; const e=end&&end!=='Pending'?new Date(end):null; if(!s||Number.isNaN(s.getTime())||!e||Number.isNaN(e.getTime())) return '-'; let sec=Math.max(0,Math.floor((e-s)/1000)); const d=Math.floor(sec/86400); sec%=86400; const h=Math.floor(sec/3600); sec%=3600; const m=Math.floor(sec/60); if(d>0) return `${d}d ${h}h ${m}m`; return `${h}h ${m}m`; }
function displayDateTime(v){ if(!v || v==='Pending') return '-'; const d=new Date(v); if(Number.isNaN(d.getTime())) return String(v).replace('T',' '); return d.toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function laborText(value){ const n=Number(String(value||'').replace(/[^0-9.]/g,'')); if(!n) return '0h 0m'; const h=Math.floor(n); const m=Math.round((n-h)*60); return `${h}h ${m}m`; }
function splitLabor(value){ const raw=String(value||''); const hMatch=raw.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour)/i); const mMatch=raw.match(/(\d+(?:\.\d+)?)\s*(m|min|minute)/i); if(hMatch || mMatch){ return {hours: Number(hMatch?.[1]||0), minutes: Number(mMatch?.[1]||0)}; } const n=Number(raw.replace(/[^0-9.]/g,'')) || 0; const h=Math.floor(n); return {hours:h, minutes:Math.round((n-h)*60)}; }
function combineLabor(hours, minutes){ return `${Number(hours||0)}h ${Number(minutes||0)}m`; }

function toDate(v){ const d=v?new Date(v):null; return d && !Number.isNaN(d.getTime()) ? d : null; }
function startDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(),23,59,59,999); }
function periodOk(v, period, filters={}){
  if(period==='all') return true;
  const d=toDate(v); if(!d) return false;
  const now=new Date(); let s=null,e=null;
  if(period==='today'){s=startDay(now);e=endDay(now);}
  if(period==='week'){s=startDay(new Date(now.getFullYear(),now.getMonth(),now.getDate()-6));e=endDay(now);}
  if(period==='month'){s=new Date(now.getFullYear(),now.getMonth(),1);e=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999);}
  if(period==='year'){s=new Date(now.getFullYear(),0,1);e=new Date(now.getFullYear(),11,31,23,59,59,999);}
  if(period==='manualDate' && filters.manualDate){ const md=new Date(filters.manualDate+'T00:00:00'); s=startDay(md); e=endDay(md);}
  if(period==='manualMonth' && filters.manualMonth){ const [yy,mm]=filters.manualMonth.split('-').map(Number); s=new Date(yy,mm-1,1); e=new Date(yy,mm,0,23,59,59,999);}
  if(period==='manualYear' && filters.manualYear){ const yy=Number(filters.manualYear); s=new Date(yy,0,1); e=new Date(yy,11,31,23,59,59,999);}
  return (!s||d>=s)&&(!e||d<=e);
}
async function exportGarageXlsx(rows, period){
  const XLSX = await import('xlsx');
  const aoa = [
    ['VALLÉ GARAGE OPERATIONS'],
    ['Garage Work Extraction Report'],
    ['Selected Period', period],
    ['Exported At', new Date().toLocaleString('en-GB')],
    [],
    ['Process','Vehicle','Assessment/PO','Type','All Mechanics','Garage Check-in','Parts Submitted','Check-out','Waiting Before Parts','Work Duration After Parts','Total Duration','Expected','Status'],
    ...rows.map(g=>[g.id,g.vehicle,g.assessmentId||g.transactionId||'-',g.type,g.mechanicNames || g.mechanic,displayDateTime(g.checkInDateTime||g.start),displayDateTime(g.partsSubmittedAt),displayDateTime(g.endDateTime||g.end),durationBetween(g.checkInDateTime||g.start,g.partsSubmittedAt),durationBetween(g.partsSubmittedAt||g.checkInDateTime||g.start,g.endDateTime||g.end),durationBetween(g.checkInDateTime||g.start,g.endDateTime||g.end),g.expectedDeliveryDate||'-',g.status])
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[18,18,22,18,30,22,22,22,22,24,22,16,16].map(w=>({wch:w}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Garage Work'); XLSX.writeFile(wb,`garage-work-${period}.xlsx`);
}

export default function Garage() {
  const { garageOps, transactions, assessments } = useApp();
  const [modal, setModal] = useState(null);
  const [reportPeriod,setReportPeriod]=useState('all');
  const [garageStatusFilter,setGarageStatusFilter]=useState('all');
  const [garageSearch,setGarageSearch]=useState('');
  const [manualDate,setManualDate]=useState('');
  const [manualMonth,setManualMonth]=useState('');
  const [manualYear,setManualYear]=useState(String(new Date().getFullYear()));
  const garageFilters={manualDate,manualMonth,manualYear};
  const filteredGarageOps = useMemo(()=>garageOps.filter(g=>{ const periodMatch = periodOk(g.checkInDateTime || g.start || g.createdAt || g.endDateTime, reportPeriod, garageFilters); const statusMatch = garageStatusFilter==='all' || String(g.status||'').toLowerCase()===garageStatusFilter.toLowerCase(); const q=garageSearch.trim().toLowerCase(); const searchMatch = !q || `${g.id} ${g.vehicle} ${g.assessmentId} ${g.transactionId} ${g.type} ${g.mechanic} ${g.status} ${g.workDone}`.toLowerCase().includes(q); return periodMatch && statusMatch && searchMatch; }).sort((a,b)=>String(b.checkInDateTime || b.start || b.endDateTime || '').localeCompare(String(a.checkInDateTime || a.start || a.endDateTime || ''))),[garageOps,reportPeriod,manualDate,manualMonth,manualYear,garageStatusFilter,garageSearch]);
  const completedGarageOps = useMemo(()=>garageOps.filter(g=>['completed','delivered'].includes(String(g.status||'').toLowerCase())),[garageOps]);
  const openGarageOps = useMemo(()=>garageOps.filter(g=>!['completed','delivered','cancelled'].includes(String(g.status||'').toLowerCase())),[garageOps]);
  const todayGarageOps = useMemo(()=>garageOps.filter(g=>periodOk(g.checkInDateTime || g.start || g.createdAt, 'today', {})),[garageOps]);
  const buildRequests = transactions.filter(
    (t) =>
      ["External Vehicle Order", "Repair / Service Billing"].includes(t.type) &&
      ["Pending", "In Progress", "Build in Progress"].includes(t.status),
  );
  const existingAssessmentIds = new Set(garageOps.map((g) => g.assessmentId).filter(Boolean));
  const assessmentRequests = (assessments || []).filter(
    (a) =>
      ["Parts Issued"].includes(a.status) &&
      !existingAssessmentIds.has(a.id) &&
      !existingAssessmentIds.has(a.dbId),
  );
  return (
    <div className="page">
      <PageHeader
        title="Garage Work"
        subtitle="Record repair, maintenance, servicing and build requests from admin purchase orders."
        action={() => setModal({ type: "new" })}
        actionLabel="Start Process"
      />
      {assessmentRequests.length > 0 && (
        <AssessmentTicketList
          title="Assessment Tickets With Parts Issued - Ready for Garage Work"
          items={assessmentRequests}
          onOpen={(a) => setModal({ type: "fromAssessment", item: a })}
        />
      )}

      {buildRequests.length > 0 && (
        <CardList
          title="Admin Requests / PO Tickets"
          items={buildRequests}
          onOpen={(t) => setModal({ type: "fromTx", item: t })}
        />
      )}
      <div className="garage-summary-grid section-small"><Card className="metric-card"><span>Total Garage Work</span><b>{garageOps.length}</b><small>All open and closed tickets</small></Card><Card className="metric-card"><span>Open / In Progress</span><b>{openGarageOps.length}</b><small>Active workshop tickets</small></Card><Card className="metric-card"><span>Completed / Closed</span><b>{completedGarageOps.length}</b><small>Closed work remains visible</small></Card><Card className="metric-card"><span>Today</span><b>{todayGarageOps.length}</b><small>Created/check-in today</small></Card></div>
      <div className="history-toolbar garage-filter-toolbar">
        <Select value={reportPeriod} onChange={(e)=>setReportPeriod(e.target.value)}>
          <option value="all">All Garage Work</option>
          <option value="today">Today Only</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Current Month</option>
          <option value="year">Current Year</option>
          <option value="manualDate">Manual Date</option>
          <option value="manualMonth">Manual Month</option>
          <option value="manualYear">Manual Year</option>
        </Select>
        {reportPeriod==='manualDate' && <Input type="date" value={manualDate} onChange={(e)=>setManualDate(e.target.value)} />}
        {reportPeriod==='manualMonth' && <Input type="month" value={manualMonth} onChange={(e)=>setManualMonth(e.target.value)} />}
        {reportPeriod==='manualYear' && <Input type="number" min="2020" max="2100" value={manualYear} onChange={(e)=>setManualYear(e.target.value)} />}
        <Select value={garageStatusFilter} onChange={(e)=>setGarageStatusFilter(e.target.value)}><option value="all">All Status</option><option value="Pending">Pending</option><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></Select><Input placeholder="Search process, plate, assessment, mechanic, status..." value={garageSearch} onChange={(e)=>setGarageSearch(e.target.value)} /><Button variant="secondary" onClick={()=>exportGarageXlsx(filteredGarageOps, reportPeriod)}>Export Garage Work XLSX</Button>
      </div>
     <div className="garage-work-table-shell force-visible-scroll">
  <Table
    className="garage-wide-table"
    headers={[
          "Process",
          "Vehicle",
          "Assessment/PO",
          "Type",
          "All Mechanics",
          "Garage Check-in",
          "Parts Submitted",
          "Check-out",
          "Waiting Before Parts",
          "Work Duration After Parts",
          "Total Duration",
          "Expected",
          "Status",
          "Action",
        ]}
      >
        {filteredGarageOps.map((g) => (
          <tr key={g.id}>
            <td>
              <b>{g.id}</b>
            </td>
            <td>{g.vehicle}</td>
            <td>{g.assessmentId || g.transactionId || "-"}</td>
            <td>{g.type}</td>
            <td>{g.mechanicNames || g.mechanic || "-"}</td>
            <td>{displayDateTime(g.checkInDateTime || g.start)}</td>
            <td>{displayDateTime(g.partsSubmittedAt)}</td>
            <td>{displayDateTime(g.endDateTime || g.end)}</td>
            <td>{durationBetween(g.checkInDateTime || g.start, g.partsSubmittedAt)}</td>
            <td>{durationBetween(g.partsSubmittedAt || g.checkInDateTime || g.start, g.endDateTime || g.end)}</td>
            <td>{durationBetween(g.checkInDateTime || g.start, g.endDateTime || g.end)}</td>
            <td>{g.expectedDeliveryDate || "-"}</td>
            <td>
              <Badge
                tone={
                  g.status === "Completed" || g.status === "Delivered"
                    ? "success"
                    : "warning"
                }
              >
                {g.status}
              </Badge>
            </td>
            <td>
              <button
                className="open-btn"
                onClick={() => setModal({ type: "view", item: g })}
              >
                Open
              </button>
            </td>
          </tr>
        ))}
      </Table>
      </div>
      {modal?.type === "new" && (
        <Modal title="Start Garage Process" onClose={() => setModal(null)} wide>
          <GarageOpForm onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "fromTx" && (
        <Modal
          title={`Start Work from ${modal.item.id}`}
          onClose={() => setModal(null)}
          wide
        >
          <GarageOpForm
            transaction={modal.item}
            onDone={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === "fromAssessment" && (
        <Modal
          title={`Start Garage Work from ${modal.item.id}`}
          onClose={() => setModal(null)}
          wide
        >
          <GarageOpForm
            assessment={modal.item}
            onDone={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal
          title={`${modal.item.id} Details`}
          onClose={() => setModal(null)}
          wide
        >
          <GarageDetail op={modal.item} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
function AssessmentTicketList({ title, items, onOpen }) {
  return (
    <div className="section-small">
      <h2>{title}</h2>
      <div className="card-grid">
        {items.map((a) => (
          <div className="card" key={a.id}>
            <div className="card-head">
              <h3>{a.id}</h3>
              <Badge tone={a.status === 'Parts Issued' ? 'success' : 'warning'}>{a.status}</Badge>
            </div>
            <p><b>Vehicle:</b> {a.vehicle || '-'}</p>
            <p><b>Issue:</b> {a.issue || '-'}</p>
            <p><b>Parts:</b> {(a.parts || []).map((p) => `${p.name} x${p.qty}`).join(', ') || 'No parts listed'}</p>
            <button className="open-btn" onClick={() => onOpen(a)}>
              Start Process
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function CardList({ title, items, onOpen }) {
  return (
    <div className="section-small">
      <h2>{title}</h2>
      <div className="card-grid">
        {items.map((t) => (
          <div className="card" key={t.id}>
            <div className="card-head">
              <h3>{t.id}</h3>
              <Badge tone="warning">{t.status}</Badge>
            </div>
            <p>
              <b>PO:</b> {t.poNumber}
            </p>
            <p>
              <b>Item:</b> {t.item}
            </p>
            <p>
              <b>Expected:</b> {t.expectedDeliveryDate || "TBD"}
            </p>
            <button className="open-btn" onClick={() => onOpen(t)}>
              Start / Update Ticket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function GarageDetail({ op, onClose }) {
  const { updateGarageOp } = useApp();
  const [form, setForm] = useState({ ...op });
  const initialLabor = splitLabor(op.labor || op.laborHours || 0);
  const [laborHoursInput, setLaborHoursInput] = useState(initialLabor.hours);
  const [laborMinutesInput, setLaborMinutesInput] = useState(initialLabor.minutes);
  const [saving, setSaving] = useState(false);
  const isCompleted = op.status === 'Completed' || op.status === 'Delivered';
  function file(e) {
    setForm({ ...form, invoiceFile: e.target.files?.[0]?.name || "" });
  }
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await updateGarageOp(op.id, { ...form, labor: combineLabor(laborHoursInput, laborMinutesInput) });
      onClose();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div>
      <div className="detail-grid">
        <div>
          <p>
            <b>Vehicle:</b> {op.vehicle}
          </p>
          <p>
            <b>Assessment / PO:</b> {op.assessmentId || op.transactionId || "-"}
          </p>
          <p><b>Garage Check-in:</b> {displayDateTime(op.checkInDateTime || op.start)}</p>
          <p><b>Parts Submitted:</b> {displayDateTime(op.partsSubmittedAt)}</p>
          <p><b>Check-out:</b> {displayDateTime(op.endDateTime || op.end)}</p>
          <p><b>All Mechanics:</b> {op.mechanicNames || op.mechanic || '-'}</p>
          <p><b>Waiting Before Parts:</b> {durationBetween(op.checkInDateTime || op.start, op.partsSubmittedAt)}</p>
          <p><b>Work Duration After Parts:</b> {durationBetween(op.partsSubmittedAt || op.checkInDateTime || op.start, op.endDateTime || op.end)}</p>
          <p><b>Total Duration:</b> {durationBetween(op.checkInDateTime || op.start, op.endDateTime || op.end)}</p>
          <p>
            <b>Parts used:</b>{" "}
            {op.partsUsed?.map((p) => `${p.name} x${p.qty}`).join(", ") ||
              "None"}
          </p>
        </div>
        <div>
          <Field label="Status">
            <Select
              value={form.status}
              disabled={isCompleted}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Ongoing</option>
              <option>Build in Progress</option>
              <option>Built and Testing</option>
              <option>Delivered</option>
              <option>Completed</option>
            </Select>
          </Field>
        </div>
      </div>
      {isCompleted && (
        <div className="notice success-notice">
          This garage work ticket is closed. Fields are locked to protect the completed workshop history.
        </div>
      )}
      <div className="form-grid">
        <Field label="Expected Delivery Date">
          <Input
            type="date"
            disabled={isCompleted}
            value={form.expectedDeliveryDate || ""}
            onChange={(e) =>
              setForm({ ...form, expectedDeliveryDate: e.target.value })
            }
          />
        </Field>
        <Field label="Labour Time - Hours">
          <Input type="number" min="0" value={laborHoursInput} disabled={isCompleted} onChange={(e)=>setLaborHoursInput(e.target.value)} />
        </Field>
        <Field label="Labour Time - Minutes">
          <Input type="number" min="0" max="59" value={laborMinutesInput} disabled={isCompleted} onChange={(e)=>setLaborMinutesInput(e.target.value)} />
        </Field>
        <Field label="Attach Invoice">
          <Input type="file" disabled={isCompleted} onChange={file} />
          {form.invoiceFile && <small>{form.invoiceFile}</small>}
        </Field>
        <Field label="Work Done">
          <TextArea
            value={form.workDone || ""}
            disabled={isCompleted}
            onChange={(e) => setForm({ ...form, workDone: e.target.value })}
          />
        </Field>
      </div>
      <div className="button-row">
        <Button onClick={save} disabled={saving || isCompleted}>{isCompleted ? 'Ticket Closed' : saving ? 'Saving updates...' : 'Save Updates'}</Button>

      </div>
    </div>
  );
}
