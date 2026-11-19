-- Physics homework platform: shared storage and logins.
-- Run once in the Supabase SQL editor. Safe to re-run: it only creates what is missing and replaces the functions.
--
-- Security model
--   * All data lives in the private "hw" schema. It is not exposed through the API, so nobody can read or write
--     the tables directly, even with the site's public key.
--   * The site can only call the hw_* functions below. Each one checks a session token before doing anything.
--   * Students log in with their number + PIN and can only read their own homework and save their own work.
--   * Teachers log in with a password (stored as a bcrypt hash) and manage classes, students and results.
--   * 8 wrong attempts on one login locks it for 10 minutes, so PINs cannot be guessed by trying them all.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists hw;
revoke all on schema hw from public;

create table if not exists hw.staff (
  login       text primary key,
  name        text not null,
  admin       boolean not null default false,
  pw_hash     text not null,
  must_change boolean not null default false,
  created     timestamptz not null default now()
);
create table if not exists hw.rows (
  coll    text not null check (coll in ('classes', 'students', 'work', 'checks', 'packs', 'custom')),
  key     text not null,
  data    jsonb not null,
  updated timestamptz not null default now(),
  primary key (coll, key)
);
create table if not exists hw.sessions (
  token   text primary key,
  kind    text not null check (kind in ('staff', 'student')),
  login   text not null,
  expires timestamptz not null
);
create table if not exists hw.fails (
  who   text primary key,
  n     int not null default 0,
  until timestamptz
);
create table if not exists hw.settings (
  k text primary key,
  v text not null
);
alter table hw.staff    enable row level security;
alter table hw.rows     enable row level security;
alter table hw.sessions enable row level security;
alter table hw.fails    enable row level security;
alter table hw.settings enable row level security;

-- one-time code needed to create the first (admin) teacher account; deleted once used
insert into hw.settings (k, v) values ('setup_code', '__SETUP_CODE__') on conflict (k) do nothing;

/* ---------------- internal helpers (not callable from the site) ---------------- */

