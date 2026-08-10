import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { C, formatDateLong, getTodayStr } from '../../lib/helpers';
import { PulseDivider, StatusBadge, SourceIcon } from '../../components/ui';

export default function Dashboard() {
  const { doctors, activeDoctorId } = useOutletContext();
  const activeDoctor = doctors.find((d) => d.id === activeDoctorId);
  const [appointments, setAppointments] = useState([]);
  const [patientCount, setPatientCount] = useState(0);
  const today = getTodayStr();

  useEffect(() => {
    if (!activeDoctorId) return;
    (async () => {
      const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
      const { data } = await supabase.from('appointments').select('*').eq('doctor_id', activeDoctorId)
        .gte('date', today).lte('date', weekEnd.toISOString().slice(0, 10)).order('date').order('time');
      setAppointments(data || []);
      const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true });
      setPatientCount(count || 0);
    })();
  }, [activeDoctorId]); // eslint-disable-line

  const todays = appointments.filter((a) => a.date === today);
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Bună ziua, {activeDoctor?.name || 'Doctore'}</h1>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>{formatDateLong(today)}</p>
      <PulseDivider />
      <div className="grid grid-cols-4 gap-4 mt-6 mb-8">
        {[
          { label: 'Programări azi', value: todays.length, bg: C.sageBg, fg: C.sage },
          { label: 'Următoarele 7 zile', value: appointments.length, bg: C.violetBg, fg: C.violet },
          { label: 'Total pacienți', value: patientCount, bg: C.paperDeep, fg: C.ink },
          { label: 'În așteptare', value: pendingCount, bg: C.amberBg, fg: C.amber },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 condica-card" style={{ backgroundColor: s.bg }}>
            <div className="text-2xl font-semibold" style={{ color: s.fg, fontFamily: "'Fraunces', serif" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: s.fg }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: C.inkSoft }}>Programul de azi</h2>
      {todays.length === 0 ? (
        <div className="rounded-2xl p-6 text-sm" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>Nicio programare azi.</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {todays.map((a, i) => (
            <div key={a.id} className="flex items-center gap-4 px-4 py-3" style={{ backgroundColor: C.surface, borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <div className="w-14 text-sm font-semibold" style={{ color: C.text }}>{a.time}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: C.text }}><SourceIcon source={a.source} />{a.patient_name}</div>
                <div className="text-xs truncate" style={{ color: C.inkSoft }}>{a.reason || 'Consultație'}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
