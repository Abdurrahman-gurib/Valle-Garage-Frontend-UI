import { useMemo, useState } from "react";
import { Button, Field, Input, Select, TextArea } from "./UI.jsx";
import { useApp } from "../context/AppContext.jsx";

export function VehicleForm({ onDone }) {
  const { addVehicle } = useApp();
  const [form, setForm] = useState({
    plate: "",
    vin: "",
    type: "Quad",
    ownership: "Internal",
    owner: "Vallé Adventure Park",
    status: "Active",
    hours: 0,
    nextService: 100,
    mechanic: "",
    notes: "",
  });
  function save(e) {
    e.preventDefault();
    addVehicle(form);
    onDone?.();
  }
  return (
    <form onSubmit={save} className="form-grid">
      <Field label="Plate Number">
        <Input
          required
          value={form.plate}
          onChange={(e) => setForm({ ...form, plate: e.target.value })}
        />
      </Field>
      <Field label="VIN / Chassis No.">
        <Input
          required
          value={form.vin}
          onChange={(e) => setForm({ ...form, vin: e.target.value })}
        />
      </Field>
      <Field label="Vehicle Type">
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option>Quad</option>
          <option>Buggy</option>
          <option>Jeep</option>
        </Select>
      </Field>
      <Field label="Internal / External">
        <Select
          value={form.ownership}
          onChange={(e) =>
            setForm({
              ...form,
              ownership: e.target.value,
              owner:
                e.target.value === "Internal" ? "Vallé Adventure Park" : "",
            })
          }
        >
          <option>Internal</option>
          <option>External</option>
        </Select>
      </Field>
      <Field label="Vehicle Owner">
        <Input
          value={form.owner}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
        />
      </Field>
      <Field label="Status">
        <Select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option>Active</option>
          <option>Under Repair</option>
          <option>Out of Service</option>
          <option>Build in Progress</option>
          <option>Built and Testing</option>
          <option>Delivered</option>
        </Select>
      </Field>
      <Field label="Hour Meter">
        <Input
          type="number"
          value={form.hours}
          onChange={(e) => setForm({ ...form, hours: e.target.value })}
        />
      </Field>
      <Field label="Next Service Hours">
        <Input
          type="number"
          value={form.nextService}
          onChange={(e) => setForm({ ...form, nextService: e.target.value })}
        />
      </Field>
      <Field label="Assigned Mechanic">
        <Input
          value={form.mechanic}
          onChange={(e) => setForm({ ...form, mechanic: e.target.value })}
        />
      </Field>
      <Field label="Photos">
        <Input type="file" multiple />
      </Field>
      <Field label="Notes">
        <TextArea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>
      <div className="form-actions">
        <Button>Save Vehicle</Button>
      </div>
    </form>
  );
}

export function AssessmentForm({ onDone }) {
  const { vehicles, inventory, addAssessment, currentUser } = useApp();
  const [partId, setPartId] = useState(inventory[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || "",
    issue: "",
    conclusion: "",
  });
  function addPart() {
    const p = inventory.find((x) => x.id === partId);
    if (p)
      setParts([...parts, { partId: p.id, name: p.name, qty: Number(qty) }]);
  }
  function save(e) {
    e.preventDefault();
    addAssessment({ ...form, parts, mechanic: currentUser?.name });
    onDone?.();
  }
  return (
    <form onSubmit={save} className="form-grid">
      <Field label="Vehicle">
        <Select
          value={form.vehicleId}
          onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
        >
          {vehicles.map((v) => (
            <option value={v.id} key={v.id}>
              {v.plate} - {v.type}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Issue Detected">
        <TextArea
          required
          value={form.issue}
          onChange={(e) => setForm({ ...form, issue: e.target.value })}
        />
      </Field>
      <Field label="Conclusion">
        <TextArea
          value={form.conclusion}
          onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
        />
      </Field>
      <Field label="Add Required Part">
        <div className="inline-fields">
          <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
            {inventory.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={addPart}>
            Add
          </Button>
        </div>
      </Field>
      <div className="part-list">
        {parts.map((p, i) => (
          <span key={i}>
            {p.name} x {p.qty}
          </span>
        ))}
      </div>
      <Field label="Photo Upload">
        <Input type="file" multiple />
      </Field>
      <div className="form-actions">
        <Button>Save Assessment</Button>
      </div>
    </form>
  );
}

export function GarageOpForm({ onDone }) {
  const { vehicles, assessments, addGarageOp } = useApp();
  const openAssessments = assessments.filter((a) => a.status !== "Completed");
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || "",
    assessmentId: openAssessments[0]?.id || "",
    type: "Repair",
    workDone: "",
    labor: "1 hr",
    status: "Ongoing",
  });
  function save(e) {
    e.preventDefault();
    addGarageOp(form);
    onDone?.();
  }
  return (
    <form onSubmit={save} className="form-grid">
      <Field label="Vehicle">
        <Select
          value={form.vehicleId}
          onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
        >
          {vehicles.map((v) => (
            <option value={v.id} key={v.id}>
              {v.plate}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Assessment Ticket">
        <Select
          value={form.assessmentId}
          onChange={(e) => setForm({ ...form, assessmentId: e.target.value })}
        >
          {openAssessments.map((a) => (
            <option value={a.id} key={a.id}>
              {a.id} - {a.vehicle}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Process Type">
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option>Repair</option>
          <option>Maintenance</option>
          <option>Servicing</option>
        </Select>
      </Field>
      <Field label="Work Done">
        <TextArea
          required
          value={form.workDone}
          onChange={(e) => setForm({ ...form, workDone: e.target.value })}
        />
      </Field>
      <Field label="Labor Hours">
        <Input
          value={form.labor}
          onChange={(e) => setForm({ ...form, labor: e.target.value })}
        />
      </Field>
      <Field label="Photo Upload">
        <Input type="file" multiple />
      </Field>
      <div className="form-actions">
        <Button>Save Process</Button>
      </div>
    </form>
  );
}
