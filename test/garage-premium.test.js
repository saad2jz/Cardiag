import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { premiumFromStripeEvent } from '../src/auth/firebase-admin.js';

const events = [];
const checkoutCalls = [];
const garage = {
  id: 'garage-active',
  name: 'Garage Actif',
  status: 'active',
  premium: { active:false, stripeCustomerId:'cus_old', stripeSubscriptionId:'sub_old', currentPeriodEnd:null },
};

const service = {
  async verifyToken(token) { if (token === 'owner') return { uid:'owner-1', email:'owner@example.test', email_verified:true }; throw new Error('invalid'); },
  async getBilling() { return {}; },
  async saveBilling() { return {}; },
  async getGaragePremiumAccess(uid, id) {
    if (uid !== 'owner-1') throw Object.assign(new Error('Vous ne gérez pas ce garage.'), { code:'GARAGE_MANAGER_REQUIRED' });
    if (id === 'garage-pending') return { ...garage, id, status:'pending' };
    if (id !== garage.id) throw Object.assign(new Error('Garage introuvable.'), { code:'GARAGE_NOT_FOUND' });
    return structuredClone(garage);
  },
  async updateGaragePremiumFromStripeEvent(event) {
    garage.premium = premiumFromStripeEvent(event, garage.premium);
    events.push({ type:event.type, status:garage.status, premium:structuredClone(garage.premium) });
    return garage;
  },
};
const stripe = {
  configured:true,
  webhookConfigured:true,
  async createGarageCheckout(options) { checkoutCalls.push(options); return { url:'https://checkout.stripe.test/session' }; },
  async createPortal({ customerId }) { return { url:`https://billing.stripe.test/${customerId}` }; },
  constructWebhookEvent(payload) { return JSON.parse(Buffer.from(payload).toString('utf8')); },
};
let server;
let baseUrl;
before(async () => {
  server = createApp({ llmService:{ chat:async()=>({}), inline:async()=>'' }, accountService:service, stripeService:stripe }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

function ownerHeaders() { return { Authorization:'Bearer owner', 'content-type':'application/json' }; }

test('a pending garage cannot create a premium checkout, while an active owner can', async () => {
  const pending = await fetch(`${baseUrl}/api/account/billing/checkout`, { method:'POST', headers:ownerHeaders(), body:JSON.stringify({ garageId:'garage-pending' }) });
  assert.equal(pending.status, 409);
  assert.equal(checkoutCalls.length, 0);

  const active = await fetch(`${baseUrl}/api/account/billing/checkout`, { method:'POST', headers:ownerHeaders(), body:JSON.stringify({ garageId:'garage-active' }) });
  assert.equal(active.status, 200);
  assert.equal((await active.json()).url, 'https://checkout.stripe.test/session');
  assert.deepEqual(checkoutCalls[0], { uid:'owner-1', email:'owner@example.test', garageId:'garage-active', customerId:'cus_old' });

  const portal = await fetch(`${baseUrl}/api/account/billing/portal`, { method:'POST', headers:ownerHeaders(), body:JSON.stringify({ garageId:'garage-active' }) });
  assert.equal(portal.status, 200);
  assert.match((await portal.json()).url, /cus_old$/);
});

test('Stripe webhook premium transitions never alter the administrative garage status', async () => {
  const completed = { type:'checkout.session.completed', data:{ object:{ customer:'cus_new', subscription:'sub_new', metadata:{ uid:'owner-1', garageId:'garage-active' } } } };
  const response = await fetch(`${baseUrl}/api/stripe/webhook`, { method:'POST', headers:{ 'content-type':'application/json', 'stripe-signature':'test' }, body:JSON.stringify(completed) });
  assert.equal(response.status, 200);
  assert.equal(garage.premium.active, true);
  assert.equal(garage.premium.stripeCustomerId, 'cus_new');
  assert.equal(garage.status, 'active');

  const cancelled = { type:'customer.subscription.deleted', data:{ object:{ id:'sub_new', customer:'cus_new', status:'canceled', metadata:{ garageId:'garage-active' } } } };
  const cancellation = await fetch(`${baseUrl}/api/stripe/webhook`, { method:'POST', headers:{ 'content-type':'application/json', 'stripe-signature':'test' }, body:JSON.stringify(cancelled) });
  assert.equal(cancellation.status, 200);
  assert.equal(garage.premium.active, false);
  assert.equal(garage.status, 'active');
  assert.equal(events.length, 2);
});

test('invoice failure also disables premium and preserves Stripe references', () => {
  const premium = premiumFromStripeEvent({ type:'invoice.payment_failed', data:{ object:{ customer:'cus_test', subscription:'sub_test' } } }, { active:true, stripeCustomerId:'cus_test', stripeSubscriptionId:'sub_test', currentPeriodEnd:null });
  assert.equal(premium.active, false);
  assert.equal(premium.stripeCustomerId, 'cus_test');
  assert.equal(premium.stripeSubscriptionId, 'sub_test');
});