create or replace function hw.who(p_token text, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare l text;
begin
  select s.login into l from hw.sessions s where s.token = p_token and s.kind = p_kind and s.expires > now();
  if l is null then raise exception 'session'; end if;
  if p_kind = 'staff' and not exists (select 1 from hw.staff t where t.login = l)
     and not (l = '_checker' and exists (select 1 from hw.settings where k = 'checker_key')) then raise exception 'session'; end if;
  return l;
end $$;

create or replace function hw.admin_who(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare l text := hw.who(p_token, 'staff');
begin
  if not exists (select 1 from hw.staff t where t.login = l and t.admin) then raise exception 'not_admin'; end if;
  return l;
end $$;

create or replace function hw.new_session(p_kind text, p_login text) returns text
language plpgsql security definer set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  delete from hw.sessions where expires < now();
  insert into hw.sessions (token, kind, login, expires) values (t, p_kind, p_login, now() + interval '12 hours');
  return t;
end $$;

create or replace function hw.is_locked(p_who text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from hw.fails f where f.who = p_who and f.until > now());
$$;

create or replace function hw.fail(p_who text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into hw.fails (who, n) values (p_who, 1)
  on conflict (who) do update set n = hw.fails.n + 1, until = null;
  update hw.fails set until = now() + interval '10 minutes', n = 0 where who = p_who and n >= 8;
end $$;

create or replace function hw.hash(p_pw text) returns text
language sql security definer set search_path = '' as $$
  select extensions.crypt(p_pw, extensions.gen_salt('bf', 10));
$$;

create or replace function hw.pw_ok(p_pw text, p_hash text) returns boolean
language sql security definer set search_path = '' as $$
  select p_hash is not null and p_pw is not null and extensions.crypt(p_pw, p_hash) = p_hash;
$$;

create or replace function hw.staff_me(l text) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('login', t.login, 'name', t.name, 'admin', t.admin, 'mustChange', t.must_change)
  from hw.staff t where t.login = l;
$$;

-- everything one student may see: their own record (without the PIN), their classes,
-- the homework set for them, and their own work. Never other students' work or Claude's check results.
create or replace function hw.student_payload(l text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me jsonb; cls text[]; hws text[];
begin
  select r.data - 'pin' into me from hw.rows r where r.coll = 'students' and r.key = l;
  if me is null then raise exception 'session'; end if;
  select coalesce(array_agg(x), '{}') into cls from jsonb_array_elements_text(coalesce(me -> 'classIds', '[]'::jsonb)) x;
  select coalesce(array_agg(distinct e.key), '{}') into hws
    from hw.rows r, jsonb_each(coalesce(r.data -> 'assigned', '{}'::jsonb)) e
   where r.coll = 'classes' and r.key = any (cls)
     and (e.value -> 'only' is null or jsonb_typeof(e.value -> 'only') <> 'array' or e.value -> 'only' ? l);
  return jsonb_build_object('login', l, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('c', r.coll, 'k', r.key, 'd', case when r.coll = 'students' then r.data - 'pin' else r.data end))
      from hw.rows r
     where (r.coll = 'students' and r.key = l)
        or (r.coll = 'classes' and r.key = any (cls))
        or (r.coll = 'work' and left(r.key, length(l) + 1) = l || '|')
        or (r.coll in ('packs', 'custom') and r.key = any (hws))), '[]'::jsonb));
end $$;

/* ---------------- functions the site calls ---------------- */

create or replace function public.hw_status() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('hasStaff', exists (select 1 from hw.staff));
$$;

create or replace function public.hw_logout(p_token text) returns jsonb
language sql security definer set search_path = '' as $$
  delete from hw.sessions where token = p_token;
  select jsonb_build_object('ok', true);
$$;

-- students -------------------------------------------------------------

create or replace function public.hw_student_login(p_login text, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := lower(trim(coalesce(p_login, ''))); w text := 'student:' || lower(trim(coalesce(p_login, ''))); pin text;
begin
  if hw.is_locked(w) then return jsonb_build_object('error', 'locked'); end if;
  select r.data ->> 'pin' into pin from hw.rows r where r.coll = 'students' and r.key = l;
  if pin is null or pin is distinct from trim(coalesce(p_pin, '')) then
    perform hw.fail(w);
    return jsonb_build_object('error', 'bad_login');
  end if;
  delete from hw.fails where who = w;
  return jsonb_build_object('token', hw.new_session('student', l)) || hw.student_payload(l);
end $$;

create or replace function public.hw_student_load(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return hw.student_payload(hw.who(p_token, 'student'));
end $$;

create or replace function public.hw_student_save(p_token text, p_hw text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := hw.who(p_token, 'student');
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad_data'; end if;
  if octet_length(p_data::text) > 4000000 then raise exception 'too_big'; end if;
  if not exists (
    select 1 from hw.rows s, hw.rows c
     where s.coll = 'students' and s.key = l
       and c.coll = 'classes' and c.key in (select jsonb_array_elements_text(coalesce(s.data -> 'classIds', '[]'::jsonb)))
       and c.data -> 'assigned' ? p_hw
       and (c.data -> 'assigned' -> p_hw -> 'only' is null
            or jsonb_typeof(c.data -> 'assigned' -> p_hw -> 'only') <> 'array'
            or c.data -> 'assigned' -> p_hw -> 'only' ? l)) then
    raise exception 'not_assigned';
  end if;
  insert into hw.rows (coll, key, data) values ('work', l || '|' || p_hw, p_data)
  on conflict (coll, key) do update set data = excluded.data, updated = now();
  return jsonb_build_object('ok', true);
end $$;

-- teachers -------------------------------------------------------------

create or replace function public.hw_setup_admin(p_code text, p_login text, p_name text, p_pw text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := lower(trim(coalesce(p_login, '')));
begin
  if exists (select 1 from hw.staff) then return jsonb_build_object('error', 'exists'); end if;
  if hw.is_locked('setup') then return jsonb_build_object('error', 'locked'); end if;
  if p_code is null or p_code is distinct from (select v from hw.settings where k = 'setup_code') then
    perform hw.fail('setup');
    return jsonb_build_object('error', 'bad_code');
  end if;
  if length(coalesce(p_pw, '')) < 8 then return jsonb_build_object('error', 'short'); end if;
  if l = '' or coalesce(trim(p_name), '') = '' then return jsonb_build_object('error', 'bad_name'); end if;
  insert into hw.staff (login, name, admin, pw_hash) values (l, trim(p_name), true, hw.hash(p_pw));
  delete from hw.settings where k = 'setup_code';
  return jsonb_build_object('token', hw.new_session('staff', l));
end $$;

create or replace function public.hw_staff_login(p_login text, p_pw text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := lower(trim(coalesce(p_login, ''))); w text := 'staff:' || lower(trim(coalesce(p_login, ''))); h text;
begin
  if hw.is_locked(w) then return jsonb_build_object('error', 'locked'); end if;
  select t.pw_hash into h from hw.staff t where t.login = l;
  if not hw.pw_ok(p_pw, h) then
    perform hw.fail(w);
    return jsonb_build_object('error', 'bad_login');
  end if;
  delete from hw.fails where who = w;
  return jsonb_build_object('token', hw.new_session('staff', l));
end $$;

create or replace function public.hw_staff_load(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := hw.who(p_token, 'staff');
begin
  return jsonb_build_object(
    'me', hw.staff_me(l),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('login', t.login, 'name', t.name, 'admin', t.admin,
                         'mustChange', t.must_change, 'created', extract(epoch from t.created) * 1000)) from hw.staff t), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('c', r.coll, 'k', r.key, 'd', r.data)) from hw.rows r), '[]'::jsonb));
end $$;

create or replace function public.hw_staff_sync(p_token text, p_put jsonb, p_del jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := hw.who(p_token, 'staff');
begin
  -- the overnight checker may only write check results
  if l = '_checker' and (exists (select 1 from jsonb_array_elements(coalesce(p_put, '[]'::jsonb)) x where x ->> 'c' <> 'checks')
                         or jsonb_array_length(coalesce(p_del, '[]'::jsonb)) > 0) then
    raise exception 'not_allowed';
  end if;
  insert into hw.rows (coll, key, data)
  select x ->> 'c', x ->> 'k', x -> 'd' from jsonb_array_elements(coalesce(p_put, '[]'::jsonb)) x
  on conflict (coll, key) do update set data = excluded.data, updated = now();
  delete from hw.rows r using jsonb_array_elements(coalesce(p_del, '[]'::jsonb)) x
   where r.coll = x ->> 'c' and r.key = x ->> 'k';
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.hw_staff_password(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l text := hw.who(p_token, 'staff'); t record;
begin
  select * into t from hw.staff where login = l;
  if not t.must_change and not hw.pw_ok(p_old, t.pw_hash) then return jsonb_build_object('error', 'bad_password'); end if;
  if length(coalesce(p_new, '')) < 8 then return jsonb_build_object('error', 'short'); end if;
  update hw.staff set pw_hash = hw.hash(p_new), must_change = false where login = l;
  delete from hw.sessions where kind = 'staff' and login = l and token <> p_token;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.hw_staff_create(p_token text, p_login text, p_name text, p_pw text, p_admin boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := hw.admin_who(p_token); l text := lower(trim(coalesce(p_login, '')));
begin
  if l = '' or coalesce(trim(p_name), '') = '' then return jsonb_build_object('error', 'bad_name'); end if;
  if length(coalesce(p_pw, '')) < 8 then return jsonb_build_object('error', 'short'); end if;
  if exists (select 1 from hw.staff where login = l) then return jsonb_build_object('error', 'exists'); end if;
  insert into hw.staff (login, name, admin, pw_hash, must_change) values (l, trim(p_name), coalesce(p_admin, false), hw.hash(p_pw), true);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.hw_staff_reset(p_token text, p_login text, p_pw text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := hw.admin_who(p_token);
begin
  if length(coalesce(p_pw, '')) < 8 then return jsonb_build_object('error', 'short'); end if;
  update hw.staff set pw_hash = hw.hash(p_pw), must_change = true where login = p_login;
  if not found then return jsonb_build_object('error', 'missing'); end if;
  delete from hw.sessions where kind = 'staff' and login = p_login;
  delete from hw.fails where who = 'staff:' || p_login;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.hw_staff_set_admin(p_token text, p_login text, p_admin boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := hw.admin_who(p_token);
begin
  if p_login = me then return jsonb_build_object('error', 'self'); end if;
  if not p_admin and (select count(*) from hw.staff where admin and login <> p_login) = 0 then
    return jsonb_build_object('error', 'last_admin');
  end if;
  update hw.staff set admin = p_admin where login = p_login;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.hw_staff_delete(p_token text, p_login text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := hw.admin_who(p_token);
begin
  if p_login = me then return jsonb_build_object('error', 'self'); end if;
  delete from hw.staff where login = p_login;
  delete from hw.sessions where kind = 'staff' and login = p_login;
  return jsonb_build_object('ok', true);
end $$;

-- overnight checker: Claude's scheduled check logs in with a long secret key (stored only in hw.settings
-- and in the scheduled task). It can read everything a teacher can, and write only check results.
create or replace function public.hw_checker_login(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := (select v from hw.settings where k = 'checker_key');
begin
  if hw.is_locked('checker') then return jsonb_build_object('error', 'locked'); end if;
  if k is null or length(k) < 24 or p_key is distinct from k then
    perform hw.fail('checker');
    return jsonb_build_object('error', 'bad_key');
  end if;
  delete from hw.fails where who = 'checker';
  return jsonb_build_object('token', hw.new_session('staff', '_checker'));
end $$;

/* ---------------- permissions ---------------- */

revoke all on all tables in schema hw from public;
revoke execute on all functions in schema hw from public;
do $$
declare f text;
begin
  foreach f in array array[
    'hw_status()', 'hw_logout(text)',
    'hw_student_login(text, text)', 'hw_student_load(text)', 'hw_student_save(text, text, jsonb)',
    'hw_setup_admin(text, text, text, text)', 'hw_staff_login(text, text)', 'hw_staff_load(text)',
    'hw_staff_sync(text, jsonb, jsonb)', 'hw_staff_password(text, text, text)',
    'hw_staff_create(text, text, text, text, boolean)', 'hw_staff_reset(text, text, text)',
    'hw_staff_set_admin(text, text, boolean)', 'hw_staff_delete(text, text)', 'hw_checker_login(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
