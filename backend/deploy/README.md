# Backend'ni production serverga o'rnatish

Bu papkadagi fayllar mavjud Ubuntu serveringizga (Terraform'siz — server
allaqachon bor deb hisoblanadi) backend'ni qo'yish uchun.

Fayllar:
| Fayl | Nima uchun |
|---|---|
| `backend.env.example` | production env o'zgaruvchilari namunasi |
| `screenctl-backend.service` | systemd unit — backend'ni doim ishlab turadigan xizmat qiladi |
| `nginx-screenctl-backend.conf` | Nginx reverse-proxy (WebSocket-aware) + SSL uchun tayyor |
| `deploy.sh` | build → migratsiya → xizmatni qayta ishga tushirish |

## 1. Bir martalik server sozlash

```bash
# Node.js 20 LTS (agar hali yo'q bo'lsa)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Postgres va Redis — agar shu serverda bo'lsa (aks holda managed
# xizmat ishlatayotgan bo'lsangiz, bu qadamni o'tkazib yuboring)
sudo apt-get install -y postgresql redis-server

# Alohida, imtiyozsiz foydalanuvchi — backend shu user nomidan ishlaydi
sudo useradd --system --create-home --shell /usr/sbin/nologin screenctl

# Kod uchun joy
sudo mkdir -p /opt/screenctl
sudo chown screenctl:screenctl /opt/screenctl
```

## 2. Kodni joylashtirish

```bash
sudo -u screenctl git clone <repo-url> /opt/screenctl/repo
sudo -u screenctl ln -s /opt/screenctl/repo/backend /opt/screenctl/backend
```

(Yoki CI/CD orqali rsync qilsangiz ham bo'ladi — muhimi `backend/`
papkasi `/opt/screenctl/backend`da, `screenctl` user yozishi mumkin
bo'lishi kerak.)

## 3. Environment

```bash
sudo mkdir -p /etc/screenctl
sudo cp backend.env.example /etc/screenctl/backend.env
sudo nano /etc/screenctl/backend.env   # DATABASE_URL, JWT_SECRET, CORS_ORIGIN to'ldiring

# Kuchli qiymat generatsiya qilish uchun:
openssl rand -hex 32   # JWT_SECRET uchun ishlating

sudo chown root:screenctl /etc/screenctl/backend.env
sudo chmod 640 /etc/screenctl/backend.env
```

## 4. Ma'lumotlar bazasi (agar shu serverda bo'lsa)

```bash
sudo -u postgres psql -c "CREATE USER screenctl WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE automation_platform OWNER screenctl;"
```

`DATABASE_URL`dagi parol bilan mos kelishini tekshiring.

## 5. systemd

```bash
sudo cp screenctl-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable screenctl-backend
```

(Hali ishga tushirmang — avval build va migratsiya kerak, buni
`deploy.sh` qiladi.)

## 6. Birinchi deploy

```bash
cd /opt/screenctl/backend
sudo -u screenctl ./deploy/deploy.sh
```

Bu `npm ci`, `npm run build`, migratsiyalarni ishga tushiradi va
xizmatni qayta ishga tushiradi (birinchi marta — shunchaki ishga
tushiradi, chunki hali ishlamayapti). Keyingi deploy'larda ham xuddi
shu skriptni ishlating.

```bash
journalctl -u screenctl-backend -f   # loglarni kuzatish
```

## 7. Nginx + SSL

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo cp nginx-screenctl-backend.conf /etc/nginx/sites-available/screenctl-backend.conf
sudo nano /etc/nginx/sites-available/screenctl-backend.conf   # api.yourdomain.com -> haqiqiy domen

sudo ln -s /etc/nginx/sites-available/screenctl-backend.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d api.yourdomain.com
```

`certbot` konfiguratsiyani o'zi tahrirlab, HTTPS va HTTP→HTTPS
redirect'ni qo'shadi.

## 8. Firewall

3000-port tashqariga OCHIQ bo'lmasligi kerak — faqat Nginx (localhost)
orqali kirilsin:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
# 3000-port uchun HECH QANDAY `ufw allow` qo'shmang — u faqat 127.0.0.1'da
# tinglaydi (backend $PORT'ni shunday joylashtiradi), tashqaridan
# tekshirib ko'ring: `curl http://<server-ip>:3000` javob bermasligi kerak.
```

## Tekshirish

```bash
curl https://api.yourdomain.com/swagger    # Swagger UI ochilishi kerak
```

Frontend'dagi `API_BASE`ni shu domenga, CLI'dagi login endpoint'ni ham
shunga yo'naltiring.

## Keyingi deploy'lar

```bash
cd /opt/screenctl/backend
sudo -u screenctl ./deploy/deploy.sh
```
