import React, { useEffect, useState, useCallback } from "react";
import {
    RefreshCw,
    Trash2,
    ChevronRight,
    Server,
    Cpu,
    MemoryStick,
    HardDrive,
    Network,
    Clock,
    Container,
    List,
    Radio,
} from "lucide-react";

import { api } from "../lib/api";

import {
    PageHeader,
    SectionLabel,
    Panel,
    EmptyState,
    Button,
    StatusBadge,
} from "../components/ui";

function timeAgo(iso) {
    if (!iso) return "—";

    const seconds = Math.floor(
        (Date.now() - new Date(iso).getTime()) / 1000
    );

    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
}

function formatBytes(bytes) {
    if (bytes == null) return "—";

    const units = ["B", "KB", "MB", "GB", "TB"];

    let value = Number(bytes);
    let index = 0;

    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }

    return `${value.toFixed(1)} ${units[index]}`;
}

function formatUptime(seconds) {
    if (!seconds) return "0s";

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);

    const parts = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    return parts.join(" ") || "<1m";
}

function Stat({ icon: Icon, label, value }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 100,
            }}
        >
            <Icon size={14} style={{ color: "var(--text-muted)" }} />

            <div>
                <div
                    style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                    }}
                >
                    {label}
                </div>

                <div
                    className="mono"
                    style={{
                        fontSize: 12,
                        marginTop: 2,
                    }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}

