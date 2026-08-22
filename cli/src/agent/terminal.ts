import type { Socket } from 'socket.io-client';
import * as os from 'node:os';
import type { IPty } from 'node-pty';

// `node-pty` ixtiyoriy (native) dependency — build muhitida compile bo'lmasa
// ham agent umuman ishlashda davom etsin, faqat terminal feature o'chirilgan
// bo'ladi. Shuning uchun dynamic import() va try/catch ichida (ESM'da
// require() ishlatib bo'lmaydi).
let ptyModule: typeof import('node-pty') | null = null;
try {
    ptyModule = await import('node-pty');
} catch {
    ptyModule = null;
}

interface TerminalStartPayload {
    sessionId: string;
    cols?: number;
    rows?: number;
}

interface TerminalInputPayload {
    sessionId: string;
    data: string;
}

interface TerminalResizePayload {
    sessionId: string;
    cols: number;
    rows: number;
}

interface TerminalClosePayload {
    sessionId: string;
}

/**
 * Har bir sessionId uchun bitta interaktiv pty (pseudo-terminal) ochadi.
 * `sudo`, parol so'rovlari, rangli output — hammasi haqiqiy TTY orqali
 * ishlaydi, xuddi SSH sessiyasidagidek. Agent shu mashinada qaysi user
 * huquqi bilan ishga tushirilgan bo'lsa (masalan systemd service user),
 * terminal ham o'sha user nomidan ochiladi — `sudo` uchun parol yoki
 * NOPASSWD sozlamasi shu userga bog'liq.
 */
export function registerTerminalHandlers(socket: Socket, log: (line: string) => void): () => void {
    const sessions = new Map<string, IPty>();

    function shellCommand(): { file: string; args: string[] } {
        if (process.platform === 'win32') {
            return { file: 'powershell.exe', args: [] };
        }
        const shell = process.env.SHELL && process.env.SHELL.length > 0 ? process.env.SHELL : '/bin/bash';
        // Login shell (-l) — PATH, aliases va profil sozlamalari to'g'ri yuklansin.
        return { file: shell, args: ['-l'] };
    }

    function start(payload: TerminalStartPayload) {
        const { sessionId } = payload;
        if (!ptyModule) {
            socket.emit('terminal:output', {
                sessionId,
                data:
                    '\r\n\x1b[31mReal-time terminal ushbu qurilmada ishlamaydi: "node-pty" o\'rnatilmagan.\x1b[0m\r\n' +
                    'Agent papkasida ishga tushiring: npm install\r\n',
            });
            socket.emit('terminal:exit', { sessionId, exitCode: 1 });
            return;
        }

        const { file, args } = shellCommand();
        const term = ptyModule.spawn(file, args, {
            name: 'xterm-256color',
            cols: payload.cols ?? 80,
            rows: payload.rows ?? 24,
            cwd: os.homedir(),
            env: process.env as { [key: string]: string },
        });

        sessions.set(sessionId, term);
        log(`→ Terminal session ${sessionId} started (pid ${term.pid})`);

        term.onData((data) => {
            socket.emit('terminal:output', { sessionId, data });
        });

        term.onExit(({ exitCode }) => {
            sessions.delete(sessionId);
            socket.emit('terminal:exit', { sessionId, exitCode });
            log(`○ Terminal session ${sessionId} closed (exit ${exitCode})`);
        });
    }

    function input(payload: TerminalInputPayload) {
        sessions.get(payload.sessionId)?.write(payload.data);
    }

    function resize(payload: TerminalResizePayload) {
        const term = sessions.get(payload.sessionId);
        if (!term) return;
        try {
            term.resize(Math.max(payload.cols, 1), Math.max(payload.rows, 1));
        } catch {
            // Sessiya allaqachon yopilgan bo'lishi mumkin — e'tiborsiz qoldiramiz.
        }
    }

    function close(payload: TerminalClosePayload) {
        const term = sessions.get(payload.sessionId);
        if (!term) return;
        term.kill();
        sessions.delete(payload.sessionId);
    }

    socket.on('terminal:start', start);
    socket.on('terminal:input', input);
    socket.on('terminal:resize', resize);
    socket.on('terminal:close', close);

    return function cleanup() {
        socket.off('terminal:start', start);
        socket.off('terminal:input', input);
        socket.off('terminal:resize', resize);
        socket.off('terminal:close', close);
        for (const term of sessions.values()) term.kill();
        sessions.clear();
    };
}
