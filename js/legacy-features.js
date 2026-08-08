// Restored feature controller. It is initialized once by js/app.js after dbLoader loads data/vehicles.json.

export function initializeLegacyFeatures(vehicleData) {
  vehicleData = Array.isArray(vehicleData) ? vehicleData : [];
  // Compatibility view generated at startup from data/vehicles.json. The
  // original inline vehicle catalog is deliberately not shipped with this module.
  const vehicleIndex = Object.fromEntries(vehicleData.map(marque => [marque.nom, Object.fromEntries((marque.modeles || []).map(modele => [modele.nom, (modele.generations || []).map((generation, index) => ({
    chassis: String(generation.code_chassis || generation.chassis || generation.phase || generation.phases?.[0] || index),
    annees: generation.annees || ''
  }))]))]));
  const motorIndex = Object.fromEntries(vehicleData.flatMap(marque => (marque.modeles || []).flatMap(modele => (modele.generations || []).map((generation, generationIndex) => {
    const chassis = String(generation.code_chassis || generation.chassis || generation.phase || generation.phases?.[0] || generationIndex);
    const motors = generation.motorisations || modele.motorisations || [];
    return [marque.nom + '|' + modele.nom + '|' + chassis, motors.map((motor, motorIndex) => ({
      label: String(typeof motor === 'string' ? motor : motor.nom || motor.label || [motor.type, motor.cylindree, motor.puissance_ch ? motor.puissance_ch + 'ch' : ''].filter(Boolean).join(' ') || 'Motorisation ' + (motorIndex + 1)),
      code: typeof motor === 'object' ? (motor.code_moteur || motor.code || '') : ''
    }))];
  }))));
  const ISSUE_DB = Object.fromEntries(vehicleData.flatMap(marque => (marque.modeles || []).flatMap(modele => (modele.generations || []).flatMap((generation, generationIndex) => {
    const chassis = String(generation.code_chassis || generation.chassis || generation.phase || generation.phases?.[0] || generationIndex);
    return (generation.motorisations || modele.motorisations || []).map((motor, motorIndex) => {
      const label = String(typeof motor === 'string' ? motor : motor.nom || motor.label || [motor.type, motor.cylindree, motor.puissance_ch ? motor.puissance_ch + 'ch' : ''].filter(Boolean).join(' ') || 'Motorisation ' + (motorIndex + 1));
      const value = label + (typeof motor === 'object' && (motor.code_moteur || motor.code)
        ? String.fromCharCode(32, 8212, 32) + 'code ' + (motor.code_moteur || motor.code)
        : '');
      return [marque.nom + '|' + modele.nom + '|' + chassis + '|' + value, Array.isArray(motor.points_faibles) ? motor.points_faibles : []];
    });
  }))));

  const DB_KEY = 'fev_fiches_db_v2';
  const CUR_KEY = 'fev_fiche_courante_v2';
  const QUICK_MODE_KEY = 'fev_quick_mode_v1';
  const CHECK_NAMES = ['huile','ldr','fuites','bruits','fumee','ralenti','culasse','supports',
    'rouille_plancher','longerons','pont','rotules','amortos','pneus','jantes',
    'panneaux','mastic','peinture','feux_av','feux_ar','feux_recul',
    'sieges','ciel','clim','vitres','humidite',
    'accel','vitesses','braquage','freinage','stabilite','p1000','q_historique'];

  const CATEGORY_OF = {
    huile:'vital', ldr:'vital', fuites:'vital', bruits:'vital', fumee:'vital', ralenti:'vital', culasse:'vital', supports:'vital', p1000:'vital',
    rouille_plancher:'chassis', longerons:'chassis', pont:'chassis', rotules:'chassis', amortos:'chassis', pneus:'chassis', jantes:'chassis',
    accel:'chassis', vitesses:'chassis', braquage:'chassis', freinage:'chassis', stabilite:'chassis', q_historique:'chassis',
    panneaux:'esthetique', mastic:'esthetique', peinture:'esthetique', feux_av:'esthetique', feux_ar:'esthetique', feux_recul:'esthetique',
    sieges:'esthetique', ciel:'esthetique', clim:'esthetique', vitres:'esthetique', humidite:'esthetique'
  };
  const DEFAULT_CATEGORY_WEIGHTS = { vital:5, chassis:3, esthetique:1 };
  const WEIGHTS_KEY = 'fev_category_weights_v1';
  let categoryWeights = Object.assign({}, DEFAULT_CATEGORY_WEIGHTS);
  function loadCategoryWeights(){
    try{
      const raw = safeStorage.getItem(WEIGHTS_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        categoryWeights = {
          vital: Number.isFinite(parsed.vital) ? parsed.vital : DEFAULT_CATEGORY_WEIGHTS.vital,
          chassis: Number.isFinite(parsed.chassis) ? parsed.chassis : DEFAULT_CATEGORY_WEIGHTS.chassis,
          esthetique: Number.isFinite(parsed.esthetique) ? parsed.esthetique : DEFAULT_CATEGORY_WEIGHTS.esthetique
        };
      }
    }catch(e){ categoryWeights = Object.assign({}, DEFAULT_CATEGORY_WEIGHTS); }
  }
  function saveCategoryWeights(){
    safeStorage.setItem(WEIGHTS_KEY, JSON.stringify(categoryWeights));
  }
  function getWeight(name){
    const cat = CATEGORY_OF[name];
    return (cat && Number.isFinite(categoryWeights[cat])) ? categoryWeights[cat] : 1;
  }
  const WEIGHT_CATEGORY_LABELS = { vital:'Organes vitaux (moteur / électronique)', chassis:'Châssis / trains roulants / dynamique', esthetique:'Esthétique / confort' };
  const CHECK_LABELS = {
    huile:"Huile moteur", ldr:"Liquide de refroidissement", fuites:"Fuites sous le véhicule", bruits:"Bruits anormaux moteur",
    fumee:"Fumée à l'échappement", ralenti:"Stabilité du ralenti", culasse:"Joint de culasse", supports:"Supports moteur", p1000:"Code P1000",
    rouille_plancher:"Rouille plancher", longerons:"Longerons / points d'ancrage", pont:"Fuites pont / différentiel", rotules:"Jeu rotules / triangles",
    amortos:"Amortisseurs", pneus:"Pneus", jantes:"Jantes", accel:"Accélération", vitesses:"Passage des vitesses", braquage:"Test de braquage",
    freinage:"Freinage", stabilite:"Stabilité à vitesse stabilisée", q_historique:"Historique d'entretien",
    panneaux:"Alignement panneaux", mastic:"Mastic / bondo", peinture:"Peinture", feux_av:"Feux avant", feux_ar:"Feux arrière",
    feux_recul:"Feux recul / antibrouillard", sieges:"Sièges", ciel:"Ciel de toit", clim:"Climatisation", vitres:"Vitres électriques", humidite:"Humidité / odeurs"
  };

  const SIGNATURE_NAMES = ['acheteur','vendeur'];
  const SIGNATURE_LABELS = { acheteur:'Signature acheteur', vendeur:'Signature vendeur' };
  const signaturePadState = {};

  const CRITICAL_RULES = [
    {
      id: 'memoire_effacee_ralenti',
      test: (d) => d.p1000 === 'defaut' && (d.ralenti === 'defaut' || d.ralenti === 'moyen'),
      message: '<strong>Risque élevé de vice caché :</strong> le code P1000 (mémoire défauts récemment effacée) est associé à un ralenti instable. Ce cumul de signaux dépasse le seuil de tolérance : le verdict est verrouillé sur « À FUIR » jusqu\u2019à contre-expertise, quel que soit l\u2019état esthétique du véhicule.'
    },
    {
      id: 'fuite_culasse',
      test: (d) => d.fuites === 'defaut' && d.culasse === 'defaut',
      message: '<strong>Risque de casse moteur imminente :</strong> une fuite active associée à un joint de culasse suspect suggère un moteur déjà en surchauffe ou en fin de vie. Le coût de réparation (voire remplacement moteur) dépasse généralement la valeur négociable du véhicule.'
    },
    {
      id: 'structure_plancher',
      test: (d) => d.rouille_plancher === 'defaut' && d.longerons === 'defaut',
      message: '<strong>Risque structurel majeur :</strong> une rouille perforante du plancher combinée à des longerons déformés remet en cause l\u2019intégrité du châssis. Ce cumul peut signaler un ancien accident mal réparé ou un véhicule dangereux à rouler.'
    }
  ];

  const memoryStore = {};
  let storageWarned = false;
  const safeStorage = {
    getItem(key){
      try{ return localStorage.getItem(key); }
      catch(e){ if(!storageWarned){ console.warn('Stockage local indisponible, mode mémoire (non persistant) activé.'); storageWarned = true; } return Object.prototype.hasOwnProperty.call(memoryStore,key) ? memoryStore[key] : null; }
    },
    setItem(key, value){
      try{ localStorage.setItem(key, value); return true; }
      catch(e){ if(!storageWarned){ console.warn('Stockage local indisponible, mode mémoire (non persistant) activé.'); storageWarned = true; } memoryStore[key] = value; return true; }
    }
  };

  function cssEscape(s){
    if(window.CSS && typeof CSS.escape === 'function'){
      try{ return CSS.escape(s); }catch(e){ /* repli ci-dessous */ }
    }
    return String(s).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, function(ch){ return '\\'+ch; });
  }

  let db = {};
  let currentId = null;

  function persist(){
    try{
      const serialized = JSON.stringify(db);
      safeStorage.setItem(DB_KEY, serialized);
      safeStorage.setItem(CUR_KEY, currentId);
      updateSaveIndicator(true);
      updateStorageMeter(serialized);
      return true;
    }catch(e){
      console.error('Erreur de sauvegarde locale (quota dépassé ?):', e);
      updateSaveIndicator(false);
      return false;
    }
  }

  function updateSaveIndicator(success){
    const el = document.getElementById('saveIndicator');
    const txt = document.getElementById('saveIndicatorText');
    if(!el || !txt) return;
    if(success){
      el.classList.remove('saving');
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      txt.textContent = 'Enregistré à '+hh+':'+mm;
    }else{
      el.classList.add('saving');
      txt.textContent = 'Échec de sauvegarde';
    }
  }

  const STORAGE_QUOTA_ESTIMATE_BYTES = 5 * 1024 * 1024;
  function updateStorageMeter(serializedDb){
    const bar = document.getElementById('storageMeterBar');
    const text = document.getElementById('storageMeterText');
    if(!bar || !text) return;
    try{
      const bytes = new Blob([serializedDb || JSON.stringify(db)]).size;
      const pct = Math.min(100, Math.round((bytes / STORAGE_QUOTA_ESTIMATE_BYTES) * 100));
      const mb = (bytes / (1024*1024)).toFixed(1);
      bar.style.width = pct + '%';
      bar.classList.toggle('warn', pct >= 60 && pct < 85);
      bar.classList.toggle('crit', pct >= 85);
      text.textContent = mb + ' Mo (~' + pct + '% d\u2019un quota typique de 5 Mo)';
    }catch(e){
      text.textContent = '—';
    }
  }

  function loadDb(){
    try{ db = JSON.parse(safeStorage.getItem(DB_KEY)) || {}; }catch(e){ db = {}; }
    currentId = safeStorage.getItem(CUR_KEY);
    if(!currentId || !db[currentId]){
      const id = createFiche();
      currentId = id;
    }
  }
  function createFiche(sourceData){
    const id = 't'+Date.now()+Math.floor(Math.random()*1000);
    db[id] = { id, titre:'Nouvelle fiche', data: sourceData ? Object.assign({}, sourceData.data) : {}, photos: sourceData ? JSON.parse(JSON.stringify(sourceData.photos||{})) : {}, signatures: sourceData ? JSON.parse(JSON.stringify(sourceData.signatures||{})) : {}, createdAt: new Date().toISOString() };
    persist();
    return id;
  }

  function fieldEls(){
    return document.querySelectorAll('main input[name], main textarea[name], main select[name]');
  }

  function collectCurrent(){
    const data = {};
    fieldEls().forEach(el=>{
      if(el.type === 'radio'){ if(el.checked) data[el.name] = el.value; }
      else if(el.type === 'checkbox'){ data[el.name] = el.checked; }
      else { data[el.name] = el.value; }
    });
    return data;
  }

  function applyToForm(data){
    data = data || {};
    fieldEls().forEach(el=>{
      if(el.type === 'radio'){ el.checked = (data[el.name] === el.value); }
      else if(el.type === 'checkbox'){ el.checked = !!data[el.name]; }
      else { el.value = data[el.name] !== undefined ? data[el.name] : ''; }
    });
  }

  function ficheLabel(f){
    const d = f.data || {};
    const parts = [d.marque, d.modele, d.annee].filter(Boolean);
    return parts.length ? parts.join(' ') : (f.titre || 'Fiche sans nom');
  }

  function saveCurrent(){
    db[currentId].data = collectCurrent();
    db[currentId].titre = ficheLabel(db[currentId]);
    persist();
    refreshSelector();
  }

  function switchFiche(id){
    currentId = id;
    persist();
    applyToForm(db[id].data);
    restoreVehicleSelects(db[id].data);
    renderAllPhotoGrids();
    if(typeof refreshAllSignaturePads === 'function') refreshAllSignaturePads();
    updateProgress();
    updateBudget();
    checkCriticalRisk();
    validateRequiredFields();
  }

  function refreshSelector(){
    const sel = document.getElementById('ficheSelect');
    sel.innerHTML = '';
    Object.values(db).sort((a,b)=> (a.createdAt||'').localeCompare(b.createdAt||'')).forEach(f=>{
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = ficheLabel(f);
      if(f.id === currentId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function updateProgress(){
    let total = 0, done = 0;
    let weightSum = 0, weightedScore = 0;
    CHECK_NAMES.forEach(name=>{
      total++;
      const checked = document.querySelector('input[name="'+name+'"]:checked');
      if(checked){
        done++;
        const w = getWeight(name);
        const val = checked.value === 'ok' ? 1 : (checked.value === 'moyen' ? 0.55 : 0);
        weightSum += w;
        weightedScore += w * val;
      }
    });
    const pct = total ? Math.round((done/total)*100) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = done + ' / ' + total + ' points vérifiés';
    document.getElementById('progressPct').textContent = pct + '%';

    const scorePct = weightSum ? Math.round((weightedScore/weightSum)*100) : null;
    const gauge = document.getElementById('scoreGauge');
    if(scorePct === null){
      gauge.innerHTML = 'Score : —';
    }else{
      const cls = scorePct >= 80 ? 'sc-ok' : (scorePct >= 55 ? 'sc-warn' : 'sc-bad');
      gauge.innerHTML = 'Score pondéré : <span class="'+cls+'">'+scorePct+'%</span> ('+done+' contrôlés) <span class="info-dot">ⓘ</span>';
    }
    const tooltip = 'Score pondéré par gravité mécanique :\n'+
      '• Organes vitaux (moteur/électronique) — coeff. ×'+categoryWeights.vital+'\n'+
      '• Châssis / trains roulants / dynamique — coeff. ×'+categoryWeights.chassis+'\n'+
      '• Esthétique / confort — coeff. ×'+categoryWeights.esthetique+'\n'+
      'Réglable via le bouton « ⚖ Pondération » de la barre d\u2019outils.';
    gauge.setAttribute('data-tooltip', tooltip);
    gauge.setAttribute('title', tooltip);

    updateMiniDash(scorePct, done, total);
  }

  function updateMiniDash(scorePct, done, total){
    const dash = document.getElementById('miniDash');
    if(!dash) return;
    const ring = document.getElementById('miniDashRing');
    const scoreEl = document.getElementById('miniDashScore');
    const verdictEl = document.getElementById('miniDashVerdict');
    const subEl = document.getElementById('miniDashSub');

    if(scorePct === null){
      ring.style.background = 'var(--border)';
      scoreEl.textContent = '—';
    }else{
      const cls = scorePct >= 80 ? '#1B8F58' : (scorePct >= 55 ? '#B87900' : '#C6303A');
      const deg = (scorePct/100) * 360;
      ring.style.background = 'conic-gradient('+cls+' '+deg+'deg, var(--border) '+deg+'deg)';
      scoreEl.textContent = scorePct + '%';
    }

    const verdictInput = document.querySelector('input[name="verdict"]:checked');
    const verdictVal = verdictInput ? verdictInput.value : null;
    dash.classList.remove('v-achat','v-negociation','v-fuir');
    let verdictLabel = 'Sans verdict';
    if(verdictVal){
      dash.classList.add('v-'+verdictVal);
      verdictLabel = verdictVal === 'achat' ? 'ACHAT' : (verdictVal === 'negociation' ? 'NÉGOCIATION' : 'À FUIR');
    }
    verdictEl.innerHTML = '<span class="mini-dash-dot"></span> ' + verdictLabel;
    subEl.textContent = done + ' / ' + total + ' vérifiés';

    dash.classList.toggle('show', done > 0 && !miniDashSuppressed);
  }

  function checkCriticalRisk(){
    const d = collectCurrent();
    const triggered = CRITICAL_RULES.filter(rule => rule.test(d));
    const isCritical = triggered.length > 0;

    const vAchat = document.getElementById('v_achat');
    const vNeg = document.getElementById('v_neg');
    const vFuir = document.getElementById('v_fuir');
    const wrap = document.getElementById('criticalRiskBannerWrap');

    wrap.innerHTML = '';
    if(isCritical){
      triggered.forEach(rule=>{
        const box = document.createElement('div');
        box.className = 'alert-box';
        box.style.background = 'var(--rouge-fond)';
        box.style.borderColor = '#E39A9A';
        box.innerHTML = '<div class="icon" style="background:var(--rouge)">⚠</div>'+
          '<div class="txt" style="color:#8A1616">'+rule.message+'</div>';
        wrap.appendChild(box);
      });
      vAchat.disabled = true;
      vNeg.disabled = true;
      vAchat.closest('.verdict-group').querySelectorAll('label')[0].classList.add('disabled-choice');
      vAchat.closest('.verdict-group').querySelectorAll('label')[1].classList.add('disabled-choice');
      if(!vFuir.checked){
        vFuir.checked = true;
        saveCurrent();
      }
    }else{
      vAchat.disabled = false;
      vNeg.disabled = false;
      vAchat.closest('.verdict-group').querySelectorAll('label')[0].classList.remove('disabled-choice');
      vAchat.closest('.verdict-group').querySelectorAll('label')[1].classList.remove('disabled-choice');
    }
    updateProgress();
    return triggered;
  }

  function updateBudget(){
    const valeur = parseFloat(document.querySelector('input[name="valeur"]').value) || 0;
    const frais = parseFloat(document.getElementById('fraisEstimation').value) || 0;
    const budget = parseFloat(document.getElementById('budgetMax').value) || 0;
    const box = document.getElementById('budgetResult');
    if(!budget){
      box.className = 'budget-result';
      box.textContent = 'Renseignez la valeur du véhicule (section 1), les frais estimés et votre budget max pour voir le calcul.';
      return;
    }
    const total = valeur + frais;
    const delta = budget - total;
    if(delta >= 0){
      box.className = 'budget-result pos';
      box.textContent = 'Coût total estimé : '+total.toLocaleString('fr-FR')+' € — Marge de '+delta.toLocaleString('fr-FR')+' € sous votre budget de '+budget.toLocaleString('fr-FR')+' €.';
    }else{
      box.className = 'budget-result neg';
      box.textContent = 'Coût total estimé : '+total.toLocaleString('fr-FR')+' € — Dépasse votre budget de '+Math.abs(delta).toLocaleString('fr-FR')+' €.';
    }
  }

  function buildPhotoBlocks(){
    document.querySelectorAll('details.section[data-section]').forEach(sec=>{
      const key = sec.dataset.section;
      const body = sec.querySelector('.section-body');
      const block = document.createElement('div');
      block.className = 'photo-block';
      block.innerHTML = '<div class="subhead">📷 Photos</div>'+
        '<div class="photo-input-row">'+
          '<label class="photo-input-label" data-label-for="'+key+'-camera"><span class="lbl-txt">📷 Prendre une photo</span><input type="file" accept="image/*" capture="environment" data-photo-input="'+key+'-camera"></label>'+
          '<label class="photo-input-label" data-label-for="'+key+'-gallery"><span class="lbl-txt">🖼 Choisir depuis la galerie</span><input type="file" accept="image/*" multiple data-photo-input="'+key+'-gallery"></label>'+
        '</div>'+
        '<div class="photo-grid" data-photo-grid="'+key+'"></div>';
      body.appendChild(block);
      block.querySelectorAll('input[type="file"]').forEach(fileInput=>{
        const labelText = fileInput.closest('.photo-input-label').querySelector('.lbl-txt');
        fileInput.addEventListener('change', async (e)=>{
          const originalText = labelText.textContent;
          labelText.textContent = '⏳ Traitement des photos...';
          fileInput.disabled = true;
          await handlePhotoUpload(key, e.target.files, e.target);
          labelText.textContent = originalText;
          fileInput.disabled = false;
        });
      });
    });
  }
  function compressImage(file, maxDim, quality){
    maxDim = maxDim || 1280; quality = quality || 0.72;
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onerror = ()=>reject(new Error('Lecture du fichier impossible'));
      reader.onload = ()=>{
        const img = new Image();
        img.onerror = ()=>reject(new Error('Image illisible'));
        img.onload = ()=>{
          let w = img.width, h = img.height;
          if(w > maxDim || h > maxDim){
            if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
            else{ w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function handlePhotoUpload(sectionKey, files, inputEl){
    const fiche = db[currentId];
    fiche.photos = fiche.photos || {};
    fiche.photos[sectionKey] = fiche.photos[sectionKey] || [];
    const before = fiche.photos[sectionKey].length;
    const results = await Promise.allSettled(Array.from(files).map(file=>
      compressImage(file).then(dataUrl=>({name:file.name, dataUrl}))
    ));
    results.forEach(r=>{ if(r.status === 'fulfilled') fiche.photos[sectionKey].push(r.value); });
    const failedCount = results.filter(r=>r.status === 'rejected').length;
    const ok = persist();
    if(!ok){
      fiche.photos[sectionKey] = fiche.photos[sectionKey].slice(0, before);
      persist();
      alert('Stockage plein : la photo n\u2019a pas pu être enregistrée. Supprimez d\u2019anciennes photos puis réessayez.');
    }else if(failedCount > 0){
      alert(failedCount + ' photo(s) n\u2019ont pas pu être traitées.');
    }
    renderPhotoGrid(sectionKey);
    if(inputEl) inputEl.value = '';
  }
  function renderPhotoGrid(sectionKey){
    const grid = document.querySelector('[data-photo-grid="'+sectionKey+'"]');
    if(!grid) return;
    const photos = (db[currentId].photos && db[currentId].photos[sectionKey]) || [];
    grid.innerHTML = '';
    photos.forEach((p, idx)=>{
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.innerHTML = '<img src="'+p.dataUrl+'" alt="'+p.name+'"><button class="rm" type="button">×</button>';
      thumb.querySelector('.rm').addEventListener('click', ()=>{
        db[currentId].photos[sectionKey].splice(idx,1);
        persist();
        renderPhotoGrid(sectionKey);
      });
      grid.appendChild(thumb);
    });
  }
  function renderAllPhotoGrids(){
    document.querySelectorAll('details.section[data-section]').forEach(sec=> renderPhotoGrid(sec.dataset.section));
  }

  function buildNavButtons(){
    const sections = Array.from(document.querySelectorAll('details.section'));
    sections.forEach((sec, i)=>{
      const body = sec.querySelector('.section-body');
      const wrap = document.createElement('div');
      wrap.className = 'nav-btn-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn';
      if(i < sections.length - 1){
        btn.textContent = 'Section suivante ↓';
        btn.addEventListener('click', ()=>{
          sec.open = false;
          const next = sections[i+1];
          next.open = true;
          next.scrollIntoView({behavior:'smooth', block:'start'});
        });
      }else{
        btn.textContent = 'Terminer et voir le bilan ↓';
        btn.addEventListener('click', ()=>{
          document.querySelector('.action-bar').scrollIntoView({behavior:'smooth', block:'end'});
        });
      }
      wrap.appendChild(btn);
      body.appendChild(wrap);
    });
  }

  function initAppTabbar(){
    const tabbar = document.getElementById('appTabbar');
    if(!tabbar) return;
    const tabs = Array.from(tabbar.querySelectorAll('.app-tab'));
    const sections = Array.from(document.querySelectorAll('details.section[data-section]'));

    const setActive = (key)=>{
      tabs.forEach(tab=> tab.classList.toggle('active', tab.dataset.gotoSection === key));
    };

    const goTo = (key)=>{
      const target = sections.find(sec=> sec.dataset.section === key);
      if(!target) return;
      sections.forEach(sec=>{ sec.open = sec === target; });
      setActive(key);
      target.scrollIntoView({behavior:'smooth', block:'start'});
    };

    tabs.forEach(tab=>{
      tab.addEventListener('click', ()=> goTo(tab.dataset.gotoSection));
    });

    // Comportement "application" : une seule section ouverte à la fois, et
    // l'onglet actif suit la section réellement ouverte par l'utilisateur.
    sections.forEach(sec=>{
      sec.addEventListener('toggle', ()=>{
        if(sec.open){
          sections.forEach(other=>{ if(other !== sec) other.open = false; });
          setActive(sec.dataset.section);
        }
      });
    });

    const openSection = sections.find(sec=> sec.open) || sections[0];
    if(openSection) setActive(openSection.dataset.section);
  }

  function initContext(){
    const dateField = document.querySelector('input[name="date_expertise"]');
    if(dateField && !dateField.value){
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dateField.value = now.toISOString().slice(0,16);
    }
    document.getElementById('geoBtn').addEventListener('click', ()=>{
      const geoField = document.querySelector('input[name="geoloc"]');
      if(!navigator.geolocation){ geoField.value = 'Géolocalisation non supportée'; return; }
      geoField.value = 'Localisation en cours...';
      navigator.geolocation.getCurrentPosition(
        pos=>{ geoField.value = pos.coords.latitude.toFixed(5)+', '+pos.coords.longitude.toFixed(5); saveCurrent(); },
        err=>{ geoField.value = 'Position non disponible'; }
      );
    });
  }

  function initQuickMode(){
    const btn = document.getElementById('quickModeToggle');
    if(!btn) return;
    const apply = (on)=>{
      document.body.classList.toggle('quick-mode', on);
      btn.textContent = on ? '📋 Inspection complète' : '⚡ Inspection rapide';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    apply(safeStorage.getItem(QUICK_MODE_KEY) === '1');
    btn.addEventListener('click', ()=>{
      const nowOn = !document.body.classList.contains('quick-mode');
      apply(nowOn);
      safeStorage.setItem(QUICK_MODE_KEY, nowOn ? '1' : '0');
    });
  }

  function initDarkMode(){
    const btn = document.getElementById('darkToggle');
    if(safeStorage.getItem('fev_dark') === '1'){ document.body.classList.add('dark'); btn.textContent = '☀️ Mode clair'; }
    btn.addEventListener('click', ()=>{
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      safeStorage.setItem('fev_dark', isDark ? '1' : '0');
      btn.textContent = isDark ? '☀️ Mode clair' : '🌙 Mode sombre';
      if(typeof refreshAllSignaturePads === 'function') refreshAllSignaturePads();
    });
  }
  function initFicheManagement(){
    document.getElementById('ficheSelect').addEventListener('change', (e)=>{ switchFiche(e.target.value); });
    document.getElementById('newFicheBtn').addEventListener('click', ()=>{
      const id = createFiche();
      switchFiche(id);
      refreshSelector();
    });
    document.getElementById('dupFicheBtn').addEventListener('click', ()=>{
      const id = createFiche(db[currentId]);
      db[id].titre = ficheLabel(db[currentId]) + ' (copie)';
      persist();
      switchFiche(id);
      refreshSelector();
    });
    document.getElementById('delFicheBtn').addEventListener('click', ()=>{
      if(Object.keys(db).length <= 1){ alert('Impossible de supprimer la dernière fiche restante.'); return; }
      if(!confirm('Supprimer la fiche « '+ficheLabel(db[currentId])+' » ? Cette action est irréversible après quelques secondes (annulation possible juste après).')) return;
      const deletedId = currentId;
      const deletedFiche = db[deletedId];
      const deletedLabel = ficheLabel(deletedFiche);
      delete db[currentId];
      persist();
      const nextId = Object.keys(db)[0];
      switchFiche(nextId);
      refreshSelector();
      showUndoSnackbar('Fiche « '+deletedLabel+' » supprimée.', ()=>{
        db[deletedId] = deletedFiche;
        persist();
        switchFiche(deletedId);
        refreshSelector();
      });
    });
  }

  let undoSnackbarTimer = null;
  function showUndoSnackbar(message, onUndo){
    const snackbar = document.getElementById('undoSnackbar');
    const text = document.getElementById('undoSnackbarText');
    const btn = document.getElementById('undoDeleteBtn');
    if(!snackbar) return;
    if(undoSnackbarTimer) clearTimeout(undoSnackbarTimer);
    text.textContent = message;
    snackbar.classList.add('show');
    const cleanup = ()=>{
      snackbar.classList.remove('show');
      btn.onclick = null;
    };
    btn.onclick = ()=>{
      cleanup();
      if(undoSnackbarTimer) clearTimeout(undoSnackbarTimer);
      onUndo();
    };
    undoSnackbarTimer = setTimeout(cleanup, 8000);
  }

  function initExportImport(){
    document.getElementById('exportBtn').addEventListener('click', ()=>{
      saveCurrent();
      const blob = new Blob([JSON.stringify(db[currentId], null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (ficheLabel(db[currentId]) || 'fiche').replace(/[^a-z0-9]+/gi,'_') + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById('importBtn').addEventListener('click', ()=>{
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const imported = JSON.parse(reader.result);
          const id = createFiche({data: imported.data || {}, photos: imported.photos || {}, signatures: imported.signatures || {}});
          db[id].titre = (imported.titre || 'Fiche importée');
          persist();
          switchFiche(id);
          refreshSelector();
        }catch(err){ alert('Fichier JSON invalide.'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  function initComparator(){
    document.getElementById('compareBtn').addEventListener('click', ()=>{
      saveCurrent();
      const list = document.getElementById('fichePickList');
      list.innerHTML = '';
      Object.values(db).forEach(f=>{
        const row = document.createElement('div');
        row.className = 'fiche-pick';
        row.innerHTML = '<input type="checkbox" value="'+f.id+'" id="pick_'+f.id+'"><label for="pick_'+f.id+'">'+ficheLabel(f)+'</label>';
        list.appendChild(row);
      });
      document.getElementById('compareResult').innerHTML = '';
      document.getElementById('exportCompareBtn').style.display = 'none';
      document.getElementById('compareModal').classList.add('show');
    });
    document.getElementById('closeModal').addEventListener('click', ()=>{
      document.getElementById('compareModal').classList.remove('show');
    });
    document.getElementById('runCompareBtn').addEventListener('click', ()=>{
      const ids = Array.from(document.querySelectorAll('#fichePickList input:checked')).map(el=>el.value);
      if(ids.length < 2){ alert('Sélectionnez au moins 2 fiches.'); return; }
      renderComparison(ids);
    });
  }

  function initWeightSettings(){
    const btnOpen = document.getElementById('weightSettingsBtn');
    const btnClose = document.getElementById('closeWeightModal');
    const modal = document.getElementById('weightModal');
    const inputVital = document.getElementById('weightVital');
    const inputChassis = document.getElementById('weightChassis');
    const inputEsthetique = document.getElementById('weightEsthetique');

    const syncInputs = ()=>{
      inputVital.value = categoryWeights.vital;
      inputChassis.value = categoryWeights.chassis;
      inputEsthetique.value = categoryWeights.esthetique;
    };

    btnOpen.addEventListener('click', ()=>{
      syncInputs();
      modal.classList.add('show');
    });
    btnClose.addEventListener('click', ()=>{
      modal.classList.remove('show');
    });

    const applyChange = (key, el)=>{
      const val = parseFloat(el.value);
      categoryWeights[key] = Number.isFinite(val) && val >= 0 ? val : DEFAULT_CATEGORY_WEIGHTS[key];
      saveCategoryWeights();
      updateProgress();
      checkCriticalRisk();
    };
    inputVital.addEventListener('change', ()=> applyChange('vital', inputVital));
    inputChassis.addEventListener('change', ()=> applyChange('chassis', inputChassis));
    inputEsthetique.addEventListener('change', ()=> applyChange('esthetique', inputEsthetique));

    document.getElementById('resetWeightsBtn').addEventListener('click', ()=>{
      categoryWeights = Object.assign({}, DEFAULT_CATEGORY_WEIGHTS);
      saveCategoryWeights();
      syncInputs();
      updateProgress();
      checkCriticalRisk();
    });
  }

  function scoreFor(f){
    let weightSum = 0, weightedScore = 0;
    CHECK_NAMES.forEach(name=>{
      const v = f.data[name];
      if(v){
        const w = getWeight(name);
        const val = v === 'ok' ? 1 : (v === 'moyen' ? 0.55 : 0);
        weightSum += w; weightedScore += w*val;
      }
    });
    return weightSum ? Math.round((weightedScore/weightSum)*100) : null;
  }
  function renderComparison(ids){
    const fiches = ids.map(id=>db[id]);
    let html = '<table class="compare-table"><thead><tr><th>Champ</th>';
    fiches.forEach(f=> html += '<th>'+ficheLabel(f)+'</th>');
    html += '</tr></thead><tbody>';
    const rows = [
      ['Kilométrage', f=>f.data.kilometrage || '—'],
      ['Valeur (€)', f=>f.data.valeur || '—'],
      ['Score pondéré', f=>{const s=scoreFor(f); return s===null?'—':s+'%';}],
      ['Verdict', f=>{
        const v = f.data.verdict;
        if(!v) return '—';
        const label = v==='achat'?'Achat':v==='negociation'?'Négociation':'À fuir';
        return '<span class="verdict-pill '+v+'">'+label+'</span>';
      }],
      ['Frais estimés (€)', f=>f.data.frais_estimation || '—'],
      ['Budget max (€)', f=>f.data.budget_max || '—'],
    ];
    rows.forEach(r=>{
      html += '<tr><td>'+r[0]+'</td>';
      fiches.forEach(f=> html += '<td>'+r[1](f)+'</td>');
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('compareResult').innerHTML = '<div class="compare-table-wrap">'+html+'</div>';
    const exportBtn = document.getElementById('exportCompareBtn');
    exportBtn.style.display = '';
    exportBtn.onclick = ()=> exportComparisonCSV(ids, rows);
  }

  function csvEscape(val){
    const s = String(val).replace(/<[^>]*>/g, '');
    if(/[",\n;]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }
  function exportComparisonCSV(ids, rows){
    const fiches = ids.map(id=>db[id]);
    const lines = [];
    lines.push(['Champ', ...fiches.map(f=>csvEscape(ficheLabel(f)))].join(';'));
    rows.forEach(r=>{
      lines.push([csvEscape(r[0]), ...fiches.map(f=>csvEscape(r[1](f)))].join(';'));
    });
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparatif_fiches.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function categoryScores(){
    const buckets = { vital:{sum:0,w:0,done:0,total:0}, chassis:{sum:0,w:0,done:0,total:0}, esthetique:{sum:0,w:0,done:0,total:0} };
    CHECK_NAMES.forEach(name=>{
      const cat = CATEGORY_OF[name] || 'esthetique';
      const w = getWeight(name);
      buckets[cat].total++;
      const checked = document.querySelector('input[name="'+name+'"]:checked');
      if(checked){
        buckets[cat].done++;
        const val = checked.value === 'ok' ? 1 : (checked.value === 'moyen' ? 0.55 : 0);
        buckets[cat].w += w;
        buckets[cat].sum += w*val;
      }
    });
    return ['vital','chassis','esthetique'].map(cat=>({
      weight:cat,
      weightValue: categoryWeights[cat],
      label: WEIGHT_CATEGORY_LABELS[cat],
      pct: buckets[cat].w ? Math.round((buckets[cat].sum/buckets[cat].w)*100) : null,
      done: buckets[cat].done,
      total: buckets[cat].total
    }));
  }

  const SECTION_TITLES = {
    info:"Informations du véhicule", moteur:"Compartiment moteur", chassis:"Châssis, suspension & roues",
    carrosserie:"Carrosserie & éclairage", habitacle:"Habitacle & équipements", essai:"Essai routier", diagnostic:"Diagnostic électronique"
  };

  function buildPrintSynthesis(){
    const d = db[currentId].data;
    const verdict = d.verdict;
    const verdictLabel = verdict==='achat'?'ACHAT':verdict==='negociation'?'NÉGOCIATION':verdict==='fuir'?'À FUIR':'NON DÉFINI';
    const issues = [];
    document.querySelectorAll('.check-item').forEach(item=>{
      const checked = item.querySelector('input[type="radio"]:checked');
      if(checked && checked.value !== 'ok'){
        const label = item.querySelector('.label-block .t').textContent;
        const badgeText = item.querySelector('label[for="'+checked.id+'"]').textContent;
        const fieldName = checked.name;
        const cat = CATEGORY_OF[fieldName] || 'esthetique';
        const w = getWeight(fieldName);
        issues.push({label:label, badge:badgeText, weight:w, cat:cat});
      }
    });
    issues.sort((a,b)=> b.weight - a.weight);

    const triggeredCritical = CRITICAL_RULES.filter(rule => rule.test(d));

    let html = '<h1>Fiche d\u2019Expertise — '+[d.marque,d.modele,d.annee].filter(Boolean).join(' ')+'</h1>';
    html += '<p>Kilométrage : '+(d.kilometrage||'—')+' km · Valeur : '+(d.valeur||'—')+' € · Date : '+(d.date_expertise||'—')+'</p>';
    html += '<div class="ps-verdict '+(verdict||'')+'">Décision : '+verdictLabel+'</div>';

    if(triggeredCritical.length){
      triggeredCritical.forEach(rule=>{
        html += '<div class="ps-critical">⚠ '+rule.message.replace(/<\/?strong>/g,'')+'</div>';
      });
    }

    html += '<table><tr><th>Score pondéré global</th><td>'+(scoreFor(db[currentId]) ?? '—')+'%</td></tr>';
    html += '<tr><th>Frais estimés</th><td>'+(d.frais_estimation||'—')+' €</td></tr>';
    html += '<tr><th>Budget max</th><td>'+(d.budget_max||'—')+' €</td></tr>';
    html += '<tr><th>Marge de négociation</th><td>'+(d.marge_negociation||'—')+'</td></tr></table>';

    html += '<h3>Détail du score par catégorie de gravité</h3>';
    html += '<table class="ps-cat-table"><tr><th>Catégorie (coefficient)</th><th>Sous-score</th><th>Points contrôlés</th></tr>';
    categoryScores().forEach(c=>{
      html += '<tr><td>'+c.label+' (×'+c.weightValue+')</td><td>'+(c.pct===null?'—':c.pct+'%')+'</td><td>'+c.done+' / '+c.total+'</td></tr>';
    });
    html += '</table>';

    html += '<h3>Points à surveiller / défauts relevés (triés par gravité)</h3>';
    html += issues.length ? ('<ul class="ps-issues">'+issues.map(i=>'<li>'+i.label+' — '+i.badge+' <span class="ps-w ps-w-'+i.cat+'">×'+i.weight+'</span></li>').join('')+'</ul>') : '<p>Aucun défaut ou point moyen relevé.</p>';
    html += '<h3>Synthèse</h3><p>'+(d.synthese_finale || '—')+'</p>';

    const sigs = (db[currentId].signatures) || {};
    const sigNamesPresent = SIGNATURE_NAMES.filter(n=> sigs[n]);
    if(sigNamesPresent.length){
      html += '<div class="ps-signatures"><h3>Signatures</h3><div class="ps-signatures-row">';
      sigNamesPresent.forEach(n=>{
        html += '<div class="ps-signature-item"><img src="'+sigs[n]+'" alt="'+SIGNATURE_LABELS[n]+'"><div class="ps-sig-label">'+SIGNATURE_LABELS[n]+'</div></div>';
      });
      html += '</div></div>';
    }

    const photos = db[currentId].photos || {};
    const photoSections = Object.keys(photos).filter(key => photos[key] && photos[key].length);
    if(photoSections.length){
      html += '<div class="ps-photos-section"><h3>Photos de l\u2019inspection</h3>';
      photoSections.forEach(key=>{
        const title = SECTION_TITLES[key] || key;
        html += '<div class="ps-photos-cat">'+title+' ('+photos[key].length+')</div>';
        html += '<div class="ps-photo-grid">';
        photos[key].forEach(p=>{
          html += '<img src="'+p.dataUrl+'" alt="'+(p.name||'photo')+'">';
        });
        html += '</div>';
      });
      html += '</div>';
    }

    document.getElementById('printSynthesis').innerHTML = html;
  }

  /* ---------- VALIDATION CHAMPS OBLIGATOIRES ---------- */
  const REQUIRED_FIELDS = [
    { key:'marque', label:'Marque', type:'vehicle-select', el:()=>marqueSel, wrapId:'step-marque' },
    { key:'modele', label:'Modèle', type:'vehicle-model', wrapId:'step-modele' },
    { key:'annee', label:'Année', type:'vehicle-select', el:()=>anneeSel, wrapId:'step-annee' },
    { key:'kilometrage', label:'Kilométrage', type:'text', el:()=>document.querySelector('input[name="kilometrage"]'), wrapId:'fieldWrap-kilometrage' },
    { key:'valeur', label:'Valeur affichée / négociée', type:'text', el:()=>document.querySelector('input[name="valeur"]'), wrapId:'fieldWrap-valeur' }
  ];

  function isFieldFilled(spec){
    if(spec.type === 'vehicle-model'){
      const val = (modeleSel && modeleSel.value) ? modeleSel.value : '';
      if(!val || val === '__autre__') {
        const manual = document.getElementById('modeleManualInput').value.trim();
        return !!manual;
      }
      return true;
    }
    const el = spec.el();
    if(!el) return false;
    return String(el.value || '').trim() !== '';
  }

  function validateRequiredFields(){
    const missing = [];
    REQUIRED_FIELDS.forEach(spec=>{
      const filled = isFieldFilled(spec);
      const wrap = document.getElementById(spec.wrapId);
      if(wrap){
        wrap.classList.toggle('field-invalid', !filled);
        wrap.classList.toggle('step-invalid', !filled && wrap.classList.contains('vstep'));
      }
      if(!filled) missing.push(spec.label);
    });

    const banner = document.getElementById('missingFieldsBanner');
    const genBtn = document.getElementById('generateBtn');
    if(missing.length){
      banner.classList.add('show');
      banner.textContent = '⚠ Champs obligatoires manquants : ' + missing.join(', ') + '.';
      genBtn.disabled = true;
    }else{
      banner.classList.remove('show');
      banner.textContent = '';
      genBtn.disabled = false;
    }
    return missing;
  }

  function scrollToFirstMissing(){
    for(const spec of REQUIRED_FIELDS){
      if(!isFieldFilled(spec)){
        const wrap = document.getElementById(spec.wrapId);
        if(wrap){
          const section = wrap.closest('details.section');
          if(section) section.open = true;
          wrap.scrollIntoView({behavior:'smooth', block:'center'});
        }
        break;
      }
    }
  }

  function printFallback(btn, originalText){
    buildPrintSynthesis();
    const summaryOnly = document.getElementById('printSummaryToggle').checked;

    if(summaryOnly){
      document.body.classList.add('print-summary-mode');
    }else{
      document.body.classList.remove('print-summary-mode');
      document.querySelectorAll('details.section').forEach(d=>d.open = true);
    }

    let cleaned = false;
    const cleanup = ()=>{
      if(cleaned) return;
      cleaned = true;
      document.body.classList.remove('print-summary-mode');
      window.removeEventListener('afterprint', cleanup);
      btn.disabled = false;
      btn.textContent = originalText;
      validateRequiredFields();
    };
    window.addEventListener('afterprint', cleanup);
    btn.disabled = true;
    btn.textContent = '⏳ Préparation...';

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        try{
          window.print();
        }catch(err){
          console.error('Erreur lors de l\u2019impression :', err);
          alert('Impossible d\u2019ouvrir la boîte de dialogue d\u2019impression sur cet appareil/navigateur. Essayez "Partager > Imprimer" depuis le menu du navigateur.');
        }
        setTimeout(cleanup, 2000);
      });
    });
  }

  function initActionBar(){
    document.getElementById('resetBtn').addEventListener('click', async ()=>{
      if(confirm('Réinitialiser cette fiche (données et photos) ? Cette action est irréversible.')){
        db[currentId].data = {};
        db[currentId].photos = {};
        db[currentId].signatures = {};
        persist();
        applyToForm({});
        await restoreVehicleSelects({});
        renderAllPhotoGrids();
        refreshAllSignaturePads();
        updateProgress();
        updateBudget();
        checkCriticalRisk();
        validateRequiredFields();
      }
    });
    document.getElementById('generateBtn').addEventListener('click', async ()=>{
      saveCurrent();
      const missing = validateRequiredFields();
      if(missing.length){
        scrollToFirstMissing();
        return;
      }

      const btn = document.getElementById('generateBtn');
      const originalText = btn.textContent;

      if(typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined'){
        printFallback(btn, originalText);
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ Génération du PDF...';

      try{
        buildPrintSynthesis();

        const src = document.getElementById('printSynthesis');
        const clone = src.cloneNode(true);
        clone.style.cssText = 'display:block; position:fixed; left:-99999px; top:0; width:794px; background:#fff; color:#000; padding:24px; font-family:Inter,sans-serif;';
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, { scale:2, backgroundColor:'#ffffff', useCORS:true });
        document.body.removeChild(clone);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p','mm','a4');
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        let heightLeft = imgH;
        let position = 0;
        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while(heightLeft > 0){
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }

        const d = db[currentId].data;
        const filename = ([d.marque, d.modele, d.annee].filter(Boolean).join('_') || 'fiche_expertise').replace(/[^a-z0-9_]+/gi,'_') + '.pdf';

        let shared = false;
        try{
          const blob = pdf.output('blob');
          const file = new File([blob], filename, {type:'application/pdf'});
          if(navigator.canShare && navigator.canShare({files:[file]})){
            await navigator.share({files:[file], title: filename});
            shared = true;
          }
        }catch(shareErr){
          shared = false;
        }
        if(!shared){
          pdf.save(filename);
        }
      }catch(err){
        console.error('Erreur lors de la génération du PDF :', err);
        alert('La génération du PDF a échoué sur cet appareil/navigateur. Nouvelle tentative avec l\u2019impression du navigateur...');
        printFallback(btn, originalText);
        return;
      }finally{
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  /* ---------- SIGNATURES (acheteur / vendeur) ---------- */
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

  function getFicheSignature(name){
    const sigs = (db[currentId] && db[currentId].signatures) || {};
    return sigs[name] || null;
  }
  function setFicheSignature(name, dataUrl){
    if(!db[currentId]) return;
    db[currentId].signatures = db[currentId].signatures || {};
    if(dataUrl){ db[currentId].signatures[name] = dataUrl; }
    else{ delete db[currentId].signatures[name]; }
    persist();
  }

  function getSignatureStrokeColor(){
    const c = getComputedStyle(document.body).getPropertyValue('--ink');
    return (c && c.trim()) || '#0A1830';
  }

  function redrawSignature(name){
    const st = signaturePadState[name];
    if(!st) return;
    const rect = st.wrap.getBoundingClientRect();
    if(rect.width < 5 || rect.height < 5) return;
    const dataUrl = getFicheSignature(name);
    st.ctx.clearRect(0,0, rect.width, rect.height);
    if(dataUrl){
      const img = new Image();
      img.onload = ()=>{
        if(getFicheSignature(name) !== dataUrl) return;
        const r2 = st.wrap.getBoundingClientRect();
        st.ctx.clearRect(0,0, r2.width, r2.height);
        st.ctx.drawImage(img, 0, 0, r2.width, r2.height);
      };
      img.src = dataUrl;
      st.placeholder.style.display = 'none';
    }else{
      st.placeholder.style.display = '';
    }
  }

  function sizeCanvasToWrap(name){
    const st = signaturePadState[name];
    if(!st) return;
    const rect = st.wrap.getBoundingClientRect();
    if(rect.width < 5 || rect.height < 5) return;
    const dpr = window.devicePixelRatio || 1;
    const newW = Math.max(1, Math.round(rect.width * dpr));
    const newH = Math.max(1, Math.round(rect.height * dpr));
    if(st.canvas.width === newW && st.canvas.height === newH) return;
    st.canvas.width = newW;
    st.canvas.height = newH;
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawSignature(name);
  }

  function attachSignatureDrawing(name){
    const st = signaturePadState[name];
    let drawing = false, lastX = 0, lastY = 0;

    function clientPointToLocal(clientX, clientY){
      const rect = st.wrap.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function beginStroke(clientX, clientY){
      drawing = true;
      st.placeholder.style.display = 'none';
      const p = clientPointToLocal(clientX, clientY);
      lastX = p.x; lastY = p.y;
    }
    function continueStroke(clientX, clientY){
      if(!drawing) return;
      const p = clientPointToLocal(clientX, clientY);
      st.ctx.strokeStyle = getSignatureStrokeColor();
      st.ctx.lineWidth = 2.2;
      st.ctx.lineCap = 'round';
      st.ctx.lineJoin = 'round';
      st.ctx.beginPath();
      st.ctx.moveTo(lastX, lastY);
      st.ctx.lineTo(p.x, p.y);
      st.ctx.stroke();
      lastX = p.x; lastY = p.y;
    }
    function endStroke(){
      if(!drawing) return;
      drawing = false;
      try{
        const dataUrl = st.canvas.toDataURL('image/png');
        setFicheSignature(name, dataUrl);
      }catch(err){ console.error('Erreur de capture de signature :', err); }
    }

    st.canvas.style.touchAction = 'none';

    if(window.PointerEvent){
      st.canvas.addEventListener('pointerdown', (e)=>{
        if(e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        beginStroke(e.clientX, e.clientY);
        if(st.canvas.setPointerCapture){ try{ st.canvas.setPointerCapture(e.pointerId); }catch(err){} }
      });
      st.canvas.addEventListener('pointermove', (e)=>{ if(drawing){ e.preventDefault(); continueStroke(e.clientX, e.clientY); } });
      window.addEventListener('pointerup', endStroke);
      window.addEventListener('pointercancel', endStroke);
    }else{
      st.canvas.addEventListener('mousedown', (e)=>{ if(e.button !== 0) return; e.preventDefault(); beginStroke(e.clientX, e.clientY); });
      st.canvas.addEventListener('mousemove', (e)=>{ if(drawing){ e.preventDefault(); continueStroke(e.clientX, e.clientY); } });
      window.addEventListener('mouseup', endStroke);

      st.canvas.addEventListener('touchstart', (e)=>{ const t = e.touches[0]; if(t){ e.preventDefault(); beginStroke(t.clientX, t.clientY); } }, {passive:false});
      st.canvas.addEventListener('touchmove', (e)=>{ const t = e.touches[0]; if(t && drawing){ e.preventDefault(); continueStroke(t.clientX, t.clientY); } }, {passive:false});
      window.addEventListener('touchend', endStroke);
      window.addEventListener('touchcancel', endStroke);
    }
  }

  function initSignatureClearButtons(){
    document.querySelectorAll('[data-sig-clear]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-sig-clear');
        const st = signaturePadState[name];
        if(!st) return;
        const rect = st.wrap.getBoundingClientRect();
        st.ctx.clearRect(0,0, rect.width, rect.height);
        setFicheSignature(name, null);
        st.placeholder.style.display = '';
      });
    });
  }

  function initSignaturePads(){
    SIGNATURE_NAMES.forEach(name=>{
      const canvas = document.getElementById('sigCanvas'+capitalize(name));
      const wrap = document.getElementById('sigWrap'+capitalize(name));
      const placeholder = document.getElementById('sigPlaceholder'+capitalize(name));
      if(!canvas || !wrap || !placeholder) return;
      const ctx = canvas.getContext('2d');
      signaturePadState[name] = { canvas, wrap, placeholder, ctx };
      attachSignatureDrawing(name);
      if(window.ResizeObserver){
        const ro = new ResizeObserver(()=> sizeCanvasToWrap(name));
        ro.observe(wrap);
        signaturePadState[name].ro = ro;
      }else{
        sizeCanvasToWrap(name);
      }
    });
    window.addEventListener('resize', ()=> refreshAllSignaturePads());
    document.querySelectorAll('details.section').forEach(d=>{
      d.addEventListener('toggle', ()=> refreshAllSignaturePads());
    });
    initSignatureClearButtons();
  }

  function refreshAllSignaturePads(){
    SIGNATURE_NAMES.forEach(name=>{
      sizeCanvasToWrap(name);
      redrawSignature(name);
    });
  }

  function renderPotentialIssues(){
    const container = document.getElementById('vehicleIssues');
    const summary = document.getElementById('vehicleIssuesSummary');
    const list = document.getElementById('vehicleIssuesList');
    const hiddenField = document.querySelector('input[name="motorisation_points_faibles"]');
    if(!container || !summary || !list) return;
    const key = [marqueSel?.value, modeleSel?.value, generationSel?.value, motorisationSel?.value].join('|');
    const issues = ISSUE_DB[key] || [];
    list.replaceChildren();
    if(hiddenField) hiddenField.value = issues.length ? JSON.stringify(issues) : '';
    if(!issues.length){ container.hidden = true; return; }
    issues.forEach(issue => {
      const item = document.createElement('li');
      const details = typeof issue === 'object' && issue ? issue : {};
      [['Panne', details.panne || details.probleme || details.description || issue], ['Symptomes', details.symptomes], ['Pieces concernees', details.pieces_concernees || details.piece_concernee], ['Kilometrage critique', details.kilometrage_critique || details.kilometrage_apparition], ['Cout estime', details.cout_estime_eur || details.cout_reparation_estime]].forEach(([label, value]) => {
        const row = document.createElement('div'); const heading = document.createElement('strong'); const content = document.createElement('span');
        heading.textContent = label + ' : '; content.textContent = value ? (Array.isArray(value) ? value.join(', ') : String(value)) : 'Non renseigne';
        row.append(heading, content); item.appendChild(row);
      });
      list.appendChild(item);
    });
    summary.textContent = issues.length + ' point' + (issues.length > 1 ? 's' : '') + ' documente' + (issues.length > 1 ? 's' : '') + ' pour cette motorisation. A confirmer lors de l’inspection.';
    container.hidden = false;
  }

  /* ---------- SELECTION VEHICULE (MARQUE / MODELE / GENERATION-CHASSIS / ANNEE / MOTORISATION) ---------- */
  let marqueSel, modeleSel, generationSel, anneeSel, motorisationSel;
  let marqueSearchEl, modeleSearchEl;
  let ALL_MARQUES = [];
  let ALL_MODELES = [];
  let ALL_MODEL_PAIRS = [];
  let modeleSearchResults = [];
  let modeleSearchActiveIndex = -1;

  function updateStepBadges(){
    const st = (el, isDone, isActive)=>{
      el.classList.remove('active','done');
      if(isDone) el.classList.add('done');
      else if(isActive) el.classList.add('active');
    };
    st(document.getElementById('num-marque'), !!marqueSel.value, !marqueSel.value);
    st(document.getElementById('num-modele'), !!modeleSel.value, !!marqueSel.value && !modeleSel.value);
    st(document.getElementById('num-generation'), !!generationSel.value, !!modeleSel.value && !generationSel.value);
    st(document.getElementById('num-annee'), !!anneeSel.value, !anneeSel.value);
    st(document.getElementById('num-motorisation'), !!motorisationSel.value, !!generationSel.value && !motorisationSel.value);
    validateRequiredFields();
  }

  function renderMarqueOptions(list){
    const kept = marqueSel.value;
    marqueSel.innerHTML = '<option value="">Choisissez une marque...</option>';
    list.forEach(marque=>{
      const opt = document.createElement('option');
      opt.value = marque; opt.textContent = marque;
      marqueSel.appendChild(opt);
    });
    const autre = document.createElement('option');
    autre.value = '__autre_marque__';
    autre.textContent = '✏️ Autre / non listée (saisie libre)';
    marqueSel.appendChild(autre);
    if(kept && marqueSel.querySelector('option[value="'+cssEscape(kept)+'"]')) marqueSel.value = kept;
  }

  function buildAllModelPairs(){
    const pairs = [];
    Object.keys(vehicleIndex).forEach(marque=>{
      Object.keys(vehicleIndex[marque]).forEach(modele=>{
        pairs.push({marque, modele});
      });
    });
    pairs.sort((a,b)=> a.modele.localeCompare(b.modele, 'fr'));
    return pairs;
  }

  function renderModeleSearchResults(query){
    const box = document.getElementById('modeleSearchResults');
    if(!box) return;
    const q = query.trim().toLocaleLowerCase('fr-FR');
    modeleSearchActiveIndex = -1;
    if(!q){
      box.classList.remove('show');
      box.innerHTML = '';
      modeleSearchResults = [];
      return;
    }
    const matches = ALL_MODEL_PAIRS.filter(p=>
      p.modele.toLocaleLowerCase('fr-FR').includes(q) || p.marque.toLocaleLowerCase('fr-FR').includes(q)
    ).slice(0, 25);
    modeleSearchResults = matches;
    if(!matches.length){
      box.innerHTML = '<div class="vsearch-no-results">Aucun modèle trouvé pour « '+query+' »</div>';
      box.classList.add('show');
      return;
    }
    box.innerHTML = matches.map((p,i)=>
      '<div class="vsearch-result-item" data-idx="'+i+'" role="option">'+
        '<span class="vr-modele">'+p.modele+'</span><span class="vr-marque">'+p.marque+'</span>'+
      '</div>'
    ).join('');
    box.classList.add('show');
    box.querySelectorAll('.vsearch-result-item').forEach(el=>{
      el.addEventListener('mousedown', (e)=>{
        e.preventDefault();
        const idx = parseInt(el.getAttribute('data-idx'),10);
        selectModeleSearchResult(idx);
      });
    });
  }

  function selectModeleSearchResult(idx){
    const pick = modeleSearchResults[idx];
    if(!pick) return;
    if(marqueSearchEl) marqueSearchEl.value = '';
    renderMarqueOptions(ALL_MARQUES);
    marqueSel.value = pick.marque;
    loadModeles(pick.marque, pick.modele);
    loadGenerations(pick.marque, pick.modele, '');
    modeleSearchEl.value = '';
    const box = document.getElementById('modeleSearchResults');
    if(box){ box.classList.remove('show'); box.innerHTML = ''; }
    saveCurrent();
    updateStepBadges();
    if(modeleSel) modeleSel.focus();
  }

  function resetVehicleSearchFields(){
    if(marqueSearchEl) marqueSearchEl.value = '';
    if(modeleSearchEl) modeleSearchEl.value = '';
    const box = document.getElementById('modeleSearchResults');
    if(box){ box.classList.remove('show'); box.innerHTML = ''; }
  }

  function loadMarques(){
    ALL_MARQUES = Object.keys(vehicleIndex).sort((a,b)=>a.localeCompare(b));
    renderMarqueOptions(ALL_MARQUES);
  }

  function loadModeles(marque, preselect){
    if(!marque || marque === '__autre_marque__'){
      modeleSel.innerHTML = '<option value="">Choisissez d\u2019abord une marque</option>';
      modeleSel.disabled = true;
      ALL_MODELES = [];
      hideManualModele();
      loadGenerations(null, null, '');
      updateStepBadges();
      return;
    }
    modeleSel.disabled = false;
    modeleSel.innerHTML = '<option value="">Choisissez un modèle...</option>';
    const modeles = Object.keys(vehicleIndex[marque] || {}).sort((a,b)=>a.localeCompare(b));
    ALL_MODELES = modeles;
    modeles.forEach(modele=>{
      const opt = document.createElement('option');
      opt.value = modele; opt.textContent = modele;
      modeleSel.appendChild(opt);
    });
    addManualOption(modeles.length === 0);
    hideManualModele();
    if(preselect){
      modeleSel.value = preselect;
      if(modeleSel.value !== preselect) setManualModele(preselect);
    }
    updateStepBadges();
  }

  function loadGenerations(marque, modele, preselect){
    if(!marque || !modele || modele === '__autre__' || !vehicleIndex[marque] || !vehicleIndex[marque][modele]){
      generationSel.innerHTML = '<option value="">Choisissez d\u2019abord un modèle</option>';
      generationSel.disabled = true;
      document.getElementById('anneeHint').textContent = '';
      updateAnneeOptions(null, '');
      loadMotorisations(null, null, null, '');
      updateStepBadges();
      return;
    }
    generationSel.disabled = false;
    generationSel.innerHTML = '<option value="">Choisissez une génération / châssis...</option>';
    vehicleIndex[marque][modele].forEach(entry=>{
      const opt = document.createElement('option');
      opt.value = entry.chassis;
      opt.textContent = entry.chassis + ' — ' + entry.annees;
      opt.dataset.annees = entry.annees;
      generationSel.appendChild(opt);
    });
    if(preselect){
      generationSel.value = preselect;
    }
    updateAnneeHint();
    updateStepBadges();
  }

  function parseAnneeRange(annees){
    if(!annees) return null;
    const parts = annees.split('-').map(s=>s.trim());
    const startY = parseInt(parts[0], 10);
    if(isNaN(startY)) return null;
    let endY;
    if(!parts[1] || /présent/i.test(parts[1])){
      endY = new Date().getFullYear();
    }else{
      endY = parseInt(parts[1], 10);
      if(isNaN(endY)) endY = new Date().getFullYear();
    }
    return {min:startY, max:endY};
  }

  function updateAnneeOptions(annees, preselectAnnee){
    const range = parseAnneeRange(annees);
    const keepValue = preselectAnnee !== undefined ? preselectAnnee : anneeSel.value;
    const min = range ? range.min : 1970;
    const max = range ? range.max : new Date().getFullYear();
    anneeSel.innerHTML = '<option value="">Choisissez une année...</option>';
    for(let y = max; y >= min; y--){
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      anneeSel.appendChild(opt);
    }
    if(keepValue && anneeSel.querySelector('option[value="'+keepValue+'"]')){
      anneeSel.value = keepValue;
    }else{
      anneeSel.value = '';
    }
  }

  function updateAnneeHint(preselectAnnee){
    const opt = generationSel.options[generationSel.selectedIndex];
    const hint = document.getElementById('anneeHint');
    const annees = (opt && opt.dataset) ? opt.dataset.annees : null;
    if(annees){
      hint.textContent = 'Période de production : ' + annees + ' — liste des années limitée à cette plage.';
    }else{
      hint.textContent = '';
    }
    updateAnneeOptions(annees, preselectAnnee);
  }

  const GENERIC_MOTORISATIONS = [
    {label:"Essence — petite cylindrée (~70-100ch)", carburant:"Essence"},
    {label:"Essence — cylindrée moyenne (~100-150ch)", carburant:"Essence"},
    {label:"Essence — turbo / sportive (150ch+)", carburant:"Essence"},
    {label:"Diesel — entrée de gamme (~75-100ch)", carburant:"Diesel"},
    {label:"Diesel — cylindrée moyenne (~110-150ch)", carburant:"Diesel"},
    {label:"Diesel — puissant (150ch+)", carburant:"Diesel"},
    {label:"Hybride", carburant:"Hybride"},
    {label:"Électrique", carburant:"Électrique"}
  ];

  function loadMotorisations(marque, modele, chassis, preselect){
    hideManualMotorisation();
    if(!marque || !modele || !chassis || chassis === '__autre__'){
      motorisationSel.innerHTML = '<option value="">Choisissez d\u2019abord une génération</option>';
      motorisationSel.disabled = true;
      document.getElementById('motorisationHint').textContent = '';
      renderPotentialIssues();
      updateStepBadges();
      return;
    }
    motorisationSel.disabled = false;
    const key = marque + '|' + modele + '|' + chassis;
    const documented = motorIndex[key];
    motorisationSel.innerHTML = '<option value="">Choisissez une motorisation...</option>';
    const hint = document.getElementById('motorisationHint');
    if(documented && documented.length){
      documented.forEach(m=>{
        const opt = document.createElement('option');
        const txt = m.label + (m.code && m.code !== '-' ? ' — code ' + m.code : '');
        opt.value = txt; opt.textContent = txt;
        motorisationSel.appendChild(opt);
      });
      hint.textContent = 'Codes moteur documentés pour cette génération. Vérifiez toujours sur la carte grise (champ P3) avant commande.';
    }else{
      GENERIC_MOTORISATIONS.forEach(m=>{
        const opt = document.createElement('option');
        opt.value = m.label; opt.textContent = m.label;
        motorisationSel.appendChild(opt);
      });
      hint.textContent = 'Code moteur non documenté pour ce modèle dans notre base : indiquez-le manuellement si connu (carte grise champ P3, ou inscrit sur le bloc moteur).';
    }
    const autre = document.createElement('option');
    autre.value = '__autre_motor__';
    autre.textContent = '✏️ Autre / code moteur précis (saisie libre)';
    motorisationSel.appendChild(autre);
    if(preselect){
      motorisationSel.value = preselect;
      if(motorisationSel.value !== preselect) setManualMotorisation(preselect);
    }
    renderPotentialIssues();
    updateStepBadges();
  }
  function setManualMotorisation(value){
    let opt = motorisationSel.querySelector('option[value="__custom_motor__"]');
    if(!opt){ opt = document.createElement('option'); opt.value = '__custom_motor__'; motorisationSel.appendChild(opt); }
    opt.value = value; opt.textContent = value;
    motorisationSel.value = value;
    document.getElementById('motorisationManualInput').value = value;
    document.getElementById('motorisationManualWrap').style.display = '';
  }
  function hideManualMotorisation(){
    document.getElementById('motorisationManualWrap').style.display = 'none';
  }

  function addManualOption(noResults){
    const opt = document.createElement('option');
    opt.value = '__autre__';
    opt.textContent = noResults ? 'Aucun modèle trouvé — saisir manuellement' : '✏️ Autre / non trouvé (saisie libre)';
    modeleSel.appendChild(opt);
  }
  function setManualModele(value){
    let opt = modeleSel.querySelector('option[value="__custom__"]');
    if(!opt){ opt = document.createElement('option'); opt.value = '__custom__'; modeleSel.appendChild(opt); }
    opt.value = value; opt.textContent = value;
    modeleSel.value = value;
    document.getElementById('modeleManualInput').value = value;
    document.getElementById('modeleManualWrap').style.display = '';
  }
  function hideManualModele(){
    document.getElementById('modeleManualWrap').style.display = 'none';
    document.getElementById('modeleManualInput').value = '';
  }

  function initYears(){
    updateAnneeOptions(null, '');
  }

  function restoreVehicleSelects(data){
    data = data || {};
    resetVehicleSearchFields();
    if(marqueSel.querySelector('option[value="'+cssEscape(data.marque||'')+'"]')){
      marqueSel.value = data.marque || '';
    }else{
      marqueSel.value = '';
    }
    if(marqueSel.value){
      loadModeles(marqueSel.value, data.modele || '');
      loadGenerations(marqueSel.value, data.modele || '', data.generation || '');
      updateAnneeHint(data.annee || '');
      loadMotorisations(marqueSel.value, data.modele || '', data.generation || '', data.motorisation || '');
    }else{
      modeleSel.innerHTML = '<option value="">Choisissez d\u2019abord une marque</option>';
      modeleSel.disabled = true;
      hideManualModele();
      loadGenerations(null, null, '');
      updateAnneeOptions(null, data.annee || '');
      loadMotorisations(null, null, null, '');
    }
    updateStepBadges();
  }

  function initVehicleSearch(){
    marqueSearchEl = document.getElementById('marqueSearch');
    modeleSearchEl = document.getElementById('modeleSearch');
    const marqueClearBtn = document.getElementById('marqueSearchClear');
    const modeleClearBtn = document.getElementById('modeleSearchClear');

    ALL_MODEL_PAIRS = buildAllModelPairs();

    if(marqueSearchEl){
      marqueSearchEl.addEventListener('input', function(){
        const q = this.value.trim().toLocaleLowerCase('fr-FR');
        renderMarqueOptions(q ? ALL_MARQUES.filter(m=> m.toLocaleLowerCase('fr-FR').includes(q)) : ALL_MARQUES);
        updateStepBadges();
      });
    }
    if(marqueClearBtn){
      marqueClearBtn.addEventListener('click', function(){
        marqueSearchEl.value = '';
        renderMarqueOptions(ALL_MARQUES);
        marqueSearchEl.focus();
        updateStepBadges();
      });
    }

    if(modeleSearchEl){
      modeleSearchEl.addEventListener('input', function(){
        renderModeleSearchResults(this.value);
      });
      modeleSearchEl.addEventListener('focus', function(){
        if(this.value.trim()) renderModeleSearchResults(this.value);
      });
      modeleSearchEl.addEventListener('blur', function(){
        setTimeout(()=>{
          const box = document.getElementById('modeleSearchResults');
          if(box) box.classList.remove('show');
        }, 150);
      });
      modeleSearchEl.addEventListener('keydown', function(e){
        const box = document.getElementById('modeleSearchResults');
        if(!box) return;
        const items = box.querySelectorAll('.vsearch-result-item');
        if(!items.length) return;
        if(e.key === 'ArrowDown'){
          e.preventDefault();
          modeleSearchActiveIndex = Math.min(modeleSearchActiveIndex+1, items.length-1);
          items.forEach((it,i)=> it.classList.toggle('active', i===modeleSearchActiveIndex));
          items[modeleSearchActiveIndex].scrollIntoView({block:'nearest'});
        }else if(e.key === 'ArrowUp'){
          e.preventDefault();
          modeleSearchActiveIndex = Math.max(modeleSearchActiveIndex-1, 0);
          items.forEach((it,i)=> it.classList.toggle('active', i===modeleSearchActiveIndex));
          items[modeleSearchActiveIndex].scrollIntoView({block:'nearest'});
        }else if(e.key === 'Enter'){
          e.preventDefault();
          if(modeleSearchActiveIndex >= 0) selectModeleSearchResult(modeleSearchActiveIndex);
          else if(items.length === 1) selectModeleSearchResult(0);
        }else if(e.key === 'Escape'){
          box.classList.remove('show');
        }
      });
    }
    if(modeleClearBtn){
      modeleClearBtn.addEventListener('click', function(){
        modeleSearchEl.value = '';
        const box = document.getElementById('modeleSearchResults');
        if(box){ box.classList.remove('show'); box.innerHTML = ''; }
        modeleSearchEl.focus();
      });
    }
  }

  function initCarDropdowns(){
    marqueSel = document.getElementById('marqueSelect');
    modeleSel = document.getElementById('modeleSelect');
    generationSel = document.getElementById('generationSelect');
    anneeSel = document.getElementById('anneeSelect');
    motorisationSel = document.getElementById('motorisationSelect');

    initYears();
    loadMarques();
    initVehicleSearch();

    marqueSel.addEventListener('change', function(){
      if(marqueSearchEl) marqueSearchEl.value = '';
      loadModeles(this.value, '');
      loadGenerations(null, null, '');
      saveCurrent();
      updateStepBadges();
    });
    modeleSel.addEventListener('change', function(){
      if(this.value === '__autre__'){
        document.getElementById('modeleManualWrap').style.display = '';
        document.getElementById('modeleManualInput').value = '';
        document.getElementById('modeleManualInput').focus();
        loadGenerations(null, null, '');
      }else{
        document.getElementById('modeleManualWrap').style.display = 'none';
        loadGenerations(marqueSel.value, this.value, '');
      }
      saveCurrent();
      updateStepBadges();
    });
    document.getElementById('modeleManualInput').addEventListener('input', function(){
      setManualModele(this.value);
      saveCurrent();
      updateStepBadges();
    });
    generationSel.addEventListener('change', function(){
      updateAnneeHint();
      loadMotorisations(marqueSel.value, modeleSel.value, this.value, '');
      saveCurrent();
      updateStepBadges();
    });
    motorisationSel.addEventListener('change', function(){
      if(this.value === '__autre_motor__'){
        document.getElementById('motorisationManualWrap').style.display = '';
        document.getElementById('motorisationManualInput').value = '';
        document.getElementById('motorisationManualInput').focus();
      }else{
        document.getElementById('motorisationManualWrap').style.display = 'none';
      }
      renderPotentialIssues();
      saveCurrent();
      updateStepBadges();
    });
    document.getElementById('motorisationManualInput').addEventListener('input', function(){
      setManualMotorisation(this.value);
      renderPotentialIssues();
      saveCurrent();
      updateStepBadges();
    });
    anneeSel.addEventListener('change', updateStepBadges);

    restoreVehicleSelects(db[currentId].data);
  }

  document.addEventListener('change', (e)=>{
    if(e.target.closest('main')){ saveCurrent(); updateProgress(); updateBudget(); checkCriticalRisk(); validateRequiredFields(); }
  });
  document.addEventListener('input', (e)=>{
    if(e.target.closest('main') && (e.target.type==='text' || e.target.type==='number' || e.target.tagName==='TEXTAREA')){
      saveCurrent(); updateBudget(); validateRequiredFields();
    }
  });

  // Site-wide: keeps a live --ab-h CSS var equal to the action bar's real
  // height. Any fixed-position element (mini-dash, snackbar, ...) can then
  // position itself with calc(var(--ab-h) + gap) instead of a guessed pixel
  // offset that breaks when the bar's content changes height (missing-fields
  // banner, label wrapping, safe-area inset on notched phones, etc.).
  function trackActionBarHeight(){
    const actionBar = document.querySelector('.action-bar');
    if(!actionBar) return;
    const setBarHeightVar = ()=>{
      document.documentElement.style.setProperty('--ab-h', actionBar.getBoundingClientRect().height + 'px');
    };
    setBarHeightVar();
    if(window.ResizeObserver){
      new ResizeObserver(setBarHeightVar).observe(actionBar);
    }else{
      window.addEventListener('resize', setBarHeightVar);
    }
  }

  const miniDashEl = document.getElementById('miniDash');
  let miniDashSuppressed = false;
  if(miniDashEl){
    const goToBilan = ()=>{
      const diagSection = document.querySelector('details.section[data-section="diagnostic"]');
      if(diagSection){
        diagSection.open = true;
        diagSection.scrollIntoView({behavior:'smooth', block:'start'});
      }
    };
    miniDashEl.addEventListener('click', goToBilan);
    miniDashEl.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); goToBilan(); }
    });

    // The floating pill duplicates the score/verdict already shown in full
    // inside the "Bilan" section, so hide it once that section is actually
    // open and on screen — avoids redundant clutter on small viewports.
    const diagSectionEl = document.querySelector('details.section[data-section="diagnostic"]');
    if(diagSectionEl){
      const refreshSuppression = ()=>{
        const prev = miniDashSuppressed;
        if(!diagSectionEl.open){
          miniDashSuppressed = false;
        }else{
          const rect = diagSectionEl.getBoundingClientRect();
          miniDashSuppressed = rect.top < window.innerHeight * 0.6 && rect.bottom > 0;
        }
        if(miniDashSuppressed !== prev) updateProgress();
      };
      diagSectionEl.addEventListener('toggle', refreshSuppression);
      let scrollTicking = false;
      window.addEventListener('scroll', ()=>{
        if(scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(()=>{ refreshSuppression(); scrollTicking = false; });
      }, {passive:true});
    }
  }

  loadCategoryWeights();
  loadDb();
  buildPhotoBlocks();
  buildNavButtons();
  initAppTabbar();
  applyToForm(db[currentId].data);
  initCarDropdowns();
  renderAllPhotoGrids();
  initSignaturePads();
  refreshSelector();
  initContext();
  initQuickMode();
  initDarkMode();
  initFicheManagement();
  initExportImport();
  initComparator();
  initWeightSettings();
  initActionBar();
  trackActionBarHeight();
  updateProgress();
  updateBudget();
  checkCriticalRisk();
  validateRequiredFields();
  updateStorageMeter();
  refreshAllSignaturePads();
}
