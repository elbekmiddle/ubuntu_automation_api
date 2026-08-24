import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import {
    ChevronLeft,
    RefreshCw,
    Trash2,
    Cpu,
    MemoryStick,
    HardDrive,
    ArrowDownUp,
    Container,
    Clock,
    Server,
    Shield,
    Wifi,
    Search,
    Settings2,
    CheckCircle2,
    XCircle,
    Circle,
    Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { jitteredInterval } from "../lib/jitter";
import { getProcessMeta } from "../lib/processIcons";
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

function FilterInput({ value, onChange, placeholder }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
                <Search size={12.5} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                    className="mono"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 2,
                        padding: "7px 10px 7px 30px",
                        fontSize: 12,
                        color: "var(--text)",
                        outline: "none",
                    }}
                />
            </div>
        </div>
    );
}

const SERVICE_STATUS = {
    active: { color: "var(--success)", icon: CheckCircle2, label: "active" },
    failed: { color: "var(--danger)", icon: XCircle, label: "failed" },
    activating: { color: "var(--info)", icon: Loader2, label: "activating" },
    reloading: { color: "var(--info)", icon: Loader2, label: "reloading" },
    deactivating: { color: "var(--warning)", icon: Loader2, label: "deactivating" },
    inactive: { color: "var(--text-muted)", icon: Circle, label: "inactive" },
};

function ServiceStatusChip({ active }) {
    const s = SERVICE_STATUS[active] ?? { color: "var(--text-muted)", icon: Circle, label: active };
    const Icon = s.icon;
    return (
        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: s.color, minWidth: 88 }}>
            <Icon size={12} className={active === "activating" || active === "reloading" ? "spin" : ""} />
            {s.label}
        </span>
    );
}

