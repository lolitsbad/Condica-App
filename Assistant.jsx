import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { C, DEFAULT_HOURS, callAssistant, formatDateLong, getTodayStr, stripFences, summarizeWorkingHours } from '../../lib/helpers';

export default function Assistant() {
  const { org, doctors, activeDoctorId } = useOutletContext();
  const activeDoctor = doctors.find((d) => d.id === activeDoctorId);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bună! Sunt asistentul tău pentru agendă. Pot programa pacienți din limbaj natural sau pot răspunde la întrebări despre orar. Cu ce te ajut?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(raw) {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const today = getTodayStr();
    const { data: appts } = await supabase.from('appointments').select('*').eq('doctor_id', activeDoctorId).gte('date', today).order('date').order('time').limit(25);
    const { data: wh } = await supabase.from('working_hours').select('*').eq('doctor_id', activeDoctorId);
    let workingHours = DEFAULT_HOURS;
    if (wh && wh.length) {
      const map = {};
      wh.forEach((row) => { map[row.day_of_week] = { enabled: row.enabled, start: row.start_time, end: row.end_time, slot: row.slot_minutes, breakStart: row.break_start, breakEnd: row.break_end }; });
      workingHours = map;
    }
    const upcoming = (appts || []).map((a) => `- ${a.date} ${a.time} — ${a.patient_name} (${a.reason || 'fără motiv specificat'}) [${a.status}]`).join('\n');

    const system = `Ești asistentul AI din Condica, agenda de programări a dr. ${activeDoctor?.name || 'cabinetului'}, cabinet medical privat din România. Data de azi este ${today} (${formatDateLong(today)}).
Programul de lucru: ${summarizeWorkingHours(workingHours)}.
Programările existente (viitoare):
${upcoming || '(nu există programări viitoare)'}

Poți să: creezi o programare nouă când medicul cere asta în limbaj natural, sau să răspunzi la întrebări despre agendă.
Răspunde STRICT cu un obiect JSON, fără text în afara lui, fără marcaje de cod, în formatul exact:
{"reply": "textul răspunsului tău, în română, conversațional și scurt", "action": "create_appointment" sau "none", "appointment": {"patientName": "", "phone": "", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": 30, "reason": ""} sau null}
Reguli: dacă cererea nu conține suficiente detalii, folosește action "none" și cere lămuriri. Interpretează expresii relative ("mâine", "joi viitor") față de data de azi. Dacă acțiunea este create_appointment, reply trebuie să confirme programarea.`;

    try {
      const text = await callAssistant(system, newMessages.map((m) => ({ role: m.role, content: m.content })));
      let parsed;
      try { parsed = JSON.parse(stripFences(text)); } catch (e) { parsed = { reply: text, action: 'none', appointment: null }; }
      if (parsed.action === 'create_appointment' && parsed.appointment?.patientName && parsed.appointment?.date && parsed.appointment?.time) {
        const a = parsed.appointment;
        await supabase.from('appointments').insert({
          org_id: org.id, doctor_id: activeDoctorId, patient_name: a.patientName, phone: a.phone || '', date: a.date, time: a.time,
          duration: a.duration || 30, reason: a.reason || '', status: 'confirmed', source: 'ai',
        });
        const { data: existing } = await supabase.from('patients').select('id').ilike('name', a.patientName).maybeSingle();
        if (!existing) await supabase.from('patients').insert({ org_id: org.id, name: a.patientName, phone: a.phone || '' });
      }
      setMessages([...newMessages, { role: 'assistant', content: parsed.reply || text }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Îmi pare rău, am întâmpinat o eroare la conectare. Încearcă din nou.' }]);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 flex flex-col h-screen max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Asistent AI</h1>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>Scrie în limbaj natural — de exemplu: „Programează-l pe Ion Popescu joi la 10:00 pentru control”</p>
      <div className="flex-1 rounded-2xl p-4 overflow-y-auto mb-3" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm" style={{ backgroundColor: m.role === 'user' ? C.violet : C.paperDeep, color: m.role === 'user' ? '#fff' : C.ink }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="rounded-2xl px-4 py-2 text-sm flex items-center gap-2" style={{ backgroundColor: C.paperDeep, color: C.inkSoft }}><Loader2 size={14} className="animate-spin" /> scrie...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {['Rezumă ziua de azi', 'Cine are programare mâine?'].map((q) => (
          <button key={q} onClick={() => send(q)} className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: C.violetBg, color: C.violet }}>{q}</button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Scrie un mesaj..." rows={1} className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none" style={{ border: `1px solid ${C.line}`, backgroundColor: C.surface, color: C.text }} />
        <button onClick={() => send()} disabled={loading} className="p-2.5 rounded-xl text-white disabled:opacity-50" style={{ backgroundColor: C.violet }}><Send size={17} /></button>
      </div>
    </div>
  );
}
