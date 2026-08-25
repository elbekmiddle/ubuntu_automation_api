import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Boxes, ListTodo, PanelLeftClose, PanelLeftOpen, Clock, MonitorSmartphone, ScrollText, Globe, Activity, LogIn, LogOut, User, Radio } from "lucide-react";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/templates", label: "templates", icon: Boxes },
  { to: "/templates/public", label: "community", icon: Globe },
  { to: "/jobs", label: "jobs", icon: ListTodo },
  { to: "/schedules", label: "schedules", icon: Clock },
  { to: "/apps", label: "devices", icon: MonitorSmartphone },
  { to: "/fleet", label: "fleet", icon: Radio },
  { to: "/devices", label: "traffic log", icon: Activity },
  { to: "/audit-logs", label: "audit log", icon: ScrollText },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 860;
  });

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="layout-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="layout-sidebar sidebar-collapsible"
        style={{
          width: collapsed ? 60 : 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: collapsed ? "24px 10px" : "24px 18px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          alignSelf: "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", marginBottom: 36 }}>
          {!collapsed && (
            <div>
              <div className="mono crt-glow" style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
                &gt; screenctl<span className="blink">_</span>
              </div>
              <div className="eyebrow" style={{ marginTop: 4 }}>system automation</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="tui-btn"
            style={{
              background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)",
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", borderRadius: 2, flexShrink: 0,
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className="mono tui-btn nav-link"
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                padding: collapsed ? "9px 0" : "8px 10px",
                fontSize: 13,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                background: isActive ? "rgba(95, 211, 224, 0.08)" : "transparent",
                border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                borderRadius: 2,
                transition: "border-color 0.2s ease, background 0.2s ease, color 0.2s ease",
              })}
            >
              <Icon size={14} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          {!loading && (
            <div style={{ marginBottom: 12 }}>
              {user ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {!collapsed && (
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <User size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                    </div>
                  )}
                  <button
                    onClick={() => logout()}
                    title="Logout"
                    className="mono tui-btn"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8,
                      background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)",
                      padding: collapsed ? "7px 0" : "7px 10px", fontSize: 11.5, cursor: "pointer", borderRadius: 2, width: "100%",
                    }}
                  >
                    <LogOut size={13} />
                    {!collapsed && "logout"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  title="Login"
                  className="mono tui-btn"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8,
                    background: "transparent", border: "1px solid var(--border-strong)", color: "var(--accent)",
                    padding: collapsed ? "7px 0" : "7px 10px", fontSize: 11.5, cursor: "pointer", borderRadius: 2, width: "100%",
                  }}
                >
                  <LogIn size={13} />
                  {!collapsed && "login"}
                </button>
              )}
            </div>
          )}
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, justifyContent: collapsed ? "center" : "flex-start" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block", flexShrink: 0 }} />
            {!collapsed && "local · v0.1.0"}
          </div>
        </div>
      </aside>

      <main className="layout-main" style={{ flex: 1, padding: "36px 44px", minWidth: 0, background: "var(--bg)", transition: "background 0.3s ease" }}>
        <div key={location.pathname} className="route-transition" style={{ maxWidth: 980, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
