/**
 * Hands-free Speech Dictation for Inspection Textareas.
 *
 * Adds microphone buttons to all inspection notes fields to allow voice dictation
 * during hands-on inspection (dirty hands, mechanic gloves, etc.).
 *
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 */

function language() {
  return window.cardiagI18n?.language === 'en' ? 'en-US' : 'fr-FR';
}

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

let activeRecognition = null;
let activeBtn = null;

export function initializeSpeechDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = Boolean(SpeechRecognition);

  const textareas = document.querySelectorAll('textarea[name^="notes_"], textarea[name="synthese_finale"], textarea[name="notes_diagnostic"]');

  textareas.forEach((textarea) => {
    // Avoid double injection
    if (textarea.dataset.dictationInit) return;
    textarea.dataset.dictationInit = 'true';

    const parent = textarea.parentElement;
    if (!parent) return;

    // Create mic button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'speech-dictation-btn';
    btn.title = translate('Dicter vos observations à la voix', 'Dictate observations by voice');
    btn.setAttribute('aria-label', translate('Activer la dictée vocale', 'Start voice dictation'));
    btn.innerHTML = '<span class="speech-mic-icon">🎙️</span><span class="speech-pulse-ring"></span>';

    // Position mic button
    parent.style.position = 'relative';
    parent.append(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isSupported) {
        window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
          detail: {
            type: 'info',
            message: translate(
              'La dictée vocale n\'est pas supportée par ce navigateur.',
              'Voice dictation is not supported by this browser.',
            ),
          },
        }));
        return;
      }

      if (activeBtn === btn && activeRecognition) {
        stopDictation();
        return;
      }

      if (activeRecognition) {
        stopDictation();
      }

      startDictation(textarea, btn, SpeechRecognition);
    });
  });
}

function startDictation(textarea, btn, SpeechRecognition) {
  try {
    const recognition = new SpeechRecognition();
    recognition.lang = language();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      activeRecognition = recognition;
      activeBtn = btn;
      btn.classList.add('is-listening');
      btn.title = translate('Arrêter la dictée vocale', 'Stop voice dictation');

      window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
        detail: {
          type: 'info',
          message: translate('Dictée vocale active — parlez…', 'Voice dictation active — speak now…'),
        },
      }));
    };

    let startValue = textarea.value ? `${textarea.value.trim()} ` : '';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        textarea.value = `${startValue}${finalTranscript.trim()}`;
        startValue = `${textarea.value} `;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Dictation] Error:', event.error);
      stopDictation();
      if (event.error !== 'no-speech') {
        window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', {
          detail: {
            type: 'error',
            message: translate(`Erreur micro : ${event.error}`, `Microphone error: ${event.error}`),
          },
        }));
      }
    };

    recognition.onend = () => {
      stopDictation();
    };

    recognition.start();
  } catch (err) {
    console.error('[Dictation] Start error:', err);
    stopDictation();
  }
}

function stopDictation() {
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch { /* ignore */ }
    activeRecognition = null;
  }
  if (activeBtn) {
    activeBtn.classList.remove('is-listening');
    activeBtn.title = translate('Dicter vos observations à la voix', 'Dictate observations by voice');
    activeBtn = null;
  }
}
