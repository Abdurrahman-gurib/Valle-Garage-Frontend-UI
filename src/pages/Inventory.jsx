import { useMemo, useState } from "react";
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

function formatMoney(value) {
  const amount = Number(value || 0);

  return `Rs ${amount.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSellingPrice(part) {
  return Number(
    part?.sellingPrice ??
      part?.price ??
      part?.unitPrice ??
      part?.lastPrice ??
      part?.costPrice ??
      0
  );
}

function getStock(part) {
  return Number(part?.stock ?? part?.currentStock ?? 0);
}

function getSupplier(part) {
  return part?.supplier || part?.supplierName || "-";
}

export default function Inventory() {
  const { inventory = [], createPO } = useApp();
  const [modal, setModal] = useState(null);

  const normalizedInventory = useMemo(() => {
    return inventory.map((p) => ({
      ...p,
      displaySellingPrice: getSellingPrice(p),
      displayStock: getStock(p),
      displaySupplier: getSupplier(p),
    }));
  }, [inventory]);

  return (
    <div className="page">
      <PageHeader
        title="Inventory / CF MOTO Store"
        subtitle="Low stock items can be re-ordered using a Purchase Order form. Selling price is loaded from the database."
      />

      <Table
        headers={[
          "SKU",
          "Part",
          "Selling Price",
          "Stock",
          "Reorder Level",
          "Supplier",
          "Status",
          "Action",
        ]}
      >
        {normalizedInventory.map((p) => {
          const stock = Number(p.displayStock || 0);
          const reorderLevel = Number(p.reorderLevel || 0);

          return (
            <tr key={p.id || p.sku}>
              <td>
                <b>{p.sku || "-"}</b>
              </td>

              <td>{p.name || "-"}</td>

              <td>
                <b>{formatMoney(p.displaySellingPrice)}</b>
              </td>

              <td>{stock}</td>

              <td>{reorderLevel}</td>

              <td>{p.displaySupplier}</td>

              <td>
                <Badge tone={stock <= reorderLevel ? "danger" : "success"}>
                  {stock <= reorderLevel ? "Re-order" : "OK"}
                </Badge>
              </td>

              <td>
                <button
                  className="open-btn"
                  type="button"
                  onClick={() => setModal({ type: "po", item: p })}
                >
                  {stock <= reorderLevel ? "Re-order" : "Create PO"}
                </button>
              </td>
            </tr>
          );
        })}
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
  const sellingPrice = getSellingPrice(part);

  const [form, setForm] = useState({
    supplier: part.supplier || part.supplierName || "",
    supplierEmail: part.supplierEmail || "",
    item: part.name || "",
    quantity: 10,
    startDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: "",
    amount: sellingPrice * 10,
    poFile: "",
    message: `Dear Supplier,\n\nPlease process this purchase order for ${part.name}.\n\nRegards,\nVallé Garage & Spare Parts Team`,
  });

  const [tx, setTx] = useState(null);

  function save() {
    const t = createPO(part, Number(form.quantity || 0), form);
    setTx(t);
  }

  function download() {
    const text = `VALLÉ GARAGE MANAGEMENT SYSTEM
PURCHASE ORDER

Supplier: ${form.supplier}
Email: ${form.supplierEmail}
Item: ${form.item}
Quantity: ${form.quantity}
Unit Selling Price: ${formatMoney(sellingPrice)}
Amount: ${formatMoney(form.amount)}
Start Date: ${form.startDate}
Expected Delivery: ${form.expectedDeliveryDate || "TBD"}

Message:
${form.message}`;

    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = `PO-${form.item}.txt`;
    a.click();
  }

  function email() {
    download();

    window.location.href = `mailto:${
      form.supplierEmail
    }?subject=Purchase Order - ${form.item}&body=${encodeURIComponent(
      form.message +
        "\n\nThe PO has been downloaded. Please attach it to your email before sending if your email app does not attach automatically."
    )}`;
  }

  function updateQuantity(value) {
    const qty = Number(value || 0);

    setForm({
      ...form,
      quantity: value,
      amount: qty * sellingPrice,
    });
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

        <Field label="DB Selling Price">
          <Input value={formatMoney(sellingPrice)} readOnly />
        </Field>

        <Field label="Quantity">
          <Input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => updateQuantity(e.target.value)}
          />
        </Field>

        <Field label="Start Date">
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>

        <Field label="Expected Delivery">
          <Input
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(e) =>
              setForm({ ...form, expectedDeliveryDate: e.target.value })
            }
          />
        </Field>

        <Field label="Amount">
          <Input value={formatMoney(form.amount)} readOnly />
        </Field>

        <Field label="Attach PO / Supplier Quote">
          <Input
            type="file"
            onChange={(e) =>
              setForm({ ...form, poFile: e.target.files?.[0]?.name || "" })
            }
          />

          {form.poFile && <small>{form.poFile}</small>}
        </Field>

        <Field label="Edit Message Before Sending">
          <TextArea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
      </div>

      <pre className="document-preview">
        {`VALLÉ GARAGE MANAGEMENT SYSTEM
PURCHASE ORDER

Supplier: ${form.supplier}
Email: ${form.supplierEmail}
Item: ${form.item}
Quantity: ${form.quantity}
Unit Selling Price: ${formatMoney(sellingPrice)}
Amount: ${formatMoney(form.amount)}
Expected Delivery: ${form.expectedDeliveryDate || "TBD"}
Status: Pending`}
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