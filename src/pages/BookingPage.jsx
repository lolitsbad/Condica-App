import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C, DEFAULT_HOURS, formatDateLong, formatDateShort, getTodayStr } from '../lib/helpers';
import { PulseDivider, StatusBadge, Field, inputStyle, ThemeToggle } from '../components/ui';
import SlotPicker from '../components/SlotPicker';

export default function BookingPage() {
  const { slug } = useParams();
  const [org, setOrg] = useState(undefined); // undefined = loading, null = not found
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [workingHours, setWorkingHours] = useState(DEFAULT_HOURS);
  const [blockedDates, setBlockedDates] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [tab, setTab] = useState('book');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', reason: '' });
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const [lookupPhone, setLookupPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [myAppts, setMyAppts] = useState([]);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleSel, setRescheduleSel] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: orgData } = await supabase.from('organizations').select('*').eq('slug', slug).maybeSingle();
      setOrg(orgData || null);
      if (orgData) {
        const { data: docs } = await supabase.from('doctors').select('*').eq('org_id', orgData.id).order('created_at');
        setDoctors(docs || []);
        setSelectedDoctorId(docs && docs[0]?.id);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!selectedDoctorId || !org) return;
    (async () => {
      const { data: wh } = await supabase.from('working_hours').select('*').eq('doctor_id', selectedDoctorId);
      if (wh && wh.length) {
        const map = {};
        wh.forEach((row) => { map[row.day_of_week] = { enabled: row.enabled, start: row.start_time, end: row.end_time, slot: row.slot_minutes, breakStart: row.break_start, breakEnd: row.break_end }; });
        setWorkingHours(map);
      }
      const { data: bd } = await supabase.from('blocked_dates').select('*').eq('doctor_id', selectedDoctorId);
      setBlockedDates(bd || []);
      const { data: appts } = await supabase.rpc('get_org_busy_slots', { p_org_id: org.id, p_doctor_id: selectedDoctorId });
      setAppointments(appts || []);
    })();
  }, [selectedDoctorId, org]);

  async function submitBooking() {
    if (!form.name.trim() || !form.phone.trim() || !selectedSlot || !consent || !org) return;
    const dow = new Date(selectedDate + 'T00:00:00').getDay();
    const duration = (workingHours[dow] && workingHours[dow].slot) || 30;
    await supabase.from('appointments').insert({
      org_id: org.id, doctor_id: selectedDoctorId, patient_name: form.name.trim(), phone: form.phone.trim(),
      date: selectedDate, time: selectedSlot, duration, reason: form.reason.trim(), status: 'confirmed', source: 'online',
    });
    fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'Scrii un mesaj SCURT de confirmare a unei programări medicale, în limba română, ca pentru SMS. Răspunde DOAR cu textul mesajului.',
        messages: [{ role: 'user', content: `Confirmă programarea pentru ${form.name}, ${formatDateLong(selectedDate)}, ora ${selectedSlot}.` }],
      }),
    }).then((r) => r.json()).then((d) => {
      supabase.from('notifications').insert({ org_id: org.id, type: 'created', patient_name: form.name.trim(), date: selectedDate, time: selectedSlot, message: d.text || '' });
    }).catch(() => {});

    const notifyEmail = doctors.find((d) => d.id === selectedDoctorId)?.notify_email;
    if (notifyEmail) {
      fetch('/api/notify-doctor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: notifyEmail, patientName: form.name.trim(), date: selectedDate, time: selectedSlot, reason: form.reason.trim() }),
      }).catch(() => {});
    }
    setConfirmed({ date: selectedDate, time: selectedSlot, name: form.name.trim() });
  }
  function resetBooking() { setConfirmed(null); setSelectedSlot(null); setSelectedDate(null); setForm({ name: '', phone: '', reason: '' }); setConsent(false); }

  async function search() {
    if (!org) return;
    setSearched(true);
    const { data } = await supabase.rpc('get_my_appointments', { p_org_id: org.id, p_phone: lookupPhone.trim() });
    setMyAppts(data || []);
  }
  async function cancelMine(id) {
    await supabase.rpc('cancel_my_appointment', { p_id: id, p_org_id: org.id, p_phone: lookupPhone.trim() });
    setConfirmCancelId(null);
    search();
  }
  async function rescheduleMine(id) {
    await supabase.rpc('reschedule_my_appointment', { p_id: id, p_org_id: org.id, p_phone: lookupPhone.trim(), p_date: rescheduleSel.date, p_time: rescheduleSel.time });
    setReschedulingId(null); setRescheduleSel(null);
    search();
  }

  const today = getTodayStr();

  if (org === undefined) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paper }} />;

  if (org === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: C.paper }}>
        <div>
          <h1 className="text-lg font-semibold mb-2" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Cabinet negăsit</h1>
          <p className="text-sm" style={{ color: C.inkSoft }}>Linkul de programare nu corespunde niciunui cabinet activ. Verifică-l cu cabinetul respectiv.</p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)` }}>
        <div className="max-w-md w-full text-center rounded-3xl p-8 shadow-xl condica-fade" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.sageBg }}><Check size={26} style={{ color: C.sage }} /></div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Programare confirmată</h2>
          <p className="text-sm mb-1" style={{ color: C.inkSoft }}>{confirmed.name}, te așteptăm</p>
          <p className="text-sm mb-6 font-medium" style={{ color: C.text }}>{formatDateLong(confirmed.date)} · ora {confirmed.time}</p>
          <button onClick={resetBooking} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Fă o altă programare</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: `radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, ${C.paper} 65%)`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="p-6 md:p-10 max-w-2xl mx-auto w-full">
        <div className="flex justify-end mb-2">
          <ThemeToggle />
        </div>
        <div className="text-center mb-6 condica-fade">
          <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.violet }}>{org.name}</div>
          <h1 className="text-3xl font-semibold mb-2" style={{ color: C.text, fontFamily: "'Fraunces', serif", letterSpacing: '-0.01em' }}>Alege-ți ora, în câteva secunde</h1>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Vezi disponibilitatea reală a cabinetului și confirmă instant — fără telefon.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Confirmare instantă', 'Fără apel telefonic', 'Date securizate'].map((t) => (
              <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: C.sageBg, color: C.sage }}>{t}</span>
            ))}
          </div>
        </div>
        <PulseDivider />

        <div className="flex justify-center my-6">
          <div className="flex items-center gap-1 p-1 rounded-full" style={{ backgroundColor: C.paperDeep }}>
            <button onClick={() => setTab('book')} className="px-4 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: tab === 'book' ? '#fff' : 'transparent', color: tab === 'book' ? C.ink : C.inkSoft }}>Programează-te</button>
            <button onClick={() => setTab('manage')} className="px-4 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: tab === 'manage' ? '#fff' : 'transparent', color: tab === 'manage' ? C.ink : C.inkSoft }}>Programarea mea</button>
          </div>
        </div>

        {tab === 'book' ? (
          <>
            {doctors.length > 1 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: C.inkSoft }}>Alege medicul</h3>
                <div className="flex gap-2 flex-wrap">
                  {doctors.map((d) => (
                    <button key={d.id} onClick={() => { setSelectedDoctorId(d.id); setSelectedDate(null); setSelectedSlot(null); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium condica-btn"
                      style={{ backgroundColor: selectedDoctorId === d.id ? C.ink : '#fff', color: selectedDoctorId === d.id ? '#fff' : C.ink, border: `1px solid ${selectedDoctorId === d.id ? C.ink : C.line}` }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: C.inkSoft }}>Alege ziua și ora</h3>
            <SlotPicker appointments={appointments} workingHours={workingHours} blockedDates={blockedDates}
              value={selectedSlot ? { date: selectedDate, time: selectedSlot } : null}
              onChange={(date, time) => { setSelectedDate(date); setSelectedSlot(time); }} />

            {selectedSlot && (
              <div className="rounded-2xl p-5 mt-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: C.text }}>Datele tale</h3>
                <Field label="Nume complet"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Numele tău" /></Field>
                <Field label="Telefon"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" /></Field>
                <Field label="Motivul vizitei (opțional)"><input style={inputStyle} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Consultație..." /></Field>
                <label className="flex items-start gap-2 mb-4 text-xs" style={{ color: C.inkSoft }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>Sunt de acord ca datele mele să fie folosite exclusiv pentru gestionarea acestei programări, conform GDPR. <ShieldCheck size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Date criptate, stocate în UE.</span>
                </label>
                <button onClick={submitBooking} disabled={!form.name.trim() || !form.phone.trim() || !consent} className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 condica-btn shadow-sm" style={{ backgroundColor: C.ink }}>
                  Confirmă programarea · {selectedDate && formatDateShort(selectedDate)} ora {selectedSlot}
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: C.inkSoft }}>Găsește programarea ta</h3>
            <div className="flex gap-2 mb-6">
              <input style={inputStyle} value={lookupPhone} onChange={(e) => { setLookupPhone(e.target.value); setSearched(false); }} placeholder="Numărul de telefon folosit la programare" />
              <button onClick={search} className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0" style={{ backgroundColor: C.ink }}>Caută</button>
            </div>
            {searched && myAppts.length === 0 && (
              <div className="rounded-2xl p-6 text-center text-sm" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>Nu am găsit nicio programare activă pentru acest număr.</div>
            )}
            {myAppts.map((a) => (
              <div key={a.id} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{formatDateLong(a.date)} · ora {a.time}</div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs mb-3" style={{ color: C.inkSoft }}>{a.reason || 'Consultație'}</div>
                {reschedulingId === a.id ? (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: C.inkSoft }}>Alege o oră nouă</p>
                    <SlotPicker appointments={appointments} workingHours={workingHours} blockedDates={blockedDates} excludeId={a.id} compact
                      value={rescheduleSel} onChange={(date, time) => setRescheduleSel({ date, time })} />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setReschedulingId(null); setRescheduleSel(null); }} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft, border: `1px solid ${C.line}` }}>Renunță</button>
                      <button disabled={!rescheduleSel} onClick={() => rescheduleMine(a.id)} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: C.ink }}>Confirmă noua oră</button>
                    </div>
                  </div>
                ) : confirmCancelId === a.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: C.coral }}>Sigur anulezi această programare?</span>
                    <button onClick={() => cancelMine(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: C.coral }}>Da, anulează</button>
                    <button onClick={() => setConfirmCancelId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: C.inkSoft }}>Nu</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setReschedulingId(a.id); setRescheduleSel(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: C.violetBg, color: C.violet }}><RefreshCw size={12} /> Reprogramează</button>
                    <button onClick={() => setConfirmCancelId(a.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: C.coralBg, color: C.coral }}><X size={12} /> Anulează</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
