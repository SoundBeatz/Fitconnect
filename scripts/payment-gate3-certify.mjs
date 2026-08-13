import crypto from 'node:crypto';
import fs from 'node:fs';

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const productId = process.env.CERT_PRODUCT_ID?.trim();
const email = process.env.CERT_EMAIL?.trim();
const phone = process.env.CERT_PHONE?.trim();
const firstName = process.env.CERT_FIRST_NAME?.trim() || 'FitConnect';
const lastName = process.env.CERT_LAST_NAME?.trim() || 'Certification';
const timeoutSeconds = Number(process.env.CERT_TIMEOUT_SECONDS || 900);

if (!projectRef || !productId || !email || !phone) {
  throw new Error('Missing SUPABASE_PROJECT_REF, CERT_PRODUCT_ID, CERT_EMAIL or CERT_PHONE');
}

const base = `https://${projectRef}.supabase.co/functions/v1`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const summary = (text) => {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, `${text}\n`);
  console.log(text.replace(/\n/g, ' '));
};

async function post(slug, body) {
  const response = await fetch(`${base}/${slug}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://fitconnect.nl' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  return { response, payload };
}

function expectStatus(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected HTTP ${expected}, got ${actual}`);
  console.log(`PASS ${label}`);
}

summary('# FitConnect Gate 3 — Mollie TEST Certification');
summary(`Started: ${new Date().toISOString()}`);

// Negative test: status endpoint must reject an invalid token before any payment exists.
{
  const { response } = await post('commerce-payment-status', {
    checkoutSessionId: crypto.randomUUID(),
    statusToken: 'invalid.invalid',
  });
  expectStatus(response.status, 403, 'invalid payment status token rejected');
}

// Negative test: checkout-token must reject malformed email input.
{
  const { response } = await post('commerce-checkout-token', { email: 'not-an-email' });
  expectStatus(response.status, 400, 'invalid checkout email rejected');
}

const tokenResult = await post('commerce-checkout-token', { email });
expectStatus(tokenResult.response.status, 200, 'checkout nonce issued');
const checkoutNonce = tokenResult.payload.checkoutNonce;
if (!checkoutNonce) throw new Error('checkout-token returned no checkoutNonce');

const idempotencyKey = crypto.randomUUID();
const checkoutBody = {
  items: [{ productId, quantity: 1 }],
  customer: {
    firstName,
    lastName,
    email,
    phone,
    customerType: 'consumer',
  },
  shippingAddress: {
    street: 'Dam',
    houseNumber: '1',
    postalCode: '1012JS',
    city: 'Amsterdam',
    region: 'Noord-Holland',
    country: 'NL',
  },
  idempotencyKey,
  checkoutNonce,
};

const create = await post('commerce-create-payment', checkoutBody);
expectStatus(create.response.status, 201, 'Mollie TEST payment created');
const { checkoutUrl, checkoutSessionId, statusToken } = create.payload;
if (!checkoutUrl || !checkoutSessionId || !statusToken) {
  throw new Error('create-payment did not return checkoutUrl, checkoutSessionId and statusToken');
}

summary(`## Manual Mollie test action\nOpen this checkout URL and choose **Paid** in the Mollie TEST screen:\n\n${checkoutUrl}\n`);
summary(`Checkout session: \`${checkoutSessionId}\``);

// Negative test: the same nonce may not create a second checkout under a new idempotency key.
{
  const replay = await post('commerce-create-payment', {
    ...checkoutBody,
    idempotencyKey: crypto.randomUUID(),
  });
  expectStatus(replay.response.status, 403, 'checkout nonce replay rejected');
}

// Negative test: a valid token must be bound to its checkout session.
{
  const mismatch = await post('commerce-payment-status', {
    checkoutSessionId: crypto.randomUUID(),
    statusToken,
  });
  expectStatus(mismatch.response.status, 403, 'status token/session mismatch rejected');
}

const deadline = Date.now() + timeoutSeconds * 1000;
let last = null;
while (Date.now() < deadline) {
  const status = await post('commerce-payment-status', { checkoutSessionId, statusToken });
  if (!status.response.ok) throw new Error(`payment-status failed with HTTP ${status.response.status}`);
  last = status.payload;
  const paymentStatus = String(last.paymentStatus || '').toLowerCase();
  const checkoutStatus = String(last.checkoutStatus || '').toLowerCase();
  console.log(`status payment=${paymentStatus} checkout=${checkoutStatus}`);
  if (paymentStatus === 'paid' && checkoutStatus === 'completed') {
    summary(`## Result\n✅ **PAYMENT + WEBHOOK CERTIFIED**\n\nPayment status: \`${paymentStatus}\`  \nCheckout status: \`${checkoutStatus}\`  \nCompleted: ${new Date().toISOString()}`);
    process.exit(0);
  }
  if (['failed', 'cancelled', 'canceled', 'expired'].includes(paymentStatus)) {
    throw new Error(`Mollie TEST payment ended in terminal status: ${paymentStatus}`);
  }
  await sleep(5000);
}

summary(`## Result\n❌ Certification timed out. Last known status: \`${JSON.stringify(last)}\``);
throw new Error(`Certification timed out after ${timeoutSeconds}s`);
