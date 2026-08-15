import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Copy, Check, ArrowDownToLine } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, StatusBadge, EmptyState, Button } from "../components/ui";

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);
  const logsBoxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [j, l] = await Promise.all([api.jobs.get(id), api.jobs.logs(id)]);
      setJob(j);
      setLogs(l);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 1200);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const box = logsBoxRef.current;
    if (!box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 24;
    setAutoScroll(atBottom);
  };

  const copyLogs = async () => {
    const text = logs.map((l) => l.chunk).join("");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  if (error && !job) {
    return (
      <div>
        <Link to="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
          <ChevronLeft size={14} /> Jobs
        </Link>
        <Panel style={{ padding: 20, color: "var(--danger)", fontSize: 13 }} className="mono">
          error: {error}
        </Panel>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div>
      <Link to="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> Jobs
      </Link>

      <PageHeader eyebrow={`#${job.id.slice(0, 8)}`} title={job.action} action={<StatusBadge status={job.status} />} />

      <SectionLabel index="01">Details</SectionLabel>
      <Panel className="details-row" style={{ padding: "18px 22px", marginBottom: 36, display: "flex", gap: 40, flexWrap: "wrap" }}>
        <DetailField label="Started" value={job.started_at ? new Date(job.started_at).toLocaleTimeString() : "—"} />
        <DetailField label="Finished" value={job.finished_at ? new Date(job.finished_at).toLocaleTimeString() : "—"} />
        <DetailField label="Exit code" value={job.exit_code ?? "—"} />
        <DetailField label="PID" value={job.pid ?? "—"} />
      </Panel>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionLabel index="02">Output</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Button
            variant="ghost"
            icon={copied ? Check : Copy}
            onClick={copyLogs}
            disabled={logs.length === 0}
            style={{ fontSize: 11.5, padding: "6px 10px" }}
          >
            {copied ? "copied" : "copy"}
          </Button>
          <Button
            variant={autoScroll ? "accent" : "ghost"}
            icon={ArrowDownToLine}
            onClick={() => setAutoScroll(true)}
            style={{ fontSize: 11.5, padding: "6px 10px" }}
          >
            autoscroll
          </Button>
        </div>
      </div>

      <Panel
        ref={logsBoxRef}
        onScroll={handleScroll}
        style={{ background: "#0B0F13", borderColor: "var(--border)", padding: 0, maxHeight: 440, overflowY: "auto" }}
      >
        {logs.length === 0 && (
          <EmptyState><span style={{ color: "var(--text-muted)" }}>Waiting for output…</span></EmptyState>
        )}
        <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7, padding: logs.length ? "10px 0" : 0 }}>
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                padding: "1px 16px",
                color: l.stream === "stderr" ? "#F0847E" : "#C9D4D7",
              }}
            >
              <span style={{ color: "var(--text-muted)", flexShrink: 0, userSelect: "none" }}>
                {String(i + 1).padStart(3, "0")}
              </span>
              {l.created_at && (
                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{fmtTime(l.created_at)}</span>
              )}
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10.5,
                  padding: "0 5px",
                  borderRadius: 2,
                  border: `1px solid ${l.stream === "stderr" ? "var(--danger)" : "var(--border)"}`,
                  color: l.stream === "stderr" ? "var(--danger)" : "var(--text-muted)",
                  alignSelf: "flex-start",
                  marginTop: 2,
                }}
              >
                {l.stream === "stderr" ? "err" : "out"}
              </span>
              <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{l.chunk}</span>
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
