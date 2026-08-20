const SETTINGS_KEY = 'cardiag_app_settings_v1';

const EN = {
  'wizard.profile': 'Your goal',
  'wizard.vehicle': 'Vehicle identification',
  'wizard.context': 'Case context',
  'wizard.expertise': 'Inspection and summary',
  'wizard.next': 'Next',
  'wizard.start': 'Start',
  'wizard.inspect': 'Start inspection',
  'wizard.generate': 'Generate report',
  'wizard.back': 'Back',
  'wizard.step': 'Step {step} of {total} · {title}',
  'validation.vin.mechanic': 'The VIN is required to document the workshop intake.',
  'validation.vin.rental': 'The VIN is required to ensure fleet-vehicle traceability.',
  'validation.identification': 'Complete {fields} before continuing.',
  'import.confirm': 'Import this JSON file as a new report? No existing report will be overwritten.',
  'vehiclePicker.title': 'Choose a saved vehicle',
  'vehiclePicker.intro': 'Reuse an existing vehicle or create a new report.',
  'vehiclePicker.add': '＋ Add a new vehicle',
  'vehiclePicker.empty': 'No saved vehicle yet. Add your first vehicle below.',
  'vehiclePicker.saved': 'Saved vehicle',
  'vehiclePicker.active': 'Current',
  'vehiclePicker.compareChoose': 'Choose another vehicle',
  'vehiclePicker.compare': 'Compare with another vehicle',
  'vehiclePicker.compareIntro': 'Add a second vehicle to your pre-purchase analysis.',
  'vehiclePicker.compareRun': 'View comparison',
  'profile.heading': 'What would you like to do today?',
  'profile.intro': 'The checklist, assistant and final report adapt automatically to your situation.',
  'profile.buyer': 'Buyer',
  'profile.buyer.description': 'Inspect a vehicle before purchase, identify risks and prepare the negotiation.',
  'profile.mechanic': 'Mechanic',
  'profile.mechanic.description': 'Document the initial condition and customer complaint before workshop intake.',
  'profile.rental': 'Rental agency',
  'profile.rental.description': 'Manage fleet mileage and vehicle condition before and after each rental.',
  'profile.seller': 'Seller',
  'profile.seller.description': 'Create a transparent, complete report to share with a future buyer.',
  'profile.owner': 'Owner',
  'profile.owner.description': 'Track the vehicle, understand faults and perform simple checks safely.',
  'context.heading': 'Describe your situation',
  'context.buyer': 'Add the listing details and seller statements to frame the pre-purchase audit.',
  'context.mechanic': 'Record the customer complaint and initial data before clearing faults, dismantling or repairs.',
  'context.rental': 'Record mileage, energy level and vehicle condition at rental check-out and return.',
  'context.seller': 'Document maintenance, repairs and known defects as transparently as possible.',
  'context.owner': 'Describe how the vehicle behaves to build a useful long-term health record.',
  'expertise.kicker': 'FIELD INSPECTION',
  'expertise.title': 'Complete the vehicle report',
  'expertise.description': 'Record each verified item. The final report can be generated without using the assistant.',
  'assistant.kicker': 'OPTIONAL ASSISTANT',
  'assistant.question': 'Do you have any questions?',
  'assistant.description': 'The report is ready. Ask a question only if you want help interpreting a result.',
  'assistant.open': 'Open assistant',
  'records.title': 'My reports',
  'records.new': '＋ New inspection',
  'records.open': 'Open',
  'records.loaded': 'Report loaded: you can review or edit it.',
  'records.download': 'Download PDF',
  'records.empty': 'No saved report yet.',
  'report.choose': 'What would you like to do with the report?',
  'report.download': 'Download PDF',
  'report.share': 'Share PDF',
  'report.link': 'Share a private link',
  'report.cancel': 'Cancel',
  'report.short': 'Print summary',
  'save.local': 'Automatically saved on this device',
  'save.savedAt': 'Saved on this device at',
  'save.failed': 'Local storage unavailable — export the report',
  'settings.language': 'Language',
  'chat.title': 'Investigation console',
  'chat.placeholder': 'Symptom, measurement, fault code or inspection result…',
  'chat.submit': 'Analyze →',
  'common.close': 'Close',
  'onboarding.kicker': 'WELCOME TO CARDIAG',
  'onboarding.title': 'Create your profile',
  'onboarding.intro': 'Your profile adapts vehicle reports, inspections and final documents.',
  'onboarding.type': 'You use CarDiag as a…',
  'onboarding.professional': 'Professional',
  'onboarding.professional.description': 'Workshop, mechanic or rental agency with vehicle-management workflows.',
  'onboarding.personal': 'Personal',
  'onboarding.personal.description': 'Buyer, seller or owner managing your own vehicles.',
  'onboarding.submit': 'Save and add my vehicle',
  'onboarding.garageName': 'Organization / agency / workshop name *',
  'onboarding.contactName': 'Manager / contact *',
  'onboarding.siret': 'SIRET number (14 digits) *',
  'onboarding.vat': 'EU VAT number',
  'onboarding.email': 'Email *',
  'onboarding.phone': 'Phone *',
  'onboarding.address': 'Full address *',
  'onboarding.website': 'Website',
  'onboarding.specialties': 'Workshop specialties',
  'onboarding.professionalKind': 'Your professional activity',
  'onboarding.mechanic': 'Workshop / Mechanic',
  'onboarding.mechanic.description': 'Customer intake condition, completed repairs and post-repair check.',
  'onboarding.rental': 'Rental agency',
  'onboarding.rental.description': 'Fleet, mileage and check-out/check-in vehicle condition.',
  'onboarding.fleetSize': 'Number of vehicles in the fleet',
  'onboarding.fleetReference': 'Fleet prefix / reference',
  'onboarding.displayName': 'Full name *',
  'onboarding.goal': 'Main goal *',
  'onboarding.required': 'Complete every required field before continuing.',
  'onboarding.invalid': 'Correct the highlighted field before continuing.',
  'onboarding.invalidEmail': 'Enter a valid email address, for example name@example.com.',
  'onboarding.invalidPhone': 'Enter a valid phone number containing between 7 and 15 digits.',
  'onboarding.contactSwapped': 'The Email and Phone fields appear to be reversed. Enter the address in Email and the number in Phone.',
};

