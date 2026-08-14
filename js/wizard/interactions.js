const GESTURE_MIN_X = 76;
const GESTURE_MAX_Y = 58;
const INTERACTIVE_SELECTOR = 'button,input,textarea,select,a,label,.chat-messages,.report-content,[data-no-swipe]';

function haptics() {
  return window.Capacitor?.Plugins?.Haptics;
}

async function tactileFeedback(type) {
  const api = haptics();
  if (!api) return;
  try {
    if (type === 'error') await api.notification({ type: 'ERROR' });
    else if (type === 'success') await api.notification({ type: 'SUCCESS' });
    else await api.impact({ style: 'LIGHT' });
  } catch { /* Le web et les appareils non compatibles restent silencieux. */ }
}

function createFeedbackSurface() {
  const surface = document.createElement('div');
  surface.className = 'wizard-feedback';
  surface.id = 'wizardFeedback';
  surface.setAttribute('role', 'status');
  surface.setAttribute('aria-live', 'polite');
  document.body.append(surface);
  return surface;
}

export function initializeWizardInteractions() {
  const root = document.getElementById('wizardRoot');
  if (!root) return;
  const feedback = createFeedbackSurface();
  let feedbackTimer;
  let startX = 0;
  let startY = 0;
  let gestureEnabled = false;

  window.addEventListener('cardiag:wizard-feedback', ({ detail = {} }) => {
    window.clearTimeout(feedbackTimer);
    feedback.dataset.type = detail.type || 'selection';
    feedback.textContent = detail.message || '';
    feedback.classList.add('is-visible');
    tactileFeedback(detail.type);
    feedbackTimer = window.setTimeout(() => feedback.classList.remove('is-visible'), 1800);
  });

  window.addEventListener('cardiag:wizard-step', ({ detail = {} }) => {
    root.dataset.motion = detail.direction || 'forward';
    root.classList.add('is-transitioning');
    window.setTimeout(() => root.classList.remove('is-transitioning'), 260);
  });

  root.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    gestureEnabled = event.touches.length === 1 && !event.target.closest(INTERACTIVE_SELECTOR);
    if (!gestureEnabled) return;
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  root.addEventListener('touchend', (event) => {
    if (!gestureEnabled || !window.cardiagWizard) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < GESTURE_MIN_X || Math.abs(deltaY) > GESTURE_MAX_Y) return;
    tactileFeedback('selection');
    if (deltaX > 0) window.cardiagWizard.back();
    else if (window.cardiagWizard.currentStep < 4) window.cardiagWizard.next();
  }, { passive: true });

  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('button,.usage-scenario-card,.chat-suggestion-chip');
    if (target) target.classList.add('is-pressed');
  });
  document.addEventListener('pointerup', () => {
    document.querySelectorAll('.is-pressed').forEach((element) => element.classList.remove('is-pressed'));
  });
}
