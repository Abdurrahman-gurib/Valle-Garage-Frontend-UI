import React from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Card({ children, className = "", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`card ${onClick ? "card-click" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
export function PageHeader({ title, subtitle, action, actionLabel }) {
  return (
    <div className="page-header">
      <div>
        <p className="kicker">VALLÉ INTERNAL SYSTEM</p>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action && <Button onClick={action}>{actionLabel}</Button>}
    </div>
  );
}
export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Input(props) {
  return <input className="input" {...props} />;
}
export function Select(props) {
  return <select className="input" {...props} />;
}
export function TextArea(props) {
  return <textarea className="input textarea" {...props} />;
}
export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop">
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function Table({ headers, children }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
