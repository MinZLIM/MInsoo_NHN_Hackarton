-- Web Claw Machine - game items (REQ-SHOP-02)
-- Contract: docs/SCHEMA.md 2.7, 4.1, 4.7, 4.8
--
-- Apply after 202608060001_complete_backend.sql from Dashboard > SQL Editor.
-- Safe to run on a project that already has players: no existing row is touched.

begin;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- id is text, not a serial. The client sends 'grip_boost' / 'extra_time'
-- literally, so the key has to be the same string on both sides.
create table public.items (
  id text primary key,
  name text not null,
  price integer not null check (price > 0),
  -- modes this item may be used in. Anything else is rejected at start_game.
  modes public.game_mode[] not null,
  created_at timestamptz not null default now()
);

create table public.user_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- -----------------------------------------------------------------------------
-- 2. Master data
-- Prices and effects must match src/lib/constants.ts SHOP_ITEMS.
-- The effect itself (grip x1.6, +20s) is applied on the client; the server
-- only owns ownership, spending and mode validation.
-- -----------------------------------------------------------------------------

insert into public.items (id, name, price, modes) values
  ('grip_boost', '집게 강화', 1500, array['small']::public.game_mode[]),
  ('extra_time', '시간 연장', 1200, array['small', 'medium']::public.game_mode[])
on conflict (id) do update
  set name = excluded.name,
      price = excluded.price,
      modes = excluded.modes;

-- -----------------------------------------------------------------------------
-- 3. RLS and privileges
-- Same shape as the other tables: reads go through RLS, writes only via RPC.
-- -----------------------------------------------------------------------------

alter table public.items enable row level security;
alter table public.user_items enable row level security;

revoke all on table public.items from anon, authenticated;
revoke all on table public.user_items from anon, authenticated;

grant select on table public.items to authenticated;
grant select on table public.user_items to authenticated;

create policy "items_select_authenticated"
  on public.items
  for select
  to authenticated
  using (true);

create policy "user_items_select_own"
  on public.user_items
  for select
  to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. RPC: get_inventory
-- Returns every item, including ones the player does not own, so the shop can
-- show "보유 0개" and the entry dialog can grey the row out.
-- -----------------------------------------------------------------------------

create or replace function public.get_inventory()
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
        'id', i.id,
        'count', coalesce(ui.count, 0)
      ) order by i.id
    ),
    '[]'::jsonb
  )
  into v_result
  from public.items i
  left join public.user_items ui
    on ui.item_id = i.id
   and ui.user_id = v_user_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC: buy_item
-- Price comes from the items table, never from the client.
-- -----------------------------------------------------------------------------

create or replace function public.buy_item(
  p_item_id text,
  p_count integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_total bigint;
  v_gold bigint;
  v_owned integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_count is null or p_count <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select i.price into v_price
    from public.items i
   where i.id = p_item_id;

  if not found then
    raise exception 'INVALID_TARGET';
  end if;

  select gold into v_gold
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_total := v_price::bigint * p_count;

  if v_gold < v_total then
    raise exception 'INSUFFICIENT_GOLD';
  end if;

  update public.profiles
     set gold = gold - v_total
   where id = v_user_id;

  insert into public.user_items as ui (user_id, item_id, count)
  values (v_user_id, p_item_id, p_count)
  on conflict (user_id, item_id) do update
    set count = ui.count + excluded.count,
        updated_at = now()
  returning ui.count into v_owned;

  insert into public.gold_ledger (user_id, delta, reason)
  values (v_user_id, -v_total, 'item_buy'::public.ledger_reason);

  return jsonb_build_object(
    'id', p_item_id,
    'count', v_owned,
    'gold_after', v_gold - v_total
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. RPC: start_game - now consumes items
--
-- The old single-argument version is dropped first. Keeping both would make
-- start_game(p_mode => 'small') ambiguous, since the new one defaults p_items.
-- Clients that send only p_mode keep working against the new signature.
-- -----------------------------------------------------------------------------

drop function if exists public.start_game(public.game_mode);

create or replace function public.start_game(
  p_mode public.game_mode,
  p_items text[] default '{}'::text[]
)
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
  v_items text[];
  v_item text;
  v_modes public.game_mode[];
  v_have integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_cost := case p_mode
    when 'small'::public.game_mode then 1000
    when 'medium'::public.game_mode then 2000
    when 'large'::public.game_mode then 3000
  end;

  -- Same item twice in one request still costs one. Dedupe before charging.
  select coalesce(array_agg(distinct t), '{}'::text[])
    into v_items
    from unnest(coalesce(p_items, '{}'::text[])) as t;

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

  /*
   * Validate every item before spending anything. If an item check failed
   * halfway through we would have already taken the entry fee, and the player
   * would pay for a game they never got.
   */
  foreach v_item in array v_items loop
    select i.modes into v_modes
      from public.items i
     where i.id = v_item;

    if not found or not (p_mode = any(v_modes)) then
      raise exception 'ITEM_NOT_ALLOWED';
    end if;

    select ui.count into v_have
      from public.user_items ui
     where ui.user_id = v_user_id
       and ui.item_id = v_item
     for update;

    if not found or v_have < 1 then
      raise exception 'NOT_ENOUGH_ITEMS';
    end if;
  end loop;

  foreach v_item in array v_items loop
    update public.user_items
       set count = count - 1,
           updated_at = now()
     where user_id = v_user_id
       and item_id = v_item;
  end loop;

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
    'gold_after', v_gold - v_cost,
    'items_used', to_jsonb(v_items)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Function privileges
-- -----------------------------------------------------------------------------

revoke execute on function public.get_inventory() from public, anon, authenticated;
revoke execute on function public.buy_item(text, integer) from public, anon, authenticated;
revoke execute on function public.start_game(public.game_mode, text[]) from public, anon, authenticated;

grant execute on function public.get_inventory() to authenticated;
grant execute on function public.buy_item(text, integer) to authenticated;
grant execute on function public.start_game(public.game_mode, text[]) to authenticated;

commit;
