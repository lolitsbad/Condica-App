import React, { useState } from 'react';
import { X, Check, Copy, CheckCircle2, AlertCircle, XCircle, UserX, Globe, Sparkles, Sun, Moon } from 'lucide-react';
import { C } from '../lib/helpers';
import { useTheme } from '../lib/theme';

export function PulseDivider({ color = C.violet }) {
  return (
    <svg viewBox="0 0 400 24" className="w-full h-5" preserveAspectRatio="none">
      <polyline points="0,12 130,12 145,3 158,21 172,12 400,12" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" className="condica-pulse-line" />
    </svg>
  );
}

export function StatusBadge({ status }) {
  const map = {
    confirmed: { label: 'Confirmată', bg: C.sageBg, fg: C.sage, Icon: CheckCircle2 },
    pending: { label: 'În așteptare', bg: C.amberBg, fg: C.amber, Icon: AlertCircle },
    cancelled: { label: 'Anulată', bg: C.coralBg, fg: C.coral, Icon: XCircle },
    'no-show': { label: 'Nu s-a prezentat', bg: C.coralBg, fg: C.coral, Icon: UserX },
  };
  const s = map[status] || map.confirmed;
  const { Icon } = s;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.fg }}>
      <Icon size={12} /> {s.label}
    </span>
  );
}

export function SourceIcon({ source }) {
  if (source === 'online') return <Globe size={13} style={{ color: C.violet }} />;
  if (source === 'ai') return <Sparkles size={13} style={{ color: C.violet }} />;
  return null;
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(27,43,75,0.45)' }}>
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto condica-fade`} style={{ backgroundColor: C.paper, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5" style={{ color: C.inkSoft }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium mb-1" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '10px', border: `1px solid ${C.line}`, backgroundColor: C.surface, color: C.text, fontSize: '14px', outline: 'none' };

export function ThemeToggle({ light }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 condica-btn" title={theme === 'dark' ? 'Comută pe mod luminos' : 'Comută pe mod întunecat'}
      style={{ color: light ? 'rgba(255,255,255,0.6)' : C.textSoft }}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} }}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
      style={{ backgroundColor: copied ? C.sage : C.ink }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiat' : 'Copiază mesajul'}
    </button>
  );
}
