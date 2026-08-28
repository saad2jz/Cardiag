/**
 * Rapid Photo Annotator for Vehicle Inspection Proofs.
 *
 * Provides an interactive modal canvas to mark defects directly onto inspection photos:
 *  - Red alert circles
 *  - Directional arrows
 *  - Damage badges ("Rayure", "Choc", "Fuite", "Corrosion")
 *  - Freehand drawing & highlight
 */

function translate(fr, en) {
  return window.cardiagI18n?.language === 'en' ? en : fr;
}

export class PhotoAnnotatorModal {
  /**
   * Open the annotation editor for an image data URL or File.
   * @param {string|File|Blob} imageSource
   * @returns {Promise<string>} annotated image as dataURL (JPEG/WebP)
   */
  static open(imageSource) {
    return new Promise((resolve) => {
      const modal = new PhotoAnnotatorModal(imageSource, resolve);
      modal.render();
    });
  }

  constructor(imageSource, onSave) {
    this.imageSource = imageSource;
    this.onSave = onSave;
    this.currentTool = 'circle'; // 'circle', 'arrow', 'freehand', 'tag'
    this.currentTag = 'Rayure';
    this.currentColor = '#ef4444';
    this.history = [];
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
  }

  async render() {
    // Convert source to image element
    const img = new Image();
    if (typeof this.imageSource === 'string') {
      img.src = this.imageSource;
    } else {
      img.src = URL.createObjectURL(this.imageSource);
    }
    await new Promise((r) => { img.onload = r; });

    const overlay = document.createElement('div');
    overlay.className = 'photo-annotator-overlay';
    overlay.innerHTML = `
      <div class="photo-annotator-modal">
        <div class="annotator-header">
          <span class="panel-kicker">${translate('ÉDITEUR DE PREUVE VISUELLE', 'VISUAL PROOF EDITOR')}</span>
          <div class="annotator-actions">
            <button type="button" class="annotator-btn-undo" id="btnAnnotatorUndo" title="${translate('Annuler', 'Undo')}">↩️</button>
            <button type="button" class="annotator-btn-cancel" id="btnAnnotatorCancel">${translate('Annuler', 'Cancel')}</button>
            <button type="button" class="annotator-btn-save" id="btnAnnotatorSave">✅ ${translate('Enregistrer', 'Save')}</button>
          </div>
        </div>

        <div class="annotator-toolbar">
          <div class="annotator-tool-group">
            <button type="button" class="annotator-tool-btn is-active" data-tool="circle" title="${translate('Cercle rouge', 'Alert circle')}">⭕ ${translate('Cercle', 'Circle')}</button>
            <button type="button" class="annotator-tool-btn" data-tool="arrow" title="${translate('Flèche indicatrice', 'Pointer arrow')}">↗️ ${translate('Flèche', 'Arrow')}</button>
            <button type="button" class="annotator-tool-btn" data-tool="freehand" title="${translate('Tracé libre', 'Freehand pen')}">✏️ ${translate('Tracé', 'Pen')}</button>
          </div>
          <div class="annotator-tag-group">
            <button type="button" class="annotator-tag-btn is-active" data-tag="Rayure">⚠️ Rayure</button>
            <button type="button" class="annotator-tag-btn" data-tag="Choc">💥 Choc</button>
            <button type="button" class="annotator-tag-btn" data-tag="Fuite">💧 Fuite</button>
            <button type="button" class="annotator-tag-btn" data-tag="Corrosion">🛑 Corrosion</button>
          </div>
        </div>

        <div class="annotator-canvas-wrap">
          <canvas id="annotatorCanvas"></canvas>
        </div>
      </div>
    `;

    document.body.append(overlay);

    const canvas = overlay.querySelector('#annotatorCanvas');
    const ctx = canvas.getContext('2d');

    // Scale canvas to image dimensions while fitting viewport
    const maxW = Math.min(window.innerWidth * 0.9, 900);
    const maxH = Math.min(window.innerHeight * 0.65, 600);
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.width = `${img.naturalWidth * scale}px`;
    canvas.style.height = `${img.naturalHeight * scale}px`;

    const redraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      this.history.forEach((item) => {
        ctx.strokeStyle = item.color || '#ef4444';
        ctx.fillStyle = item.color || '#ef4444';
        ctx.lineWidth = Math.max(4, canvas.width / 150);

        if (item.type === 'circle') {
          ctx.beginPath();
          const r = Math.hypot(item.x2 - item.x1, item.y2 - item.y1) / 2;
          const cx = (item.x1 + item.x2) / 2;
          const cy = (item.y1 + item.y2) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.type === 'arrow') {
          const headlen = 24;
          const dx = item.x2 - item.x1;
          const dy = item.y2 - item.y1;
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(item.x2, item.y2);
          ctx.lineTo(item.x2 - headlen * Math.cos(angle - Math.PI / 6), item.y2 - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(item.x2 - headlen * Math.cos(angle + Math.PI / 6), item.y2 - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        } else if (item.type === 'freehand' && item.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(item.points[0].x, item.points[0].y);
          item.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        } else if (item.type === 'tag') {
          const fontSize = Math.max(16, Math.round(canvas.width / 40));
          ctx.font = `bold ${fontSize}px sans-serif`;
          const text = `⚠️ ${item.tag}`;
          const pad = 10;
          const metrics = ctx.measureText(text);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.beginPath();
          ctx.roundRect(item.x - pad, item.y - fontSize - pad / 2, metrics.width + pad * 2, fontSize + pad * 1.5, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, item.x, item.y);
        }
      });
    };

    redraw();

    // Helper to get touch/mouse coordinates on canvas
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    let currentFreehand = null;

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.startX = pos.x;
      this.startY = pos.y;

      if (this.currentTool === 'freehand') {
        currentFreehand = { type: 'freehand', points: [pos], color: this.currentColor };
        this.history.push(currentFreehand);
      } else if (this.currentTool === 'tag') {
        this.history.push({ type: 'tag', tag: this.currentTag, x: pos.x, y: pos.y, color: this.currentColor });
        this.isDrawing = false;
        redraw();
      }
    };

    const moveDraw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);

