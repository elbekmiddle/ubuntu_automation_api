# Screenctl CLI

## O'rnatish (production, Ubuntu)

```bash
cd cli
chmod +x install.sh
./install.sh
```

Bu Node.js LTS'ni (kerak bo'lsa), `node-pty` uchun build vositalarini
(build-essential/python3), CLI buildini va global `screenctl` komandasini
avtomatik o'rnatadi. Batafsil — script ichidagi izohlarda.

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
