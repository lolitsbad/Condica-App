import React, { useEffect, useRef, useState } from 'react';
import { Activity, Calendar, Sparkles, Receipt, ArrowRight, Users, CheckCircle2 } from 'lucide-react';
import { C } from '../lib/helpers';
import { ThemeToggle } from '../components/ui';

function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ children, delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'perspective(800px) rotateX(0deg) translateY(0)' : 'perspective(800px) rotateX(8deg) translateY(20px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      transformOrigin: 'center bottom',
    }}>
      {children}
    </div>
  );
}

function CountUp({ to, suffix = '' }) {
  const [ref, inView] = useInView();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1400, start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, to]);
  return <span ref={ref} style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{val}{suffix}</span>;
}

function PatientsPanel({ lifted }) {
  const rows = [{ n: 'A. Popescu', t: 'Joi, 10:00' }, { n: 'M. Ionescu', t: 'Joi, 11:30' }, { n: 'R. Dumitru', t: 'Vin, 09:00' }, { n: 'L. Stan', t: 'Vin, 14:00' }];
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => (v >= rows.length ? 0 : v + 1)), 750);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, boxShadow: lifted ? `0 20px 40px -8px ${C.violet}33` : '0 4px 14px rgba(0,0,0,0.06)', transition: 'box-shadow 0.25s ease' }}>
      <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
        <Users size={13} style={{ color: C.textSoft }} />
        <span className="text-xs font-semibold" style={{ color: C.text }}>Pacienți</span>
      </div>
      <div className="p-2.5 space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.n} className="flex items-center justify-between text-[11px] rounded-md px-2.5 py-1.5" style={{
            backgroundColor: C.paperDeep, opacity: i < visible ? 1 : 0.15,
            transform: i < visible ? 'translateX(0)' : 'translateX(-6px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}>
            <span style={{ color: C.text, fontWeight: 500 }}>{r.n}</span>
            <span style={{ color: C.textSoft }}>{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoicePanel({ lifted }) {
  const invoices = [
    { id: '#0142', sum: '250 RON', delay: 0 },
    { id: '#0141', sum: '180 RON', delay: 1200 },
    { id: '#0140', sum: '250 RON', delay: 2400 },
  ];
  const [paidIdx, setPaidIdx] = useState(-1);
  useEffect(() => {
    const timers = invoices.map((inv, i) => setTimeout(() => setPaidIdx((p) => Math.max(p, i)), inv.delay + 400));
    const reset = setInterval(() => setPaidIdx(-1), 4200);
    return () => { timers.forEach(clearTimeout); clearInterval(reset); };
  }, []);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, boxShadow: lifted ? `0 20px 40px -8px ${C.amber}33` : '0 4px 14px rgba(0,0,0,0.06)', transition: 'box-shadow 0.25s ease' }}>
      <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
        <Receipt size={13} style={{ color: C.textSoft }} />
        <span className="text-xs font-semibold" style={{ color: C.text }}>Facturare</span>
      </div>
      <div className="p-2.5 space-y-1.5">
        {invoices.map((inv, i) => {
          const paid = i <= paidIdx;
          return (
            <div key={inv.id} className="flex items-center justify-between text-[11px] rounded-md px-2.5 py-1.5" style={{ backgroundColor: C.paperDeep }}>
              <span style={{ color: C.textSoft }}>{inv.id}</span>
              <span style={{ color: C.text, fontWeight: 500 }}>{inv.sum}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: paid ? C.sageBg : C.amberBg, color: paid ? C.sage : C.amber, transition: 'background-color 0.4s ease, color 0.4s ease' }}>
                {paid ? <CheckCircle2 size={9} /> : null} {paid ? 'Plătită' : 'Așteaptă'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssistantPanel({ lifted }) {
  const full = 'programează-l pe Popescu joi la 10';
  const [typed, setTyped] = useState('');
  const [replied, setReplied] = useState(false);
  useEffect(() => {
    let i = 0;
    function cycle() {
      setTyped(''); setReplied(false); i = 0;
      const typeId = setInterval(() => {
        i++;
        setTyped(full.slice(0, i));
        if (i >= full.length) { clearInterval(typeId); setTimeout(() => setReplied(true), 500); }
      }, 45);
      return typeId;
    }
    let typeId = cycle();
    const loop = setInterval(() => { clearInterval(typeId); typeId = cycle(); }, 5200);
    return () => { clearInterval(typeId); clearInterval(loop); };
  }, []);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, boxShadow: lifted ? `0 20px 40px -8px ${C.sage}33` : '0 4px 14px rgba(0,0,0,0.06)', transition: 'box-shadow 0.25s ease' }}>
      <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
        <Sparkles size={13} style={{ color: C.textSoft }} />
        <span className="text-xs font-semibold" style={{ color: C.text }}>Asistent AI</span>
      </div>
      <div className="p-2.5 space-y-2 min-h-[74px]">
        <div className="text-[11px] rounded-lg px-2.5 py-1.5 self-start" style={{ backgroundColor: C.paperDeep, color: C.text, minHeight: '26px' }}>
          {typed}<span style={{ opacity: typed.length < full.length ? 1 : 0 }}>▍</span>
        </div>
        {replied && (
          <div className="text-[11px] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: C.violetBg, color: C.violet }}>
            <CheckCircle2 size={11} /> Programat — Joi, 10:00
          </div>
        )}
      </div>
    </div>
  );
}