      if (this.currentTool === 'freehand') {
        currentFreehand.points.push(pos);
        redraw();
      } else if (this.currentTool === 'circle' || this.currentTool === 'arrow') {
        redraw();
        // Temporary preview
        ctx.strokeStyle = this.currentColor;
        ctx.lineWidth = Math.max(4, canvas.width / 150);
        if (this.currentTool === 'circle') {
          ctx.beginPath();
          const r = Math.hypot(pos.x - this.startX, pos.y - this.startY) / 2;
          ctx.arc((this.startX + pos.x) / 2, (this.startY + pos.y) / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (this.currentTool === 'arrow') {
          ctx.beginPath();
          ctx.moveTo(this.startX, this.startY);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
      }
    };

    const endDraw = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const pos = getPos(e.changedTouches ? e.changedTouches[0] : e);

      if (this.currentTool === 'circle') {
        this.history.push({ type: 'circle', x1: this.startX, y1: this.startY, x2: pos.x, y2: pos.y, color: this.currentColor });
      } else if (this.currentTool === 'arrow') {
        this.history.push({ type: 'arrow', x1: this.startX, y1: this.startY, x2: pos.x, y2: pos.y, color: this.currentColor });
      }
      redraw();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    window.addEventListener('touchend', endDraw);

    // Toolbar events
    overlay.querySelectorAll('.annotator-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.annotator-tool-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.currentTool = btn.dataset.tool;
      });
    });

    overlay.querySelectorAll('.annotator-tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.annotator-tag-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.currentTool = 'tag';
        this.currentTag = btn.dataset.tag;
      });
    });

    overlay.querySelector('#btnAnnotatorUndo')?.addEventListener('click', () => {
      this.history.pop();
      redraw();
    });

    overlay.querySelector('#btnAnnotatorCancel')?.addEventListener('click', () => {
      overlay.remove();
      this.onSave(this.imageSource); // Return original untouched
    });

    overlay.querySelector('#btnAnnotatorSave')?.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      overlay.remove();
      this.onSave(dataUrl);
    });
  }
}
