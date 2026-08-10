import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Clock, Phone, Pencil, Trash2, UserX } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { C, DEFAULT_HOURS, formatDateLong, formatDateShort, getMonday, getTodayStr, rangesOverlap, toDateStr, uid } from '../../lib/helpers';
import { Modal, Field, StatusBadge, SourceIcon, inputStyle } from '../../components/ui';
import WeekCalendar from '../../components/WeekCalendar';

export default function Appointments() {
  const { org, activeDoctorId } = useOutletContext();
  const [appointments, setAppointments] = useState([]);
  const [workingHours, setWorkingHours] = useState(DEFAULT_HOURS);
  const [apptView, setApptView] = useState('list');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [modal, setModal] = useState(null);
  const today = getTodayStr();

  async function load() {
    if (!activeDoctorId) return;
    const { data } = await supabase.from('appointments').select('*').eq('doctor_id', activeDoctorId).order('date').order('time');
    setAppointments(data || []);
    const { data: wh } = await supabase.from('working_hours').select('*').eq('doctor_id', activeDoctorId);
    if (wh && wh.length) {
      const map = {};
      wh.forEach((row) => { map[row.day_of_week] = { enabled: row.enabled, start: row.start_time, end: row.end_time, slot: row.slot_minutes, breakStart: row.break_start, breakEnd: row.break_end }; });
      setWorkingHours(map);
    } else {
      setWorkingHours(DEFAULT_HOURS);
    }
  }
  useEffect(() => { load(); }, [activeDoctorId]); // eslint-disable-line

  async function saveAppointment(form, editId) {
    const payload = { patient_name: form.patient_name, phone: form.phone, date: form.date, time: form.time, duration: Number(form.duration), reason: form.reason, status: form.status, notes: form.notes, doctor_id: activeDoctorId };
    if (editId) await supabase.from('appointments').update(payload).eq('id', editId);
    else {
      await supabase.from('appointments').insert({ ...payload, org_id: org.id, source: 'doctor' });
      const { data: existing } = await supabase.from('patients').select('id').ilike('name', form.patient_name).maybeSingle();
      if (!existing) await supabase.from('patients').insert({ org_id: org.id, name: form.patient_name, phone: form.phone });
    }
    setModal(null);
    load();
  }
  async function markNoShow(id) { await supabase.from('appointments').update({ status: 'no-show' }).eq('id', id); load(); }
  async function removeAppt(id) { await supabase.from('appointments').delete().eq('id', id); load(); }

  const grouped = useMemo(() => {
    const groups = {};
    appointments.forEach((a) => { if (!groups[a.date]) groups[a.date] = []; groups[a.date].push(a); });
    return groups;
  }, [appointments]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Programări</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-full" style={{ backgroundColor: C.paperDeep }}>
            <button onClick={() => setApptView('list')} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: apptView === 'list' ? '#fff' : 'transparent', color: apptView === 'list' ? C.ink : C.inkSoft }}>Listă</button>
            <button onClick={() => setApptView('week')} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: apptView === 'week' ? '#fff' : 'transparent', color: apptView === 'week' ? C.ink : C.inkSoft }}>Săptămânal</button>
          </div>
          <button onClick={() => setModal({ mode: 'add' })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white condica-btn shadow-sm" style={{ backgroundColor: C.ink }}>
            <Plus size={16} /> Adaugă programare
          </button>
        </div>
      </div>

      {apptView === 'week' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.inkSoft }}><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium" style={{ color: C.ink }}>{formatDateShort(toDateStr(weekStart))} – {formatDateShort(toDateStr(new Date(weekStart.getTime() + 6 * 86400000)))}</span>
            <button onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.inkSoft }}><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => setWeekStart(getMonday(new Date()))} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: C.violetBg, color: C.violet }}>Azi</button>
        </div>
      )}

      {apptView === 'week' ? (
        <WeekCalendar appointments={appointments} workingHours={workingHours} weekStart={weekStart} onSelectAppointment={(a) => setModal({ mode: 'edit', data: a })} />
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', border: `1.5px dashed ${C.line}` }}>
          <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Nicio programare încă.</p>
          <button onClick={() => setModal({ mode: 'add' })} className="text-sm font-medium" style={{ color: C.violet }}>+ Adaugă prima programare</button>
        </div>
      ) : (
        Object.keys(grouped).sort().map((date) => (
          <div key={date} className="mb-6">
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: date === today ? C.violet : C.inkSoft }}>{formatDateLong(date)} {date === today && '· azi'}</h3>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
              {grouped[date].map((a, i) => (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 bg-white" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <div className="w-14 text-sm font-semibold flex items-center gap-1" style={{ color: C.ink }}><Clock size={13} style={{ color: C.inkSoft }} /> {a.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: C.ink }}><SourceIcon source={a.source} />{a.patient_name}</div>
                    <div className="text-xs truncate flex items-center gap-2" style={{ color: C.inkSoft }}>
                      {a.phone && <span className="flex items-center gap-1"><Phone size={11} />{a.phone}</span>}
                      <span>{a.reason || 'Consultație'}</span>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => markNoShow(a.id)} className="p-1.5 rounded-lg hover:bg-black/5" title="Marchează ca neprezentare" style={{ color: C.inkSoft }}><UserX size={15} /></button>
                    <button onClick={() => setModal({ mode: 'edit', data: a })} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.inkSoft }}><Pencil size={15} /></button>
                    <button onClick={() => removeAppt(a.id)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.coral }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modal && <ApptForm initial={modal.data} appointments={appointments} onCancel={() => setModal(null)} onSave={(form) => saveAppointment(form, modal.data?.id)} />}
    </div>
  );
}

