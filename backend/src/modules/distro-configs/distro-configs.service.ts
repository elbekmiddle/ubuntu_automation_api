import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export type Platform = 'linux' | 'darwin' | 'win32';

export interface ConfigDefinition {
    id: string;
    label: string;
    path: string; // to'liq, resolve qilingan yo'l
}

export interface ConfigStatus extends ConfigDefinition {
    exists: boolean;
    size: number | null;
    modifiedAt: Date | null;
}

const MAX_READ_BYTES = 512 * 1024; // 512KB — konfiguratsiya fayli uchun yetarli, DoS'dan himoya

@Injectable()
export class DistroConfigsService {
    private readonly logger = new Logger(DistroConfigsService.name);

    // Barcha snapshot/backup'lar SHU BITTA papkaga tushadi (ichma-ich papkalar yo'q) —
    // fayl nomining o'zi platform+config+vaqtni o'z ichiga oladi.
    private readonly storageRoot = path.resolve(process.cwd(), 'distro-configs-storage');

    private definitionsFor(platform: Platform): ConfigDefinition[] {
        const home = os.homedir();

        if (platform === 'darwin') {
            return [
                { id: 'zshrc', label: 'Zsh profile', path: path.join(home, '.zshrc') },
                { id: 'bash-profile', label: 'Bash profile', path: path.join(home, '.bash_profile') },
                { id: 'gitconfig', label: 'Git config', path: path.join(home, '.gitconfig') },
                { id: 'ssh-config', label: 'SSH config', path: path.join(home, '.ssh', 'config') },
                { id: 'vimrc', label: 'Vim config', path: path.join(home, '.vimrc') },
            ];
        }

        if (platform === 'win32') {
            const documents = path.join(home, 'Documents');
            return [
                {
                    id: 'powershell-profile',
                    label: 'PowerShell profile',
                    path: path.join(documents, 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
                },
                { id: 'gitconfig', label: 'Git config', path: path.join(home, '.gitconfig') },
                { id: 'ssh-config', label: 'SSH config', path: path.join(home, '.ssh', 'config') },
                {
                    id: 'wsl-config',
                    label: 'WSL config',
                    path: path.join(home, '.wslconfig'),
                },
            ];
        }

        // linux (default)
        return [
            { id: 'bashrc', label: 'Bash profile', path: path.join(home, '.bashrc') },
            { id: 'zshrc', label: 'Zsh profile', path: path.join(home, '.zshrc') },
            { id: 'gitconfig', label: 'Git config', path: path.join(home, '.gitconfig') },
            { id: 'ssh-config', label: 'SSH config', path: path.join(home, '.ssh', 'config') },
            { id: 'os-release', label: 'OS release info', path: '/etc/os-release' },
            { id: 'hosts', label: 'Hosts file', path: '/etc/hosts' },
        ];
    }

    getPlatform(): Platform {
        const p = os.platform();
        if (p === 'darwin' || p === 'win32') return p;
        return 'linux'; // boshqa *nix (freebsd va h.k.) uchun ham linux ro'yxatini ishlatamiz
    }

    private findDefinition(id: string): ConfigDefinition {
        const def = this.definitionsFor(this.getPlatform()).find((d) => d.id === id);
        if (!def) {
            throw new NotFoundException(`"${id}" joriy platforma (${this.getPlatform()}) uchun tanilmagan config`);
        }
        return def;
    }

    async list(): Promise<{ platform: Platform; hostname: string; configs: ConfigStatus[] }> {
        const platform = this.getPlatform();
        const definitions = this.definitionsFor(platform);

        const configs = await Promise.all(
            definitions.map(async (def) => {
                try {
                    const stat = await fs.stat(def.path);
                    return { ...def, exists: true, size: stat.size, modifiedAt: stat.mtime };
                } catch {
                    return { ...def, exists: false, size: null, modifiedAt: null };
                }
            }),
        );

        return { platform, hostname: os.hostname(), configs };
    }

    async read(id: string): Promise<{ id: string; path: string; content: string }> {
        const def = this.findDefinition(id);
        try {
            const stat = await fs.stat(def.path);
            if (stat.size > MAX_READ_BYTES) {
                throw new BadRequestException(`Fayl juda katta (${stat.size} bayt) — o'qish uchun ${MAX_READ_BYTES} bayt chegara`);
            }
            const content = await fs.readFile(def.path, 'utf-8');
            return { id: def.id, path: def.path, content };
        } catch (err) {
            if (err instanceof BadRequestException) throw err;
            throw new NotFoundException(`"${def.label}" fayli topilmadi: ${def.path}`);
        }
    }

    /** Joriy holatni bitta umumiy `distro-configs-storage/` papkaga snapshot qilib saqlaydi. */
    async backup(id: string, deviceId: string | null): Promise<{ id: string; savedAs: string }> {
        const def = this.findDefinition(id);
        const platform = this.getPlatform();

        let content: string;
        try {
            content = await fs.readFile(def.path, 'utf-8');
        } catch {
            throw new NotFoundException(`"${def.label}" fayli topilmadi: ${def.path}`);
        }

        await fs.mkdir(this.storageRoot, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${platform}__${def.id}__${timestamp}.snapshot`;
        const destPath = path.join(this.storageRoot, fileName);

        const header = `# source: ${def.path}\n# platform: ${platform}\n# hostname: ${os.hostname()}\n# device: ${deviceId ?? 'unknown'}\n# backed up at: ${new Date().toISOString()}\n\n`;
        await fs.writeFile(destPath, header + content, 'utf-8');

        this.logger.log(`Backed up ${def.label} (${platform}) -> ${fileName}`);
        return { id: def.id, savedAs: fileName };
    }

    async listBackups(): Promise<Array<{ fileName: string; size: number; createdAt: Date }>> {
        try {
            const entries = await fs.readdir(this.storageRoot, { withFileTypes: true });
            const files = entries.filter((e) => e.isFile());
            const stats = await Promise.all(
                files.map(async (f) => {
                    const stat = await fs.stat(path.join(this.storageRoot, f.name));
                    return { fileName: f.name, size: stat.size, createdAt: stat.birthtime };
                }),
            );
            return stats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch {
            return [];
        }
    }
}
