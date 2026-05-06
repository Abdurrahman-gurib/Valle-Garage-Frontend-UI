import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

export default function SearchBox() {
  const { searchIndex } = useApp();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const matches = q.trim()
    ? searchIndex
        .filter(
          (x) =>
            x.keywords.toLowerCase().includes(q.toLowerCase()) ||
            x.label.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <div className="search-box">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search vehicle, part, ticket..."
      />
      {matches.length > 0 && (
        <div className="search-suggestions">
          {matches.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                navigate(m.path);
                setQ("");
              }}
            >
              <b>{m.type}</b>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
