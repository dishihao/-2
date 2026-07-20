-- 标本分类助手：加密云同步后端
-- 在 Supabase 项目的 SQL Editor 中完整执行一次。

create table if not exists public.specimen_sync_blob (
  sync_id text primary key,
  payload text not null,
  updated_at bigint not null
);

-- 表本身不直接向浏览器开放；浏览器只能调用下面两个受控函数。
revoke all on table public.specimen_sync_blob from anon, authenticated;
alter table public.specimen_sync_blob enable row level security;

create or replace function public.get_specimen_blob(p_sync_id text)
returns table(payload text, updated_at bigint)
language sql
security definer
set search_path = public
as $$
  select s.payload, s.updated_at
  from public.specimen_sync_blob s
  where s.sync_id = p_sync_id
  limit 1;
$$;

create or replace function public.compare_put_specimen_blob(
  p_sync_id text,
  p_payload text,
  p_expected_updated_at bigint,
  p_new_updated_at bigint
)
returns table(success boolean, payload text, updated_at bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload text;
  v_updated_at bigint;
begin
  -- 同一个同步空间串行处理，避免手机和电脑同时保存时互相覆盖。
  perform pg_advisory_xact_lock(hashtextextended(p_sync_id, 0));

  select s.payload, s.updated_at
  into v_payload, v_updated_at
  from public.specimen_sync_blob s
  where s.sync_id = p_sync_id;

  if not found then
    insert into public.specimen_sync_blob(sync_id, payload, updated_at)
    values (p_sync_id, p_payload, p_new_updated_at);
    return query select true, p_payload, p_new_updated_at;
    return;
  end if;

  if v_updated_at = p_expected_updated_at then
    update public.specimen_sync_blob
    set payload = p_payload,
        updated_at = p_new_updated_at
    where sync_id = p_sync_id;
    return query select true, p_payload, p_new_updated_at;
  else
    return query select false, v_payload, v_updated_at;
  end if;
end;
$$;

revoke all on function public.get_specimen_blob(text) from public;
revoke all on function public.compare_put_specimen_blob(text, text, bigint, bigint) from public;
grant execute on function public.get_specimen_blob(text) to anon, authenticated;
grant execute on function public.compare_put_specimen_blob(text, text, bigint, bigint) to anon, authenticated;
