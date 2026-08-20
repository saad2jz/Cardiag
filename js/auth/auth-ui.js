import { authClient } from './firebase-client.js?v=20260820-3';

const ROLES = {buyer:'Acheteur',mechanic:'Garagiste / Mécanicien',rental:'Agence de location',seller:'Vendeur',owner:'Propriétaire'};
function message(panel,text,type='') { const node=panel.querySelector('[data-auth-status]'); node.textContent=text; node.dataset.type=type; }
function createAuthSurface() {
  const panel=document.createElement('section');
  panel.className='account-sheet'; panel.id='accountSheet'; panel.hidden=true;
  panel.innerHTML=`<header><div><p class="panel-kicker">COMPTE CARDIAG</p><h2 data-account-title>Connexion</h2></div><button type="button" data-account-close aria-label="Fermer">×</button></header>
  <div class="auth-view" data-auth-view="login"><form data-auth-form="login"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Mot de passe<input type="password" name="password" autocomplete="current-password" minlength="8" required></label><button type="submit">Se connecter</button></form><button type="button" data-google-login>Continuer avec Google</button><button type="button" data-auth-show="reset">Mot de passe oublié</button><button type="button" data-auth-show="signup">Créer un compte</button></div>
  <div class="auth-view" data-auth-view="signup" hidden><form data-auth-form="signup"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Mot de passe<input type="password" name="password" autocomplete="new-password" minlength="8" required></label><label>Rôle<select name="role">${Object.entries(ROLES).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label class="consent-check"><input type="checkbox" name="consent" required> J’accepte la politique de confidentialité et la synchronisation de mes fiches.</label><button>Créer mon compte</button></form><button data-auth-show="login">Déjà inscrit</button></div>
  <div class="auth-view" data-auth-view="reset" hidden><p class="auth-help">Saisissez l’adresse utilisée pour votre compte. Le lien est envoyé par Firebase et peut arriver dans les courriers indésirables.</p><form data-auth-form="reset"><label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label><button type="submit">Envoyer le lien</button></form><button type="button" data-auth-show="login">Retour à la connexion</button></div>
  <div class="auth-view" data-auth-view="verify" hidden><div class="auth-empty"><b>Vérifiez votre adresse email</b><p>Un lien vient de vous être envoyé. La synchronisation sera activée après vérification.</p></div><button data-resend-verification>Renvoyer le lien</button></div>
  <div class="auth-view" data-auth-view="profile" hidden><div class="account-summary"><div class="account-summary-avatar" data-account-avatar aria-hidden="true">C</div><div><strong data-account-summary-name>Compte CarDiag</strong><span data-account-summary-email></span><span class="account-verified" data-account-verification></span></div></div><form data-profile-form><label>Email du compte<input name="accountEmail" type="email" readonly></label><label>Nom affiché<input name="displayName" maxlength="80" autocomplete="name"></label><label>Téléphone<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label><label>Rôle<select name="role">${Object.entries(ROLES).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Organisation / atelier<input name="garageName" maxlength="120" autocomplete="organization"></label><label>Avatar<input type="file" name="avatarFile" accept="image/*"></label><button type="submit">Enregistrer</button></form><div class="account-actions"><button type="button" data-export-account>Exporter mes données</button><button type="button" data-sign-out>Se déconnecter</button><button type="button" class="danger" data-delete-account>Supprimer définitivement le compte</button></div></div>
  <p class="auth-status" data-auth-status role="status"></p>`;
  document.body.append(panel); return panel;
}