const EN_TEXT = {
  'Diagnostic & Expertise Auto':'Vehicle Inspection & Diagnostics','Nouvelle fiche':'New report','Dupliquer':'Duplicate','Supprimer':'Delete','Comparer':'Compare','Pondération':'Weighting','Inspection rapide':'Quick inspection','Mode sombre':'Dark mode','Installer l’application':'Install app',
  'Véhicule':'Vehicle','Moteur':'Engine','Châssis':'Chassis','Carrosserie':'Bodywork','Habitacle':'Interior','Essai':'Road test','Bilan':'Summary','PARCOURS PERSONNALISÉ':'PERSONALIZED WORKFLOW','CONTEXTE DU DOSSIER':'REPORT CONTEXT',
  'Informations du Véhicule & Vendeur':'Vehicle & seller information','Identité & contexte de vente':'Identity & sales context','Compartiment Moteur & Mécanique':'Engine compartment & mechanical','Vérifications à froid puis à chaud':'Cold and warm checks','Châssis, Suspension & Roues':'Chassis, suspension & wheels','Structure et train roulant':'Structure and running gear','Carrosserie & Éclairage':'Bodywork & lighting','Détection de chocs et finitions':'Collision and finish checks','Habitacle & Équipements':'Interior & equipment','Confort, étanchéité, électronique':'Comfort, sealing and electronics','Essai Routier Dynamique':'Dynamic road test','Comportement en conditions réelles':'Real-world driving behaviour','Diagnostic Électronique (OBD2) & Bilan':'Electronic diagnostics (OBD2) & summary','Codes défauts et décision finale':'Fault codes and final decision',
  'Identité du véhicule':'Vehicle identification','Contexte de l’expertise':'Inspection context','Documents à vérifier':'Documents to check','Questions à poser au vendeur':'Questions for the seller','Date et heure':'Date and time','Localisation':'Location','Utiliser ma position':'Use my location','Carte grise présentée':'Registration document provided','Contrôle technique valide fourni':'Valid roadworthiness test provided','Certificat de non-gage fourni':'No-lien certificate provided',"Factures d'entretien présentées":'Maintenance invoices provided',"Historique d'entretien disponible ?":'Maintenance history available?','Nombre de propriétaires précédents':'Previous owners','Raison de la vente (réponse du vendeur)':'Reason for sale (seller response)',"Type d'utilisation déclarée":'Declared usage',
  'Avant démarrage (moteur froid)':'Before starting (cold engine)','Après démarrage (moteur chaud / en marche)':'After starting (warm/running engine)','Structure & corrosion':'Structure & corrosion','Transmission & suspension':'Transmission & suspension','Éclairage':'Lighting','Relevé des codes défauts':'Fault-code scan','Décision finale':'Final decision','Budget':'Budget','Signatures':'Signatures',
  "Niveau et couleur de l'huile moteur":'Engine-oil level and colour','Liquide de refroidissement (LDR)':'Engine coolant','Fuites visibles sous le véhicule':'Visible leaks under the vehicle','Bruits anormaux au démarrage / ralenti':'Abnormal start-up / idle noise',"Fumée à l'échappement":'Exhaust smoke','Stabilité du ralenti':'Idle stability','Joint de culasse (indices)':'Head-gasket warning signs','Supports moteur':'Engine mounts','Rouille au niveau du plancher':'Floor rust',"Longerons & points d'ancrage":'Frame rails & mounting points','Fuites pont / différentiel':'Differential leaks','Jeu dans les rotules / triangles':'Ball-joint / control-arm play','État des amortisseurs':'Shock-absorber condition','Usure des pneus (les 4)':'Tyre wear (all four)','État des jantes':'Wheel condition','Alignement des panneaux':'Panel alignment','Présence de mastic / bondo':'Filler / body putty','Qualité et homogénéité de la peinture':'Paint quality and consistency','Feux avant (croisement / route / clignotants)':'Front lights (low/high beam/indicators)','Feux arrière & stop':'Rear and brake lights','Feux de recul & antibrouillard':'Reverse and fog lights','État des sièges':'Seat condition','Ciel de toit':'Headliner','Climatisation / chauffage':'Air conditioning / heating','Vitres électriques (les 4)':'Electric windows (all four)',"Odeurs / traces d'humidité":'Odours / moisture traces',"Fluidité de l'accélération":'Acceleration smoothness','Passage des vitesses':'Gear changes','Test de braquage':'Full-lock steering test','Freinage':'Braking','Comportement à vitesse stabilisée':'Steady-speed behaviour','Code P1000 détecté ?':'P1000 code detected?',
  'Notes moteur':'Engine notes','Notes châssis / roues':'Chassis / wheel notes','Notes carrosserie / éclairage':'Bodywork / lighting notes','Notes habitacle':'Interior notes','Notes essai routier':'Road-test notes','Codes ECM (moteur)':'ECM codes (engine)','Codes ABS':'ABS codes','Codes boîte de vitesses':'Transmission codes','Détail des codes / observations diagnostic':'Fault-code details / diagnostic observations','Synthèse / commentaire final':'Final summary / comments','Frais de remise en état estimés (€)':'Estimated repair costs (€)','Marge de négociation suggérée (€)':'Suggested negotiation margin (€)','Budget maximum disponible (€)':'Maximum available budget (€)',
  'OK':'OK','Moyen':'Fair','Défaut':'Fault','Aucune':'None','Légère':'Light','Marquée':'Heavy','Doute':'Uncertain','Suspect':'Suspected','Usure':'Worn','Surface':'Surface','Perforante':'Perforated','Trace':'Trace','Déformé':'Deformed','Suintement':'Seepage','Fuite':'Leak','Léger jeu':'Slight play','Jeu important':'Excessive play','Fatigués':'Worn','HS':'Failed','À prévoir':'Plan replacement','À changer':'Replace','Marquées':'Marked','Déformées':'Deformed','Léger':'Minor','Décalage net':'Clear misalignment','Aimant adhère':'Magnet sticks','Zone douteuse':'Suspicious area','Aimant décroche':'Magnet releases','Uniforme':'Uniform','Retouches':'Touch-ups','Repeint':'Repainted','Usés':'Worn','Déchirés':'Torn','Décollé':'Detached','Faible':'Weak','Lente':'Slow','Bloquée':'Stuck','Silencieux':'Silent','Léger bruit':'Slight noise','Claquement':'Knocking','Absent':'Absent','Incertain':'Uncertain','Présent':'Present','Complet':'Complete','Partiel':'Partial',
  'Véhicule sain, prêt à négocier':'Vehicle sound, ready to negotiate','Défauts à chiffrer avant achat':'Price the faults before purchase','À FUIR':'AVOID','Risques majeurs identifiés':'Major risks identified','Effacer':'Clear','Signez ici':'Sign here','Signature acheteur':'Buyer signature','Signature vendeur':'Seller signature',
  'Mes fiches':'My reports','GARAGE NUMÉRIQUE':'DIGITAL GARAGE','Nouvelle expertise':'New inspection','Télécharger le PDF':'Download PDF','Fiche chargée : vous pouvez la consulter ou la modifier.':'Report loaded: you can review or edit it.','Fermer':'Close','Annuler':'Cancel','Réinitialiser fiche':'Reset report','Imprimer la synthèse':'Print summary','Générer le rapport':'Generate report','Voir comment vérifier':'How to check','Ajouter une photo':'Add a photo','Prendre une photo':'Take a photo','Choisir depuis la galerie':'Choose from gallery','Photo':'Photo',
  'Paramètres':'Settings','Apparence':'Appearance','Thème et identité atelier':'Theme and workshop identity','Notifications':'Notifications','Statuts d’expertise et rappels':'Inspection status and reminders','Tester les notifications':'Test notifications','Envoie une notification à cet appareil':'Send a notification to this device','Langue':'Language',"Langue de l’interface":'Interface language','Compte et données':'Account and data','Profil, export et suppression':'Profile, export and deletion','Politique de confidentialité':'Privacy policy','Données et droits RGPD':'Data and privacy rights','Mentions légales et CGU':'Legal notice and terms','Conditions d’utilisation':'Terms of use','Suppression de compte':'Account deletion','Demande accessible hors application':'Request available outside the app','Version':'Version','Profil d’utilisation':'Usage profile','Modifier le profil Professionnel ou Personnel':'Edit Professional or Personal profile',
  'Connexion':'Sign in','Compte':'Account','Mon compte':'My account','Email':'Email','Mot de passe':'Password','Se connecter':'Sign in','Continuer avec Google':'Continue with Google','Mot de passe oublié':'Forgot password','Créer un compte':'Create account','Rôle':'Role',"J’accepte la politique de confidentialité et la synchronisation de mes fiches.":'I accept the privacy policy and report synchronization.','Créer mon compte':'Create my account','Déjà inscrit':'Already registered','Envoyer le lien':'Send link','Retour à la connexion':'Back to sign in','Vérifiez votre adresse email':'Verify your email address','Renvoyer le lien':'Resend link','Mon profil':'My profile','Nom affiché':'Display name','Avatar':'Avatar','Enregistrer':'Save','Exporter mes données':'Export my data','Se déconnecter':'Sign out','Supprimer définitivement le compte':'Permanently delete account',
  'Saisissez l’adresse utilisée pour votre compte. Le lien est envoyé par Firebase et peut arriver dans les courriers indésirables.':'Enter the email address used for your account. Firebase sends the link, which may arrive in your spam folder.','Envoi du lien…':'Sending link…','Si un compte correspond à cette adresse, le lien a été envoyé. Vérifiez aussi vos courriers indésirables.':'If an account matches this address, the link has been sent. Please also check your spam folder.','Adresse email invalide.':'Invalid email address.','Saisissez votre adresse email.':'Enter your email address.','Trop de tentatives. Réessayez dans quelques minutes.':'Too many attempts. Try again in a few minutes.','Connexion impossible. Vérifiez votre accès internet puis réessayez.':'Unable to connect. Check your internet connection and try again.','La réinitialisation du mot de passe n’est pas encore activée.':'Password reset is not enabled yet.','Firebase Auth n’est pas correctement configuré.':'Firebase Auth is not configured correctly.','Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.':'Unable to send the link right now. Try again in a few moments.',
  'Email du compte':'Account email','Téléphone':'Phone','Organisation / atelier':'Organization / workshop','Compte CarDiag':'CarDiag account','Email vérifié':'Verified email','Email à vérifier':'Email verification required','Connexion réussie.':'Signed in successfully.','Connexion Google réussie.':'Google sign-in successful.','Compte créé. Vérifiez votre adresse email.':'Account created. Verify your email address.','Un compte existe déjà avec cette adresse. Utilisez « Déjà inscrit » ou réinitialisez le mot de passe.':'An account already exists for this address. Use “Already registered” or reset your password.','Email ou mot de passe incorrect.':'Incorrect email or password.','Mot de passe incorrect.':'Incorrect password.','Ce compte a été désactivé.':'This account has been disabled.','Le mot de passe doit contenir au moins 8 caractères.':'The password must contain at least 8 characters.','Saisissez votre mot de passe.':'Enter your password.','La fenêtre Google a été fermée avant la connexion.':'The Google window was closed before sign-in.','Le navigateur a bloqué la fenêtre Google. Autorisez les pop-ups puis réessayez.':'The browser blocked the Google window. Allow pop-ups and try again.','Ce domaine doit être autorisé dans Firebase Authentication.':'This domain must be authorized in Firebase Authentication.','L’opération du compte a échoué. Réessayez dans quelques instants.':'The account operation failed. Try again in a few moments.',
  'Confirmer le mot de passe':'Confirm password','8 caractères minimum.':'At least 8 characters.','Enregistrer les réglages du profil':'Save profile settings','Vérifiez votre adresse email pour activer la synchronisation et le partage sécurisé.':'Verify your email address to enable synchronization and secure sharing.','Renvoyer l’email':'Resend email','J’ai vérifié mon email':'I verified my email','Vous êtes déconnecté.':'You are signed out.','Profil enregistré.':'Profile saved.',
  'Comparer des fiches':'Compare reports','Sélectionnez 2 ou 3 véhicules visités pour les comparer côte à côte.':'Select 2 or 3 inspected vehicles to compare side by side.','Exporter en CSV':'Export CSV','Pondération du score':'Score weighting','Réinitialiser (5 / 3 / 1)':'Reset (5 / 3 / 1)','Console d’investigation':'Investigation console','Nouvelle analyse':'New analysis','AUCUN RAPPORT ACTIF':'NO ACTIVE REPORT','En attente des mesures terrain':'Waiting for field measurements','Votre symptôme ou mesure relevée':'Your symptom or measured value','Assistant atelier':'Workshop assistant',
  'Choisissez au moins 2 fiches.':'Choose at least 2 reports.','Prêt à comparer.':'Ready to compare.','Maximum 3 fiches.':'Maximum 3 reports.','Aucune fiche suffisamment renseignée. Identifiez au moins un véhicule avant de le comparer.':'No sufficiently completed report. Identify at least one vehicle before comparing it.','Points vérifiés':'Checked points','Valeur affichée':'Advertised value','Marge de négociation':'Negotiation margin','Budget maximum':'Maximum budget','Meilleur score':'Best score',
  'Choisissez votre famille de profil':'Choose your profile family','Particulier':'Personal','Acheteur, vendeur ou propriétaire':'Buyer, seller or owner','Professionnel':'Professional','Garagiste, mécanicien ou agence':'Workshop, mechanic or agency','Le plus choisi':'Most selected','Quel niveau d’inspection souhaitez-vous ?':'Which inspection level do you want?','Inspection rapide':'Quick inspection','Environ 5 min · 12 points essentiels':'About 5 min · 12 essential checks','Pour effectuer un premier tri':'For an initial screening','Inspection complète':'Complete inspection','Environ 15–20 min · 33 points':'About 15–20 min · 33 checks','Pour prendre une décision détaillée':'For a detailed decision',
  '⚡ Inspection rapide':'⚡ Quick inspection','▦ Inspection complète':'▦ Complete inspection',
};

