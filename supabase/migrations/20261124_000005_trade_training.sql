begin;

alter table public.tools
  add column if not exists is_wire boolean,
  add column if not exists is_line boolean,
  add column if not exists is_meter boolean;

alter table public.tools
  alter column is_wire drop not null,
  alter column is_wire drop default,
  alter column is_line drop not null,
  alter column is_line drop default,
  alter column is_meter drop not null,
  alter column is_meter drop default;

alter table public.profiles
  add column trade text not null default 'general'
    check (trade in ('general', 'wire', 'line', 'meter')),
  add column trade_only boolean not null default false,
  add constraint profiles_trade_only_requires_trade check (trade <> 'general' or not trade_only);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, trade)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Learner'), '@', 1)),
    case new.raw_user_meta_data ->> 'trade'
      when 'wire' then 'wire'
      when 'line' then 'line'
      when 'meter' then 'meter'
      else 'general'
    end
  );
  return new;
end;
$$;

commit;
