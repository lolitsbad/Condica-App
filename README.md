# Condica — aplicație live, multi-cabinet (SaaS real)

Versiune cu **izolare completă între cabinete**: fiecare cont nou creat primește
propriul cabinet, complet separat de ceilalți clienți. O singură platformă
(un singur proiect Supabase + Vercel), mulți clienți, fiecare văzând strict
datele lui.

## Cum funcționează izolarea

- La înregistrare, se creează automat o **organizație** nouă (cabinetul) + un
  cont legat de ea. Regulile de securitate din baza de date (Row Level Security)
  verifică, la fiecare cerere, cărei organizații îi aparține contul logat — și
  permit acces STRICT la datele acelei organizații.
- Pagina publică de programare are un link unic per cabinet:
  `condica-app.vercel.app/programare/numele-cabinetului`. Îl găsești și-l poți
  copia din bara laterală a panoului de cabinet ("Copiază linkul de programare").
- Pacienții nu pot vedea niciodată datele altor cabinete, nici măcar dacă ar
  ghici link-ul altcuiva — fiecare pagină publică e filtrată strict pe
  organizația din URL.

## Migrare de la versiunea anterioară (un singur cabinet)

Structura bazei de date s-a schimbat fundamental (tabele noi, coloane noi pe
fiecare tabel existent) — nu există o cale simplă de „actualizare" a datelor
vechi de test. Pornești curat:

1. În Supabase → SQL Editor, rulează întâi acest script de curățare:
```sql
drop table if exists audit_log cascade;
drop table if exists notifications cascade;
drop table if exists blocked_dates cascade;
drop table if exists working_hours cascade;
drop table if exists waitlist cascade;
drop table if exists packages cascade;
drop table if exists invoices cascade;
drop table if exists sessions cascade;
drop table if exists appointments cascade;
drop table if exists patients cascade;
drop table if exists doctors cascade;
drop table if exists reminder_settings cascade;
drop table if exists memberships cascade;
drop table if exists organizations cascade;
drop function if exists get_my_appointments(text);
drop function if exists get_my_appointments(uuid, text);
drop function if exists cancel_my_appointment(uuid, text);
drop function if exists cancel_my_appointment(uuid, uuid, text);
drop function if exists reschedule_my_appointment(uuid, text, date, text);
drop function if exists reschedule_my_appointment(uuid, uuid, text, date, text);
drop function if exists get_org_busy_slots(uuid, uuid);
drop function if exists handle_new_user() cascade;
drop function if exists my_org_id();
```
2. Rulează apoi **tot** conținutul din `supabase/schema.sql`.
3. În Supabase → Authentication → Users, **șterge** contul creat manual mai
   devreme (nu are o organizație asociată din trigger-ul vechi).
4. Urcă fișierele actualizate pe GitHub (la fel ca prima dată).
5. Pe pagina `/login` a aplicației, folosește acum **„Cabinet nou? Creează un cont"**
   — de data asta e sigur, fiindcă fiecare înregistrare primește propriul cabinet izolat.

## Ce e nou față de versiunea single-tenant

- Tabele noi: `organizations`, `memberships`
- Fiecare tabel de business are acum o coloană `org_id`
- Toate regulile de securitate verifică `org_id`-ul, nu doar „ești logat"
- Funcție + trigger `handle_new_user` — provizionează automat un cabinet nou,
  cu un medic implicit și un program de lucru implicit, la fiecare înregistrare
- Ruta publică de programare: `/programare/:slug` în loc de `/programare`
- Disponibilitatea (orele libere) se calculează printr-o funcție RPC dedicată
  (`get_org_busy_slots`), care nu expune niciodată nume sau telefoane ale altor
  pacienți către public — doar dată/oră/status

## Ce conține deja

Tablou, Programări (listă + calendar săptămânal), Program de lucru, Pacienți,
Facturare, Asistent AI, pagina publică de programare cu anulare/reprogramare
și notificare email către cabinet la fiecare programare online.

## Ce nu e portat încă

Pachete de ședințe, listă de așteptare, jurnal de audit vizual, notificări
in-app cu clopoțel, mementouri garantate în fundal. Tabelele pentru ele există
deja în schemă — interfața se poate adăuga ulterior.

## Pas cu pas: de la zero la live

### 1. Creează proiectul Supabase
[supabase.com](https://supabase.com) → New Project → regiunea Frankfurt (UE) →
SQL Editor → rulează `supabase/schema.sql` integral.

### 2. Variabile de mediu locale (opțional, pentru testare)
```
cp .env.example .env
```
Completează cu `Project URL` și cheia `anon public` din Supabase → Project Settings → API.

### 3. Publică pe Vercel
Urcă folderul pe GitHub, importă-l în Vercel, adaugă variabilele de mediu:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — din Supabase
- `ANTHROPIC_API_KEY` — de la [console.anthropic.com](https://console.anthropic.com/settings/keys)
- `RESEND_API_KEY` — de la [resend.com](https://resend.com), pentru notificările email către cabinet (opțional)

### 4. Creează primul cabinet
Pe `adresa-ta.vercel.app/login` → „Cabinet nou? Creează un cont" → completezi
numele cabinetului, email, parolă. Cabinetul e creat automat, izolat, gata de
configurat. Link-ul public de programare apare în bara laterală a panoului.

### 5. Domeniu propriu (opțional)
Din Vercel → Settings → Domains. Fiecare client tot pe același domeniu al tău
va avea propriul link `/programare/cabinetul-lui` — un domeniu propriu per
client ar necesita o configurare suplimentară (subdomenii sau domenii custom
mapate la slug), care nu e inclusă încă.

## Structura proiectului

```
condica-app/
  api/assistant.js          asistentul AI (cheia Anthropic stă doar aici)
  api/notify-doctor.js      email către cabinet la programare nouă (Resend)
  supabase/schema.sql       toată baza de date: organizații, tabele, securitate, funcții
  src/
    pages/BookingPage.jsx   pagina publică, rezolvată după slug-ul din URL
    pages/Login.jsx         autentificare + înregistrare (creează organizație nouă)
    pages/cabinet/          panoul de cabinet (protejat, scopat pe organizație)
    components/             piese de interfață reutilizabile
    lib/helpers.js          funcții de dată/oră + design tokens
```
