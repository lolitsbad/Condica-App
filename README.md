# Condica — aplicație live

Aceasta e versiunea „reală" a prototipului Condica: bază de date proprie (Supabase),
autentificare separată pentru cabinet, și o funcție server care ține cheia Anthropic
în siguranță. Poate fi găzduită gratuit (la început) pe Vercel + Supabase.

## Ce conține deja

- **Autentificare cabinet** (email/parolă, Supabase Auth)
- **Tablou, Programări** (listă + calendar săptămânal), **Program de lucru**,
  **Pacienți**, **Facturare**, **Asistent AI** — funcționale, conectate la bază de date reală
- **Pagina publică de programare** (`/programare`) — alegere medic, calendar de sloturi
  disponibile, rezervare cu consimțământ GDPR, plus anulare/reprogramare după telefon
- **Suport multi-medic** — fiecare medic cu propriul program
- Reguli de securitate (Row Level Security) în baza de date: personalul cabinetului
  vede tot; pacienții nelogați văd doar disponibilitatea și își pot gestiona
  *strict* propriile programări, verificate după numărul de telefon

## Ce nu e portat încă (există doar prototipul din Claude)

Pachete de ședințe, listă de așteptare, jurnal de audit vizual, notificări
in-app cu clopoțel, mementouri automate în fundal (fără tab deschis). Tabelele
pentru ele există deja în `supabase/schema.sql` — interfața poate fi adăugată ulterior
după modelul paginilor din `src/pages/cabinet/`.

## Pas cu pas: de la zero la live

### 1. Creează proiectul Supabase
1. Mergi pe [supabase.com](https://supabase.com) → New Project (alege regiunea **Frankfurt (eu-central-1)** pentru date în UE, relevant pentru GDPR)
2. După creare, mergi la **SQL Editor → New query**, lipește tot conținutul din `supabase/schema.sql` din acest proiect și rulează-l (Run)
3. Mergi la **Project Settings → API** — de aici vei copia `Project URL` și cheia `anon public`

### 2. Configurează variabilele de mediu local
```
cp .env.example .env
```
Completează `.env` cu URL-ul și cheia `anon` de la pasul anterior.

### 3. Rulează local (opțional, ca să testezi)
```
npm install
npm run dev
```
Deschide `http://localhost:5173/programare` (pagina publică) și `http://localhost:5173/login` (cabinet).
Notă: funcția `/api/assistant` (asistentul AI) nu rulează cu `npm run dev` — are nevoie de Vercel (vezi pasul 5) sau de `vercel dev` local.

### 4. Creează contul de acces pentru cabinet (direct din Supabase, nu din aplicație)
Intenționat, aplicația **nu are înregistrare publică** — altfel oricine ar putea să-și facă
cont și ar avea acces la toată agenda și la datele pacienților (regula de securitate din
baza de date spune „orice cont autentificat = personal cabinet"). Contul se creează o
singură dată, de tine, direct din Supabase:

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Introdu emailul și parola pentru cont
3. Bifează **„Auto Confirm User"** (ca să nu mai fie nevoie de email de confirmare)
4. Create user

Cu acel email + parolă te autentifici pe `/login`. Pentru personal suplimentar
(asistentă, recepție), repeți același pas — le dai tu emailul și parola, nu se
înregistrează singuri.

**De reținut:** „Adaugă medic" din bara laterală a aplicației e altceva — creează
doar un *profil de agendă* (nume, culoare, program propriu), nu un cont de
autentificare. Poți avea 3 medici în agendă și un singur cont de acces folosit
de recepție, sau un cont separat per medic — depinde cum vrei să organizezi
accesul.

### 5. Publică (deploy) pe Vercel
1. Urcă acest folder într-un repo GitHub nou
2. Pe [vercel.com](https://vercel.com) → Add New Project → importă repo-ul
3. La **Environment Variables**, adaugă:
   - `VITE_SUPABASE_URL` — același din `.env`
   - `VITE_SUPABASE_ANON_KEY` — același din `.env`
   - `ANTHROPIC_API_KEY` — cheia ta de la [console.anthropic.com](https://console.anthropic.com) (folosită doar server-side, de `/api/assistant.js`)
4. Deploy

Link-ul public de programare va fi `https://numele-proiectului.vercel.app/programare` —
acesta e link-ul pe care îl trimiți pacienților sau îl pui pe site-ul cabinetului.
Link-ul de acces pentru cabinet e `https://numele-proiectului.vercel.app/login`.

### 6. Domeniu propriu (opțional, dar recomandat)
Din Vercel → Project → Settings → Domains, adaugă domeniul tău
(ex. `programari.numeledoctorului.ro`) și urmează instrucțiunile de configurare DNS.

## Structura proiectului

```
condica-app/
  api/assistant.js          funcția server care apelează Claude (cheia stă doar aici)
  supabase/schema.sql       toată baza de date: tabele, securitate, funcții
  src/
    pages/BookingPage.jsx   pagina publică de programare
    pages/Login.jsx         autentificare cabinet
    pages/cabinet/          tot ce vede doctorul (protejat de autentificare)
    components/             piese de interfață reutilizabile
    lib/helpers.js          funcții de dată/oră + design tokens
```

## Notă despre mementourile automate

În acest prim pas, verificarea programărilor apropiate pentru memento se face
în interfața de Program de lucru — dar rulează doar cât timp cineva are pagina
deschisă, nu în fundal. Pentru trimitere reală în fundal, adaugă un
[Vercel Cron Job](https://vercel.com/docs/cron-jobs) care apelează periodic o
mică funcție serverless ce interoghează Supabase pentru programările din
următoarele N ore și declanșează mesajul prin `/api/assistant`.
