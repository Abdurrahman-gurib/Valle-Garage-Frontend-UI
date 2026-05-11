import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Badge, Card, Modal, PageHeader, Table } from "../components/UI.jsx";
import { VehicleForm } from "../components/Forms.jsx";

export default function Vehicles() {
  const { vehicles, assessments, garageOps, can } = useApp();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("");
  const shown = vehicles.filter((v) =>
    JSON.stringify(v).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeader
        title="Vehicles"
        subtitle="Search vehicle, register new vehicle and view full assessment / garage history."
        action={can("vehicles") ? () => setModal({ type: "add" }) : null}
        actionLabel="Add Vehicle"
      />
      <input
        className="page-filter"
        placeholder="Search by plate, owner, status, company, delivery person..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <Table
        headers={[
          "Plate",
          "Type",
          "Internal/External",
          "Owner / Company",
          "Status",
          "Check-in",
          "Action",
        ]}
      >
        {shown.map((v) => (
          <tr key={v.id}>
            <td>
              <b>{v.plate}</b>
            </td>
            <td>{v.type}</td>
            <td>{v.ownership}</td>
            <td>{v.companyName || v.owner}</td>
            <td>
              <Badge
                tone={
                  v.status === "Active"
                    ? "success"
                    : v.status === "Under Repair" ||
                        v.status === "Build in Progress"
                      ? "warning"
                      : "danger"
                }
              >
                {v.status}
              </Badge>
            </td>
            <td>{v.checkInDateTime?.replace("T", " ") || "-"}</td>
            <td>
              <button
                className="open-btn"
                onClick={() => setModal({ type: "view", item: v })}
              >
                Open
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {modal?.type === "add" && (
        <Modal title="Add Vehicle" onClose={() => setModal(null)} wide>
          <VehicleForm onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal
          title={`${modal.item.plate} Details`}
          onClose={() => setModal(null)}
          wide
        >
          <VehicleDetails
            vehicle={modal.item}
            assessments={assessments}
            garageOps={garageOps}
          />
        </Modal>
      )}
    </div>
  );
}
function VehicleDetails({ vehicle, assessments, garageOps }) {
  const a = assessments.filter((x) => x.vehicleId === vehicle.id);
  const g = garageOps.filter((x) => x.vehicleId === vehicle.id);
  return (
    <div>
      <div className="detail-grid">
        <Card>
          <h3>Vehicle Information</h3>
          <p>
            <b>VIN:</b> {vehicle.vin}
          </p>
          <p>
            <b>Owner:</b> {vehicle.owner}
          </p>
          <p>
            <b>Company:</b> {vehicle.companyName || "-"}
          </p>
          <p>
            <b>Delivered By:</b> {vehicle.deliveryPersonName || "-"}
          </p>
          <p>
            <b>Contact:</b> {vehicle.contactNumber || "-"}{" "}
            {vehicle.email ? ` / ${vehicle.email}` : ""}
          </p>
          <p>
            <b>Check-in:</b> {vehicle.checkInDateTime?.replace("T", " ") || "-"}
          </p>
          <p>
            <b>Status:</b> {vehicle.status}
          </p>
          <p>
            <b>Notes:</b> {vehicle.notes}
          </p>
        </Card>
        <Card>
          <h3>Service / Build</h3>
          <p>
            <b>Hour meter:</b> {vehicle.hours}
          </p>
          <p>
            <b>Next service:</b> {vehicle.nextService}
          </p>
          <p>
            <b>Mechanic:</b> {vehicle.mechanic}
          </p>
          <p>
            <b>Expected Delivery:</b> {vehicle.expectedDeliveryDate || "-"}
          </p>
          <p>
            <b>Source Transaction:</b> {vehicle.sourceTransactionId || "-"}
          </p>
        </Card>
      </div>
      <h3 className="section-small">Vehicle History</h3>
      {a.length === 0 && g.length === 0 && (
        <p className="notice">
          No assessment or garage operation recorded yet.
        </p>
      )}
      {a.map((x) => (
        <details className="history" key={x.id}>
          <summary>
            {x.id} Assessment - {x.status}
          </summary>
          <p>{x.issue}</p>
          <p>
            <b>Conclusion:</b> {x.conclusion}
          </p>
          <p>
            <b>Parts:</b>{" "}
            {x.parts.map((p) => `${p.name} x${p.qty}`).join(", ") || "None"}
          </p>
          {x.reopenReason && (
            <p>
              <b>Reopened by:</b> {x.reopenedBy} — {x.reopenReason}
            </p>
          )}
        </details>
      ))}
      {g.map((x) => (
        <details className="history" key={x.id}>
          <summary>
            {x.id} {x.type} - {x.status}
          </summary>
          <p>{x.workDone}</p>
          <p>
            <b>Check-in:</b> {x.checkInDateTime?.replace("T", " ") || "-"}
          </p>
          <p>
            <b>Expected Delivery:</b> {x.expectedDeliveryDate || "-"}
          </p>
          <p>
            <b>Payment:</b> {x.paymentStatus || "Pending"}
          </p>
          <p>
            <b>Invoice:</b> {x.invoiceFile || "Not attached"}
          </p>
          <p>
            <b>Parts used:</b>{" "}
            {x.partsUsed.map((p) => `${p.name} x${p.qty}`).join(", ") || "None"}
          </p>
        </details>
      ))}
    </div>
  );
}
