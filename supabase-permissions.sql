-- 标本分类助手：管理员权限扩展
-- 在 Supabase SQL Editor 中完整执行一次。
-- 普通人员可分类上架；只有管理员密码可以退回已分类品种。

create extension if not exists pgcrypto;

create table if not exists public.specimen_admin_credentials (
  sync_id text primary key,
  password_hash text not null,
  created_at bigint not null
);

create table if not exists public.specimen_classification_lock (
  sync_id text not null,
  item_id integer not null,
  classified boolean not null,
  updated_at bigint not null,
  primary key (sync_id, item_id)
);

revoke all on table public.specimen_admin_credentials from anon, authenticated;
revoke all on table public.specimen_classification_lock from anon, authenticated;
alter table public.specimen_admin_credentials enable row level security;
alter table public.specimen_classification_lock enable row level security;

create or replace function public.specimen_admin_exists(p_sync_id text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1 from public.specimen_admin_credentials a where a.sync_id = p_sync_id
  );
$$;

create or replace function public.set_specimen_admin_once(p_sync_id text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_sync_id is null or length(p_sync_id) < 16 then
    raise exception 'invalid sync id';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'administrator password must be at least 8 characters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('admin:' || p_sync_id, 0));
  if exists(select 1 from public.specimen_admin_credentials where sync_id = p_sync_id) then
    return false;
  end if;

  insert into public.specimen_admin_credentials(sync_id, password_hash, created_at)
  values (
    p_sync_id,
    crypt(p_password, gen_salt('bf', 12)),
    (extract(epoch from clock_timestamp()) * 1000)::bigint
  );
  return true;
end;
$$;

create or replace function public.verify_specimen_admin(p_sync_id text, p_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce((
    select a.password_hash = crypt(p_password, a.password_hash)
    from public.specimen_admin_credentials a
    where a.sync_id = p_sync_id
  ), false);
$$;

create or replace function public.get_specimen_classification_locks(p_sync_id text)
returns table(item_id integer, classified boolean, updated_at bigint)
language sql
security definer
set search_path = public
as $$
  select s.item_id, s.classified, s.updated_at
  from public.specimen_classification_lock s
  where s.sync_id = p_sync_id
  order by s.item_id;
$$;

create or replace function public.set_specimen_classification_lock(
  p_sync_id text,
  p_item_id integer,
  p_classified boolean,
  p_admin_password text,
  p_new_updated_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_ok boolean := false;
begin
  if p_item_id is null or p_item_id < 1 or p_item_id > 100000 then
    raise exception 'invalid item id';
  end if;

  if p_classified = false then
    select coalesce((
      select a.password_hash = crypt(p_admin_password, a.password_hash)
      from public.specimen_admin_credentials a
      where a.sync_id = p_sync_id
    ), false) into v_admin_ok;
    if not v_admin_ok then return false; end if;
  end if;

  insert into public.specimen_classification_lock(sync_id, item_id, classified, updated_at)
  values (p_sync_id, p_item_id, p_classified, p_new_updated_at)
  on conflict (sync_id, item_id) do update
  set classified = excluded.classified,
      updated_at = excluded.updated_at;
  return true;
end;
$$;

create or replace function public.admin_reset_specimen_classification(
  p_sync_id text,
  p_admin_password text,
  p_new_updated_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_ok boolean := false;
begin
  select coalesce((
    select a.password_hash = crypt(p_admin_password, a.password_hash)
    from public.specimen_admin_credentials a
    where a.sync_id = p_sync_id
  ), false) into v_admin_ok;
  if not v_admin_ok then return false; end if;

  insert into public.specimen_classification_lock(sync_id, item_id, classified, updated_at)
  select p_sync_id, n, false, p_new_updated_at
  from generate_series(1, 809) as n
  on conflict (sync_id, item_id) do update
  set classified = false,
      updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke all on function public.specimen_admin_exists(text) from public;
revoke all on function public.set_specimen_admin_once(text, text) from public;
revoke all on function public.verify_specimen_admin(text, text) from public;
revoke all on function public.get_specimen_classification_locks(text) from public;
revoke all on function public.set_specimen_classification_lock(text, integer, boolean, text, bigint) from public;
revoke all on function public.admin_reset_specimen_classification(text, text, bigint) from public;

grant execute on function public.specimen_admin_exists(text) to anon, authenticated;
grant execute on function public.set_specimen_admin_once(text, text) to anon, authenticated;
grant execute on function public.verify_specimen_admin(text, text) to anon, authenticated;
grant execute on function public.get_specimen_classification_locks(text) to anon, authenticated;
grant execute on function public.set_specimen_classification_lock(text, integer, boolean, text, bigint) to anon, authenticated;
grant execute on function public.admin_reset_specimen_classification(text, text, bigint) to anon, authenticated;

-- 立即刷新 Data API 的函数缓存，避免刚执行完脚本时出现 PGRST202 / 找不到函数。
notify pgrst, 'reload schema';
select pg_notification_queue_usage();

-- 成功执行后，下面应返回 6 行。
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'specimen_admin_exists',
    'set_specimen_admin_once',
    'verify_specimen_admin',
    'get_specimen_classification_locks',
    'set_specimen_classification_lock',
    'admin_reset_specimen_classification'
  )
order by p.proname;
