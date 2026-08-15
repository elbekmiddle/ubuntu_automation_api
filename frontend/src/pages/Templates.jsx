import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Plus } from "lucide-react";
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button icon={RefreshCw} iconSpin={loading} onClick={sync} disabled={loading}>Sync from disk</Button>
            <Link to="/templates/new">
              <Button variant="accent" icon={Plus}>Add template</Button>
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
                padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
                transition: "border-color 0.12s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{t.name}</div>
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
        {templates.length === 0 && (
          <Panel>
            <EmptyState>
              No templates found in templates-storage/
              <div style={{ marginTop: 14 }}>
                <Link to="/templates/new">
                  <Button variant="accent" icon={Plus}>Create your first template</Button>
                </Link>
              </div>
            </EmptyState>
          </Panel>
        )}
      </div>
    </div>
  );
}
