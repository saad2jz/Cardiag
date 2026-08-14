let registrationToken='';
async function sendToken(){if(!registrationToken||!window.cardiagAuth?.user)return;try{await window.cardiagAuth.api('/api/account/push-token',{method:'POST',body:JSON.stringify({token:registrationToken})})}catch{/* Conservé en mémoire jusqu’au prochain changement de session/réseau. */}}
export async function initializePush(){
  const push=window.Capacitor?.Plugins?.PushNotifications;if(!push)return;
  push.addListener('registration',async({value})=>{registrationToken=value;await sendToken()});
  push.addListener('registrationError',()=>window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback',{detail:{type:'error',message:'Notifications indisponibles'}})));
  push.addListener('pushNotificationActionPerformed',({notification})=>{const url=notification?.data?.url||notification?.data?.deepLink;if(url)window.cardiagOpenDeepLink?.(url)});
  window.cardiagAuth?.onChange?.(()=>sendToken());
  window.cardiagPush={async enable(){if(!await window.cardiagPermissions?.notifications?.())return false;await push.register();return true},async disable(){await push.unregister();registrationToken='';return true}};
}
