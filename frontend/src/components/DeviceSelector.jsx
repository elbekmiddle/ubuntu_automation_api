import React, { useMemo } from "react";
import { Search, X } from "lucide-react";

export const EMPTY_FILTERS = { q: "", platform: "all", osRelease: "all", online: "all", tags: [] };

/**
 * Berilgan `apps` ro'yxatidan mavjud platform/os-release/tag qiymatlarini
 * chiqarib oladi — dropdown/chip variantlarini device ro'yxatidan dinamik
 * quramiz, qattiq kodlanmagan.
 */
export function useDeviceFilterOptions(apps) {
    return useMemo(() => {
        const platforms = new Set();
        const releases = new Set();
        const tags = new Set();
        for (const a of apps) {
            if (a.os_platform) platforms.add(a.os_platform);
            if (a.os_release) releases.add(a.os_release);
            for (const t of a.tags ?? []) tags.add(t);
        }
        return {
            platforms: [...platforms].sort(),
            releases: [...releases].sort(),
            tags: [...tags].sort(),
        };
    }, [apps]);
}

/** Filtr kriteriyasini `apps` ro'yxatiga qo'llaydi — Apps.jsx va (kelajakda) Fleet automation shu bitta funksiyani ishlatadi. */
export function applyDeviceFilters(apps, filters) {
    const q = filters.q.trim().toLowerCase();
    return apps.filter((a) => {
        if (filters.online === "online" && a.status !== "online") return false;
        if (filters.online === "offline" && a.status === "online") return false;
        if (filters.platform !== "all" && a.os_platform !== filters.platform) return false;
        if (filters.osRelease !== "all" && a.os_release !== filters.osRelease) return false;
        if (filters.tags.length > 0) {
            const appTags = a.tags ?? [];
            if (!filters.tags.every((t) => appTags.includes(t))) return false;
        }
        if (q) {
            const hay = `${a.name} ${a.hostname ?? ""} ${a.os_platform ?? ""} ${a.os_release ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

function Select({ value, onChange, options, allLabel }) {
    return (
        <select
            className="mono"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                padding: "7px 10px",
                fontSize: 12,
                color: "var(--text)",
                outline: "none",
            }}
        >
            <option value="all">{allLabel}</option>
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    );
}

/**
 * Target selector — DeviceSelector.
 *
 * `apps` — filtr variantlarini (mavjud platform/os/tag qiymatlari) chiqarish
 * uchun to'liq (filtrlanmagan) device ro'yxati.
 * `filters`/`onChange` — controlled kriteriya (`EMPTY_FILTERS` shaklida).
 * `resultCount` — filtrlangan natija soni, sarlavhada ko'rsatish uchun.
 */
export default function DeviceSelector({ apps, filters, onChange, resultCount }) {
    const { platforms, releases, tags } = useDeviceFilterOptions(apps);
    const hasActiveFilters =
        filters.q || filters.platform !== "all" || filters.osRelease !== "all" || filters.online !== "all" || filters.tags.length > 0;

    const toggleTag = (tag) => {
        const next = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag];
        onChange({ ...filters, tags: next });
    };

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: tags.length ? 10 : 0 }}>
                <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
                    <Search size={12.5} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                        className="mono"
                        value={filters.q}
                        onChange={(e) => onChange({ ...filters, q: e.target.value })}
                        placeholder="search devices…"
                        style={{
                            width: "100%",
                            boxSizing: "border-box",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 2,
                            padding: "7px 10px 7px 30px",
                            fontSize: 12,
                            color: "var(--text)",
                            outline: "none",
                        }}
                    />
                </div>

                <Select
                    value={filters.online}
                    onChange={(v) => onChange({ ...filters, online: v })}
                    options={["online", "offline"]}
                    allLabel="any status"
                />
                <Select
                    value={filters.platform}
                    onChange={(v) => onChange({ ...filters, platform: v })}
                    options={platforms}
                    allLabel="any platform"
                />
                <Select
                    value={filters.osRelease}
                    onChange={(v) => onChange({ ...filters, osRelease: v })}
                    options={releases}
                    allLabel="any OS version"
                />

                {hasActiveFilters && (
                    <button
                        onClick={() => onChange(EMPTY_FILTERS)}
                        className="mono tui-btn"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            padding: "6px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: 2,
                            background: "transparent",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                        }}
                    >
                        <X size={11} /> clear
                    </button>
                )}

                {typeof resultCount === "number" && (
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: "auto" }}>
                        {resultCount} matching
                    </span>
                )}
            </div>

            {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {tags.map((t) => {
                        const active = filters.tags.includes(t);
                        return (
                            <button
                                key={t}
                                onClick={() => toggleTag(t)}
                                className="mono"
                                style={{
                                    fontSize: 11,
                                    padding: "3px 9px",
                                    borderRadius: 3,
                                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                                    background: active ? "var(--accent)" : "transparent",
                                    color: active ? "var(--accent-ink)" : "var(--text-secondary)",
                                    cursor: "pointer",
                                }}
                            >
                                #{t}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
