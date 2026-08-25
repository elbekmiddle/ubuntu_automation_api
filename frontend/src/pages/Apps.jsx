import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    RefreshCw,
    Trash2,
    ChevronRight,
    ChevronDown,
    LayoutDashboard,
    Cpu,
    Plug,
    ListTree,
    Settings2,
    TerminalSquare,
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button, StatusBadge } from "../components/ui";
import DeviceSelector, { EMPTY_FILTERS, applyDeviceFilters } from "../components/DeviceSelector";

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

// Har bir device tree tugunining bolalari — hozircha faqat haqiqatan
// mavjud bo'lgan bo'limlar (AppDetail'dagi SectionLabel id'lariga mos).
// Tasks/Logs/Audit — roadmap'da bor, lekin backend'da hali telemetriya
// yo'q, shuning uchun bu yerga soxta link qo'shilmaydi (qo'shilganda shu
// ro'yxatga qator sifatida qo'shiladi).
const DEVICE_SECTIONS = [
    { id: "overview", label: "overview", icon: LayoutDashboard },
    { id: "hardware", label: "hardware · docker · swap", icon: Cpu },
    { id: "network", label: "network · ports", icon: Plug },
    { id: "processes", label: "processes", icon: ListTree },
    { id: "services", label: "services", icon: Settings2 },
    { id: "terminal", label: "terminal", icon: TerminalSquare },
];

export default function Apps() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(() => new Set());
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setApps(await api.apps.list());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const remove = async (id) => {
        if (!window.confirm("Disconnect this device? The agent will stop being authorized.")) return;
        await api.apps.remove(id);
        load();
    };

    const toggle = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const online = apps.filter((a) => a.status === "online").length;
    const filteredApps = useMemo(() => applyDeviceFilters(apps, filters), [apps, filters]);

    return (
        <div>
            <PageHeader
                eyebrow={`${online} online · ${apps.length} total`}
                title="connected devices"
                action={
                    <Button icon={RefreshCw} onClick={load} disabled={loading}>
                        refresh
                    </Button>
                }
            />

            {error && (
                <Panel
                    style={{ padding: 14, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}
                    className="mono"
                >
                    error: {error}
                </Panel>
            )}

            {apps.length > 0 && (
                <DeviceSelector apps={apps} filters={filters} onChange={setFilters} resultCount={filteredApps.length} />
            )}

            <SectionLabel index="—">devices</SectionLabel>
            <Panel>
                {apps.length === 0 && (
                    <EmptyState>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span>no devices connected yet</span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                run <code>screenctl app connect</code> on any machine to add it here
                            </span>
                        </div>
                    </EmptyState>
                )}
                {apps.length > 0 && filteredApps.length === 0 && (
                    <EmptyState>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span>no devices match these filters</span>
                        </div>
                    </EmptyState>
                )}
                {filteredApps.map((a, i) => {
                    const isOpen = expanded.has(a.id);
                    return (
                        <div key={a.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                            <div
                                className="mono"
                                onClick={() => toggle(a.id)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "13px 20px",
                                    fontSize: 12.5,
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                                    {isOpen ? (
                                        <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                    ) : (
                                        <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                    )}
                                    <StatusBadge status={a.status === "online" ? "online" : "offline"} />
                                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                                    <span
                                        style={{
                                            color: "var(--text-muted)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            maxWidth: 320,
                                        }}
                                    >
                                        {a.hostname ? `${a.hostname} · ${a.os_platform ?? ""} ${a.os_release ?? ""}`.trim() : "—"}
                                    </span>
                                    {a.tags?.length > 0 && (
                                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                            {a.tags.slice(0, 3).map((t) => (
                                                <span
                                                    key={t}
                                                    style={{
                                                        fontSize: 10,
                                                        padding: "2px 7px",
                                                        borderRadius: 3,
                                                        border: "1px solid var(--border)",
                                                        color: "var(--text-secondary)",
                                                    }}
                                                >
                                                    #{t}
                                                </span>
                                            ))}
                                            {a.tags.length > 3 && (
                                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{a.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                                    <span style={{ color: "var(--text-muted)" }}>last seen {timeAgo(a.last_seen_at)}</span>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            remove(a.id);
                                        }}
                                        title="Disconnect"
                                        className="tui-btn"
                                        style={{
                                            background: "transparent",
                                            border: "1px solid var(--border)",
                                            color: "var(--danger)",
                                            width: 26,
                                            height: 26,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div style={{ paddingBottom: 6 }}>
                                    {DEVICE_SECTIONS.map((s) => (
                                        <Link
                                            key={s.id}
                                            // "overview" — sahifaning standart (hash'siz) holati:
                                            // /apps/:id ochilganda allaqachon eng tepada overview
                                            // ko'rinadi, shuning uchun unga alohida #overview qo'shmaymiz.
                                            to={s.id === "overview" ? `/apps/${a.id}` : `/apps/${a.id}#${s.id}`}
                                            className="mono"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "9px 20px 9px 50px",
                                                fontSize: 12,
                                                color: "var(--text-secondary)",
                                                textDecoration: "none",
                                            }}
                                        >
                                            <s.icon size={13} color="var(--text-muted)" />
                                            {s.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </Panel>
        </div>
    );
}
