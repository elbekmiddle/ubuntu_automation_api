import React, { useEffect, useState, useCallback } from "react";
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
    Plug,
    Wifi,
    Globe,
    Code2,
    Database,
    KeyRound,
    MessageCircle,
    Layers,
    Send,
} from "lucide-react";
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

// process nomiga qarab tur (icon + qisqa label) aniqlaydi — real brend
// logotiplari yo'q (lucide umumiy icon set), shuning uchun kategoriya
// bo'yicha eng yaqin icon tanlanadi. Har bir qator birinchi mos kelgan
// substring bo'yicha tekshiriladi, shuning uchun tartib muhim (masalan
// "idea" "jetbrains-toolb"dan oldin bo'lmasligi kerak edi — ikkalasi ham
// alohida yozilgan).
const PROCESS_TYPES = [
    { match: ["firefox", "chrome", "chromium", "cef_server", "brave"], icon: Globe, label: "browser" },
    { match: ["telegram"], icon: Send, label: "telegram" },
    { match: ["idea", "jetbrains", "pycharm", "webstorm", "clion", "goland", "rider", "code", "cursor"], icon: Code2, label: "IDE" },
    { match: ["postgres", "mysql", "mariadb", "mongod"], icon: Database, label: "database" },
    { match: ["redis", "memcached"], icon: Layers, label: "cache" },
    { match: ["ssh", "sshd"], icon: KeyRound, label: "ssh" },
    { match: ["docker", "containerd"], icon: Container, label: "docker" },
    { match: ["node", "deno", "bun"], icon: Server, label: "dev server" },
    { match: ["discord", "slack", "teams"], icon: MessageCircle, label: "chat" },
];

function getPortMeta(processName) {
    if (!processName) return { icon: Plug, label: null };
    const lower = processName.toLowerCase();
    for (const t of PROCESS_TYPES) {
        if (t.match.some((m) => lower.includes(m))) return { icon: t.icon, label: t.label };
    }
    return { icon: Plug, label: null };
}

// IPv6 link-local manzillardagi `%interface` suffiksi diagnostika uchun
// unchalik kerak emas — ro'yxatda joy egallamasin deb qisqartiramiz.
function fmtAddress(address) {
    if (!address) return "—";
    return address.split("%")[0];
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
                                <span style={{ color: "var(--text-muted)" }}>{fmtAddress(n.address)}</span>
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
                {metrics.ports
                    ?.slice()
                    .sort((a, b) => a.port - b.port)
                    .map((p, i) => {
                        const meta = getPortMeta(p.process);
                        const Icon = meta.icon;
                        return (
                            <div
                                key={`${p.proto}:${p.port}:${p.address}`}
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
                                    <Icon size={13} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: 600 }}>{p.port}</span>
                                    <span style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 11 }}>
                                        {p.proto}
                                    </span>
                                    {meta.label && (
                                        <span
                                            className="eyebrow"
                                            style={{
                                                fontSize: 10,
                                                padding: "2px 6px",
                                                border: "1px solid var(--border)",
                                                borderRadius: 3,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            {meta.label}
                                        </span>
                                    )}
                                </div>
                                <span style={{ color: "var(--text-muted)" }}>
                                    {p.process ? `${p.process}${p.pid ? ` (pid ${p.pid})` : ""}` : fmtAddress(p.address)}
                                </span>
                            </div>
                        );
                    })}
            </Panel>

            <SectionLabel index="04" id="terminal">terminal</SectionLabel>
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
