#!/usr/bin/env bash
# ============================================================================
# Screenctl backend — deploy script.
#
# Ishlatish (serverda, /opt/screenctl/backend papkasidan):
#   ./deploy/deploy.sh
#
# Nima qiladi:
#   1. (agar git repo bo'lsa) so'nggi kodni tortib oladi
#   2. to'liq bog'liqliklarni o'rnatadi (build uchun devDependencies kerak)
#   3. TypeScript'ni build qiladi (dist/)
#   4. migratsiyalarni ishga tushiradi (IF NOT EXISTS bilan yozilgan —
#      qayta-qayta ishga tushirish xavfsiz)
#   5. production uchun keraksiz devDependencies'ni olib tashlaydi
#   6. systemd xizmatini qayta ishga tushiradi
#
# Talab: /etc/screenctl/backend.env mavjud bo'lishi kerak
#        (namuna: backend.env.example)
# ============================================================================

set -euo pipefail

SERVICE_NAME="screenctl-backend"
ENV_FILE="/etc/screenctl/backend.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

echo "== 1/6: kod ==" 
if [ -d .git ]; then
    git pull --ff-only
else
    echo "  (.git topilmadi — joriy kod holati bilan davom etiladi)"
fi

echo "== 2/6: bog'liqliklar (npm ci) =="
npm ci

echo "== 3/6: build =="
npm run build

echo "== 4/6: migratsiyalar =="
if [ ! -f "$ENV_FILE" ]; then
    echo "XATO: $ENV_FILE topilmadi. backend.env.example'dan nusxa oling." >&2
    exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

if [ -z "${DATABASE_URL:-}" ]; then
    echo "XATO: DATABASE_URL $ENV_FILE ichida yo'q." >&2
    exit 1
fi

for file in src/database/migrations/*.sql; do
    echo "  -> $(basename "$file")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "== 5/6: production uchun tozalash =="
npm prune --omit=dev

echo "== 6/6: xizmatni qayta ishga tushirish =="
sudo systemctl restart "$SERVICE_NAME"
sleep 1
sudo systemctl --no-pager status "$SERVICE_NAME" | head -10

echo
echo "Tayyor. Loglar uchun: journalctl -u $SERVICE_NAME -f"
