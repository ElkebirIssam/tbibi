# Tbibi.tn — Suivi de développement

## Dernière session : 02/06/2026

### Résumé des modifications

#### Backend

1. **Recherche patient** : ajout `national_id` dans la recherche (`Patient.search()`) et dans les colonnes SELECT
2. **Création patient** : `Patient.create()` et `patientController.create()` acceptent `nationalId` ; auto-link au docteur si le créateur est un `doctor`
3. **Modification patient** : `national_id` et `insurance_provider` (dropdown) dans les champs modifiables
4. **Liaison patient-docteur** : route `POST /doctors/assign-patient` ouverte aux `assistant`/`nurse` ; le contrôleur résout `doctor_id` via `users.doctor_id`
5. **Fee items (Honoraires)** :
   - Table `fee_items` (doctor_id, name, description, price, category, is_active)
   - Modèle `FeeItem` (CRUD) dans `models/index.js`
   - Contrôleur `feeItemController.js` avec `getAll`, `getById`, `create`, `update`, `delete`
   - Routes `GET/POST/PUT/DELETE /api/fee-items`
   - Enregistrée dans `server.js`
6. **Consultations** :
   - Colonne `fee_item_id` + `fee_name` dans la table `consultations`
   - `Consultation.create()` accepte `feeItemId`/`feeName`
   - `Consultation.findByDoctor()` inclut `fee_name` via LEFT JOIN
   - Nouveau endpoint `GET /api/consultations` pour lister les consultations du docteur
7. **Assurances** :
   - Table `assurances` (name, type)
   - 27 assurances tunisiennes seedées (CNAM, CNSS, Mutuelles, GAT, ASTREE, COMAR, etc.)
   - Modèle `Assurance.findAll()`
   - Endpoint `GET /api/patients/assurances/list`
8. **Factures** : `Patient.getInvoices()` inclut désormais les `items` (invoice_items) pour chaque facture
9. **Documents patient** : `Patient.getLabAnalysesForPatient()` ajouté ; `getById` retourne `labAnalyses`

#### Frontend

1. **PatientsPage.jsx** :
   - Auto-chargement des patients liés (`/doctors/patients`)
   - Recherche filtrée côté client (parmi les patients liés)
   - Colonne CIN (`national_id`) dans le tableau
   - Modal à 2 étapes : "Lier un patient existant" (recherche globale, filtre ceux déjà liés) / "Créer un nouveau patient"
   - Champ CIN et Assurance (dropdown) dans le formulaire de création
   - Rafraîchissement automatique après création/liaison (`refreshKey`)
2. **PatientDetail.jsx** :
   - Auto-liaison du patient au docteur lors de l'ouverture
   - Affichage et modification du CIN
   - Assurance en dropdown (select)
   - **Onglet Documents** : sections séparées pour Documents PDF, Ordonnances, Analyses médicales, Certificats médicaux
   - **Onglet Factures** : chaque facture affiche ses lignes de détail (description, quantité, prix unitaire, total)
3. **ConsultationsPage.jsx** :
   - Deux onglets : "Liste" et "Nouvelle consultation"
   - Liste : tableau avec Date, Patient, Code, Acte, bouton "Voir" (popup détail)
   - Formulaire : sélection d'acte (dropdown depuis fee_items), symptômes, rapport, repos, prescriptions (médicament + remarques), analyses
4. **HonorairesPage.jsx** : nouvelle page CRUD pour les honoraires/actes (regroupés par catégorie)
5. **ProfilePage.jsx** : assurance en dropdown
6. **Layout.jsx** : lien "Honoraires" dans Finances (docteur + assistant)
7. **App.jsx** : route `/honoraires` ajoutée

### Navigation médecin
- Tableau de bord, Messagerie, Assistants
- Patients → Fiche Patient, Liste des consultations
- Finances → Factures Clients, Caisse, **Honoraires**, Mon abonnement
- Mes disponibilités, Profil

### Comptes de test
- Admin: admin@tbibi.tn / admin123
- Docteurs: <email> / test123
- Assistants: <email> / assistant123
- Patients: <email> / patient123

