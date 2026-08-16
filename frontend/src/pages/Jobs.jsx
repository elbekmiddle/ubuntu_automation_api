import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { api } from "../lib/api";
import { jitteredInterval } from "../lib/jitter";
import { PageHeader, SectionLabel, Panel, StatusBadge, EmptyState, Button } from "../components/ui";

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await api.jobs.list(p, PAGE_SIZE);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, []);

  const pollMs = useRef(jitteredInterval(5000)).current; // ~5s, klientlar orasida sal siljigan

  useEffect(() => {
    load(page);
    const id = setInterval(() => load(page), pollMs);
    return () => clearInterval(id);
  }, [page, load, pollMs]);

  const { data: jobs, total, totalPages } = result;

  return (
    <div>
      <PageHeader
        eyebrow={`${total} total`}
        title="jobs"
        action={<Button icon={RefreshCw} onClick={() => load(page)} disabled={loading}>refresh</Button>}
      />

      <SectionLabel index="—">history</SectionLabel>
      <Panel style={{ marginBottom: 16 }}>
        {jobs.length === 0 && <EmptyState>no jobs yet</EmptyState>}
        {jobs.map((j, i) => (
          <Link
            key={j.id}
            to={`/jobs/${j.id}`}
            className="mono job-row"
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

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <PageBtn onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft size={13} /></PageBtn>
          <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></PageBtn>

          <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", padding: "0 10px" }}>
            {page} / {totalPages}
          </span>

          <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></PageBtn>
          <PageBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={13} /></PageBtn>
        </div>
      )}
    </div>
  );
}

function PageBtn({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tui-btn"
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--border)", color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        borderRadius: 2, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "border-color 0.15s ease, color 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
