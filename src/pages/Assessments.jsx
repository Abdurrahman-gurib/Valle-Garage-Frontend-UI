import { useMemo, useState } from 'react';
import { AssessmentForm } from '../components/Forms.jsx';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  TextArea,
  Select,
  Table,
} from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function getPartSellingPrice(item) {
  return Number(
    item?.sellingPrice ??
      item?.SellingPrice ??
      item?.selling_price ??
      item?.price ??
      item?.unitPrice ??
      item?.lastPrice ??
      0
  );
}

function getPartLineTotal(part) {
  return Number(
    part?.lineTotal ??
      Number(part?.qty || 0) * Number(part?.sellingPrice || 0)
  );
}

function getPartsTotal(parts = []) {
  return parts.reduce((sum, part) => sum + getPartLineTotal(part), 0);
}

export default function Assessments() {
  const app = useApp();

  const currentUser = app?.currentUser || {
    role: 'mechanic',
    name: 'Mechanic',
  };

  const assessments = app?.assessments || [];
  const completeAssessment = app?.completeAssessment;
  const issuePartsForAssessment = app?.issuePartsForAssessment;
  const reopenAssessment = app?.reopenAssessment;
  const updateAssessment = app?.updateAssessment;
  const inventory = app?.inventory || [];

  const [modal, setModal] = useState(null);

  const role = currentUser?.role || 'mechanic';
  const opened = assessments.filter((a) => a.status !== 'Completed');
  const completed = assessments.filter((a) => a.status === 'Completed');
  const canCreate = role === 'admin' || role === 'mechanic';

  return (
    <div className="page">
      <PageHeader
        title="Assessments"
        subtitle="Mechanics create assessment tickets. Store Keeper views tickets, issues parts, deducts stock, and tracks part costs."
        action={canCreate ? () => setModal({ type: 'new' }) : null}
        actionLabel="New Assessment"
      />

      <div className="section-tabs">
        <b>Opened / In Progress</b>
        <span>{opened.length} ticket(s)</span>
      </div>

      {opened.length === 0 && (
        <Card>
          <h2>No open assessments</h2>
          <p>Create a new assessment from the button above.</p>
        </Card>
      )}

      <div className="card-grid">
        {opened.map((a) => (
          <AssessmentCard
            key={a.id}
            assessment={a}
            onView={() => setModal({ type: 'view', item: a })}
          />
        ))}
      </div>

      <div className="section-tabs">
        <b>Completed</b>
        <span>{completed.length} ticket(s)</span>
      </div>

      <div className="card-grid">
        {completed.map((a) => (
          <AssessmentCard
            key={a.id}
            assessment={a}
            onView={() => setModal({ type: 'view', item: a })}
          />
        ))}
      </div>

      {modal?.type === 'new' && (
        <Modal title="New Assessment" onClose={() => setModal(null)} wide>
          <AssessmentForm onDone={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'view' && (
        <Modal
          title={`${modal.item.id} Assessment Details`}
          onClose={() => setModal(null)}
          wide
        >
          <AssessmentDetail
            assessment={modal.item}
            role={role}
            inventory={inventory}
            onIssue={async (note, parts, totalCost) => {
              if (window.confirm('Confirm issued parts and deduct inventory now?')) {
                await issuePartsForAssessment?.(modal.item.id, note, parts, totalCost);
                setModal(null);
              }
            }}
            onComplete={async () => {
              await completeAssessment?.(modal.item.id);
              setModal(null);
            }}
            onReopen={async (reason) => {
              await reopenAssessment?.(modal.item.id, reason || 'Reopened');
              setModal(null);
            }}
            onUpdate={async (updates) => {
              await updateAssessment?.(modal.item.id, updates);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function AssessmentCard({ assessment, onView }) {
  const parts = assessment.parts || [];
  const totalCost = Number(assessment.partsTotalCost ?? getPartsTotal(parts));

  return (
    <Card>
      <div className="card-head">
        <h2>{assessment.id}</h2>

        <Badge
          tone={
            assessment.status === 'Completed'
              ? 'success'
              : assessment.status === 'Parts Issued'
              ? 'success'
              : 'warning'
          }
        >
          {assessment.status}
        </Badge>
      </div>

      <p>
        <b>Vehicle:</b> {assessment.vehicle || assessment.vehicleId || '-'}
      </p>

      <p>
        <b>Mechanic:</b> {assessment.mechanic || '-'}
      </p>

      <p>{assessment.issue || 'No issue recorded'}</p>

      <p>
        <b>Parts:</b>{' '}
        {parts.map((p) => `${p.name} x${p.qty}`).join(', ') || 'None listed'}
      </p>

      <p>
        <b>Parts Cost:</b> {formatMoney(totalCost)}
      </p>

      <button className="open-btn" onClick={onView}>
        View Ticket
      </button>
    </Card>
  );
}

function AssessmentDetail({
  assessment,
  role,
  inventory,
  onIssue,
  onComplete,
  onReopen,
  onUpdate,
}) {
  const [issuedNote, setIssuedNote] = useState(assessment.issuedPartsNote || '');
  const [reason, setReason] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [parts, setParts] = useState(() =>
    (assessment.parts || []).map((p) => {
      const sellingPrice = getPartSellingPrice(p);
      const qty = Number(p.qty || 1);
      return {
        ...p,
        qty,
        sellingPrice,
        lineTotal: Number(p.lineTotal ?? qty * sellingPrice),
        validated: p.validated !== false,
      };
    })
  );
  const [savingIssue, setSavingIssue] = useState(false);

  const isStore = role === 'store' || role === 'admin' || role === 'store_keeper';
  const isCompleted = assessment.status === 'Completed';
  const isPartsIssued = assessment.status === 'Parts Issued';
  const canIssueParts = isStore && !isCompleted && !isPartsIssued;
  const canReopenTicket = isStore || role === 'admin' || role === 'mechanic';

  const matchingParts = useMemo(() => {
    const q = String(partSearch || '').trim().toLowerCase();
    if (!q) return inventory.slice(0, 15);
    return inventory
      .filter((i) =>
        [i.sku, i.name, i.part, i.category, i.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 20);
  }, [inventory, partSearch]);

  const selectedInventoryPart = useMemo(() => {
    const q = String(partSearch || '').trim().toLowerCase();
    return inventory.find(
      (i) =>
        String(i.id).toLowerCase() === q ||
        String(i.sku || '').toLowerCase() === q ||
        String(i.name || '').toLowerCase() === q ||
        `${i.sku || ''} | ${i.name || ''}`.toLowerCase() === q
    );
  }, [inventory, partSearch]);

  const partsTotalCost = getPartsTotal(parts);

  function addInventoryPart() {
    const item = selectedInventoryPart || matchingParts[0];
    if (!item && !partSearch.trim()) return;

    const qty = Math.max(1, Number(extraQty || 1));
    const sellingPrice = item ? getPartSellingPrice(item) : 0;
    const lineTotal = qty * sellingPrice;

    setParts((prev) => [
      ...prev,
      {
        partId: item?.id || 'manual',
        sku: item?.sku || 'MANUAL',
        name: item?.name || partSearch.trim(),
        qty,
        sellingPrice,
        lineTotal,
        stockBefore: item?.stock ?? item?.currentStock ?? '-',
        location: item?.location || '-',
        category: item?.category || '',
        validated: true,
      },
    ]);
    setPartSearch('');
    setExtraQty(1);
  }

  function removePart(index) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleValidated(index) {
    setParts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, validated: !p.validated } : p))
    );
  }

  async function validateAndIssue() {
    if (savingIssue) return;
    setSavingIssue(true);
    try {
      await onIssue(issuedNote, parts, partsTotalCost);
    } finally {
      setSavingIssue(false);
    }
  }

  return (
    <div className="detail-stack assessment-detail-clean">
      <Card>
        <h2>{assessment.vehicle || assessment.vehicleId || '-'}</h2>
        <p><b>Mechanic:</b> {assessment.mechanic || '-'}</p>
        <p><b>Status:</b> {assessment.status}</p>
        <p><b>Issue:</b> {assessment.issue}</p>
        <p><b>Conclusion:</b> {assessment.conclusion || '-'}</p>
        <p><b>Total Parts Cost:</b> {formatMoney(partsTotalCost)}</p>
      </Card>

      {(isCompleted || isPartsIssued) && (
        <Card className="status-flow-card">
          <h3>{isCompleted ? 'Assessment completed' : 'Parts already issued'}</h3>
          <p>{isCompleted ? 'This ticket is locked for normal editing. Reopen it if correction is required.' : 'Store Keeper action is complete. The mechanic can now start or continue the garage process.'}</p>
        </Card>
      )}

      <Card>
        <div className="card-head">
          <h3>Required / Issued Parts</h3>
          <strong>{formatMoney(partsTotalCost)}</strong>
        </div>

        {canIssueParts && (
          <div className="inventory-picker advanced-part-picker">
            <Field label="Search / Select Part from Inventory">
              <Input
                list="assessment-inventory-parts"
                value={partSearch}
                placeholder="Type SKU or part name. Suggestions come from database."
                onChange={(e) => setPartSearch(e.target.value)}
              />
              <datalist id="assessment-inventory-parts">
                {matchingParts.map((p) => (
                  <option key={p.id} value={`${p.sku || ''} | ${p.name || ''}`}>
                    {p.sku || p.id} | {p.name} | Qty: {p.stock ?? p.currentStock ?? 0} | {formatMoney(getPartSellingPrice(p))}
                  </option>
                ))}
              </datalist>
            </Field>

            <Field label="Quantity">
              <Input type="number" min="1" value={extraQty} onChange={(e) => setExtraQty(e.target.value)} />
            </Field>

            <Button type="button" variant="secondary" onClick={addInventoryPart}>Add Part to Ticket</Button>
          </div>
        )}

        <div className="required-parts-clean-table">
          <Table headers={['Validate', 'SKU', 'Part', 'Available Qty', 'Issue Qty', 'Line Total', 'Location', 'Action']}>
            {parts.map((p, i) => (
              <tr key={`${p.name}-${i}`}>
                <td>
                  {canIssueParts ? (
                    <label className="validate-check">
                      <input type="checkbox" checked={p.validated !== false} onChange={() => toggleValidated(i)} />
                      <span>✓</span>
                    </label>
                  ) : (
                    <span>{p.validated === false ? 'Not validated' : 'Validated'}</span>
                  )}
                </td>
                <td>{p.sku || p.partId || '-'}</td>
                <td><b>{p.name}</b></td>
                <td>{p.stockBefore ?? '-'}</td>
                <td>
                  {canIssueParts ? (
                    <Input
                      type="number"
                      min="1"
                      value={p.qty}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value || 1));
                        setParts((prev) => prev.map((row, idx) => idx === i ? { ...row, qty, lineTotal: qty * Number(row.sellingPrice || 0) } : row));
                      }}
                    />
                  ) : p.qty}
                </td>
                <td><b>{formatMoney(getPartLineTotal(p))}</b></td>
                <td>{p.location || '-'}</td>
                <td>
                  {canIssueParts ? <button className="part-remove-row" type="button" onClick={() => removePart(i)}>Remove</button> : <small>Locked</small>}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>

      {canIssueParts && (
        <Card>
          <h3>Store Keeper Validation</h3>
          <p className="muted">Tick parts to validate. Validated database parts will be deducted from inventory and saved to stock movement.</p>
          <div className="assessment-cost-summary"><b>Total to Issue:</b> {formatMoney(partsTotalCost)}</div>
          <Field label="Issued Parts Note"><TextArea value={issuedNote} onChange={(e) => setIssuedNote(e.target.value)} /></Field>
          <div className="form-actions">
            <Button onClick={validateAndIssue} disabled={savingIssue}>{savingIssue ? 'Validating parts...' : '✓ Validate Parts & Close Store Ticket'}</Button>
            <Button variant="secondary" onClick={() => onReopen(reason || prompt('Reason for reopening?') || 'Reopened by Store Keeper')}>Re-open Ticket</Button>
          </div>
        </Card>
      )}

      {!canIssueParts && canReopenTicket && (
        <Card>
          <h3>Reopen Ticket</h3>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason required for audit trail" /></Field>
          <Button variant="secondary" onClick={() => onReopen(reason || 'Reopened for correction')}>Reopen Ticket</Button>
        </Card>
      )}

      {role === 'mechanic' && !isCompleted && !isPartsIssued && (
        <div className="form-actions">
          <Button variant="secondary" onClick={() => onUpdate({ status: 'In Diagnosis' })}>Mark In Diagnosis</Button>
          <Button onClick={onComplete}>Mark Completed</Button>
        </div>
      )}
    </div>
  );
}