Object.assign(EN_TEXT, {
  'Sauvegardé automatiquement sur cet appareil': 'Automatically saved on this device',
  'INSPECTION À COMPLÉTER': 'INSPECTION TO COMPLETE',
  'DÉCISION À CONFIRMER': 'DECISION TO CONFIRM',
  'Ouvrir la section véhicule': 'Open vehicle section',
  'Ouvrir la section moteur': 'Open engine section',
  'Ouvrir la section châssis': 'Open chassis section',
  'Ouvrir la section carrosserie': 'Open bodywork section',
  'Ouvrir la section habitacle': 'Open interior section',
  'Ouvrir la section essai routier': 'Open road-test section',
  'Ouvrir la section bilan': 'Open summary section',
});

Object.assign(EN_TEXT, {
  'ÉTAPE 1 / 4': 'STEP 1 / 4',
  'ÉTAPE 2 / 4': 'STEP 2 / 4',
  'ÉTAPE 3 / 4': 'STEP 3 / 4',
  'ÉTAPE 4 / 4': 'STEP 4 / 4',
  'Identification du véhicule': 'Vehicle identification',
  'Marque': 'Make',
  'Modèle': 'Model',
  'Année': 'Year',
  'Motorisation': 'Powertrain',
  'Marque requise': 'Make required',
  'Modèle requis': 'Model required',
  'Châssis requis': 'Chassis required',
  'Choisir': 'Choose',
  'Valider': 'Confirm',
  'Veuillez sélectionner une marque et un modèle.': 'Please select a make and model.',
  'Véhicule identifié. Tous les champs restent modifiables.': 'Vehicle identified. All fields remain editable.',
  'Veuillez compléter l’identification du véhicule avant de continuer.': 'Please complete the vehicle identification before continuing.',
  '✏️ Autre / non listée (saisie libre)': '✏️ Other / not listed (manual entry)',
  'Revenir à l’étape précédente': 'Go back to the previous step',
  'Progression du parcours': 'Workflow progress',
  'Thèmes et identité visuelle': 'Themes and visual identity',
  'Ouvrir les paramètres': 'Open settings',
  'Navigation du parcours': 'Workflow navigation',
  'Parcours personnalisé': 'Personalized workflow',
  'En ligne · web': 'Online · web',
  'Hors ligne · données locales': 'Offline · local data',
  'Fiche supprimée.': 'Report deleted.',
  'Acheteur': 'Buyer',
  'Garagiste': 'Mechanic',
  'Vendeur': 'Seller',
  'Propriétaire': 'Owner',
  'Diagnostic uniquement': 'Diagnostics only',
  'Diagnostic et devis': 'Diagnostics and estimate',
  'Prise en charge complète': 'Full workshop intake',
  'À compléter': 'To be completed',
  'Non renseigné': 'Not provided',
  'Oui': 'Yes',
  'Non': 'No',
  'Personnaliser CarDiag': 'Customize CarDiag',
  'Ambiance': 'Theme style',
  'Carbone & orange': 'Carbon & orange',
  'Atelier Pro': 'Workshop Pro',
  'Clair & technique': 'Bright & technical',
  'Graphite & ivoire': 'Graphite & ivory',
  'Nom de l’atelier': 'Workshop name',
  'Logo': 'Logo',
  'Bannière': 'Banner',
  'Avatar': 'Avatar',
  'Importer': 'Import',
  'Effacer les visuels': 'Clear branding images',
  'Valider le véhicule': 'Confirm vehicle',
  'Autre / non trouvé (saisie libre)': 'Other / not found (manual entry)',
  'Agence de location': 'Rental agency',
  'Gérer la flotte, le kilométrage et les états des lieux avant et après location.': 'Manage the fleet, mileage and vehicle condition before and after rental.',
  'Référence de l’ordre de réparation': 'Repair-order reference',
  'Kilométrage à la réception': 'Intake mileage',
  'État du véhicule à la réception': 'Vehicle condition at intake',
  'Travaux réalisés': 'Completed repairs',
  'Contrôles après réparation': 'Post-repair checks',
  'État du véhicule à la restitution': 'Vehicle condition at handover',
  'Kilométrage à la restitution': 'Handover mileage',
  'Identifiant du véhicule dans la flotte': 'Fleet vehicle ID',
  'Référence du contrat de location': 'Rental contract reference',
  'Référence du locataire': 'Renter reference',
  'Départ de location': 'Rental check-out',
  'Retour de location': 'Rental return',
  'Kilométrage au départ': 'Check-out mileage',
  'Kilométrage au retour': 'Return mileage',
  'Niveau de carburant / charge au départ': 'Fuel / charge level at check-out',
  'Niveau de carburant / charge au retour': 'Fuel / charge level at return',
  'État des lieux avant location': 'Pre-rental condition report',
  'État des lieux après location': 'Post-rental condition report',
  'Nouveaux dommages / écarts constatés': 'New damage / recorded differences',
});

