import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button, StatusBadge } from "../components/ui";
import DeviceSelector, { EMPTY_FILTERS, applyDeviceFilters } from "../components/DeviceSelector";

/**
 * Fleet automation — "1000 ta mashinada shu commandni bajar".
 *
 * Bu sahifa alohida "fleet run" backend entity'siga tayanmaydi (bunday
 * jadval hali yo'q) — buning o'rniga mavjud bitta-device job API'sini
 * (`POST /jobs` + `appId`) tanlangan har bir online device uchun alohida
 * chaqiradi va natijalarni shu yerda, clientda, jamlaydi. Kamchiligi —
 * sahifa yopilsa progress yo'qoladi (har bir job o'zi backend'da davom
 * etadi, faqat umumiy ko'rinish yo'qoladi); ustunligi — hech qanday yangi
 * migration/backend entity kerak emas va mavjud job monitoring (retry,
 * loglar — `/jobs/:id`) bepul ishlaydi.
 */
export default function FleetLaunch() {
    const [apps, setApps] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [templateId, setTemplateId] = useState("");
    const [action, setAction] = useState("");
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState([]); // [{ appId, appName, jobId, status }]
    const [error, setError] = useState(null);
    const pollRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const [ap, tpl] = await Promise.all([api.apps.list(), api.templates.list()]);
            setApps(ap);
            setTemplates(tpl);
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => () => clearInterval(pollRef.current), []);

    const template = templates.find((t) => t.id === templateId);
    const filtered = applyDeviceFilters(apps, filters);
    const targetOnline = filtered.filter((a) => a.status === "online");
    const targetOffline = filtered.filter((a) => a.status !== "online");

    const canRun = template && action && filtered.length > 0 && !running;

    const run = async () => {
        if (!template || !action) return;
        setRunning(true);
        setError(null);

        const initial = [
            ...targetOnline.map((a) => ({ appId: a.id, appName: a.name, jobId: null, status: "queued" })),
            ...targetOffline.map((a) => ({ appId: a.id, appName: a.name, jobId: null, status: "offline" })),
        ];
        setResults(initial);

        try {
            const created = await Promise.all(
                targetOnline.map(async (a) => {
                    try {
                        const job = await api.jobs.create(template.slug, action, {}, a.id);
                        return { appId: a.id, jobId: job.id, status: job.status ?? "queued" };
                    } catch (e) {
                        return { appId: a.id, jobId: null, status: "failed", errorMsg: e.message };
                    }
                }),
            );
            setResults((prev) =>
                prev.map((r) => {
                    const c = created.find((x) => x.appId === r.appId);
                    return c ? { ...r, jobId: c.jobId, status: c.status } : r;
                }),
            );
        } finally {
            setRunning(false);
        }
    };

    // `results` state'ni poll effekti ichida yopiq (stale) o'qimaslik uchun
    // pollingni alohida effekt sifatida, `results` o'zgarganda qayta
    // ishga tushiramiz.
    useEffect(() => {
        const pending = results.filter((r) => r.jobId && (r.status === "queued" || r.status === "running"));
        clearInterval(pollRef.current);
        if (pending.length === 0) return undefined;

        pollRef.current = setInterval(async () => {
            const updates = await Promise.all(
                pending.map(async (r) => {
                    try {
                        const job = await api.jobs.get(r.jobId);
                        return { appId: r.appId, status: job.status };
                    } catch {
                        return { appId: r.appId, status: r.status };
                    }
                }),
            );
            setResults((prev) =>
                prev.map((r) => {
                    const u = updates.find((x) => x.appId === r.appId);
                    return u ? { ...r, status: u.status } : r;
                }),
            );
        }, 2000);

        return () => clearInterval(pollRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results]);

    const counts = results.reduce(
        (acc, r) => {
            acc[r.status] = (acc[r.status] ?? 0) + 1;
            return acc;
        },
        {},
    );

    return (
        <div>
            <PageHeader
                eyebrow={`${apps.length} devices total`}
                title="fleet automation"
                action={
                    <Button icon={Play} onClick={run} disabled={!canRun}>
                        {running ? "launching…" : `run on ${filtered.length}`}
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

            <SectionLabel index="01">target</SectionLabel>
            {apps.length === 0 ? (
                <Panel style={{ marginBottom: 32 }}>
                    <EmptyState>no devices connected yet</EmptyState>
                </Panel>
            ) : (
                <DeviceSelector apps={apps} filters={filters} onChange={setFilters} resultCount={filtered.length} />
            )}

            <SectionLabel index="02">command</SectionLabel>
            <Panel style={{ padding: 18, marginBottom: 32, display: "flex", gap: 14, flexWrap: "wrap" }}>
                <select
                    className="mono"
                    value={templateId}
                    onChange={(e) => {
                        setTemplateId(e.target.value);
                        setAction("");
                    }}
                    style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 2,
                        padding: "9px 12px",
                        fontSize: 12.5,
                        color: "var(--text)",
                        outline: "none",
                        minWidth: 200,
                    }}
                >
                    <option value="">select template…</option>
                    {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name ?? t.slug}
                        </option>
                    ))}
                </select>

                <select
                    className="mono"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    disabled={!template}
                    style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 2,
                        padding: "9px 12px",
                        fontSize: 12.5,
                        color: "var(--text)",
                        outline: "none",
                        minWidth: 160,
                    }}
                >
                    <option value="">select action…</option>
                    {template?.actions.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
            </Panel>

            {results.length > 0 && (
                <>
                    <SectionLabel index="03">progress</SectionLabel>
                    <Panel style={{ padding: "12px 18px", marginBottom: 16, display: "flex", gap: 18, flexWrap: "wrap" }}>
                        {["success", "failed", "running", "queued", "offline"].map(
                            (s) =>
                                counts[s] > 0 && (
                                    <div key={s} className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                                        <StatusBadge status={s} /> {counts[s]}
                                    </div>
                                ),
                        )}
                        {running && <Loader2 size={13} className="spin" color="var(--text-muted)" />}
                    </Panel>

                    <Panel style={{ padding: 0, marginBottom: 32, overflow: "hidden" }}>
                        {results.map((r, i) => (
                            <div
                                key={r.appId}
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
                                <span style={{ fontWeight: 600 }}>{r.appName}</span>
                                {r.jobId ? (
                                    <Link to={`/jobs/${r.jobId}`} style={{ textDecoration: "none" }}>
                                        <StatusBadge status={r.status} />
                                    </Link>
                                ) : (
                                    <StatusBadge status={r.status} />
                                )}
                            </div>
                        ))}
                    </Panel>
                </>
            )}
        </div>
    );
}
