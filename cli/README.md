# Screenctl CLI

## O'rnatish (production, boshqa kompyuterlarda — bitta buyruq)

```bash
curl -fsSL https://raw.githubusercontent.com/<ORG>/<REPO>/main/cli/get.sh | sh
```

`<ORG>/<REPO>`ni haqiqiy GitHub repo bilan almashtiring (bir marta
`get.sh` faylining o'zida ham, `REPO=` qatorida, sozlanadi). Bu skript
`cli/get.sh`dan `Release CLI` GitHub Actions workflow (`.github/workflows/release-cli.yml`)
chop etgan `screenctl-cli.tar.gz`ni yuklab oladi — git clone shart emas.

Yangi versiya chiqarish uchun (bir marta sozlangach):

```bash
cd cli && npm version patch --no-git-tag-version
git add package.json && git commit -m "cli: v0.1.1"
git tag cli-v0.1.1 && git push origin main --tags
```

Push qilingach, workflow avtomatik build qilib, GitHub Release'ga
tarball biriktiradi — shundan keyin yuqoridagi `curl | sh` buyrug'i
o'sha versiyani tortib oladi.

**Muhim eslatma:** `node-pty` (real-time terminal) native modul —
`get.sh` uni har bir mashinada alohida compile qiladi. Agar
`build-essential`/`python3` bo'lmasa, CLI baribir o'rnatiladi (login,
jobs, monitoring ishlaydi), faqat terminal ishlamaydi — skript buni
aniq ogohlantiradi.

O'chirish: `curl -fsSL .../get.sh | sh -s -- --uninstall`

## O'rnatish (production, repo'ni clone qilib)

```bash
git clone <repo-url> && cd <repo>/cli
chmod +x install.sh
./install.sh
```

Bu Node.js LTS'ni (kerak bo'lsa), `node-pty` uchun build vositalarini
(build-essential/python3), CLI buildini va global `screenctl` komandasini
avtomatik o'rnatadi. Batafsil — script ichidagi izohlarda.

`get.sh` bilan farqi: bu git clone qiladi va source'dan TypeScript'ni
o'zi build qiladi (CI/Release kerak emas) — kod ustida ishlayotganlar
yoki hali release chiqarilmagan bo'lsa shu variant qulay.

## O'rnatish (local dev)

```bash
npm install
npm run build
npm link   # `screenctl` komandasini global qiladi
```

## Sozlash

Default API manzili `http://localhost:3000`. O'zgartirish uchun:

```bash
export SCREENCTL_API_URL=http://localhost:3000
```

## Ishlatish

```bash
screenctl login                          # yoki: screenctl --login
screenctl register

screenctl app create --name my-server     # yoki: screenctl --app --name my-server
screenctl apps                            # yoki: screenctl --apps

screenctl templates                       # yoki: screenctl --templates
screenctl template public postgres        # yoki: screenctl --public postgres

screenctl run                             # interaktiv: template -> action -> confirm
screenctl run system-automation get-os-info --yes
```

## Token boshqaruvi

Tokenlar `~/.screenctl/credentials.json`da saqlanadi (fayl ruxsati `0600`).
Parol hech qachon diskka yozilmaydi. Access token muddati tugasa, CLI
avtomatik `refreshToken` bilan yangilaydi va so'rovni qayta yuboradi —
buni qo'lda qilish shart emas.

## Hali yo'q (keyingi bosqichlar)

- To'liq interaktiv shell (`screenctl` argumentsiz — `/run`, `/devices`,
  `/schedules`, `/audit`, `/status`, `/doctor` va h.k.)
- `run --device <appId>` — hozircha job'lar backend mashinasining o'zida
  ishlaydi, agentga marshrutlanmaydi (Apps/Agents poydevori tayyor, lekin
  Jobs execution pipeline hali shunga ulanmagan)
- Template action'lar uchun avtomatik input so'rash (`inputs` metadata)
- `screenctl-agent` — remote mashinada ishlaydigan alohida paket
