import { useNavigate } from "react-router-dom";
import { Card, PageHeader, Badge } from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Dashboard() {
  const {
    currentUser,
    vehicles,
    inventory,
    assessments,
    garageOps,
    transactions,
  } = useApp();
  const navigate = useNavigate();
  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel);
  const opened = assessments.filter((a) =>
    ["Opened", "In Diagnosis"].includes(a.status),
  );
  const ongoing = garageOps.filter((g) => g.status === "Ongoing");
  const stats = [
    ["Vehicles", vehicles.length, "Open fleet records", "/vehicles"],
    [
      "In Garage",
      vehicles.filter((v) => v.status !== "Active").length,
      "Repair / service queue",
      "/garage",
    ],
    ["Low Stock", lowStock.length, "Needs reorder", "/inventory"],
    ["Assessments", assessments.length, "Diagnosis records", "/assessments"],
  ];
  return (
    <div className="page">
      <PageHeader
        title={`Today’s ${currentUser.label} Dashboard`}
        subtitle="A simple view of vehicles, parts and work that needs attention."
      />
      <div className="stats-grid">
        {stats.map((s) => (
          <Card key={s[0]} onClick={() => navigate(s[3])}>
            <div className="stat-icon">▣</div>
            <span className="arrow">›</span>
            <h3>{s[0]}</h3>
            <strong>{s[1]}</strong>
            <p>{s[2]}</p>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="card-head">
            <h2>Vehicle Work Queue</h2>
            <button
              onClick={() => navigate("/vehicles")}
              className="outline-btn"
            >
              View all
            </button>
          </div>
          <p>Click a vehicle to view full details.</p>
          <div className="mini-table">
            {vehicles.slice(0, 4).map((v) => (
              <button key={v.id} onClick={() => navigate("/vehicles")}>
                <b>{v.plate}</b>
                <span>{v.type}</span>
                <Badge
                  tone={
                    v.status === "Active"
                      ? "success"
                      : v.status === "Under Repair"
                        ? "warning"
                        : "danger"
                  }
                >
                  {v.status}
                </Badge>
                <span>{v.hours} hrs</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Next Actions</h2>
          <p>Simple task list for staff.</p>
          <div className="task-list">
            <button onClick={() => navigate("/assessments")}>
              Review opened assessments
            </button>
            <button onClick={() => navigate("/garage")}>
              Complete ongoing garage work
            </button>
            <button onClick={() => navigate("/inventory")}>
              Review low-stock report
            </button>
          </div>
        </Card>
      </div>
      {currentUser.role === "mechanic" && (
        <div className="two-grid">
          <Card>
            <h2>Recent Opened Assessments</h2>
            {opened.map((a) => (
              <div className="list-row" key={a.id}>
                <b>{a.id}</b>
                <span>{a.vehicle}</span>
                <Badge tone="warning">{a.status}</Badge>
              </div>
            ))}
          </Card>
          <Card>
            <h2>Ongoing Work Assigned</h2>
            {ongoing.map((g) => (
              <div className="list-row" key={g.id}>
                <b>{g.id}</b>
                <span>
                  {g.vehicle} • {g.type}
                </span>
                <Badge tone="warning">{g.status}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
      {currentUser.role === "store" && (
        <div className="two-grid">
          <Card>
            <h2>Assessments Waiting for Parts</h2>
            {opened.map((a) => (
              <div className="list-row" key={a.id}>
                <b>{a.id}</b>
                <span>
                  {a.parts.map((p) => `${p.name} x${p.qty}`).join(", ") ||
                    "No parts added"}
                </span>
              </div>
            ))}
          </Card>
          <Card>
            <h2>Pending Transactions</h2>
            {transactions
              .filter((t) => t.status !== "Completed" && t.status !== "Paid")
              .map((t) => (
                <div className="list-row" key={t.id}>
                  <b>{t.id}</b>
                  <span>{t.item}</span>
                  <Badge tone="warning">{t.status}</Badge>
                </div>
              ))}
          </Card>
        </div>
      )}
      {currentUser.role === "admin" && (
        <div className="two-grid">
          <Card>
            <h2>Management Overview</h2>
            <div className="insight-grid">
              <div>
                Fleet Ready <b>82%</b>
              </div>
              <div>
                Parts Risk <b>{lowStock.length}</b>
              </div>
              <div>
                Open Tickets <b>{opened.length}</b>
              </div>
              <div>
                Revenue Pipeline <b>Rs 890k</b>
              </div>
            </div>
          </Card>
          <Card>
            <h2>Admin Actions</h2>
            <div className="task-list">
              <button onClick={() => navigate("/settings")}>
                Manage users and roles
              </button>
              <button onClick={() => navigate("/reports")}>Open reports</button>
              <button onClick={() => navigate("/transactions")}>
                Review transactions
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
