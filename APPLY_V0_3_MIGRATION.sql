-- Leaderboard aggregate for authenticated learners.
-- Keeps raw attempts/profile data protected by RLS while exposing only
-- the summary fields needed for opted-in leaderboard participants.

create or replace function public.get_training_leaderboard()
returns table (
  user_id uuid,
  display_name text,
  mastered_tools bigint,
  attempts bigint,
  accuracy numeric,
  current_streak bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with tool_stats as (
    select
      a.user_id,
      a.tool_id,
      count(*)::bigint as attempts,
      count(*) filter (where a.is_correct)::bigint as correct,
      (array_agg(a.is_correct order by a.attempted_at desc))[1] as most_recent_correct
    from public.attempts a
    group by a.user_id, a.tool_id
  ),
  mastery as (
    select
      user_id,
      count(*)::bigint as mastered_tools
    from tool_stats
    where attempts >= 3
      and (correct::numeric / nullif(attempts, 0)) >= 0.80
      and most_recent_correct = true
    group by user_id
  ),
  activity as (
    select
      a.user_id,
      count(*)::bigint as attempts,
      round(
        100.0 * count(*) filter (where a.is_correct)
        / nullif(count(*), 0),
        1
      ) as accuracy
    from public.attempts a
    group by a.user_id
  ),
  activity_dates as (
    select distinct
      a.user_id,
      (a.attempted_at at time zone 'America/Los_Angeles')::date as activity_date
    from public.attempts a
  ),
  ordered_dates as (
    select
      user_id,
      activity_date,
      activity_date - (row_number() over (
        partition by user_id
        order by activity_date
      ))::int as streak_group
    from activity_dates
  ),
  streak_groups as (
    select
      user_id,
      min(activity_date) as start_date,
      max(activity_date) as end_date,
      count(*)::bigint as streak_length
    from ordered_dates
    group by user_id, streak_group
  ),
  streak_summary as (
    select
      user_id,
      max(
        case
          when end_date in (
            (now() at time zone 'America/Los_Angeles')::date,
            (now() at time zone 'America/Los_Angeles')::date - 1
          ) then streak_length
          else 0
        end
      )::bigint as current_streak
    from streak_groups
    group by user_id
  )
  select
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Learner') as display_name,
    coalesce(m.mastered_tools, 0)::bigint as mastered_tools,
    coalesce(ac.attempts, 0)::bigint as attempts,
    coalesce(ac.accuracy, 0)::numeric as accuracy,
    coalesce(ss.current_streak, 0)::bigint as current_streak
  from public.profiles p
  left join mastery m on m.user_id = p.id
  left join activity ac on ac.user_id = p.id
  left join streak_summary ss on ss.user_id = p.id
  where p.active = true
    and p.leaderboard_opt_in = true
  order by
    coalesce(m.mastered_tools, 0) desc,
    coalesce(ac.accuracy, 0) desc,
    coalesce(ac.attempts, 0) desc,
    coalesce(nullif(trim(p.display_name), ''), 'Learner');
$$;

revoke all on function public.get_training_leaderboard() from public;
grant execute on function public.get_training_leaderboard() to authenticated;
