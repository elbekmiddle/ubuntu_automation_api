# Screenctl

Cross-platform machine automation control plane — Linux (hozircha), Windows va macOS uchun bitta API/CLI/web console orqali qurilmalarni ulash, kuzatish, boshqarish va avtomatlashtirish.

```text
                 SCREENCTL
                     │
       ┌─────────────┼─────────────┐
       │             │             │
      CLI           WEB           API
       │             │             │
       └─────────────┼─────────────┘
                     │
                  CONTROL
                   PLANE
                     │
                   AGENT
```

## Repo tarkibi

```text
backend/    NestJS API — auth, apps (devices), jobs, templates, schedules, audit, system
cli/        TypeScript CLI + agent (screenctl app connect / device-side agent)
frontend/   React + Vite web console
```

## Auth arxitekturasi (2026-08-23 holatiga yangilandi)

Statik `X-API-Key` butunlay olib tashlandi. Endi ikkita mustaqil, DB-backed mexanizm bor:

- **Foydalanuvchilar** — JWT access/refresh token (`backend/src/auth`, `JwtAuthGuard`).
- **Agent/device'lar** — ro'yxatdan o'tishda beriladigan, DB'da faqat hash'i saqlanadigan, reconnect'da rotatsiya qilinadigan `registrationToken` (`AppsService.authenticateAgent`, `AgentsGateway`).
- **Terminal WS** — o'zining JWT handshake'i bor (`TerminalGateway`).

`API_KEY` / `VITE_API_KEY` / `SCREENCTL_API_KEY` endi hech qayerda kerak emas — `.env` fayllaringizdan olib tashlashingiz mumkin.

## Roadmap

Ushbu ro'yxat brainstorm suhbatidan (Screenctl'ni Microsoft/Apple/startup'larga qiziqarli qiladigan control-plane vizyasi) chiqarilgan va haqiqiy kod holatiga qarab yangilanadi.

### ✅ Bajarildi

- [x] Monorepo (backend/cli/frontend)
- [x] PostgreSQL, Redis
- [x] User auth — JWT access/refresh
- [x] Device identity — DB'da hash'langan registration token
- [x] Device sessions — WebSocket (`/agents` namespace)
- [x] Heartbeat, reconnect, stale-detection (60s)
- [x] Hardware telemetry — CPU, memory, disk (agent → heartbeat → `apps.last_metrics`)
- [x] **Swap telemetry** (`free -b` orqali, Linux)
- [x] **Docker telemetry** — engine holati + running container'lar ro'yxati
- [x] Linux agent
- [x] Remote command execution (jobs → agent → job:log/job:complete)
- [x] Templates, template versions
- [x] Scheduling (`schedules` moduli)
- [x] Audit logs (interceptor + service + controller)
- [x] Real-time terminal (PTY orqali, WebSocket stream, `TerminalGateway`)
- [x] Statik `X-API-Key`ni olib tashlash — endi to'liq JWT + DB registration token
- [x] Dashboard'dagi **"[01] hardware" xatosi tuzatildi** — avval backend serverning o'z CPU/RAM/diskini ko'rsatardi, endi tanlangan ulangan device'ning haqiqiy statistikasini ko'rsatadi (device kartalarini bosib almashtirish mumkin)

### 🚧 Navbatda

- [ ] Windows agent
- [ ] macOS agent
- [ ] Device tree navigatsiyasi (frontend — Devices → cascading tree: Hardware/Docker/Network/Processes/Services/Tasks/Logs/Audit)
- [ ] Target selector (`DeviceSelector`: platform, tags, os version, online holati bo'yicha)
- [ ] Fleet automation — "1000 ta mashinada shu commandni bajar", progress bar bilan (success/failed/offline)
- [ ] Task rollback mexanizmi (har bir `TaskStep` uchun rollback step)
- [ ] Fullscreen terminal (Ctrl+Shift+F yoki UI tugma)
- [ ] Organizations / Teams / Projects — multi-tenant isolation
- [ ] RBAC (owner/admin/developer/operator/viewer)
- [ ] Developer environment provisioning (Node/Python/Docker/Xcode/Homebrew shablonlari)
- [ ] Credential rotation UI
- [ ] GitHub/Azure integratsiyalari

### 📝 Eslatma

Saytda kod qo'shish/tahrirlash qismi (`frontend/src/pages/FileEditor.jsx`, `backend/src/files`) — mavjud, ushbu refactor'da tegilmadi, ishlab turibdi.
