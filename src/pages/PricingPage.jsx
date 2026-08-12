import React, { useState } from 'react';
import { Check, Activity, Loader2 } from 'lucide-react';
import { C } from '../lib/helpers';

const PLAN_FEATURES = {
  solo: ['1 medic', 'Programări + calendar vizual', 'Pagină publică de rezervare', 'Pacienți', 'Asistent AI (100 acțiuni/lună)', 'Facturare'],
  cabinet: ['Până la 4 medici', 'Tot ce e în Solo', 'Asistent AI nelimitat', 'Fișe de ședință', 'Pachete de ședințe', 'Suport prioritar'],
};
const MAINTENANCE = {
  standard: { label: 'Standard', price: '100 RON/lună', features: ['Găzduire + actualizări de securitate', 'Backup zilnic', 'Suport prin email, 48h'] },
  plus: { label: 'Plus', price: '175 RON/lună', features: ['Tot ce e în Standard', 'Suport prin email, 24h', '+50 acțiuni AI/lună'] },
  premium: { label: 'Premium', price: '250 RON/lună', features: ['Tot ce e în Plus', 'Suport prioritar — 24h, telefon/WhatsApp', 'Funcții noi incluse, fără cost suplimentar', '+150 acțiuni AI/lună', 'Sesiune lunară de optimizare'] },
};

export default function PricingPage() {
  const [plan, setPlan] = useState('solo');
  const [maintenance, setMaintenance] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function proceedToCheckout() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, maintenance }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Eroare la inițierea plății.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
      setLoading(false);
    }
  }

  const m = MAINTENANCE[maintenance];

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})` }}>
            <Activity size={16} style={{ color: '#fff' }} />
          </div>
          <span className="text-xl font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>
        <h1 className="text-3xl font-semibold text-center mb-2" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Licență Condica</h1>
        <p className="text-sm text-center mb-8" style={{ color: C.textSoft }}>900 RON, o singură dată — plus mentenanță lunară, la alegere. Contul se activează imediat după plată.</p>

        {error && <p className="text-sm text-center mb-6" style={{ color: C.coral }}>{error}</p>}

        <div className="rounded-3xl p-6 condica-card mb-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
          <div className="text-center mb-6">
            <span className="text-4xl font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>900 RON</span>
            <span className="text-sm" style={{ color: C.textSoft }}> o dată</span>
            <span className="block text-sm mt-1" style={{ color: C.violet }}>+ {m.price} mentenanță</span>
          </div>

          <div className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.textSoft }}>Plan</h3>
            <div className="flex gap-2">
              {['solo', 'cabinet'].map((p) => (
                <button key={p} onClick={() => setPlan(p)} className="flex-1 py-2.5 rounded-xl text-sm font-medium condica-btn"
                  style={{ backgroundColor: plan === p ? C.ink : C.paperDeep, color: plan === p ? '#fff' : C.text, border: `1px solid ${plan === p ? C.ink : C.line}` }}>
                  {p === 'solo' ? 'Solo' : 'Cabinet'}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {PLAN_FEATURES[plan].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: C.textSoft }}>
                  <Check size={14} style={{ color: C.sage, marginTop: '3px', flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.textSoft }}>Mentenanță</h3>
            <div className="flex gap-2">
              {['standard', 'plus', 'premium'].map((k) => (
                <button key={k} onClick={() => setMaintenance(k)} className="flex-1 py-2.5 rounded-xl text-sm font-medium condica-btn"
                  style={{ backgroundColor: maintenance === k ? C.violet : C.violetBg, color: maintenance === k ? '#fff' : C.violet, border: `1px solid ${maintenance === k ? C.violet : 'transparent'}` }}>
                  {MAINTENANCE[k].label}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {m.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: C.textSoft }}>
                  <Check size={14} style={{ color: C.violet, marginTop: '3px', flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
          </div>

          <button onClick={proceedToCheckout} disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 condica-btn"
            style={{ backgroundColor: C.ink }}>
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Se pregătește plata...' : 'Continuă la plată'}
          </button>
        </div>

        <div className="rounded-3xl p-6 text-center" style={{ backgroundColor: C.paperDeep }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Clinică</h2>
          <p className="text-sm mb-4" style={{ color: C.textSoft }}>Medici nelimitați, branding propriu, suport dedicat — discutăm împreună configurația potrivită.</p>
          <a href="mailto:contact@condica.ro" className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.line}` }}>Contactează-ne</a>
        </div>
      </div>
    </div>
  );
}
