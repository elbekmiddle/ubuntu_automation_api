import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Globe, ChevronLeft } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState } from "../components/ui";

export default function PublicTemplates() {
  const [templates, setTemplates] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      setTemplates(await api.templates.public(q));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  // Qidiruvni har harfda so'rov yubormaslik uchun 300ms debounce
  useEffect(() => {
    const id = setTimeout(() => load(query), 300);
    return () => clearTimeout(id);
  }, [query, load]);

  return (
    <div>
      <Link to="/templates" className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> templates
      </Link>

      <PageHeader eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Globe size={12} /> community</span>} title="public templates" />

      <div style={{ position: "relative", marginBottom: 24 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="qidirish: nom, slug yoki tavsif bo'yicha…"
          className="mono"
          style={{
            width: "100%", background: "var(--bg)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 2, padding: "10px 12px 10px 34px", fontSize: 13,
          }}
        />
      </div>

      <SectionLabel index="—">{loading ? "qidirilmoqda…" : `${templates.length} ta topildi`}</SectionLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {templates.map((t) => (
          <Link key={t.id} to={`/templates/${t.id}`}>
            <Panel
              style={{
                padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "border-color 0.12s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.slug}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 12 }}>{t.description}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {t.actions.map((a) => (
                    <span key={a} className="mono" style={{
                      fontSize: 11, color: "var(--text-secondary)", border: "1px solid var(--border)",
                      padding: "2px 8px", borderRadius: 2,
                    }}>{a}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </Panel>
          </Link>
        ))}
        {!loading && templates.length === 0 && (
          <Panel><EmptyState>Hech qanday jamoat templati topilmadi</EmptyState></Panel>
        )}
      </div>
    </div>
  );
}
