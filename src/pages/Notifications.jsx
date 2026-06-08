import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Field, Input, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function toText(n) {
  if (typeof n === 'string') return n;
  return [n?.title, n?.message].filter(Boolean).join(': ') || 'Notification';
}

function makeNotification({ title, message, role = 'all', priority = 'NORMAL', path = '/', type = 'Info' }) {
  return {
    id: `${title}-${message}-${path}`,
    title,
    message,
    role,
    priority,
    path,
    type,
    createdAt: new Date().toLocaleString('en-GB'),
  };
}

export default function Notifications() {
  const navigate = useNavigate();
  const {
    currentUser,
    notifications = [],
    inventory = [],
    assessments = [],
    garageOps = [],
    guestTickets = [],
    fuelConsumptions = [],
    vehicleOutActivities = [],
    supportRequests = [],
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const role = currentUser?.role || 'guest';

  const liveNotifications = useMemo(() => {
    const items = [];

    const lowStock = inventory.filter(
      (item) => Number(item.stock || 0) <= Number(item.reorderLevel || 0)
    );

    const openAssessments = assessments.filter(
      (a) => !['completed', 'closed', 'cancelled'].includes(String(a.status || '').toLowerCase())
    );

    const openGarage = garageOps.filter(
      (g) => !['completed', 'closed', 'cancelled', 'delivered'].includes(String(g.status || '').toLowerCase())
    );

    const pendingGuests = guestTickets.filter(
      (t) => String(t.status || '').toLowerCase() === 'pending'
    );

    const openSupport = supportRequests.filter(
      (s) => !['resolved', 'closed'].includes(String(s.status || '').toLowerCase())
    );

    if (['admin', 'store'].includes(role) && lowStock.length) {
      items.push(makeNotification({
        title: 'Low stock alert',
        message: `${lowStock.length} part(s) are at or below reorder level.`,
        role,
        priority: 'HIGH',
        path: '/inventory',
        type: 'Stock',
      }));
    }

    if (['admin', 'mechanic'].includes(role) && pendingGuests.length) {
      items.push(makeNotification({
        title: 'Guest ticket pending',
        message: `${pendingGuests.length} guest drop-off ticket(s) waiting for action.`,
        role,
        priority: 'HIGH',
        path: '/guest-pending',
        type: 'Guest',
      }));
    }

    if (['admin', 'mechanic', 'store'].includes(role) && openAssessments.length) {
      items.push(makeNotification({
        title: 'Assessment pending',
        message: `${openAssessments.length} assessment(s) not completed or closed.`,
        role,
        priority: 'NORMAL',
        path: '/assessments',
        type: 'Assessment',
      }));
    }

    if (['admin', 'mechanic'].includes(role) && openGarage.length) {
      items.push(makeNotification({
        title: 'Garage work open',
        message: `${openGarage.length} garage work ticket(s) still active.`,
        role,
        priority: 'NORMAL',
        path: '/garage',
        type: 'Garage',
      }));
    }

    if (role === 'admin' && openSupport.length) {
      items.push(makeNotification({
        title: 'Support requests open',
        message: `${openSupport.length} support request(s) waiting for admin follow-up.`,
        role,
        priority: 'HIGH',
        path: '/support',
        type: 'Support',
      }));
    }

    if (role === 'fuel' && fuelConsumptions.length) {
      items.push(makeNotification({
        title: 'Fuel entries stored',
        message: `${fuelConsumptions.length} fuel record(s) available for reports.`,
        role,
        priority: 'NORMAL',
        path: '/reports',
        type: 'Fuel',
      }));
    }

    if (role === 'vehicle_manager' && vehicleOutActivities.length) {
      items.push(makeNotification({
        title: 'Vehicle activity records',
        message: `${vehicleOutActivities.length} vehicle in/out record(s) available.`,
        role,
        priority: 'NORMAL',
        path: '/reports',
        type: 'Vehicle Activity',
      }));
    }

    return items;
  }, [
    role,
    inventory,
    assessments,
    garageOps,
    guestTickets,
    fuelConsumptions,
    vehicleOutActivities,
    supportRequests,
  ]);

  const apiNotifications = notifications.map((n, index) => ({
    id: `api-${index}`,
    title: toText(n).split(':')[0] || 'Notification',
    message: toText(n),
    role,
    priority: 'NORMAL',
    path: '/notifications',
    type: 'System',
    createdAt: '',
  }));

  const all = [...liveNotifications, ...apiNotifications];

  const filtered = all.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      [n.title, n.message, n.priority, n.type, n.role]
        .some((x) => String(x || '').toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' || String(n.priority).toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page notifications-page">
      <PageHeader
        title="Notifications"
        subtitle="Live role-based alerts from stock, guest tickets, assessments, garage work, support requests, fuel and vehicle activity."
      />

      <div className="toolbar report-toolbar">
        <Field label="Search notification">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock, ticket, assessment, support..."
          />
        </Field>

        <Field label="Priority">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
      </div>

      <div className="notification-grid">
        {filtered.map((n) => (
          <Card key={n.id} className="notification-card">
            <div className="card-head">
              <div>
                <h2>{n.title}</h2>
                <p>{n.message}</p>
              </div>
              <div className="support-badges">
                <Badge>{n.type}</Badge>
                <Badge>{n.priority}</Badge>
              </div>
            </div>

            <div className="support-meta">
              <span><b>Role:</b> {role}</span>
              <span><b>Date:</b> {n.createdAt || 'Live'}</span>
            </div>

            {n.path && n.path !== '/notifications' && (
              <div className="form-actions">
                <Button onClick={() => navigate(n.path)}>Open Related Page</Button>
              </div>
            )}
          </Card>
        ))}

        {!filtered.length && (
          <Card>
            <h2>No notifications</h2>
            <p>No live alert found for your current role and filter.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
