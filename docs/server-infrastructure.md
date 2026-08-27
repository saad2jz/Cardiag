# Rappels de brouillons et équipes professionnelles

## Variables Render requises

Les deux fonctions restent désactivées sans ces variables :

```text
SMTP_HOST=smtp.zoho.eu
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@votre-domaine.fr
SMTP_PASSWORD=mot-de-passe-application
SMTP_FROM="CarDiag <notifications@votre-domaine.fr>"
DRAFT_REMINDERS_ENABLED=true
DRAFT_RETENTION_DAYS=30
DRAFT_REMINDER_DAYS=2
```

La suppression automatique est volontairement séparée : ne définir `DRAFT_PURGE_ENABLED=true` qu'après une période de test des rappels. Les fiches locales sur l'appareil ne sont jamais supprimées par ce job.

## Planification Render

Créer un **Cron Job Render**, avec les mêmes variables Firebase Admin et SMTP que le Web Service :

```text
Build command: npm ci
Start command: node scripts/run-draft-maintenance.mjs
Schedule: 15 7 * * *
```

Alternative pour un ordonnanceur externe : appeler `POST /api/internal/draft-maintenance` avec l'en-tête `X-CRON-SECRET`. Définir un `CRON_SECRET` aléatoire d'au moins 32 caractères sur Render. Ne jamais l'exposer au navigateur.

## Modèle Firestore (accès serveur uniquement)

```text
users/{uid}/history/{inspectionId}
  draft: { status: "draft" | "complete", reminderSentAt }

teams/{teamId}
teams/{teamId}/members/{uid}
teams/{teamId}/inspections/{inspectionId}
teamInvitations/{random-256-bit-token}
```

Les rôles sont `owner`, `editor`, `viewer`. Seul `owner` invite ou modifie les membres; `owner` et `editor` peuvent partager une fiche dans leur équipe. Les invitations expirent en sept jours et sont liées à l'e-mail Firebase du destinataire.

## Routes protégées

- `GET|POST /api/account/team`
- `POST /api/account/team/invitations`
- `POST /api/account/team/invitations/:token/accept`
- `PATCH|DELETE /api/account/team/members/:uid`
- `GET /api/account/team/history`
- `POST /api/account/team/history/:id`

Toutes nécessitent un jeton Firebase valide et une adresse e-mail vérifiée. Les e-mails d'invitation ne partent pas sans SMTP configuré.
