// Vercel Serverless Function.
// Creează o sesiune Stripe Checkout care combină LICENȚA (plată unică) cu
// MENTENANȚA (abonament lunar) — ambele plătite la același checkout, licența
// taxată o singură dată, mentenanța pornind ca abonament de atunci încolo.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY nu este setată pe server.' });
    return;
  }

  const { plan } = req.body || {};
  const licenseKey = plan === 'cabinet' ? 'STRIPE_PRICE_CABINET_LICENSE' : 'STRIPE_PRICE_SOLO_LICENSE';
  const maintenanceKey = plan === 'cabinet' ? 'STRIPE_PRICE_CABINET_MAINTENANCE' : 'STRIPE_PRICE_SOLO_MAINTENANCE';
  const licensePriceId = process.env[licenseKey];
  const maintenancePriceId = process.env[maintenanceKey];
  if (!licensePriceId || !maintenancePriceId) {
    res.status(400).json({ error: `Nu există prețuri Stripe configurate pentru planul "${plan}".` });
    return;
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    // linia 0: licența — preț unic, taxată o singură dată pe prima factură
    params.append('line_items[0][price]', licensePriceId);
    params.append('line_items[0][quantity]', '1');
    // linia 1: mentenanța — preț recurent, devine abonamentul lunar continuu
    params.append('line_items[1][price]', maintenancePriceId);
    params.append('line_items[1][quantity]', '1');
    params.append('success_url', `${origin}/inregistrare?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/preturi`);
    params.append('metadata[plan]', plan || 'solo');
    params.append('metadata[billing]', 'license_plus_maintenance');
    params.append('subscription_data[metadata][plan]', plan || 'solo');
    params.append('allow_promotion_codes', 'true');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const session = await response.json();
    if (!response.ok) {
      res.status(400).json({ error: session.error?.message || 'Eroare la crearea sesiunii Stripe.' });
      return;
    }
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

