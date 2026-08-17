import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import { Link } from "react-router-dom";
import {
    Cpu,
    MemoryStick,
    ArrowDownUp,
    HardDrive,
    Container,
    RefreshCw,
    Monitor,
    Terminal,
} from "lucide-react";

import { api } from "../lib/api";
import { jitteredInterval } from "../lib/jitter";

import {
    PageHeader,
    SectionLabel,
    Panel,
    StatusBadge,
    EmptyState,
    Button,
} from "../components/ui";

/* =========================================================
   HELPERS
   ========================================================= */

function fmtBytes(n) {
    if (n == null) return "—";

    const units = ["B", "KB", "MB", "GB", "TB"];

    let i = 0;
    let v = n;

    while (
        v >= 1024 &&
        i < units.length - 1
        ) {
        v /= 1024;
        i++;
    }

    return `${v.toFixed(1)} ${units[i]}`;
}

function timeAgo(iso) {
    if (!iso) return "—";

    const s = Math.floor(
        (Date.now() - new Date(iso).getTime()) /
        1000
    );

    if (s < 60) {
        return `${s}s ago`;
    }

    const m = Math.floor(s / 60);

    if (m < 60) {
        return `${m}m ago`;
    }

    const h = Math.floor(m / 60);

    if (h < 24) {
        return `${h}h ago`;
    }

    return `${Math.floor(h / 24)}d ago`;
}

/* =========================================================
   FULL WIDTH ASCII BAR
   ========================================================= */

function FullAsciiBar({
                          pct = 0,
                          segments = 48,
                      }) {
    const safePct = Math.min(
        100,
        Math.max(0, Number(pct) || 0)
    );

    const activeSegments = Math.round(
        (safePct / 100) * segments
    );

    let color = "var(--success)";

    if (safePct >= 85) {
        color = "var(--danger)";
    } else if (safePct >= 70) {
        color = "var(--warning)";
    }

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                height: 13,
                gap: 2,
                overflow: "hidden",
                boxSizing: "border-box",
            }}
        >
            {Array.from({
                length: segments,
            }).map((_, index) => {
                const active =
                    index < activeSegments;

                return (
                    <span
                        key={index}
                        style={{
                            flex: "1 1 0",
                            minWidth: 0,
                            height: "100%",
                            display: "block",
                            background: active
                                ? color
                                : "var(--border)",
                            opacity: active
                                ? 1
                                : 0.7,
                        }}
                    />
                );
            })}
        </div>
    );
}

/* =========================================================
   HARDWARE SPEC
   ========================================================= */

function Spec({
                  icon: Icon,
                  label,
                  value,
                  sub,
                  pct,
                  className,
              }) {
    return (
        <Panel
            className={className}
            style={{
                padding: 20,
                flex: "1 1 190px",
                minWidth: 190,
                boxSizing: "border-box",
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                }}
            >
                <Icon
                    size={14}
                    color="var(--text-secondary)"
                />

                <span className="eyebrow">
                    {label}
                </span>
            </div>

            {/* VALUE */}
            <div
                className="mono crt-glow"
                style={{
                    fontSize: 26,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: "var(--text)",
                }}
            >
                {value}
            </div>

            {/* SUB VALUE */}
            {sub && (
                <div
                    className="mono"
                    style={{
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginTop: 8,
                    }}
                >
                    {sub}
                </div>
            )}

            {/* FULL WIDTH BAR */}
            {pct != null && (
                <div
                    style={{
                        marginTop: 16,
                        width: "100%",
                        boxSizing: "border-box",
                    }}
                >
                    <FullAsciiBar pct={pct} />
                </div>
            )}
        </Panel>
    );
}

/* =========================================================
   DOCKER
   ========================================================= */

function DockerSpec({
                        docker,
                        className,
                    }) {
    const containers =
        docker?.containers?.length ?? 0;

    const running =
        Boolean(docker?.running);

    return (
        <Panel
            className={className}
            style={{
                padding: 20,
                flex: "0 0 100%",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                }}
            >
                <Container
                    size={14}
                    color="var(--text-secondary)"
                />

                <span className="eyebrow">
                    docker
                </span>
            </div>

            {/* MAIN */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        "space-between",
                    gap: 20,
                }}
            >
                <div
                    className="mono crt-glow"
                    style={{
                        fontSize: 26,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: "var(--text)",
                    }}
                >
                    {containers}
                </div>

                <div
                    className="mono"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 12,
                        color: running
                            ? "var(--success)"
                            : "var(--text-muted)",
                    }}
                >
                    <span>
                        {running
                            ? "●"
                            : "○"}
                    </span>

                    <span>
                        {running
                            ? "running"
                            : "stopped"}
                    </span>
                </div>
            </div>

            {/* DESCRIPTION */}
            <div
                className="mono"
                style={{
                    marginTop: 8,
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                }}
            >
                {containers === 0
                    ? "no containers"
                    : `${containers} ${
                        containers === 1
                            ? "container"
                            : "containers"
                    } available`}
            </div>

            {/* DIVIDER */}
            <div
                style={{
                    marginTop: 12,
                    width: "100%",
                    height: 1,
                    background:
                        "var(--border)",
                }}
            />

            {/* ENGINE STATUS */}
            <div
                className="mono"
                style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: running
                        ? "var(--success)"
                        : "var(--text-muted)",
                }}
            >
                <span>
                    {running
                        ? "●"
                        : "○"}
                </span>

                <span>
                    docker engine{" "}
                    {running
                        ? "operational"
                        : "offline"}
                </span>
            </div>
        </Panel>
    );
}

