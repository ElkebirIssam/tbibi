# Guide de mise en production — Tbibi.tn

## Architecture cible

```
Client Browser
      │
      ├── Frontend (Vite static build) → Servi par Nginx / CDN
      │
      └── Backend (Node.js/Express)   → Servi par PM2 + Nginx (reverse proxy)
                                             │
                                        PostgreSQL
```

---

## 1. Backend — Configuration

### 1.1 Variables d'environnement

Créez `backend/.env` (production) :

```env
NODE_ENV=production
PORT=5000

DB_HOST=<ip-du-serveur-postgres>
DB_PORT=5432
DB_NAME=tbibi
DB_USER=tbibi_user
DB_PASSWORD=<mot-de-passe-fort>

JWT_SECRET=<clé-secrète-aléatoire-64-caractères>
JWT_EXPIRES_IN=7d

CLIENT_URL=https://votre-domaine.com

# SMTP (obligatoire pour les emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=<mot-de-passe-application>
SMTP_FROM=Tbibi.tn <votre.email@gmail.com>
```

### 1.2 Lancer avec PM2

```bash
cd backend
npm install --production
npm run migrate
npm run seed

# Installation globale PM2
npm install -g pm2

# Démarrage
pm2 start src/server.js --name tbibi-backend -i max

# Sauvegarde de la configuration (redémarrage automatique au boot)
pm2 save
pm2 startup
```

---

## 2. Frontend — Build statique

```bash
cd frontend
npm install
npm run build
```

Les fichiers générés se trouvent dans `frontend/dist/`.  
Configurez votre serveur web (Nginx) pour servir ce dossier.

### Exemple de configuration Nginx

```nginx
# /etc/nginx/sites-available/tbibi

upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name votre-domaine.com;

    # Frontend (fichiers statiques)
    root /chemin/vers/frontend/dist;
    index index.html;

    # SPA — rediriger toutes les routes vers index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API — proxy vers le backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket (Socket.io)
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL (Let's Encrypt / Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

---

## 3. PostgreSQL — Production

```bash
# Création d'un utilisateur dédié
sudo -u postgres psql
CREATE USER tbibi_user WITH PASSWORD '<mot-de-passe-fort>';
CREATE DATABASE tbibi OWNER tbibi_user;
GRANT ALL PRIVILEGES ON DATABASE tbibi TO tbibi_user;

# Appliquer les migrations
cd backend
NODE_ENV=production npm run migrate
```

---

## 4. Supervision et logs

```bash
# Logs PM2
pm2 logs tbibi-backend
pm2 monit

# Redémarrage automatique (déjà fait via pm2 startup)
```

---

## Checklist avant mise en production

- [ ] Changer `JWT_SECRET` (clé forte et unique)
- [ ] Changer `DB_PASSWORD` (mot de passe robuste)
- [ ] Configurer SMTP pour l'envoi d'emails
- [ ] Vérifier que `CLIENT_URL` pointe vers le bon domaine
- [ ] Désactiver le mode debug / dev dans le code
- [ ] Mettre en place une sauvegarde automatique PostgreSQL (cron)
- [ ] Activer HTTPS (Certbot)
- [ ] Tester le flux complet (inscription → connexion → RDV → consultation)
- [ ] Surveiller les logs applicatives

---

## Commandes récapitulatives

| Action | Commande |
|--------|----------|
| Build frontend | `cd frontend && npm run build` |
| Démarrer backend (PM2) | `pm2 start backend/src/server.js --name tbibi-backend` |
| Migrations | `cd backend && npm run migrate` |
| Seed super admin | `cd backend && npm run seed` |
| Logs temps réel | `pm2 logs tbibi-backend` |
