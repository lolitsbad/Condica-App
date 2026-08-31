// Vercel Serverless Function.
// Creează o sesiune Stripe Checkout pentru un abonament lunar simplu,
// în funcție de planul ales (Solo sau Cabinet).

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
  const priceId = plan === 'cabinet' ? process.env.STRIPE_PRICE_CABINET : process.env.STRIPE_PRICE_SOLO;
  if (!priceId) {
    res.status(400).json({ error: `Nu există un preț Stripe configurat pentru planul "${plan}".` });
    return;
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/inregistrare?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/preturi`);
    params.append('metadata[plan]', plan || 'solo');
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
