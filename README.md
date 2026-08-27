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
- [x] **Docker holati tekshiruvi tuzatildi** — avval daemon'ga ulanib bo'lmasa (masalan agent systemd service sifatida boshqa user ostida ishlayotgani uchun) "o'rnatilmagan" deb noto'g'ri ko'rsatardi. Endi "CLI o'rnatilganmi" va "daemon'ga ulanib bo'ladimi" alohida tekshiriladi, rootless docker uchun `XDG_RUNTIME_DIR` fallback bilan
- [x] Swap tekshiruvi `LC_ALL=C` bilan mustahkamlandi (boshqa tilli locale'da "Swap:" qatori tanilmay qolmasin)
- [x] Backend modullari `src/modules/` papkasiga ko'chirildi (`src/modules/auth`, `src/modules/apps`, ...) — `common`/`config`/`database`/`redis` umumiy infratuzilma sifatida `src/` ildizida qoladi
- [x] Barcha REST endpointlar global `/api/v1` prefiksi ostida (`app.setGlobalPrefix('api/v1')`) — masalan `POST /api/v1/auth/login`. WebSocket namespace'lari (`/agents`, `/clients`) prefiksdan tashqarida — Socket.IO buni frontend/CLI'da alohida `API_HOST`/`apiUrl` orqali ishlatadi, REST esa `API_BASE`/`apiBase` (`+ /api/v1`) orqali
- [x] Fullscreen terminal — UI tugma yoki `Ctrl+Shift+F`, `Esc` bilan chiqish
- [x] **Fullscreen terminal — fixed/scroll xatosi tuzatildi** — `inset:12` → `inset:0` (rasmda ko'ringan yuqoridagi tirqish shu edi) va fullscreen paytida `document.body.style.overflow = "hidden"` bilan orqadagi sahifa scroll'i qulflanadi
- [x] **Network** — agent endi `os.networkInterfaces()` orqali interfeys ro'yxatini (nom, IPv4 address, MAC) heartbeat bilan yuboradi; `/apps/:id#network` bo'limida ko'rinadi (ports bilan bir joyda). Node'ning o'z API'si — Linux/Windows/macOS'da bir xil ishlaydi, kelajakdagi Windows/macOS agent buni qayta yozishi shart emas
- [x] Device tree navigatsiyasi — `/apps` sahifasida har bir device kengaytiriladigan tugun, ichida mavjud bo'limlarga (`overview`/`hardware`/`network`/`terminal`) to'g'ridan-to'g'ri link (`/apps/:id#hardware`). Docker/Processes/Services/Tasks/Logs/Audit alohida tab sifatida hali yo'q — hozircha "hardware" tugunining bir qismi (Docker) yoki umuman backend telemetriyasi yo'q (Processes/Services), shuning uchun soxta link qo'shilmadi

### 🚧 Navbatda

- [ ] Windows agent
- [ ] macOS agent
- [ ] Device tree'ga Processes/Services alohida bo'lim sifatida qo'shish — buning uchun avval agentga shu ma'lumotlarni yig'ish kerak (hozir faqat cpu/memory/swap/disk/docker/ports bor)
- [ ] Target selector (`DeviceSelector`: platform, tags, os version, online holati bo'yicha)
- [ ] Fleet automation — "1000 ta mashinada shu commandni bajar", progress bar bilan (success/failed/offline)
- [ ] Task rollback mexanizmi (har bir `TaskStep` uchun rollback step)
- [ ] Organizations / Teams / Projects — multi-tenant isolation
- [ ] RBAC (owner/admin/developer/operator/viewer)
- [ ] Developer environment provisioning (Node/Python/Docker/Xcode/Homebrew shablonlari)
- [ ] Credential rotation UI
- [ ] GitHub/Azure integratsiyalari

### ⚠️ Production'da tekshirish kerak (2026-08-23 sessiyasidan)

_(2026-08-24: `screen-api.honeymedia.uz`ga to'g'ridan-to'g'ri so'rov yuborib ko'rishga urinildi — bu sandbox tashqi tarmoqqa faqat oldindan qidiruv natijasida chiqqan URL'larga chiqa oladi, va sizning domenlaringiz ochiq qidiruv indeksida yo'q (xususiy/kam ma'lum domen), shuning uchun bu yerdan real HTTP javobini ko'rib bo'lmadi. Diagnostika hali ham faqat serverning o'zida — pastdagi `curl`/`journalctl` buyruqlari orqali — qilinishi kerak.)_

- **CORS xatolari** (`screenctl.honeymedia.uz` → `screen-api.honeymedia.uz`, "CORS request did not succeed", status `(null)`): repo'dagi nginx config (`backend/deploy/nginx-screenctl-backend.conf`) va CORS_ORIGIN mantig'i (`main.ts`) to'g'ri ko'rinadi — `location /` hammasini shаffof proxy qiladi, prefiksga bog'liq emas. Bu "status (null)" ko'rinishi odatda backend'ga UMUMAN ulanib bo'lmayotganini bildiradi (masalan `/api/v1` bilan yangilangan kod hali production serverga deploy qilinmagan yoki `systemctl restart screenctl-backend`dan keyin process yiqilib qolgan). Tekshirish: serverda `curl -i http://127.0.0.1:3000/api/v1/auth/me` va `journalctl -u screenctl-backend -f`.
- **`useAuth must be used within AuthProvider`** — stack trace'da `performReactRefresh` bor, bu faqat Vite DEV rejimida (`npm run dev`) Fast Refresh'ning Context fayllarini qayta yuklashda beradigan ma'lum muammosi — production build'da (`vite build`) bu runtime umuman yo'q. `AuthProvider` `App.jsx`da to'g'ri joylashgan (`Routes`ni o'raydi). Agar production'da ham chiqsa — alohida xabar bering, lekin dev'da hard-refresh yetarli.
- Brauzerda ko'ringan katta JSON (`cpu.manufacturer`, `memory.ram/swap`, `disk: [...]`, `docker.running`) — bu `/api/v1/system` (backend serverning O'ZINING holati, `systeminformation` kutubxonasi orqali) javobi, `last_metrics` (per-device heartbeat) emas. Ikkalasi qasddan boshqa-boshqa shakl(shape)da — Dashboard/AppDetail endi faqat `last_metrics`dan o'qiydi. Lokal test paytida backend va sizning Lenovo bitta mashina bo'lgani uchun ikkalasi tasodifan bir xil ko'ringan, lekin production'da (backend alohida serverda) bular butunlay boshqa narsa.

### 📝 Eslatma

Saytda kod qo'shish/tahrirlash qismi (`frontend/src/pages/FileEditor.jsx`, `backend/src/files`) — mavjud, ushbu refactor'da tegilmadi, ishlab turibdi.
