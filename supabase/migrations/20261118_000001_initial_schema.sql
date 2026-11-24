create extension if not exists pgcrypto;

create type public.app_role as enum ('learner', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    role public.app_role not null default 'learner',
    active boolean not null default true,
    leaderboard_opt_in boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.tool_families (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.tools (
    id uuid primary key default gen_random_uuid(),
    formal_name text not null,
    common_name text,
    use_description text,
    family_id uuid references public.tool_families(id),
    location text,
    difficulty integer check (difficulty between 1 and 10),
    image_path text,
    is_commonly_missed boolean not null default false,
    status public.content_status not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.scenarios (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null,
    difficulty integer check (difficulty between 1 and 10),
    status public.content_status not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.scenario_tools (
    scenario_id uuid not null references public.scenarios(id) on delete cascade,
    tool_id uuid not null references public.tools(id) on delete cascade,
    is_correct boolean not null default true,
    primary key (scenario_id, tool_id)
);

create table public.training_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    mode text not null,
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create table public.attempts (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.training_sessions(id) on delete set null,
    user_id uuid not null references public.profiles(id) on delete cascade,
    mode text not null,
    tool_id uuid not null references public.tools(id),
    question_type text not null,
    selected_answer text,
    correct_answer text,
    is_correct boolean not null,
    attempted_at timestamptz not null default now()
);

create table public.quiz_questions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    mode text not null,
    question_type text not null,
    correct_tool_id uuid not null references public.tools(id),
    option_tool_ids uuid[] not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '30 minutes'),
    answered_at timestamptz
);

create table public.app_settings (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamptz not null default now()
);

create index attempts_user_id_idx on public.attempts(user_id);
create index attempts_user_tool_idx on public.attempts(user_id, tool_id);
create index attempts_attempted_at_idx on public.attempts(attempted_at);
create index tools_family_id_idx on public.tools(family_id);
create index tools_status_idx on public.tools(status);
create index quiz_questions_user_id_idx on public.quiz_questions(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Learner'), '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.tool_families enable row level security;
alter table public.tools enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_tools enable row level security;
alter table public.training_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "published families readable" on public.tool_families for select to authenticated using (active = true or public.is_admin());
create policy "admins manage families" on public.tool_families for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "published tools readable" on public.tools for select to authenticated using (status = 'published' or public.is_admin());
create policy "admins manage tools" on public.tools for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "published scenarios readable" on public.scenarios for select to authenticated using (status = 'published' or public.is_admin());
create policy "admins manage scenarios" on public.scenarios for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "scenario links readable" on public.scenario_tools for select to authenticated using (exists (select 1 from public.scenarios s where s.id = scenario_id and (s.status = 'published' or public.is_admin())));
create policy "admins manage scenario links" on public.scenario_tools for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "users manage own sessions" on public.training_sessions for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "users read own attempts" on public.attempts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "users insert own attempts" on public.attempts for insert to authenticated with check (user_id = auth.uid());
create policy "admins manage attempts" on public.attempts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "users manage own quiz questions" on public.quiz_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read settings" on public.app_settings for select to authenticated using (public.is_admin());
create policy "admins manage settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value, description) values
('mastery', '{"minimum_attempts":3,"required_accuracy":0.80,"require_latest_correct":true}', 'Tool mastery thresholds'),
('adaptive_weights', '{"needs_review":4,"new":3,"learning":2,"mastered":1,"commonly_missed_multiplier":1.25}', 'Adaptive question selection'),
('xp', '{"flashcard_known":10,"quiz_correct":20,"scenario_correct":30,"mastery_bonus":100,"xp_per_level":500}', 'XP and level rules');

insert into storage.buckets (id, name, public)
values ('tool-images', 'tool-images', true)
on conflict (id) do update set public = excluded.public;

create policy "authenticated can read tool images" on storage.objects for select to authenticated using (bucket_id = 'tool-images');
create policy "admins upload tool images" on storage.objects for insert to authenticated with check (bucket_id = 'tool-images' and public.is_admin());
create policy "admins update tool images" on storage.objects for update to authenticated using (bucket_id = 'tool-images' and public.is_admin()) with check (bucket_id = 'tool-images' and public.is_admin());
create policy "admins delete tool images" on storage.objects for delete to authenticated using (bucket_id = 'tool-images' and public.is_admin());
