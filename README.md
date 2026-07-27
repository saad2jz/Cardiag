# Fiche d'Expertise — Véhicule d'Occasion

Application web (100% front-end, hors-ligne) pour l'inspection terrain d'un
véhicule d'occasion. Les données véhicules (marques/modèles/générations/
motorisations) sont chargées à la demande depuis `data/*.json` au lieu
d'être codées en dur — tu peux enrichir/étendre cette base sans toucher au
code de l'app.

## Déploiement sur GitHub Pages

1. Pousse tout le contenu de ce dossier à la racine de ton repo (ou dans le
   dossier `docs/` si tu configures Pages sur ce dossier).
2. Dans **Settings → Pages**, choisis la branche et le dossier
   (`/ (root)` ou `/docs`) puis enregistre.
3. Ton app est servie à `https://<user>.github.io/<repo>/`.

Tous les chemins du projet (`css/styles.css`, `js/app.js`, `data/...`,
`sw.js`, `manifest.json`) sont **relatifs** (pas de `/` en tête) : ça
fonctionne aussi bien en page de projet (`user.github.io/repo/`) qu'en page
utilisateur/racine (`user.github.io/`). Ne remplace pas ces chemins par des
chemins absolus, ça casserait le déploiement en sous-dossier.

## Structure du projet

```
index.html                     ← page principale
manifest.json                  ← PWA (installable)
sw.js                          ← Service Worker (cache hors-ligne)
css/styles.css                 ← toute la charte graphique
js/
  app.js                       ← logique applicative (score, fiches, PDF, points de vigilance, etc.)
  db-loader.js                 ← chargement paresseux des données véhicules
  pdf-exporter.js              ← génération PDF / repli impression
data/
  marques.json                 ← liste des marques (chargée une fois)
  modeles/{marque}.json        ← modèles/générations/motorisations/points faibles d'UNE marque
  precache-manifest.json       ← liste des fichiers data à mettre en cache (généré)
source-data/                  ← tes fichiers JSON source (format riche, voir plus bas)
build-data.js                 ← script Node qui génère tout /data à partir de source-data/
```

## Ajouter / mettre à jour des voitures

La base est pilotée par un ou plusieurs fichiers JSON **source** que tu déposes
dans `source-data/`, transformés par `build-data.js` en fichiers `data/*.json`
prêts à être chargés par l'app (un fichier par marque + un index).

### Format attendu des fichiers source

Chaque fichier dans `source-data/` est un **tableau de marques** :

```json
[
  {
    "marque": "Peugeot",
    "modeles": [
      {
        "nom": "205",
        "generations": [
          {
            "code_chassis": "205 (Type 20)",
            "annees": "1983-1998",
            "phases": ["Phase 1 (1983-1988)", "Phase 2 (1988-1998)"],
            "motorisations": [
              {
                "type": "Essence",
                "nom": "1.0 XV8 - 45ch",
                "code_moteur": "XV8",
                "cylindree": "954cm3",
                "puissance_ch": 45,
                "boite": ["BVM4"],
                "points_faibles": [
                  {
                    "probleme": "Description du problème connu",
                    "symptomes": ["Symptôme 1", "Symptôme 2"],
                    "kilometrage_apparition": "Ex : dès 80 000 km",
                    "diagnostic": "Comment le contrôler",
                    "piece_concernee": "Nom de la pièce/du système",
                    "gravite": "Majeure / Modérée / Mineure",
                    "frequence": "Fréquent / Occasionnel / Rare",
                    "cout_reparation_estime": "Ex : 500 à 1500 €"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]
```

Tu peux déposer **plusieurs fichiers** dans `source-data/` (un par lot de
marques — par exemple `marques_francaises.json`, `marques_allemandes.json`,
etc.) : `build-data.js` les fusionne tous automatiquement. Si une marque
apparaît dans plusieurs fichiers, ses modèles sont concaténés.

L'app affiche automatiquement, sous le sélecteur de motorisation, un
encadré **« Points de vigilance connus »** listant chaque `probleme` avec
sa gravité (badge coloré), ses symptômes, le kilométrage d'apparition, la
méthode de diagnostic et le coût de réparation estimé — repris aussi dans
la synthèse PDF générée en fin d'inspection.

### 1. Déposer tes fichiers sources

```bash
cp mes-nouvelles-marques.json source-data/
```

### 2. Régénérer les données

```bash
node build-data.js
```

Cela recrée entièrement le dossier `data/` :
- `data/marques.json`
- `data/modeles/{marque-slug}.json` (un fichier par marque, format riche conservé tel quel)
- `data/precache-manifest.json` (liste pour le Service Worker)

Le script affiche un résumé (nombre de marques/modèles/motorisations/points
faibles) pour vérifier que tout a bien été pris en compte.

### 3. Committer et pousser

```bash
git add data/ source-data/
git commit -m "Ajout de nouvelles voitures à la base"
git push
```

GitHub Pages republie automatiquement. Pense à **incrémenter
`CACHE_VERSION`** dans `sw.js` si tu veux forcer les navigateurs déjà
visités à récupérer les nouvelles données immédiatement plutôt que de
servir l'ancien cache hors-ligne.

## Fonctionnement hors-ligne

Après une première visite en ligne, le Service Worker a mis en cache
l'app shell et toutes les données véhicules : l'app fonctionne ensuite sans
connexion (utile en zone blanche pendant une visite). Si une marque n'a
jamais été chargée en ligne, l'app bascule automatiquement sur la saisie
libre (marque et modèle en texte manuel).

## Test local avant déploiement

Le Service Worker et les `fetch()` nécessitent un vrai serveur HTTP (pas
`file://`). Depuis ce dossier :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080` (ou le port indiqué).
