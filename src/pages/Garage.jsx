import { useState } from "react";
import { GarageOpForm } from "../components/Forms.jsx";
import { Badge, Card, Modal, PageHeader, Table } from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
export default function Garage() {
  const { garageOps } = useApp();
  const [modal, setModal] = useState(null);
  return (
    <div className="page">
      <PageHeader
        title="Garage Work"
        subtitle="Record repair, maintenance and servicing after assessments are opened."
        action={() => setModal({ type: "new" })}
        actionLabel="Start Process"
      />
      <Table
        headers={[
          "Process",
          "Vehicle",
          "Assessment",
          "Type",
          "Mechanic",
          "Labor",
          "Status",
          "Action",
        ]}
      >
        {garageOps.map((g) => (
          <tr key={g.id}>
            <td>
              <b>{g.id}</b>
            </td>
            <td>{g.vehicle}</td>
            <td>{g.assessmentId}</td>
            <td>{g.type}</td>
            <td>{g.mechanic}</td>
            <td>{g.labor}</td>
            <td>
              <Badge tone={g.status === "Completed" ? "success" : "warning"}>
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
      {modal?.type === "view" && (
        <Modal
          title={`${modal.item.id} Details`}
          onClose={() => setModal(null)}
        >
          <p>
            <b>Vehicle:</b> {modal.item.vehicle}
          </p>
          <p>
            <b>Work done:</b> {modal.item.workDone}
          </p>
          <p>
            <b>Parts used:</b>{" "}
            {modal.item.partsUsed
              .map((p) => `${p.name} x${p.qty}`)
              .join(", ") || "None"}
          </p>
        </Modal>
      )}
    </div>
  );
}
