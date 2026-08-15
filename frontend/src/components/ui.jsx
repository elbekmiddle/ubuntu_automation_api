import React from "react";
import { CheckCircle2, XCircle, Circle, Loader2 } from "lucide-react";

export const STATUS = {
  pending: { color: "var(--text-muted)", icon: Circle, label: "pending" },
  running: { color: "var(--info)", icon: Loader2, label: "running" },
  success: { color: "var(--success)", icon: CheckCircle2, label: "success" },
  failed: { color: "var(--danger)", icon: XCircle, label: "failed" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending;
  const Icon = s.icon;
  return (
    <span
      className="mono"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: s.color }}
    >
      <Icon size={13} className={status === "running" ? "spin" : ""} />
      {s.label}
    </span>
  );
}

export function AsciiBar({ pct = 0, width = 10 }) {
  const filled = Math.round((Math.min(pct, 100) / 100) * width);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(width - filled, 0));
  const color = pct > 85 ? "var(--danger)" : pct > 65 ? "var(--warning)" : "var(--accent)";
  return (
    <span className="mono ascii-bar" style={{ color }}>
      {bar}
    </span>
  );
}

export function SectionLabel({ index, children }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
      <span className="mono" style={{ color: "var(--border-strong)", fontSize: 12 }}>
        {index ? `[${index}]` : "─"}
      </span>
      <span className="eyebrow" style={{ color: "var(--text-secondary)" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

export const Panel = React.forwardRef(function Panel({ children, style, className = "", ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 2,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

export function Button({ children, variant = "default", icon: Icon, iconSpin = false, className = "", ...rest }) {
  const variants = {
    default: { background: "var(--surface-raised)", color: "var(--text)", border: "1px solid var(--border)" },
    accent: { background: "var(--accent)", color: "var(--accent-ink)", border: "1px solid var(--accent)" },
    ghost: { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" },
    danger: { background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)" },
  };
  return (
    <button
      {...rest}
      className={`mono tui-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12.5,
        fontWeight: 500,
        padding: "8px 14px",
        borderRadius: 2,
        cursor: rest.disabled ? "default" : "pointer",
        opacity: rest.disabled ? 0.5 : 1,
        transition: "background 0.12s ease, border-color 0.12s ease, transform 0.12s ease",
        ...variants[variant],
        ...rest.style,
      }}
    >
      {Icon && <Icon size={13} className={iconSpin ? "spin" : ""} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      {children}
      {hint && (
        <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

export function TextInput({ className = "", style, ...rest }) {
  return (
    <input
      {...rest}
      className={`mono ${className}`}
      style={{
        width: "100%",
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        padding: "10px 12px",
        fontSize: 13,
        borderRadius: 2,
        outline: "none",
        ...style,
      }}
    />
  );
}

export function TextArea({ className = "", style, ...rest }) {
  return (
    <textarea
      {...rest}
      className={`mono ${className}`}
      spellCheck={false}
      style={{
        width: "100%",
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        padding: "10px 12px",
        fontSize: 13,
        lineHeight: 1.6,
        borderRadius: 2,
        outline: "none",
        resize: "vertical",
        ...style,
      }}
    />
  );
}

export function IconButton({ icon: Icon, className = "", style, ...rest }) {
  return (
    <button
      {...rest}
      className={`tui-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        borderRadius: 2,
        cursor: rest.disabled ? "default" : "pointer",
        opacity: rest.disabled ? 0.5 : 1,
        flexShrink: 0,
        ...style,
      }}
    >
      {Icon && <Icon size={14} />}
    </button>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="mono" style={{ padding: "44px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <div
      className="page-header-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: "1px solid var(--border)",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8, color: "var(--text-secondary)" }}>{eyebrow}</div>}
        <h1
          className="mono crt-glow"
          style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--text)", overflowWrap: "anywhere" }}
        >
          <span style={{ color: "var(--accent)" }}>#</span> {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
