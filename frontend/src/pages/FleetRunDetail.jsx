import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, StatusBadge } from "../components/ui";

export default function FleetRunDetail() {
    const { id } = useParams();
    const [run, setRun] = useState(null);
    const [error, setError] = useState(null);
    const pollRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const r = await api.fleetRuns.get(id);
            setRun(r);
            return r;
        } catch (e) {
            setError(e.message);
            return null;
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // Run hali "running" holatida ekan — har 2s'da poll qilamiz. Barcha
    // target'lar terminal holatga (success/failed/offline/error) yetgach
    // yoki backend run.status'ni "completed" qilib qo'ygach to'xtaymiz.
    useEffect(() => {
        clearInterval(pollRef.current);
        if (!run || run.status === "completed") return undefined;

        pollRef.current = setInterval(async () => {
            const r = await load();
            if (r?.status === "completed") clearInterval(pollRef.current);
        }, 2000);

        return () => clearInterval(pollRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run?.status]);

    if (!run && !error) return null;

    if (error && !run) {
        return (
            <Panel style={{ padding: 14, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
                error: {error}
            </Panel>
        );
    }

    const counts = run.targets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div>
            <Link
                to="/fleet-runs"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}
            >
                <ChevronLeft size={14} /> fleet run history
            </Link>

            <PageHeader
                eyebrow={`${run.target_count} targets · started ${new Date(run.created_at).toLocaleString()}`}
                title={`${run.template_slug} · ${run.action}`}
                action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="mono">
                        {run.status === "running" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--info)" }}>
                                <Loader2 size={13} className="spin" /> running
                            </span>
                        ) : (
                            <span
                                style={{
                                    fontSize: 12.5,
                                    color: counts.failed || counts.error ? "var(--danger)" : "var(--success)",
                                }}
                            >
                                completed{counts.failed || counts.error ? ` · ${(counts.failed ?? 0) + (counts.error ?? 0)} failed` : ""}
                            </span>
                        )}
                    </div>
                }
            />

            <SectionLabel index="01">progress</SectionLabel>
            <Panel style={{ padding: "12px 18px", marginBottom: 16, display: "flex", gap: 18, flexWrap: "wrap" }}>
                {["success", "failed", "running", "pending", "offline", "error"].map(
                    (s) =>
                        counts[s] > 0 && (
                            <div key={s} className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                                <StatusBadge status={s} /> {counts[s]}
                            </div>
                        ),
                )}
            </Panel>

            <SectionLabel index="02">targets</SectionLabel>
            <Panel style={{ padding: 0, marginBottom: 32, overflow: "hidden" }}>
                {run.targets.map((t, i) => (
                    <div
                        key={t.id}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                            <span style={{ fontWeight: 600 }}>{t.app_name}</span>
                            {t.error_message && (
                                <span style={{ color: "var(--danger)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                                    {t.error_message}
                                </span>
                            )}
                        </div>
                        {t.job_id ? (
                            <Link to={`/jobs/${t.job_id}`} style={{ textDecoration: "none" }}>
                                <StatusBadge status={t.status} />
                            </Link>
                        ) : (
                            <StatusBadge status={t.status} />
                        )}
                    </div>
                ))}
            </Panel>
        </div>
    );
}
