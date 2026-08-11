import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C } from '../lib/helpers';
import { inputStyle } from '../components/ui';

const PLAN_LABELS = { solo: 'Solo', cabinet: 'Cabinet', clinica: 'Clinică' };

export default function CompleteSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState('checking'); // checking | ready | invalid | error
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('solo');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) { setStatus('invalid'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!res.ok || !data.paid) { setStatus('invalid'); return; }
        setEmail(data.email || '');
        setPlan(data.plan || 'solo');
        setStatus('ready');
      } catch (err) {
        setStatus('error');
      }
    })();
  }, [sessionId]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password, options: { data: { org_name: orgName || 'Cabinetul meu', plan } },
      });
      if (err) throw err;
      if (data.session) navigate('/cabinet');
      else { setError('Cont creat, dar necesită confirmare prin email — verifică inboxul, apoi autentifică-te.'); }
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="w-full max-w-sm rounded-3xl p-8 shadow-xl condica-fade" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})` }}>
            <Activity size={16} style={{ color: '#fff' }} />
          </div>
          <span className="text-xl font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>

        {status === 'checking' && (
          <div className="flex flex-col items-center py-6 gap-2">
            <Loader2 size={20} className="animate-spin" style={{ color: C.violet }} />
            <p className="text-sm" style={{ color: C.textSoft }}>Confirmăm plata...</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center py-4">
            <p className="text-sm mb-4" style={{ color: C.coral }}>Nu am găsit o plată confirmată pentru această sesiune.</p>
            <a href="/preturi" className="text-sm font-medium" style={{ color: C.violet }}>Înapoi la planuri</a>
          </div>
        )}

        {status === 'error' && (
          <p className="text-sm text-center py-4" style={{ color: C.coral }}>A apărut o eroare la verificarea plății. Reîncarcă pagina.</p>
        )}

        {status === 'ready' && (
          <>
            <div className="flex items-center gap-2 justify-center mb-1 text-sm" style={{ color: C.sage }}>
              <CheckCircle2 size={16} /> Plată confirmată — plan {PLAN_LABELS[plan] || plan}
            </div>
            <p className="text-xs text-center mb-6" style={{ color: C.textSoft }}>Ultimul pas: alege numele cabinetului și o parolă.</p>

            <form onSubmit={submit}>
              <label className="block mb-3">
                <span className="block text-xs font-medium mb-1" style={{ color: C.textSoft }}>Email</span>
                <input value={email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              </label>
              <label className="block mb-3">
                <span className="block text-xs font-medium mb-1" style={{ color: C.textSoft }}>Numele cabinetului</span>
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} style={inputStyle} placeholder="Cabinet Dr. Popescu" />
              </label>
              <label className="block mb-4">
                <span className="block text-xs font-medium mb-1" style={{ color: C.textSoft }}>Alege o parolă</span>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </label>
              {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: C.ink }}>
                {loading && <Loader2 size={15} className="animate-spin" />} Activează cabinetul
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
