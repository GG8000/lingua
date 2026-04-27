# Lingua

A personal language learning PWA. Capture words and phrases you encounter, get instant translations with grammar explanations, and review them with a spaced repetition system — all from your phone or desktop.

---

## Features

- **Quick Capture** – Enter a word or phrase, optionally with context. Lingua translates it, explains the grammar, provides conjugations (verbs) and articles (nouns), and saves it instantly.
- **Spaced Repetition (SM-2)** – Review cards with an Anki-inspired algorithm. Cards are scheduled based on how well you know them.
- **Decks** – Organise cards into decks. Each deck supports both directions (e.g. FR → DE and DE → FR) as separate cards with independent progress.
- **Multiple Languages** – French, Italian, and German supported. Easily extensible.
- **PWA** – Installable on iPhone and Android as a native-feeling app.
- **Authentication** – Each user has their own account and card collection via Supabase Auth.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | CSS (custom, warm/organic design system) |
| LLM / Translation | Gemma 4 via Google AI Studio API |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── adapters/
│   ├── gemini.ts        # Gemma 4 API – translation + grammar
│   └── supabase.ts      # Database + auth operations
├── auth/
│   └── Login.tsx        # Login + registration
├── domain/
│   └── models.ts        # TypeScript interfaces (Card, Translation, etc.)
├── mobile/
│   ├── QuickCapture.tsx # Main capture screen
│   └── QuickCapture.css
├── profile/
│   ├── Profile.tsx      # User profile bottom sheet
│   └── Profile.css
├── study-session/
│   ├── StudySession.tsx # Deck selection + review session
│   └── StudySession.css
├── use-cases/
│   ├── captureWord.ts   # Orchestrates translation + save
│   └── reviewCard.ts    # SM-2 algorithm + DB update
├── App.tsx
└── index.css
```

---

## Architecture

Lingua follows Clean Architecture principles in the frontend:

- **Domain models** (`models.ts`) are pure TypeScript types with no external dependencies.
- **Adapters** (`gemini.ts`, `supabase.ts`) implement external integrations behind a clean interface. Swapping the LLM provider means changing one file.
- **Use Cases** (`captureWord.ts`, `reviewCard.ts`) orchestrate business logic without knowing about React or the UI.
- **Components** are thin – they call use cases and display results.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com) account (free Gemma 4 API key)
- A [Supabase](https://supabase.com) project (free tier)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/lingua.git
cd lingua
npm install
```

### Environment Variables

Create a `.env` file in the root:

```
VITE_GEMINI_API_KEY=your_gemma_api_key
VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup

Run the following in the Supabase SQL Editor:

```sql
-- Language enum
create type language_type as enum ('german', 'english', 'romanian', 'french', 'italian');

-- Profiles
create table profiles (
  id               uuid references auth.users primary key,
  native_language  language_type not null default 'german',
  created_at       timestamptz default now()
);

-- Decks
create table decks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);

-- Cards
create table cards (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz default now(),
  user_id            uuid references auth.users,
  deck_id            uuid references decks(id) on delete set null,
  phrase             text not null,
  translation        text not null,
  word_type          text,
  example            text,
  example_translation text,
  grammar            text,
  conjugation        jsonb,
  article            jsonb,
  source_language    language_type,
  target_language    language_type,
  reversed           boolean default false,
  due_date           timestamptz default now(),
  interval           integer default 1,
  ease_factor        float default 2.5,
  repetitions        integer default 0,
  state              text default 'new',
  step_index         integer default 0
);

-- Row Level Security
alter table profiles enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;

create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users see own decks" on decks for all using (auth.uid() = user_id);
create policy "Users see own cards" on cards for all using (auth.uid() = user_id);
```

### Run

```bash
npm run dev
```

---

## Deployment

Lingua is deployed on [Vercel](https://vercel.com).

1. Push to GitHub
2. Import the repository in Vercel
3. Add the three environment variables
4. Deploy

Every push to `main` triggers an automatic deployment.

---

## Spaced Repetition

Lingua uses a modified SM-2 algorithm with learning steps inspired by Anki:

- **New cards** go through learning steps (1 min → 10 min) before graduating to review
- **Review cards** are scheduled based on interval × ease factor
- **Forgotten cards** re-enter the learning phase
- **Rating 1** (Vergessen) → restart learning steps
- **Rating 2** (Schwer) → same step, slightly longer
- **Rating 3** (Gut) → advance to next step or graduate
- **Rating 4** (Einfach) → skip to review with 4-day interval

Each card is stored in both directions (FR → DE and DE → FR) with independent scheduling.

---

## Roadmap

- [ ] Romanian as native languages
- [ ] Collections/card browser
- [ ] Streak tracking and statistics
- [ ] LLM provider swap (Mistral / Anthropic)
- [ ] Offline queue (IndexedDB)