const KEY='cardiag_privacy_consent_v1';
async function read(){try{const p=window.Capacitor?.Plugins?.Preferences;if(p)return(await p.get({key:KEY})).value;return localStorage.getItem(KEY)}catch{return null}}
async function write(value){try{const p=window.Capacitor?.Plugins?.Preferences;if(p)await p.set({key:KEY,value});else localStorage.setItem(KEY,value)}catch{/* Choix conservé pour la session. */}}
export async function initializeConsent(){
  if(await read())return;
  const layer=document.createElement('section');layer.className='consent-sheet';layer.innerHTML=`<div><p class="panel-kicker">VIE PRIVÉE</p><h1>Vos diagnostics restent sous votre contrôle</h1><p>CarDiag fonctionne sans compte et conserve alors vos fiches sur cet appareil. Si vous créez un compte, les informations de profil et fiches sont synchronisées avec Firebase pour être retrouvées sur vos appareils.</p><ul><li>Aucun mot de passe n’est stocké par CarDiag.</li><li>Les photos restent locales sauf transfert explicitement demandé.</li><li>Export et suppression du compte sont accessibles à tout moment.</li></ul><a href="/privacy.html" target="_blank">Lire la politique de confidentialité</a><div><button data-consent-local>Continuer en local</button><button data-consent-accept>J’ai compris</button></div></div>`;document.body.append(layer);
  const close=async value=>{await write(value);layer.remove()};layer.querySelector('[data-consent-local]').onclick=()=>close('local');layer.querySelector('[data-consent-accept]').onclick=()=>close('accepted');
}
