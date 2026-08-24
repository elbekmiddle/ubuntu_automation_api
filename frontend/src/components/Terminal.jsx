import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TerminalSquare, Power, Maximize2, Minimize2 } from "lucide-react";
import { connectClientSocket } from "../lib/socket";
import { Panel, Button } from "./ui";

const XTERM_THEME = {
  background: "#0C0C0B",
  foreground: "#D4D4D4",
  cursor: "#5FD3E0",
  selectionBackground: "#3FA6BE55",
  black: "#0C0C0B",
  red: "#F0847E",
  green: "#6FDB93",
  yellow: "#F0C97A",
  blue: "#5FD3E0",
  magenta: "#C792EA",
  cyan: "#5FD3E0",
  white: "#D4D4D4",
};

/** appId — hozir ochilgan device; faqat `read_write` va online device'larda ishlaydi. */
export default function DeviceTerminal({ appId, canConnect }) {
  const containerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitRef = useRef(null);
  const sessionIdRef = useRef(null);
  const socketRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | connecting | open | closed | error
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const term = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      theme: XTERM_THEME,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    // Birinchi `fit()`ni requestAnimationFrame ichida chaqiramiz — DOM
    // layout tugagandan keyin ishlasin. Bu xterm.js'ning o'z ichki
    // ResizeObserver'i bilan poyga holatini kamaytiradi: React
    // StrictMode ostida bu effect ikki marta (mount→cleanup→mount)
    // ishga tushganda, birinchi instansning dispose()i ikkinchisining
    // fit/resize callback'lari bilan to'qnashib "this._renderer.value is
    // undefined" xatosini berishi mumkin edi.
    const rafId = requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        // Terminal shu orada allaqachon dispose bo'lgan bo'lishi mumkin — e'tiborsiz qoldiramiz.
      }
    });

    xtermRef.current = term;
    fitRef.current = fit;

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        // xterm allaqachon dispose bo'lgan bo'lishi mumkin.
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      xtermRef.current = null;
      fitRef.current = null;
      // dispose()ni keyingi macrotaskka suramiz — xterm.js ichidagi
      // pending ResizeObserver/rAF callback'lari birinchi ulgurib
      // bajarilsin, shundan keyingina terminal butunlay yo'q qilinadi.
      setTimeout(() => {
        try {
          term.dispose();
        } catch {
          // allaqachon dispose bo'lgan bo'lishi mumkin.
        }
      }, 0);
    };
  }, []);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return undefined;

    let disposed = false;
    let dataListener = null;

    function teardown() {
      const socket = socketRef.current;
      const sessionId = sessionIdRef.current;
      if (socket && sessionId) {
        socket.emit("terminal:close", { sessionId });
      }
      if (socket) {
        socket.off("terminal:data", onData);
        socket.off("terminal:exit", onExit);
        socket.off("connect_error", onConnectError);
        socket.off("disconnect", onDisconnect);
      }
      sessionIdRef.current = null;
    }

    function onData(payload) {
      if (payload.sessionId === sessionIdRef.current) term.write(payload.data);
    }

    function onExit(payload) {
      if (payload.sessionId !== sessionIdRef.current) return;
      term.writeln("\r\n\x1b[2m[session ended]\x1b[0m");
      setStatus("closed");
      sessionIdRef.current = null;
    }

    function onConnectError(err) {
      if (disposed) return;
      setStatus("error");
      setError(`Ulanib bo'lmadi: ${err?.message ?? "server javob bermayapti"}`);
    }

    function onDisconnect(reason) {
      if (disposed) return;
      sessionIdRef.current = null;
      setStatus("error");
      setError(`Ulanish uzildi (${reason})`);
    }

    function open() {
      const socket = connectClientSocket();
      socketRef.current = socket;
      setStatus("connecting");
      setError(null);

      const cols = term.cols;
      const rows = term.rows;

      const doOpen = () => {
        // Ack 8 soniyada kelmasa — cheksiz "connecting" holatida qolib
        // ketmaslik uchun aniq xato ko'rsatamiz (masalan token yaroqsiz
        // bo'lib socket handshake vaqtida disconnect qilingan bo'lishi mumkin).
        socket.timeout(8000).emit("terminal:open", { appId, cols, rows }, (timeoutErr, ack) => {
          if (timeoutErr) {
            if (!disposed) {
              setStatus("error");
              setError("Server javob bermadi (timeout) — qurilma agenti ishlayaptimi, tekshiring.");
            }
            return;
          }
          if (!ack || ack.event === "terminal:error") {
            if (!disposed) {
              setStatus("error");
              setError(ack?.data?.message ?? "Terminal ochilmadi");
            }
            return;
          }
          if (disposed) {
            // Bu effect allaqachon tozalangan (masalan React StrictMode'ning
            // mount→cleanup→mount tsikli) — server ulgurib sessiya ochib
            // qo'ygan bo'lsa, darhol yopamiz, aks holda agentda "osilib
            // qolgan" pty process qoladi.
            socket.emit("terminal:close", { sessionId: ack.data.sessionId });
            return;
          }
          sessionIdRef.current = ack.data.sessionId;
          setStatus("open");
          term.focus();
        });
      };

      if (socket.connected) doOpen();
      else socket.once("connect", doOpen);

      socket.on("connect_error", onConnectError);
      socket.on("disconnect", onDisconnect);
      socket.on("terminal:data", onData);
      socket.on("terminal:exit", onExit);
    }

    dataListener = term.onData((data) => {
      const socket = socketRef.current;
      const sessionId = sessionIdRef.current;
      if (socket && sessionId) socket.emit("terminal:input", { sessionId, data });
    });

    if (canConnect) open();
    else setStatus("idle");

    return () => {
      disposed = true;
      dataListener?.dispose();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, canConnect]);

  const reconnect = () => {
    xtermRef.current?.reset();
    sessionIdRef.current = null;
    const socket = socketRef.current ?? connectClientSocket();
    socketRef.current = socket;
    setStatus("connecting");
    setError(null);
    const term = xtermRef.current;
    const send = () =>
      socket.timeout(8000).emit("terminal:open", { appId, cols: term.cols, rows: term.rows }, (timeoutErr, ack) => {
        if (timeoutErr) {
          setStatus("error");
          setError("Server javob bermadi (timeout) — qurilma agenti ishlayaptimi, tekshiring.");
          return;
        }
        if (!ack || ack.event === "terminal:error") {
          setStatus("error");
          setError(ack?.data?.message ?? "Terminal ochilmadi");
          return;
        }
        sessionIdRef.current = ack.data.sessionId;
        setStatus("open");
        term.focus();
      });
    if (socket.connected) send();
    else socket.once("connect", send);
  };

  // Fullscreen holati o'zgarganda konteyner o'lchami DOM'da darhol
  // yangilanmaydi (CSS transition/layout keyingi frame'da tugaydi) —
  // shuning uchun `fit()`ni requestAnimationFrame ichida chaqiramiz va
  // yangi cols/rows'ni backend'ga (pty'ga) `terminal:resize` orqali
  // yetkazamiz, aks holda shell o'zining eski o'lchamida qolib, matn
  // noto'g'ri joyларда o'ralib qoladi.
  useEffect(() => {
    const fit = fitRef.current;
    const term = xtermRef.current;
    if (!fit || !term) return undefined;

    const rafId = requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        // terminal dispose bo'lgan bo'lishi mumkin.
      }
      const socket = socketRef.current;
      const sessionId = sessionIdRef.current;
      if (socket && sessionId) {
        socket.emit("terminal:resize", { sessionId, cols: term.cols, rows: term.rows });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [fullscreen]);

  // Ctrl+Shift+F — fullscreen'ni yoqish/o'chirish; Escape — fullscreen'dan chiqish.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setFullscreen((v) => !v);
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // Fullscreen paytida orqadagi sahifa scroll bo'lmasin — aks holda
  // foydalanuvchi pastga suralsa terminal panel joyidan siljib ko'rinishi
  // mumkin (rasmda ko'ringan yuqoridagi tirqish shundan edi).
  useEffect(() => {
    if (!fullscreen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  return (
    <>
      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 190,
          }}
        />
      )}
      <Panel
      style={
        fullscreen
          ? {
              padding: 0,
              overflow: "hidden",
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
            }
          : { padding: 0, overflow: "hidden" }
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
        className="mono"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
          <TerminalSquare size={14} />
          real-time terminal
          <TerminalStatus status={status} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {(status === "closed" || status === "error") && canConnect && (
            <Button variant="ghost" icon={Power} onClick={reconnect}>
              reconnect
            </Button>
          )}
          {canConnect && (
            <Button
              variant="ghost"
              icon={fullscreen ? Minimize2 : Maximize2}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (Ctrl+Shift+F)"}
              onClick={() => setFullscreen((v) => !v)}
            >
              {fullscreen ? "exit" : "fullscreen"}
            </Button>
          )}
        </div>
      </div>

      {!canConnect && (
        <div className="mono" style={{ padding: "16px 14px", fontSize: 12.5, color: "var(--text-muted)" }}>
          Terminal faqat device online va "read_write" ruxsatga ega bo'lganda ishlaydi.
        </div>
      )}
      {error && (
        <div className="mono" style={{ padding: "8px 14px", fontSize: 12, color: "var(--danger)" }}>
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={
          fullscreen
            ? { padding: "8px 10px", flex: 1, minHeight: 0 }
            : { padding: canConnect ? "8px 10px" : 0, height: canConnect ? 380 : 0 }
        }
      />
      </Panel>
    </>
  );
}

function TerminalStatus({ status }) {
  const map = {
    idle: { label: "idle", color: "var(--text-muted)" },
    connecting: { label: "connecting…", color: "var(--warning)" },
    open: { label: "connected", color: "var(--success)" },
    closed: { label: "disconnected", color: "var(--text-muted)" },
    error: { label: "error", color: "var(--danger)" },
  };
  const s = map[status] ?? map.idle;
  return (
    <span style={{ color: s.color, fontSize: 11 }}>· {s.label}</span>
  );
}
