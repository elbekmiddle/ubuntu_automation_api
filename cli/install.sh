#!/usr/bin/env bash
#
# install.sh — Screenctl CLI/Agent uchun production o'rnatuvchi (Ubuntu).
#
# Nima qiladi:
#   1. Ubuntu ekanini tekshiradi
#   2. Node.js 20.x LTS o'rnatadi (yo'q bo'lsa yoki versiya eski bo'lsa)
#   3. build-essential + python3 + make + g++ o'rnatadi — bular bo'lmasa
#      `node-pty` (real-time terminal uchun kerakli native modul) prebuild
#      topilmagan holatda kompilyatsiya qila olmaydi va terminal butunlay
#      ishlamay qoladi ("node-pty o'rnatilmagan yoki compile bo'lmagan" xatosi)
#   4. Shu papkadan (cli/) `npm ci && npm run build` qiladi
#   5. `screenctl` komandasini global qiladi (npm install -g .)
#   6. `node-pty` haqiqatan yuklanishini tekshiradi va kerak bo'lsa qayta
#      compile qiladi
#   7. Keyingi qadamlar (login, device ulash, systemd autostart) haqida
#      aniq ko'rsatma beradi
#
# Ishlatish:
#   git clone <repo> && cd ubuntu_automation_api/cli
#   chmod +x install.sh && ./install.sh
#
# Idempotent — xavfsiz qayta-qayta ishga tushirish mumkin.

set -euo pipefail

# ---------- kichik yordamchi funksiyalar ----------

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'

info()  { echo "${BOLD}${GREEN}✓${RESET} $*"; }
warn()  { echo "${BOLD}${YELLOW}⚠${RESET} $*"; }
error() { echo "${BOLD}${RED}✕${RESET} $*" >&2; }
step()  { echo; echo "${BOLD}== $* ==${RESET}"; }

# Node LTS versiyasi — node-pty@1.x uchun keng qo'llab-quvvatlanadigan,
# barqaror prebuild'lari mavjud versiya. Eng so'nggi Node (masalan 22/23)
# ba'zan hali node-pty prebuild'i chiqmagan bo'lishi mumkin va bu holda
# o'rnatish node-gyp orqali kompilyatsiyaga tushib ketadi.
NODE_MAJOR="20"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        error "Root emassiz va 'sudo' topilmadi — apt paketlarini o'rnatib bo'lmaydi."
        exit 1
    fi
fi

# ---------- 1) OS tekshiruvi ----------

step "Tizimni tekshirish"

if [ ! -f /etc/os-release ] || ! grep -qi "ubuntu\|debian" /etc/os-release; then
    warn "Bu script Ubuntu/Debian uchun mo'ljallangan. Boshqa distributivda ba'zi qadamlar (apt) ishlamasligi mumkin."
else
    . /etc/os-release
    info "Aniqlandi: ${PRETTY_NAME:-Ubuntu}"
fi

if [ ! -f "package.json" ] || ! grep -q '"name": "screenctl"' package.json 2>/dev/null; then
    error "Bu scriptni 'cli/' papkasi ichidan ishga tushiring (package.json topilmadi yoki mos kelmadi)."
    exit 1
fi

# ---------- 2) Node.js ----------

step "Node.js tekshirilmoqda"

node_ok() {
    command -v node >/dev/null 2>&1 || return 1
    local major
    major="$(node -p 'process.versions.node.split(".")[0]')"
    [ "$major" -ge 18 ]
}

if node_ok; then
    info "Node.js $(node -v) allaqachon mavjud (>=18 talab qilinadi)."
else
    warn "Node.js topilmadi yoki versiyasi eski — Node.js ${NODE_MAJOR}.x LTS o'rnatilmoqda..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash - >/dev/null
    $SUDO apt-get install -y nodejs >/dev/null
    info "Node.js $(node -v) o'rnatildi."
fi

# ---------- 3) node-pty uchun native build toolchain ----------
#
# `node-pty` — real-time terminal (`terminal:open` / pty spawn) buning
# ustida ishlaydi. Agar shu joriy Node versiyasi + arxitektura (masalan
# linux-x64) uchun tayyor prebuild mavjud bo'lmasa, `npm install`
# `node-gyp rebuild`ga o'tadi — bu esa Python3, make va C++ kompilyator
# (g++) talab qiladi. Bular bo'lmasa terminal butunlay ishlamay qoladi.

step "node-pty uchun build vositalari (build-essential, python3)"

NEED_APT_UPDATE=0
for pkg in build-essential python3 make g++; do
    if ! dpkg -s "$pkg" >/dev/null 2>&1; then
        NEED_APT_UPDATE=1
    fi
done

