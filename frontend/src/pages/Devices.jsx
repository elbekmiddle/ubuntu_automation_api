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

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([api.devices.list(), api.devices.activeCount()]);
      setDevices(d);
      setActiveCount(a.active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow={`${activeCount} active in last 5m`}
        title="devices"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>refresh</Button>}
      />

      <SectionLabel index="—">tracked clients</SectionLabel>
      <Panel>
        {devices.length === 0 && <EmptyState>no devices tracked yet</EmptyState>}
        {devices.map((d, i) => (
          <div
            key={d.id}
            className="mono"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <span>{d.ip}</span>
              <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
                {d.user_agent ?? "—"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
              <span style={{ color: "var(--text-muted)" }}>{d.request_count} req</span>
              <span style={{ color: "var(--text-secondary)" }}>{timeAgo(d.last_seen)}</span>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
