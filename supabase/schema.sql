-- Condica — schema Supabase, versiune MULTI-CABINET (SaaS real)
-- Fiecare cabinet client e o "organizație" izolată complet de celelalte.
-- Rulează acest fișier integral în Supabase Studio → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

-- ---------- Organizații (cabinete client) ----------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Leagă un cont de autentificare (auth.users) de o organizație.
create table memberships (
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  role text default 'owner',
  created_at timestamptz default now(),
  primary key (user_id, org_id)
);

-- ---------- Tabele de business (toate cu org_id) ----------

create table doctors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  specialty text default '',
  color text default '#6E5C93',
  notify_email text default '',
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  phone text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
  doctor_id uuid references doctors(id) on delete set null,
  patient_name text not null,
  phone text default '',
  note text default '',
  created_at timestamptz default now()
);

create table working_hours (
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
  doctor_id uuid references doctors(id) on delete cascade,
  date date not null,
  all_day boolean default true,
  start_time text default '',
  end_time text default '',
  reason text default ''
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
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
  org_id uuid references organizations(id) on delete cascade not null,
  action text not null,
  details text not null,
  created_at timestamptz default now()
);

create table reminder_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean default true,
  hours_before int default 24
);

-- ---------- Funcție helper: organizația utilizatorului curent ----------

create or replace function my_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from memberships where user_id = auth.uid() limit 1;
$$;

-- ---------- Auto-provisionare la înregistrare ----------
-- Când cineva își face cont, i se creează automat o organizație nouă, izolată,
-- cu un medic implicit și un program de lucru implicit (Luni-Vineri).

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_doctor_id uuid;
begin
  v_org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Cabinetul meu');
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 6);

  insert into organizations (name, slug) values (v_org_name, v_slug) returning id into v_org_id;
  insert into memberships (user_id, org_id, role) values (new.id, v_org_id, 'owner');

  insert into doctors (org_id, name, color) values (v_org_id, 'Cabinet', '#6E5C93') returning id into v_doctor_id;

  insert into working_hours (org_id, doctor_id, day_of_week, enabled, start_time, end_time, slot_minutes, break_start, break_end)
  select v_org_id, v_doctor_id, dow, (dow between 1 and 5), '09:00',
         case when dow = 5 then '15:00' else '17:00' end, 20,
         case when dow between 1 and 4 then '13:00' else '' end,
         case when dow between 1 and 4 then '14:00' else '' end
  from generate_series(0, 6) as dow;

  insert into reminder_settings (org_id, enabled, hours_before) values (v_org_id, true, 24);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Row Level Security ----------

alter table organizations enable row level security;
alter table memberships enable row level security;
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

-- Staff: acces complet, dar STRICT la propria organizație.
create policy "member reads own org" on organizations for select using (id = my_org_id());
create policy "member reads own membership" on memberships for select using (user_id = auth.uid());

create policy "org scoped doctors" on doctors for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped patients" on patients for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped appointments staff" on appointments for select using (org_id = my_org_id());
create policy "org scoped appointments staff write" on appointments for update using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped appointments staff delete" on appointments for delete using (org_id = my_org_id());
create policy "org scoped appointments staff insert" on appointments for insert with check (org_id = my_org_id());
create policy "org scoped sessions" on sessions for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped invoices" on invoices for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped packages" on packages for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped waitlist" on waitlist for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped working_hours" on working_hours for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped blocked_dates" on blocked_dates for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped notifications" on notifications for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped audit_log" on audit_log for all using (org_id = my_org_id()) with check (org_id = my_org_id());
create policy "org scoped reminder_settings" on reminder_settings for all using (org_id = my_org_id()) with check (org_id = my_org_id());

-- Public (pagina de programare, nelogat): poate vedea organizația după slug,
-- medicii ei și programul de lucru — strict cât e nevoie pentru calendarul de rezervare.
create policy "public read org by slug" on organizations for select using (true);
create policy "public read doctors" on doctors for select using (true);
create policy "public read working_hours" on working_hours for select using (true);
create policy "public read blocked_dates" on blocked_dates for select using (true);

-- Publicul NU are voie să citească direct tabelul appointments (ar vedea nume/telefoane
-- ale altor pacienți). Disponibilitatea se calculează exclusiv prin funcția RPC de mai jos.
create policy "public insert appointment" on appointments for insert with check (source = 'online' and org_id is not null);

-- ---------- Funcții RPC pentru acces public, securizat ----------

-- Disponibilitate: doar dată/oră/durată/status, niciodată nume sau telefon.
create or replace function get_org_busy_slots(p_org_id uuid, p_doctor_id uuid)
returns table(id uuid, "date" date, "time" text, duration int, status text)
language sql
security definer
stable
set search_path = public
as $$
  select id, date, time, duration, status from appointments
  where org_id = p_org_id and doctor_id = p_doctor_id and status <> 'cancelled';
$$;

create or replace function get_my_appointments(p_org_id uuid, p_phone text)
returns setof appointments
language sql
security definer
set search_path = public
as $$
  select * from appointments
  where org_id = p_org_id and phone = p_phone
    and status <> 'cancelled'
    and date >= current_date
  order by date, time;
$$;

create or replace function cancel_my_appointment(p_id uuid, p_org_id uuid, p_phone text)
returns void
language sql
security definer
set search_path = public
as $$
  update appointments set status = 'cancelled'
  where id = p_id and org_id = p_org_id and phone = p_phone;
$$;

create or replace function reschedule_my_appointment(p_id uuid, p_org_id uuid, p_phone text, p_date date, p_time text)
returns void
language sql
security definer
set search_path = public
as $$
  update appointments set date = p_date, time = p_time
  where id = p_id and org_id = p_org_id and phone = p_phone;
$$;
