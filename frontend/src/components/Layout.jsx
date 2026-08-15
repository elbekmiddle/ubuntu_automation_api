import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Boxes, ListTodo, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/templates", label: "templates", icon: Boxes },
  { to: "/jobs", label: "jobs", icon: ListTodo },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("screenctl:sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem("screenctl:sidebar-collapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarWidth = collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)";

  return (
    <div className="layout-shell" style={{ display: "flex", minHeight: "100vh" }}>
      {/* Mobile top bar */}
      <div
        className="layout-topbar mono"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "var(--topbar-h)",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
          &gt; screenctl<span className="blink">_</span>
        </div>
        <button
          className="tui-btn"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: 8,
            borderRadius: 2,
            display: "flex",
            cursor: "pointer",
          }}
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      <div className={`sidebar-backdrop ${mobileOpen ? "is-open" : ""}`} onClick={() => setMobileOpen(false)} />

      <aside
        className={`layout-sidebar ${mobileOpen ? "is-open" : ""}`}
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: collapsed ? "24px 10px" : "24px 18px",
          background: "var(--bg)",
        }}
      >
        <div style={{ marginBottom: 36, overflow: "hidden" }}>
          <div
            className="mono crt-glow"
            style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap" }}
          >
            &gt; {!collapsed && <>screenctl<span className="blink">_</span></>}
            {collapsed && <span className="blink">_</span>}
          </div>
          {!collapsed && <div className="eyebrow" style={{ marginTop: 4 }}>system automation</div>}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="mono"
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "9px 8px" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                fontSize: 13,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                background: isActive ? "rgba(95, 203, 219, 0.08)" : "transparent",
                border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                borderRadius: 2,
              })}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button
            className="tui-btn mono"
            onClick={() => setCollapsed((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: collapsed ? "center" : "flex-start",
              width: "100%",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "7px 8px",
              borderRadius: 2,
              fontSize: 11.5,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            {!collapsed && "collapse"}
          </button>

          {!collapsed ? (
            <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              local · v0.1.0
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            </div>
          )}
        </div>
      </aside>

      <main
        className="layout-main"
        style={{ flex: 1, padding: "36px 44px", minWidth: 0, background: "var(--bg)" }}
      >
        <div key={location.pathname} className="page-enter" style={{ maxWidth: 980, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
