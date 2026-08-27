import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState } from "../components/ui";

function timeAgo(iso) {
    if (!iso) return "—";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s oldin`;
    if (s < 3600) return `${Math.floor(s / 60)}m oldin`;
    if (s < 86400) return `${Math.floor(s / 3600)}h oldin`;
    return `${Math.floor(s / 86400)}d oldin`;
}

export default function FleetRuns() {
    const [runs, setRuns] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.fleetRuns
            .list()
            .then(setRuns)
            .catch((e) => setError(e.message));
    }, []);

    return (
        <div>
            <PageHeader eyebrow={runs ? `${runs.length} run` : "…"} title="fleet runs" />

            {error && (
                <Panel style={{ padding: 14, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
                    xato: {error}
                </Panel>
            )}

            <SectionLabel index="—">tarix</SectionLabel>
            <Panel style={{ padding: 0, overflow: "hidden" }}>
                {runs?.length === 0 && (
                    <EmptyState>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span>hali fleet run bo'lmagan</span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                "devices" sahifasida bir nechta device tanlab, buyruq yuborishingiz mumkin
                            </span>
                        </div>
                    </EmptyState>
                )}
                {runs?.map((r, i) => (
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
                            textDecoration: "none",
                            color: "var(--text)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <Rocket size={13} color="var(--text-muted)" />
                            <span style={{ fontWeight: 600 }}>{r.template_name}</span>
                            <span style={{ color: "var(--text-muted)" }}>→ {r.action}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "var(--text-muted)", fontSize: 11.5 }}>
                            <span>{r.target_count} device</span>
                            <span>{timeAgo(r.created_at)}</span>
                        </div>
                    </Link>
                ))}
            </Panel>
        </div>
    );
}
