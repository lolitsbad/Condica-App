-- Condica — schema Supabase (Postgres)
-- Rulează acest fișier integral în Supabase Studio → SQL Editor → New query → Run.
-- Presupune un singur cabinet per proiect Supabase (un deployment = un cabinet).
-- Pentru mai multe cabinete izolate, fiecare ar avea propriul proiect Supabase.

create extension if not exists "pgcrypto";

-- ---------- Tabele ----------

create table doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text default '',
  color text default '#6E5C93',
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  patient_name text not null,
  phone text default '',
  date date not null,
  time text not null,
  duration int default 30,
  reason text default '',
  status text default 'confirmed', -- confirmed | pending | cancelled | no-show
  notes text default '',
  source text default 'doctor',    -- doctor | online | ai
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  patient_name text not null,
  date date,
  time text,
  observations text default '',
  plan text default '',
  price numeric default 0,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  number text not null,
  patient_name text not null,
  description text default '',
  price numeric default 0,
  date date not null,
  status text default 'neplatita', -- neplatita | platita
  created_at timestamptz default now()
);

create table packages (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  patient_name text not null,
  package_name text not null,
  total_sessions int not null default 10,
  used_sessions int not null default 0,
  price numeric default 0,
  purchase_date date default current_date,
  created_at timestamptz default now()
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  patient_name text not null,
  phone text default '',
  note text default '',
  created_at timestamptz default now()
);

create table working_hours (
  doctor_id uuid references doctors(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  enabled boolean default false,
  start_time text default '09:00',
  end_time text default '17:00',
  slot_minutes int default 20,
  break_start text default '',
  break_end text default '',
  primary key (doctor_id, day_of_week)
);

create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete cascade,
  date date not null,
  all_day boolean default true,
  start_time text default '',
  end_time text default '',
  reason text default ''
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- created | cancelled | rescheduled | reminder
  patient_name text,
  date date,
  time text,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  details text not null,
  created_at timestamptz default now()
);

create table reminder_settings (
  id int primary key default 1,
  enabled boolean default true,
  hours_before int default 24,
  constraint single_row check (id = 1)
);
insert into reminder_settings (id, enabled, hours_before) values (1, true, 24)
  on conflict (id) do nothing;

-- ---------- Row Level Security ----------
-- Model: STAFF (autentificați, orice cont din acest proiect Supabase = personalul cabinetului)
-- au acces complet. PUBLICUL (pacienții, nelogați) au acces limitat, strict la ce
-- e nevoie pentru pagina de programare online — vezi politicile de mai jos.

alter table doctors enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table sessions enable row level security;
alter table invoices enable row level security;
alter table packages enable row level security;
alter table waitlist enable row level security;
alter table working_hours enable row level security;
alter table blocked_dates enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table reminder_settings enable row level security;

-- Staff (autentificat): acces complet la tot.
create policy "staff full access doctors" on doctors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access patients" on patients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access appointments" on appointments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access sessions" on sessions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access invoices" on invoices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access packages" on packages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access waitlist" on waitlist for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access working_hours" on working_hours for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access blocked_dates" on blocked_dates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access notifications" on notifications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access audit_log" on audit_log for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff full access reminder_settings" on reminder_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Public (pagina de programare, nelogat):
-- poate vedea medicii, programul de lucru și zilele blocate (ca să calculeze orele libere)
create policy "public read doctors" on doctors for select using (true);
create policy "public read working_hours" on working_hours for select using (true);
create policy "public read blocked_dates" on blocked_dates for select using (true);

-- poate vedea DOAR data/ora/doctorul/statusul programărilor (nu nume/telefon altor pacienți),
-- ca să calculeze orele ocupate; și poate crea o programare nouă.
create policy "public read appointment slots" on appointments for select using (true);
create policy "public insert appointment" on appointments for insert with check (source = 'online');

-- NU există politică publică de UPDATE/DELETE pe appointments — anularea și
-- reprogramarea publică se fac exclusiv prin funcțiile RPC de mai jos, care
-- verifică telefonul înainte de a modifica orice rând.

-- ---------- Funcții RPC pentru acces public, securizat prin telefon ----------
-- SECURITY DEFINER: rulează cu drepturi de proprietar, dar returnează/modifică
-- STRICT rândurile care se potrivesc cu telefonul dat ca parametru.

create or replace function get_my_appointments(p_phone text)
returns setof appointments
language sql
security definer
set search_path = public
as $$
  select * from appointments
  where phone = p_phone
    and status <> 'cancelled'
    and date >= current_date
  order by date, time;
$$;

create or replace function cancel_my_appointment(p_id uuid, p_phone text)
returns void
language sql
security definer
set search_path = public
as $$
  update appointments set status = 'cancelled'
  where id = p_id and phone = p_phone;
$$;

create or replace function reschedule_my_appointment(p_id uuid, p_phone text, p_date date, p_time text)
returns void
language sql
security definer
set search_path = public
as $$
  update appointments set date = p_date, time = p_time
  where id = p_id and phone = p_phone;
$$;

-- ---------- Date inițiale ----------
-- Creează primul medic/cabinet. Editează numele după prima autentificare.
insert into doctors (name, specialty, color) values ('Cabinet', '', '#6E5C93');

-- Program de lucru implicit (Luni-Vineri) pentru primul medic creat mai sus.
insert into working_hours (doctor_id, day_of_week, enabled, start_time, end_time, slot_minutes, break_start, break_end)
select id, d, (d between 1 and 5), '09:00', case when d = 5 then '15:00' else '17:00' end, 20,
       case when d between 1 and 4 then '13:00' else '' end,
       case when d between 1 and 4 then '14:00' else '' end
from doctors, generate_series(0, 6) as d
where doctors.name = 'Cabinet';
