import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, Panel, Button } from "../components/ui";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_SCRIPT = "#!/bin/bash\necho \"Running...\"\n";

function slugify(v) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewTemplate() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState([{ name: "install", script: DEFAULT_SCRIPT }]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateAction = (i, patch) => {
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { name: "", script: DEFAULT_SCRIPT }]);
  };

  const removeAction = (i) => {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onNameChange = (v) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const validate = () => {
    if (!SLUG_RE.test(slug)) return "Slug faqat kichik harf, raqam va tire (-) bo'lishi mumkin";
    if (!name.trim()) return "Name kiritilishi shart";
    if (actions.length === 0) return "Kamida bitta action kerak";
    for (const a of actions) {
      if (!SLUG_RE.test(a.name)) return `Noto'g'ri action nomi: "${a.name}"`;
      if (!a.script.trim()) return `"${a.name || "?"}" uchun script bo'sh`;
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const template = await api.templates.create({ slug, name, description, actions });
      navigate(`/templates/${template.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/templates" className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> templates
      </Link>

      <PageHeader eyebrow="new" title="create template" />

      {error && (
        <Panel className="mono" style={{ padding: 14, marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          error: {error}
        </Panel>
      )}

      <form onSubmit={submit}>
        <Panel style={{ padding: 22, marginBottom: 24 }}>
          <Field label="name">
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Nginx" />
          </Field>
          <Field label="slug">
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="nginx"
            />
          </Field>
          <Field label="description" last>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reverse proxy setup" />
          </Field>
        </Panel>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span className="eyebrow">actions</span>
          <Button type="button" icon={Plus} onClick={addAction}>add action</Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {actions.map((a, i) => (
            <Panel key={i} style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                <Input
                  value={a.name}
                  onChange={(e) => updateAction(i, { name: slugify(e.target.value) })}
                  placeholder="install"
                  style={{ maxWidth: 220 }}
                />
                {actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: 6 }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <textarea
                value={a.script}
                onChange={(e) => updateAction(i, { script: e.target.value })}
                spellCheck={false}
                className="mono"
                style={{
                  width: "100%", minHeight: 140, background: "var(--bg)", color: "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 2, padding: 12, fontSize: 12.5, lineHeight: 1.6, resize: "vertical",
                }}
              />
            </Panel>
          ))}
        </div>

        <Button type="submit" variant="accent" disabled={submitting} icon={submitting ? Loader2 : undefined}>
          {submitting ? "creating…" : "create template"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 16 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="mono"
      style={{
        width: "100%", background: "var(--bg)", color: "var(--text)",
        border: "1px solid var(--border)", borderRadius: 2, padding: "9px 12px", fontSize: 13,
        ...props.style,
      }}
    />
  );
}
