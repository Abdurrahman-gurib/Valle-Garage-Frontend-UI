import { useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
export default function Transactions() {
  const { transactions, updateTransaction } = useApp();
  const [modal, setModal] = useState(null);
  return (
    <div className="page">
      <PageHeader
        title="Transactions"
        subtitle="Track parts re-orders, customer POs, invoices, GRN and payment status."
      />
      <Table
        headers={["ID", "Type", "Item", "Status", "PO", "Amount", "Action"]}
      >
        {transactions.map((t) => (
          <tr key={t.id}>
            <td>
              <b>{t.id}</b>
            </td>
            <td>{t.type}</td>
            <td>{t.item}</td>
            <td>
              <Badge
                tone={
                  t.status === "Completed" || t.status === "Paid"
                    ? "success"
                    : "warning"
                }
              >
                {t.status}
              </Badge>
            </td>
            <td>{t.poNumber}</td>
            <td>Rs {t.amount}</td>
            <td>
              <button className="open-btn" onClick={() => setModal(t)}>
                Open
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {modal && (
        <Modal
          title={`${modal.id} Transaction`}
          onClose={() => setModal(null)}
          wide
        >
          <TransactionDetail tx={modal} updateTransaction={updateTransaction} />
        </Modal>
      )}
    </div>
  );
}
function TransactionDetail({ tx, updateTransaction }) {
  const [status, setStatus] = useState(tx.status);
  const [grn, setGrn] = useState(
    tx.grn || { receivedBy: "", condition: "Good", notes: "" },
  );
  function saveStatus() {
    updateTransaction(tx.id, { status });
    if (status === "Completed")
      alert(
        "Transaction completed. Please fill and save the Goods Received Note now.",
      );
  }
  return (
    <div>
      <div className="detail-grid">
        <div>
          <p>
            <b>Type:</b> {tx.type}
          </p>
          <p>
            <b>Item:</b> {tx.item}
          </p>
          <p>
            <b>PO:</b> {tx.poNumber}
          </p>
          <p>
            <b>Supplier / Customer:</b> {tx.supplier}
          </p>
        </div>
        <div>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Build in Progress</option>
              <option>Built and Testing</option>
              <option>Delivered</option>
              <option>Paid</option>
              <option>Completed</option>
            </Select>
          </Field>
          <Button onClick={saveStatus}>Save Status</Button>
        </div>
      </div>
      <h3 className="section-small">Documents</h3>
      <div className="document-actions">
        <Button variant="secondary" onClick={() => alert("PO preview opened")}>
          View PO
        </Button>
        <label className="upload-btn">
          Attach Invoice
          <input type="file" hidden />
        </label>
        <Button variant="secondary" onClick={() => window.print()}>
          Print Docs
        </Button>
        <Button
          variant="warning"
          onClick={() => alert("Invoice generated for transaction")}
        >
          Generate Invoice
        </Button>
      </div>
      {status === "Completed" && (
        <div className="grn-box">
          <h3>Goods Received Note</h3>
          <div className="form-grid">
            <Field label="Received By">
              <Input
                value={grn.receivedBy}
                onChange={(e) => setGrn({ ...grn, receivedBy: e.target.value })}
              />
            </Field>
            <Field label="Condition">
              <Select
                value={grn.condition}
                onChange={(e) => setGrn({ ...grn, condition: e.target.value })}
              >
                <option>Good</option>
                <option>Partially Damaged</option>
                <option>Rejected</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Input
                value={grn.notes}
                onChange={(e) => setGrn({ ...grn, notes: e.target.value })}
              />
            </Field>
          </div>
          <Button onClick={() => updateTransaction(tx.id, { grn })}>
            Save GRN
          </Button>
        </div>
      )}
    </div>
  );
}
