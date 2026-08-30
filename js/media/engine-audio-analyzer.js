/**
 * Engine Acoustic Analyzer & Audio Diagnostic Recorder.
 *
 * Records 5-10 seconds of engine sound at idle or revving, computes
 * real-time frequency spectrum via Web Audio API AnalyserNode,
 * and bridges directly to the CarDiag Expert AI Assistant with audio characteristics.
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

// An acoustic sample is meaningful only while checking engine noise or idle
// stability. Keeping this explicit prevents a microphone action from leaking
// into unrelated inspection controls.
const AUDIO_SUPPORTED_TESTS = {
  bruits: {
    label: ['Analyser le bruit moteur', 'Analyze engine noise'],
    description: [
      'Enregistrez le moteur au ralenti ou à 2500 tr/min pour préciser un cliquetis, un sifflement ou un cognement.',
      'Record the engine at idle or 2500 RPM to clarify ticking, whistling, or knocking.',
    ],
  },
  ralenti: {
    label: ['Analyser le ralenti moteur', 'Analyze engine idle'],
    description: [
      'Enregistrez le moteur au ralenti pour documenter une instabilité, des vibrations ou un bruit associé.',
      'Record the engine at idle to document instability, vibration, or related noise.',
    ],
  },
};

export class EngineAudioAnalyzerModal {
  static open(testKey = 'bruits') {
    const modal = new EngineAudioAnalyzerModal(testKey);
    modal.render();
  }

  constructor(testKey) {
    this.testKey = AUDIO_SUPPORTED_TESTS[testKey] ? testKey : 'bruits';
    this.audioCtx = null;
    this.analyser = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.audioBlob = null;
    this.audioUrl = null;
    this.peakFrequency = 0;
  }

  render() {
    const test = AUDIO_SUPPORTED_TESTS[this.testKey];
    const overlay = document.createElement('div');
    overlay.className = 'audio-analyzer-overlay';
    overlay.innerHTML = `
      <div class="audio-analyzer-modal">
        <div class="audio-analyzer-header">
          <div class="audio-analyzer-title-wrap">
            <span class="panel-kicker">ACOUSTIQUE MOTEUR</span>
            <strong>${translate('Analyseur de Bruit Moteur par IA', 'AI Engine Acoustic Analyzer')}</strong>
          </div>
          <button type="button" class="btn-close-modal" id="btnAudioClose">✕</button>
        </div>

        <p class="audio-analyzer-desc">${translate(...test.description)}</p>

        <div class="audio-visualizer-wrap">
          <canvas id="audioVisualizerCanvas" width="500" height="120"></canvas>
          <div class="audio-record-status" id="audioRecordStatus">${translate('Prêt à enregistrer', 'Ready to record')}</div>
        </div>

        <div class="audio-analyzer-controls">
          <button type="button" class="btn-audio-record" id="btnAudioRecord">
            🎙️ ${translate('Démarrer l’enregistrement (8s)', 'Start recording (8s)')}
          </button>
          <button type="button" class="btn-audio-analyze" id="btnAudioAnalyze" disabled>
            🤖 ${translate('Soumettre à l’IA Expert', 'Submit to Expert AI')}
          </button>
        </div>

        <div class="audio-preview-wrap" id="audioPreviewWrap" hidden>
          <audio id="audioPlayback" controls style="width:100%; margin-top:8px;"></audio>
        </div>
      </div>
    `;

    document.body.append(overlay);

    const canvas = overlay.querySelector('#audioVisualizerCanvas');
    const statusText = overlay.querySelector('#audioRecordStatus');
    const recordBtn = overlay.querySelector('#btnAudioRecord');
    const analyzeBtn = overlay.querySelector('#btnAudioAnalyze');
    const previewWrap = overlay.querySelector('#audioPreviewWrap');
    const audioPlayback = overlay.querySelector('#audioPlayback');
    const closeBtn = overlay.querySelector('#btnAudioClose');

    const drawVisualizer = () => {
      if (!this.analyser) return;
      const ctx = canvas.getContext('2d');
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        if (!this.isRecording) return;
        requestAnimationFrame(renderFrame);

        this.analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        let maxVal = 0;
        let maxIdx = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height;

          if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
            maxIdx = i;
          }

          const r = Math.min(255, barHeight + 50);
          const g = Math.max(0, 255 - barHeight);
          const b = 150;

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }

        const nyquist = (this.audioCtx?.sampleRate || 44100) / 2;
        this.peakFrequency = Math.round((maxIdx / bufferLength) * nyquist);
      };

      renderFrame();
    };

    recordBtn.addEventListener('click', async () => {
      if (this.isRecording) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioCtx.createMediaStreamSource(stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
          this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioUrl = URL.createObjectURL(this.audioBlob);
          audioPlayback.src = this.audioUrl;
          previewWrap.hidden = false;
          analyzeBtn.disabled = false;
          recordBtn.disabled = false;
          recordBtn.innerHTML = `🔄 ${translate('Réenregistrer', 'Record again')}`;
          statusText.textContent = translate(
            `Enregistrement terminé · Fréquence dominante : ${this.peakFrequency} Hz`,
            `Recording finished · Peak frequency: ${this.peakFrequency} Hz`,
          );
        };

        this.isRecording = true;
        this.mediaRecorder.start();
        drawVisualizer();

        recordBtn.disabled = true;
        let countdown = 8;
        statusText.textContent = translate(`Enregistrement en cours (${countdown}s)…`, `Recording in progress (${countdown}s)…`);

        const timer = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            statusText.textContent = translate(`Enregistrement en cours (${countdown}s)…`, `Recording in progress (${countdown}s)…`);
          } else {
            clearInterval(timer);
            this.isRecording = false;
            this.mediaRecorder.stop();
            this.mediaStream.getTracks().forEach((t) => t.stop());
          }
        }, 1000);
      } catch (err) {
        console.error('[Audio] Record error:', err);
        statusText.textContent = translate('Erreur d’accès au microphone.', 'Microphone access error.');
      }
    });

    analyzeBtn.addEventListener('click', () => {
      const freq = this.peakFrequency;
      const prompt = translate(
        `J'ai enregistré un extrait audio du moteur. Fréquence acoustique dominante relevée : ${freq} Hz. Quels sont les bruits suspects caractéristiques à ce régime (cliquetis poussoirs, claquement coussinets de bielle, sifflement de turbo ou galet tendeur) ?`,
        `I recorded an engine audio sample. Peak acoustic frequency detected: ${freq} Hz. What suspicious noises are typical at this frequency (lifter tick, rod knock, turbo whistle, or belt tensioner bearing)?`,
      );

      overlay.remove();
      window.dispatchEvent(new CustomEvent('cardiag:inline-help', {
        detail: { text: prompt },
      }));
    });

    closeBtn.addEventListener('click', () => {
      if (this.mediaStream) this.mediaStream.getTracks().forEach((t) => t.stop());
      if (this.audioCtx) this.audioCtx.close();
      overlay.remove();
    });
  }
}

export function initializeEngineAudioAnalyzer() {
  document.getElementById('engineAudioAnalyzerWrap')?.remove();

  Object.entries(AUDIO_SUPPORTED_TESTS).forEach(([testKey, test]) => {
    const check = document.querySelector(`.check-item input[name="${testKey}"]`)?.closest('.check-item');
    const labelBlock = check?.querySelector('.label-block');
    if (!labelBlock || labelBlock.querySelector('[data-engine-audio-test]')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'btn-open-audio-analyzer';
    trigger.dataset.engineAudioTest = testKey;
    trigger.textContent = translate(...test.label);
    trigger.addEventListener('click', () => {
      EngineAudioAnalyzerModal.open(testKey);
    });
    labelBlock.append(trigger);
  });
}
