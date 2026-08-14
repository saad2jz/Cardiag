const DB_NAME='cardiag-sync-v1',STORE='jobs';
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function transact(mode,callback){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE);callback(store);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function put(job){return transact('readwrite',store=>store.put(job))} async function remove(id){return transact('readwrite',store=>store.delete(id))}
async function all(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>reject(req.error)})}
function syncRecords(){return (window.cardiagDataBridge?.exportRecords?.()||[]).map(record=>({id:record.id,titre:record.titre,data:record.data,createdAt:record.createdAt,hasLocalMedia:Boolean(Object.values(record.photos||{}).some(items=>items?.length)),updatedAt:new Date().toISOString()}))}
export async function initializeSyncQueue(){
  let timer,draining=false;
  async function enqueue(){if(!window.cardiagAuth?.user)return;await put({id:'history',type:'history',records:syncRecords(),createdAt:Date.now()});if(window.cardiagConnectivity?.online)drain()}
  async function drain(){if(draining||!window.cardiagConnectivity?.online||!window.cardiagAuth?.user)return;draining=true;try{for(const job of await all()){if(job.type==='history')await window.cardiagAuth.api('/api/account/history',{method:'PUT',body:JSON.stringify({records:job.records})});await remove(job.id)}window.dispatchEvent(new CustomEvent('cardiag:sync-status',{detail:{state:'synced'}}))}catch{window.dispatchEvent(new CustomEvent('cardiag:sync-status',{detail:{state:'pending'}}))}finally{draining=false}}
  window.addEventListener('cardiag:data-change',()=>{clearTimeout(timer);timer=setTimeout(enqueue,1600)});
  window.cardiagConnectivity?.subscribe(({online})=>{if(online)drain()});
  window.cardiagAuth?.onChange?.(async user=>{if(!user)return;try{const remote=await window.cardiagAuth.api('/api/account/history');window.cardiagDataBridge?.mergeRecords?.(remote.records||[]);await enqueue()}catch{/* Une session peut exister pendant que le serveur redémarre. */}});
  window.cardiagSync={enqueue,drain};
}
