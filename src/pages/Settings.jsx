import { useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/UI.jsx";
import { users } from "../data/seedData.js";
export default function Settings() {
  const [modal, setModal] = useState(false);
  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Manage users, roles and simple system rules."
        action={() => setModal(true)}
        actionLabel="Add User"
      />
      <div className="settings-grid">
        <Card>
          <h2>Users</h2>
          {users.map((u) => (
            <div className="user-row" key={u.id}>
              <b>{u.name}</b>
              <span>{u.label}</span>
            </div>
          ))}
        </Card>
        <Card>
          <h2>Rules</h2>
          {[
            "Prevent duplicate vehicle plates",
            "Block issuance beyond stock",
            "Require assessment before process",
            "Enable audit trail",
            "Require reason when reopening assessment",
          ].map((rule) => (
            <label className="rule-row" key={rule}>
              <span>{rule}</span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </Card>
      </div>
      {modal && (
        <Modal title="Add User" onClose={() => setModal(false)}>
          <div className="form-grid">
            <Field label="Name">
              <Input />
            </Field>
            <Field label="Email">
              <Input />
            </Field>
            <Field label="Role">
              <Select>
                <option>Admin</option>
                <option>Mechanic</option>
                <option>Store Keeper</option>
              </Select>
            </Field>
            <Field label="Suggested Permission Template">
              <Select>
                <option>Full Access</option>
                <option>Mechanic: vehicles, assessments, garage ops</option>
                <option>Store: vehicles, assessments, inventory</option>
              </Select>
            </Field>
            <Button onClick={() => setModal(false)}>Save User</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