function TiltCard({ children, style, className, maxTilt = 10, onHoverChange }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  function onMouseMove(e) {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (py - 0.5) * -2 * maxTilt, y: (px - 0.5) * 2 * maxTilt });
    setGlow({ x: px * 100, y: py * 100 });
  }
  return (
    <div ref={ref} onMouseMove={onMouseMove}
      onMouseEnter={() => onHoverChange && onHoverChange(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); onHoverChange && onHoverChange(false); }}
      className={className}
      style={{ ...style, transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.x || tilt.y ? 1.04 : 1})`, transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', position: 'relative', transformStyle: 'preserve-3d', zIndex: (tilt.x || tilt.y) ? 20 : 1 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.14), transparent 60%)` }} />
      {children}
    </div>
  );
}

function HeroCalendar({ lifted }) {
  const days = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi'];
  const slots = ['09:00', '10:00', '11:00', '12:00'];
  const [booked, setBooked] = useState(false);
  useEffect(() => {
    const cycle = () => { setBooked(false); setTimeout(() => setBooked(true), 1400); };
    cycle();
    const id = setInterval(cycle, 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}`, boxShadow: lifted ? `0 20px 40px -8px ${C.violet}44` : '0 4px 14px rgba(0,0,0,0.06)', transition: 'box-shadow 0.25s ease' }}>
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.line}` }}>
        <span className="text-xs font-semibold" style={{ color: C.text, fontFamily: "'Fraunces', serif" }}>Programări · Joi</span>
        <Calendar size={13} style={{ color: C.textSoft }} />
      </div>
      <div className="grid grid-cols-5 text-center text-[10px] py-1.5" style={{ color: C.textSoft, borderBottom: `1px solid ${C.line}` }}>
        {days.map((d, i) => <div key={d} style={{ fontWeight: i === 3 ? 700 : 400, color: i === 3 ? C.violet : C.textSoft }}>{d}</div>)}
      </div>
      <div className="p-2.5 space-y-1.5">
        {slots.map((s, i) => {
          const filled = i === 2 && booked;
          return (
            <div key={s} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ backgroundColor: filled ? C.violetBg : C.paperDeep, border: `1px solid ${filled ? C.violet : C.line}`, transition: 'background-color 0.5s ease, border-color 0.5s ease' }}>
              <span style={{ color: C.textSoft, width: '34px', flexShrink: 0 }}>{s}</span>
              <span style={{ color: filled ? C.violet : C.textSoft, fontWeight: filled ? 600 : 400, transition: 'color 0.3s ease' }}>{filled ? 'Popescu Ana' : 'liber'}</span>
              {filled && <Sparkles size={11} style={{ color: C.violet, marginLeft: 'auto' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroComposition() {
  const groupRef = useRef(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(null);
  function onMouseMove(e) {
    const rect = groupRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: px * 8, y: py * 6 });
  }
  const panels = [
    { key: 'cal', node: <HeroCalendar lifted={hovered === 'cal'} /> },
    { key: 'pat', node: <PatientsPanel lifted={hovered === 'pat'} /> },
    { key: 'inv', node: <InvoicePanel lifted={hovered === 'inv'} /> },
    { key: 'ai', node: <AssistantPanel lifted={hovered === 'ai'} /> },
  ];
  return (
    <div ref={groupRef} onMouseMove={onMouseMove} onMouseLeave={() => setParallax({ x: 0, y: 0 })} className="relative" style={{ perspective: '1400px' }}>
      <div style={{ position: 'absolute', width: '300px', height: '300px', top: '-50px', left: '-30px', background: C.violet, opacity: 0.14, filter: 'blur(70px)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '240px', height: '240px', bottom: '-30px', right: '-10px', background: C.sage, opacity: 0.13, filter: 'blur(70px)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div className="grid grid-cols-2 gap-4 relative" style={{ transform: `rotateY(${parallax.x}deg) rotateX(${-parallax.y}deg)`, transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', transformStyle: 'preserve-3d' }}>
        {panels.map((p) => (
          <TiltCard key={p.key} maxTilt={7} onHoverChange={(h) => setHovered(h ? p.key : null)}>
            {p.node}
          </TiltCard>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", backgroundColor: C.paper, color: C.text, overflowX: 'hidden' }}>

      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.violet})` }}>
            <Activity size={14} style={{ color: '#fff' }} />
          </div>
          <span className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Condica</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="/preturi" className="px-4 py-2 rounded-lg text-sm font-medium text-white condica-btn" style={{ backgroundColor: C.ink }}>Vezi planurile</a>
        </div>
      </header>

      <section className="relative max-w-5xl mx-auto px-6 pt-10 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: C.violet }}>Pentru cabinete private, fără CNAS</p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
            Agenda cabinetului tău, cu puțin ajutor de la AI.
          </h1>
          <p className="text-base mb-8" style={{ color: C.textSoft }}>
            Pacienții se programează singuri, online. Un asistent scrie mementourile și poate programa direct dintr-un mesaj. Tu doar te uiți în calendar.
          </p>
          <div className="flex items-center gap-3 mb-10">
            <a href="/preturi" className="px-5 py-3 rounded-lg text-sm font-medium text-white flex items-center gap-2 condica-btn" style={{ backgroundColor: C.ink }}>
              Vezi planurile <ArrowRight size={15} />
            </a>
            <span className="text-sm" style={{ color: C.textSoft }}>de la 250 RON/lună</span>
          </div>
          <div className="flex items-center gap-8">
            <div><div className="text-2xl font-semibold"><CountUp to={100} suffix="+" /></div><div className="text-xs" style={{ color: C.textSoft }}>acțiuni AI/lună</div></div>
            <div><div className="text-2xl font-semibold"><CountUp to={0} /></div><div className="text-xs" style={{ color: C.textSoft }}>apeluri de confirmare</div></div>
            <div><div className="text-2xl font-semibold"><CountUp to={250} /></div><div className="text-xs" style={{ color: C.textSoft }}>RON/lună, de la</div></div>
          </div>
        </div>
        <HeroComposition />
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <Reveal><p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.coral }}>Recunoști scenariul?</p></Reveal>
        <div className="grid md:grid-cols-3 gap-6 mt-4">
          {[
            { t: 'Telefonul sună întruna', d: 'Fiecare programare înseamnă un apel, o confirmare, uneori și un reapel dacă pacientul nu răspunde.' },
            { t: 'Programări suprapuse', d: 'O agendă ținută pe hârtie sau în cap nu prinde întotdeauna dublele rezervări la timp.' },
            { t: 'Pacienți care uită', d: 'Fără un memento trimis la timp, o parte din programări pur și simplu nu se mai prezintă.' },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.1}>
              <TiltCard maxTilt={6} className="rounded-2xl p-5 h-full condica-card" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{x.t}</h3>
                <p className="text-sm" style={{ color: C.textSoft }}>{x.d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <Reveal><h2 className="text-2xl font-semibold mb-10" style={{ fontFamily: "'Fraunces', serif" }}>Cum arată, în ordine</h2></Reveal>
        <div className="space-y-8">
          {[
            { n: '01', icon: Calendar, t: 'Pacientul se programează singur', d: 'Vede orele libere pe o pagină publică și alege una, fără să te sune.' },
            { n: '02', icon: Sparkles, t: 'AI-ul te ajută zi de zi', d: 'Scrie mementouri automat și poate programa direct dintr-un mesaj scris de tine.' },
            { n: '03', icon: Receipt, t: 'Facturezi simplu, la final', d: 'Fără SIUI, fără CNAS — doar o factură curată pentru fiecare ședință.' },
          ].map((x, i) => (
            <Reveal key={x.n} delay={i * 0.08}>
              <div className="flex items-start gap-5">
                <span className="text-2xl font-semibold shrink-0" style={{ color: C.line, fontFamily: "'Fraunces', serif", width: '52px' }}>{x.n}</span>
                <div className="flex items-start gap-3">
                  <x.icon size={18} style={{ color: C.violet, marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <h3 className="text-base font-semibold mb-1">{x.t}</h3>
                    <p className="text-sm" style={{ color: C.textSoft }}>{x.d}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-semibold mb-6" style={{ fontFamily: "'Fraunces', serif" }}>Gândit pentru</h2>
          <div className="flex flex-wrap gap-2.5">
            {['Psihologie', 'Psihoterapie', 'Kinetoterapie', 'Stomatologie', 'Dermatologie'].map((tag) => (
              <span key={tag} className="px-4 py-2 rounded-full text-sm font-medium" style={{ backgroundColor: C.sageBg, color: C.sage, transition: 'transform 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                {tag}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <Reveal>
          <TiltCard maxTilt={4} className="rounded-3xl p-8 md:p-10 text-center" style={{ backgroundColor: C.ink }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Preț</p>
            <p className="text-4xl font-semibold mb-2" style={{ color: '#fff', fontFamily: "'Fraunces', serif" }}>De la 250 RON/lună</p>
            <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.7)' }}>Fără costuri ascunse. Anulezi oricând.</p>
            <a href="/preturi" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium condica-btn" style={{ backgroundColor: '#fff', color: C.ink }}>
              Vezi planurile <ArrowRight size={15} />
            </a>
          </TiltCard>
        </Reveal>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-center text-xs relative z-10" style={{ color: C.textSoft }}>
        © {new Date().getFullYear()} Condica
      </footer>
    </div>
  );
}