if [ "$NEED_APT_UPDATE" -eq 1 ]; then
    $SUDO apt-get update -y >/dev/null
    $SUDO apt-get install -y build-essential python3 make g++ >/dev/null
    info "build-essential / python3 / make / g++ o'rnatildi."
else
    info "build-essential / python3 / make / g++ allaqachon mavjud."
fi

# ---------- 4) CLI'ni build qilish ----------

step "Screenctl CLI o'rnatilmoqda (npm ci && npm run build)"

# --ignore-scripts: node-pty kabi native modullarning `install` scriptini
# (node-gyp build) shu bosqichda ISHGA TUSHIRMAYMIZ. Sabab: agar u yerda
# xato chiqsa (masalan internet cheklangan yoki build vositalari yetarli
# emas), `npm ci` butunlay to'xtab qoladi va CLI umuman o'rnatilmay qoladi
# — holbuki CLI'ning terminal'dan boshqa hamma funksiyasi (login, jobs,
# heartbeat, apps) node-pty'siz ham to'liq ishlaydi. Native build'ni
# alohida, quyidagi 5-bosqichda, nazorat ostida qayta urinamiz.
if [ -f package-lock.json ]; then
    npm ci --ignore-scripts
else
    npm install --ignore-scripts
fi
npm run build
info "Build tayyor (dist/)."

# ---------- 5) node-pty'ni compile qilish va tekshirish ----------
#
# Bu yerda native build ATAYLAB nazorat ostida (script to'xtamasin deb)
# ishga tushiriladi — muvaffaqiyatsiz bo'lsa ham CLI o'rnatilishda davom
# etadi, faqat real-time terminal shu qurilmada ishlamaydi (agent kodida
# bunga graceful fallback allaqachon bor: terminal.ts).

step "node-pty compile qilinmoqda"

if npm rebuild node-pty --update-binary 2>node-pty-build.log && node -e "require('node-pty')" >/dev/null 2>&1; then
    info "node-pty muvaffaqiyatli compile qilindi — real-time terminal ishlaydi."
    rm -f node-pty-build.log
else
    warn "node-pty compile bo'lmadi. Real-time terminal ushbu qurilmada ISHLAMAYDI"
    echo -e "${DIM}  (qolgan hamma narsa — login, jobs, heartbeat, monitoring — normal ishlaydi).${RESET}"
    echo -e "${DIM}  Sabablari odatda: internetga chiqish yo'q (nodejs.org headers kerak),${RESET}"
    echo -e "${DIM}  yoki build-essential/python3 to'liq o'rnatilmagan.${RESET}"
    echo -e "${DIM}  To'liq log: $(pwd)/node-pty-build.log${RESET}"
    echo -e "${DIM}  Internet/toolchain tuzatilgach qayta urinish uchun:${RESET}"
    echo -e "${DIM}    cd $(pwd) && npm rebuild node-pty --update-binary${RESET}"
fi

# ---------- 6) Global qilish ----------

step "'screenctl' komandasi global qilinmoqda"

if $SUDO npm install -g . >/dev/null 2>&1; then
    info "O'rnatildi: $(command -v screenctl 2>/dev/null || echo screenctl)"
else
    warn "Global o'rnatish (npm install -g) muvaffaqiyatsiz — 'npm link' bilan urinilmoqda..."
    $SUDO npm link
    info "O'rnatildi: $(command -v screenctl 2>/dev/null || echo screenctl)"
fi

# ---------- 7) Keyingi qadamlar ----------

step "Tayyor ✓"

cat <<EOF

Keyingi qadamlar:

  1. Login qiling:
     ${BOLD}screenctl login${RESET}

  2. Shu kompyuterni Screenctl'ga ulang:
     ${BOLD}screenctl app connect${RESET}

     Bu jarayonda "Start automatically when this computer boots?" so'raladi —
     "Ha" desangiz, ~/.config/systemd/user/ ostiga systemd --user birlik
     fayli yoziladi va yoqiladi.

  3. MUHIM — reboot'dan keyin ham ishlashi uchun:
     systemd --user xizmatlari, standart holatda, faqat sizning login
     sessiyangiz faol bo'lganda ishlaydi. Kompyuter qayta yoqilganda ham
     (hech kim login qilmasa ham) agent ishga tushishi uchun "linger"ni
     yoqing:

     ${BOLD}loginctl enable-linger \$(whoami)${RESET}

     Buni bir marta qilsangiz kifoya — shundan keyin systemd --user
     instansi boot vaqtida avtomatik ishga tushadi.

  4. Tekshirish:
     ${BOLD}systemctl --user status 'screenctl-agent-*'${RESET}
     ${BOLD}screenctl agent list${RESET}

EOF
