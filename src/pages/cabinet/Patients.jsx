import React, { useEffect, useState } from 'react';
import { Plus, Phone, Pencil, Trash2, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { C } from '../../lib/helpers';
import { Modal, Field, inputStyle } from '../../components/ui';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmEraseId, setConfirmEraseId] = useState(null);

  async function load() {
    const { data } = await supabase.from('patients').select('*').order('name');
    setPatients(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(form, editId) {
    if (editId) await supabase.from('patients').update(form).eq('id', editId);
    else await supabase.from('patients').insert(form);
    setModal(null);
    load();
  }

  async function eraseCompletely(p) {
    // GDPR: ștergere definitivă în cascadă
    await supabase.from('appointments').delete().ilike('patient_name', p.name);
    await supabase.from('sessions').delete().ilike('patient_name', p.name);
    await supabase.from('invoices').delete().ilike('patient_name', p.name);
    await supabase.from('packages').delete().ilike('patient_name', p.name);
    await supabase.from('patients').delete().eq('id', p.id);
    await supabase.from('audit_log').insert({ action: 'gdpr', details: `Date șterse definitiv pentru ${p.name} (drept la ștergere GDPR)` });
    setConfirmEraseId(null);
    load();
  }

  function exportData(p) {
    const payload = { pacient: p, exportat_la: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `date-${p.name.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Pacienți</h1>
        <button onClick={() => setModal({ mode: 'add' })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white condica-btn shadow-sm" style={{ backgroundColor: C.ink }}>
          <Plus size={16} /> Adaugă pacient
        </button>
      </div>
      {patients.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', border: `1.5px dashed ${C.line}` }}>
          <p className="text-sm mb-3" style={{ color: C.inkSoft }}>Niciun pacient încă.</p>
          <button onClick={() => setModal({ mode: 'add' })} className="text-sm font-medium" style={{ color: C.violet }}>+ Adaugă primul pacient</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {patients.map((p) => (
            <div key={p.id} className="rounded-2xl p-4 bg-white shadow-sm condica-card" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{p.name}</div>
                  {p.phone && <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: C.inkSoft }}><Phone size={11} />{p.phone}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => exportData(p)} className="p-1.5 rounded-lg hover:bg-black/5" title="Exportă (GDPR)" style={{ color: C.inkSoft }}><Download size={14} /></button>
                  <button onClick={() => setModal({ mode: 'edit', data: p })} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.inkSoft }}><Pencil size={14} /></button>
                  <button onClick={() => setConfirmEraseId(p.id)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.coral }}><Trash2 size={14} /></button>
                </div>
              </div>
              {p.notes && <p className="text-xs" style={{ color: C.inkSoft }}>{p.notes}</p>}
              {confirmEraseId === p.id && (
                <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${C.line}` }}>
                  <span className="text-xs" style={{ color: C.coral }}>Șterge definitiv toate datele (GDPR)?</span>
                  <button onClick={() => eraseCompletely(p)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: C.coral }}>Da, șterge tot</button>
                  <button onClick={() => setConfirmEraseId(null)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ color: C.inkSoft }}>Nu</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && <PatientForm initial={modal.data} onCancel={() => setModal(null)} onSave={(f) => save(f, modal.data?.id)} />}
    </div>
  );
}

function PatientForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({ name: initial?.name || '', phone: initial?.phone || '', notes: initial?.notes || '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title={initial ? 'Editează pacient' : 'Pacient nou'} onClose={onCancel}>
      <Field label="Nume"><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Nume complet" /></Field>
      <Field label="Telefon"><input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="07xx xxx xxx" /></Field>
      <Field label="Notițe medicale / observații"><textarea style={inputStyle} rows={3} value={form.notes} onChange={set('notes')} placeholder="Alergii, afecțiuni cronice..." /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft }}>Renunță</button>
        <button onClick={() => form.name && onSave(form)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Salvează</button>
      </div>
    </Modal>
  );
}
