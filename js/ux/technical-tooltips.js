/**
 * Small, local-only help popovers for technical vocabulary. They deliberately
 * do not call the assistant or any external service so they also work offline.
 */
export function initializeTechnicalTooltips() {
  const glossary = [
    ['Joint de culasse', 'Le joint de culasse assure l’étanchéité entre le moteur et son circuit de refroidissement. Une fuite peut mélanger l’huile et le liquide de refroidissement ou provoquer une surchauffe.'],
    ['Test de braquage', 'Le braquage consiste à tourner le volant au maximum à droite puis à gauche. Des claquements peuvent indiquer l’usure d’un cardan ou d’un élément de direction.'],
    ['Code P1000', 'P1000 signifie que les autotests du calculateur ne sont pas terminés après un effacement de mémoire. Il faut rouler puis refaire un diagnostic avant de conclure.'],
  ];
  glossary.forEach(([term, definition]) => {
    [...document.querySelectorAll('.label-block .t, .alert-box strong')]
      .filter((label) => label.textContent.includes(term) && !label.querySelector('[data-technical-tooltip]'))
      .forEach((label) => {
        const wrap = document.createElement('span');
        wrap.className = 'technical-tooltip-wrap';
        wrap.innerHTML = `<button type="button" class="technical-tooltip" data-technical-tooltip="${definition}" aria-label="Explication : ${term}">?</button>`;
        label.append(' ', wrap);
      });
  });
  const buttons = [...document.querySelectorAll('[data-technical-tooltip]')];
  if (!buttons.length) return;
  const close = (except = null) => buttons.forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    button.parentElement?.querySelector('.technical-tooltip-popover')?.setAttribute('hidden', '');
  });
  buttons.forEach((button, index) => {
    const text = button.dataset.technicalTooltip;
    if (!text) return;
    const popover = document.createElement('span');
    const id = `technical-tooltip-${index + 1}`;
    popover.id = id;
    popover.className = 'technical-tooltip-popover';
    popover.setAttribute('role', 'tooltip');
    popover.hidden = true;
    popover.textContent = text;
    button.after(popover);
    button.setAttribute('aria-describedby', id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const open = button.getAttribute('aria-expanded') !== 'true';
      close(button);
      button.setAttribute('aria-expanded', String(open));
      popover.hidden = !open;
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { close(); button.focus(); }
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.technical-tooltip-wrap')) close();
  });
}
