import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C } from '../lib/helpers';
import { inputStyle } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      navigate('/cabinet');
    } catch (err) {
      setError('Email sau parolă incorectă.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="w-full max-w-sm rounded-3xl p-8 shadow-xl condica-fade" style={{ backgroundColor: '#fff', border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})` }}>
            <Activity size={16} style={{ color: '#fff' }} />
          </div>
          <span className="text-xl font-semibold" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>
        <h1 className="text-lg font-semibold text-center mb-1" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Autentificare cabinet</h1>
        <p className="text-xs text-center mb-6" style={{ color: C.inkSoft }}>Acces doar pentru personalul cabinetului.</p>

        <form onSubmit={submit}>
          <label className="block mb-3">
            <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="doctor@cabinet.ro" />
          </label>
          <label className="block mb-4">
            <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>Parolă</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </label>
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: C.ink }}>
            {loading && <Loader2 size={15} className="animate-spin" />} Intră în cont
          </button>
        </form>

        <p className="text-[11px] text-center mt-5" style={{ color: C.inkSoft }}>
          Nu există înregistrare publică, intenționat — ca pacienții să nu poată ajunge niciodată aici.
          Contul se creează o singură dată, direct din Supabase (vezi README).
        </p>
      </div>
    </div>
  );
}

