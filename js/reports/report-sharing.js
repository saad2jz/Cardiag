function safeBranding() {
  const value=window.cardiagBranding?.current || {};
  return { theme:value.theme||'carbon',workshopName:String(value.workshopName||'CarDiag').slice(0,60),logo:value.logo?.length<180000?value.logo:'' };
}

function shareSnapshot(model) {
  const data=model.data||{};
  return {
    id:model.id,title:model.title,createdAt:model.createdAt,score:model.score,done:model.done,total:model.total,
    verdict:model.verdict,verdictLabel:model.verdictLabel,categories:model.categories,
    vehicle:{marque:data.marque,modele:data.modele,annee:data.annee,motorisation:data.motorisation,kilometrage:data.kilometrage,vin:data.vin},
    budget:{valeur:data.valeur,frais:data.frais_estimation,marge:model.negotiation?.label||data.marge_negociation,budgetMax:data.budget_max,prixCible:model.negotiation?.targetPrice||null,arguments:model.negotiation?.arguments||[]},
    summary:String(data.synthese_finale||model.assistantSummary||'').slice(0,5000),
    points:model.points.map(({name,label,section,sectionLabel,category,weight,status,note})=>({name,label,section,sectionLabel,category,weight,status,note:String(note||'').slice(0,1200)})),
    mainPhoto:model.mainPhoto?.dataUrl?.length<420000?model.mainPhoto:null,
    branding:safeBranding(),
  };
}

function shareExpiry(expiresAt) {
  const date = new Date(expiresAt);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'dans 30 jours';
}

function showResult(url,id,expiresAt) {
  const layer=document.createElement('section');layer.className='share-result';
  layer.innerHTML=`<div><p class="panel-kicker">LIEN SÉCURISÉ · 30 JOURS</p><h2>Rapport prêt à partager</h2><p>Ce lien donne accès à une copie en lecture seule, sans exposer votre compte.</p><input readonly value="${url}"><div class="share-result-actions"><button type="button" data-share-copy>Copier le lien</button><a href="${url}" target="_blank" rel="noopener">Ouvrir</a><button type="button" data-share-revoke>Désactiver</button><button type="button" data-share-close>Fermer</button></div></div>`;
  const expiry=document.createElement('p');expiry.className='share-result-expiry';expiry.innerHTML=`<strong>Actif</strong> jusqu’au ${shareExpiry(expiresAt)}.`;layer.querySelector('input').before(expiry);
  document.body.append(layer);layer.querySelector('[data-share-copy]').onclick=async()=>{await navigator.clipboard.writeText(url);layer.querySelector('[data-share-copy]').textContent='Lien copié'};layer.querySelector('[data-share-close]').onclick=()=>layer.remove();layer.querySelector('[data-share-revoke]').onclick=async()=>{await window.cardiagAuth.api(`/api/account/shares/${id}`,{method:'DELETE'});window.cardiagDataBridge?.setShareUrl?.(window.cardiagDataBridge.getReportModel()?.id,'');layer.remove()};
}

export function initializeReportSharing() {
  const button=document.getElementById('shareReportBtn');if(!button)return;
  button.addEventListener('click',async()=>{
    if(!window.cardiagAuth?.user){document.querySelector('.account-trigger')?.click();window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'selection',message:'Connectez-vous pour créer un lien privé'}}));return;}
    const original=button.textContent;button.disabled=true;button.textContent='Création du lien…';
    try{const model=window.cardiagDataBridge.getReportModel();const result=await window.cardiagAuth.api('/api/account/shares',{method:'POST',body:JSON.stringify({report:shareSnapshot(model)})});window.cardiagDataBridge.setShareUrl(model.id,result.url);showResult(result.url,result.id,result.expiresAt);}catch(error){window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:error.message}}));}finally{button.disabled=false;button.textContent=original;}
  });
}
