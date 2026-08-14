# Ouvrir CarDiag dans Android Studio

1. Installer Android Studio avec son SDK Android et son JDK intégré.
2. Dans Android Studio, choisir **Open**.
3. Sélectionner le dossier `android` situé à la racine de ce projet.
4. Attendre la fin de la synchronisation Gradle.
5. Choisir un émulateur ou un téléphone Android, puis cliquer sur **Run**.

## Synchroniser les changements web

Depuis la racine du projet :

```powershell
npm.cmd run cap:sync
```

Cette commande reconstruit le dossier web natif `www`, puis copie uniquement les ressources nécessaires dans le projet Android. Les fichiers serveur, `.env` et `node_modules` ne sont jamais intégrés à l'application.

## Paramètres natifs

- Application ID : `com.cardiag.online`
- Nom : `CarDiag`
- API distante : `https://fiche-expert-auto.onrender.com/`
- Projet Android Studio : `android/`
