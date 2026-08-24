const DB_NAME='cardiag-sync-v1',STORE='jobs';
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function transact(mode,callback){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE);callback(store);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function put(job){return transact('readwrite',store=>store.put(job))} async function remove(id){return transact('readwrite',store=>store.delete(id))}
async function all(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>reject(req.error)})}
export function buildSyncRecords(records=[]) {
  return records.filter(record=>!record?.syncConflict).map(record=>({
    id:record.id,
    titre:record.titre,
    data:record.data,
    createdAt:record.createdAt,
    hasLocalMedia:Boolean(Object.values(record.photos||{}).some(items=>items?.length)),
    syncVersion:Number.isSafeInteger(record.syncVersion)&&record.syncVersion>=0?record.syncVersion:0,
  }));
}
export function pendingLocalRecordCount(records=[]) {
  return records.filter((record) => !record?.syncConflict && (!Number.isSafeInteger(record.syncVersion) || record.syncVersion < 1)).length;
}
function syncRecords(){return buildSyncRecords(window.cardiagDataBridge?.exportRecords?.()||[])}
export function applySyncResult(result={},bridge=window.cardiagDataBridge){
  (result.synced||[]).forEach(({id,syncVersion})=>bridge?.setSyncVersion?.(id,syncVersion));
  (result.conflicts||[]).forEach(({id,serverVersion,serverRecord})=>bridge?.markConflict?.(id,serverRecord,serverVersion));
  return {synced:(result.synced||[]).length,conflicts:(result.conflicts||[]).length};
}
export async function initializeSyncQueue(){
  let timer,draining=false,lastState='idle';
  const publish=(state,detail={})=>{lastState=state;window.dispatchEvent(new CustomEvent('cardiag:sync-status',{detail:{state,...detail}}));};
  async function enqueue({autoDrain=true}={}){if(!window.cardiagAuth?.user)return 0;const records=syncRecords();if(!records.length){await remove('history');return 0;}await put({id:'history',type:'history',records,createdAt:Date.now()});if(autoDrain&&window.cardiagConnectivity?.online)drain();return records.length;}
  async function drain(){if(draining||!window.cardiagConnectivity?.online||!window.cardiagAuth?.user)return;draining=true;let conflictCount=0;try{for(const job of await all()){if(job.type==='history'){try{const result=await window.cardiagAuth.api('/api/account/history',{method:'PUT',body:JSON.stringify({records:job.records})});applySyncResult(result);}catch(error){if(error.status!==409||!error.payload)throw error;const applied=applySyncResult(error.payload);conflictCount+=applied.conflicts;}}await remove(job.id)}publish(conflictCount?'conflict':'synced',{conflicts:conflictCount});}catch{publish('pending');}finally{draining=false}}
  async function migrateLocalRecords(){
    const user=window.cardiagAuth?.user;
    if(!user) throw new Error('Connectez-vous pour synchroniser vos fiches.');
    if(!user.emailVerified) throw new Error('Vérifiez votre adresse email avant de synchroniser vos fiches.');
    const count=await enqueue({autoDrain:false});
    if(!count) return {count:0,state:'synced'};
    if(!window.cardiagConnectivity?.online){publish('pending');return {count,state:'pending'};}
    publish('migrating',{count});
    await drain();
    return {count,state:lastState};
  }
  window.addEventListener('cardiag:data-change',()=>{clearTimeout(timer);timer=setTimeout(enqueue,1600)});
  window.cardiagConnectivity?.subscribe(({online})=>{if(online)drain()});
  window.cardiagAuth?.onChange?.(async user=>{if(!user)return;try{const remote=await window.cardiagAuth.api('/api/account/history');window.cardiagDataBridge?.mergeRecords?.(remote.records||[]);await enqueue()}catch{/* Une session peut exister pendant que le serveur redémarre. */}});
  window.cardiagSync={enqueue,drain,migrateLocalRecords};
}
