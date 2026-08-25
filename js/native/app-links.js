function openUrl(raw){
  try{const url=new URL(raw);const webMatch=url.pathname.match(/^\/(?:fiche|app\/inspection)\/([a-zA-Z0-9_-]+)/);const nativeId=url.protocol==='cardiag:'&&url.hostname==='fiche'?url.pathname.slice(1):'';const id=webMatch?.[1]||nativeId;if(id&&window.cardiagRouter?.inspection){window.cardiagRouter.inspection(id,'rapport');return true}if(id)window.cardiagDataBridge?.openRecord?.(id);if(id||url.protocol==='cardiag:'){window.cardiagWizard?.goToStep?.(4);return true}}catch{/* URL non reconnue. */}return false;
}
export function initializeAppLinks(){
  window.Capacitor?.Plugins?.App?.addListener?.('appUrlOpen',({url})=>openUrl(url));
  // Preserve legacy query links while sending them through the canonical route.
  const initial=new URL(location.href).searchParams.get('fiche');if(initial)window.setTimeout(()=>openUrl(`https://cardiag.online/app/inspection/${encodeURIComponent(initial)}/rapport`),500);
  window.cardiagOpenDeepLink=openUrl;
}
