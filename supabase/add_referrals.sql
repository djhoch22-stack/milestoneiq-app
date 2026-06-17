-- ────────────────────────────────────────────────────────────────────────────
-- TWO-SIDED REFERRAL PROGRAM (Stage 1: schema + RPCs)
-- A "school" = one organization; referrals are org → org (a new paying org = new revenue).
--   • Referee: a NEW school that signs up via raftersiq.com/?ref=<code> gets a 14-day trial.
--   • Referrer: gets ONE FREE MONTH (Stripe account credit applied by the stripe-webhook) the first
--     time the referred school PAYS — never on signup (so free trials can't be farmed).
-- Idempotent; safe to re-run.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Columns on organizations -------------------------------------------------
alter table public.organizations
  add column if not exists referral_code     text,
  add column if not exists referred_by_org   uuid references public.organizations(id),
  add column if not exists referral_rewarded boolean not null default false;

-- short, URL-safe code generator (10 hex chars)
create or replace function public.gen_referral_code()
returns text language sql volatile as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
$$;

-- every org gets a code: default for new orgs + one-time backfill of existing ones
alter table public.organizations alter column referral_code set default public.gen_referral_code();
update public.organizations set referral_code = public.gen_referral_code() where referral_code is null;
create unique index if not exists organizations_referral_code_key on public.organizations(referral_code);

-- 2) apply_referral — the NEW org's admin calls this right after signup with the ?ref= code.
--    Records who referred them + extends their trial to 14 days. No-op if already referred, the code
--    is invalid, or it's a self-referral. SECURITY DEFINER so it can match a DIFFERENT org's code.
create or replace function public.apply_referral(p_org_id uuid, p_ref_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ref uuid;
begin
  if p_org_id is null or coalesce(btrim(p_ref_code), '') = '' then return false; end if;
  if not public.is_school_admin(p_org_id) then return false; end if;                                   -- caller must admin the new org
  if exists (select 1 from organizations where id = p_org_id and referred_by_org is not null) then return false; end if; -- already referred
  select id into v_ref from organizations where referral_code = btrim(p_ref_code) and id <> p_org_id;  -- find referrer (not self)
  if v_ref is null then return false; end if;
  update organizations
     set referred_by_org = v_ref,
         trial_ends_at   = greatest(coalesce(trial_ends_at, now()), now() + interval '14 days')        -- 14-day referee trial (never shortens)
   where id = p_org_id;
  return true;
end $$;
grant execute on function public.apply_referral(uuid, text) to authenticated;

-- 3) my_referral_stats — powers the Settings "Refer a school" card (caller's code + counts).
create or replace function public.my_referral_stats()
returns table(referral_code text, referred_count int, rewarded_count int)
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  -- caller's org = the one they belong to with the most programs (matches the app's chosen org)
  select o.id into v_org
  from organizations o
  where o.id in (select m.org_id from org_members m where m.user_id = auth.uid())
  order by (select count(*) from programs p where p.org_id = o.id) desc
  limit 1;
  if v_org is null then return; end if;
  return query
    select o.referral_code,
           (select count(*)::int from organizations r where r.referred_by_org = v_org),
           (select count(*)::int from organizations r where r.referred_by_org = v_org and r.referral_rewarded)
    from organizations o where o.id = v_org;
end $$;
grant execute on function public.my_referral_stats() to authenticated;

NOTIFY pgrst, 'reload schema';
