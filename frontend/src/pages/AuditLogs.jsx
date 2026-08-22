import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function methodColor(method) {
  if (method === "POST") return "var(--success)";
  if (method === "DELETE") return "var(--danger)";
  if (method === "PUT" || method === "PATCH") return "var(--warning)";
  return "var(--text-secondary)";
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await api.auditLogs.list(50));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow={`${logs.length} recent entries · this device`}
        title="audit log"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>refresh</Button>}
      />

      <SectionLabel index="—">activity</SectionLabel>
      <Panel>
        {logs.length === 0 && <EmptyState>no activity recorded yet</EmptyState>}
        {logs.map((l, i) => (
          <div
            key={l.id}
            className="mono"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <span style={{ color: methodColor(l.method), minWidth: 46 }}>{l.method}</span>
              <span>{l.action}</span>
              <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {l.ip}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              <span style={{ color: l.status_code >= 400 ? "var(--danger)" : "var(--text-muted)" }}>{l.status_code}</span>
              <span style={{ color: "var(--text-secondary)" }}>{timeAgo(l.created_at)}</span>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
