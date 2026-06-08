import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/UI.jsx";
import { useApp } from "../context/AppContext.jsx";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin / Super Admin" },
  { value: "mechanic", label: "Mechanic" },
  { value: "store", label: "Store Keeper" },
  { value: "fuel", label: "Fuel Management System" },
  { value: "vehicle_manager", label: "Vehicles Management System" },
];

function roleText(role) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role || "-";
}

export default function Settings() {
  const {
    currentUser,
    users = [],
    addUser,
    updateUserAdmin,
    resetUserPassword,
    removeUserLogin,
    refreshAll,
    apiStatus,
  } = useApp();

  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "mechanic",
    password: "password123",
    isActive: true,
  });
  const [editForm, setEditForm] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ id: "", password: "password123" });

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) =>
      !q ||
      [u.name, u.email, u.role, u.label, u.isActive ? "active" : "inactive"]
        .some((x) => String(x || "").toLowerCase().includes(q))
    );
  }, [users, search]);

  async function saveNewUser() {
    if (!form.name.trim()) return alert("Enter user name.");
    const email = form.email.includes("@")
      ? form.email
      : `${form.email || form.name.toLowerCase().replaceAll(" ", ".")}@vallepark.com`;

    await addUser({ ...form, email });
    setForm({
      name: "",
      email: "",
      role: "mechanic",
      password: "password123",
      isActive: true,
    });
    setModal(null);
  }

  function openEdit(user) {
    setEditForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "mechanic",
      isActive: user.isActive !== false,
    });
    setModal("edit");
  }

  async function saveEdit() {
    await updateUserAdmin(editForm.id, {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      isActive: editForm.isActive,
    });
    setModal(null);
    setEditForm(null);
  }

  function openReset(user) {
    setPasswordForm({ id: user.id, name: user.name, email: user.email, password: "password123" });
    setModal("reset");
  }

  async function savePassword() {
    if (!passwordForm.password || passwordForm.password.length < 6) {
      return alert("Password must be at least 6 characters.");
    }
    await resetUserPassword(passwordForm.id, passwordForm.password);
    setModal(null);
  }

  async function deactivateUser(user) {
    if (user.id === currentUser?.id) {
      return alert("You cannot deactivate your own current login.");
    }

    if (!confirm(`Deactivate login for ${user.name}? Their history remains stored.`)) {
      return;
    }

    await removeUserLogin(user.id);
  }

  return (
    <div className="page settings-page super-admin-settings-page">
      <PageHeader
        title="Super Admin Settings"
        subtitle={`Manage users, roles, login access, password resets and system rules. API: ${apiStatus}`}
        action={() => setModal("add")}
        actionLabel="Add User"
      />

      <div className="super-admin-grid">
        <Card>
          <div className="card-head">
            <div>
              <h2>User Login Management</h2>
              <p>Create users, reset passwords, edit roles and deactivate logins.</p>
            </div>
            <Badge>{filteredUsers.length} users</Badge>
          </div>

          <div className="toolbar report-toolbar">
            <Field label="Search Users">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, role, status..."
              />
            </Field>
            <div className="form-actions align-end">
              <Button variant="secondary" onClick={refreshAll}>Refresh</Button>
              <Button onClick={() => setModal("add")}>Add User</Button>
            </div>
          </div>

          <div className="table-wrap table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created/Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id || u.email}>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td>{roleText(u.role)}</td>
                    <td>
                      <Badge>{u.isActive === false ? "Inactive" : "Active"}</Badge>
                    </td>
                    <td>{u.updatedAt || u.createdAt || "-"}</td>
                    <td>
                      <div className="inline-actions">
                        <Button variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
                        <Button variant="secondary" onClick={() => openReset(u)}>Reset Password</Button>
                        <Button variant="ghost" onClick={() => deactivateUser(u)}>Deactivate</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredUsers.length && (
                  <tr>
                    <td colSpan="6">No user found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2>Super Admin Access</h2>
          <p className="muted">
            Admin can view all dashboards, all reports, all vehicles, all parts,
            all support requests, audit trail, notifications and settings.
          </p>

          <div className="super-admin-rules">
            {[
              "Admin can create new logins",
              "Admin can reset any user password",
              "Admin can change user roles",
              "Admin can deactivate a login without deleting historical records",
              "Fuel and Vehicle managers only see their own operational reports",
              "Store Keeper dashboard excludes fuel data",
              "All important actions should remain visible in audit trail",
            ].map((rule) => (
              <label className="rule-row" key={rule}>
                <span>{rule}</span>
                <input type="checkbox" checked readOnly />
              </label>
            ))}
          </div>
        </Card>
      </div>

      {modal === "add" && (
        <Modal title="Add User Login" onClose={() => setModal(null)} wide>
          <div className="form-grid">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input placeholder="name@vallepark.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Temporary Password">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Active Login">
              <Select value={form.isActive ? "yes" : "no"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "yes" })}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </Select>
            </Field>
          </div>

          <div className="form-actions">
            <Button onClick={saveNewUser}>Save User</Button>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {modal === "edit" && editForm && (
        <Modal title="Edit User Login" onClose={() => setModal(null)} wide>
          <div className="form-grid">
            <Field label="Name">
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Login Status">
              <Select value={editForm.isActive ? "yes" : "no"} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "yes" })}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </Select>
            </Field>
          </div>

          <div className="form-actions">
            <Button onClick={saveEdit}>Save Changes</Button>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {modal === "reset" && (
        <Modal title={`Reset Password - ${passwordForm.name || ""}`} onClose={() => setModal(null)}>
          <Card>
            <p><b>User:</b> {passwordForm.name}</p>
            <p><b>Email:</b> {passwordForm.email}</p>
          </Card>

          <Field label="New Password">
            <Input
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
            />
          </Field>

          <div className="form-actions">
            <Button onClick={savePassword}>Reset Password</Button>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
