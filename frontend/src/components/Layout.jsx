import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Boxes, ListTodo } from "lucide-react";

const NAV = [
  { to: "/", label: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/templates", label: "templates", icon: Boxes },
  { to: "/jobs", label: "jobs", icon: ListTodo },
];

export default function Layout() {
  return (
    <div className="layout-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="layout-sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 18px",
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div className="mono crt-glow" style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
            &gt; screenctl<span className="blink">_</span>
          </div>
          <div className="eyebrow" style={{ marginTop: 4 }}>system automation</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="mono"
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                fontSize: 13,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                background: isActive ? "rgba(79, 209, 232, 0.08)" : "transparent",
                border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                borderRadius: 2,
              })}
            >
              <Icon size={14} />
              {isActiveLabel(label)}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            local · v0.1.0
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "36px 44px", minWidth: 0, background: "var(--bg)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function isActiveLabel(label) {
  return label;
}