### Session 01/06/2026

#### Profil patient — vérification téléphone + email
- **`phone_verified`**, **`phone_verification_code`**, **`phone_verification_expires`** : nouvelles colonnes `users`
- **`POST /api/auth/send-phone-code`** : génère code 6 chiffres, formatte `+216` + log console (fallback WhatsApp)
- **`POST /api/auth/verify-phone`** : valide code + expiration 5 min
- **`POST /api/auth/send-email-verification`** : renvoie l'email de vérification
- **ProfilePage.jsx** : simplifié — seule la vérification téléphone (bouton + code) et email (bouton) apparaissent

#### Factures automatiques depuis les consultations
- **consultationController.create** : auto-génère une facture à la création d'une consultation avec `feeItemId`
  - Si facture `unpaid` existe déjà pour même docteur + patient + jour → ajoute une ligne à la facture existante (consolidation)
  - Sinon → crée une nouvelle facture avec `Invoice.create()`
- **invoiceController.list** : filtre par `doctor_id` pour les rôles `doctor`, `assistant`, `nurse`
- La Caisse affiche automatiquement les factures générées

#### Tri rendez-vous décroissant
- `Appointment.findByPatient` : `ORDER BY a.start_time DESC`

### Commandes

#### Notifications et accès aux consultations
- **`consultation_access_requests`** : nouvelle table + modèle + contrôleur + routes
- **Demande d'accès** : `POST /consultations/:id/request-access` avec notification au médecin cible
- **Réponse** : `PUT /consultations/access-requests/:id/respond` (approve/deny) avec mise à jour du statut de la notification
- **NotificationBell** : fix du `token` (utilise localStorage au lieu de `useAuth()`)
- **Layout.jsx** : lien "Mes notifications" pour les docteurs avec badge non lues (poll 30s + custom event)
- **NotificationsPage** : boutons Accepter/Refuser, statuts colorés (vert/rouge/jaune), infos médecin/patient structurées, rafraîchissement temps réel via socket.io `notification_count`
- **Consultations tab (PatientDetail)** : tableau + popup détail + bouton Accès

#### Sécurisation des données (5 items)
1. **Contrôle d'accès `GET /patients/:id`** : vérification lien `doctor_patients`, 403 si pas autorisé
2. **Rate limiting login** : `express-rate-limit` 5 tentatives/minute sur `/api/auth/login`
3. **Chiffrement AES-256-GCM** : `utils/crypto.js`, colonnes `symptoms`/`report`/`diagnosis`/`medication_name`/`notes` chiffrées en DB, déchiffrées à la lecture
4. **Helmet + CSP** : security headers + politique de contenu restrictive
5. **AuditLog** : `VIEW_PATIENT` loggé à chaque accès au dossier patient

### Session 02/06/2026

#### Split notes d'honoraires + date remboursement
- **`promised_payment_date`** : colonne `DATE` ajoutée à `invoices`
- **`pg` type parser DATE** : `db.js` enregistre un parser pour OID 1082 qui retourne `YYYY-MM-DD` sans décalage UTC
- **`Invoice.split()`** : réduit le total de la note originale, crée une nouvelle note + `invoice_items`
- **`POST /invoices/:id/split`** : route avec `{ amount, description, promisedPaymentDate }` + audit log
- **InvoicesPage.jsx** : nouveau bouton "Diviser" avec modal (montant, date remboursement, description), colonne "Date remb." dynamique, confirmation "Marquer payée", tri impayées en premier
- **`updateStatus` fix** : cast `$1::VARCHAR` pour éviter l'erreur PostgreSQL `42P08`

#### Renommage "Facture" → "Note d'honoraires"
- Partout dans le frontend (Layout, InvoicesPage, CaissePage, PatientDetail, Dashboard) et messages backend
- Colonne "N° Facture" → "N° Note" dans les tableaux

