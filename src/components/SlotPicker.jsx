import React, { useState, useEffect, useMemo } from 'react';
import { C, DAYS_RO, getAvailableSlots } from '../lib/helpers';

export default function SlotPicker({ appointments, workingHours, blockedDates, excludeId, value, onChange, compact, dayCount = 21 }) {
  const [internalDate, setInternalDate] = useState(value?.date || null);
  const days = useMemo(() => {
    const arr = [];
    const base = new Date();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push({ dateStr, slotsCount: getAvailableSlots(dateStr, workingHours, blockedDates, appointments, excludeId).length });
    }
    return arr;
  }, [workingHours, blockedDates, appointments, excludeId, dayCount]);

  useEffect(() => {
    if (!internalDate) {
      const first = days.find((d) => d.slotsCount > 0);
      setInternalDate(first ? first.dateStr : days[0]?.dateStr);
    }
  }, [days]); // eslint-disable-line

  const slots = useMemo(() => (internalDate ? getAvailableSlots(internalDate, workingHours, blockedDates, appointments, excludeId) : []), [internalDate, workingHours, blockedDates, appointments, excludeId]);
  const chipW = compact ? 'w-14' : 'w-16';
  const chipPad = compact ? 'py-2' : 'py-2.5';
  const dayLabelSize = compact ? 'text-[9px]' : 'text-[10px]';
  const dateNumSize = compact ? 'text-xs' : 'text-sm';
  const slotPad = compact ? 'py-1.5' : 'py-2';
  const slotSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {days.map((d) => {
          const isSelected = d.dateStr === internalDate;
          const has = d.slotsCount > 0;
          const dd = new Date(d.dateStr + 'T00:00:00');
          return (
            <button key={d.dateStr} onClick={() => setInternalDate(d.dateStr)} className={`shrink-0 ${chipW} rounded-lg ${chipPad} text-center condica-btn`}
              style={{ backgroundColor: isSelected ? C.ink : has ? '#fff' : C.paperDeep, border: `1px solid ${isSelected ? C.ink : C.line}`, opacity: has ? 1 : 0.5 }}>
              <div className={`${dayLabelSize} uppercase`} style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : C.inkSoft }}>{DAYS_RO[dd.getDay()].slice(0, 3)}</div>
              <div className={`${dateNumSize} font-semibold`} style={{ color: isSelected ? '#fff' : C.ink }}>{dd.getDate()}</div>
            </button>
          );
        })}
      </div>
      {slots.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-xs" style={{ backgroundColor: C.paperDeep, color: C.inkSoft }}>Nicio oră liberă în această zi.</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s) => (
            <button key={s} onClick={() => onChange(internalDate, s)} className={`${slotPad} rounded-lg ${slotSize} font-medium condica-btn`}
              style={{ backgroundColor: value?.date === internalDate && value?.time === s ? C.violet : C.violetBg, color: value?.date === internalDate && value?.time === s ? '#fff' : C.violet }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
