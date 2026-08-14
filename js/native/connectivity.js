let online=navigator.onLine;
const listeners=new Set();
function publish(value,type='unknown'){online=Boolean(value);document.body.classList.toggle('is-offline',!online);const node=document.getElementById('networkIndicator');if(node){node.dataset.online=String(online);node.textContent=online?`En ligne · ${type}`:'Hors ligne · modifications en attente'}listeners.forEach(fn=>fn({online,type}))}
export function initializeConnectivity(){
  const node=document.createElement('div');node.id='networkIndicator';node.className='network-indicator';node.setAttribute('role','status');document.body.append(node);
  const network=window.Capacitor?.Plugins?.Network;
  if(network){network.getStatus().then(status=>publish(status.connected,status.connectionType));network.addListener('networkStatusChange',status=>publish(status.connected,status.connectionType));}
  else{window.addEventListener('online',()=>publish(true,'web'));window.addEventListener('offline',()=>publish(false,'web'));publish(navigator.onLine,'web')}
  window.cardiagConnectivity={get online(){return online},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}};
}
