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
            onIssue={(note, parts, totalCost) => {
              if (window.confirm('Confirm issued parts and deduct inventory now?')) {
                issuePartsForAssessment?.(modal.item.id, note, parts, totalCost);
                setModal(null);
              }
            }}
            onComplete={() => {
              completeAssessment?.(modal.item.id);
              setModal(null);
            }}
            onReopen={(reason) => {
              reopenAssessment?.(modal.item.id, reason || 'Reopened');
              setModal(null);
            }}
            onUpdate={(updates) => {
              updateAssessment?.(modal.item.id, updates);
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
  const [extraPart, setExtraPart] = useState(inventory[0]?.id || '');
  const [extraQty, setExtraQty] = useState(1);
  const [parts, setParts] = useState(() =>
    (assessment.parts || []).map((p) => {
      const sellingPrice = getPartSellingPrice(p);
      const qty = Number(p.qty || 1);

      return {
        ...p,
        sellingPrice,
        lineTotal: Number(p.lineTotal ?? qty * sellingPrice),
      };
    })
  );

  const isStore = role === 'store' || role === 'admin' || role === 'store_keeper';

  const selectedExtraPart = useMemo(() => {
    return inventory.find((i) => i.id === extraPart);
  }, [inventory, extraPart]);

  const partsTotalCost = getPartsTotal(parts);

  function addInventoryPart() {
    const item = inventory.find((i) => i.id === extraPart);

    if (!item) return;

    const qty = Number(extraQty || 1);
    const sellingPrice = getPartSellingPrice(item);
    const lineTotal = qty * sellingPrice;

    setParts((prev) => [
      ...prev,
      {
        partId: item.id,
        sku: item.sku,
        name: item.name,
        qty,
        sellingPrice,
        lineTotal,
        stockBefore: item.stock ?? item.currentStock ?? 0,
        location: item.location,
        category: item.category,
      },
    ]);

    setExtraQty(1);
  }

  function removePart(index) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="detail-stack assessment-detail-clean">
      <Card>
        <h2>{assessment.vehicle || assessment.vehicleId || '-'}</h2>

        <p>
          <b>Mechanic:</b> {assessment.mechanic || '-'}
        </p>

        <p>
          <b>Status:</b> {assessment.status}
        </p>

        <p>
          <b>Issue:</b> {assessment.issue}
        </p>

        <p>
          <b>Conclusion:</b> {assessment.conclusion || '-'}
        </p>

        <p>
          <b>Total Parts Cost:</b> {formatMoney(partsTotalCost)}
        </p>
      </Card>

      <Card>
        <div className="card-head">
          <h3>Required / Issued Parts</h3>
          <strong>{formatMoney(partsTotalCost)}</strong>
        </div>

        <div className="required-parts-clean-table">
          <Table
            headers={[
              'SKU',
              'Part',
              'Available Qty',
              'Issue Qty',
              'Unit Price',
              'Line Total',
              'Location',
              'Action',
            ]}
          >
            {parts.map((p, i) => (
              <tr key={`${p.name}-${i}`}>
                <td>{p.sku || p.partId || '-'}</td>

                <td>
                  <b>{p.name}</b>
                </td>

                <td>{p.stockBefore ?? '-'}</td>

                <td>{p.qty}</td>

                <td>{formatMoney(p.sellingPrice)}</td>

                <td>
                  <b>{formatMoney(getPartLineTotal(p))}</b>
                </td>

                <td>{p.location || '-'}</td>

                <td>
                  <button
                    className="part-remove-row"
                    type="button"
                    onClick={() => removePart(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </div>

        {isStore && (
          <div className="inventory-picker">
            <Field label="Select Part from Inventory">
              <Select value={extraPart} onChange={(e) => setExtraPart(e.target.value)}>
                {inventory.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.sku || p.id} | {p.name} | Qty: {p.stock ?? p.currentStock ?? 0} |{' '}
                    {formatMoney(getPartSellingPrice(p))} | {p.location || 'No location'}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Quantity">
              <Input
                type="number"
                min="1"
                value={extraQty}
                onChange={(e) => setExtraQty(e.target.value)}
              />
            </Field>

            <div className="storekeeper-price-preview">
              <span>Selected Unit Price</span>
              <b>{formatMoney(getPartSellingPrice(selectedExtraPart))}</b>
              <small>
                Line Total:{' '}
                {formatMoney(
                  Number(extraQty || 1) * getPartSellingPrice(selectedExtraPart)
                )}
              </small>
            </div>

            <Button type="button" variant="secondary" onClick={addInventoryPart}>
              Add Part
            </Button>
          </div>
        )}
      </Card>

      {isStore && (
        <Card>
          <h3>Store Keeper Action</h3>

          <div className="assessment-cost-summary">
            <b>Total to Issue:</b> {formatMoney(partsTotalCost)}
          </div>

          <Field label="Issued Parts Note">
            <TextArea
              value={issuedNote}
              onChange={(e) => setIssuedNote(e.target.value)}
            />
          </Field>

          <div className="form-actions">
            <Button onClick={() => onIssue(issuedNote, parts, partsTotalCost)}>
              Issue Parts & Close Store Ticket
            </Button>

            <Button
              variant="secondary"
              onClick={() =>
                onReopen(
                  reason ||
                    prompt('Reason for reopening?') ||
                    'Reopened by Store Keeper'
                )
              }
            >
              Re-open Ticket
            </Button>
          </div>
        </Card>
      )}

      {role === 'mechanic' && (
        <div className="form-actions">
          <Button variant="secondary" onClick={() => onUpdate({ status: 'In Diagnosis' })}>
            Mark In Diagnosis
          </Button>

          <Button onClick={onComplete}>Mark Completed</Button>
        </div>
      )}

      {role === 'mechanic' && assessment.status === 'Completed' && (
        <Card>
          <h3>Reopen Assessment</h3>

          <Field label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>

          <Button variant="secondary" onClick={() => onReopen(reason)}>
            Reopen
          </Button>
        </Card>
      )}
    </div>
  );
}