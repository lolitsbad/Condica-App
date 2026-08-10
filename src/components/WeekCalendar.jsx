import React, { useMemo } from 'react';
import { C, DAY_ORDER, DAYS_RO, getTodayStr, timeToMin, toDateStr } from '../lib/helpers';
import { SourceIcon } from './ui';

export default function WeekCalendar({ appointments, workingHours, weekStart, onSelectAppointment }) {
  const today = getTodayStr();
  const weekDates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const { startHour, endHour } = useMemo(() => {
    const enabled = DAY_ORDER.map((d) => workingHours[d]).filter((c) => c && c.enabled);
    if (!enabled.length) return { startHour: 8, endHour: 18 };
    const s = Math.min(...enabled.map((c) => Math.floor(timeToMin(c.start) / 60)));
    const e = Math.max(...enabled.map((c) => Math.ceil(timeToMin(c.end) / 60)));
    return { startHour: s, endHour: e > s ? e : s + 8 };
  }, [workingHours]);

  const pxPerHour = 56;
  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const gridHeight = (endHour - startHour) * pxPerHour;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="w-12 shrink-0" />
        {weekDates.map((d) => {
          const dateStr = toDateStr(d);
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className="flex-1 text-center py-2.5" style={{ backgroundColor: isToday ? C.violetBg : 'transparent', borderLeft: `1px solid ${C.line}` }}>
              <div className="text-[10px] uppercase" style={{ color: isToday ? C.violet : C.inkSoft }}>{DAYS_RO[d.getDay()].slice(0, 3)}</div>
              <div className="text-sm font-semibold" style={{ color: isToday ? C.violet : C.ink, fontFamily: "'Fraunces', serif" }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="flex overflow-y-auto" style={{ height: Math.min(gridHeight, 560) }}>
        <div className="w-12 shrink-0 relative" style={{ height: gridHeight }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute right-2 text-[10px]" style={{ top: i * pxPerHour - 6, color: C.inkSoft }}>{h}:00</div>
          ))}
        </div>
        <div className="flex-1 flex relative" style={{ height: gridHeight, backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${pxPerHour - 1}px, ${C.line} ${pxPerHour - 1}px, ${C.line} ${pxPerHour}px)` }}>
          {weekDates.map((d) => {
            const dateStr = toDateStr(d);
            const isToday = dateStr === today;
            const dayAppts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelled');
            return (
              <div key={dateStr} className="flex-1 relative" style={{ borderLeft: `1px solid ${C.line}`, backgroundColor: isToday ? 'rgba(110,92,147,0.04)' : 'transparent' }}>
                {dayAppts.map((a) => {
                  const top = ((timeToMin(a.time) - startHour * 60) / 60) * pxPerHour;
                  const height = Math.max((Number(a.duration || 30) / 60) * pxPerHour - 2, 22);
                  const bg = a.status === 'pending' ? C.amberBg : a.status === 'no-show' ? C.coralBg : C.sageBg;
                  const bar = a.status === 'pending' ? C.amber : a.status === 'no-show' ? C.coral : C.sage;
                  return (
                    <button key={a.id} onClick={() => onSelectAppointment(a)}
                      className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden condica-btn"
                      style={{ top, height, backgroundColor: bg, borderLeft: `2.5px solid ${bar}` }}>
                      <div className="text-[10px] font-semibold truncate flex items-center gap-1" style={{ color: C.text }}><SourceIcon source={a.source} />{a.time} · {a.patient_name}</div>
                      {height > 32 && <div className="text-[9px] truncate" style={{ color: C.inkSoft }}>{a.reason || 'Consultație'}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
