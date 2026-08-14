const SETTINGS_KEY='cardiag_app_settings_v1';
function read(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch{return{}}}function save(value){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(value))}catch{}}
export function initializeSettings(){
  const state={notifications:false,language:'fr',...read()};
  const sheet=document.createElement('aside');sheet.className='settings-sheet';sheet.hidden=true;sheet.innerHTML=`<header><div><p class="panel-kicker">CARDIAG</p><h2>Paramètres</h2></div><button data-settings-close aria-label="Fermer">×</button></header><div class="settings-list">
  <button data-open-design><span>Apparence</span><small>Thème et identité atelier</small></button>
  <label><span>Notifications<small>Statuts d’expertise et rappels</small></span><input type="checkbox" data-setting-notifications></label>
  <button data-test-notifications><span>Tester les notifications</span><small>Envoie une notification à cet appareil</small></button>
  <label><span>Langue<small>Langue de l’interface</small></span><select data-setting-language><option value="fr">Français</option><option value="auto">Système</option></select></label>
  <button data-open-account><span>Compte et données</span><small>Profil, export et suppression</small></button>
  <a href="privacy.html" target="_blank"><span>Politique de confidentialité</span><small>Données et droits RGPD</small></a>
  <a href="terms.html" target="_blank"><span>Mentions légales et CGU</span><small>Conditions d’utilisation</small></a>
  <a href="account-deletion.html" target="_blank"><span>Suppression de compte</span><small>Demande accessible hors application</small></a>
  <div class="settings-version"><span>Version</span><code>1.0.0 · API Android 36</code></div></div>`;document.body.append(sheet);
  const trigger=document.createElement('button');trigger.className='settings-trigger';trigger.type='button';trigger.setAttribute('aria-label','Ouvrir les paramètres');trigger.textContent='⚙';document.getElementById('wizardHeader')?.append(trigger);
  const open=()=>{sheet.hidden=false;requestAnimationFrame(()=>sheet.classList.add('is-open'))};const close=()=>{sheet.classList.remove('is-open');setTimeout(()=>sheet.hidden=true,220)};trigger.onclick=open;sheet.querySelector('[data-settings-close]').onclick=close;
  const notifications=sheet.querySelector('[data-setting-notifications]');notifications.checked=state.notifications;notifications.onchange=async()=>{const enabled=notifications.checked?await window.cardiagPush?.enable?.():await window.cardiagPush?.disable?.();state.notifications=Boolean(enabled);notifications.checked=state.notifications;save(state)};
  const language=sheet.querySelector('[data-setting-language]');language.value=state.language;language.onchange=()=>{state.language=language.value;document.documentElement.lang=state.language==='auto'?(navigator.language||'fr').split('-')[0]:state.language;save(state)};
  sheet.querySelector('[data-test-notifications]').onclick=async()=>{try{if(!window.cardiagAuth?.user)throw new Error('Connectez-vous d’abord.');await window.cardiagAuth.api('/api/account/notifications/test',{method:'POST'});window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'success',message:'Notification de test envoyée'}}))}catch(error){window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:error.message}}))}};
  sheet.querySelector('[data-open-design]').onclick=()=>{close();document.querySelector('.design-trigger')?.click()};sheet.querySelector('[data-open-account]').onclick=()=>{close();document.querySelector('.account-trigger')?.click()};
}