function avatarData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});}
function profilePayload(overrides={}){
  const local=window.cardiagLocalProfile?.current||{};
  return {
    displayName:local.displayName||local.contactName||'',accountType:local.type||'personal',phone:local.phone||'',garageName:local.garageName||'',
    contactName:local.contactName||'',siret:local.siret||'',address:local.address||'',website:local.website||'',professionalKind:local.professionalKind||'',
    fleetSize:local.fleetSize||'',fleetReference:local.fleetReference||'',role:local.role||'buyer',consent:true,...overrides,
  };
}
export async function initializeAuthUi(){
  const panel=createAuthSurface();
  const actions=document.createElement('div'); actions.className='auth-quick-actions';
  const trigger=document.createElement('button'); trigger.className='account-trigger'; trigger.type='button'; trigger.textContent='Déjà inscrit';
  const signupTrigger=document.createElement('button'); signupTrigger.className='account-signup-trigger'; signupTrigger.type='button'; signupTrigger.textContent='Créer un compte';
  actions.append(trigger,signupTrigger);
  document.getElementById('wizardHeader')?.append(actions);
  let signupRole='buyer'; let profile=null;
  const show=(name)=>{panel.querySelectorAll('[data-auth-view]').forEach(v=>v.hidden=v.dataset.authView!==name);panel.querySelector('[data-account-title]').textContent=name==='profile'?'Mon profil':name==='signup'?'Créer un compte':name==='reset'?'Mot de passe oublié':name==='verify'?'Vérification email':'Connexion';};
  const accountName=()=>profile?.displayName||authClient.user?.displayName||authClient.user?.email?.split('@')[0]||'';
  const updateQuickLabels=()=>{const english=window.cardiagI18n?.language==='en';const name=accountName();trigger.textContent=authClient.user?`${english?'Account':'Compte'}${name?` · ${name}`:''}`:(english?'Already registered':'Déjà inscrit');trigger.title=authClient.user?(english?'Open account details':'Ouvrir les détails du compte'):trigger.textContent;signupTrigger.textContent=english?'Create account':'Créer un compte';};
  const renderAccount=(user)=>{
    if(!user)return;
    const form=panel.querySelector('[data-profile-form]');const name=accountName()||'Compte CarDiag';
    form.accountEmail.value=user.email||'';form.displayName.value=profile?.displayName||user.displayName||'';form.phone.value=profile?.phone||'';form.role.value=profile?.role||signupRole||'buyer';form.garageName.value=profile?.garageName||'';
    panel.querySelector('[data-account-summary-name]').textContent=name;panel.querySelector('[data-account-summary-email]').textContent=user.email||'';
    panel.querySelector('[data-account-verification]').textContent=user.emailVerified?'Email vérifié':'Email à vérifier';panel.querySelector('[data-account-verification]').dataset.verified=String(Boolean(user.emailVerified));
    const avatar=panel.querySelector('[data-account-avatar]');const source=profile?.avatar||user.photoUrl||'';avatar.textContent=source?'':name.charAt(0).toUpperCase();avatar.style.backgroundImage=source?`url("${String(source).replaceAll('"','%22')}")`:'';
    updateQuickLabels();
  };
  const open=(requestedView='')=>{panel.hidden=false;requestAnimationFrame(()=>panel.classList.add('is-open'));show(authClient.user?'profile':(requestedView==='signup'?'signup':'login'));};
  trigger.addEventListener('click',()=>open('login'));
  signupTrigger.addEventListener('click',()=>open('signup'));
  window.addEventListener('cardiag:open-auth',event=>open(event.detail?.view));
  window.addEventListener('cardiag:language-change',updateQuickLabels);
  panel.querySelector('[data-account-close]').onclick=()=>{panel.classList.remove('is-open');setTimeout(()=>panel.hidden=true,220)};
  panel.querySelectorAll('[data-auth-show]').forEach(button=>button.onclick=()=>{
    const target=button.dataset.authShow;
    message(panel,'');
    if(target==='reset'){
      const loginEmail=panel.querySelector('[data-auth-form="login"] [name="email"]').value;
      const resetEmail=panel.querySelector('[data-auth-form="reset"] [name="email"]');
      if(!resetEmail.value)resetEmail.value=loginEmail;
      show(target);
      requestAnimationFrame(()=>resetEmail.focus());
      return;
    }
    show(target);
  });
  panel.querySelector('[data-auth-form="login"]').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;const submit=form.querySelector('[type="submit"]');if(submit.disabled)return;submit.disabled=true;message(panel,'Connexion…');try{const user=await authClient.signIn(form.email.value,form.password.value);renderAccount(user);show('profile');message(panel,'Connexion réussie.','success')}catch(err){message(panel,err.message,'error')}finally{submit.disabled=false}};
  panel.querySelector('[data-auth-form="signup"]').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;const submit=form.querySelector('[type="submit"]');if(submit.disabled)return;signupRole=form.role.value;submit.disabled=true;message(panel,'Création du compte…');try{const user=await authClient.signUp(form.email.value,form.password.value);profile=(await authClient.api('/api/account/profile',{method:'PUT',body:JSON.stringify(profilePayload({role:signupRole}))})).profile;renderAccount(user);show('verify');message(panel,'Compte créé. Vérifiez votre adresse email.','success')}catch(err){message(panel,err.message,'error')}finally{submit.disabled=false}};
  panel.querySelector('[data-auth-form="reset"]').onsubmit=async event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const submit=form.querySelector('[type="submit"]');
    if(!form.reportValidity()||submit.disabled)return;
    submit.disabled=true;
    submit.setAttribute('aria-busy','true');
    message(panel,'Envoi du lien…');
    try{
      await authClient.resetPassword(form.email.value);
      message(panel,'Si un compte correspond à cette adresse, le lien a été envoyé. Vérifiez aussi vos courriers indésirables.','success');
    }catch(err){
      message(panel,err.message,'error');
    }finally{
      submit.disabled=false;
      submit.removeAttribute('aria-busy');
    }
  };
  panel.querySelector('[data-google-login]').onclick=async()=>{try{const user=await authClient.signInGoogle();renderAccount(user);show('profile');message(panel,'Connexion Google réussie.','success')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-resend-verification]').onclick=()=>authClient.sendVerification().then(()=>message(panel,'Email renvoyé.','success')).catch(err=>message(panel,err.message,'error'));
  panel.querySelector('[data-profile-form]').onsubmit=async e=>{e.preventDefault();try{const file=e.target.avatarFile.files[0];const avatar=file?await avatarData(file):profile?.avatar||'';const body=profilePayload({displayName:e.target.displayName.value,phone:e.target.phone.value,garageName:e.target.garageName.value,role:e.target.role.value,avatar});profile=(await authClient.api('/api/account/profile',{method:'PUT',body:JSON.stringify(body)})).profile;renderAccount(authClient.user);document.querySelector(`[name=usage_scenario][value="${profile.role}"]`)?.click();message(panel,'Profil enregistré.','success')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-sign-out]').onclick=async()=>{await authClient.signOut();profile=null;show('login');message(panel,'')};
  panel.querySelector('[data-export-account]').onclick=async()=>{try{const data=await authClient.api('/api/account/export');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='cardiag-export-rgpd.json';a.click();URL.revokeObjectURL(a.href)}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-delete-account]').onclick=async()=>{if(!confirm('Supprimer définitivement le compte et toutes ses données ?'))return;try{await authClient.api('/api/account',{method:'DELETE',body:JSON.stringify({confirmation:'SUPPRIMER'})});await authClient.signOut();show('login');message(panel,'Compte supprimé.','success')}catch(err){message(panel,err.message,'error')}};
  authClient.onChange(async user=>{signupTrigger.hidden=Boolean(user);updateQuickLabels();if(!user){profile=null;return}renderAccount(user);try{profile=(await authClient.api('/api/account/profile')).profile;if(!profile)profile=(await authClient.api('/api/account/profile',{method:'PUT',body:JSON.stringify(profilePayload({displayName:user.displayName||'',role:signupRole}))})).profile;renderAccount(user)}catch(err){message(panel,err.message,'error')}});
  await authClient.initialize();
  updateQuickLabels();
  window.cardiagAuth=authClient;
}
