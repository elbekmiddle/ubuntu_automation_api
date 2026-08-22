import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Trash2, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button, StatusBadge } from "../components/ui";

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

export default function Apps() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const online = apps.filter((a) => a.status === "online").length;

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
                {apps.map((a, i) => (
                    <Link
                        key={a.id}
                        to={`/apps/${a.id}`}
                        className="mono"
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "13px 20px",
                            borderTop: i === 0 ? "none" : "1px solid var(--border)",
                            fontSize: 12.5,
                            color: "inherit",
                            textDecoration: "none",
                            cursor: "pointer",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
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
                            <ChevronRight size={14} color="var(--text-muted)" />
                        </div>
                    </Link>
                ))}
            </Panel>
        </div>
    );
}
