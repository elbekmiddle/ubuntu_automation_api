import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, Field, TextInput, TextArea, IconButton, Button } from "../components/ui";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_RE = SLUG_RE;

let uid = 0;
const newAction = () => ({ key: `a${uid++}`, name: "", script: "#!/bin/bash\n" });

export default function NewTemplate() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState([newAction()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateAction = (key, patch) => {
    setActions((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const addAction = () => setActions((prev) => [...prev, newAction()]);
  const removeAction = (key) => setActions((prev) => prev.filter((a) => a.key !== key));

  const validate = () => {
    if (!SLUG_RE.test(slug)) return "Slug faqat kichik harf, raqam va tire (-) bo'lishi mumkin";
    if (!name.trim()) return "Name majburiy";
    if (actions.length === 0) return "Kamida bitta action kerak";
    for (const a of actions) {
      if (!NAME_RE.test(a.name)) return `Noto'g'ri action nomi: "${a.name || "—"}"`;
      if (!a.script.trim()) return `"${a.name || "—"}" uchun script bo'sh bo'lishi mumkin emas`;
    }
    const names = actions.map((a) => a.name);
    if (new Set(names).size !== names.length) return "Action nomlari takrorlanishi mumkin emas";
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
    setSaving(true);
    try {
      const created = await api.templates.create({
        slug,
        name: name.trim(),
        description: description.trim(),
        actions: actions.map((a) => ({ name: a.name, script: a.script })),
      });
      navigate(`/templates/${created.id}`);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/templates" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 20 }}>
        <ChevronLeft size={14} /> Templates
      </Link>

      <PageHeader
        eyebrow="new"
        title="Create template"
        action={
          <Button variant="accent" icon={saving ? Loader2 : Save} iconSpin={saving} onClick={submit} disabled={saving} type="submit" form="new-template-form">
            {saving ? "Saving…" : "Create template"}
          </Button>
        }
      />

      {error && (
        <Panel style={{ padding: 14, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
          error: {error}
        </Panel>
      )}

      <form id="new-template-form" onSubmit={submit}>
        <SectionLabel index="01">Basics</SectionLabel>
        <Panel style={{ padding: "20px 22px", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <Field label="Slug" hint="kichik harf, raqam, tire — masalan: nginx-restart">
                <TextInput
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.trim())}
                  placeholder="nginx-restart"
                  autoComplete="off"
                />
              </Field>
            </div>
            <div style={{ flex: "1 1 240px" }}>
              <Field label="Name">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nginx Restart"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>
          <Field label="Description" hint="ixtiyoriy">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu template nima qiladi?"
              rows={3}
            />
          </Field>
        </Panel>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <SectionLabel index="02">Actions</SectionLabel>
          <Button type="button" variant="ghost" icon={Plus} onClick={addAction} style={{ fontSize: 11.5, padding: "6px 10px", marginBottom: 16 }}>
            add action
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
          {actions.map((a, i) => (
            <Panel key={a.key} style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <Field label={`Action #${i + 1} name`} hint="masalan: restart, toggle, install">
                    <TextInput
                      value={a.name}
                      onChange={(e) => updateAction(a.key, { name: e.target.value.trim() })}
                      placeholder="restart"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <IconButton
                  type="button"
                  icon={Trash2}
                  onClick={() => removeAction(a.key)}
                  disabled={actions.length === 1}
                  title="Remove action"
                  style={{ marginBottom: 18 }}
                />
              </div>
              <Field label="Script (bash)">
                <TextArea
                  value={a.script}
                  onChange={(e) => updateAction(a.key, { script: e.target.value })}
                  rows={6}
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </Field>
            </Panel>
          ))}
        </div>
      </form>
    </div>
  );
}
