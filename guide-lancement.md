# Guide de lancement — Tbibi.tn (Développement local)

## Prérequis

- Node.js v18+
- PostgreSQL 14+
- npm

---

## 1. Cloner et installer les dépendances

```bash
# À la racine du projet
npm install

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

## 2. Configurer la base de données

Créez la base PostgreSQL (adapter le port si nécessaire) :

```bash
psql -U postgres -p 5432 -c "CREATE DATABASE tbibi;"
```

Configurez les accès dans `backend/.env` :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tbibi
DB_USER=postgres
DB_PASSWORD=postgres
```

## 3. Lancer les migrations et le seed

```bash
cd backend
npm run migrate    # Crée les tables
npm run seed       # Crée le super admin
cd ..
```

## 4. Démarrer l'application

```bash
# Depuis la racine (lance backend + frontend en parallèle)
npm run dev
```

- **Backend** : http://localhost:5000
- **Frontend** : http://localhost:3002

## 5. Compte par défaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@tbibi.tn` |
| Mot de passe | `admin123` |

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance backend + frontend |
| `npm run dev:backend` | Backend seul (nodemon) |
| `npm run dev:frontend` | Frontend seul (Vite) |
| `npm run migrate` | Exécute les migrations DB |
| `npm run seed` | Insère le super admin |
| `npm run seed-test` | Insère des données de test |
