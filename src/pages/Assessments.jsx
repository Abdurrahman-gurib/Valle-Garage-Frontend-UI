import { useState } from "react";
import { AssessmentForm } from "../components/Forms.jsx";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Assessments() {
  const {
    currentUser,
    assessments,
    completeAssessment,
    reopenAssessment,
    updateAssessment,
  } = useApp();
  const [modal, setModal] = useState(null);
  const opened = assessments.filter((a) => a.status !== "Completed");
  const completed = assessments.filter((a) => a.status === "Completed");
  return (
    <div className="page">
      <PageHeader
        title="Assessments"
        subtitle="Mechanics open tickets. Store keeper views required parts and completes after issuing parts."
        action={() => setModal({ type: "new" })}
        actionLabel="New Assessment"
      />
      <div className="section-tabs">
        <b>Opened / In Progress</b>
        <span>{opened.length} ticket(s)</span>
      </div>
      <div className="card-grid">
        {opened.map((a) => (
          <AssessmentCard
            key={a.id}
            assessment={a}
            onView={() => setModal({ type: "view", item: a })}
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
            onView={() => setModal({ type: "view", item: a })}
          />
        ))}
      </div>
      {modal?.type === "new" && (
        <Modal title="New Assessment" onClose={() => setModal(null)} wide>
          <AssessmentForm onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "view" && (
        <Modal
          title={`${modal.item.id} Assessment Details`}
          onClose={() => setModal(null)}
          wide
        >
          <AssessmentDetail
            assessment={modal.item}
            role={currentUser.role}
            onComplete={() => {
              completeAssessment(modal.item.id);
              setModal(null);
            }}
            onReopen={(reason) => {
              reopenAssessment(modal.item.id, reason);
              setModal(null);
            }}
            onUpdate={(updates) => {
              updateAssessment(modal.item.id, updates);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function AssessmentCard({ assessment, onView }) {
  return (
    <Card>
      <div className="card-head">
        <h2>{assessment.id}</h2>
        <Badge tone={assessment.status === "Completed" ? "success" : "warning"}>
          {assessment.status}
        </Badge>
      </div>
      <p>
        <b>Vehicle:</b> {assessment.vehicle}
      </p>
      <p>
        <b>Mechanic:</b> {assessment.mechanic}
      </p>
      <p>{assessment.issue}</p>
      <button className="open-btn" onClick={onView}>
        View
      </button>
    </Card>
  );
}
function AssessmentDetail({
  assessment,
  role,
  onComplete,
  onReopen,
  onUpdate,
}) {
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState("");
  return (
    <div className="detail-stack">
      <p>
        <b>Vehicle:</b> {assessment.vehicle}
      </p>
      <p>
        <b>Mechanic:</b> {assessment.mechanic}
      </p>
      <p>
        <b>Issue:</b> {assessment.issue}
      </p>
      <p>
        <b>Conclusion:</b> {assessment.conclusion}
      </p>
      <p>
        <b>Required parts:</b>{" "}
        {assessment.parts.map((p) => `${p.name} x${p.qty}`).join(", ") ||
          "No parts listed"}
      </p>
      {assessment.reopenReason && (
        <div className="notice">
          <b>Re-open reason:</b> {assessment.reopenReason}
          <br />
          <b>By:</b> {assessment.reopenedBy}
        </div>
      )}
      <Field label="Add correction / new part note">
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Example: Add brake fluid x1"
        />
      </Field>
      <Button
        variant="secondary"
        onClick={() =>
          onUpdate({
            conclusion: assessment.conclusion + " | Update: " + extra,
          })
        }
      >
        Save Update
      </Button>
      <Field label="Reason to re-open assessment">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason is required"
        />
      </Field>
      <div className="button-row">
        <Button
          variant="secondary"
          onClick={() =>
            reason.trim()
              ? onReopen(reason)
              : alert("Please provide a clear reason.")
          }
        >
          Re-open
        </Button>
        {role === "store" && (
          <Button onClick={onComplete}>
            Mark Completed After Parts Issued
          </Button>
        )}
      </div>
    </div>
  );
}
