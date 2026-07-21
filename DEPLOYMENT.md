# Self-Hosted WebRTC Server Deployment Guide (`DEPLOYMENT.md`)

This guide explains how to host your own **Free, Zero-Credential WebRTC Signaling & Media Server** on a $5–$10/month VPS (e.g. Hetzner, DigitalOcean, Vultr, AWS) so your applications (BJCC, Quiki, mobile/web apps) can connect to your private calling infra without paying any Agora/Twilio fees.

---

## 🏗️ VPS Infrastructure Requirements

- **OS**: Ubuntu 22.04 / 24.04 LTS
- **Specs**: Minimum 2 vCPUs, 2GB–4GB RAM
- **Public Ports Required**:
  - `80` & `443` (TCP) — Nginx HTTP/HTTPS
  - `4000` (TCP) — Fastify + Socket.io Signaling Server
  - `3478` (TCP/UDP) — Coturn STUN/TURN Server
  - `49152-49200` (UDP) — WebRTC Media Relay UDP Port Range

---

## 📦 Step 1: Install Docker & Docker Compose

Run on your VPS terminal:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker
```

---

## 🚀 Step 2: Clone Monorepo & Launch Infra Services

Upload or clone the repository to `/opt/webrtc-platform`:

```bash
cd /opt/webrtc-platform/infra
docker compose up -d
```

Verify containers are running:

```bash
docker ps
```
*(You will see `webrtc-redis` and `webrtc-coturn` running)*

---

## ⚡ Step 3: Run Fastify Signaling Server Systemd Service

Create `/etc/systemd/system/webrtc-signaling.service`:

```ini
[Unit]
Description=WebRTC Signaling Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/webrtc-platform/apps/signaling
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=PORT=4000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now webrtc-signaling
```

Check server health:

```bash
curl http://localhost:4000/health
# Output: {"status":"ok","activeUsers":0,"activeRooms":0}
```

---

## 🔒 Step 4: Nginx Reverse Proxy with Free SSL (Certbot)

Create `/etc/nginx/sites-available/webrtc.conf`:

```nginx
server {
    server_name rtc.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site & obtain Let's Encrypt SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/webrtc.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d rtc.yourdomain.com
sudo systemctl reload nginx
```

---

## 🌐 Step 5: Connecting External Apps (Agora-Style)

Now, any external application can connect to your self-hosted server for **100% free unlimited video/voice calls & chat**:

```tsx
import { WebRTCPlatform } from '@webrtc/sdk';

// Initialize client pointing to your self-hosted server URL
const client = WebRTCPlatform.createClient({
  serverUrl: 'https://rtc.yourdomain.com'
});

// Join room & publish streams instantly
await client.join('class_room_101', 'teacher_user_id');
await client.publishTracks(true, true);
```
