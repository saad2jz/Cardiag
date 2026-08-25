// HEIC/HEIF cannot be decoded consistently by the browser canvas used by the
// offline compressor. Refuse it explicitly instead of failing after selection.
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 18 * 1024 * 1024;

function dataUrlToFile(dataUrl, name = `photo-${Date.now()}.jpg`) {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: mime });
}

function validFiles(files) {
  return [...files].filter((file) => ACCEPTED_TYPES.has(file.type) && file.size <= MAX_FILE_BYTES);
}

async function addFiles(files, targetKey = 'diagnostic') {
  const accepted = validFiles(files);
  if (!accepted.length) {
    const hasHeic = [...files].some((file) => ['image/heic', 'image/heif'].includes(file.type));
    window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'error', message: hasHeic ? 'Le format HEIC doit être converti en JPEG avant ajout.' : 'Photo refusée : JPEG, PNG ou WebP, 18 Mo maximum.' } }));
    return;
  }
  await window.cardiagMediaBridge?.addFiles?.(targetKey, accepted);
  window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'success', message: `${accepted.length} photo${accepted.length > 1 ? 's' : ''} ajoutée${accepted.length > 1 ? 's' : ''}` } }));
}

function buildMediaDock() {
  const dock = document.createElement('section');
  dock.className = 'media-dock';
  dock.dataset.noSwipe = '';
  dock.innerHTML = `
    <div class="media-dock-actions">
      <button type="button" data-media-camera><span>＋</span> Photo</button>
      <button type="button" data-media-gallery>Galerie</button>
      <input type="file" accept="image/*" multiple data-media-input hidden>
    </div>
    <p>Glissez des photos ici ou utilisez l’appareil photo.</p>
    <div class="media-dock-thumbs" data-media-thumbs aria-label="Photos du dossier"></div>`;
  document.getElementById('diagnosticVehicleReadout')?.after(dock);
  return dock;
}

function renderThumbnails(container, photos) {
  container.replaceChildren(...photos.slice(-8).map((photo) => {
    const image = document.createElement('img');
    image.src = photo.dataUrl;
    image.alt = photo.name || 'Photo du véhicule';
    image.loading = 'lazy';
    return image;
  }));
  container.closest('.media-dock')?.classList.toggle('has-media', photos.length > 0);
}

function appendMediaBubble(photos) {
  if (!photos.length) return;
  const messages = document.getElementById('chatMessages');
  const bubble = document.createElement('article');
  bubble.className = 'chat-message chat-message-user media-chat-bubble';
  bubble.setAttribute('aria-label', 'Photos ajoutées au diagnostic');
  photos.slice(-4).forEach((photo) => {
    const image = document.createElement('img');
    image.src = photo.dataUrl;
    image.alt = photo.name || 'Photo';
    bubble.append(image);
  });
  messages?.append(bubble);
  if (messages) messages.scrollTop = messages.scrollHeight;
}

export function initializeMediaManager() {
  const dock = buildMediaDock();
  const input = dock.querySelector('[data-media-input]');
  const thumbs = dock.querySelector('[data-media-thumbs]');
  let previousCount = 0;
  const refresh = (photos = window.cardiagMediaBridge?.getPhotos?.() || []) => {
    renderThumbnails(thumbs, photos);
    if (photos.length > previousCount) appendMediaBubble(photos.slice(previousCount));
    previousCount = photos.length;
  };

  dock.querySelector('[data-media-gallery]').addEventListener('click', () => input.click());
  async function capturePhoto(targetKey = 'diagnostic') {
    const camera = window.Capacitor?.Plugins?.Camera;
    if (!camera) {
      return false;
    }
    try {
      if (window.cardiagPermissions && !await window.cardiagPermissions.camera()) return true;
      const result = await camera.getPhoto({ quality: 72, width: 1280, height: 1280, resultType: 'dataUrl', source: 'CAMERA', correctOrientation: true });
      if (result.dataUrl) await addFiles([dataUrlToFile(result.dataUrl)], targetKey);
      return true;
    } catch (error) {
      if (!String(error?.message || '').toLowerCase().includes('cancel')) {
        window.dispatchEvent(new CustomEvent('cardiag:wizard-feedback', { detail: { type: 'error', message: 'Appareil photo indisponible' } }));
      }
      return true;
    }
  }
  window.cardiagCapturePhoto = capturePhoto;
  dock.querySelector('[data-media-camera]').addEventListener('click', async () => {
    if (await capturePhoto('diagnostic')) return;
    input.removeAttribute('multiple');
    input.setAttribute('capture', 'environment');
    input.click();
  });
  input.addEventListener('change', async () => {
    await addFiles(input.files || []);
    input.value = '';
    input.removeAttribute('capture');
    input.setAttribute('multiple', '');
  });

  const console = document.querySelector('.diagnostic-console');
  ['dragenter', 'dragover'].forEach((name) => console?.addEventListener(name, (event) => {
    event.preventDefault();
    console.classList.add('is-dragging-media');
  }));
  ['dragleave', 'drop'].forEach((name) => console?.addEventListener(name, (event) => {
    event.preventDefault();
    console.classList.remove('is-dragging-media');
  }));
  console?.addEventListener('drop', (event) => addFiles(event.dataTransfer?.files || []));
  window.addEventListener('cardiag:media-change', (event) => refresh(event.detail?.photos || []));
  window.addEventListener('cardiag:scenario-change', () => refresh());
  refresh();
}