function DeviceOverview({ app, system }) {
    if (!system) {
        return (
            <EmptyState>
                loading system information...
            </EmptyState>
        );
    }

    const cpu = system.cpu;
    const memory = system.memory;
    const uptime = system.uptime;
    const os = system.os;

    return (
        <div>
            <SectionLabel index="01">
                system
            </SectionLabel>

            <Panel>
                <div
                    style={{
                        padding: 20,
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 22,
                    }}
                >
                    <Stat
                        icon={Cpu}
                        label="cpu"
                        value={`${cpu?.currentLoad ?? 0}%`}
                    />

                    <Stat
                        icon={MemoryStick}
                        label="memory"
                        value={`${memory?.ram?.usedPercent ?? 0}%`}
                    />

                    <Stat
                        icon={Clock}
                        label="uptime"
                        value={formatUptime(uptime?.uptime)}
                    />

                    <Stat
                        icon={Server}
                        label="os"
                        value={
                            os
                                ? `${os.distro} ${os.release}`
                                : "—"
                        }
                    />
                </div>
            </Panel>

            <SectionLabel index="02">
                storage
            </SectionLabel>

            <Panel>
                {system.disk?.map((disk, index) => (
                    <div
                        key={`${disk.mount}-${index}`}
                        className="mono"
                        style={{
                            padding: "13px 20px",
                            borderTop:
                                index === 0
                                    ? "none"
                                    : "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                            }}
                        >
                            <HardDrive size={14} />

                            <span>
                                {disk.mount}
                            </span>
                        </div>

                        <span
                            style={{
                                color:
                                    "var(--text-muted)",
                            }}
                        >
                            {formatBytes(disk.used)}
                            {" / "}
                            {formatBytes(disk.size)}
                            {" · "}
                            {Number(disk.usePercent).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </Panel>

            <SectionLabel index="03">
                network
            </SectionLabel>

            <Panel>
                {system.network?.map(
                    (network, index) => (
                        <div
                            key={`${network.iface}-${index}`}
                            className="mono"
                            style={{
                                padding:
                                    "13px 20px",
                                borderTop:
                                    index === 0
                                        ? "none"
                                        : "1px solid var(--border)",
                                display: "flex",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <div
                                style={{
                                    display:
                                        "flex",
                                    gap: 10,
                                }}
                            >
                                <Network
                                    size={14}
                                />

                                <span>
                                    {network.iface}
                                </span>
                            </div>

                            <span
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                ↓{" "}
                                {formatBytes(
                                    network.rxBytes
                                )}
                                {" · "}
                                ↑{" "}
                                {formatBytes(
                                    network.txBytes
                                )}
                            </span>
                        </div>
                    )
                )}
            </Panel>

            <SectionLabel index="04">
                listening ports
            </SectionLabel>

            <Panel>
                {(!system.ports ||
                    system.ports.length === 0) && (
                    <EmptyState>
                        no listening ports
                    </EmptyState>
                )}

                {system.ports?.map(
                    (port, index) => (
                        <div
                            key={`${port.protocol}-${port.address}-${port.port}-${index}`}
                            className="mono"
                            style={{
                                padding:
                                    "13px 20px",
                                borderTop:
                                    index === 0
                                        ? "none"
                                        : "1px solid var(--border)",
                                display: "flex",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <div
                                style={{
                                    display:
                                        "flex",
                                    gap: 14,
                                }}
                            >
                                <Radio
                                    size={14}
                                />

                                <span>
                                    {port.protocol}
                                </span>

                                <span>
                                    {port.address}
                                    :
                                    {port.port}
                                </span>
                            </div>

                            <span
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                {port.process ||
                                    "unknown"}
                                {" · pid "}
                                {port.pid || "—"}
                            </span>
                        </div>
                    )
                )}
            </Panel>

            <SectionLabel index="05">
                processes
            </SectionLabel>

            <Panel>
                {system.processes?.topCpu?.map(
                    (process, index) => (
                        <div
                            key={`${process.pid}-${index}`}
                            className="mono"
                            style={{
                                padding:
                                    "13px 20px",
                                borderTop:
                                    index === 0
                                        ? "none"
                                        : "1px solid var(--border)",
                                display: "grid",
                                gridTemplateColumns:
                                    "70px 1fr 90px 100px",
                                gap: 15,
                            }}
                        >
                            <span>
                                {process.pid}
                            </span>

                            <span>
                                {process.name}
                            </span>

                            <span>
                                CPU{" "}
                                {Number(
                                    process.cpu
                                ).toFixed(1)}
                                %
                            </span>

                            <span
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                RAM{" "}
                                {
                                    process.memoryPercent
                                }
                                %
                            </span>
                        </div>
                    )
                )}
            </Panel>

            <SectionLabel index="06">
                docker
            </SectionLabel>

            <Panel>
                {!system.docker?.installed && (
                    <EmptyState>
                        docker unavailable
                    </EmptyState>
                )}

                {system.docker?.containers?.map(
                    (container, index) => (
                        <div
                            key={`${container.ID}-${index}`}
                            className="mono"
                            style={{
                                padding:
                                    "13px 20px",
                                borderTop:
                                    index === 0
                                        ? "none"
                                        : "1px solid var(--border)",
                                display: "flex",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <div
                                style={{
                                    display:
                                        "flex",
                                    gap: 12,
                                }}
                            >
                                <Container
                                    size={14}
                                />

                                <span>
                                    {container.Names}
                                </span>
                            </div>

                            <span
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                {container.Status}
                            </span>
                        </div>
                    )
                )}
            </Panel>
        </div>
    );
}

export default function Apps() {
    const [apps, setApps] = useState([]);

    const [selected, setSelected] =
        useState(null);

    const [system, setSystem] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [systemLoading, setSystemLoading] =
        useState(false);

    const [error, setError] =
        useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data =
                await api.apps.list();

            setApps(data);

            if (selected) {
                const updated =
                    data.find(
                        (app) =>
                            app.id === selected.id
                    );

                if (updated) {
                    setSelected(updated);
                }
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [selected]);

    useEffect(() => {
        load();
    }, []);

    const loadSystem = useCallback(
        async (id) => {
            setSystemLoading(true);

            try {
                const data =
                    await api.apps.system.overview(
                        id
                    );

                setSystem(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setSystemLoading(false);
            }
        },
        []
    );

    const selectApp = async (app) => {
        setSelected(app);
        setSystem(null);

        if (app.status === "online") {
            await loadSystem(app.id);
        }
    };

    const remove = async (id) => {
        if (
            !window.confirm(
                "Disconnect this device? The agent will stop being authorized."
            )
        ) {
            return;
        }

        await api.apps.remove(id);

        if (selected?.id === id) {
            setSelected(null);
            setSystem(null);
        }

        await load();
    };

    const online = apps.filter(
        (app) => app.status === "online"
    ).length;

    if (selected) {
        return (
            <div>
                <PageHeader
                    eyebrow={
                        selected.status ===
                        "online"
                            ? "online"
                            : "offline"
                    }
                    title={selected.name}
                    action={
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                            }}
                        >
                            <Button
                                icon={RefreshCw}
                                disabled={
                                    systemLoading
                                }
                                onClick={() =>
                                    loadSystem(
                                        selected.id
                                    )
                                }
                            >
                                refresh
                            </Button>

                            <Button
                                onClick={() => {
                                    setSelected(
                                        null
                                    );
                                    setSystem(null);
                                }}
                            >
                                back
                            </Button>
                        </div>
                    }
                />

                <Panel
                    style={{
                        padding: 18,
                        marginBottom: 24,
                    }}
                >
                    <div
                        className="mono"
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            >
                                {selected.hostname ||
                                    selected.name}
                            </div>

                            <div
                                style={{
                                    marginTop: 5,
                                    color:
                                        "var(--text-muted)",
                                    fontSize: 11,
                                }}
                            >
                                {selected.os_platform ||
                                    "—"}{" "}
                                {selected.os_release ||
                                    ""}
                            </div>
                        </div>

                        <StatusBadge
                            status={
                                selected.status ===
                                "online"
                                    ? "online"
                                    : "offline"
                            }
                        />
                    </div>
                </Panel>

                {selected.status !== "online" ? (
                    <EmptyState>
                        device is offline
                    </EmptyState>
                ) : systemLoading ? (
                    <EmptyState>
                        fetching system information...
                    </EmptyState>
                ) : (
                    <DeviceOverview
                        app={selected}
                        system={system}
                    />
                )}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                eyebrow={`${online} online · ${apps.length} total`}
                title="connected devices"
                action={
                    <Button
                        icon={RefreshCw}
                        onClick={load}
                        disabled={loading}
                    >
                        refresh
                    </Button>
                }
            />

            {error && (
                <Panel
                    style={{
                        padding: 14,
                        marginBottom: 24,
                        borderColor:
                            "var(--danger)",
                        color: "var(--danger)",
                        fontSize: 13,
                    }}
                    className="mono"
                >
                    error: {error}
                </Panel>
            )}

            <SectionLabel index="—">
                devices
            </SectionLabel>

            <Panel>
                {apps.length === 0 && (
                    <EmptyState>
                        <div
                            style={{
                                display: "flex",
                                flexDirection:
                                    "column",
                                gap: 6,
                            }}
                        >
                            <span>
                                no devices connected
                                yet
                            </span>

                            <span
                                className="mono"
                                style={{
                                    fontSize: 11,
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                run{" "}
                                <code>
                                    screenctl app
                                    connect
                                </code>{" "}
                                on any machine
                            </span>
                        </div>
                    </EmptyState>
                )}

                {apps.map((app, index) => (
                    <div
                        key={app.id}
                        onClick={() =>
                            selectApp(app)
                        }
                        className="mono"
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems: "center",
                            padding:
                                "15px 20px",
                            borderTop:
                                index === 0
                                    ? "none"
                                    : "1px solid var(--border)",
                            fontSize: 12.5,
                            cursor: "pointer",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: 14,
                                minWidth: 0,
                            }}
                        >
                            <StatusBadge
                                status={
                                    app.status ===
                                    "online"
                                        ? "online"
                                        : "offline"
                                }
                            />

                            <div>
                                <div
                                    style={{
                                        fontWeight: 600,
                                    }}
                                >
                                    {app.name}
                                </div>

                                <div
                                    style={{
                                        marginTop: 3,
                                        color:
                                            "var(--text-muted)",
                                        fontSize: 11,
                                    }}
                                >
                                    {app.hostname ||
                                        "unknown host"}
                                    {" · "}
                                    {app.os_platform ||
                                        "—"}
                                    {" "}
                                    {app.os_release ||
                                        ""}
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: 18,
                            }}
                        >
                            <span
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            >
                                last seen{" "}
                                {timeAgo(
                                    app.last_seen_at
                                )}
                            </span>

                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    remove(app.id);
                                }}
                                title="Disconnect"
                                className="tui-btn"
                                style={{
                                    background:
                                        "transparent",
                                    border:
                                        "1px solid var(--border)",
                                    color:
                                        "var(--danger)",
                                    width: 26,
                                    height: 26,
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    cursor:
                                        "pointer",
                                    borderRadius: 2,
                                }}
                            >
                                <Trash2
                                    size={13}
                                />
                            </button>

                            <ChevronRight
                                size={14}
                                style={{
                                    color:
                                        "var(--text-muted)",
                                }}
                            />
                        </div>
                    </div>
                ))}
            </Panel>
        </div>
    );
}