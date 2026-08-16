import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, StatusBadge, EmptyState, Button } from "../components/ui";

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

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await api.jobs.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow={`${jobs.length} total`}
        title="Jobs"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>}
      />

      <SectionLabel index="—">History</SectionLabel>
      <Panel>
        {jobs.length === 0 && <EmptyState>No jobs yet</EmptyState>}
        {jobs.map((j, i) => (
          <Link
            key={j.id}
            to={`/jobs/${j.id}`}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "15px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13.5 }}>{j.action}</span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>#{j.id.slice(0, 8)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(j.created_at)}</span>
              <StatusBadge status={j.status} />
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </Panel>
    </div>
  );
}
