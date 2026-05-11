import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useApp } from "../context/AppContext.jsx";

const roles = [
  {
    role: "admin",
    title: "ADMIN",
    subtitle: "Full System Admin",
    desc: "Manage users, fleet, inventory, assessments, reports and rules.",
    color: "pink",
    email: "admin@vallepark.com",
    pass: "password123",
  },
  {
    role: "mechanic",
    title: "MECHANIC",
    subtitle: "Garage Mechanic",
    desc: "Create assessments and record repairs, servicing and maintenance.",
    color: "green",
    email: "mechanic@vallepark.com",
    pass: "password123",
  },
  {
    role: "store",
    title: "STORE\nKEEPER",
    subtitle: "Spare Parts Keeper",
    desc: "Manage parts, barcode lookup, issuance and low-stock alerts.",
    color: "yellow",
    email: "store@vallepark.com",
    pass: "password123",
  },
];

function EyeIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2 2 0 0013.42 13.42" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 7 9 7a17.74 17.74 0 01-2.22 2.96M6.61 6.61A17.77 17.77 0 003 12s4 7 9 7a9.77 9.77 0 004.39-1.06" />
    </svg>
  );
}

export default function Login() {
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login } = useApp();
  const navigate = useNavigate();

  function choose(r) {
    setSelected(r);
    setEmail(r.email);
    setPassword(r.pass);
    setShowPassword(false);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (!selected) return;

    const res = await login(selected.role, email, password);
    if (res.ok) navigate("/dashboard");
    else setError(res.message);
  }

  return (
    <div className="login-page" style={{ minHeight: "100vh", background: "#f4efef" }}>
      <div
        className="login-banner"
        style={{
          minHeight: "340px",
          background: "linear-gradient(135deg, #22003a 0%, #170026 100%)",
          position: "relative",
          overflow: "hidden",
          paddingTop: "28px",
          paddingBottom: "120px",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "7px", background: "#ff3d72" }} />

        <div
          style={{
            position: "absolute",
            top: "95px",
            left: "-120px",
            width: "135%",
            height: "95px",
            background: "repeating-linear-gradient(-45deg,#2dfc72 0px,#2dfc72 90px,#7d42ff 90px,#7d42ff 180px)",
            transform: "rotate(-4deg)",
            opacity: 0.95,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-120px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(255,61,114,0.24) 0%, transparent 70%)",
          }}
        />

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 5, textAlign: "center" }}>
          <div style={{ marginBottom: "50px" }}>
            <Logo />
          </div>

          <h1
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              fontWeight: "900",
              letterSpacing: "-2px",
              lineHeight: 1,
              textShadow: "0 8px 20px rgba(0,0,0,0.35)",
            }}
          >
            Garage & Spare Parts
          </h1>
        </div>
      </div>

      <main
        className="login-main"
        style={{
          marginTop: "-90px",
          position: "relative",
          zIndex: 10,
          paddingBottom: "60px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        <section
          className="login-card"
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            background: "rgba(255,255,255,0.93)",
            backdropFilter: "blur(14px)",
            borderRadius: "32px",
            padding: "42px 38px 36px",
            boxShadow: "0 28px 70px rgba(43,0,72,0.16)",
            border: "1px solid rgba(255,255,255,0.75)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-60px",
              left: "-40px",
              width: "180px",
              height: "180px",
              background: "radial-gradient(circle, rgba(45,252,114,0.12) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: "-80px",
              right: "-40px",
              width: "240px",
              height: "240px",
              background: "radial-gradient(circle, rgba(125,66,255,0.10) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />

          <div style={{ position: "relative", zIndex: 5 }}>
            <p
              style={{
                color: "#ff3d72",
                fontWeight: "800",
                letterSpacing: "4px",
                fontSize: "0.82rem",
                marginBottom: "12px",
              }}
            >
              START HERE
            </p>

            {!selected ? (
              <>
                <h2
                  style={{
                    fontSize: "4.2rem",
                    margin: 0,
                    lineHeight: 1,
                    color: "#2b0046",
                    fontWeight: "900",
                    letterSpacing: "-2px",
                  }}
                >
                  Choose Access
                </h2>

                <p style={{ marginTop: "14px", color: "#706784", fontSize: "1.08rem", fontWeight: "500" }}>
                  Pick your job role. The system will show only what you need.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "22px",
                    marginTop: "36px",
                  }}
                >
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => choose(r)}
                      style={{
                        background: "#ffffff",
                        borderRadius: "24px",
                        padding: "32px 28px",
                        minHeight: "240px",
                        textAlign: "left",
                        border:
                          r.color === "pink"
                            ? "2px solid #ff3d72"
                            : r.color === "green"
                            ? "2px solid #2dfc72"
                            : "2px solid #ffe600",
                        borderTop:
                          r.color === "pink"
                            ? "7px solid #ff3d72"
                            : r.color === "green"
                            ? "7px solid #2dfc72"
                            : "7px solid #ffe600",
                        boxShadow: "0 10px 0 rgba(43, 0, 72, 0.12)",
                        cursor: "pointer",
                        transition: "0.25s ease",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-65px",
                          right: "-45px",
                          width: "150px",
                          height: "150px",
                          borderRadius: "50%",
                          background: "rgba(45, 252, 114, 0.08)",
                          pointerEvents: "none",
                        }}
                      />

                      <h3
                        style={{
                          margin: 0,
                          fontSize: r.role === "store" ? "2.05rem" : "2rem",
                          lineHeight: "1.08",
                          color: "#2b0046",
                          fontWeight: "900",
                          fontStyle: "italic",
                          marginBottom: "18px",
                          textTransform: "uppercase",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {r.title}
                      </h3>

                      <b style={{ display: "block", marginBottom: "14px", color: "#080014", fontSize: "1rem", fontWeight: "900" }}>
                        {r.subtitle}
                      </b>

                      <span style={{ display: "block", color: "#706784", lineHeight: 1.55, fontSize: "1rem", maxWidth: "240px" }}>
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff3d72",
                    fontWeight: "700",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  ← Back to roles
                </button>

                <h2 style={{ margin: 0, color: "#2b0046", fontSize: "3rem", fontWeight: "900" }}>
                  {selected.title} Login
                </h2>

                <p style={{ color: "#706784", marginTop: "-5px" }}>{selected.subtitle}</p>

                {error && (
                  <div
                    style={{
                      background: "#ffe4ea",
                      color: "#d8004d",
                      padding: "14px",
                      borderRadius: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {error}
                  </div>
                )}

                <label style={{ display: "flex", flexDirection: "column", gap: "8px", color: "#2b0046", fontWeight: "700" }}>
                  Email
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      padding: "15px",
                      borderRadius: "14px",
                      border: "2px solid #ddd",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "8px", color: "#2b0046", fontWeight: "700" }}>
                  Password
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{
                        width: "100%",
                        padding: "15px",
                        paddingRight: "55px",
                        borderRadius: "14px",
                        border: "2px solid #ddd",
                        fontSize: "1rem",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fff",
                        color: "#2b0046",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#706784",
                      }}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </label>

                <button
                  style={{
                    background: "#2b0046",
                    color: "#fff",
                    border: "none",
                    borderRadius: "16px",
                    padding: "16px",
                    fontSize: "1rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  Login
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}