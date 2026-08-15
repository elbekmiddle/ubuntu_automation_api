import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Play, Loader2, FileCode, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button } from "../components/ui";

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [files, setFiles] = useState([]);
  const [runningAction, setRunningAction] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([api.templates.get(id), api.templates.files.list(id)]);
      setTemplate(t);
      setFiles(f);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    setRunningAction(action);
    try {
      const job = await api.jobs.create(template.slug, action);
      navigate(`/jobs/${job.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunningAction(null);
    }
  };

  if (error) {
    return <Panel style={{ padding: 20, color: "var(--danger)", fontSize: 13 }}>{error}</Panel>;
  }
  if (!template) return null;

  return (
    <div>
      <Link to="/templates" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> Templates
      </Link>

      <PageHeader eyebrow={template.slug} title={template.name} />

      <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 36, maxWidth: 640 }}>
        {template.description}
      </div>

      <SectionLabel index="01">Actions</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
        {template.actions.map((a) => (
          <Button
            key={a}
            variant="accent"
            icon={runningAction === a ? Loader2 : Play}
            iconSpin={runningAction === a}
            onClick={() => run(a)}
            disabled={runningAction === a}
            style={{ padding: "11px 18px", fontSize: 13 }}
          >
            {a}
          </Button>
        ))}
      </div>

      <SectionLabel index="02">Files</SectionLabel>
      <Panel>
        {files.length === 0 && <EmptyState>No files in this template</EmptyState>}
        {files.map((f, i) => (
          <Link
            key={f}
            to={`/templates/${id}/files/${f}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 20px", borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileCode size={14} color="var(--text-muted)" />
              <span className="mono" style={{ fontSize: 13 }}>{f}</span>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </Link>
        ))}
      </Panel>
    </div>
  );
}
