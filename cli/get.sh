#!/usr/bin/env sh

set -eu

# ============================================================================
# Screenctl CLI installer
#
# O'rnatish:
#
#   curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh | sh
#
# Versiya:
#
#   curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh \
#     | sh -s -- --version cli-v0.2.0
#
# O'chirish:
#
#   curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh \
#     | sh -s -- --uninstall
#
# ============================================================================

REPO="elbekmiddle/ubuntu_automation_api"

VERSION="latest"

PREFIX="${SCREENCTL_PREFIX:-$HOME/.local}"

SHARE="$PREFIX/share/screenctl"
BIN="$PREFIX/bin"

UNINSTALL=0


# ============================================================================
# Helpers
# ============================================================================

say() {
    printf '  %s\n' "$1"
}

die() {
    printf '\n  ERROR: %s\n\n' "$1" >&2
    exit 1
}


# ============================================================================
# Arguments
# ============================================================================

while [ $# -gt 0 ]; do
    case "$1" in

        --version)
            VERSION="${2:-latest}"
            shift 2
            ;;

        --prefix)
            PREFIX="${2:-$PREFIX}"

            SHARE="$PREFIX/share/screenctl"
            BIN="$PREFIX/bin"

            shift 2
            ;;

        --uninstall)
            UNINSTALL=1
            shift
            ;;

        -h|--help)

            cat <<EOF

Screenctl CLI installer

Usage:

  curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh | sh

Specific version:

  curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh \\
    | sh -s -- --version cli-v0.2.0

Custom prefix:

  curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh \\
    | sh -s -- --prefix \$HOME/.local

Uninstall:

  curl -fsSL https://agent.screenctl.honeymedia.uz/install.sh \\
    | sh -s -- --uninstall

EOF

            exit 0
            ;;

        *)
            die "Noma'lum parametr: $1"
            ;;
    esac
done


# ============================================================================
# Uninstall
# ============================================================================

if [ "$UNINSTALL" -eq 1 ]; then

    if command -v screenctl >/dev/null 2>&1; then
        printf '\n'

        say "Agar agent autostart yoqilgan bo'lsa:"
        say "  screenctl app disconnect <app-id>"

        printf '\n'
    fi

    rm -rf "$SHARE"
    rm -f "$BIN/screenctl"

    printf '\n'

    say "screenctl o'chirildi."
    say "Config qoldirildi: ~/.screenctl"

    printf '\n'

    exit 0
fi


# ============================================================================
# Requirements
# ============================================================================

printf '\n'

command -v node >/dev/null 2>&1 \
    || die "Node.js topilmadi. Node.js 18+ kerak."

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"

if [ "$NODE_MAJOR" -lt 18 ]; then
    die "Node.js $(node -v) topildi, lekin Node.js 18+ kerak."
fi


command -v npm >/dev/null 2>&1 \
    || die "npm topilmadi."


command -v tar >/dev/null 2>&1 \
    || die "tar topilmadi."


if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget"
else
    die "curl yoki wget kerak."
fi


# ============================================================================
# Build tools
# ============================================================================

MISSING_TOOLCHAIN=""

for tool in python3 make g++; do

    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLCHAIN="$MISSING_TOOLCHAIN $tool"
    fi

done


if [ -n "$MISSING_TOOLCHAIN" ]; then

    say "OGOHLANTIRISH: build vositalari topilmadi:$MISSING_TOOLCHAIN"

    say "node-pty uchun quyidagini o'rnating:"

    say "  sudo apt-get update"

    say "  sudo apt-get install -y build-essential python3"

    printf '\n'

fi


say "Node: $(node -v)"


# ============================================================================
# Release URL
# ============================================================================

if [ "$VERSION" = "latest" ]; then

    URL="https://github.com/$REPO/releases/latest/download/screenctl-cli.tar.gz"

else

    URL="https://github.com/$REPO/releases/download/$VERSION/screenctl-cli.tar.gz"

fi


# ============================================================================
# Temporary directory
# ============================================================================

TMP="$(mktemp -d)"

cleanup() {
    rm -rf "$TMP"
}

trap cleanup EXIT INT TERM


# ============================================================================
# Download
# ============================================================================

say "Screenctl CLI yuklanmoqda..."
say "Version: $VERSION"

if [ "$DOWNLOADER" = "curl" ]; then

    curl -fL --retry 3 --retry-delay 2 \
        "$URL" \
        -o "$TMP/screenctl-cli.tar.gz" \
        || die "CLI yuklab bo'lmadi."

else

    wget -q \
        "$URL" \
        -O "$TMP/screenctl-cli.tar.gz" \
        || die "CLI yuklab bo'lmadi."

fi


# ============================================================================
# Validate archive
# ============================================================================

if [ ! -s "$TMP/screenctl-cli.tar.gz" ]; then
    die "Yuklangan archive bo'sh."
fi


mkdir -p "$TMP/unpack"


tar -xzf "$TMP/screenctl-cli.tar.gz" \
    -C "$TMP/unpack" \
    || die "CLI archive ochilmadi."


if [ ! -f "$TMP/unpack/package.json" ]; then
    die "Archive ichida package.json topilmadi."
fi


# ============================================================================
# Install dependencies
# ============================================================================

say "Node dependencies o'rnatilmoqda..."

(
    cd "$TMP/unpack"

    npm ci \
        --omit=dev \
        --ignore-scripts \
        --no-audit \
        --no-fund
) || die "npm dependencies o'rnatilmadi."


# ============================================================================
# node-pty
# ============================================================================

say "node-pty compile qilinmoqda..."

NODE_PTY_OK=0

if (
    cd "$TMP/unpack" &&
    npm rebuild node-pty --update-binary >/dev/null 2>&1
); then

    if node -e "require('./node_modules/node-pty')" >/dev/null 2>&1; then
        NODE_PTY_OK=1
    fi

fi


# ============================================================================
# Install files
# ============================================================================

mkdir -p "$BIN"
mkdir -p "$(dirname "$SHARE")"

rm -rf "$SHARE"

mv "$TMP/unpack" "$SHARE"


if [ ! -f "$SHARE/dist/index.js" ]; then
    die "dist/index.js topilmadi."
fi


chmod +x "$SHARE/dist/index.js"


ln -sf "$SHARE/dist/index.js" "$BIN/screenctl"


# ============================================================================
# Result
# ============================================================================

printf '\n'

if [ "$NODE_PTY_OK" -eq 1 ]; then

    say "✓ Screenctl CLI o'rnatildi."
    say "✓ node-pty ishlayapti."
    say "✓ Real-time terminal ishlaydi."

else

    say "✓ Screenctl CLI o'rnatildi."

    say "⚠ node-pty compile bo'lmadi."

    say "⚠ Real-time terminal ishlamasligi mumkin."

fi


say "Binary: $BIN/screenctl"

printf '\n'


# ============================================================================
# PATH
# ============================================================================

case ":$PATH:" in

    *":$BIN:"*)
        ;;

    *)
        say "DIQQAT: $BIN PATH ichida yo'q."

        printf '\n'

        say "Qo'shing:"

        printf '\n'

        printf '  export PATH="%s:$PATH"\n' "$BIN"

        printf '\n'

        ;;
esac


# ============================================================================
# Finish
# ============================================================================

say "Boshlash:"

printf '\n'

say "  screenctl login"

say "  screenctl app connect"

say "  screenctl --help"

printf '\n'