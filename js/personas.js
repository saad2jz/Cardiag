export const PERSONAS = Object.freeze(['buyer', 'mechanic', 'rental', 'seller', 'owner']);

export const PERSONA_CONFIG = Object.freeze({
  buyer: {
    weights: { vital: 7, chassis: 4, esthetique: 1 },
    quickChecks: ['huile','ldr','fuites','bruits','fumee','culasse','pneus','freinage','stabilite','longerons','p1000','q_historique'],
    report: { title: 'Rapport de contrôle avant achat', titleEn: 'Pre-purchase inspection report', financeTitle: 'Budget, risques & négociation', financeTitleEn: 'Budget, risks & negotiation', signatureLabels: ['Acheteur', 'Vendeur'], signatureLabelsEn: ['Buyer', 'Seller'] },
  },
  mechanic: {
    weights: { vital: 7, chassis: 5, esthetique: 2 },
    quickChecks: ['huile','ldr','fuites','bruits','ralenti','culasse','supports','accel','vitesses','freinage','p1000','q_historique'],
    report: { title: 'Ordre de réparation & contrôle atelier', titleEn: 'Repair order & workshop inspection', financeTitle: 'Intervention, pièces & main-d’œuvre', financeTitleEn: 'Repair, parts & labour', signatureLabels: ['Client', 'Atelier'], signatureLabelsEn: ['Customer', 'Workshop'] },
  },
  rental: {
    weights: { vital: 5, chassis: 6, esthetique: 5 },
    quickChecks: ['fuites','pneus','jantes','panneaux','peinture','feux_av','feux_ar','sieges','vitres','humidite','freinage','p1000'],
    report: { title: 'État des lieux contradictoire de location', titleEn: 'Rental check-out & return report', financeTitle: 'Écarts, remise en état & responsabilité', financeTitleEn: 'Differences, repairs & liability', signatureLabels: ['Agence', 'Locataire'], signatureLabelsEn: ['Agency', 'Renter'] },
  },
  seller: {
    weights: { vital: 5, chassis: 4, esthetique: 3 },
    quickChecks: ['huile','fuites','bruits','fumee','pneus','freinage','panneaux','peinture','sieges','clim','p1000','q_historique'],
    report: { title: 'Dossier de transparence avant vente', titleEn: 'Pre-sale transparency report', financeTitle: 'Valeur, défauts & marge de négociation', financeTitleEn: 'Value, faults & negotiation margin', signatureLabels: ['Vendeur', 'Acheteur'], signatureLabelsEn: ['Seller', 'Buyer'] },
  },
  owner: {
    weights: { vital: 7, chassis: 5, esthetique: 1 },
    quickChecks: ['huile','ldr','fuites','bruits','fumee','ralenti','pneus','amortos','freinage','stabilite','p1000','q_historique'],
    report: { title: 'Carnet de santé & entretien préventif', titleEn: 'Vehicle health & preventive maintenance log', financeTitle: 'Entretien, sécurité & travaux à prévoir', financeTitleEn: 'Maintenance, safety & upcoming work', signatureLabels: ['Propriétaire', 'Intervenant'], signatureLabelsEn: ['Owner', 'Technician'] },
  },
});

export const PERSONA_CONTEXT_FIELDS = Object.freeze({
  buyer: ['annonce_url','seller_claims'],
  mechanic: ['work_order_reference','intake_mileage','client_complaint','mechanic_intake_condition','symptom_conditions','measured_values','work_authorization','repair_work_completed','post_repair_checks','mechanic_release_condition','release_mileage','mechanic_doc_carte_grise','mechanic_doc_order','mechanic_doc_authorization'],
  rental: ['fleet_vehicle_id','rental_contract_reference','renter_reference','rental_start','rental_end','rental_mileage_out','rental_mileage_in','rental_energy_out','rental_energy_in','rental_condition_out','rental_condition_in','rental_damage_delta','rental_doc_contract','rental_doc_driver','rental_doc_condition'],
  seller: ['maintenance_history','recent_repairs','known_defects','report_documents'],
  owner: ['owner_symptoms','symptom_history','maintenance_log','diy_level','owner_doc_carte_grise','owner_doc_ct','owner_doc_factures'],
});

const ALL_CONTEXT_FIELDS = new Set(Object.values(PERSONA_CONTEXT_FIELDS).flat());

export function normalizePersona(value) {
  return PERSONAS.includes(value) ? value : 'buyer';
}

export function personaWeights(persona) {
  return { ...PERSONA_CONFIG[normalizePersona(persona)].weights };
}

export function personaQuickChecks(persona) {
  return [...PERSONA_CONFIG[normalizePersona(persona)].quickChecks];
}

export function personaReport(persona) {
  return { ...PERSONA_CONFIG[normalizePersona(persona)].report };
}

export function personaRequiresVin(persona) {
  return ['mechanic', 'rental'].includes(normalizePersona(persona));
}

export function sanitizePersonaData(data = {}, persona = data.usage_scenario) {
  const active = normalizePersona(persona);
  const allowed = new Set(PERSONA_CONTEXT_FIELDS[active]);
  return Object.fromEntries(Object.entries({ ...data, usage_scenario: active })
    .filter(([key]) => !ALL_CONTEXT_FIELDS.has(key) || allowed.has(key)));
}

export function calculatePersonaScore(points = [], persona = 'buyer', customWeights = null) {
  const weights = { ...personaWeights(persona), ...(customWeights || {}) };
  let maximum = 0;
  let obtained = 0;
  let done = 0;
  points.forEach((point) => {
    if (!['ok', 'moyen', 'defaut'].includes(point.status)) return;
    const weight = Number(weights[point.category]) || 0;
    maximum += weight;
    obtained += weight * (point.status === 'ok' ? 1 : point.status === 'moyen' ? 0.55 : 0);
    done += 1;
  });
  return { score: maximum ? Math.round((obtained / maximum) * 100) : null, done, maximum };
}
