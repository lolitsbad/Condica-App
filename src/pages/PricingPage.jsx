import React, { useState } from 'react';
import { Check, Activity, Loader2 } from 'lucide-react';
import { C } from '../lib/helpers';

const PLANS = [
  {
    id: 'solo', name: 'Solo', price: '149 RON', period: '/lună',
    features: ['1 medic', 'Programări + calendar vizual', 'Pagină publică de rezervare', 'Pacienți', 'Asistent AI (100 acțiuni/lună)', 'Facturare'],
  },
  {
    id: 'cabinet', name: 'Cabinet', price: '299 RON', period: '/lună', highlight: true,
    features: ['Până la 4 medici', 'Tot ce e în Solo', 'Asistent AI nelimitat', 'Fișe de ședință', 'Pachete de ședințe', 'Suport prioritar'],
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  async function choosePlan(planId) {
    setError(''); setLoadingPlan(planId);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Eroare la inițierea plății.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})` }}>
            <Activity size={16} style={{ color: '#fff' }} />
          </div>
          <span className="text-xl font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>
        <h1 className="text-3xl font-semibold text-center mb-2" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Alege planul cabinetului tău</h1>
        <p className="text-sm text-center mb-10" style={{ color: C.inkSoft }}>Contul se activează imediat după plată — îți alegi parola pe loc.</p>

        {error && <p className="text-sm text-center mb-6" style={{ color: C.coral }}>{error}</p>}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {PLANS.map((p) => (
            <div key={p.id} className="rounded-3xl p-6 condica-card" style={{ backgroundColor: C.surface, border: p.highlight ? `2px solid ${C.violet}` : `1px solid ${C.line}` }}>
              {p.highlight && <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: C.violet }}>Recomandat</div>}
              <h2 className="text-lg font-semibold mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>{p.name}</h2>
              <div className="mb-5">
                <span className="text-3xl font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>{p.price}</span>
                <span className="text-sm" style={{ color: C.inkSoft }}>{p.period}</span>
              </div>
              <ul className="mb-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: C.inkSoft }}>
                    <Check size={15} style={{ color: C.sage, marginTop: '2px', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => choosePlan(p.id)} disabled={loadingPlan !== null}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 condica-btn"
                style={{ backgroundColor: C.ink }}>
                {loadingPlan === p.id && <Loader2 size={15} className="animate-spin" />}
                {loadingPlan === p.id ? 'Se pregătește plata...' : 'Alege planul'}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-3xl p-6 text-center" style={{ backgroundColor: C.paperDeep }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Clinică</h2>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Medici nelimitați, branding propriu, suport dedicat — discutăm împreună configurația potrivită.</p>
          <a href="mailto:contact@condica.ro" className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.line}` }}>Contactează-ne</a>
        </div>
      </div>
    </div>
  );
}
