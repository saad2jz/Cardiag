import { authClient } from './firebase-client.js?v=20260814-1';

const ROLES = {buyer:'Acheteur',mechanic:'Garagiste',seller:'Vendeur',owner:'Propriétaire'};
function message(panel,text,type='') { const node=panel.querySelector('[data-auth-status]'); node.textContent=text; node.dataset.type=type; }
function createAuthSurface() {
  const panel=document.createElement('section');
  panel.className='account-sheet'; panel.id='accountSheet'; panel.hidden=true;
  panel.innerHTML=`<header><div><p class="panel-kicker">COMPTE CARDIAG</p><h2 data-account-title>Connexion</h2></div><button type="button" data-account-close aria-label="Fermer">×</button></header>
  <div class="auth-view" data-auth-view="login"><form data-auth-form="login"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Mot de passe<input type="password" name="password" autocomplete="current-password" minlength="8" required></label><button>Se connecter</button></form><button data-google-login>Continuer avec Google</button><button data-auth-show="reset">Mot de passe oublié</button><button data-auth-show="signup">Créer un compte</button></div>
  <div class="auth-view" data-auth-view="signup" hidden><form data-auth-form="signup"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Mot de passe<input type="password" name="password" autocomplete="new-password" minlength="8" required></label><label>Rôle<select name="role">${Object.entries(ROLES).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label class="consent-check"><input type="checkbox" name="consent" required> J’accepte la politique de confidentialité et la synchronisation de mes fiches.</label><button>Créer mon compte</button></form><button data-auth-show="login">Déjà inscrit</button></div>
  <div class="auth-view" data-auth-view="reset" hidden><form data-auth-form="reset"><label>Email<input type="email" name="email" autocomplete="email" required></label><button>Envoyer le lien</button></form><button data-auth-show="login">Retour à la connexion</button></div>
  <div class="auth-view" data-auth-view="verify" hidden><div class="auth-empty"><b>Vérifiez votre adresse email</b><p>Un lien vient de vous être envoyé. La synchronisation sera activée après vérification.</p></div><button data-resend-verification>Renvoyer le lien</button></div>
  <div class="auth-view" data-auth-view="profile" hidden><form data-profile-form><label>Nom affiché<input name="displayName" maxlength="80"></label><label>Rôle<select name="role">${Object.entries(ROLES).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Avatar<input type="file" name="avatarFile" accept="image/*"></label><button>Enregistrer</button></form><div class="account-actions"><button data-export-account>Exporter mes données</button><button data-sign-out>Se déconnecter</button><button class="danger" data-delete-account>Supprimer définitivement le compte</button></div></div>
  <p class="auth-status" data-auth-status role="status"></p>`;
  document.body.append(panel); return panel;
}

function avatarData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});}
export async function initializeAuthUi(){
  const panel=createAuthSurface();
  const trigger=document.createElement('button'); trigger.className='account-trigger'; trigger.type='button'; trigger.textContent='Compte';
  document.getElementById('wizardHeader')?.append(trigger);
  let signupRole='buyer'; let profile=null;
  const show=(name)=>{panel.querySelectorAll('[data-auth-view]').forEach(v=>v.hidden=v.dataset.authView!==name);panel.querySelector('[data-account-title]').textContent=name==='profile'?'Mon profil':name==='signup'?'Créer un compte':name==='reset'?'Mot de passe oublié':name==='verify'?'Vérification email':'Connexion';};
  const open=()=>{panel.hidden=false;requestAnimationFrame(()=>panel.classList.add('is-open'));show(authClient.user?'profile':'login');};
  trigger.addEventListener('click',open); panel.querySelector('[data-account-close]').onclick=()=>{panel.classList.remove('is-open');setTimeout(()=>panel.hidden=true,220)};
  panel.querySelectorAll('[data-auth-show]').forEach(b=>b.onclick=()=>show(b.dataset.authShow));
  panel.querySelector('[data-auth-form="login"]').onsubmit=async e=>{e.preventDefault();message(panel,'Connexion…');try{await authClient.signIn(e.target.email.value,e.target.password.value);show('profile')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-auth-form="signup"]').onsubmit=async e=>{e.preventDefault();signupRole=e.target.role.value;message(panel,'Création du compte…');try{await authClient.signUp(e.target.email.value,e.target.password.value);await authClient.api('/api/account/profile',{method:'PUT',body:JSON.stringify({role:signupRole,consent:true})});show('verify')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-auth-form="reset"]').onsubmit=async e=>{e.preventDefault();try{await authClient.resetPassword(e.target.email.value);message(panel,'Lien de réinitialisation envoyé.','success')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-google-login]').onclick=async()=>{try{await authClient.signInGoogle();show('profile')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-resend-verification]').onclick=()=>authClient.sendVerification().then(()=>message(panel,'Email renvoyé.','success')).catch(err=>message(panel,err.message,'error'));
  panel.querySelector('[data-profile-form]').onsubmit=async e=>{e.preventDefault();try{const file=e.target.avatarFile.files[0];const avatar=file?await avatarData(file):profile?.avatar||'';const body={displayName:e.target.displayName.value,role:e.target.role.value,avatar,consent:true};profile=(await authClient.api('/api/account/profile',{method:'PUT',body:JSON.stringify(body)})).profile;document.querySelector(`[name=usage_scenario][value="${profile.role}"]`)?.click();message(panel,'Profil enregistré.','success')}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-sign-out]').onclick=async()=>{await authClient.signOut();show('login')};
  panel.querySelector('[data-export-account]').onclick=async()=>{try{const data=await authClient.api('/api/account/export');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='cardiag-export-rgpd.json';a.click();URL.revokeObjectURL(a.href)}catch(err){message(panel,err.message,'error')}};
  panel.querySelector('[data-delete-account]').onclick=async()=>{if(!confirm('Supprimer définitivement le compte et toutes ses données ?'))return;try{await authClient.api('/api/account',{method:'DELETE',body:JSON.stringify({confirmation:'SUPPRIMER'})});await authClient.signOut();show('login');message(panel,'Compte supprimé.','success')}catch(err){message(panel,err.message,'error')}};
  authClient.onChange(async user=>{trigger.textContent=user?'Mon compte':'Compte';if(!user)return;try{profile=(await authClient.api('/api/account/profile')).profile||{};const form=panel.querySelector('[data-profile-form]');form.displayName.value=profile.displayName||user.displayName||'';form.role.value=profile.role||signupRole||'buyer'}catch(err){message(panel,err.message,'error')}});
  await authClient.initialize();
  window.cardiagAuth=authClient;
}
