const MAX_MESSAGES = 30;

function apiBaseUrl() {
  const configured = document.querySelector('meta[name="chat-api"]')?.content.trim();
  if (configured) return configured.replace(/\/$/, '');
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3000' : '';
}

function carContext() {
  return {
    marque: document.getElementById('marqueSelect')?.value || '',
    modele: document.getElementById('modeleSelect')?.value || '',
    generation: document.getElementById('generationSelect')?.value || '',
    annee: document.getElementById('anneeSelect')?.value || '',
    motorisation: document.getElementById('motorisationSelect')?.value || '',
  };
}

function canUseAssistant() {
  return [carContext().marque, carContext().modele, carContext().motorisation].some(Boolean);
}

async function request(path, body) {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error("L’assistant n’est pas configuré pour ce site.");
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Le service est indisponible.');
  return payload;
}

function appendMessage(list, role, content) {
  const message = document.createElement('article');
  message.className = `chat-message chat-message-${role}`;
  message.textContent = content;
  list.appendChild(message);
  list.scrollTop = list.scrollHeight;
  return message;
}

function renderSafeInline(target, html) {
  const allowed = new Set(['STRONG', 'EM', 'CODE', 'BR']);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();

  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!allowed.has(node.tagName)) {
        node.childNodes.forEach((child) => copy(child, parent));
        return;
      }
      const safeNode = document.createElement(node.tagName.toLowerCase());
      node.childNodes.forEach((child) => copy(child, safeNode));
      parent.appendChild(safeNode);
    }
  }

  parsed.body.childNodes.forEach((node) => copy(node, fragment));
  target.replaceChildren(fragment);
}

export function initializeChatExperience() {
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const close = document.getElementById('chatClose');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesElement = document.getElementById('chatMessages');
  const status = document.getElementById('chatStatus');
  const inline = document.getElementById('inlineAssistant');
  const inlineText = document.getElementById('inlineAssistantText');
  const inlineClose = document.getElementById('inlineAssistantClose');
  const inlineAsk = document.getElementById('inlineAssistantAsk');
  let messages = [];
  let selectedText = '';

  if (!toggle || !panel || !form || !input || !messagesElement || !status || !inline || !inlineText) return;

  function openPanel() {
    panel.hidden = false;
    input.focus();
  }

  toggle.addEventListener('click', openPanel);
  close?.addEventListener('click', () => { panel.hidden = true; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    if (!canUseAssistant()) {
      status.textContent = 'Sélectionnez au moins une marque, un modèle ou une motorisation.';
      return;
    }

    input.value = '';
    appendMessage(messagesElement, 'user', content);
    messages.push({ role: 'user', content });
    messages = messages.slice(-MAX_MESSAGES);
    status.textContent = 'Diagnostic en cours…';

    try {
      const { message } = await request('/api/chat', { messages, carContext: carContext() });
      appendMessage(messagesElement, 'assistant', message);
      messages.push({ role: 'assistant', content: message });
      messages = messages.slice(-MAX_MESSAGES);
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    if (text.length < 2 || text.length > 1_000 || !canUseAssistant()) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    selectedText = text;
    inlineText.textContent = `Expliquer : « ${text.slice(0, 140)}${text.length > 140 ? '…' : ''} »`;
    inline.hidden = false;
    inline.style.left = `${Math.min(window.innerWidth - inline.offsetWidth - 12, Math.max(12, rect.left))}px`;
    inline.style.top = `${Math.min(window.innerHeight - 56, rect.bottom + 8)}px`;
  });

  inlineClose?.addEventListener('click', () => { inline.hidden = true; });
  inlineAsk?.addEventListener('click', async () => {
    if (!selectedText) return;
    inlineAsk.disabled = true;
    inlineText.textContent = 'Explication technique en cours…';
    try {
      const { explanation } = await request('/api/inline', { selectedText, carContext: carContext() });
      renderSafeInline(inlineText, explanation);
    } catch (error) {
      inlineText.textContent = error.message;
    } finally {
      inlineAsk.disabled = false;
    }
  });
}
