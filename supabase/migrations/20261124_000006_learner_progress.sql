begin;

create or replace function public.admin_learner_progress_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  report jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with published as (
    select t.id, t.is_wire, t.is_line, t.is_meter,
      t.is_wire is null and t.is_line is null and t.is_meter is null as is_general
    from public.tools t
    where t.status = 'published'
  ), tagged_totals as (
    select
      count(*) filter (where t.is_wire) as wire,
      count(*) filter (where t.is_line) as line,
      count(*) filter (where t.is_meter) as meter,
      count(*) filter (where t.is_general) as general,
      count(*) as overall
    from published t
  ), attempt_flags as (
    select a.id, a.user_id, a.tool_id, a.attempted_at, a.is_correct,
      upper(trim(a.mode)) in ('FLASHCARD', 'FLASHCARDS') or upper(trim(a.question_type)) = 'SELF_RATING' as is_flashcard
    from public.attempts a
  ), activity as (
    select a.user_id,
      max(a.attempted_at) as last_attempt_at,
      count(*) filter (where not a.is_flashcard) as quiz_attempts,
      count(*) filter (where a.is_flashcard) as flashcard_attempts,
      round(100.0 * count(*) filter (where not a.is_flashcard and a.is_correct)
        / nullif(count(*) filter (where not a.is_flashcard), 0), 1) as quiz_accuracy
    from attempt_flags a
    group by a.user_id
  ), mastered as (
    select a.user_id, a.tool_id
    from attempt_flags a
    join published t on t.id = a.tool_id
    group by a.user_id, a.tool_id
    having count(*) >= 3
      and count(*) filter (where a.is_correct) >= count(*) * 0.80
      and (array_agg(a.is_correct order by a.attempted_at desc, a.id desc))[1]
  ), mastery_counts as (
    select m.user_id,
      count(*) filter (where t.is_wire) as wire,
      count(*) filter (where t.is_line) as line,
      count(*) filter (where t.is_meter) as meter,
      count(*) filter (where t.is_general) as general,
      count(*) as overall
    from mastered m
    join published t on t.id = m.tool_id
    group by m.user_id
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(tt) from tagged_totals tt),
    'users', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'trade', p.trade,
      'active', p.active,
      'last_sign_in_at', u.last_sign_in_at,
      'last_attempt_at', a.last_attempt_at,
      'quiz_attempts', coalesce(a.quiz_attempts, 0),
      'flashcard_attempts', coalesce(a.flashcard_attempts, 0),
      'quiz_accuracy', a.quiz_accuracy,
      'mastered', jsonb_build_object(
        'wire', coalesce(m.wire, 0),
        'line', coalesce(m.line, 0),
        'meter', coalesce(m.meter, 0),
        'general', coalesce(m.general, 0),
        'overall', coalesce(m.overall, 0)
      )
    ) order by lower(p.display_name), p.id), '[]'::jsonb)
  )
  into report
  from public.profiles p
  join auth.users u on u.id = p.id
  left join activity a on a.user_id = p.id
  left join mastery_counts m on m.user_id = p.id;

  return report;
end;
$$;

revoke all on function public.admin_learner_progress_report() from public;
grant execute on function public.admin_learner_progress_report() to authenticated;

commit;
