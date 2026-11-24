-- Admin management uses existing profiles, scenarios, and scenario_tools.
create or replace function public.guard_profile_access_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and
     (new.role is distinct from old.role or new.active is distinct from old.active) then
    if not public.is_admin() then
      raise exception 'Admin access required' using errcode = '42501';
    end if;
    if old.id = auth.uid() and not new.active then
      raise exception 'You cannot deactivate your own account' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_profile_access_fields
before update of role, active on public.profiles
for each row execute function public.guard_profile_access_fields();

create or replace function public.is_active_training_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
$$;

revoke all on function public.is_active_training_user() from public;
grant execute on function public.is_active_training_user() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tool_families', 'tools', 'scenarios', 'scenario_tools',
    'training_sessions', 'attempts', 'quiz_questions'
  ] loop
    execute format(
      'create policy "active training users only" on public.%I as restrictive to authenticated using ((select public.is_active_training_user())) with check ((select public.is_active_training_user()))',
      table_name
    );
  end loop;
end;
$$;

create policy "active profiles can update" on public.profiles as restrictive
for update to authenticated using ((select public.is_active_training_user()))
with check ((select public.is_active_training_user()));

create or replace function public.admin_list_training_users()
returns table (id uuid, display_name text, role public.app_role, active boolean, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.role, p.active, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where (select public.is_admin())
  order by lower(p.display_name), p.id;
$$;

revoke all on function public.admin_list_training_users() from public;
grant execute on function public.admin_list_training_users() to authenticated;

create or replace function public.admin_training_reset_email(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.id = p_user_id and p.active and (select public.is_admin());
$$;

revoke all on function public.admin_training_reset_email(uuid) from public;
grant execute on function public.admin_training_reset_email(uuid) to authenticated;

create or replace function public.admin_save_training_scenario(
  p_id uuid, p_version timestamptz, p_name text, p_description text,
  p_status public.content_status, p_tool_ids uuid[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_description), '') = '' then
    raise exception 'Enter a scenario name and use case' using errcode = '22023';
  end if;
  if p_status = 'published' and not exists (
    select 1 from public.tools t where t.id = any(p_tool_ids) and t.status = 'published'
  ) then
    raise exception 'Choose at least one published tool before publishing this scenario' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.scenarios (name, description, status)
    values (btrim(p_name), btrim(p_description), p_status)
    returning id into saved_id;
  else
    update public.scenarios
    set name = btrim(p_name), description = btrim(p_description), status = p_status,
        updated_at = greatest(clock_timestamp(), updated_at + interval '1 microsecond')
    where id = p_id and updated_at = p_version
    returning id into saved_id;

    if saved_id is null then
      raise exception 'This scenario changed. Reopen it before saving again' using errcode = '40001';
    end if;
  end if;

  delete from public.scenario_tools st
  where st.scenario_id = saved_id and st.is_correct and not (st.tool_id = any(coalesce(p_tool_ids, array[]::uuid[])));

  insert into public.scenario_tools (scenario_id, tool_id, is_correct)
  select saved_id, selected.tool_id, true
  from (select distinct unnest(p_tool_ids) as tool_id) selected
  on conflict (scenario_id, tool_id) do update set is_correct = true;

  return saved_id;
end;
$$;

revoke all on function public.admin_save_training_scenario(uuid, timestamptz, text, text, public.content_status, uuid[]) from public;
grant execute on function public.admin_save_training_scenario(uuid, timestamptz, text, text, public.content_status, uuid[]) to authenticated;
