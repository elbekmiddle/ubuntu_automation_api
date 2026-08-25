import {
    MessageCircle,
    Globe,
    Flame,
    Hexagon,
    Database,
    Zap,
    Leaf,
    Container,
    KeyRound,
    Server,
    Coffee,
    Code2,
    Terminal,
    Plug,
} from "lucide-react";

// Jarayon (process) nomi bo'yicha ikonka + rang + chiroyli label.
// Bitta xizmatning bir nechta odatiy nomi bo'lishi mumkin (masalan
// "idea" ham, "jetbrains-toolb" ham JetBrains'ga tegishli) — shuning
// uchun har bir yozuv bir nechta pattern'ni qamrab oladi.
const PROCESS_MAP = [
    { test: /telegram/i, icon: MessageCircle, color: "#29a9eb", label: "Telegram" },
    { test: /firefox/i, icon: Flame, color: "#ff7139", label: "Firefox" },
    { test: /(chrome|chromium|cef_server)/i, icon: Globe, color: "#4285f4", label: "Chrome" },
    { test: /^node$/i, icon: Hexagon, color: "#5fa04e", label: "Node.js" },
    { test: /(postgres|postgresql)/i, icon: Database, color: "#336791", label: "PostgreSQL" },
    { test: /redis/i, icon: Zap, color: "#dc382d", label: "Redis" },
    { test: /mysql/i, icon: Database, color: "#4479a1", label: "MySQL" },
    { test: /mongo/i, icon: Leaf, color: "#47a248", label: "MongoDB" },
    { test: /(docker|containerd)/i, icon: Container, color: "#2496ed", label: "Docker" },
    { test: /^ssh$/i, icon: KeyRound, color: "#8a8a8a", label: "SSH" },
    { test: /nginx/i, icon: Server, color: "#009639", label: "nginx" },
    { test: /java/i, icon: Coffee, color: "#e76f00", label: "Java" },
    { test: /(idea|jetbrains|pycharm|webstorm|goland|clion|rider)/i, icon: Code2, color: "#fe7dac", label: "JetBrains" },
    { test: /code/i, icon: Code2, color: "#007acc", label: "VS Code" },
    { test: /(dnsmasq|resolve|systemd-resolved)/i, icon: Globe, color: "#8a8a8a", label: "DNS" },
];

export function getProcessMeta(processName) {
    if (!processName) return { icon: Plug, color: "var(--text-secondary)", label: null };
    const hit = PROCESS_MAP.find((p) => p.test.test(processName));
    if (hit) return hit;
    return { icon: Terminal, color: "var(--text-secondary)", label: null };
}
