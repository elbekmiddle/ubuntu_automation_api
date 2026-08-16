import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Cpu, MemoryStick, HardDrive, Container, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, StatusBadge, EmptyState, Button, AsciiBar } from "../components/ui";

function fmtBytes(n) {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

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

function Spec({ icon: Icon, label, value, sub, pct, className }) {
  return (
    <Panel className={className} style={{ padding: 20, flex: 1, minWidth: 190 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={14} color="var(--text-secondary)" />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="mono crt-glow" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: "var(--text)" }}>
        {value}
      </div>
      {sub && <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>{sub}</div>}
      {pct != null && (
        <div style={{ marginTop: 12 }}>
          <AsciiBar pct={pct} width={16} />
        </div>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  const [system, setSystem] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sys, jb] = await Promise.all([api.system.overview(), api.jobs.list()]);
      setSystem(sys);
      setJobs(jb);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const cpu = system?.cpu, mem = system?.memory, disk = system?.disk?.[0], os = system?.os;

  return (
    <div>
      <PageHeader
        eyebrow="overview"
        title="dashboard"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>refresh</Button>}
      />

      {error && (
        <Panel style={{ padding: 14, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
          error: {error}
        </Panel>
      )}

      <SectionLabel index="01">hardware</SectionLabel>
      <div className="spec-grid" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
        <Spec className="fade-in-up stagger-1" icon={Cpu} label="cpu" value={cpu ? `${cpu.currentLoad.toFixed(0)}%` : "—"}
          sub={cpu ? `${cpu.cores} cores` : ""} pct={cpu?.currentLoad} />
        <Spec className="fade-in-up stagger-2" icon={MemoryStick} label="memory" value={mem ? `${mem.usedPercent.toFixed(0)}%` : "—"}
          sub={mem ? `${fmtBytes(mem.used)} / ${fmtBytes(mem.total)}` : ""} pct={mem?.usedPercent} />
        <Spec className="fade-in-up stagger-3" icon={HardDrive} label="disk" value={disk ? `${disk.usePercent.toFixed(0)}%` : "—"}
          sub={disk ? `${fmtBytes(disk.used)} / ${fmtBytes(disk.size)}` : ""} pct={disk?.usePercent} />
        <Spec className="fade-in-up stagger-4" icon={Container} label="docker" value={system?.docker?.containers?.length ?? 0}
          sub={system?.docker?.running ? "● running" : "○ stopped"} />
      </div>

      {os && (
        <div className="fade-in-up stagger-5">
          <SectionLabel index="02">system</SectionLabel>
          <Panel style={{ padding: "16px 20px", marginBottom: 36, display: "flex", gap: 32 }} className="mono">
            <div><span style={{ color: "var(--text-muted)" }}>distro </span>{os.distro} {os.release}</div>
            <div><span style={{ color: "var(--text-muted)" }}>arch </span>{os.arch}</div>
            <div><span style={{ color: "var(--text-muted)" }}>kernel </span>{os.kernel}</div>
          </Panel>
        </div>
      )}

      {system?.docker?.containers?.length > 0 && (
        <div className="fade-in-up stagger-6">
          <SectionLabel index="03">running containers</SectionLabel>
          <Panel style={{ marginBottom: 36 }}>
            {system.docker.containers.map((c, i) => (
              <div key={c.ID} className="mono" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13,
              }}>
                <span style={{ color: "var(--success)" }}>●</span>
                <span style={{ minWidth: 160 }}>{c.Names}</span>
                <span style={{ color: "var(--text-secondary)" }}>{c.State}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{c.Ports}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      <div className="fade-in-up stagger-6">
      <SectionLabel index="04">recent jobs</SectionLabel>
      <Panel>
        {jobs.length === 0 && <EmptyState>no jobs yet</EmptyState>}
        {jobs.slice(0, 6).map((j, i) => (
          <Link
            key={j.id}
            to={`/jobs/${j.id}`}
            className="mono"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>{j.action}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>#{j.id.slice(0, 8)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(j.created_at)}</span>
              <StatusBadge status={j.status} />
            </div>
          </Link>
        ))}
      </Panel>
      </div>
    </div>
  );
}
