const ALLOWED_ROLES = new Set(['user', 'assistant']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateCarContext(carContext) {
  if (!isPlainObject(carContext)) return 'carContext doit être un objet.';
  if (!['marque', 'modele', 'motorisation'].some((key) => typeof carContext[key] === 'string' && carContext[key].trim())) {
    return 'carContext doit contenir au moins une marque, un modèle ou une motorisation.';
  }
  return JSON.stringify(carContext).length > 4_000 ? 'carContext est trop volumineux.' : null;
}

export function validateChatBody(body) {
  if (!isPlainObject(body) || !Array.isArray(body.messages) || !body.messages.length) {
    return 'messages doit être un tableau non vide.';
  }
  if (body.messages.length > 30) return 'L’historique est limité à 30 messages.';
  if (body.messages.some((message) => !isPlainObject(message) || !ALLOWED_ROLES.has(message.role)
    || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 8_000)) {
    return 'Chaque message doit avoir un rôle valide et un contenu de 8 000 caractères maximum.';
  }
  return validateCarContext(body.carContext);
}

export function validateInlineBody(body) {
  if (!isPlainObject(body) || typeof body.selectedText !== 'string' || !body.selectedText.trim()) {
    return 'selectedText doit être une chaîne non vide.';
  }
  if (body.selectedText.length > 1_000) return 'selectedText est limité à 1 000 caractères.';
  return validateCarContext(body.carContext);
}
