const OWNER_HELP = Object.freeze({
  culasse: {
    fr: 'En clair : ce joint sépare l’huile, le liquide de refroidissement et les cylindres. Une mayonnaise sous le bouchon ou des bulles persistantes peuvent signaler un mélange anormal à faire contrôler.',
    en: 'In simple terms: this seal keeps oil, coolant and the cylinders apart. Creamy residue under the cap or persistent bubbles may indicate abnormal mixing that needs professional checks.',
  },
  p1000: {
    fr: 'En clair : ce code indique que les contrôles automatiques du véhicule ne sont pas encore terminés, souvent après un effacement des défauts ou une batterie débranchée. Il ne prouve pas une panne à lui seul.',
    en: 'In simple terms: this code means the vehicle has not completed its automatic self-checks, often after faults were cleared or the battery was disconnected. It does not prove a fault by itself.',
  },
  supports: {
    fr: 'En clair : les supports maintiennent le moteur et absorbent ses vibrations. Des secousses inhabituelles au ralenti ou lors du passage d’un rapport peuvent révéler leur usure.',
    en: 'In simple terms: engine mounts hold the engine and absorb vibration. Unusual shaking at idle or when selecting a gear may indicate wear.',
  },
  rotules: {
    fr: 'En clair : les rotules et triangles guident les roues. Un jeu important peut dégrader la tenue de route et user les pneus ; ne passez pas sous un véhicule mal sécurisé.',
    en: 'In simple terms: ball joints and control arms guide the wheels. Excessive play can affect handling and tyre wear; never work beneath an unsecured vehicle.',
  },
  codes_ecm: {
    fr: 'En clair : saisissez ici les codes moteur lus avec une valise OBD, par exemple P0300. « Aucun » signifie qu’aucun code moteur n’a été relevé.',
    en: 'In simple terms: enter engine fault codes read with an OBD scanner, such as P0300. “None” means no engine code was found.',
  },
  codes_abs: {
    fr: 'En clair : ces codes concernent l’antiblocage des roues et parfois l’antipatinage. Un voyant ABS allumé mérite un diagnostic, même si le freinage normal semble fonctionner.',
    en: 'In simple terms: these codes concern anti-lock braking and sometimes traction control. An ABS warning light needs diagnosis even if normal braking seems to work.',
  },
});

function language() {
  return window.cardiagI18n?.language === 'en' ? 'en' : 'fr';
}

function helpTarget(name) {
  const control = document.querySelector(`[name="${name}"]`);
  if (!control) return null;
  const checkItem = control.closest('.check-item');
  if (checkItem) return { parent: checkItem.querySelector('.label-block'), after: checkItem.querySelector('.label-block .d') };
  const field = control.closest('.field');
  return field ? { parent: field, after: field.querySelector('label') } : null;
}

function render() {
  document.querySelectorAll('[data-owner-technical-help]').forEach((node) => node.remove());
  const ownerActive = document.body.dataset.usageScenario === 'owner'
    && document.body.dataset.scenarioConfirmed === 'true';
  if (!ownerActive) return;

  Object.entries(OWNER_HELP).forEach(([name, copy]) => {
    const target = helpTarget(name);
    if (!target?.parent) return;
    const help = document.createElement('p');
    help.className = 'owner-technical-help';
    help.dataset.ownerTechnicalHelp = name;
    help.textContent = copy[language()];
    if (target.after) target.after.insertAdjacentElement('afterend', help);
    else target.parent.append(help);
  });
}

export function initializeOwnerTechnicalHelp() {
  render();
  window.addEventListener('cardiag:scenario-change', render);
  window.addEventListener('cardiag:language-change', render);
  document.querySelectorAll('[name="usage_scenario"]').forEach((input) => input.addEventListener('change', () => queueMicrotask(render)));
  return { render };
}
