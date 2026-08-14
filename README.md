# Cardiag

## Runtime architecture

`js/app.js` loads the unified `data/vehicles.json` data through
`js/db-loader.js`, then initializes `js/legacy-features.js` once. That controller
owns local sheets, vehicle selectors, scoring, photos, signatures, import/export,
comparison, validation, budget calculations, and PDF generation. Its vehicle
indexes are constructed from the loaded data; no historic inline vehicle database
is included in the JavaScript.

Application web pour consulter des fiches techniques de véhicules.

## Assistant atelier

Le frontend propose un diagnostic conversationnel et l'explication contextuelle
d'un texte sélectionné. Le serveur Node protège la clé Gemini et expose
`POST /api/chat` et `POST /api/inline`.

1. Copiez `.env.example` vers `.env` et renseignez `GEMINI_API_KEY`.
2. Exécutez `npm install`, puis `npm run dev`.
3. En local, le frontend utilise automatiquement `http://localhost:3000`.

Le frontend utilise `https://fiche-expert-auto.onrender.com/` comme backend
Render. Ne placez jamais la clé API dans le frontend.

## Parcours métier

Chaque fiche conserve son propre parcours : Acheteur (contrôle avant achat),
Garagiste (état initial avant prise en charge), Vendeur (rapport transparent
avant vente) ou Propriétaire (suivi technique et contrôles simples). Les
suggestions, les instructions de diagnostic et le rapport imprimé s’adaptent
au parcours sélectionné. Les anciennes fiches utilisent automatiquement le
parcours Acheteur.

## Déploiement unique sur Render

Ce dossier contient le frontend et le backend. Déployez-le avec `npm start`,
définissez `LLM_PROVIDER=gemini` et `GEMINI_API_KEY`. Le diagnostic utilise
`gemini-3.5-flash-lite` par défaut et bascule sur `gemini-3.6-flash` uniquement
pour les dossiers longs ou sensibles, puis
ouvrez l'URL Render : Express sert l'interface et les routes `/api/chat` et
`/api/inline` depuis le même domaine.
