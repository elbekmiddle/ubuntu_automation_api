import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, CheckCircle2, XCircle, WifiOff, Loader2, Circle, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState } from "../components/ui";

const STATUS_META = {
    success: { color: "var(--success)", icon: CheckCircle2, label: "success" },
    failed: { color: "var(--danger)", icon: XCircle, label: "failed" },
    error: { color: "var(--danger)", icon: AlertTriangle, label: "error" },
    offline: { color: "var(--text-muted)", icon: WifiOff, label: "offline" },
    running: { color: "var(--info)", icon: Loader2, label: "running" },
    pending: { color: "var(--text-muted)", icon: Circle, label: "pending" },
};

function ProgressBar({ summary }) {
    const { total } = summary;
    if (total === 0) return null;
    const segments = [
        { key: "success", color: "var(--success)" },
        { key: "failed", color: "var(--danger)" },
        { key: "error", color: "var(--danger)" },
        { key: "offline", color: "var(--text-muted)" },
        { key: "running", color: "var(--info)" },
        { key: "pending", color: "var(--border-strong)" },
    ];
    return (
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
            {segments.map(
                (s) =>
                    summary[s.key] > 0 && (
                        <div key={s.key} style={{ width: `${(summary[s.key] / total) * 100}%`, background: s.color }} />
                    ),
            )}
        </div>
    );
}

// 2 soniyada bir poll qilamiz — real-time WS o'rniga soddaroq va yetarli
// (1000 ta device'gacha bo'lgan fleet run uchun ham bitta yengil GET so'rov).
const POLL_MS = 2000;

export default function FleetRunDetail() {
    const { id } = useParams();
    const [run, setRun] = useState(null);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const data = await api.fleetRuns.get(id);
            setRun(data);
            if (!data.done) {
                timerRef.current = setTimeout(load, POLL_MS);
            }
        } catch (e) {
            setError(e.message);
        }
    }, [id]);

    useEffect(() => {
        load();
        return () => clearTimeout(timerRef.current);
    }, [load]);

    if (error) {
        return (
            <Panel style={{ padding: 14, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
                error: {error}
            </Panel>
        );
    }
    if (!run) return null;

    return (
        <div>
            <PageHeader
                eyebrow={
                    <Link to="/apps" className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", textDecoration: "none" }}>
                        <ChevronLeft size={12} /> devices
                    </Link>
                }
                title={`${run.action} — fleet run`}
            />

            <SectionLabel index="01" id="progress">progress</SectionLabel>
            <Panel style={{ padding: 20, marginBottom: 28 }}>
                <ProgressBar summary={run.summary} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
                    {Object.entries(STATUS_META).map(([key, meta]) => {
                        const count = run.summary[key] ?? 0;
                        if (count === 0) return null;
                        const Icon = meta.icon;
                        return (
                            <div key={key} className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: meta.color }}>
                                <Icon size={13} className={key === "running" ? "spin" : ""} />
                                {count} {meta.label}
                            </div>
                        );
                    })}
                    <div className="mono" style={{ fontSize: 12.5, color: "var(--text-muted)", marginLeft: "auto" }}>
                        {run.done ? "yakunlandi" : "ishlamoqda…"} · {run.summary.total} ta device
                    </div>
                </div>
            </Panel>

            <SectionLabel index="02" id="targets">devices</SectionLabel>
            <Panel style={{ padding: 0, overflow: "hidden" }}>
                {run.targets.length === 0 && <EmptyState>hech qanday device topilmadi</EmptyState>}
                {run.targets.map((t, i) => {
                    const meta = STATUS_META[t.status] ?? STATUS_META.pending;
                    const Icon = meta.icon;
                    return (
                        <div
                            key={t.appId}
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
                            <Link to={`/apps/${t.appId}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>
                                {t.appName}
                            </Link>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {t.error && (
                                    <span style={{ color: "var(--text-muted)", fontSize: 11, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {t.error}
                                    </span>
                                )}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: meta.color }}>
                                    <Icon size={13} className={t.status === "running" ? "spin" : ""} />
                                    {meta.label}
                                </span>
                                {t.jobId && (
                                    <Link to={`/jobs/${t.jobId}`} style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                        job →
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </Panel>
        </div>
    );
}
