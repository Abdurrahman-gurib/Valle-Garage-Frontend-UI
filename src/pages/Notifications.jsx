import { Card, PageHeader } from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";
export default function Notifications() {
  const { notifications } = useApp();
  return (
    <div className="page">
      <PageHeader title="Notifications" subtitle="Alerts for each user role." />
      <Card>
        {notifications.map((n, i) => (
          <div className="notif-row" key={i}>
            🔔 {n}
          </div>
        ))}
      </Card>
    </div>
  );
}
