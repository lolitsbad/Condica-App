import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, Wallet, Settings, Sparkles, ShieldCheck, Plus, LogOut, Activity, Copy, Check } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../supabaseClient';
import { C, DOCTOR_COLORS } from '../../lib/helpers';
import { Modal, Field, inputStyle } from '../../components/ui';

const navItems = [
  { to: '/cabinet', label: 'Tablou', Icon: LayoutDashboard, end: true },
  { to: '/cabinet/programari', label: 'Programări', Icon: CalendarDays },
  { to: '/cabinet/pacienti', label: 'Pacienți', Icon: Users },
  { to: '/cabinet/facturare', label: 'Facturare', Icon: Wallet },
  { to: '/cabinet/program', label: 'Program de lucru', Icon: Settings },
  { to: '/cabinet/asistent', label: 'Asistent AI', Icon: Sparkles },
];

export default function CabinetLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [activeDoctorId, setActiveDoctorId] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ name: '', specialty: '' });
  const [ready, setReady] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function loadOrgAndDoctors() {
    const { data: membership } = await supabase.from('memberships').select('org_id').eq('user_id', session.user.id).maybeSingle();
    if (!membership) { setReady(true); return; }
    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', membership.org_id).maybeSingle();
    setOrg(orgData);
    const { data: docs } = await supabase.from('doctors').select('*').eq('org_id', membership.org_id).order('created_at');
    setDoctors(docs || []);
    setActiveDoctorId((prev) => prev && docs?.some((d) => d.id === prev) ? prev : docs?.[0]?.id);
    setReady(true);
  }

  useEffect(() => { if (session) loadOrgAndDoctors(); }, [session]); // eslint-disable-line

  async function addDoctor() {
    if (!doctorForm.name.trim() || !org) return;
    const color = DOCTOR_COLORS[doctors.length % DOCTOR_COLORS.length];
    const { data, error } = await supabase.from('doctors').insert({ org_id: org.id, name: doctorForm.name, specialty: doctorForm.specialty, color }).select().single();
    if (!error && data) {
      await supabase.from('working_hours').insert(
        [1, 2, 3, 4, 5, 6, 0].map((d) => ({ org_id: org.id, doctor_id: data.id, day_of_week: d, enabled: d >= 1 && d <= 5, start_time: '09:00', end_time: d === 5 ? '15:00' : '17:00', slot_minutes: 20 }))
      );
      await loadOrgAndDoctors();
      setActiveDoctorId(data.id);
      setShowAddDoctor(false);
      setDoctorForm({ name: '', specialty: '' });
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const bookingUrl = org ? `${window.location.origin}/programare/${org.slug}` : '';
  function copyLink() {
    navigator.clipboard.writeText(bookingUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paper }} />;
  if (!session) return <Navigate to="/login" replace />;
  if (!ready) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paper }} />;

  return (
    <div className="min-h-screen flex" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="w-56 shrink-0 flex flex-col py-6 px-4 overflow-y-auto" style={{ backgroundColor: C.ink }}>
        <div className="flex items-center gap-2.5 px-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})`, border: '1px solid rgba(255,255,255,0.15)' }}>
            <Activity size={14} style={{ color: '#fff' }} />
          </div>
          <span className="text-base font-semibold text-white" style={{ fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>
        {org && <div className="text-xs px-2 mb-5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{org.name}</div>}

        {org && (
          <button onClick={copyLink} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }} title={bookingUrl}>
            {linkCopied ? <Check size={13} /> : <Copy size={13} />}
            <span className="truncate">{linkCopied ? 'Link copiat' : 'Copiază linkul de programare'}</span>
          </button>
        )}

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wide px-2 mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Medic activ</div>
          {doctors.map((d) => (
            <button key={d.id} onClick={() => setActiveDoctorId(d.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1"
              style={{ backgroundColor: activeDoctorId === d.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeDoctorId === d.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
          <button onClick={() => setShowAddDoctor(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Plus size={13} /> Adaugă medic
          </button>
        </div>
        <div className="mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={({ isActive }) => ({ backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' })}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2 pt-4">
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <ShieldCheck size={13} /> Date izolate per cabinet · GDPR
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <LogOut size={13} /> Deconectare
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto">
        <Outlet context={{ org, doctors, activeDoctorId, refreshDoctors: loadOrgAndDoctors }} />
      </div>

      {showAddDoctor && (
        <Modal title="Medic nou" onClose={() => setShowAddDoctor(false)}>
          <Field label="Nume"><input style={inputStyle} value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} placeholder="Dr. Popescu Ana" /></Field>
          <Field label="Specializare (opțional)"><input style={inputStyle} value={doctorForm.specialty} onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })} placeholder="Medicină de familie..." /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddDoctor(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft }}>Renunță</button>
            <button onClick={addDoctor} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Adaugă</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
