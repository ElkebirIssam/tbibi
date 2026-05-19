# 🏥 Tbibi.tn

Application web complète de gestion de cabinet médical.

## Stack technique

- **Backend:** Node.js / Express / PostgreSQL
- **Frontend:** React (Vite) / React Router v6
- **Auth:** JWT (JSON Web Tokens)
- **Messagerie:** WebSockets (Socket.io)
- **PDF:** PDFKit
- **Calendrier:** FullCalendar

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) 14+
- npm

## Installation

### 1. Cloner le projet

```bash
cd tbibi
```

### 2. Base de données

Créez la base de données PostgreSQL :

```bash
# Méthode 1 : via psql (port PostgreSQL personnalisé 5433)
psql -U postgres -p 5433 -c "CREATE DATABASE tbibi;"

# Méthode 2 : via pgAdmin (interface graphique)
# Créez une base nommée "tbibi"
```

### 3. Backend

```bash
cd backend
npm install

# Lancez les migrations (crée les tables)
npm run migrate

# Crée le super admin par défaut
npm run seed

# Démarrez le serveur (mode dev avec rechargement auto)
npm run dev
```

Le backend démarre sur `http://localhost:5000`.

### 4. Frontend

```bash
cd frontend
npm install

# Démarrez le serveur de développement
npm run dev
```

Le frontend démarre sur `http://localhost:3002`.

## Utilisation

### Compte SuperAdmin

Un super admin est créé automatiquement avec la commande `npm run seed` :

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@tbibi.tn` |
| **Mot de passe** | `admin123` |

### Inscription standard

1. Allez sur `http://localhost:3000/register`
2. Choisissez votre rôle (Médecin, Assistant, Patient, Infirmier)
3. Après inscription, un admin doit vérifier le paiement et activer le compte
4. Une fois activé, connectez-vous sur `http://localhost:3000/login`

### Rôles et accès

| Rôle | Accès |
|------|-------|
| **SuperAdmin** | Gestion des utilisateurs, vérification des paiements, audit logs |
| **Médecin** | Patients, consultations, prescriptions, certificats, RDV, messagerie |
| **Assistant/Infirmier** | RDV, création patient, factures, messagerie, recherche dossier |
| **Patient** | Prise de RDV, consultation dossier, messagerie |

## Structure du projet

```
tbibi/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration DB et SQL init
│   │   ├── controllers/   # Logique métier
│   │   ├── middleware/     # Auth, permissions
│   │   ├── models/        # Accès aux données (PostgreSQL)
│   │   ├── routes/        # Définition des routes API
│   │   ├── utils/         # PDF, helpers
│   │   ├── migrations/    # Script de migration
│   │   └── server.js      # Point d'entrée Express + Socket.io
│   ├── .env               # Variables d'environnement
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Layout, composants réutilisables
│   │   ├── context/       # Contexte Auth
│   │   ├── pages/         # Pages (Login, Dashboard, Patients, etc.)
│   │   ├── services/      # API Axios, Socket.io
│   │   ├── App.jsx        # Routes
│   │   ├── main.jsx       # Point d'entrée React
│   │   └── index.css      # Styles globaux
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── prompt.md              # Cahier des charges initial
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/forgot-password` - Mot de passe oublié
- `POST /api/auth/reset-password` - Réinitialisation mot de passe
- `POST /api/auth/verify-payment` - Soumettre preuve de paiement
- `GET /api/auth/profile` - Profil utilisateur
- `PUT /api/auth/profile` - Mettre à jour le profil

### Rendez-vous
- `GET /api/appointments` - Liste des RDV
- `POST /api/appointments` - Créer un RDV
- `PUT /api/appointments/:id` - Modifier un RDV
- `DELETE /api/appointments/:id` - Annuler un RDV

### Patients
- `GET /api/patients/search?q=` - Rechercher un patient
- `GET /api/patients/:id` - Dossier patient complet
- `POST /api/patients` - Créer un patient (assistant)

### Docteurs
- `GET /api/doctors/patients` - Liste des patients du docteur
- `GET /api/doctors/assistants` - Liste des assistants
- `POST /api/doctors/assistants` - Ajouter un assistant

### Consultations
- `POST /api/consultations` - Créer une consultation
- `POST /api/consultations/:id/prescriptions` - Ajouter prescription
- `POST /api/consultations/:id/lab-analyses` - Ajouter analyse
- `POST /api/consultations/:patientId/:consultationId/generate-prescription` - Générer PDF ordonnance

### Messagerie
- `GET /api/messages/conversations` - Liste des conversations
- `GET /api/messages/:userId` - Messages avec un utilisateur
- `POST /api/messages` - Envoyer un message

### Admin
- `GET /api/admin/users` - Liste des utilisateurs
- `PUT /api/admin/users/:id/toggle-active` - Activer/désactiver
- `GET /api/admin/payments` - Paiements en attente
- `PUT /api/admin/payments/:id/verify` - Vérifier un paiement
