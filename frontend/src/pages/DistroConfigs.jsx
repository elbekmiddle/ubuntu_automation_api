import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, Download, FileCode, Check, X, Archive } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";

const PLATFORM_LABEL = {
  linux: "Linux",
  darwin: "macOS",
  win32: "Windows",
};

function fmtBytes(n) {
  if (n == null) return "—";
  const units = ["B", "KB", "MB"];
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

export default function DistroConfigs() {
  const [data, setData] = useState({ platform: null, hostname: "", configs: [] });
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [content, setContent] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, b] = await Promise.all([api.distroConfigs.list(), api.distroConfigs.backups()]);
      setData(d);
      setBackups(b);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const view = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setContent("");
    try {
      const res = await api.distroConfigs.read(id);
      setContent(res.content);
    } catch (e) {
      setContent(`# error: ${e.message}`);
    }
  };

  const backup = async (id) => {
    setBusyId(id);
    try {
      await api.distroConfigs.backup(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={data.platform ? `${PLATFORM_LABEL[data.platform] ?? data.platform} · ${data.hostname}` : "detecting…"}
        title="distro configs"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>refresh</Button>}
      />

      {error && (
        <Panel className="mono" style={{ padding: 14, marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          error: {error}
        </Panel>
      )}

      <SectionLabel index="01">known config files</SectionLabel>
      <Panel style={{ marginBottom: 36 }}>
        {data.configs.length === 0 && <EmptyState>no configs detected</EmptyState>}
        {data.configs.map((c, i) => (
          <div key={c.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
            <div
              className="mono"
              onClick={() => c.exists && view(c.id)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 20px", fontSize: 13, cursor: c.exists ? "pointer" : "default",
                opacity: c.exists ? 1 : 0.45,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {c.exists ? <Check size={13} color="var(--success)" /> : <X size={13} color="var(--text-muted)" />}
                <span>{c.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.path}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                {c.exists && <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{fmtBytes(c.size)}</span>}
                {c.exists && (
                  <button
                    onClick={(e) => { e.stopPropagation(); backup(c.id); }}
                    disabled={busyId === c.id}
                    className="tui-btn"
                    title="backup this file"
                    style={{
                      display: "flex", alignItems: "center", gap: 5, background: "transparent",
                      border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 2,
                      padding: "4px 8px", fontSize: 11, cursor: "pointer", opacity: busyId === c.id ? 0.5 : 1,
                    }}
                  >
                    <Download size={11} /> backup
                  </button>
                )}
              </div>
            </div>
            {openId === c.id && (
              <div
                className="mono"
                style={{
                  background: "#0C0C0B", border: "1px solid #26262B", margin: "0 20px 14px",
                  padding: 14, fontSize: 12, lineHeight: 1.6, maxHeight: 260, overflowY: "auto",
                  whiteSpace: "pre-wrap", color: "#D4D4D4",
                }}
              >
                {content || "…"}
              </div>
            )}
          </div>
        ))}
      </Panel>

      <SectionLabel index="02">backups (single folder)</SectionLabel>
      <Panel>
        {backups.length === 0 && <EmptyState>no backups yet — click "backup" on a config above</EmptyState>}
        {backups.map((b, i) => (
          <div
            key={b.fileName}
            className="mono"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Archive size={13} color="var(--text-muted)" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.fileName}</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexShrink: 0, color: "var(--text-muted)" }}>
              <span>{fmtBytes(b.size)}</span>
              <span>{timeAgo(b.createdAt)}</span>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
