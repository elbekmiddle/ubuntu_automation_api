import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Play, Pause, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";

const CRON_PRESETS = [
  { label: "har daqiqada", value: "* * * * *" },
  { label: "soatiga bir marta", value: "0 * * * *" },
  { label: "har kuni soat 03:00", value: "0 3 * * *" },
  { label: "har hafta dushanba 09:00", value: "0 9 * * 1" },
];

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [templateSlug, setTemplateSlug] = useState("");
  const [action, setAction] = useState("");
  const [cron, setCron] = useState(CRON_PRESETS[2].value);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([api.schedules.list(), api.templates.list()]);
      setSchedules(s);
      setTemplates(t);
      if (!templateSlug && t[0]) {
        setTemplateSlug(t[0].slug);
        setAction(t[0].actions[0] ?? "");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedTemplate = templates.find((t) => t.slug === templateSlug);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.schedules.create(templateSlug, action, cron);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (s) => {
    try {
      await api.schedules.setEnabled(s.id, !s.enabled);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.schedules.remove(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${schedules.length} total`}
        title="schedules"
        action={<Button icon={RefreshCw} onClick={load} disabled={loading}>refresh</Button>}
      />

      {error && (
        <Panel className="mono" style={{ padding: 14, marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          error: {error}
        </Panel>
      )}

      <SectionLabel index="01">new schedule</SectionLabel>
      <Panel style={{ padding: 20, marginBottom: 36 }}>
        <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="template">
            <Select value={templateSlug} onChange={(e) => {
              const t = templates.find((x) => x.slug === e.target.value);
              setTemplateSlug(e.target.value);
              setAction(t?.actions[0] ?? "");
            }}>
              {templates.map((t) => <option key={t.slug} value={t.slug}>{t.slug}</option>)}
            </Select>
          </Field>

          <Field label="action">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              {(selectedTemplate?.actions ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>

          <Field label="cron" style={{ minWidth: 220 }}>
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="mono"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCron(p.value)}
                  className="mono"
                  style={{
                    fontSize: 10.5, color: "var(--text-muted)", background: "transparent",
                    border: "1px solid var(--border)", borderRadius: 2, padding: "2px 6px", cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Button type="submit" variant="accent" icon={Plus} disabled={submitting || !templateSlug || !action}>
            {submitting ? "creating…" : "add schedule"}
          </Button>
        </form>
      </Panel>

      <SectionLabel index="02">active schedules</SectionLabel>
      <Panel>
        {schedules.length === 0 && <EmptyState>no schedules yet</EmptyState>}
        {schedules.map((s, i) => (
          <div
            key={s.id}
            className="mono"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: s.enabled ? "var(--success)" : "var(--text-muted)" }}>●</span>
              <span>{s.template_slug ?? s.template_id}</span>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span>{s.action}</span>
              <span style={{ color: "var(--accent)", fontSize: 11.5 }}>{s.cron}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <IconBtn onClick={() => toggle(s)} title={s.enabled ? "pause" : "resume"}>
                {s.enabled ? <Pause size={13} /> : <Play size={13} />}
              </IconBtn>
              <IconBtn onClick={() => remove(s.id)} title="delete" danger>
                <Trash2 size={13} />
              </IconBtn>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "var(--bg)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 2, padding: "8px 10px", fontSize: 13,
};

function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  );
}

function Select(props) {
  return <select {...props} className="mono" style={inputStyle}>{props.children}</select>;
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="tui-btn"
      style={{
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--border)",
        color: danger ? "var(--danger)" : "var(--text-secondary)",
        borderRadius: 2, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