const EN_PLACEHOLDERS = {
  'Filtrer les marques...':'Filter makes…','Rechercher un modèle (toutes marques)...':'Search a model (all makes)…','Tapez la marque exacte (non listée / hors-ligne sans cache)...':'Enter the exact make (not listed / unavailable offline)…','Tapez le modèle exact (non listé)...':'Enter the exact model (not listed)…','Non renseignée':'Not provided','Observations complémentaires...':'Additional observations…','Détails du scan OBD2...':'OBD2 scan details…',"Résumé de l'expertise et recommandation...":'Inspection summary and recommendation…','Reprendre les mots du client sans interprétation…':'Use the customer’s exact words without interpretation…','Ce que vous voyez, entendez ou ressentez…':'What you see, hear or feel…',
};

Object.assign(EN_PLACEHOLDERS, {
  'Carrosserie, habitacle, voyants, niveaux, accessoires confiés…': 'Bodywork, interior, warning lights, levels and entrusted accessories…',
  'Pièces, opérations, couples, fluides et références utilisés…': 'Parts, operations, torques, fluids and references used…',
  'Essai, mesures finales, codes, absence de fuite et validation…': 'Road test, final measurements, codes, leak check and validation…',
  'État final, réserves, recommandations et éléments restitués…': 'Final condition, reservations, recommendations and returned items…',
  'Carrosserie, jantes, pneus, vitrage, habitacle, accessoires et voyants…': 'Bodywork, wheels, tyres, glass, interior, accessories and warning lights…',
  'État au retour et différences constatées par rapport au départ…': 'Return condition and differences compared with check-out…',
  'Localisation précise, type de dommage, photo associée et réserve…': 'Precise location, damage type, attached photo and reservation…',
  'Nom ou identifiant interne': 'Name or internal ID',
  'Plein, 75 %, 320 km d’autonomie…': 'Full tank, 75%, 320 km range…',
  '3/4, 42 %, 180 km d’autonomie…': '3/4, 42%, 180 km range…',
});

