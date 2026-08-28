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
    async bluetooth(){
      const cap=window.Capacitor;if(!cap || cap.getPlatform?.() !== 'android') return true;
      const plugin = cap.Plugins?.BluetoothSerial ?? cap.Plugins?.BluetoothClassic ?? cap.Plugins?.BluetoothCommunication;
      if(!plugin) return true;
      if(typeof plugin.checkPermissions === 'function'){
        try {
          const current = await plugin.checkPermissions();
          if(current?.bluetooth === 'granted' || current?.granted === true) return true;
        } catch { /* proceed to prompt */ }
      }
      if(!await explain('Connexion Bluetooth OBD2','CarDiag utilise le Bluetooth pour communiquer avec votre boîtier de diagnostic OBD2. Aucune donnée n’est transmise sur Internet.')) return false;
      if(typeof plugin.requestPermissions === 'function'){
        try {
          const result = await plugin.requestPermissions();
          return Boolean(result?.granted ?? result?.bluetooth ?? result);
        } catch { return false; }
      }
      return true;
    },
    async microphone(){
      if(!await explain('Accès au microphone','CarDiag utilise le microphone uniquement pour la dictée vocale des notes et l’analyse acoustique du bruit moteur.')) return false;
      return true;
    },
  };
}
