# Screenctl CLI

Ubuntu Automation Platform uchun terminal client.

## O'rnatish

```bash
cd cli
npm install
npm link   # global `screenctl` buyrug'ini yaratadi
```

Yoki link qilmasdan to'g'ridan-to'g'ri:

```bash
node bin/screenctl.js --help
```

## Sozlash

Backend manzili `~/.screenctl/config.json` ichida saqlanadi (default: `http://localhost:3000`).
O'zgartirish uchun `SCREENCTL_API_URL` environment variable'ini bering:

```bash
SCREENCTL_API_URL=https://api.example.com screenctl login
```

## Buyruqlar

```
screenctl login                          # akkountga kirish
screenctl logout                         # chiqish
screenctl whoami                         # joriy user

screenctl templates list                 # o'z templatelaringiz
screenctl templates public [query]       # jamoat (community) templatelarini qidirish

screenctl jobs list [-l 15]              # so'nggi joblar
screenctl jobs logs <jobId>              # job loglari
screenctl jobs run <slug> <action>       # action'ni ishga tushirish

screenctl schedules list                 # rejalashtirilgan (cron) joblar
screenctl devices list                   # kuzatilgan IP/qurilmalar
screenctl audit list [-l 20]             # audit log

screenctl --help
```

Noto'g'ri yozilgan buyruq uchun avtomatik "did you mean" taklifi chiqadi:

```text
$ screenctl templats
✗ Unknown command: templats

Did you mean:
  templates
```

## Xavfsizlik eslatmasi

Access/refresh tokenlar hozircha `~/.screenctl/config.json` faylida (faqat egasi
o'qiy oladigan `0600` ruxsat bilan) saqlanadi. Kelajakda bu OS keyring
(Linux Secret Service / macOS Keychain / Windows Credential Manager) orqali
saqlanishi tavsiya etiladi.
