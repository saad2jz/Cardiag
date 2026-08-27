import Stripe from 'stripe';

function normalizedOrigin(value) {
  try { return new URL(String(value || 'https://cardiag.online')).origin; }
  catch { return 'https://cardiag.online'; }
}

/** Server-only gateway. It remains unavailable until Stripe env vars exist. */
export function createStripeService(env = process.env) {
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim();
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  const priceId = String(env.STRIPE_GARAGE_PRICE_ID || '').trim();
  const origin = normalizedOrigin(env.PUBLIC_ORIGIN);
  const stripe = secretKey ? new Stripe(secretKey) : null;
  const unavailable = () => Object.assign(new Error('La facturation Stripe n’est pas encore configurée.'), { code: 'STRIPE_NOT_CONFIGURED' });
  return {
    configured: Boolean(stripe && priceId),
    webhookConfigured: Boolean(stripe && webhookSecret),
    async createGarageCheckout({ uid, email, garageId, customerId = null }) {
      if (!stripe || !priceId) throw unavailable();
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription', line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid, customer: customerId || undefined,
        customer_email: customerId ? undefined : String(email || '').trim() || undefined,
        metadata: { uid, garageId }, subscription_data: { metadata: { uid, garageId } },
        success_url: `${origin}/app/parametres?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pro/inscription-garage?billing=cancelled`, allow_promotion_codes: true,
      });
      if (!session.url) throw new Error('Stripe n’a pas retourné d’URL Checkout.');
      return { url: session.url };
    },
    async createPortal({ customerId }) {
      if (!stripe) throw unavailable();
      if (!customerId) throw Object.assign(new Error('Aucun abonnement Stripe associé à ce compte.'), { code: 'STRIPE_CUSTOMER_MISSING' });
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/app/parametres` });
      return { url: session.url };
    },
    constructWebhookEvent(payload, signature) {
      if (!stripe || !webhookSecret) throw unavailable();
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    },
  };
}
