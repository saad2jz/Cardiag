# Architecture SEO CarDiag

## Choix retenu

La page d'accueil est rendue directement dans `index.html`. Elle contient son titre, sa proposition de valeur, les parcours, le fonctionnement et l'aperçu du rapport sans dépendre de JavaScript. Un changement vers SSR n'est donc pas nécessaire pour les pages publiques actuelles.

Le module `js/landing/landing.js` ne sert qu'à l'interactivité : langue, sélection d'un parcours et passage vers le tunnel existant. Si JavaScript tarde à charger, le contenu marketing reste lisible et indexable.

## Pages publiques

- `/` : indexable, canonical vers `https://cardiag.online/`.
- `/privacy.html`, `/terms.html`, `/account-deletion.html` : indexables avec titre, description et canonical propres.
- `/fiche/:id`, `/r/:id` et `/api/*` : exclus de `robots.txt`; les rapports partagés utilisent aussi `noindex,nofollow`.

## Performance

- L'image principale Higgsfield est stockée en WebP (environ 53 Ko), dimensionnée et décodée de manière asynchrone.
- Le mockup de rapport est construit en HTML/CSS, sans bibliothèque graphique supplémentaire.
- Les polices et scripts déjà utilisés par l'application sont réutilisés.
- Le PDF de démonstration n'est téléchargé qu'après une action explicite, tout en restant disponible hors ligne après installation PWA.

## Évolution

Un SSG ou SSR ne deviendra utile que si CarDiag ajoute de nombreuses pages éditoriales dynamiques (guides par marque, fiches conseils ou pages localisées). Dans ce cas, ces pages pourront être pré-rendues séparément sans migrer le tunnel métier.
