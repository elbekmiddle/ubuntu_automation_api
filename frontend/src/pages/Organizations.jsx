import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UserPlus, Users, Shield, X } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader, SectionLabel, Panel, EmptyState, Button, STATUS } from "../components/ui";

const ROLE_COLOR = {
    owner: "var(--accent)",
    admin: "var(--info)",
    developer: "var(--success)",
    operator: "var(--warning)",
    viewer: "var(--text-muted)",
};

const ASSIGNABLE_ROLES = ["admin", "developer", "operator", "viewer"];

function RoleChip({ role }) {
    return (
        <span
            className="mono"
            style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 3,
                border: `1px solid ${ROLE_COLOR[role] ?? "var(--border)"}40`,
                color: ROLE_COLOR[role] ?? "var(--text-secondary)",
            }}
        >
            {role}
        </span>
    );
}

function CreateOrgForm({ onCreated }) {
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await api.organizations.create(name.trim());
            setName("");
            onCreated();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
            <input
                className="mono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="yangi tashkilot nomi…"
                style={{
                    flex: "0 1 280px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                    padding: "8px 12px",
                    fontSize: 12.5,
                    color: "var(--text)",
                    outline: "none",
                }}
            />
            <Button icon={Plus} variant="accent" disabled={saving || !name.trim()}>
                {saving ? "yaratilmoqda…" : "tashkilot yaratish"}
            </Button>
            {error && (
                <span className="mono" style={{ fontSize: 11.5, color: "var(--danger)" }}>
                    {error}
                </span>
            )}
        </form>
    );
}

function MembersPanel({ org, onChanged }) {
    const [members, setMembers] = useState(null);
    const [error, setError] = useState(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("developer");
    const [inviting, setInviting] = useState(false);

    const canManage = org.role === "owner" || org.role === "admin";

    const load = useCallback(async () => {
        try {
            setMembers(await api.organizations.listMembers(org.id));
        } catch (e) {
            setError(e.message);
        }
    }, [org.id]);

    useEffect(() => {
        load();
    }, [load]);

    const invite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setError(null);
        try {
            await api.organizations.inviteMember(org.id, inviteEmail.trim(), inviteRole);
            setInviteEmail("");
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setInviting(false);
        }
    };

    const changeRole = async (memberId, role) => {
        try {
            await api.organizations.updateMemberRole(org.id, memberId, role);
            await load();
        } catch (e) {
            setError(e.message);
        }
    };

    const removeMember = async (memberId) => {
        if (!window.confirm("Bu a'zoni tashkilotdan chiqarish?")) return;
        try {
            await api.organizations.removeMember(org.id, memberId);
            await load();
        } catch (e) {
            setError(e.message);
        }
    };

    const deleteOrg = async () => {
        if (!window.confirm(`"${org.name}" tashkilotini butunlay o'chirish? Bu amalni qaytarib bo'lmaydi.`)) return;
        try {
            await api.organizations.remove(org.id);
            onChanged();
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <Panel style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{org.name}</span>
                        <RoleChip role={org.role} />
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                        {org.member_count} a'zo
                    </div>
                </div>
                {org.role === "owner" && (
                    <button
                        onClick={deleteOrg}
                        className="mono"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            padding: "6px 10px",
                            border: "1px solid var(--danger)",
                            borderRadius: 2,
                            background: "transparent",
                            color: "var(--danger)",
                            cursor: "pointer",
                        }}
                    >
                        <Trash2 size={11} /> tashkilotni o'chirish
                    </button>
                )}
            </div>

            {error && (
                <div className="mono" style={{ fontSize: 11.5, color: "var(--danger)", marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {members === null && <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>yuklanmoqda…</div>}

            {members?.map((m) => (
                <div
                    key={m.id}
                    className="mono"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 0",
                        borderTop: "1px solid var(--border)",
                        fontSize: 12.5,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{m.email}</span>
                        {m.status === "pending" && (
                            <span style={{ fontSize: 10.5, color: "var(--warning)" }}>taklif kutilmoqda</span>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {canManage && m.role !== "owner" ? (
                            <select
                                className="mono"
                                value={m.role}
                                onChange={(e) => changeRole(m.id, e.target.value)}
                                style={{
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 2,
                                    padding: "4px 8px",
                                    fontSize: 11,
                                    color: "var(--text)",
                                }}
                            >
                                {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <RoleChip role={m.role} />
                        )}
                        {canManage && m.role !== "owner" && (
                            <X size={13} style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={() => removeMember(m.id)} />
                        )}
                    </div>
                </div>
            ))}

            {canManage && (
                <form onSubmit={invite} style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <input
                        className="mono"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@misol.com"
                        style={{
                            flex: "1 1 200px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 2,
                            padding: "7px 10px",
                            fontSize: 12,
                            color: "var(--text)",
                            outline: "none",
                        }}
                    />
                    <select
                        className="mono"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 2,
                            padding: "7px 10px",
                            fontSize: 12,
                            color: "var(--text)",
                        }}
                    >
                        {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                    <Button icon={UserPlus} disabled={inviting || !inviteEmail.trim()}>
                        {inviting ? "taklif qilinmoqda…" : "taklif qilish"}
                    </Button>
                </form>
            )}
        </Panel>
    );
}

export default function Organizations() {
    const [orgs, setOrgs] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            setOrgs(await api.organizations.list());
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div>
            <PageHeader eyebrow={orgs ? `${orgs.length} tashkilot` : "…"} title="organizations" />

            {error && (
                <Panel style={{ padding: 14, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }} className="mono">
                    xato: {error}
                </Panel>
            )}

            <SectionLabel index="01" id="new">yangi tashkilot</SectionLabel>
            <CreateOrgForm onCreated={load} />

            <SectionLabel index="02" id="orgs">tashkilotlarim va a'zolik</SectionLabel>
            {orgs?.length === 0 && (
                <EmptyState>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span>hali hech qanday tashkilotga a'zo emassiz</span>
                    </div>
                </EmptyState>
            )}
            {orgs?.map((org) => (
                <MembersPanel key={org.id} org={org} onChanged={load} />
            ))}
        </div>
    );
}
