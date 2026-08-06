-- OPTIONAL: run only after creating admin@admin.com in
-- Supabase Dashboard > Authentication > Users > Add user.
-- This script does not create or store the password.

do $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
    from auth.users
   where lower(email) = 'admin@admin.com'
   limit 1;

  if v_user_id is null then
    raise exception 'Create admin@admin.com in Authentication > Users first.';
  end if;

  update public.profiles
     set nickname = '게임마스터',
         gold = 1000000
   where id = v_user_id;

  insert into public.user_dolls (user_id, doll_id, count, first_acquired_at)
  select v_user_id, d.id, 1, now()
    from public.dolls d
  on conflict (user_id, doll_id)
  do update set count = 1;

  -- Demo account also gets a stack of every game item (needs 202608070001).
  if to_regclass('public.user_items') is not null then
    insert into public.user_items (user_id, item_id, count)
    select v_user_id, i.id, 9
      from public.items i
    on conflict (user_id, item_id)
    do update set count = 9, updated_at = now();
  end if;

  update public.user_ranks
     set tier = 'challenger'::public.tier_name,
         promote_cnt = 0,
         demote_cnt = 0,
         best_score = case
           when mode = 'small'::public.game_mode then 220
           else 180
         end,
         updated_at = now()
   where user_id = v_user_id
     and mode in ('small'::public.game_mode, 'medium'::public.game_mode);
end;
$$;
