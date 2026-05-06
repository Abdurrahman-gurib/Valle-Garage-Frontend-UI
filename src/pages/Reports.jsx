import { Card, PageHeader } from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
export default function Reports() {
  const { vehicles, inventory, assessments, garageOps, transactions } =
    useApp();
  const reports = [
    ["Vehicle Maintenance History", `${garageOps.length} operations logged`],
    [
      "Parts Consumption",
      `${garageOps.flatMap((g) => g.partsUsed).length} part usage records`,
    ],
    [
      "Inventory Stock Levels",
      `${inventory.filter((i) => i.stock <= i.reorderLevel).length} low-stock items`,
    ],
    [
      "Most Repaired Vehicles",
      `${vehicles.filter((v) => v.status !== "Active").length} vehicles need attention`,
    ],
    [
      "Assessment Performance",
      `${assessments.filter((a) => a.status === "Completed").length} completed assessments`,
    ],
    [
      "Transaction Overview",
      `${transactions.length} purchase/customer transactions`,
    ],
  ];
  return (
    <div className="page">
      <PageHeader
        title="Reports"
        subtitle="Simple reports for management and daily decisions."
      />
      <div className="report-grid">
        {reports.map((r, i) => (
          <Card key={r[0]}>
            <h2>{r[0]}</h2>
            <p>{r[1]}</p>
            <div className="chart-preview">
              <div style={{ height: `${45 + i * 8}%` }}></div>
              <div style={{ height: `${70 - i * 5}%` }}></div>
              <div style={{ height: `${55 + i * 4}%` }}></div>
            </div>
            <button className="open-btn" onClick={() => window.print()}>
              Export PDF
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
