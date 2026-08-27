import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { garageSlug, sanitizeGarage, sanitizeReview } from '../src/marketplace/garage-utils.js';

const activeGarage = { id:'garage-central-lyon', slug:'garage-central-lyon', name:'Garage Central', city:'Lyon', postalCode:'69003', specialties:['Diagnostic'], status:'active', ratingAverage:4.5, reviewCount:2, description:'Diagnostic et entretien automobile.' };
const pendingGarage = { ...activeGarage, id:'garage-en-attente-lyon', slug:'garage-en-attente-lyon', status:'pending', name:'Garage en attente' };
const calls = { reviews:[] };
const marketplaceService = {
  async verifyToken(token) { if (token === 'admin') return { uid:'admin-1', email_verified:true, admin:true }; throw new Error('invalid'); },
  async isAdmin(user) { return Boolean(user.admin); },
  async listPublicGarages() { return { garages:[], nextCursor:null }; },
  async getPublicGarage(slug) { return slug === activeGarage.slug ? { garage:activeGarage, reviews:[] } : null; },
  async listGarageSitemapEntries() { return [{ slug:activeGarage.slug, updatedAt:'2026-08-27T12:00:00.000Z' }]; },
  async createGarageApplication(input) { return { ...sanitizeGarage(input), id:'pending-garage', slug:'pending-garage', status:'pending' }; },
  async createGarageReview(slug, input) { if (slug !== activeGarage.slug) throw Object.assign(new Error('Ce garage est introuvable ou non publié.'), { code:'GARAGE_NOT_FOUND' }); const review={ id:'review-1', status:'pending', ...sanitizeReview(input) }; calls.reviews.push(review); return review; },
  async listAdminGarages() { return { garages:[pendingGarage] }; },
  async createAdminGarage(_uid, input) { return { ...sanitizeGarage(input, { status:input.status }), id:'new-garage', slug:'new-garage' }; },
  async moderateGarage(_uid, id, status) { return { id, status }; },
  async listAdminReviews() { return { reviews:calls.reviews }; },
  async moderateGarageReview(_uid, id, status) { return { id, status }; },
};
let server; let baseUrl;
before(async () => { server = createApp({ llmService:{ chat:async()=>({}), inline:async()=>'' }, accountService:marketplaceService }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl=`http://127.0.0.1:${server.address().port}`; });
after(() => new Promise((resolve) => server.close(resolve)));

test('garage sanitizer builds a stable slug and rejects incomplete reviews', () => {
  assert.equal(garageSlug('Garage Étoile', 'Saint-Étienne'), 'garage-etoile-saint-etienne');
  assert.equal(sanitizeGarage({ name:'Garage Central', city:'Lyon', specialties:'Diagnostic, Freinage' }).status, 'pending');
  assert.equal(sanitizeGarage({ name:'Garage Central', city:'Lyon', website:'garage.example' }).website, 'https://garage.example/');
  assert.equal(sanitizeGarage({ name:'Garage Central', city:'Lyon', website:'javascript:alert(1)' }).website, '');
  assert.throws(() => sanitizeReview({ rating:5, comment:'court' }), { code:'REVIEW_COMMENT_TOO_SHORT' });
});

test('empty directory and sitemap are valid without a public data leak', async () => {
  const [directory, sitemap] = await Promise.all([fetch(`${baseUrl}/api/garages`), fetch(`${baseUrl}/sitemap.xml`)]);
  assert.deepEqual(await directory.json(), { garages:[], nextCursor:null });
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/cardiag\.online\/garages<\/loc>/);
  assert.match(xml, /garage-central-lyon/);
  assert.doesNotMatch(xml, /garage-en-attente/);
});

test('directory, registration and protected admin pages have stable routes', async () => {
  for (const [path, expected] of [['/garages', /Trouvez un garage/], ['/pro/inscription-garage', /Inscrire mon garage/], ['/admin/garages', /Administration/]]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), expected, path);
  }
});

test('only active garages have a public SEO page and can receive a pending review', async () => {
  const publicPage = await fetch(`${baseUrl}/garages/${activeGarage.slug}`);
  assert.equal(publicPage.status, 200);
  const html = await publicPage.text();
  assert.match(html, /AutoRepair/);
  assert.match(html, /canonical/);
  assert.equal((await fetch(`${baseUrl}/garages/${pendingGarage.slug}`)).status, 404);
  const review = await fetch(`${baseUrl}/api/garages/${activeGarage.slug}/reviews`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ authorName:'Nadia', rating:5, comment:'Très bon accueil et diagnostic clair.' }) });
  assert.equal(review.status, 201);
  assert.equal((await review.json()).review.status, 'pending');
});

test('garage applications are pending and admin actions require an authenticated administrator', async () => {
  const application = await fetch(`${baseUrl}/api/garages/applications`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ name:'Atelier Nord', city:'Lille' }) });
  assert.equal(application.status, 201);
  assert.equal((await application.json()).garage.status, 'pending');
  assert.equal((await fetch(`${baseUrl}/api/admin/garages`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/garages`, { headers:{Authorization:'Bearer invalid'} })).status, 401);
  const admin = await fetch(`${baseUrl}/api/admin/garages`, { headers:{Authorization:'Bearer admin'} });
  assert.equal(admin.status, 200);
  const moderation = await fetch(`${baseUrl}/api/admin/garage-reviews/review-1/status`, { method:'PATCH', headers:{Authorization:'Bearer admin','content-type':'application/json'}, body:JSON.stringify({ status:'published' }) });
  assert.equal(moderation.status, 200);
});
