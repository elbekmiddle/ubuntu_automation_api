import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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

export default function FleetRuns() {
    const [runs, setRuns] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const limit = 20;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRuns(await api.fleetRuns.list(page, limit));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div>
            <Link
                to="/fleet"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}
            >
                <ChevronLeft size={14} /> fleet automation
            </Link>

            <PageHeader
                eyebrow="past fleet runs"
                title="fleet run history"
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

            <SectionLabel index="01">runs</SectionLabel>
            {runs.length === 0 && !loading ? (
                <Panel>
                    <EmptyState>no fleet runs yet — launch one from the fleet automation page</EmptyState>
                </Panel>
            ) : (
                <Panel style={{ padding: 0, overflow: "hidden" }}>
                    {runs.map((r, i) => (
                        <Link
                            key={r.id}
                            to={`/fleet-runs/${r.id}`}
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
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                                <StatusBadge status={r.status === "completed" ? "success" : "running"} />
                                <span style={{ fontWeight: 600 }}>{r.template_slug}</span>
                                <span style={{ color: "var(--text-muted)" }}>{r.action}</span>
                                <span style={{ color: "var(--text-muted)" }}>· {r.target_count} targets</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                                <span style={{ color: "var(--text-muted)" }}>{timeAgo(r.created_at)}</span>
                                <ChevronRight size={14} color="var(--text-muted)" />
                            </div>
                        </Link>
                    ))}
                </Panel>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
                <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    prev
                </Button>
                <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
                    page {page}
                </span>
                <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={runs.length < limit}>
                    next
                </Button>
            </div>
        </div>
    );
}
