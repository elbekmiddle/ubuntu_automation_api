import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Save, Check } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, Panel, Button } from "../components/ui";

export default function FileEditor() {
  const { id, fileName } = useParams();
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.templates.files.read(id, fileName);
      setContent(data.content);
      setOriginal(data.content);
    } catch (e) {
      setError(e.message);
    }
  }, [id, fileName]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.templates.files.write(id, fileName, content);
      setOriginal(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const dirty = content !== original;

  return (
    <div>
      <Link to={`/templates/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> Back to template
      </Link>

      <PageHeader
        eyebrow="Editing"
        title={fileName}
        action={
          <Button variant="accent" icon={saved ? Check : Save} onClick={save} disabled={saving || !dirty}>
            {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {error && (
        <Panel style={{ padding: 14, marginBottom: 20, color: "var(--danger)", fontSize: 13 }}>{error}</Panel>
      )}

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="mono"
          style={{
            width: "100%", minHeight: 480, border: "none", outline: "none", resize: "vertical",
            padding: 20, fontSize: 13, lineHeight: 1.6, background: "var(--surface)", color: "var(--text)",
          }}
        />
      </Panel>
      {dirty && (
        <div className="eyebrow" style={{ marginTop: 10, color: "var(--warning)" }}>
          Unsaved changes
        </div>
      )}
    </div>
  );
}
