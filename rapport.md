# Rapport de Sécurisation — Tbibi.tn

## Résumé

Cinq mesures de sécurité ont été implémentées pour protéger les données médicales des patients contre les accès non autorisés et les attaques.

---

## 1. Contrôle d'accès aux dossiers patients

**Fichier :** `backend/src/controllers/patientController.js` — méthode `getById`

**Problème :** Tout médecin authentifié pouvait consulter le dossier de n'importe quel patient, même sans lien.

**Solution :**
- Vérification de l'existence d'un lien dans `doctor_patients` avant de renvoyer les données
- Pour les `doctor` : résolution via `Doctor.findByUserId`
- Pour les `assistant`/`nurse` : résolution du `doctor_id` depuis `users.doctor_id`
- Accès autorisé sans vérification pour `super_admin` et `patient` (son propre dossier)
- Retour **403 Forbidden** si pas de lien

```sql
SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2
```

---

## 2. Rate limiting — Connexion

**Package :** `express-rate-limit`

**Fichier :** `backend/src/routes/auth.js`

**Problème :** Aucune limite sur `POST /api/auth/login` → brute force possible.

**Solution :**
- Limite : **5 tentatives par minute** par IP
- Message : *"Trop de tentatives. Réessayez dans une minute."*
- Headers standard `RateLimit-*` activés

```js
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
});
```

---

## 3. Chiffrement AES-256-GCM

**Fichier :** `backend/src/utils/crypto.js`

**Principe :** Chiffrement au niveau application (transparent pour la base de données).

**Algorithme :** AES-256-GCM (chiffrement authentifié) avec IV aléatoire de 16 bytes.

**Clé :** `ENCRYPTION_KEY` dans `.env`, transformée en clé de 32 bytes via `crypto.scryptSync`.

**Format stocké :** `iv:tag:encrypted` (hex)

**Colonnes chiffrées :**

| Table | Colonnes |
|-------|----------|
| `consultations` | `symptoms`, `report`, `diagnosis` |
| `prescriptions` | `medication_name`, `notes` |

**Lecture :** Déchiffrement automatique dans les méthodes `findById`, `findByDoctor`, `getPrescriptions`, `getConsultations` du modèle.

**Écriture :** Chiffrement automatique dans `create` et `addPrescription`.

**Fonctionnement :**
- Si la valeur est `null` ou ne contient pas `:` → retournée telle quelle (pas de chiffrement pour les champs vides, rétrocompatibilité)
- Si la valeur est chiffrée → déchiffrée

---

## 4. Helmet & CSP

**Package :** `helmet`

**Fichier :** `backend/src/server.js`

**Mesures :**
- Headers de sécurité standards (X-Content-Type-Options, X-Frame-Options, etc.)
- Content-Security-Policy :

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data:
connect-src 'self' ws://localhost:3002 http://localhost:5000
```

---

## 5. Audit logging des accès

**Fichier :** `backend/src/controllers/patientController.js`

**Action journalisée :** Chaque consultation du dossier patient (`GET /patients/:id`) enregistre :

| Champ | Valeur |
|-------|--------|
| `userId` | ID du médecin/assistant ayant consulté |
| `action` | `VIEW_PATIENT` |
| `entityType` | `patient` |
| `entityId` | ID du patient consulté |
| `ipAddress` | Adresse IP de la requête |

**Table :** `audit_logs` (existante, déjà utilisée pour `CREATE_CONSULTATION`, `LOGIN`, etc.)

---

## Configuration requise

### `.env`

```env
ENCRYPTION_KEY=tbibi_encryption_key_2024_must_be_32_bytes!!
```

### Nouvelles dépendances

```json
"express-rate-limit": "^7.x",
"helmet": "^8.x"
```

---

## Prochaines recommandations

- [ ] **HTTPS** : Tout passe en clair actuellement
- [ ] **Fichiers uploadés** : Les PDF dans `/uploads` et `/temp` sont accessibles sans authentification
- [ ] **Rotation JWT** : Réduire `JWT_EXPIRES_IN` à 15 min + refresh token `httpOnly`
- [ ] **2FA** : OTP par email pour les médecins
- [ ] **Détection d'anomalies** : Alertes sur accès hors horaires ou volume anormal
