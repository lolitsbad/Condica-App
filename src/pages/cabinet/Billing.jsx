import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { C, formatDateShort, getTodayStr } from '../../lib/helpers';
import { Modal, Field, inputStyle } from '../../components/ui';

export default function Billing() {
  const { org, activeDoctorId } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [modal, setModal] = useState(null);
  const today = getTodayStr();

  async function load() {
    const { data } = await supabase.from('invoices').select('*').order('date', { ascending: false });
    setInvoices(data || []);
    const { data: p } = await supabase.from('patients').select('*');
    setPatients(p || []);
  }
  useEffect(() => { load(); }, []);

  async function save(form, editId) {
    if (editId) {
      await supabase.from('invoices').update(form).eq('id', editId);
    } else {
      const number = `FV-${String(invoices.length + 1).padStart(4, '0')}`;
      await supabase.from('invoices').insert({ ...form, number, org_id: org.id, doctor_id: activeDoctorId });
      await supabase.from('audit_log').insert({ org_id: org.id, action: 'factura', details: `Factură ${number} emisă pentru ${form.patient_name} · ${form.price} RON` });
    }
    setModal(null);
    load();
  }
  async function toggleStatus(inv) { await supabase.from('invoices').update({ status: inv.status === 'platita' ? 'neplatita' : 'platita' }).eq('id', inv.id); load(); }
  async function remove(id) { await supabase.from('invoices').delete().eq('id', id); load(); }

  const monthPrefix = today.slice(0, 7);
  const collectedThisMonth = useMemo(() => invoices.filter((i) => i.status === 'platita' && i.date.startsWith(monthPrefix)).reduce((s, i) => s + Number(i.price || 0), 0), [invoices, monthPrefix]);
  const unpaid = useMemo(() => invoices.filter((i) => i.status === 'neplatita'), [invoices]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>Facturare</h1>
        <button onClick={() => setModal({ mode: 'add' })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white condica-btn shadow-sm" style={{ backgroundColor: C.ink }}>
          <Plus size={16} /> Emite factură
        </button>
      </div>
      <p className="text-xs mb-6" style={{ color: C.inkSoft }}>Facturare pentru plată directă — fără raportare SIUI/CNAS.</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl p-4 condica-card" style={{ backgroundColor: C.sageBg }}>
          <div className="text-2xl font-semibold" style={{ color: C.sage, fontFamily: "'Fraunces', serif" }}>{collectedThisMonth.toLocaleString('ro-RO')} RON</div>
          <div className="text-xs mt-1" style={{ color: C.sage }}>Încasat luna asta</div>
        </div>
        <div className="rounded-2xl p-4 condica-card" style={{ backgroundColor: C.amberBg }}>
          <div className="text-2xl font-semibold" style={{ color: C.amber, fontFamily: "'Fraunces', serif" }}>{unpaid.length}</div>
          <div className="text-xs mt-1" style={{ color: C.amber }}>Facturi neplătite</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', border: `1.5px dashed ${C.line}` }}>
          <p className="text-sm" style={{ color: C.inkSoft }}>Nicio factură emisă încă.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {invoices.map((inv, i) => (
            <div key={inv.id} className="flex items-center gap-4 px-4 py-3 bg-white flex-wrap" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <div className="w-20 text-xs font-semibold" style={{ color: C.inkSoft }}>{inv.number}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: C.ink }}>{inv.patient_name}</div>
                <div className="text-xs truncate" style={{ color: C.inkSoft }}>{inv.description} · {formatDateShort(inv.date)}</div>
              </div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{Number(inv.price || 0).toLocaleString('ro-RO')} RON</div>
              <button onClick={() => toggleStatus(inv)}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: inv.status === 'platita' ? C.sageBg : C.amberBg, color: inv.status === 'platita' ? C.sage : C.amber }}>
                  {inv.status === 'platita' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {inv.status === 'platita' ? 'Plătită' : 'Neplătită'}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => setModal({ mode: 'edit', data: inv })} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.inkSoft }}><Pencil size={15} /></button>
                <button onClick={() => remove(inv.id)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: C.coral }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <InvoiceForm initial={modal.data} patients={patients} onCancel={() => setModal(null)} onSave={(f) => save(f, modal.data?.id)} />}
    </div>
  );
}

function InvoiceForm({ initial, patients, onCancel, onSave }) {
  const [form, setForm] = useState({
    patient_name: initial?.patient_name || '', description: initial?.description || '',
    price: initial?.price || '', date: initial?.date || getTodayStr(), status: initial?.status || 'neplatita',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title={initial ? 'Editează factura' : 'Factură nouă'} onClose={onCancel}>
      <Field label="Pacient">
        <input list="patients-list" style={inputStyle} value={form.patient_name} onChange={set('patient_name')} placeholder="Nume pacient" />
        <datalist id="patients-list">{patients.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      </Field>
      <Field label="Serviciu / descriere"><input style={inputStyle} value={form.description} onChange={set('description')} placeholder="Consultație..." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preț (RON)"><input type="number" style={inputStyle} value={form.price} onChange={set('price')} /></Field>
        <Field label="Data"><input type="date" style={inputStyle} value={form.date} onChange={set('date')} /></Field>
      </div>
      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={set('status')}>
          <option value="neplatita">Neplătită</option>
          <option value="platita">Plătită</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: C.inkSoft }}>Renunță</button>
        <button onClick={() => form.patient_name && form.price && onSave({ ...form, price: Number(form.price) })} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: C.ink }}>Salvează</button>
      </div>
    </Modal>
  );
}
