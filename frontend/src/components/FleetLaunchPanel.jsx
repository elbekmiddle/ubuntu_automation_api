import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Play, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Panel, Button } from "./ui";

/**
 * Tanlangan `appIds` ro'yxatida bitta template action'ini ishga
 * tushiradi — FleetService.createRun'ga to'g'ridan-to'g'ri mos keladi.
 * Muvaffaqiyatli yaratilgach `/fleet-runs/:id`ga o'tkazadi (progress bar
 * shu yerda).
 */
export default function FleetLaunchPanel({ appIds, deviceFilter, onClose }) {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState(null);
    const [templateSlug, setTemplateSlug] = useState(null);
    const [action, setAction] = useState(null);
    const [launching, setLaunching] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.templates.list().then(setTemplates).catch((e) => setError(e.message));
    }, []);

    const selectedTemplate = templates?.find((t) => t.slug === templateSlug);

    const launch = async () => {
        if (!templateSlug || !action) return;
        setLaunching(true);
        setError(null);
        try {
            const run = await api.fleetRuns.create(templateSlug, action, {}, appIds, deviceFilter ?? {});
            navigate(`/fleet-runs/${run.id}`);
        } catch (e) {
            setError(e.message);
            setLaunching(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
            }}
            onClick={onClose}
        >
            <Panel
                style={{ width: 480, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", padding: 22 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>Fleet run</div>
                        <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                            {appIds.length} ta device'da bajariladi
                        </div>
                    </div>
                    <X size={16} style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={onClose} />
                </div>

                {error && (
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--danger)", marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                {templates === null && <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>yuklanmoqda…</div>}

                {templates && (
                    <>
                        <div className="eyebrow" style={{ marginBottom: 8 }}>Template</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTemplateSlug(t.slug);
                                        setAction(null);
                                    }}
                                    className="mono"
                                    style={{
                                        fontSize: 11.5,
                                        padding: "6px 10px",
                                        borderRadius: 2,
                                        border: `1px solid ${templateSlug === t.slug ? "var(--accent)" : "var(--border)"}`,
                                        background: templateSlug === t.slug ? "var(--accent)" : "transparent",
                                        color: templateSlug === t.slug ? "var(--accent-ink)" : "var(--text-secondary)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {t.name ?? t.slug}
                                </button>
                            ))}
                        </div>

                        {selectedTemplate && (
                            <>
                                <div className="eyebrow" style={{ marginBottom: 8 }}>Action</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                                    {selectedTemplate.actions.map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => setAction(a)}
                                            className="mono"
                                            style={{
                                                fontSize: 11.5,
                                                padding: "6px 10px",
                                                borderRadius: 2,
                                                border: `1px solid ${action === a ? "var(--accent)" : "var(--border)"}`,
                                                background: action === a ? "var(--accent)" : "transparent",
                                                color: action === a ? "var(--accent-ink)" : "var(--text-secondary)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <Button
                            icon={launching ? Loader2 : Play}
                            iconSpin={launching}
                            variant="accent"
                            disabled={!templateSlug || !action || launching}
                            onClick={launch}
                            style={{ width: "100%", justifyContent: "center" }}
                        >
                            {launching ? "ishga tushirilmoqda…" : `${appIds.length} ta device'da ishga tushirish`}
                        </Button>
                    </>
                )}
            </Panel>
        </div>
    );
}
