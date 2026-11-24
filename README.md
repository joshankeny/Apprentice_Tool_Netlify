# Apprentice Tool Training

React / Next.js rebuild of the Apprentice Tool Training prototype using Supabase PostgreSQL, Auth, and Storage instead of Snowflake Streamlit.

## Version 0.1 goal

This starter proves the new architecture:

1. authenticate a learner/admin
2. manage tools through `/admin/tools`
3. upload tool images to Supabase Storage
4. run a server-validated Tool Family Quiz
5. record attempts in PostgreSQL
6. calculate basic learner metrics from attempts

## Stack

- Next.js / React
- TypeScript
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage

## Setup

### 1. Create a Supabase project

Copy `.env.example` to `.env.local` and fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### 2. Apply the database migration

Use the Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run `supabase/migrations/20261118_000001_initial_schema.sql` in the Supabase SQL Editor.

### 3. Create a development user

Create a user in Supabase Authentication using email/password. The signup trigger creates a `profiles` record automatically.

Make your own account an admin once:

```sql
update public.profiles
set role = 'admin',
    display_name = 'Josh Ankeny'
where id = (
    select id from auth.users where email = 'YOUR_EMAIL'
);
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

### 5. Add initial content

Run `supabase/seed.sql` or create tool families manually. Then go to `/admin/tools/new` and add at least four published tools with images in the same family.

Open `/learn/family-quiz` to test the first training mode.

## Tool catalog handoff

Sign in with an active admin account and select **Admin** in the top navigation.

- Use search and the status filter to find a tool. The catalog shows its current photo, family, and publish status.
- Select **Edit** to update the tool or choose a new photo. Select **Add Tool** to create a record in an existing active family.
- Photos can be JPEG, PNG, WebP, or GIF, up to 4 MB. The form previews the selected photo before saving.
- Use **Draft** while preparing a tool, **Published** when it is ready for training, and **Archived** to remove it from future training rounds while preserving its attempt history.

Routine tool and photo updates are saved from the web app.

## Rules preserved from the Streamlit app

### Mastery

- at least 3 attempts
- at least 80% accuracy
- latest attempt correct

### Adaptive learning

| Status | Weight |
|---|---:|
| Needs Review | 4 |
| New | 3 |
| Learning | 2 |
| Mastered | 1 |

Commonly missed multiplier: `1.25`.

### XP

- Flashcard known: 10
- Quiz correct: 20
- Scenario correct: 30
- Mastery bonus: 100
- 500 XP per level

## Why `quiz_questions` exists

The Streamlit app could safely keep the correct answer in Python session state. A React browser cannot safely receive the correct answer before submission because browser state is inspectable.

The server therefore stores the correct answer in a short-lived `quiz_questions` row. React receives only the prompt and choices. The submit API validates the answer, records the attempt, and then returns the result.

## Next porting order

1. finish admin Tool edit/archive/replace-image flows
2. tool-family admin
3. Flashcards
4. Comprehensive Quiz
5. scenario admin
6. Scenario Quiz
7. detailed mastery / Needs Review
8. daily streaks
9. leaderboard + opt-in
10. Snowflake content migration scripts
11. Microsoft Entra ID authentication
12. Emily UAT and handoff

See `docs/STREAMLIT_TO_REACT_MAP.md` for the translation map.

## Version 0.2 - all four training modes

Version 0.2 adds the remaining learner modes from the latest Streamlit application:

- Flashcards
- Comprehensive Quiz
- Tool Family Quiz
- Scenario Quiz

### Required Supabase migration

If your Version 0.1 schema is already running, apply:

```text
supabase/migrations/20261123_000002_add_quiz_modes.sql
```

This extends `quiz_questions` so text-answer and scenario questions can keep the correct answer on the server until submission.

### Flashcards

- image first
- Reveal Answer is client-side
- formal name, common name, use, location, and family
- Review Again records an incorrect self-rating
- I Knew It records a correct self-rating
- adaptive tool selection

### Comprehensive Quiz

Builds any valid question type supported by the tool's data:

- formal name
- common name
- location
- tool family
- scenario

Name distractors prefer the same tool family and fall back to other families only when needed. Attribute questions prefer distinct values from the same family before using values from other families.

### Scenario Quiz

- uses only published scenarios linked to valid tools
- excludes every other correct tool for the selected scenario from distractors
- prefers wrong tools from the correct tool's family
- falls back to other families when necessary

### Answer security

For Comprehensive and Scenario Quiz, the browser receives the prompt and answer choices but not the correct answer. The correct answer lives in the short-lived `quiz_questions` row and is checked by `/api/quiz/submit`.

### Routes

```text
/learn/flashcards
/learn/quiz
/learn/family-quiz
/learn/scenario-quiz
```

## v0.3 - Opt-in training leaderboard

v0.3 restores the learner leaderboard from the Streamlit prototype.

Features:
- `Show me on the leaderboard` preference saved to `profiles.leaderboard_opt_in`
- only active, opted-in learners are returned
- ranking by tools mastered, then accuracy, then attempts, then display name
- current streak shown using Pacific Time activity dates
- current learner highlighted with `← YOU`
- top five shown by default with a Show All control
- raw profiles and attempts remain protected by RLS; the UI reads a restricted aggregate RPC

### Upgrade from v0.2

1. Run `APPLY_V0_3_MIGRATION.sql` in the Supabase SQL Editor.
2. Replace/update the application files with this version.
3. Restart the local app with `npm.cmd run dev` on the City Windows workstation.
4. Open `/learn` and test the leaderboard toggle both on and off.
