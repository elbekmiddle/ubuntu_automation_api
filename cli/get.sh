#!/usr/bin/env sh
# ============================================================================
# Screenctl CLI o'rnatuvchisi (GitHub Releases orqali).
#
#   curl -fsSL https://raw.githubusercontent.com/<ORG>/<REPO>/main/cli/get.sh | sh
#   curl -fsSL .../get.sh | sh -s -- --version cli-v0.2.0
#   curl -fsSL .../get.sh | sh -s -- --uninstall
#
# <ORG>/<REPO> o'rniga haqiqiy GitHub repo yozing (REPO o'zgaruvchisida).
#
# `sh` ishlatilgan, `bash` emas — server obrazlari (Alpine va h.k.)da
# bash bo'lmasligi mumkin, o'rnatuvchi esa hamma joyda ishlashi kerak.
#
# MUHIM FARQ: bu CLI'ning bitta bog'liqligi — `node-pty` — native modul
# (real-time terminal shu orqali ishlaydi) va HAR BIR MASHINADA alohida
# compile qilinishi kerak (prebuild topilmasa). Shu sababli bu script,
# ba'zi boshqa CLI o'rnatuvchilardan farqli, faqat bitta bajariladigan
# faylni ko'chirib qo'ymaydi — u build vositalarini (Node, build-essential,
# python3) tekshiradi va `npm ci --omit=dev` orqali node-pty'ni SHU
# mashinada compile qiladi. TypeScript qismi esa GitHub Release'da
# tayyor holda (`dist/`) keladi — shuning uchun bu yerda `tsc` kerak emas.
# ============================================================================

set -eu

REPO="elbekmiddle/ubuntu_automation_api"
VERSION="latest"
PREFIX="${SCREENCTL_PREFIX:-$HOME/.local}"

SHARE="$PREFIX/share/screenctl"
BIN="$PREFIX/bin"

UNINSTALL=0

# --- Argumentlar -------------------------------------------------------

while [ $# -gt 0 ]; do
    case "$1" in
        --version) VERSION="${2:-latest}"; shift 2 ;;
        --prefix) PREFIX="${2:-$PREFIX}"; SHARE="$PREFIX/share/screenctl"; BIN="$PREFIX/bin"; shift 2 ;;
        --uninstall) UNINSTALL=1; shift ;;
        -h|--help)
            echo "Ishlatish: get.sh [--version <tag>] [--prefix <yo'l>] [--uninstall]"
            exit 0
            ;;
        *) echo "Noma'lum parametr: $1" >&2; exit 1 ;;
    esac
done

say() { printf '  %s\n' "$1"; }
die() { printf '\n  %s\n\n' "$1" >&2; exit 1; }

# --- O'chirish -----------------------------------------------------------

if [ "$UNINSTALL" -eq 1 ]; then
    # Avval systemd --user autostart o'rnatilgan bo'lsa, uni o'zi
    # (screenctl binary orqali) tozalab qo'yish tavsiya etiladi:
    #   screenctl app disconnect <id>
    # — chunki fayllarni o'chirishdan oldin shuni eslatib qo'yamiz.
    if command -v screenctl >/dev/null 2>&1; then
        printf '\n'
        say "Eslatma: agar systemd autostart yoqilgan bo'lsa, avval shuni ishga tushiring:"
        say "  screenctl app disconnect <app-id>"
    fi

    rm -rf "$SHARE"
    rm -f "$BIN/screenctl"

    printf '\n'
    say "screenctl o'chirildi."
    say "Sozlamalar qoldi: ~/.screenctl  (kerak bo'lmasa o'zingiz o'chiring)"
    printf '\n'

    exit 0
fi

# --- Talablar --------------------------------------------------------------

printf '\n'

command -v node >/dev/null 2>&1 || die "Node.js topilmadi. Kerak: 18 yoki undan yuqori.
    https://nodejs.org  yoki:  nvm install 20"

NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    die "Node.js $(node -v) topildi, lekin 18+ kerak."
fi

command -v npm >/dev/null 2>&1 || die "npm topilmadi (odatda Node.js bilan birga keladi)."

command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 \
    || die "curl yoki wget kerak."

command -v tar >/dev/null 2>&1 || die "tar kerak."

# node-pty (real-time terminal) uchun native build vositalari. Bular
# bo'lmasa CLI baribir o'rnatiladi, lekin terminal ishlamaydi — shuning
# uchun faqat OGOHLANTIRAMIZ, o'rnatishni to'xtatmaymiz (masalan CLI
# faqat `screenctl login` / `screenctl jobs` uchun ishlatilishi ham mumkin).
MISSING_TOOLCHAIN=""
for tool in python3 make g++; do
    command -v "$tool" >/dev/null 2>&1 || MISSING_TOOLCHAIN="$MISSING_TOOLCHAIN $tool"
