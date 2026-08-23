import * as os from 'node:os';
let ptyModule = null;
try {
    // Modul nomini o'zgaruvchiga chiqarib olamiz — shunda TypeScript
    // `import()`ning satr argumentini compile vaqtida statik tekshirmaydi
    // (aks holda paket umuman o'rnatilmagan bo'lsa ham build butunlay
    // to'xtab qolardi). Runtime'da modul topilmasa shu yerda xato
    // tashlanadi va biz uni catch qilib, terminalni "mavjud emas"
    // holatiga o'tkazamiz (agent umuman ishlashda davom etadi).
    const moduleName = 'node-pty';
    ptyModule = (await import(moduleName));
}
catch {
    ptyModule = null;
}
/**
 * Har bir sessionId uchun bitta interaktiv pty (pseudo-terminal) ochadi.
 * `sudo`, parol so'rovlari, rangli output — hammasi haqiqiy TTY orqali
 * ishlaydi, xuddi SSH sessiyasidagidek. Agent shu mashinada qaysi user
 * huquqi bilan ishga tushirilgan bo'lsa (masalan systemd service user),
 * terminal ham o'sha user nomidan ochiladi — `sudo` uchun parol yoki
 * NOPASSWD sozlamasi shu userga bog'liq.
 */
export function registerTerminalHandlers(socket, log) {
    const sessions = new Map();
    function shellCommand() {
        if (process.platform === 'win32') {
            return { file: 'powershell.exe', args: [] };
        }
        const shell = process.env.SHELL && process.env.SHELL.length > 0 ? process.env.SHELL : '/bin/bash';
        // Login shell (-l) — PATH, aliases va profil sozlamalari to'g'ri yuklansin.
        return { file: shell, args: ['-l'] };
    }
    function start(payload) {
        const { sessionId } = payload;
        if (!ptyModule) {
            socket.emit('terminal:output', {
                sessionId,
                data: '\r\n\x1b[31mReal-time terminal ushbu qurilmada ishlamaydi: "node-pty" o\'rnatilmagan yoki compile bo\'lmagan.\x1b[0m\r\n' +
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
            env: process.env,
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
    function input(payload) {
        sessions.get(payload.sessionId)?.write(payload.data);
    }
    function resize(payload) {
        const term = sessions.get(payload.sessionId);
        if (!term)
            return;
        try {
            term.resize(Math.max(payload.cols, 1), Math.max(payload.rows, 1));
        }
        catch {
            // Sessiya allaqachon yopilgan bo'lishi mumkin — e'tiborsiz qoldiramiz.
        }
    }
    function close(payload) {
        const term = sessions.get(payload.sessionId);
        if (!term)
            return;
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
        for (const term of sessions.values())
            term.kill();
        sessions.clear();
    };
}
