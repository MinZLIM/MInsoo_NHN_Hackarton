-- Web Claw Machine - Supabase backend
-- Contract: docs/SCHEMA.md
-- Apply once to a fresh Supabase project from Dashboard > SQL Editor.

begin;

-- -----------------------------------------------------------------------------
-- 1. Types
-- -----------------------------------------------------------------------------

create type public.doll_size as enum ('small', 'medium', 'large');
create type public.game_mode as enum ('small', 'medium', 'large');
create type public.tier_name as enum (
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'challenger'
);
create type public.session_status as enum ('playing', 'finished', 'aborted');
create type public.ledger_reason as enum (
  'signup',
  'game_entry',
  'doll_sell',
  'item_buy',
  'transfer_in',
  'transfer_out'
);

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique
    check (char_length(btrim(nickname)) between 2 and 12),
  gold bigint not null default 10000
    check (gold >= 0),
  created_at timestamptz not null default now()
);

create table public.dolls (
  id integer primary key,
  name text not null,
  size public.doll_size not null,
  image_path text not null unique,
  sell_price integer not null check (sell_price > 0),
  drop_weight integer not null default 1 check (drop_weight > 0)
);

create table public.user_dolls (
  user_id uuid not null references auth.users(id) on delete cascade,
  doll_id integer not null references public.dolls(id) on delete restrict,
  count integer not null default 0 check (count >= 0),
  first_acquired_at timestamptz not null default now(),
  primary key (user_id, doll_id)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.game_mode not null,
  cost integer not null check (cost > 0),
  score integer not null default 0 check (score >= 0),
  status public.session_status not null default 'playing',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.tiers (
  tier public.tier_name primary key,
  level integer not null unique check (level between 1 and 7),
  promote_score integer not null check (promote_score >= 0),
  promote_count integer not null check (promote_count > 0),
  demote_score integer not null check (demote_score >= 0),
  demote_count integer not null check (demote_count > 0)
);

create table public.user_ranks (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.game_mode not null check (mode in ('small', 'medium')),
  tier public.tier_name not null default 'bronze',
  promote_cnt integer not null default 0 check (promote_cnt >= 0),
  demote_cnt integer not null default 0 check (demote_cnt >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create table public.gold_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta bigint not null check (delta <> 0),
  reason public.ledger_reason not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index user_dolls_doll_id_idx
  on public.user_dolls(doll_id);

create index game_sessions_user_status_idx
  on public.game_sessions(user_id, status);

create index user_ranks_mode_score_idx
  on public.user_ranks(mode, best_score desc, updated_at asc);

create index gold_ledger_user_created_idx
  on public.gold_ledger(user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Master data - tiers and 45 dolls
-- IDs follow src/mocks/dolls.ts exactly:
-- small 1..30, medium 101..110, large 201..205.
-- -----------------------------------------------------------------------------

insert into public.tiers (
  tier, level, promote_score, promote_count, demote_score, demote_count
) values
  ('bronze',    1,  20,  3,  0, 99),
  ('silver',    2,  30,  3, 20,  4),
  ('gold',      3,  40,  3, 25,  4),
  ('platinum',  4,  50,  3, 30,  4),
  ('diamond',   5,  60,  3, 35,  4),
  ('master',    6,  70,  3, 40,  4),
  ('challenger',7, 999, 99, 50,  4);

insert into public.dolls (id, name, size, image_path, sell_price, drop_weight) values
  (1,   '토끼',          'small',  'dolls/small_01.png',   1000, 1),
  (2,   '펭귄',          'small',  'dolls/small_02.png',   1000, 1),
  (3,   '병아리',        'small',  'dolls/small_03.png',   1000, 1),
  (4,   '고양이',        'small',  'dolls/small_04.png',   1000, 1),
  (5,   '강아지',        'small',  'dolls/small_05.png',   1000, 1),
  (6,   '햄스터',        'small',  'dolls/small_06.png',   1000, 1),
  (7,   '개구리',        'small',  'dolls/small_07.png',   1000, 1),
  (8,   '오리',          'small',  'dolls/small_08.png',   1000, 1),
  (9,   '다람쥐',        'small',  'dolls/small_09.png',   1000, 1),
  (10,  '너구리',        'small',  'dolls/small_10.png',   1000, 1),
  (11,  '판다',          'small',  'dolls/small_11.png',   1000, 1),
  (12,  '코알라',        'small',  'dolls/small_12.png',   1000, 1),
  (13,  '여우',          'small',  'dolls/small_13.png',   1000, 1),
  (14,  '늑대',          'small',  'dolls/small_14.png',   1000, 1),
  (15,  '사슴',          'small',  'dolls/small_15.png',   1000, 1),
  (16,  '양',            'small',  'dolls/small_16.png',   1000, 1),
  (17,  '돼지',          'small',  'dolls/small_17.png',   1000, 1),
  (18,  '소',            'small',  'dolls/small_18.png',   1000, 1),
  (19,  '호랑이',        'small',  'dolls/small_19.png',   1000, 1),
  (20,  '사자',          'small',  'dolls/small_20.png',   1000, 1),
  (21,  '문어',          'small',  'dolls/small_21.png',   1000, 1),
  (22,  '상어',          'small',  'dolls/small_22.png',   1000, 1),
  (23,  '고래',          'small',  'dolls/small_23.png',   1000, 1),
  (24,  '거북이',        'small',  'dolls/small_24.png',   1000, 1),
  (25,  '오징어',        'small',  'dolls/small_25.png',   1000, 1),
  (26,  '유니콘',        'small',  'dolls/small_26.png',   1000, 1),
  (27,  '드래곤',        'small',  'dolls/small_27.png',   1000, 1),
  (28,  '공룡',          'small',  'dolls/small_28.png',   1000, 1),
  (29,  '로봇',          'small',  'dolls/small_29.png',   1000, 1),
  (30,  '외계인',        'small',  'dolls/small_30.png',   1000, 1),
  (101, '거대곰',        'medium', 'dolls/medium_01.png',  3000, 1),
  (102, '킹펭귄',        'medium', 'dolls/medium_02.png',  3000, 1),
  (103, '점보토끼',      'medium', 'dolls/medium_03.png',  3000, 1),
  (104, '빅캣',          'medium', 'dolls/medium_04.png',  3000, 1),
  (105, '왕댕댕',        'medium', 'dolls/medium_05.png',  3000, 1),
  (106, '메가판다',      'medium', 'dolls/medium_06.png',  3000, 1),
  (107, '자이언트여우',  'medium', 'dolls/medium_07.png',  3000, 1),
  (108, '대형양',        'medium', 'dolls/medium_08.png',  3000, 1),
  (109, '빅샤크',        'medium', 'dolls/medium_09.png',  3000, 1),
  (110, '메가드래곤',    'medium', 'dolls/medium_10.png',  3000, 1),
  (201, '전설의 곰',     'large',  'dolls/large_01.png',   5000, 1),
  (202, '황금 유니콘',   'large',  'dolls/large_02.png',   5000, 1),
  (203, '거대 드래곤',   'large',  'dolls/large_03.png',   5000, 1),
  (204, '우주 고래',     'large',  'dolls/large_04.png',   5000, 1),
  (205, '전설의 로봇',   'large',  'dolls/large_05.png',   5000, 1);

-- -----------------------------------------------------------------------------
-- 4. Auth trigger - profile, initial Gold, ranks and ledger
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text;
begin
  v_nickname := nullif(btrim(new.raw_user_meta_data ->> 'nickname'), '');

  if v_nickname is null then
    v_nickname := 'player_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, nickname, gold)
  values (new.id, v_nickname, 10000);

  insert into public.user_ranks (user_id, mode)
  values
    (new.id, 'small'::public.game_mode),
    (new.id, 'medium'::public.game_mode);

  insert into public.gold_ledger (user_id, delta, reason)
  values (new.id, 10000, 'signup'::public.ledger_reason);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. RLS and table privileges
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.dolls enable row level security;
alter table public.user_dolls enable row level security;
alter table public.game_sessions enable row level security;
alter table public.tiers enable row level security;
alter table public.user_ranks enable row level security;
alter table public.gold_ledger enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.dolls from anon, authenticated;
revoke all on table public.user_dolls from anon, authenticated;
revoke all on table public.game_sessions from anon, authenticated;
revoke all on table public.tiers from anon, authenticated;
revoke all on table public.user_ranks from anon, authenticated;
revoke all on table public.gold_ledger from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (nickname) on table public.profiles to authenticated;
grant select on table public.dolls to authenticated;
grant select on table public.user_dolls to authenticated;
grant select on table public.game_sessions to authenticated;
grant select on table public.tiers to authenticated;
grant select on table public.user_ranks to authenticated;
grant select on table public.gold_ledger to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own_nickname"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "dolls_select_authenticated"
on public.dolls
for select
to authenticated
using (true);

create policy "user_dolls_select_own"
on public.user_dolls
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "game_sessions_select_own"
on public.game_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "tiers_select_authenticated"
on public.tiers
for select
to authenticated
using (true);

create policy "user_ranks_select_own"
on public.user_ranks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "gold_ledger_select_own"
on public.gold_ledger
for select
to authenticated
using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 6. Internal rank helper
-- -----------------------------------------------------------------------------

create or replace function public.apply_rank_result(
  p_user_id uuid,
  p_mode public.game_mode,
  p_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rank public.user_ranks%rowtype;
  v_rule public.tiers%rowtype;
  v_before public.tier_name;
  v_after public.tier_name;
  v_next public.tier_name;
  v_changed text := 'none';
begin
  if p_mode = 'large'::public.game_mode then
    return null;
  end if;

  insert into public.user_ranks (user_id, mode)
  values (p_user_id, p_mode)
  on conflict (user_id, mode) do nothing;

  select *
    into v_rank
    from public.user_ranks
   where user_id = p_user_id
     and mode = p_mode
   for update;

  select *
    into v_rule
    from public.tiers
   where tier = v_rank.tier;

  v_before := v_rank.tier;
  v_after := v_rank.tier;
  v_rank.best_score := greatest(v_rank.best_score, p_score);

  if p_score >= v_rule.promote_score then
    v_rank.promote_cnt := v_rank.promote_cnt + 1;

    if v_rank.promote_cnt >= v_rule.promote_count and v_rule.level < 7 then
      select tier
        into v_next
        from public.tiers
       where level = v_rule.level + 1;

      v_after := v_next;
      v_changed := 'promote';
      v_rank.promote_cnt := 0;
      v_rank.demote_cnt := 0;
    end if;
  elsif p_score < v_rule.demote_score then
    v_rank.demote_cnt := v_rank.demote_cnt + 1;

    if v_rank.demote_cnt >= v_rule.demote_count and v_rule.level > 1 then
      select tier
        into v_next
        from public.tiers
       where level = v_rule.level - 1;

      v_after := v_next;
      v_changed := 'demote';
      v_rank.promote_cnt := 0;
      v_rank.demote_cnt := 0;
    end if;
  end if;

  update public.user_ranks
     set tier = v_after,
         promote_cnt = v_rank.promote_cnt,
         demote_cnt = v_rank.demote_cnt,
         best_score = v_rank.best_score,
         updated_at = now()
   where user_id = p_user_id
     and mode = p_mode;

  return jsonb_build_object(
    'mode', p_mode,
    'before', v_before,
    'after', v_after,
    'changed', v_changed
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. RPC: start_game
-- -----------------------------------------------------------------------------

create or replace function public.start_game(p_mode public.game_mode)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cost integer;
  v_gold bigint;
  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_cost := case p_mode
    when 'small'::public.game_mode then 1000
    when 'medium'::public.game_mode then 2000
    when 'large'::public.game_mode then 3000
  end;

  select gold
    into v_gold
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_gold < v_cost then
    raise exception 'INSUFFICIENT_GOLD';
  end if;

  update public.profiles
     set gold = gold - v_cost
   where id = v_user_id;

  insert into public.game_sessions (user_id, mode, cost)
  values (v_user_id, p_mode, v_cost)
  returning id into v_session_id;

  insert into public.gold_ledger (user_id, delta, reason, ref_id)
  values (
    v_user_id,
    -v_cost,
    'game_entry'::public.ledger_reason,
    v_session_id
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'mode', p_mode,
    'cost', v_cost,
    'gold_after', v_gold - v_cost
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. RPC: finish_game
-- -----------------------------------------------------------------------------

create or replace function public.finish_game(
  p_session_id uuid,
  p_caught integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.game_sessions%rowtype;
  v_score integer;
  v_dolls jsonb := '[]'::jsonb;
  v_rank jsonb := null;
  v_doll record;
  v_owned_count integer;
  v_was_owned boolean;
  v_roll numeric;
  v_index integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_session
    from public.game_sessions
   where id = p_session_id
     and user_id = v_user_id
     and status = 'playing'::public.session_status
   for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if p_caught is null or p_caught < 0 then
    raise exception 'INVALID_CAUGHT';
  end if;

  if (v_session.mode in ('small'::public.game_mode, 'medium'::public.game_mode) and p_caught > 10)
     or (v_session.mode = 'large'::public.game_mode and p_caught > 1) then
    raise exception 'INVALID_CAUGHT';
  end if;

  v_score := p_caught * 10;

  if p_caught > 0 then
    for v_index in 1..p_caught loop
      select random() * sum(d.drop_weight)
        into v_roll
        from public.dolls d
       where d.size::text = v_session.mode::text
         and d.drop_weight > 0;

      select weighted.id,
             weighted.name,
             weighted.size,
             weighted.image_path
        into v_doll
        from (
          select d.id,
                 d.name,
                 d.size,
                 d.image_path,
                 sum(d.drop_weight) over (order by d.id) as running_weight
            from public.dolls d
           where d.size::text = v_session.mode::text
             and d.drop_weight > 0
        ) as weighted
       where weighted.running_weight >= v_roll
       order by weighted.running_weight
       limit 1;

      if not found then
        raise exception 'DOLL_POOL_EMPTY';
      end if;

      select ud.count
        into v_owned_count
        from public.user_dolls ud
       where ud.user_id = v_user_id
         and ud.doll_id = v_doll.id
       for update;

      v_was_owned := found;

      insert into public.user_dolls (
        user_id,
        doll_id,
        count,
        first_acquired_at
      ) values (
        v_user_id,
        v_doll.id,
        1,
        now()
      )
      on conflict (user_id, doll_id)
      do update set count = public.user_dolls.count + 1;

      v_dolls := v_dolls || jsonb_build_array(
        jsonb_build_object(
          'id', v_doll.id,
          'name', v_doll.name,
          'size', v_doll.size,
          'image_path', v_doll.image_path,
          'is_new', not v_was_owned
        )
      );
    end loop;
  end if;

  if v_session.mode <> 'large'::public.game_mode then
    v_rank := public.apply_rank_result(v_user_id, v_session.mode, v_score);
  end if;

  update public.game_sessions
     set score = v_score,
         status = 'finished'::public.session_status,
         finished_at = now()
   where id = v_session.id;

  return jsonb_build_object(
    'score', v_score,
    'dolls', v_dolls,
    'rank', v_rank
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. RPC: get_collection
-- -----------------------------------------------------------------------------

create or replace function public.get_collection()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'size', d.size,
        'image_path', d.image_path,
        'count', coalesce(ud.count, 0),
        'owned', coalesce(ud.count, 0) > 0
      ) order by d.id
    ),
    '[]'::jsonb
  )
  into v_result
  from public.dolls d
  left join public.user_dolls ud
    on ud.doll_id = d.id
   and ud.user_id = v_user_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. RPC: sell_doll
-- -----------------------------------------------------------------------------

create or replace function public.sell_doll(
  p_doll_id integer,
  p_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_have integer;
  v_price integer;
  v_earned bigint;
  v_gold bigint;
  v_remain integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_count is null or p_count <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select ud.count, d.sell_price
    into v_have, v_price
    from public.user_dolls ud
    join public.dolls d on d.id = ud.doll_id
   where ud.user_id = v_user_id
     and ud.doll_id = p_doll_id
   for update of ud;

  if not found or v_have < p_count then
    raise exception 'NOT_ENOUGH_DOLLS';
  end if;

  select gold
    into v_gold
    from public.profiles
   where id = v_user_id
   for update;

  v_earned := v_price::bigint * p_count;
  v_remain := v_have - p_count;

  update public.user_dolls
     set count = v_remain
   where user_id = v_user_id
     and doll_id = p_doll_id;

  update public.profiles
     set gold = gold + v_earned
   where id = v_user_id;

  insert into public.gold_ledger (user_id, delta, reason)
  values (v_user_id, v_earned, 'doll_sell'::public.ledger_reason);

  return jsonb_build_object(
    'sold', p_count,
    'earned', v_earned,
    'gold_after', v_gold + v_earned,
    'remain', v_remain
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. RPC: transfer_gold
-- -----------------------------------------------------------------------------

create or replace function public.transfer_gold(
  p_to_nickname text,
  p_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_id uuid;
  v_target_nickname text;
  v_gold bigint;
  v_transfer_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select id, nickname
    into v_target_id, v_target_nickname
    from public.profiles
   where nickname = btrim(p_to_nickname);

  if not found or v_target_id = v_user_id then
    raise exception 'INVALID_TARGET';
  end if;

  -- Lock both profile rows in a deterministic order to avoid cross-transfer deadlocks.
  perform 1
    from public.profiles
   where id in (v_user_id, v_target_id)
   order by id
   for update;

  select gold
    into v_gold
    from public.profiles
   where id = v_user_id;

  if v_gold < p_amount then
    raise exception 'INSUFFICIENT_GOLD';
  end if;

  update public.profiles
     set gold = gold - p_amount
   where id = v_user_id;

  update public.profiles
     set gold = gold + p_amount
   where id = v_target_id;

  insert into public.gold_ledger (user_id, delta, reason, ref_id)
  values
    (v_user_id, -p_amount, 'transfer_out'::public.ledger_reason, v_transfer_id),
    (v_target_id, p_amount, 'transfer_in'::public.ledger_reason, v_transfer_id);

  return jsonb_build_object(
    'to', v_target_nickname,
    'amount', p_amount,
    'gold_after', v_gold - p_amount
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. RPC: get_leaderboard
-- -----------------------------------------------------------------------------

create or replace function public.get_leaderboard(
  p_mode public.game_mode,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_top jsonb;
  v_me jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_mode not in ('small'::public.game_mode, 'medium'::public.game_mode) then
    raise exception 'INVALID_MODE';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 20), 1), 100);

  with ranked as (
    select row_number() over (
             order by ur.best_score desc, ur.updated_at asc, ur.user_id asc
           ) as rank,
           ur.user_id,
           p.nickname,
           ur.tier,
           ur.best_score
      from public.user_ranks ur
      join public.profiles p on p.id = ur.user_id
     where ur.mode = p_mode
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'rank', ranked.rank,
               'nickname', ranked.nickname,
               'tier', ranked.tier,
               'best_score', ranked.best_score
             ) order by ranked.rank
           ),
           '[]'::jsonb
         )
    into v_top
    from (
      select * from ranked order by rank limit v_limit
    ) as ranked;

  with ranked as (
    select row_number() over (
             order by ur.best_score desc, ur.updated_at asc, ur.user_id asc
           ) as rank,
           ur.user_id,
           p.nickname,
           ur.tier,
           ur.best_score
      from public.user_ranks ur
      join public.profiles p on p.id = ur.user_id
     where ur.mode = p_mode
  )
  select jsonb_build_object(
           'rank', ranked.rank,
           'nickname', ranked.nickname,
           'tier', ranked.tier,
           'best_score', ranked.best_score
         )
    into v_me
    from ranked
   where ranked.user_id = v_user_id;

  return jsonb_build_object(
    'top', v_top,
    'me', v_me
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 13. Function privileges
-- -----------------------------------------------------------------------------

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.apply_rank_result(uuid, public.game_mode, integer) from public, anon, authenticated;

revoke execute on function public.start_game(public.game_mode) from public, anon, authenticated;
revoke execute on function public.finish_game(uuid, integer) from public, anon, authenticated;
revoke execute on function public.get_collection() from public, anon, authenticated;
revoke execute on function public.sell_doll(integer, integer) from public, anon, authenticated;
revoke execute on function public.transfer_gold(text, bigint) from public, anon, authenticated;
revoke execute on function public.get_leaderboard(public.game_mode, integer) from public, anon, authenticated;

grant execute on function public.start_game(public.game_mode) to authenticated;
grant execute on function public.finish_game(uuid, integer) to authenticated;
grant execute on function public.get_collection() to authenticated;
grant execute on function public.sell_doll(integer, integer) to authenticated;
grant execute on function public.transfer_gold(text, bigint) to authenticated;
grant execute on function public.get_leaderboard(public.game_mode, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 14. Realtime Gold updates
-- -----------------------------------------------------------------------------

alter table public.profiles replica identity full;

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

commit;
