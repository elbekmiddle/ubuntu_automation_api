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
    MonitorSmartphone,
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
    const value = Number(n);

    if (!Number.isFinite(value) || value < 0) {
        return "—";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];

    let i = 0;
    let v = value;

    while (
        v >= 1024 &&
        i < units.length - 1
        ) {
        v /= 1024;
        i++;
    }

    return `${v.toFixed(1)} ${units[i]}`;
}

function fmtPercent(value, digits = 0) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return `${n.toFixed(digits)}%`;
}

function safeNumber(value, fallback = null) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function timeAgo(iso) {
    if (!iso) return "—";

    const timestamp =
        new Date(iso).getTime();

    if (!Number.isFinite(timestamp)) {
        return "—";
    }

    const s = Math.max(
        0,
        Math.floor(
            (Date.now() - timestamp) /
            1000
        )
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

/*
 * Backend response ba'zan:
 *
 * {
 *   cpu: {...},
 *   memory: {...}
 * }
 *
 * yoki:
 *
 * {
 *   data: {
 *     cpu: {...}
 *   }
 * }
 *
 * bo'lishi mumkin.
 *
 * Shu sabab frontend bitta joyda normalize qiladi.
 */
function normalizeSystemResponse(response) {
    if (!response) {
        return null;
    }

    if (response.data?.cpu || response.data?.memory) {
        return response.data;
    }

    if (response.result?.cpu || response.result?.memory) {
        return response.result;
    }

    return response;
}

function normalizeListResponse(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    return [];
}

function normalizeDisk(system) {
    const disk = system?.disk;

    if (Array.isArray(disk)) {
        return disk[0] ?? null;
    }

    if (disk && typeof disk === "object") {
        return disk;
    }

    return null;
}

function getCpuPercent(system) {
    return safeNumber(
        system?.cpu?.currentLoad ??
        system?.cpu?.load ??
        system?.cpu?.usage
    );
}

function getMemoryPercent(system) {
    return safeNumber(
        system?.memory?.ram?.usedPercent ??
        system?.memory?.usedPercent ??
        system?.memory?.usedPercentage
    );
}

function getDiskPercent(system) {
    const disk = normalizeDisk(system);

    return safeNumber(
        disk?.usePercent ??
        disk?.usedPercent ??
        disk?.usagePercent
    );
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
        Math.max(
            0,
            safeNumber(pct, 0)
        )
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
    const containers = Array.isArray(
        docker?.containers
    )
        ? docker.containers
        : [];

    const running =
        docker?.running === true ||
        docker?.status === "running";

    const installed =
        docker?.installed !== false;

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

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                    {installed
                        ? containers.length
                        : "—"}
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
                        {!installed
                            ? "not installed"
                            : running
                                ? "running"
                                : "stopped"}
                    </span>
                </div>
            </div>

            <div
                className="mono"
                style={{
                    marginTop: 8,
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                }}
            >
                {!installed
                    ? "docker engine not installed"
                    : containers.length === 0
                        ? "no containers"
                        : `${containers.length} ${
                            containers.length === 1
                                ? "container"
                                : "containers"
                        } available`}
            </div>

            <div
                style={{
                    marginTop: 12,
                    width: "100%",
                    height: 1,
                    background: "var(--border)",
                }}
            />

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
                    {!installed
                        ? "not installed"
                        : running
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
                {value || "—"}
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
   CONNECTED DEVICE
   ========================================================= */

function MiniBar({ pct = 0 }) {
    const safePct = Math.min(
        100,
        Math.max(
            0,
            safeNumber(pct, 0)
        )
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
                width: "100%",
                height: 5,
                background: "var(--border)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    width: `${safePct}%`,
                    height: "100%",
                    background: color,
                    transition:
                        "width 0.3s ease",
                }}
            />
        </div>
    );
}

function MiniStat({
                      label,
                      pct,
                  }) {
    return (
        <div
            style={{
                flex: "1 1 0",
                minWidth: 0,
            }}
        >
            <div
                className="mono"
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    fontSize: 10.5,
                    color:
                        "var(--text-muted)",
                    marginBottom: 4,
                }}
            >
                <span>{label}</span>

                <span>
                    {pct != null
                        ? `${Math.round(pct)}%`
                        : "—"}
                </span>
            </div>

            <MiniBar pct={pct} />
        </div>
    );
}

