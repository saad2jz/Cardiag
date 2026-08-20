# Changelog

## 2026-08-14 — Parcours métier contextualisés

### Parcours et données

- Les champs du bloc « Contexte du dossier » qui ne correspondent pas au persona actif sont désormais masqués **et désactivés**. Ils sont également retirés lors de la sauvegarde, de l’export JSON, de la synchronisation et de la génération du rapport.
- Le VIN est obligatoire pour les parcours Garagiste/Mécanicien et Agence de location, avec un message de traçabilité adapté. Il reste optionnel pour Acheteur, Vendeur et Propriétaire.
- Les fiches historiques sans `usage_scenario` restent compatibles et utilisent le parcours Acheteur.

### Score et mode rapide

Chaque parcours possède un preset différent, modifiable manuellement et sauvegardé séparément :

| Parcours | Organes vitaux | Châssis | Esthétique/confort |
|---|---:|---:|---:|
| Acheteur | 7 | 4 | 1 |
| Garagiste/Mécanicien | 7 | 5 | 2 |
| Agence de location | 5 | 6 | 5 |
| Vendeur | 5 | 4 | 3 |
| Propriétaire | 7 | 5 | 1 |

- Le mode rapide sélectionne désormais 12 contrôles propres à chaque persona.
- Le calcul des anciennes fiches utilise le preset du persona enregistré dans chaque fiche, y compris dans la galerie et les comparaisons.

### Rapports, sécurité et accessibilité

- Le titre, le contexte, la page financière et les rôles de signature du PDF premium sont adaptés au persona actif.
- La marge de négociation n’est affichée que pour les parcours Acheteur et Vendeur.
- L’import JSON demande confirmation et crée toujours une nouvelle fiche sans écraser l’existant.
- Les endpoints IA sont limités par UID authentifié ou, à défaut, par adresse IP ; l’API renvoie `429` et `Retry-After` en cas d’abus.
- Les emojis de la navigation principale ont été remplacés par des icônes SVG avec libellés accessibles.
- Le cache PWA passe à `cardiag-v44` et précharge les nouveaux modules et icônes.

### Vérification

- Tests unitaires ajoutés pour deux scénarios de score par persona, les cinq modes rapides, le nettoyage des données, la règle VIN et le rate-limiting.
