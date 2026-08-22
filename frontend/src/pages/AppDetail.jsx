import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, RefreshCw, Trash2, Cpu, MemoryStick, HardDrive, Clock, Server, Shield } from "lucide-react";
import { api } from "../lib/api";
import { jitteredInterval } from "../lib/jitter";
import { PageHeader, SectionLabel, Panel, StatusBadge, Button, AsciiBar } from "../components/ui";
import DeviceTerminal from "../components/Terminal";

function fmtBytes(n) {
    if (n == null) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(1)} ${units[i]}`;
}

function fmtUptime(seconds) {
    if (seconds == null) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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

function MetricPanel({ icon: Icon, label, value, sub, pct }) {
    return (
        <Panel style={{ padding: 18, flex: "1 1 190px", minWidth: 180, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icon size={14} color="var(--text-secondary)" />
                <span className="eyebrow">{label}</span>
            </div>
            <div className="mono crt-glow" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: "var(--text)" }}>
                {value}
            </div>
            {sub && (
                <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                    {sub}
                </div>
            )}
            {pct != null && (
                <div style={{ marginTop: 12 }}>
                    <AsciiBar pct={pct} width={22} />
                </div>
            )}
        </Panel>
    );
}

export default function AppDetail() {
    const { id } = useParams();
    const [app, setApp] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const pollMs = React.useRef(jitteredInterval(4000, 300)).current;

    const load = useCallback(async () => {
        setError(null);
        try {
            setApp(await api.apps.get(id));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        load();
        const interval = setInterval(load, pollMs);
        return () => clearInterval(interval);
    }, [load, pollMs]);

    const remove = async () => {
        if (!window.confirm("Disconnect this device? The agent will stop being authorized.")) return;
        await api.apps.remove(id);
        window.location.href = "/apps";
    };

    if (!app && !error) return null;

    if (error && !app) {
        return (
            <Panel style={{ padding: 14, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
                error: {error}
            </Panel>
        );
    }

    const metrics = app.last_metrics ?? {};
    const isOnline = app.status === "online";
    const canConnect = isOnline && app.permission === "read_write";

    return (
        <div>
            <Link
                to="/apps"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}
            >
                <ChevronLeft size={14} /> Devices
            </Link>

            <PageHeader
                eyebrow={app.hostname ? `${app.hostname} · ${app.os_platform ?? ""} ${app.os_release ?? ""}`.trim() : `#${app.id.slice(0, 8)}`}
                title={app.name}
                action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusBadge status={isOnline ? "online" : "offline"} />
                        <Button icon={RefreshCw} onClick={load} disabled={loading}>
                            refresh
                        </Button>
                        <Button variant="ghost" icon={Trash2} onClick={remove} style={{ color: "var(--danger)" }}>
                            disconnect
                        </Button>
                    </div>
                }
            />

            <SectionLabel index="01">overview</SectionLabel>
            <Panel style={{ padding: "18px 22px", marginBottom: 32, display: "flex", flexWrap: "wrap", gap: 32 }}>
                <DetailField icon={Server} label="Hostname" value={app.hostname ?? "—"} />
                <DetailField icon={Server} label="OS" value={`${app.os_platform ?? "—"} ${app.os_release ?? ""}`.trim()} />
                <DetailField icon={Shield} label="Permission" value={app.permission} />
                <DetailField icon={Clock} label="Last seen" value={timeAgo(app.last_seen_at)} />
                <DetailField icon={Clock} label="Connected since" value={new Date(app.created_at).toLocaleString()} />
                <DetailField icon={Server} label="Machine ID" value={app.machine_id ? app.machine_id.slice(0, 16) + "…" : "—"} />
            </Panel>

            <SectionLabel index="02">system</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
                <MetricPanel icon={Cpu} label="CPU" value={metrics.cpu != null ? `${metrics.cpu}%` : "—"} pct={metrics.cpu} />
                <MetricPanel
                    icon={MemoryStick}
                    label="Memory"
                    value={metrics.memory ? `${metrics.memory.usedPercent}%` : "—"}
                    sub={metrics.memory ? `${fmtBytes(metrics.memory.used)} / ${fmtBytes(metrics.memory.total)}` : null}
                    pct={metrics.memory?.usedPercent}
                />
                <MetricPanel
                    icon={HardDrive}
                    label="Disk"
                    value={metrics.disk ? `${metrics.disk.usedPercent}%` : "—"}
                    sub={metrics.disk ? `${fmtBytes(metrics.disk.used)} / ${fmtBytes(metrics.disk.total)}` : null}
                    pct={metrics.disk?.usedPercent}
                />
                <MetricPanel
                    icon={Clock}
                    label="Uptime"
                    value={fmtUptime(metrics.uptime)}
                    sub={metrics.loadavg ? `load ${metrics.loadavg.map((n) => n.toFixed(2)).join(" · ")}` : null}
                />
            </div>

            <SectionLabel index="03">terminal</SectionLabel>
            <div style={{ marginBottom: 32 }}>
                <DeviceTerminal appId={app.id} canConnect={canConnect} />
            </div>
        </div>
    );
}

function DetailField({ icon: Icon, label, value }) {
    return (
        <div style={{ minWidth: 140 }}>
            <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={11} /> {label}
            </div>
            <div className="mono" style={{ fontSize: 13 }}>
                {value}
            </div>
        </div>
    );
}