function ApptForm({ initial, appointments, onCancel, onSave }) {
  const [form, setForm] = useState({
    patient_name: initial?.patient_name || '', phone: initial?.phone || '', date: initial?.date || getTodayStr(),
    time: initial?.time || '09:00', duration: initial?.duration || 30, reason: initial?.reason || '',
    status: initial?.status || 'confirmed', notes: initial?.notes || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const conflict = (appointments || []).find((a) => a.id !== initial?.id && a.date === form.date && a.status !== 'cancelled' && rangesOverlap(a.time, a.duration, form.time, form.duration));
  return (
    <Modal title={initial ? 'Editează programarea' : 'Programare nouă'} onClose={onCancel}>
      <Field label="Nume pacient"><input style={inputStyle} value={form.patient_name} onChange={set('patient_name')} placeholder="Ion Popescu" /></Field>
      <Field label="Telefon"><input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="07xx xxx xxx" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input type="date" style={inputStyle} value={form.date} onChange={set('date')} /></Field>
        <Field label="Ora"><input type="time" style={inputStyle} value={form.time} onChange={set('time')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Durată (minute)"><input type="number" style={inputStyle} value={form.duration} onChange={set('duration')} /></Field>
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            <option value="confirmed">Confirmată</option>
            <option value="pending">În așteptare</option>
            <option value="no-show">Nu s-a prezentat</option>
            <option value="cancelled">Anulată</option>
          </select>
        </Field>
      </div>
      {conflict && <p className="text-xs mb-3 -mt-1" style={{ color: C.coral }}>⚠️ Se suprapune cu programarea lui {conflict.patient_name} la {conflict.time}</p>}
      <Field label="Motiv"><input style={inputStyle} value={form.reason} onChange={set('reason')} placeholder="Consultație, control, analize..." /></Field>
      <Field label="Notițe"><textarea style={inputStyle} rows={2} value={form.notes} onChange={set('notes')} /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft }}>Renunță</button>
        <button onClick={() => form.patient_name && form.date && form.time && onSave(form)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Salvează</button>
      </div>
    </Modal>
  );
}
