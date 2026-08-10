// Vercel Serverless Function.
// Trimite un email cabinetului când un pacient face o programare online.
// Necesită variabila de mediu RESEND_API_KEY (gratuită la resend.com, fără card la început).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const { to, patientName, date, time, reason } = req.body || {};

  if (!to) {
    // Niciun email configurat pentru acest medic — nu e o eroare, doar nimic de trimis.
    res.status(200).json({ skipped: true });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY nu este setată pe server.' });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Condica <onboarding@resend.dev>',
        to: [to],
        subject: `Programare nouă: ${patientName}`,
        html: `<p>Ai o programare nouă, făcută online.</p>
               <p><strong>Pacient:</strong> ${patientName}<br/>
               <strong>Data:</strong> ${date}<br/>
               <strong>Ora:</strong> ${time}${reason ? `<br/><strong>Motiv:</strong> ${reason}` : ''}</p>`,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: errText });
      return;
    }
    res.status(200).json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