done
if [ -n "$MISSING_TOOLCHAIN" ]; then
    say "OGOHLANTIRISH: quyidagilar topilmadi:$MISSING_TOOLCHAIN"
    say "  Bular bo'lmasa real-time terminal ishlamasligi mumkin."
    say "  O'rnatish uchun (Ubuntu/Debian):"
    say "    sudo apt-get update && sudo apt-get install -y build-essential python3"
    printf '\n'
fi

say "Node $(node -v)"

# --- Yuklab olish ----------------------------------------------------------

if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/screenctl-cli.tar.gz"
else
    URL="https://github.com/$REPO/releases/download/$VERSION/screenctl-cli.tar.gz"
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM

say "yuklanmoqda: $VERSION"

if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "$TMP/screenctl-cli.tar.gz" \
        || die "Yuklab bo'lmadi: $URL
    Versiya mavjudmi tekshiring:
    https://github.com/$REPO/releases"
else
    wget -qO "$TMP/screenctl-cli.tar.gz" "$URL" \
        || die "Yuklab bo'lmadi: $URL"
fi

# --- O'rnatish -------------------------------------------------------------

mkdir -p "$TMP/unpack"

tar -xzf "$TMP/screenctl-cli.tar.gz" -C "$TMP/unpack" \
    || die "Arxiv ochilmadi — yuklab olingan fayl buzilgan bo'lishi mumkin."

[ -f "$TMP/unpack/package.json" ] \
    || die "Arxivda package.json yo'q — noto'g'ri paket."

say "bog'liqliklar o'rnatilmoqda..."

# --ignore-scripts: node-pty'ning native build'ini bu bosqichda ISHGA
# TUSHIRMAYMIZ. Sabab: agar u yerda xato chiqsa (internet cheklangan,
# yoki build vositalari yo'q), `npm ci` BUTUNLAY to'xtab qoladi va CLI
# umuman o'rnatilmay qoladi — holbuki `login`/`jobs`/`app connect` kabi
# funksiyalar node-pty'ga bog'liq emas. Native build'ni pastda alohida,
# nazorat ostida (muvaffaqiyatsiz bo'lsa ham davom etadigan tarzda)
# qayta urinamiz.
( cd "$TMP/unpack" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund ) \
    || die "npm install muvaffaqiyatsiz tugadi: $URL orqali yuklangan paket buzilgan bo'lishi mumkin."

say "node-pty compile qilinmoqda (real-time terminal uchun)..."
if ( cd "$TMP/unpack" && npm rebuild node-pty --update-binary >/dev/null 2>&1 ); then
    NODE_PTY_OK=1
else
    NODE_PTY_OK=0
fi

mkdir -p "$BIN"

# Eski o'rnatishni to'liq almashtiramiz — aralashib qolmasin.
rm -rf "$SHARE"
mkdir -p "$(dirname "$SHARE")"
mv "$TMP/unpack" "$SHARE"

chmod +x "$SHARE/dist/index.js"
ln -sf "$SHARE/dist/index.js" "$BIN/screenctl"

# node-pty haqiqatan yuklanishini tasdiqlaymiz.
if [ "$NODE_PTY_OK" -eq 1 ] && node -e "require('$SHARE/node_modules/node-pty')" >/dev/null 2>&1; then
    say "o'rnatildi: $BIN/screenctl  (real-time terminal: ishlaydi)"
else
    say "o'rnatildi: $BIN/screenctl"
    say "OGOHLANTIRISH: node-pty compile bo'lmadi — real-time terminal shu qurilmada ishlamaydi."
    say "  (login, jobs, monitoring — qolgan hammasi normal ishlaydi)"
    say "  Sabab odatda: build-essential/python3 yo'q yoki internet cheklangan."
    say "  Tuzatilgach qayta urinish: cd $SHARE && npm rebuild node-pty --update-binary"
fi

# --- PATH ------------------------------------------------------------------

case ":$PATH:" in
    *":$BIN:"*) ;;
    *)
        printf '\n'
        say "DIQQAT: $BIN PATH da yo'q."
        say "Qo'shing (shellingizga qarab ~/.bashrc yoki ~/.zshrc):"
        printf '\n'
        printf '      export PATH="%s:$PATH"\n' "$BIN"
        ;;
esac

printf '\n'
say "Boshlash:"
printf '\n'
printf '      screenctl login              hisobga kirish\n'
printf '      screenctl app connect        shu kompyuterni ulash\n'
printf '      screenctl --help             hamma buyruqlar\n'
printf '\n'
