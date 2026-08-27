const SAFE_STATUSES = new Set(['pending', 'active', 'rejected']);
const SAFE_REVIEW_STATUSES = new Set(['pending', 'published', 'rejected']);

export function key(value) {
  return String(value || '').trim().toLocaleLowerCase('fr-FR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function garageSlug(name, city) {
  const result = `${key(name)} ${key(city)}`.trim().replace(/\s+/g, '-').slice(0, 100);
  return result || 'garage';
}

function text(value, length) { return String(value || '').trim().slice(0, length); }

// A garage website is rendered as a public link on the SEO page. Restrict it
// to web URLs so an untrusted submission cannot create a javascript: link.
function websiteUrl(value) {
  const candidate = text(value, 240);
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export function sanitizeGarage(input = {}, { status = 'pending', createdBy = '' } = {}) {
  const specialties = Array.isArray(input.specialties) ? input.specialties : String(input.specialties || '').split(',');
  const cleanSpecialties = [...new Set(specialties.map((item) => text(item, 60)).filter(Boolean))].slice(0, 15);
  const safeStatus = SAFE_STATUSES.has(status) ? status : 'pending';
  const name = text(input.name, 120);
  const city = text(input.city, 100);
  const postalCode = text(input.postalCode, 12).replace(/[^0-9A-Za-z -]/g, '');
  if (name.length < 2) throw Object.assign(new Error('Le nom du garage est requis.'), { code: 'GARAGE_NAME_REQUIRED' });
  if (city.length < 2) throw Object.assign(new Error('La ville du garage est requise.'), { code: 'GARAGE_CITY_REQUIRED' });
  return {
    name, nameKey: key(name), city, cityKey: key(city), postalCode,
    address: text(input.address, 200), specialties: cleanSpecialties,
    specialtiesKey: cleanSpecialties.map(key), description: text(input.description, 2_000),
    hours: text(input.hours, 1_000), phone: text(input.phone, 30),
    email: text(input.email, 254).toLowerCase(), website: websiteUrl(input.website),
    status: safeStatus, createdBy: text(createdBy, 128),
  };
}

export function sanitizeReview(input = {}) {
  const rating = Number(input.rating);
  const comment = text(input.comment, 1_500);
  const authorName = text(input.authorName, 80) || 'Client CarDiag';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Object.assign(new Error('La note doit être comprise entre 1 et 5.'), { code: 'REVIEW_RATING_INVALID' });
  if (comment.length < 10) throw Object.assign(new Error('Votre avis doit contenir au moins 10 caractères.'), { code: 'REVIEW_COMMENT_TOO_SHORT' });
  return { rating, comment, authorName };
}

export function publicGarage(data = {}) {
  return {
    id: data.id, slug: data.slug, name: data.name, city: data.city, postalCode: data.postalCode,
    address: data.address, specialties: data.specialties || [], description: data.description,
    hours: data.hours, phone: data.phone, email: data.email, website: data.website,
    ratingAverage: Number(data.ratingAverage || 0), reviewCount: Number(data.reviewCount || 0),
  };
}

export function isGarageStatus(value) { return SAFE_STATUSES.has(value); }
export function isReviewStatus(value) { return SAFE_REVIEW_STATUSES.has(value); }
