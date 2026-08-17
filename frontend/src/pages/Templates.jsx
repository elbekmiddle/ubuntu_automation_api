import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Plus, Globe, Lock } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await api.templates.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setLoading(true);
    try {
      await api.templates.sync();
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${templates.length} registered`}
        title="Templates"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/templates/public">
              <Button icon={Globe}>community</Button>
            </Link>
            <Button icon={RefreshCw} onClick={sync} disabled={loading}>sync from disk</Button>
            <Link to="/templates/new">
              <Button variant="accent" icon={Plus}>new template</Button>
            </Link>
          </div>
        }
      />

      <SectionLabel index="—">Catalog</SectionLabel>
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
                  {t.is_public ? (
                    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--accent)", border: "1px solid var(--border-strong)", padding: "1px 7px", borderRadius: 2 }}>
                      <Globe size={10} /> public
                    </span>
                  ) : (
                    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "1px 7px", borderRadius: 2 }}>
                      <Lock size={10} /> private
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 12 }}>{t.description}</div>
                <div style={{ display: "flex", gap: 6 }}>
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
        {templates.length === 0 && (
          <Panel><EmptyState>No templates found in templates-storage/</EmptyState></Panel>
        )}
      </div>
    </div>
  );
}