const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const FRENCH_BY_EN = new Map(Object.entries(EN_TEXT).map(([fr,en])=>[en,fr]));

export function translateUiText(value, targetLanguage=language) {
  const source=FRENCH_BY_EN.get(String(value)) || String(value);
  return targetLanguage==='en' ? (EN_TEXT[source] || source) : source;
}

function translateDom(root=document.body) {
  if(!root)return;
  const textNodes=[];
  if(root.nodeType===Node.TEXT_NODE)textNodes.push(root);
  else {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())textNodes.push(walker.currentNode);
  }
  textNodes.forEach(node=>{
    if(node.parentElement?.closest('script,style,.chat-message-user'))return;
    if(!originalText.has(node)){
      const raw=node.nodeValue||'',trimmed=raw.trim(),french=FRENCH_BY_EN.get(trimmed)||trimmed;
      originalText.set(node,raw.replace(trimmed,french));
    }
    const source=originalText.get(node),trimmed=source.trim();
    const translated=language==='en'?(EN_TEXT[trimmed]||trimmed):trimmed;
    const next=source.replace(trimmed,translated);
    if(node.nodeValue!==next)node.nodeValue=next;
  });
  const elements=root.nodeType===Node.ELEMENT_NODE?[root,...root.querySelectorAll('*')]:[];
  elements.forEach(element=>{
    let originals=originalAttributes.get(element);
    if(!originals){originals={};originalAttributes.set(element,originals)}
    ['placeholder','aria-label','title'].forEach(attribute=>{
      if(!element.hasAttribute(attribute))return;
      if(!(attribute in originals))originals[attribute]=element.getAttribute(attribute);
      const source=originals[attribute]||'';
      const dictionary=attribute==='placeholder'?EN_PLACEHOLDERS:EN_TEXT;
      element.setAttribute(attribute,language==='en'?(dictionary[source]||source):source);
    });
  });
}

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

