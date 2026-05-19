Contexte :
Je souhaite créer une application web complète de gestion de cabinet médical. L’application doit gérer plusieurs types d’utilisateurs avec des droits spécifiques, ainsi que différents modules fonctionnels.

Types d’utilisateurs :

SuperAdministrateur – accès total (gestion globale, validation des comptes, supervision).

Médecin – accès total pour le médecin (espace médecin uniquement).

Assistant / Infirmier – accès aux fonctions de l’espace assistant.

Modules obligatoires :

Inscription – formulaire d’inscription pour les rôles : docteur, assistant(e), patient, infirmier(e). Chaque inscription nécessite une activation après vérification d’un virement bancaire (côté admin).

Connexion (login) – authentification sécurisée par email/mot de passe.

Mot de passe oublié (forgot password) – réinitialisation via email.

Espace Assistant :

Gestion des rendez-vous sur un calendrier du cabinet (vue mensuelle/hebdomadaire, création/modification/suppression de RDV).

Ajouter un patient (création de son compte patient).

Envoyer un message à un patient qui possède déjà un compte (messagerie interne).

Rédiger une facture pour un patient (génération PDF, envoi ou impression).

Recherche de dossier patient (par nom, ID, etc.) et envoi instantané du code patient au médecin via la messagerie instantanée (chat intégré).

Espace Médecin :

Gestion des assistants/infirmiers (ajout, suppression, modification).

Gestion des rendez-vous (créer, modifier, annuler, voir la liste/calendrier).

Consultation complète du dossier patient.

Contenu du dossier patient :

Données personnelles du patient (nom, prénom, date naissance, contact, etc.)

Liste des consultations antérieures (chaque consultation inclut : symptômes, rapport, médicaments prescrits, repos prescrit, analyses demandées, etc.)

Liste des consultations chez d’autres médecins utilisant la même application (interopérabilité – partage de données entre instances).

Possibilité de rédiger et imprimer :

Ordonnance médicale

Lettre d’affectation

Certificat d’accompagnement

Certificat de maladie avec repos

Impression de tout document généré.

Fonctionnalités patient :

Le patient peut fixer un rendez-vous (via le calendrier du médecin).

Le patient peut consulter son propre dossier médical (données, consultations antérieures, ordonnances, etc.).

Exigences techniques (à préciser selon votre stack) :

Backend : API REST (Node.js / Express / Django / Laravel…)

Base de données : PostgreSQL ou MySQL

Frontend : React / Vue.js / ou full-stack PHP

Authentification : JWT ou sessions

Calendrier : intégration d’un composant comme FullCalendar

Messagerie instantanée : WebSockets (Socket.io) ou polling

Génération PDF : bibliothèque (ex. jsPDF, wkhtmltopdf)

Interface responsive.

Objectif :
Générer le code complet (backend + frontend) ou les fichiers nécessaires pour que l’application soit fonctionnelle, avec des instructions d’installation et de configuration. Le code doit être propre, commenté et sécurisé.

