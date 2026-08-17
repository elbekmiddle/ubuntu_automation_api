import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { PageHeader, Panel, Button } from "../components/ui";

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
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

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from ?? "/";

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto 0" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="mono crt-glow" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
          &gt; screenctl<span className="blink">_</span>
        </div>
        <div className="eyebrow" style={{ marginTop: 6 }}>system automation</div>
      </div>

      <PageHeader eyebrow={mode === "login" ? "welcome back" : "create account"} title={mode === "login" ? "login" : "register"} />

      {error && (
        <Panel className="mono" style={{ padding: 14, marginBottom: 20, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>
          error: {error}
        </Panel>
      )}

      <form onSubmit={submit}>
        <Panel style={{ padding: 22, marginBottom: 20 }}>
          {mode === "register" && (
            <Field label="name (ixtiyoriy)">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Elbek" autoComplete="name" />
            </Field>
          )}
          <Field label="email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </Field>
          <Field label="password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} />
          </Field>
        </Panel>

        <Button
          type="submit"
          variant="accent"
          disabled={submitting}
          icon={submitting ? Loader2 : mode === "login" ? LogIn : UserPlus}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {submitting ? "please wait…" : mode === "login" ? "login" : "create account"}
        </Button>
      </form>

      <div className="mono" style={{ textAlign: "center", marginTop: 20, fontSize: 12.5, color: "var(--text-secondary)" }}>
        {mode === "login" ? (
          <>Akkountingiz yo'qmi?{" "}
            <button type="button" onClick={() => setMode("register")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit" }}>
              Ro'yxatdan o'ting
            </button>
          </>
        ) : (
          <>Akkountingiz bormi?{" "}
            <button type="button" onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit" }}>
              Kirish
            </button>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link to="/" className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>← davom etish (login qilmasdan)</Link>
      </div>
    </div>
  );
}