let language = 'fr';

export function t(key, fallback = key, variables = {}) {
  const template = language === 'en' ? (EN[key] || fallback) : fallback;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? '');
}

export function currentLanguage() { return language; }

function setText(selector, key, fallback) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key, fallback);
}

export function applyTranslations() {
  document.documentElement.lang = language;
  setText('#usageScenarioTitle', 'profile.heading', 'Quel est votre objectif ?');
  setText('.usage-scenario-head > p:last-child', 'profile.intro', 'Le questionnaire, l’assistant et la synthèse s’adaptent automatiquement à votre situation.');
  setText('#profileContextTitle', 'context.heading', 'Précisez votre situation');
  setText('#chatPanel .diagnostic-console-head h2', 'chat.title', "Console d'investigation");
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.placeholder = t('chat.placeholder', 'Symptôme, mesure, code défaut ou résultat de contrôle…');
  setText('#chatForm .analyze-button', 'chat.submit', 'Analyser →');

  const profiles = {
    buyer: ['profile.buyer', 'Acheteur', 'profile.buyer.description', 'Contrôler le véhicule avant achat, détecter les risques et préparer la négociation.'],
    mechanic: ['profile.mechanic', 'Garagiste', 'profile.mechanic.description', 'Documenter l’état initial et la plainte client avant la prise en charge en atelier.'],
    rental: ['profile.rental', 'Agence de location', 'profile.rental.description', 'Gérer la flotte, le kilométrage et les états des lieux avant et après location.'],
    seller: ['profile.seller', 'Vendeur', 'profile.seller.description', 'Créer un rapport transparent et complet à transmettre à un futur acheteur.'],
    owner: ['profile.owner', 'Propriétaire', 'profile.owner.description', 'Suivre le véhicule, comprendre ses problèmes et effectuer les contrôles simples en sécurité.'],
  };
  Object.entries(profiles).forEach(([profile, values]) => {
    const card = document.querySelector(`[name="usage_scenario"][value="${profile}"]`)?.closest('.usage-scenario-card');
    if (!card) return;
    const strong = card.querySelector('strong');
    const description = card.querySelector('strong + span');
    if (strong) strong.textContent = t(values[0], values[1]);
    if (description) description.textContent = t(values[2], values[3]);
  });

  const fieldLabels = {
    annonce_url: ['Lien de l’annonce', 'Listing URL'], seller_claims: ['Informations annoncées par le vendeur', 'Information provided by the seller'],
    client_complaint: ['Plainte exacte du client', 'Exact customer complaint'], symptom_conditions: ['Conditions d’apparition', 'Operating conditions'],
    measured_values: ['Valeurs déjà mesurées', 'Measurements already taken'], work_authorization: ['Périmètre autorisé', 'Authorized work scope'],
    work_order_reference: ['Référence de l’ordre de réparation', 'Repair-order reference'], intake_mileage: ['Kilométrage à la réception', 'Intake mileage'],
    mechanic_intake_condition: ['État du véhicule à la réception', 'Vehicle condition at intake'], repair_work_completed: ['Travaux réalisés', 'Completed repairs'],
    post_repair_checks: ['Contrôles après réparation', 'Post-repair checks'], mechanic_release_condition: ['État du véhicule à la restitution', 'Vehicle condition at handover'],
    release_mileage: ['Kilométrage à la restitution', 'Handover mileage'], fleet_vehicle_id: ['Identifiant du véhicule dans la flotte', 'Fleet vehicle ID'],
    rental_contract_reference: ['Référence du contrat de location', 'Rental contract reference'], renter_reference: ['Référence du locataire', 'Renter reference'],
    rental_start: ['Départ de location', 'Rental check-out'], rental_end: ['Retour de location', 'Rental return'], rental_mileage_out: ['Kilométrage au départ', 'Check-out mileage'],
    rental_mileage_in: ['Kilométrage au retour', 'Return mileage'], rental_energy_out: ['Niveau de carburant / charge au départ', 'Fuel / charge level at check-out'],
    rental_energy_in: ['Niveau de carburant / charge au retour', 'Fuel / charge level at return'], rental_condition_out: ['État des lieux avant location', 'Pre-rental condition report'],
    rental_condition_in: ['État des lieux après location', 'Post-rental condition report'], rental_damage_delta: ['Nouveaux dommages / écarts constatés', 'New damage / recorded differences'],
    maintenance_history: ['Historique d’entretien justifiable', 'Documented maintenance history'], recent_repairs: ['Réparations récentes', 'Recent repairs'],
    known_defects: ['Défauts connus à déclarer', 'Known defects to disclose'], report_documents: ['Pièces disponibles pour le rapport', 'Documents available for the report'],
    owner_symptoms: ['Symptômes constatés', 'Observed symptoms'], symptom_history: ['Évolution du problème', 'Symptom history'],
    maintenance_log: ['Derniers entretiens ou réparations', 'Latest maintenance or repairs'], diy_level: ['Niveau d’autonomie', 'DIY experience level'],
    kilometrage: ['Kilométrage', 'Mileage'], vin: ['N° VIN / Immatriculation', 'VIN / registration'], valeur: ['Valeur affichée / négociée (€)', 'Advertised / negotiated price (€)'],
    frais_estimation: ['Frais de remise en état estimés (€)', 'Estimated repair costs (€)'], marge_negociation: ['Marge de négociation suggérée (€)', 'Suggested negotiation margin (€)'],
    budget_max: ['Budget maximum disponible (€)', 'Maximum available budget (€)'],
  };
  Object.entries(fieldLabels).forEach(([name, labels]) => {
    const label = document.querySelector(`[name="${name}"]`)?.closest('.field')?.querySelector('label');
    if (!label) return;
    const required = label.querySelector('.req-star')?.outerHTML || '';
    label.innerHTML = `${language === 'en' ? labels[1] : labels[0]}${required ? ` ${required}` : ''}`;
  });

  setText('#generateBtn', 'wizard.generate', '📄 Générer le rapport');
  setText('#shortPrintBtn', 'report.short', 'Imprimer la synthèse');

  translateDom(document.body);

  window.dispatchEvent(new CustomEvent('cardiag:i18n-applied', { detail: { language } }));
}

export function setLanguage(nextLanguage) {
  language = nextLanguage === 'en' ? 'en' : 'fr';
  applyTranslations();
  window.dispatchEvent(new CustomEvent('cardiag:language-change', { detail: { language } }));
}

export function initializeI18n() {
  const saved = readSettings().language;
  const system = String(navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  language = saved === 'auto' ? system : saved === 'en' ? 'en' : 'fr';
  window.cardiagI18n = { t, setLanguage, translateUiText, get language() { return language; } };
  applyTranslations();
  const observer=new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>translateDom(node))));
  observer.observe(document.body,{childList:true,subtree:true});
}
