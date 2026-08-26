import React, { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";

// Backenddagi validatsiya bilan bir xil qoida (`SetTagsDTO`): faqat kichik
// harf/raqam/tire/pastki chiziq. Foydalanuvchi "Web Server" kabi yozsa ham
// avtomatik "web-server"ga normallashtiramiz — shunda 400 xatosi kamroq
// chiqadi va CLI/target selector'da yozish ham qulay bo'lib qoladi.
function normalizeTag(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/^-+/, "");
}

export default function TagEditor({ appId, tags, onChange }) {
    const [input, setInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const commit = async (next) => {
        setSaving(true);
        setError(null);
        try {
            const updated = await api.apps.setTags(appId, next);
            onChange(updated.tags ?? next);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const addTag = () => {
        const t = normalizeTag(input);
        setInput("");
        if (!t || tags.includes(t)) return;
        if (tags.length >= 20) {
            setError("Bitta device uchun ko'pi bilan 20 ta teg");
            return;
        }
        commit([...tags, t]);
    };

    const removeTag = (t) => commit(tags.filter((x) => x !== t));

    return (
        <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {tags.map((t) => (
                    <span
                        key={t}
                        className="mono"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10.5,
                            padding: "3px 5px 3px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: 3,
                            color: "var(--text-secondary)",
                        }}
                    >
                        {t}
                        <button
                            onClick={() => removeTag(t)}
                            disabled={saving}
                            title={`Remove "${t}"`}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: saving ? "default" : "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                padding: 2,
                            }}
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                    onBlur={() => input && addTag()}
                    disabled={saving}
                    placeholder="+ tag"
                    className="mono"
                    style={{
                        background: "transparent",
                        border: "1px dashed var(--border)",
                        borderRadius: 3,
                        color: "var(--text)",
                        fontSize: 10.5,
                        padding: "3px 6px",
                        width: 78,
                        outline: "none",
                    }}
                />
            </div>
            {error && (
                <div className="mono" style={{ fontSize: 10.5, color: "var(--danger)", marginTop: 4 }}>
                    {error}
                </div>
            )}
        </div>
    );
}