#### CaissePage refonte
- Deux sections : "Notes du jour" (payées aujourd'hui) + "Notes impayées" (toutes)
- Cartes stats : count today, total encaissé, total impayé
- Badges statut en inline styles (évite conflit CSS)

#### Suivi acte fait dans les rendez-vous
- Toutes les requêtes `Appointment` incluent `has_consultation` via LEFT JOIN (vérifie `appointment_id` OU même patient+docteur+date)
- **CalendarPage** : créneaux passés en jaune (#fef9c3), indicateur "✓ Acte fait", masquage boutons confirm/reject/cancel si acte effectué
- **DossierPage** : rendez-vous effectués fond gris (#f1f5f9) + "Consultation faite" en italique

#### Messagerie split Interne/Externe
- **`GET /messages/colleagues?type=internal|external`** :
  - `internal` : assistants/infirmiers liés au même docteur + le docteur lui-même
  - `external` : tous les autres docteurs (avec spécialisation)
- **MessagesPage.jsx** : deux onglets "Interne" / "Externe" filtrés par URL `?type=interne|externe`
- **Layout.jsx** : docteur voit deux liens (interne/externe), assistant/nurse un seul lien
- Route `/:userId` déplacée après `/colleagues` pour éviter conflit Express

#### Navigation layout
- Docteur : ajout "Mes disponibilités" → `/availability`
- Notifications restaurées pour docteur

#### Rendez-vous passés désactivés (booking patient)
- **AppointmentBooking.jsx** : les créneaux passés pour aujourd'hui sont grisés (opacity 0.35, fond gris, "(passé)"), onClick désactivé

#### Messagerie refonte — Chat Interne / Mail Externe
- **Backend : online/offline tracking** (`server.js`) : `Set` d'utilisateurs connectés, émission `online_users`/`user_online`/`user_offline` via Socket.io
- **Backend : typing indicator** (`server.js`) : nouveaux events `stop_typing` (arrêt propre), répétition `typing` toutes les 2s
- **Backend : fix bug `db.query`** (`messageController.js:104`) : corrigé en `pool.query` (crasht si collegues internes)
- **Backend : sender names** (`messageController.js`) : `sender_first_name`/`sender_last_name` attachés au message avant émission socket + réponse REST
- **Frontend : MessagesPage.jsx** : simplifiée — page exclusivement pour l'externe (mail). Interne retiré
- **Interne (Chat)** : bulles WhatsApp-like (vert envoyé/blanc reçu), rondeurs 16px, statut en ligne (point vert), indicateur "X est en train d'écrire...", timestamps, auto-scroll, pas de sujet affiché
- **Externe (Mail)** : bouton "+ Nouveau message" → formulaire avec Destinataire (dropdown médecins), Objet, Message (textarea). Fil de discussion format email (carte blanche avec From, Date, Objet, Corps). Réponse simple (juste texte, sans objet)
- **Layout.jsx** : icône externe changée 💬→📧 ; lien "Messagerie" supprimé pour assistant ; docteur garde lien "Messagerie" → `/messagerie?type=externe`
- **ChatWidget.jsx** : nouveau composant flottant (coin bas-droit) pour la messagerie interne uniquement
  - Bouton rond bleu avec badge nombre de messages non lus (polling 30s)
  - Clic → panneau 370×520px avec animation slideUp
  - Liste des contacts avec point vert en ligne/gris hors-ligne
  - Clic contact → chat instantané dans le même panneau (bulles WhatsApp-like)
  - Indicateur "X est en train d'écrire..."
  - Clic extérieur → fermeture ; retour ← → liste contacts
  - **Fix socket listeners** : utilisation de refs (`activeChatRef`, `openRef`) pour éviter closures obsolètes ; écouteurs montés une seule fois (`[]`)
  - **Fix online status** : émission `get_online_users` au montage + handler côté serveur pour renvoyer la liste des connectés après écoute
  - **Fix feedback erreur** : messages d'erreur visibles dans l'UI (rouge) pour échecs API

### Commandes
- Seed: `cd backend && npm run seed-reset`
- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npx vite --port 3002 --host`
- Migration table access requests: `node backend/migrate.js` (créé automatiquement dans seed-reset step 14)
