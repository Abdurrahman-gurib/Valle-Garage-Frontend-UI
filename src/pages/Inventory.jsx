import { useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Table,
  TextArea,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
export default function Inventory() {
  const { inventory, createPO } = useApp();
  const [modal, setModal] = useState(null);
  return (
    <div className="page">
      <PageHeader
        title="Inventory / CF MOTO Store"
        subtitle="Low stock items can be re-ordered using a Purchase Order form."
      />
      <Table
        headers={[
          "SKU",
          "Part",
          "Stock",
          "Reorder Level",
          "Supplier",
          "Status",
          "Action",
        ]}
      >
        {inventory.map((p) => (
          <tr key={p.id}>
            <td>
              <b>{p.sku}</b>
            </td>
            <td>{p.name}</td>
            <td>{p.stock}</td>
            <td>{p.reorderLevel}</td>
            <td>{p.supplier}</td>
            <td>
              <Badge tone={p.stock <= p.reorderLevel ? "danger" : "success"}>
                {p.stock <= p.reorderLevel ? "Re-order" : "OK"}
              </Badge>
            </td>
            <td>
              <button
                className="open-btn"
                onClick={() => setModal({ type: "po", item: p })}
              >
                {p.stock <= p.reorderLevel ? "Re-order" : "Create PO"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {modal?.type === "po" && (
        <Modal title="Purchase Order Form" onClose={() => setModal(null)} wide>
          <POForm part={modal.item} createPO={createPO} />
        </Modal>
      )}
    </div>
  );
}
function POForm({ part, createPO }) {
  const [form, setForm] = useState({
    supplier: part.supplier,
    supplierEmail: part.supplierEmail,
    item: part.name,
    quantity: 10,
    message: `Dear Supplier, please process this purchase order for ${part.name}.`,
  });
  const [tx, setTx] = useState(null);
  function save() {
    const t = createPO(part, form.quantity, form);
    setTx(t);
  }
  function download() {
    const text = `VALLÉ GARAGE MANAGEMENT SYSTEM\nPURCHASE ORDER\n\nSupplier: ${form.supplier}\nEmail: ${form.supplierEmail}\nItem: ${form.item}\nQuantity: ${form.quantity}\nMessage: ${form.message}`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `PO-${form.item}.txt`;
    a.click();
  }
  function email() {
    download();
    window.location.href = `mailto:${form.supplierEmail}?subject=Purchase Order - ${form.item}&body=${encodeURIComponent(form.message + "\n\nPO has been downloaded. Please attach it manually if required by your email app.")}`;
  }
  return (
    <div>
      <div className="form-grid">
        <Field label="Supplier">
          <Input
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
        </Field>
        <Field label="Supplier Email">
          <Input
            value={form.supplierEmail}
            onChange={(e) =>
              setForm({ ...form, supplierEmail: e.target.value })
            }
          />
        </Field>
        <Field label="Item">
          <Input
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
          />
        </Field>
        <Field label="Quantity">
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </Field>
        <Field label="Message before sending">
          <TextArea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
      </div>
      <pre className="document-preview">
        VALLÉ GARAGE MANAGEMENT SYSTEM\nPURCHASE ORDER\n\nSupplier:{" "}
        {form.supplier}\nEmail: {form.supplierEmail}\nItem: {form.item}
        \nQuantity: {form.quantity}\nStatus: Pending
      </pre>
      <div className="button-row">
        <Button onClick={save}>Save PO</Button>
        <Button variant="secondary" onClick={download}>
          Download PO
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Print PO
        </Button>
        <Button variant="warning" onClick={email}>
          Send Email
        </Button>
      </div>
      {tx && <div className="notice">Saved as transaction {tx.id}</div>}
    </div>
  );
}
