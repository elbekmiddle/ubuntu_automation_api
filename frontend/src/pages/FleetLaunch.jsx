import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Play, History } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";
import DeviceSelector, { EMPTY_FILTERS, applyDeviceFilters } from "../components/DeviceSelector";

/**
 * Fleet automation — "1000 ta mashinada shu commandni bajar".
 *
 * Tanlangan shablon+action+target device'lar `POST /fleet-runs`ga bitta
 * so'rov sifatida yuboriladi — backend targetlar bo'yicha job'larni o'zi
 * yaratadi va natijani serverga saqlaydi (avval bu butunlay client-side
 * edi, sahifa yopilsa/reload bo'lsa progress yo'qolardi). Yaratilgandan
 * keyin `/fleet-runs/:id`ga o'tkaziladi — u yerda progress live poll
 * qilinadi va tarix sifatida saqlanib qoladi.
 */
export default function FleetLaunch() {
    const navigate = useNavigate();
    const [apps, setApps] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [templateId, setTemplateId] = useState("");
    const [action, setAction] = useState("");
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);

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

    const template = templates.find((t) => t.id === templateId);
    const filtered = applyDeviceFilters(apps, filters);
    const targetOnline = filtered.filter((a) => a.status === "online");
    const targetOffline = filtered.filter((a) => a.status !== "online");

    const canRun = template && action && filtered.length > 0 && !running;

    const run = async () => {
        if (!template || !action || filtered.length === 0) return;
        setRunning(true);
        setError(null);
        try {
            const fleetRun = await api.fleetRuns.create(
                template.slug,
                action,
                filtered.map((a) => a.id),
            );
            navigate(`/fleet-runs/${fleetRun.id}`);
        } catch (e) {
            setError(e.message);
            setRunning(false);
        }
    };

    return (
        <div>
            <PageHeader
                eyebrow={`${apps.length} devices total`}
                title="fleet automation"
                action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Link to="/fleet-runs" style={{ textDecoration: "none" }}>
                            <Button variant="ghost" icon={History}>
                                history
                            </Button>
                        </Link>
                        <Button icon={Play} onClick={run} disabled={!canRun}>
                            {running ? "launching…" : `run on ${filtered.length}`}
                        </Button>
                    </div>
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
            {filtered.length > 0 && targetOffline.length > 0 && (
                <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: -20, marginBottom: 24 }}>
                    {targetOnline.length} online · {targetOffline.length} offline (offline device'lar uchun job yaratilmaydi)
                </div>
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
        </div>
    );
}