function DeviceCard({
                        app,
                        system,
                        isPrimary,
                        className,
                    }) {
    const online =
        app.status === "online";

    const metrics =
        app.last_metrics ?? {};

    /*
     * Agar /apps response'da last_metrics bo'lmasa,
     * primary app uchun dashboarddagi system overview'dan
     * foydalanamiz.
     */
    const cpuPct =
        safeNumber(
            metrics.cpu
        ) ??
        (isPrimary
            ? getCpuPercent(system)
            : null);

    const memPct =
        safeNumber(
            metrics.memory?.usedPercent
        ) ??
        (isPrimary
            ? getMemoryPercent(system)
            : null);

    const diskPct =
        safeNumber(
            metrics.disk?.usedPercent
        ) ??
        (isPrimary
            ? getDiskPercent(system)
            : null);

    return (
        <Panel
            className={className}
            style={{
                padding: 18,
                flex: "1 1 220px",
                minWidth: 220,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        "space-between",
                    marginBottom: 10,
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow:
                            "ellipsis",
                        whiteSpace:
                            "nowrap",
                    }}
                >
                    {app.name}
                </div>

                <StatusBadge
                    status={
                        online
                            ? "online"
                            : "offline"
                    }
                />
            </div>

            <div
                className="mono"
                style={{
                    fontSize: 11,
                    color:
                        "var(--text-muted)",
                    marginBottom: 14,
                    overflow: "hidden",
                    textOverflow:
                        "ellipsis",
                    whiteSpace:
                        "nowrap",
                }}
            >
                {app.hostname
                    ? [
                        app.hostname,
                        app.os_platform,
                        app.os_release,
                    ]
                        .filter(Boolean)
                        .join(" · ")
                    : "waiting for agent to register..."}
            </div>

            {online ? (
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                    }}
                >
                    <MiniStat
                        label="cpu"
                        pct={cpuPct}
                    />

                    <MiniStat
                        label="mem"
                        pct={memPct}
                    />

                    <MiniStat
                        label="disk"
                        pct={diskPct}
                    />
                </div>
            ) : (
                <div
                    className="mono"
                    style={{
                        fontSize: 11,
                        color:
                            "var(--text-muted)",
                    }}
                >
                    last seen{" "}
                    {timeAgo(
                        app.last_seen_at
                    )}
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

    const [apps, setApps] =
        useState([]);

    const [primaryApp, setPrimaryApp] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);

    /*
     * Bir polling request hali tugamasdan ikkinchisi
     * boshlanib ketmasligi uchun.
     */
    const loadingRef =
        useRef(false);

    /*
     * Component unmount bo'lgandan keyin
     * state update qilmaslik uchun.
     */
    const mountedRef =
        useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    /* =====================================================
       LOAD
       ===================================================== */

    const load = useCallback(
        async () => {
            if (loadingRef.current) {
                return;
            }

            loadingRef.current = true;

            if (mountedRef.current) {
                setLoading(true);
                setError(null);
            }

            try {
                /*
                 * Apps va jobs bir vaqtda olinadi.
                 */
                const [appsResponse, jobsResponse] =
                    await Promise.all([
                        api.apps.list(),
                        api.jobs.list(1, 6),
                    ]);

                const appsList =
                    normalizeListResponse(
                        appsResponse
                    );

                const jobsList =
                    normalizeListResponse(
                        jobsResponse
                    );

                if (!mountedRef.current) {
                    return;
                }

                setApps(appsList);
                setJobs(jobsList);

                /*
                 * Avval online app.
                 * Online bo'lmasa listdagi birinchi app.
                 */
                const primary =
                    appsList.find(
                        (app) =>
                            app.status ===
                            "online"
                    ) ??
                    appsList[0] ??
                    null;

                setPrimaryApp(primary);

                /*
                 * App yo'q bo'lsa system ham yo'q.
                 */
                if (!primary) {
                    setSystem(null);
                    return;
                }

                console.log(
                    "[screenctl] primary app:",
                    primary
                );

                /*
                 * Aynan tanlangan machine'ning
                 * system overview'ini olamiz.
                 */
                const systemResponse =
                    await api.apps.system.overview(
                        primary.id
                    );

                const normalizedSystem =
                    normalizeSystemResponse(
                        systemResponse
                    );

                console.log(
                    "[screenctl] system response:",
                    systemResponse
                );

                console.log(
                    "[screenctl] normalized system:",
                    normalizedSystem
                );

                if (!mountedRef.current) {
                    return;
                }

                setSystem(
                    normalizedSystem
                );
            } catch (e) {
                console.error(
                    "[screenctl] dashboard load failed:",
                    e
                );

                if (!mountedRef.current) {
                    return;
                }

                setError(
                    e?.message ||
                    "failed to load dashboard"
                );

                /*
                 * Error paytida eski system
                 * ma'lumotini saqlab qolamiz.
                 *
                 * Bu UI'ni birdan "—" ga tushirib yubormaydi.
                 */
            } finally {
                loadingRef.current = false;

                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        },
        []
    );

    /* =====================================================
       POLLING
       ===================================================== */

    const pollMs = useRef(
        jitteredInterval(8000)
    ).current;

    useEffect(() => {
        load();

        const intervalId =
            setInterval(
                load,
                pollMs
            );

        return () => {
            clearInterval(
                intervalId
            );
        };
    }, [
        load,
        pollMs,
    ]);

    /* =====================================================
       SYSTEM DATA
       ===================================================== */

    const cpu =
        system?.cpu ?? null;

    const mem =
        system?.memory ?? null;

    const ram =
        mem?.ram ?? null;

    const swap =
        mem?.swap ?? null;

    const disk =
        normalizeDisk(system);

    const os =
        system?.os ?? null;

    const docker =
        system?.docker ?? null;

    const cpuPercent =
        getCpuPercent(system);

    const memoryPercent =
        getMemoryPercent(system);

    const diskPercent =
        getDiskPercent(system);

    const dockerContainers =
        Array.isArray(
            docker?.containers
        )
            ? docker.containers
            : [];

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
                {primaryApp &&
                    ` · ${primaryApp.name}`}
            </SectionLabel>

            {!primaryApp ? (
                <Panel
                    style={{
                        marginBottom: 36,
                    }}
                >
                    <EmptyState>
                        no connected device to show hardware stats for
                    </EmptyState>
                </Panel>
            ) : (
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
                            cpuPercent != null
                                ? fmtPercent(
                                    cpuPercent
                                )
                                : "—"
                        }
                        sub={
                            cpu
                                ? [
                                    cpu.brand ??
                                    cpu.manufacturer,
                                    cpu.cores != null
                                        ? `${cpu.cores} cores`
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : ""
                        }
                        pct={
                            cpuPercent
                        }
                    />

                    {/* RAM */}

                    <Spec
                        className="fade-in-up stagger-2"
                        icon={MemoryStick}
                        label="memory"
                        value={
                            memoryPercent != null
                                ? fmtPercent(
                                    memoryPercent
                                )
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
                            memoryPercent
                        }
                    />

                    {/* SWAP */}

                    <Spec
                        className="fade-in-up stagger-3"
                        icon={ArrowDownUp}
                        label="swap"
                        value={
                            swap?.usedPercent != null
                                ? fmtPercent(
                                    swap.usedPercent
                                )
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
                            safeNumber(
                                swap?.usedPercent
                            )
                        }
                    />

                    {/* DISK */}

                    <Spec
                        className="fade-in-up stagger-4"
                        icon={HardDrive}
                        label="disk"
                        value={
                            diskPercent != null
                                ? fmtPercent(
                                    diskPercent
                                )
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
                            diskPercent
                        }
                    />

                    {/* DOCKER */}

                    <DockerSpec
                        className="fade-in-up stagger-5"
                        docker={
                            docker
                        }
                    />
                </div>
            )}

            {/* =================================================
                CONNECTED DEVICES
               ================================================= */}

            <div className="fade-in-up stagger-6">
                <SectionLabel index="02">
                    connected devices (
                    {apps.length}
                    )
                </SectionLabel>

                {apps.length === 0 ? (
                    <Panel
                        style={{
                            marginBottom: 36,
                        }}
                    >
                        <EmptyState>
                            <div
                                style={{
                                    display:
                                        "flex",
                                    flexDirection:
                                        "column",
                                    alignItems:
                                        "center",
                                    gap: 6,
                                }}
                            >
                                <MonitorSmartphone
                                    size={18}
                                    color="var(--text-muted)"
                                />

                                <span>
                                    no devices connected yet
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
                                        screenctl app connect
                                    </code>{" "}
                                    on a machine to add it here
                                </span>
                            </div>
                        </EmptyState>
                    </Panel>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            marginBottom: 36,
                            width: "100%",
                        }}
                    >
                        {apps.map(
                            (app) => (
                                <DeviceCard
                                    key={
                                        app.id
                                    }
                                    app={app}
                                    system={
                                        system
                                    }
                                    isPrimary={
                                        app.id ===
                                        primaryApp?.id
                                    }
                                    className="fade-in-up"
                                />
                            )
                        )}
                    </div>
                )}
            </div>

            {/* =================================================
                SYSTEM
               ================================================= */}

            {os && (
                <div className="fade-in-up stagger-6">
                    <SectionLabel index="03">
                        system
                        {primaryApp &&
                            ` · ${primaryApp.name}`}
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

            {dockerContainers.length > 0 && (
                <div className="fade-in-up stagger-6">
                    <SectionLabel index="04">
                        running containers
                        {primaryApp &&
                            ` · ${primaryApp.name}`}
                    </SectionLabel>

                    <Panel
                        style={{
                            marginBottom: 36,
                        }}
                    >
                        {dockerContainers.map(
                            (container, index) => {
                                const id =
                                    container.ID ??
                                    container.Id ??
                                    container.id ??
                                    `container-${index}`;

                                const name =
                                    container.Names ??
                                    container.Name ??
                                    container.name ??
                                    "unknown";

                                const state =
                                    container.State ??
                                    container.Status ??
                                    container.state ??
                                    "unknown";

                                const ports =
                                    container.Ports ??
                                    container.ports ??
                                    "";

                                return (
                                    <div
                                        key={id}
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
                                                index === 0
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
                                            {name}
                                        </span>

                                        <span
                                            style={{
                                                color:
                                                    "var(--text-secondary)",
                                            }}
                                        >
                                            {state}
                                        </span>

                                        <span
                                            style={{
                                                color:
                                                    "var(--text-muted)",
                                                marginLeft:
                                                    "auto",
                                            }}
                                        >
                                            {ports}
                                        </span>
                                    </div>
                                );
                            }
                        )}
                    </Panel>
                </div>
            )}

            {/* =================================================
                RECENT JOBS
               ================================================= */}

            <div className="fade-in-up stagger-6">
                <SectionLabel index="05">
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
                        .map(
                            (job, index) => (
                                <Link
                                    key={
                                        job.id
                                    }
                                    to={`/jobs/${job.id}`}
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
                                            index ===
                                            0
                                                ? "none"
                                                : "1px solid var(--border)",
                                        fontSize: 13,
                                        textDecoration:
                                            "none",
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
                                            {
                                                job.action
                                            }
                                        </span>

                                        {job.id && (
                                            <span
                                                style={{
                                                    fontSize:
                                                        11.5,
                                                    color:
                                                        "var(--text-muted)",
                                                }}
                                            >
                                                #
                                                {String(
                                                    job.id
                                                ).slice(
                                                    0,
                                                    8
                                                )}
                                            </span>
                                        )}
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
                                                job.created_at
                                            )}
                                        </span>

                                        <StatusBadge
                                            status={
                                                job.status
                                            }
                                        />
                                    </div>
                                </Link>
                            )
                        )}
                </Panel>
            </div>
        </div>
    );
}