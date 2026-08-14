# CarDiag — configuration Android de production

Le code reste utilisable sans compte. L'authentification et la synchronisation sont activées uniquement lorsque Firebase est configuré.

## 1. Firebase et Google Sign-In

1. Créer un projet Firebase et une application Android `com.cardiag.online`.
2. Activer **Authentication > Email/Password** et **Google**.
3. Ajouter les empreintes SHA-1 et SHA-256 des certificats debug, upload et Play App Signing.
4. Télécharger `google-services.json` dans `android/app/google-services.json` (ce fichier secret est ignoré par Git).
5. Remplir les valeurs publiques de `firebase-config.json` pour le client Web.
6. Dans Render, ajouter les secrets serveur suivants :

   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (avec les retours de ligne encodés `\n`)
   - `ANDROID_APP_LINK_SHA256` (une ou plusieurs empreintes SHA-256 séparées par des virgules)
   - `PUBLIC_ORIGIN=https://cardiag.online` (origine utilisée pour les liens de rapport)

Les routes `/api/account/*` refusent toute requête sans jeton Firebase vérifié côté serveur. La synchronisation et les notifications exigent aussi une adresse email vérifiée.

## 2. Firestore et notifications

Créer une base Firestore. Le serveur Admin utilise les collections privées suivantes :

- `users/{uid}` : profil et consentement ;
- `users/{uid}/history/{ficheId}` : fiches synchronisées ;
- `users/{uid}/devices/{hash}` : jetons FCM.
- `reportShares/{token}` : copies de rapport en lecture seule, expirant après 30 jours.

FCM est reçu par `@capacitor/push-notifications`. Le bouton **Paramètres > Tester les notifications** vérifie toute la chaîne serveur/appareil. Les rappels planifiés doivent appeler le même service d'envoi depuis un Cloud Scheduler/Cloud Function ou un worker Render persistant.

## 3. App Links

Le manifeste accepte `https://cardiag.online/fiche/{id}` et `cardiag://fiche/{id}`. Une fois `ANDROID_APP_LINK_SHA256` défini, le serveur publie automatiquement `/.well-known/assetlinks.json`. L'empreinte Play App Signing doit être incluse avant publication.

## 4. Signature Play Store

Copier `android/keystore.properties.example` vers `android/keystore.properties`, placer le keystore hors du dépôt et remplacer les quatre valeurs. Les secrets et keystores sont ignorés par Git. Pour la CI, définir aussi :

- `CARDIAG_VERSION_CODE` : entier strictement croissant ;
- `CARDIAG_VERSION_NAME` : version visible, par exemple `1.0.0`.

Commande de production :

```powershell
npm run cap:sync
cd android
./gradlew bundleRelease
```

Le projet compile avec Java 21, `compileSdk 36` et `targetSdk 36`. Le build release active R8 et la réduction des ressources.

## 5. Play Console et conformité

- URL de politique de confidentialité : `https://cardiag.online/privacy.html`
- URL externe de suppression : `https://cardiag.online/account-deletion.html`
- Déclarer les usages caméra et notifications dans la fiche **Data safety**.
- Vérifier/remplacer les adresses `privacy@cardiag.online` et `contact@cardiag.online` avant publication.
- Ne jamais committer `google-services.json`, un keystore, ses mots de passe ou les secrets Firebase Admin.

## 6. Contrôle local

Installer Android Studio avec son JDK 21 et le SDK Android 36, puis lancer :

```powershell
npm test
npm run cap:sync
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```
