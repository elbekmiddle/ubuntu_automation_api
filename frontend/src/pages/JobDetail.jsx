import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, StatusBadge, EmptyState } from "../components/ui";

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  const load = useCallback(async () => {
    const [j, l] = await Promise.all([api.jobs.get(id), api.jobs.logs(id)]);
    setJob(j);
    setLogs(l);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 1200);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);

  if (!job) return null;

  return (
    <div>
      <Link to="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> Jobs
      </Link>

      <PageHeader eyebrow={`#${job.id.slice(0, 8)}`} title={job.action} action={<StatusBadge status={job.status} />} />

      <SectionLabel index="01">Details</SectionLabel>
      <Panel style={{ padding: "18px 22px", marginBottom: 36, display: "flex", gap: 40 }}>
        <DetailField label="Started" value={job.started_at ? new Date(job.started_at).toLocaleTimeString() : "—"} />
        <DetailField label="Finished" value={job.finished_at ? new Date(job.finished_at).toLocaleTimeString() : "—"} />
        <DetailField label="Exit code" value={job.exit_code ?? "—"} />
        <DetailField label="PID" value={job.pid ?? "—"} />
      </Panel>

      <SectionLabel index="02">Output</SectionLabel>
      <Panel style={{ background: "#0C0C0B", borderColor: "#26262B", padding: 18, maxHeight: 420, overflowY: "auto" }}>
        {logs.length === 0 && <EmptyState><span style={{ color: "var(--text-muted)" }}>Waiting for output…</span></EmptyState>}
        <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.stream === "stderr" ? "#F87171" : "#D4D4D4" }}>
              {l.chunk}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </Panel>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13 }}>{value}</div>
    </div>
  );
}
