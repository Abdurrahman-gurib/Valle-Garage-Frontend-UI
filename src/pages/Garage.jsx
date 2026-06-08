import MultipleMechanicsSelect from '../components/MultipleMechanicsSelect.jsx';
import { useMemo, useState } from "react";
import { GarageOpForm } from "../components/Forms.jsx";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  TextArea,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
function durationBetween(start, end){ const s=start?new Date(start):null; const e=end&&end!=='Pending'?new Date(end):null; if(!s||Number.isNaN(s.getTime())||!e||Number.isNaN(e.getTime())) return '-'; let sec=Math.max(0,Math.floor((e-s)/1000)); const d=Math.floor(sec/86400); sec%=86400; const h=Math.floor(sec/3600); sec%=3600; const m=Math.floor(sec/60); const ss=sec%60; return `${d}d ${h}h ${m}m ${ss}s`; }

function toDate(v){ const d=v?new Date(v):null; return d && !Number.isNaN(d.getTime()) ? d : null; }
function startDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(),23,59,59,999); }
function periodOk(v, period){ const d=toDate(v); if(!d) return false; const now=new Date(); let s=null,e=null; if(period==='today'){s=startDay(now);e=endDay(now);} if(period==='week'){s=startDay(new Date(now.getFullYear(),now.getMonth(),now.getDate()-6));e=endDay(now);} if(period==='month'){s=new Date(now.getFullYear(),now.getMonth(),1);e=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999);} if(period==='year'){s=new Date(now.getFullYear(),0,1);e=new Date(now.getFullYear(),11,31,23,59,59,999);} return (!s||d>=s)&&(!e||d<=e); }
async function exportGarageXlsx(rows, period){
  const XLSX = await import('xlsx');
  const aoa = [
    ['VALLÉ GARAGE OPERATIONS'],
    ['Garage Work Extraction Report'],
    ['Selected Period', period],
    ['Exported At', new Date().toLocaleString('en-GB')],
    [],
    ['Process','Vehicle','Assessment/PO','Type','Mechanic','Check-in','Check-out','Duration','Expected','Status'],
    ...rows.map(g=>[g.id,g.vehicle,g.assessmentId||g.transactionId||'-',g.type,g.mechanic,(g.checkInDateTime||g.start||'').replace?.('T',' ')||'-',(g.endDateTime||g.end||'').replace?.('T',' ')||'-',durationBetween(g.checkInDateTime||g.start,g.endDateTime||g.end),g.expectedDeliveryDate||'-',g.status])
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[18,18,20,18,24,22,22,20,16,16].map(w=>({wch:w}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Garage Work'); XLSX.writeFile(wb,`garage-work-${period}.xlsx`);
}

export default function Garage() {
  const { garageOps, transactions, assessments } = useApp();
  const [modal, setModal] = useState(null);
  const [reportPeriod,setReportPeriod]=useState('week');
  const filteredGarageOps = useMemo(()=>garageOps.filter(g=>periodOk(g.checkInDateTime || g.start || g.createdAt, reportPeriod)),[garageOps,reportPeriod]);
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
      <div className="history-toolbar">
        <Select value={reportPeriod} onChange={(e)=>setReportPeriod(e.target.value)}>
          <option value="today">Today Only</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Current Month</option>
          <option value="year">Current Year</option>
        </Select>
        <Button variant="secondary" onClick={()=>exportGarageXlsx(filteredGarageOps, reportPeriod)}>Export Garage Work XLSX</Button>
      </div>
      <Table
        headers={[
          "Process",
          "Vehicle",
          "Assessment/PO",
          "Type",
          "Mechanic",
          "Check-in",
          "Check-out",
          "Duration",
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
            <td>{g.mechanic}</td>
            <td>{g.checkInDateTime?.replace("T", " ") || "-"}</td>
            <td>{(g.endDateTime || g.end)?.replace?.("T", " ") || (g.status === "Completed" ? "Completed" : "-")}</td>
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
  const [saving, setSaving] = useState(false);
  const isCompleted = op.status === 'Completed' || op.status === 'Delivered';
  function file(e) {
    setForm({ ...form, invoiceFile: e.target.files?.[0]?.name || "" });
  }
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await updateGarageOp(op.id, form);
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
          <p><b>Check-in:</b> {op.checkInDateTime?.replace?.('T',' ') || op.start?.replace?.('T',' ') || '-'}</p>
          <p><b>Check-out:</b> {(op.endDateTime || op.end)?.replace?.('T',' ') || '-'}</p>
          <p><b>Duration:</b> {durationBetween(op.checkInDateTime || op.start, op.endDateTime || op.end)}</p>
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
        <Field label="Labor Hours">
          <Input
            value={form.labor || ""}
            disabled={isCompleted}
            onChange={(e) => setForm({ ...form, labor: e.target.value })}
          />
        </Field>
        <Field label="Payment Status">
          <Select
            value={form.paymentStatus || "Pending"}
            disabled={isCompleted}
            onChange={(e) =>
              setForm({ ...form, paymentStatus: e.target.value })
            }
          >
            <option>None</option>
            <option>Pending</option>
            <option>Paid</option>
          </Select>
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
        <Button variant="secondary" onClick={() => window.print()}>
          Print Job Sheet
        </Button>
      </div>
    </div>
  );
}
