# Checklist de déploiement sécurité

Les protections applicatives sont dans le code. Les actions ci-dessous
dépendent toutefois des consoles Firebase, Google Cloud et Render et doivent
être réalisées avant un déploiement de production.

## Secrets

1. Révoquer toute clé de compte de service Firebase qui a été copiée dans un
   chat, un terminal ou un historique Git.
2. Créer une nouvelle clé de compte de service dans Google Cloud.
3. Mettre à jour `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` et
   `FIREBASE_PRIVATE_KEY` dans les variables d'environnement Render. La clé
   privée doit conserver les retours à la ligne `\n` et ne doit jamais être
   ajoutée au dépôt.
4. Redéployer, puis supprimer l'ancienne clé dans Google Cloud.

## Firebase

1. Déployer les règles Firestore et Storage les plus restrictives possibles.
   Toutes les opérations de compte et de partage de ce projet passent par le
   serveur ; les règles clientes ne doivent pas ouvrir les collections
   `users` ou `reportShares` au public.
2. Vérifier dans Firebase Authentication les domaines autorisés :
   `cardiag.online`, `www.cardiag.online` et
   `fiche-expert-auto.onrender.com` si ce domaine est encore utilisé.
3. Tester la suppression de compte avec un compte de démonstration et
   vérifier que Firebase Auth, les sous-collections utilisateur et les liens
   de partage sont bien supprimés.

## Limitation distribuée

Le limiteur intégré protège une instance Render et limite aussi la lecture
publique des rapports. Pour une montée en charge avec plusieurs instances,
remplacez ce stockage mémoire par un compteur atomique à durée de vie (Redis,
Upstash ou un service équivalent). Ne déployez plusieurs instances qu'après
cette étape.

## Vérifications de publication

1. Confirmer que la société éditrice, l'adresse postale et le contact DPO le
   cas échéant sont renseignés dans les mentions légales et la politique de
   confidentialité.
2. Vérifier la procédure manuelle de suppression : une demande e-mail doit
   être validée par réponse depuis l'adresse du compte avant toute action.
3. Tester un lien de rapport expiré et un lien révoqué : ils doivent répondre
   `404` immédiatement.