/* =========================================================
   SYSTEM SPEC
   ========================================================= */

function SystemSpec({
                        icon: Icon,
                        label,
                        value,
                        sub,
                        flex = "1 1 220px",
                        className,
                    }) {
    return (
        <Panel
            className={className}
            style={{
                padding: "17px 20px",
                flex,
                minWidth: 200,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 13,
                }}
            >
                <div
                    style={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border)",
                        background:
                            "var(--background-secondary)",
                        boxSizing: "border-box",
                    }}
                >
                    <Icon
                        size={14}
                        color="var(--text-secondary)"
                    />
                </div>

                <span className="eyebrow">
                    {label}
                </span>
            </div>

            <div
                className="mono crt-glow"
                style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: "var(--text)",
                    wordBreak: "break-word",
                }}
            >
                {value}
            </div>

            {sub && (
                <div
                    className="mono"
                    style={{
                        marginTop: 6,
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: "var(--text-muted)",
                    }}
                >
                    {sub}
                </div>
            )}
        </Panel>
    );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function Dashboard() {
    const [system, setSystem] =
        useState(null);

    const [jobs, setJobs] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);

    const load = useCallback(
        async () => {
            setLoading(true);
            setError(null);

            try {
                const [sys, jb] =
                    await Promise.all([
                        api.system.overview(),
                        api.jobs.list(1, 6),
                    ]);

                setSystem(sys);
                setJobs(jb.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const pollMs = useRef(
        jitteredInterval(8000)
    ).current;

    useEffect(() => {
        load();

        const id = setInterval(
            load,
            pollMs
        );

        return () =>
            clearInterval(id);
    }, [load, pollMs]);

    const cpu =
        system?.cpu;

    const mem =
        system?.memory;

    const disk =
        system?.disk?.[0];

    const os =
        system?.os;

    const ram =
        mem?.ram;

    const swap =
        mem?.swap;

    return (
        <div>
            {/* =================================================
                HEADER
               ================================================= */}

            <PageHeader
                eyebrow="overview"
                title="dashboard"
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

            {/* =================================================
                ERROR
               ================================================= */}

            {error && (
                <Panel
                    style={{
                        padding: 14,
                        marginBottom: 24,
                        borderColor:
                            "var(--danger)",
                        color:
                            "var(--danger)",
                        fontSize: 13,
                    }}
                    className="mono"
                >
                    error: {error}
                </Panel>
            )}

            {/* =================================================
                HARDWARE
               ================================================= */}

            <SectionLabel index="01">
                hardware
            </SectionLabel>

            <div
                className="spec-grid"
                style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 36,
                    width: "100%",
                }}
            >
                {/* CPU */}
                <Spec
                    className="fade-in-up stagger-1"
                    icon={Cpu}
                    label="cpu"
                    value={
                        cpu
                            ? `${cpu.currentLoad.toFixed(
                                0
                            )}%`
                            : "—"
                    }
                    sub={
                        cpu
                            ? `${cpu.cores} cores`
                            : ""
                    }
                    pct={
                        cpu?.currentLoad
                    }
                />

                {/* RAM */}
                <Spec
                    className="fade-in-up stagger-2"
                    icon={MemoryStick}
                    label="memory"
                    value={
                        ram
                            ? `${ram.usedPercent.toFixed(
                                0
                            )}%`
                            : "—"
                    }
                    sub={
                        ram
                            ? `${fmtBytes(
                                ram.used
                            )} / ${fmtBytes(
                                ram.total
                            )}`
                            : ""
                    }
                    pct={
                        ram?.usedPercent
                    }
                />

                {/* SWAP */}
                <Spec
                    className="fade-in-up stagger-3"
                    icon={ArrowDownUp}
                    label="swap"
                    value={
                        swap
                            ? `${swap.usedPercent.toFixed(
                                0
                            )}%`
                            : "—"
                    }
                    sub={
                        swap
                            ? `${fmtBytes(
                                swap.used
                            )} / ${fmtBytes(
                                swap.total
                            )}`
                            : ""
                    }
                    pct={
                        swap?.usedPercent
                    }
                />

                {/* DISK */}
                <Spec
                    className="fade-in-up stagger-4"
                    icon={HardDrive}
                    label="disk"
                    value={
                        disk
                            ? `${disk.usePercent.toFixed(
                                0
                            )}%`
                            : "—"
                    }
                    sub={
                        disk
                            ? `${fmtBytes(
                                disk.used
                            )} / ${fmtBytes(
                                disk.size
                            )}`
                            : ""
                    }
                    pct={
                        disk?.usePercent
                    }
                />

                {/* DOCKER */}
                <DockerSpec
                    className="fade-in-up stagger-5"
                    docker={
                        system?.docker
                    }
                />
            </div>

            {/* =================================================
                SYSTEM
               ================================================= */}

            {os && (
                <div className="fade-in-up stagger-6">
                    <SectionLabel index="02">
                        system
                    </SectionLabel>

                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            marginBottom: 36,
                            width: "100%",
                        }}
                    >
                        {/* DISTRO */}
                        <SystemSpec
                            icon={Monitor}
                            label="distro"
                            value={
                                os.distro
                            }
                            sub={
                                os.release
                            }
                            flex="1 1 250px"
                            className="fade-in-up stagger-6"
                        />

                        {/* ARCHITECTURE */}
                        <SystemSpec
                            icon={Cpu}
                            label="architecture"
                            value={
                                os.arch
                            }
                            sub="system architecture"
                            flex="1 1 210px"
                            className="fade-in-up stagger-6"
                        />

                        {/* KERNEL */}
                        <SystemSpec
                            icon={Terminal}
                            label="kernel"
                            value={
                                os.kernel
                            }
                            sub="linux kernel"
                            flex="2 1 300px"
                            className="fade-in-up stagger-6"
                        />
                    </div>
                </div>
            )}

            {/* =================================================
                RUNNING CONTAINERS
               ================================================= */}

            {system?.docker
                ?.containers?.length > 0 && (
                <div className="fade-in-up stagger-6">
                    <SectionLabel index="03">
                        running containers
                    </SectionLabel>

                    <Panel
                        style={{
                            marginBottom: 36,
                        }}
                    >
                        {system.docker.containers.map(
                            (c, i) => (
                                <div
                                    key={c.ID}
                                    className="mono"
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        gap: 12,
                                        padding:
                                            "10px 20px",
                                        borderTop:
                                            i === 0
                                                ? "none"
                                                : "1px solid var(--border)",
                                        fontSize: 13,
                                    }}
                                >
                                    <span
                                        style={{
                                            color:
                                                "var(--success)",
                                        }}
                                    >
                                        ●
                                    </span>

                                    <span
                                        style={{
                                            minWidth: 160,
                                        }}
                                    >
                                        {c.Names}
                                    </span>

                                    <span
                                        style={{
                                            color:
                                                "var(--text-secondary)",
                                        }}
                                    >
                                        {c.State}
                                    </span>

                                    <span
                                        style={{
                                            color:
                                                "var(--text-muted)",
                                            marginLeft:
                                                "auto",
                                        }}
                                    >
                                        {c.Ports}
                                    </span>
                                </div>
                            )
                        )}
                    </Panel>
                </div>
            )}

            {/* =================================================
                RECENT JOBS
               ================================================= */}

            <div className="fade-in-up stagger-6">
                <SectionLabel index="04">
                    recent jobs
                </SectionLabel>

                <Panel>
                    {jobs.length === 0 && (
                        <EmptyState>
                            no jobs yet
                        </EmptyState>
                    )}

                    {jobs
                        .slice(0, 6)
                        .map((j, i) => (
                            <Link
                                key={j.id}
                                to={`/jobs/${j.id}`}
                                className="mono"
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "center",
                                    padding:
                                        "13px 20px",
                                    borderTop:
                                        i === 0
                                            ? "none"
                                            : "1px solid var(--border)",
                                    fontSize: 13,
                                }}
                            >
                                <div
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        gap: 10,
                                    }}
                                >
                                    <span>
                                        {j.action}
                                    </span>

                                    <span
                                        style={{
                                            fontSize:
                                                11.5,
                                            color:
                                                "var(--text-muted)",
                                        }}
                                    >
                                        #
                                        {j.id.slice(
                                            0,
                                            8
                                        )}
                                    </span>
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        gap: 18,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize:
                                                12,
                                            color:
                                                "var(--text-muted)",
                                        }}
                                    >
                                        {timeAgo(
                                            j.created_at
                                        )}
                                    </span>

                                    <StatusBadge
                                        status={
                                            j.status
                                        }
                                    />
                                </div>
                            </Link>
                        ))}
                </Panel>
            </div>
        </div>
    );
}