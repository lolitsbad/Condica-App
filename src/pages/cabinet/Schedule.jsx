import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Ban } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { C, DAY_LABEL, DAY_ORDER, DEFAULT_HOURS, formatDateShort, getTodayStr } from '../../lib/helpers';
import { Modal, Field, inputStyle } from '../../components/ui';

export default function Schedule() {
  const { org, activeDoctorId } = useOutletContext();
  const [workingHours, setWorkingHoursState] = useState(DEFAULT_HOURS);
  const [blockedDates, setBlockedDates] = useState([]);
  const [reminderSettings, setReminderSettingsState] = useState({ enabled: true, hours_before: 24 });
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: getTodayStr(), all_day: true, start_time: '', end_time: '', reason: '' });

  async function load() {
    if (!activeDoctorId || !org) return;
    const { data: wh } = await supabase.from('working_hours').select('*').eq('doctor_id', activeDoctorId);
    if (wh && wh.length) {
      const map = {};
      wh.forEach((row) => { map[row.day_of_week] = { enabled: row.enabled, start: row.start_time, end: row.end_time, slot: row.slot_minutes, breakStart: row.break_start, breakEnd: row.break_end }; });
      setWorkingHoursState(map);
    }
    const { data: bd } = await supabase.from('blocked_dates').select('*').eq('doctor_id', activeDoctorId).order('date');
    setBlockedDates(bd || []);
    const { data: rs } = await supabase.from('reminder_settings').select('*').eq('org_id', org.id).maybeSingle();
    if (rs) setReminderSettingsState(rs);
    const { data: doc } = await supabase.from('doctors').select('notify_email').eq('id', activeDoctorId).maybeSingle();
    setNotifyEmail(doc?.notify_email || '');
  }
  useEffect(() => { load(); }, [activeDoctorId, org]); // eslint-disable-line

  async function saveNotifyEmail(value) {
    setNotifyEmail(value);
    await supabase.from('doctors').update({ notify_email: value }).eq('id', activeDoctorId);
  }

  async function updateDay(dow, patch) {
    const cfg = { ...workingHours[dow], ...patch };
    setWorkingHoursState({ ...workingHours, [dow]: cfg });
    await supabase.from('working_hours').upsert({
      org_id: org.id, doctor_id: activeDoctorId, day_of_week: dow, enabled: cfg.enabled, start_time: cfg.start,
      end_time: cfg.end, slot_minutes: cfg.slot, break_start: cfg.breakStart, break_end: cfg.breakEnd,
    }, { onConflict: 'doctor_id,day_of_week' });
  }
  async function addBlocked() {
    if (!blockForm.date) return;
    await supabase.from('blocked_dates').insert({ ...blockForm, org_id: org.id, doctor_id: activeDoctorId });
    setShowBlockForm(false);
    setBlockForm({ date: getTodayStr(), all_day: true, start_time: '', end_time: '', reason: '' });
    load();
  }
  async function removeBlocked(id) { await supabase.from('blocked_dates').delete().eq('id', id); load(); }
  async function updateReminderSettings(patch) {
    const next = { ...reminderSettings, ...patch };
    setReminderSettingsState(next);
    await supabase.from('reminder_settings').upsert({ org_id: org.id, ...next }, { onConflict: 'org_id' });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Program de lucru</h1>
      <p className="text-sm mb-6" style={{ color: C.inkSoft }}>Pacienții văd și se pot programa doar în intervalele libere de mai jos.</p>

      <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#fff', border: `1px solid ${C.line}` }}>
        <label className="block text-sm font-medium mb-2" style={{ color: C.ink }}>Email pentru notificări de programări noi</label>
        <input type="email" style={inputStyle} value={notifyEmail} onChange={(e) => saveNotifyEmail(e.target.value)} placeholder="doctor@cabinet.ro" />
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Primești un email de îndată ce un pacient se programează online prin pagina publică.</p>
      </div>

      <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#fff', border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: C.ink }}>
            <input type="checkbox" checked={reminderSettings.enabled} onChange={(e) => updateReminderSettings({ enabled: e.target.checked })} />
            Mementouri automate către pacienți
          </label>
          {reminderSettings.enabled && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
              <span>cu</span>
              <input type="number" value={reminderSettings.hours_before} onChange={(e) => updateReminderSettings({ hours_before: Number(e.target.value) })} style={{ ...inputStyle, width: '70px' }} />
              <span>ore înainte</span>
            </div>
          )}
        </div>
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Rulează cât timp ai Condica deschisă — pentru trimitere garantată în fundal, e nevoie de un job periodic (Vercel Cron).</p>
      </div>

      <div className="rounded-2xl overflow-hidden mb-8" style={{ border: `1px solid ${C.line}` }}>
        {DAY_ORDER.map((dow, i) => {
          const cfg = workingHours[dow] || { enabled: false, start: '09:00', end: '17:00', slot: 20, breakStart: '', breakEnd: '' };
          return (
            <div key={dow} className="flex items-center gap-4 px-4 py-3 bg-white flex-wrap" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <label className="flex items-center gap-2 w-32 shrink-0">
                <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateDay(dow, { enabled: e.target.checked })} />
                <span className="text-sm font-medium" style={{ color: C.ink }}>{DAY_LABEL[dow]}</span>
              </label>
              {cfg.enabled ? (
                <>
                  <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
                    <input type="time" value={cfg.start} onChange={(e) => updateDay(dow, { start: e.target.value })} style={{ ...inputStyle, width: '110px' }} />
                    <span>–</span>
                    <input type="time" value={cfg.end} onChange={(e) => updateDay(dow, { end: e.target.value })} style={{ ...inputStyle, width: '110px' }} />
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
                    <span>Consultație</span>
                    <select value={cfg.slot} onChange={(e) => updateDay(dow, { slot: Number(e.target.value) })} style={{ ...inputStyle, width: '90px' }}>
                      {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
                    <span>Pauză</span>
                    <input type="time" value={cfg.breakStart} onChange={(e) => updateDay(dow, { breakStart: e.target.value })} style={{ ...inputStyle, width: '100px' }} />
                    <span>–</span>
                    <input type="time" value={cfg.breakEnd} onChange={(e) => updateDay(dow, { breakEnd: e.target.value })} style={{ ...inputStyle, width: '100px' }} />
                  </div>
                </>
              ) : (
                <span className="text-sm" style={{ color: C.inkSoft }}>Cabinet închis</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Zile libere / concediu</h2>
        <button onClick={() => setShowBlockForm(true)} className="flex items-center gap-1 text-sm font-medium" style={{ color: C.violet }}><Plus size={15} /> Adaugă</button>
      </div>
      {blockedDates.length === 0 ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>Nicio zi liberă marcată.</p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {blockedDates.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3 bg-white" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <Ban size={14} style={{ color: C.coral }} />
              <span className="text-sm font-medium" style={{ color: C.ink }}>{formatDateShort(b.date)}</span>
              <span className="text-xs" style={{ color: C.inkSoft }}>{b.all_day ? 'toată ziua' : `${b.start_time}–${b.end_time}`}</span>
              {b.reason && <span className="text-xs" style={{ color: C.inkSoft }}>· {b.reason}</span>}
              <button onClick={() => removeBlocked(b.id)} className="ml-auto p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.coral }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showBlockForm && (
        <Modal title="Adaugă zi liberă" onClose={() => setShowBlockForm(false)}>
          <Field label="Data"><input type="date" style={inputStyle} value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} /></Field>
          <label className="flex items-center gap-2 mb-3 text-sm" style={{ color: C.ink }}>
            <input type="checkbox" checked={blockForm.all_day} onChange={(e) => setBlockForm({ ...blockForm, all_day: e.target.checked })} /> Toată ziua
          </label>
          {!blockForm.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="De la"><input type="time" style={inputStyle} value={blockForm.start_time} onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })} /></Field>
              <Field label="Până la"><input type="time" style={inputStyle} value={blockForm.end_time} onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })} /></Field>
            </div>
          )}
          <Field label="Motiv (opțional)"><input style={inputStyle} value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} placeholder="Concediu..." /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowBlockForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft }}>Renunță</button>
            <button onClick={addBlocked} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Salvează</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
