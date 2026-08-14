function explain(title, message) {
  return new Promise((resolve) => {
    const layer=document.createElement('div'); layer.className='permission-explainer';
    layer.innerHTML=`<div><p class="panel-kicker">AUTORISATION ANDROID</p><h2>${title}</h2><p>${message}</p><div><button data-deny>Plus tard</button><button data-allow>Continuer</button></div></div>`;
    document.body.append(layer);
    layer.querySelector('[data-deny]').onclick=()=>{layer.remove();resolve(false)};
    layer.querySelector('[data-allow]').onclick=()=>{layer.remove();resolve(true)};
  });
}
export function initializePermissions(){
  window.cardiagPermissions={
    async camera(){
      const camera=window.Capacitor?.Plugins?.Camera;if(!camera)return true;
      const current=await camera.checkPermissions();if(current.camera==='granted')return true;
      if(!await explain('Accès à l’appareil photo','CarDiag utilise la caméra uniquement pour joindre des preuves visuelles à votre expertise.'))return false;
      return (await camera.requestPermissions({permissions:['camera']})).camera==='granted';
    },
    async notifications(){
      const push=window.Capacitor?.Plugins?.PushNotifications;if(!push)return false;
      const current=await push.checkPermissions();if(current.receive==='granted')return true;
      if(!await explain('Activer les notifications','Recevez le statut d’une expertise et vos rappels d’entretien. Vous pourrez désactiver cette option dans Paramètres.'))return false;
      return (await push.requestPermissions()).receive==='granted';
    },
  };
}
