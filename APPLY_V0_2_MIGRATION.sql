-- Run this in Supabase SQL Editor if Version 0.1 is already installed.

alter table public.quiz_questions
  alter column option_tool_ids drop not null;

alter table public.quiz_questions
  add column if not exists correct_answer text,
  add column if not exists option_values text[],
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

create index if not exists quiz_questions_expires_at_idx
  on public.quiz_questions(expires_at);
