// Vercel Serverless Function.
// Confirmă, direct cu Stripe, că o sesiune de plată chiar s-a finalizat cu succes,
// înainte să lăsăm pe cineva să-și creeze cont. Fără asta, oricine ar putea inventa
// un session_id în URL și ar trece de "plată" fără să plătească.

export default async function handler(req, res) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY nu este setată pe server.' });
    return;
  }

  const { session_id } = req.query || {};
  if (!session_id) {
    res.status(400).json({ error: 'Lipsește session_id.' });
    return;
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const session = await response.json();
    if (!response.ok) {
      res.status(400).json({ error: 'Sesiune de plată invalidă.' });
      return;
    }
    if (session.payment_status !== 'paid') {
      res.status(200).json({ paid: false });
      return;
    }
    res.status(200).json({
      paid: true,
      email: session.customer_details?.email || '',
      plan: session.metadata?.plan || 'solo',
      customerId: session.customer || '',
      subscriptionId: session.subscription || '',
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
