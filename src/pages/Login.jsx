import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C } from '../lib/helpers';
import { inputStyle } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | signup
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate('/cabinet');
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email, password, options: { data: { org_name: orgName || 'Cabinetul meu' } },
        });
        if (err) throw err;
        if (data.session) {
          // confirmarea prin email e dezactivată în proiect — sesiune activă imediat
          navigate('/cabinet');
        } else {
          setInfo('Cont creat. Verifică emailul pentru confirmare, apoi autentifică-te.');
          setMode('login');
        }
      }
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
        <h1 className="text-lg font-semibold text-center mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>
          {mode === 'login' ? 'Autentificare cabinet' : 'Creează cabinetul tău'}
        </h1>
        <p className="text-xs text-center mb-6" style={{ color: C.inkSoft }}>
          {mode === 'login' ? 'Acces doar pentru personalul cabinetului.' : 'Contul tău primește un cabinet nou, complet izolat de ceilalți clienți.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label className="block mb-3">
              <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Numele cabinetului</span>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} style={inputStyle} placeholder="Cabinet Dr. Popescu" />
            </label>
          )}
          <label className="block mb-3">
            <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="doctor@cabinet.ro" />
          </label>
          <label className="block mb-4">
            <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Parolă</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </label>
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          {info && <p className="text-xs mb-3" style={{ color: C.sage }}>{info}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: C.ink }}>
            {loading && <Loader2 size={15} className="animate-spin" />} {mode === 'login' ? 'Intră în cont' : 'Creează cabinetul'}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }} className="w-full text-center text-xs mt-4" style={{ color: C.violet }}>
          {mode === 'login' ? 'Cabinet nou? Creează un cont' : 'Ai deja cont? Autentifică-te'}
        </button>
      </div>
    </div>
  );
}