export default function AppDetail() {
    const { id } = useParams();
    const location = useLocation();
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

    // Device tree navigatsiyasidan `#hardware`, `#terminal` va h.k. bilan
    // kelinganda shu bo'limga scroll qilamiz — react-router hash uchun
    // avtomatik scroll qilmaydi.
    useEffect(() => {
        if (!app || !location.hash) return;
        const el = document.getElementById(location.hash.slice(1));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [app, location.hash]);

    const remove = async () => {
        if (!window.confirm("Disconnect this device? The agent will stop being authorized.")) return;
        await api.apps.remove(id);
        window.location.href = "/apps";
    };

    const [processFilter, setProcessFilter] = useState("");
    const [serviceFilter, setServiceFilter] = useState("");
    const [serviceStatusFilter, setServiceStatusFilter] = useState("all");

    const metricsForFilters = app?.last_metrics ?? {};

    const filteredProcesses = useMemo(() => {
        const list = metricsForFilters.processes ?? [];
        const q = processFilter.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (p) => p.command.toLowerCase().includes(q) || String(p.pid).includes(q) || p.user.toLowerCase().includes(q),
        );
    }, [metricsForFilters.processes, processFilter]);

    const filteredServices = useMemo(() => {
        let list = metricsForFilters.services ?? [];
        if (serviceStatusFilter !== "all") {
            list = list.filter((s) => s.active === serviceStatusFilter);
        }
        const q = serviceFilter.trim().toLowerCase();
        if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
        return list;
    }, [metricsForFilters.services, serviceFilter, serviceStatusFilter]);

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

            <SectionLabel index="01" id="overview">overview</SectionLabel>
            <Panel style={{ padding: "18px 22px", marginBottom: 32, display: "flex", flexWrap: "wrap", gap: 32 }}>
                <DetailField icon={Server} label="Hostname" value={app.hostname ?? "—"} />
                <DetailField icon={Server} label="OS" value={`${app.os_platform ?? "—"} ${app.os_release ?? ""}`.trim()} />
                <DetailField icon={Shield} label="Permission" value={app.permission} />
                <DetailField icon={Clock} label="Last seen" value={timeAgo(app.last_seen_at)} />
                <DetailField icon={Clock} label="Connected since" value={new Date(app.created_at).toLocaleString()} />
                <DetailField icon={Server} label="Machine ID" value={app.machine_id ? app.machine_id.slice(0, 16) + "…" : "—"} />
            </Panel>

            <SectionLabel index="02" id="hardware">system</SectionLabel>
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
                    icon={ArrowDownUp}
                    label="Swap"
                    value={metrics.swap ? `${metrics.swap.usedPercent}%` : "—"}
                    sub={metrics.swap ? `${fmtBytes(metrics.swap.used)} / ${fmtBytes(metrics.swap.total)}` : null}
                    pct={metrics.swap?.usedPercent}
                />
                <MetricPanel
                    icon={Container}
                    label="Docker"
                    value={metrics.docker?.installed ? `${metrics.docker.containers.length}` : "—"}
                    sub={
                        !metrics.docker?.installed
                            ? "not installed"
                            : metrics.docker.engineRunning
                            ? "engine operational"
                            : "engine offline"
                    }
                />
                <MetricPanel
                    icon={Clock}
                    label="Uptime"
                    value={fmtUptime(metrics.uptime)}
                    sub={metrics.loadavg ? `load ${metrics.loadavg.map((n) => n.toFixed(2)).join(" · ")}` : null}
                />
            </div>

            <SectionLabel index="03" id="network">network</SectionLabel>
            <Panel style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
                {!metrics.network && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        {isOnline ? "Interfeys ma'lumoti hali kelmadi…" : "Device offline — interfeys ma'lumoti yo'q."}
                    </div>
                )}
                {metrics.network
                    ?.filter((n) => !n.internal && n.family === "IPv4")
                    .map((n, i) => (
                        <div
                            key={`${n.name}:${n.address}`}
                            className="mono"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 20px",
                                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                                fontSize: 12.5,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <Wifi size={13} color="var(--text-secondary)" />
                                <span style={{ fontWeight: 600 }}>{n.name}</span>
                                <span style={{ color: "var(--text-muted)" }}>{n.address}</span>
                            </div>
                            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{n.mac}</span>
                        </div>
                    ))}
            </Panel>

            <div className="mono eyebrow" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                listening ports
            </div>
            <Panel style={{ padding: 0, marginBottom: 32, overflow: "hidden" }}>
                {!metrics.ports && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        {isOnline ? "Port ma'lumoti hali kelmadi…" : "Device offline — port ma'lumoti yo'q."}
                    </div>
                )}
                {metrics.ports?.length === 0 && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        Tinglovchi (listening) port topilmadi.
                    </div>
                )}
                {metrics.ports?.map((p, i) => {
                    const { icon: ProcIcon, color, label } = getProcessMeta(p.process);
                    return (
                        <div
                            key={`${p.proto}:${p.port}`}
                            className="mono"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 20px",
                                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                                fontSize: 12.5,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 22,
                                        height: 22,
                                        borderRadius: 5,
                                        background: `${color}1a`,
                                        flexShrink: 0,
                                    }}
                                >
                                    <ProcIcon size={12.5} color={color} />
                                </span>
                                <span style={{ fontWeight: 600 }}>{p.port}</span>
                                <span style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 11 }}>
                                    {p.proto}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {label && (
                                    <span
                                        className="eyebrow"
                                        style={{ color, fontSize: 10.5, border: `1px solid ${color}40`, borderRadius: 3, padding: "1px 6px" }}
                                    >
                                        {label}
                                    </span>
                                )}
                                <span style={{ color: "var(--text-muted)" }}>
                                    {p.process ? `${p.process}${p.pid ? ` (pid ${p.pid})` : ""}` : p.address}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </Panel>

            <SectionLabel index="04" id="processes">processes</SectionLabel>
            <FilterInput value={processFilter} onChange={setProcessFilter} placeholder="filter by name, pid, user…" />
            <Panel style={{ padding: 0, marginBottom: 32, overflow: "hidden" }}>
                {!metrics.processes && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        {isOnline ? "Jarayonlar ma'lumoti hali kelmadi…" : "Device offline — jarayonlar ma'lumoti yo'q."}
                    </div>
                )}
                {metrics.processes && filteredProcesses.length === 0 && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        Mos jarayon topilmadi.
                    </div>
                )}
                {filteredProcesses.map((p, i) => {
                    const { icon: ProcIcon, color } = getProcessMeta(p.command);
                    return (
                        <div
                            key={p.pid}
                            className="mono"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "9px 20px",
                                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                                fontSize: 12.5,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 22,
                                        height: 22,
                                        borderRadius: 5,
                                        background: `${color}1a`,
                                        flexShrink: 0,
                                    }}
                                >
                                    <ProcIcon size={12.5} color={color} />
                                </span>
                                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                                    {p.command}
                                </span>
                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>pid {p.pid}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{p.user}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                                <span style={{ color: "var(--text-muted)", fontSize: 11.5, minWidth: 62, textAlign: "right" }}>
                                    cpu {p.cpu.toFixed(1)}%
                                </span>
                                <span style={{ color: "var(--text-muted)", fontSize: 11.5, minWidth: 62, textAlign: "right" }}>
                                    mem {p.mem.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </Panel>

            <SectionLabel index="05" id="services">services</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <FilterInput value={serviceFilter} onChange={setServiceFilter} placeholder="filter by service name…" />
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {["all", "active", "failed", "inactive"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setServiceStatusFilter(s)}
                            className="mono tui-btn"
                            style={{
                                fontSize: 11,
                                padding: "5px 10px",
                                borderRadius: 2,
                                border: `1px solid ${serviceStatusFilter === s ? "var(--accent)" : "var(--border)"}`,
                                background: serviceStatusFilter === s ? "var(--accent)" : "transparent",
                                color: serviceStatusFilter === s ? "var(--accent-ink)" : "var(--text-secondary)",
                                cursor: "pointer",
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
            <Panel style={{ padding: 0, marginBottom: 32, overflow: "hidden", maxHeight: 420, overflowY: "auto" }}>
                {!metrics.services && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        {isOnline
                            ? "Xizmatlar ma'lumoti hali kelmadi (yoki systemd topilmadi)…"
                            : "Device offline — xizmatlar ma'lumoti yo'q."}
                    </div>
                )}
                {metrics.services && filteredServices.length === 0 && (
                    <div className="mono" style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--text-muted)" }}>
                        Mos xizmat topilmadi.
                    </div>
                )}
                {filteredServices.map((s, i) => (
                    <div
                        key={s.name}
                        className="mono"
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "9px 20px",
                            borderTop: i === 0 ? "none" : "1px solid var(--border)",
                            fontSize: 12.5,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                            <Settings2 size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                                {s.name.replace(/\.service$/, "")}
                            </span>
                            {s.description && (
                                <span
                                    style={{
                                        color: "var(--text-muted)",
                                        fontSize: 11.5,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: 320,
                                    }}
                                >
                                    {s.description}
                                </span>
                            )}
                        </div>
                        <ServiceStatusChip active={s.active} />
                    </div>
                ))}
            </Panel>

            <SectionLabel index="06" id="terminal">terminal</SectionLabel>
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
