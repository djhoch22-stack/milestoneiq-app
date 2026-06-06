// ── supabase_client.js ────────────────────────────────────────────────────────
// Add this file to your StackBlitz project as src/supabase_client.js
// Replace the placeholder values with your actual keys from your .env file

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odirpbptemubzysrvajh.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXJwYnB0ZW11Ynp5c3J2YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwNzQsImV4cCI6MjA5NTkxNzA3NH0.Ikr03FPjiYcXdwr0ng5aNKA-cyHH2tnRpOieeCuy1JI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

export const onAuthChange = (cb) => supabase.auth.onAuthStateChange(cb);

// ── Profile helpers ───────────────────────────────────────────────────────────
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { data, error };
};

// Change the signed-in user's password. Verifies the current password by
// re-authenticating first (Supabase's updateUser doesn't check it otherwise).
export const changePassword = async (email, currentPassword, newPassword) => {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (authErr) return { error: { message: 'Current password is incorrect' } };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
};

// ── Organization helpers ──────────────────────────────────────────────────────
export const createOrg = async (name, userId) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name, slug, created_by: userId })
    .select()
    .single();
  if (orgErr) return { error: orgErr };

  // Add creator as owner
  const { error: memberErr } = await supabase
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' });
  if (memberErr) return { error: memberErr };

  return { data: org };
};

export const getUserOrgs = async (userId) => {
  const { data, error } = await supabase
    .from('org_members')
    .select('role, organizations(*)')
    .eq('user_id', userId);
  return { data, error };
};

// ── Program helpers ───────────────────────────────────────────────────────────
export const getPrograms = async (orgId) => {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at');
  return { data, error };
};

export const createProgram = async (orgId, programData) => {
  const { data, error } = await supabase
    .from('programs')
    .insert({ org_id: orgId, ...programData })
    .select()
    .single();
  return { data, error };
};

export const updateProgram = async (programId, updates) => {
  const { data, error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', programId)
    .select()
    .single();
  return { data, error };
};

// ── Athlete helpers ───────────────────────────────────────────────────────────
export const getAthletes = async (programId) => {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('program_id', programId)
    .order('name');
  return { data, error };
};

export const upsertAthlete = async (athlete) => {
  const { data, error } = await supabase
    .from('athletes')
    .upsert(athlete)
    .select()
    .single();
  return { data, error };
};

export const deleteAthlete = async (athleteId) => {
  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', athleteId);
  return { error };
};

// ── All-time roster helpers ───────────────────────────────────────────────────
export const getAllTimePlayers = async (programId) => {
  const { data, error } = await supabase
    .from('all_time_players')
    .select('*')
    .eq('program_id', programId)
    .order('name');
  return { data, error };
};

export const upsertAllTimePlayer = async (player) => {
  const { data, error } = await supabase
    .from('all_time_players')
    .upsert(player)
    .select()
    .single();
  return { data, error };
};

// ── Records helpers ───────────────────────────────────────────────────────────
export const getRecords = async (programId) => {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('program_id', programId)
    .order('stat_name');
  return { data, error };
};

export const upsertRecord = async (record) => {
  const { data, error } = await supabase
    .from('records')
    .upsert(record)
    .select()
    .single();
  return { data, error };
};

export const deleteRecord = async (recordId) => {
  const { error } = await supabase.from('records').delete().eq('id', recordId);
  return { error };
};

// ── Milestones helpers ────────────────────────────────────────────────────────
export const getMilestones = async (programId) => {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');
  return { data, error };
};

export const upsertMilestones = async (programId, milestones) => {
  // Delete existing and re-insert to handle reordering
  await supabase.from('milestones').delete().eq('program_id', programId);
  const { data, error } = await supabase
    .from('milestones')
    .insert(
      milestones.map((m, i) => ({ ...m, program_id: programId, sort_order: i }))
    )
    .select();
  return { data, error };
};

// ── Seasons helpers ───────────────────────────────────────────────────────────
// ── Per-season player stats (Athlete all-years view) ───────────────────────────
export const getPlayerSeasons = async (programId, playerName) => {
  const { data, error } = await supabase
    .from('player_seasons')
    .select('*')
    .eq('program_id', programId)
    .ilike('player_name', playerName)
    .order('season');
  return { data: data || [], error };
};
export const savePlayerSeason = async (row) => {
  if (row.id) {
    const { data, error } = await supabase
      .from('player_seasons')
      .update({ season: row.season, grade: row.grade, stats: row.stats })
      .eq('id', row.id).select().single();
    return { data, error };
  }
  const { data, error } = await supabase
    .from('player_seasons')
    .insert({ program_id: row.program_id, player_name: row.player_name, season: row.season, grade: row.grade, stats: row.stats })
    .select().single();
  return { data, error };
};
export const deletePlayerSeason = async (id) => {
  const { error } = await supabase.from('player_seasons').delete().eq('id', id);
  return { error };
};
// Bulk import: replace ALL of a program's season rows with `rows` (source-of-truth import).
export const replacePlayerSeasons = async (programId, rows) => {
  const del = await supabase.from('player_seasons').delete().eq('program_id', programId);
  if (del.error) return { error: del.error };
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({
      program_id: programId, player_name: r.player_name, season: r.season, stats: r.stats || {},
    }));
    if (!chunk.length) continue;
    const { error } = await supabase.from('player_seasons').insert(chunk);
    if (error) return { error };
    inserted += chunk.length;
  }
  return { data: { inserted } };
};

// Replace just ONE season's rows for a program (PDF season imports — additive, leaves
// every other season untouched).
export const replacePlayerSeasonRowsForSeason = async (programId, season, rows) => {
  const del = await supabase.from('player_seasons').delete().eq('program_id', programId).eq('season', season);
  if (del.error) return { error: del.error };
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({
      program_id: programId, player_name: r.player_name, season, stats: r.stats || {},
    }));
    if (!chunk.length) continue;
    const { error } = await supabase.from('player_seasons').insert(chunk);
    if (error) return { error };
    inserted += chunk.length;
  }
  return { data: { inserted } };
};

// All stored rows for one program+season (so PDF imports can MERGE with existing data).
export const getPlayerSeasonsForSeason = async (programId, season) => {
  const { data, error } = await supabase
    .from('player_seasons')
    .select('player_name, stats')
    .eq('program_id', programId)
    .eq('season', season);
  return { data: data || [], error };
};

// AI PDF extraction (one PDF per call) — goes through the extract-pdf edge function
// which holds the Anthropic key server-side. `pdf` is base64 (no data: prefix).
export const extractPdfStats = async (pdf) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'no session' };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ pdf }),
    });
    const out = await res.json().catch(() => ({}));
    return { data: out, error: res.ok ? null : (out.error || 'extract failed') };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

export const getSeasons = async (programId) => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('program_id', programId)
    .order('season', { ascending: false });
  return { data, error };
};

export const upsertSeason = async (season) => {
  const { data, error } = await supabase
    .from('seasons')
    .upsert(season)
    .select()
    .single();
  return { data, error };
};

export const deleteSeason = async (seasonId) => {
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
  return { error };
};

// ── Subscription helpers ──────────────────────────────────────────────────────
export const getSubscription = async (orgId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();
  return { data, error };
};

// ── Seed DC programs into Supabase ────────────────────────────────────────────
// Call this once after a new org is created to load all the DC basketball data
export const seedDCPrograms = async (orgId, seedSchools) => {
  for (const school of seedSchools) {
    // Create program
    const { data: prog, error: progErr } = await supabase
      .from('programs')
      .insert({
        org_id: orgId,
        name: school.name,
        mascot: school.mascot,
        sport: school.sport,
        primary_color: school.primaryColor,
        logo_url: school.logo || null,
        coach_hof: school.coachHof || {},
        dismissed_alerts: school.dismissedAlerts || [],
      })
      .select()
      .single();
    if (progErr) {
      console.error('Program error:', progErr);
      continue;
    }

    const pid = prog.id;

    // Insert athletes
    if (school.athletes?.length) {
      const athletes = school.athletes.map((a) => ({
        program_id: pid,
        name: a.name,
        position: a.position,
        grad_year: a.gradYear,
        jersey: a.jersey,
        is_active: a.isActive !== false,
        stats: a.stats || {},
      }));
      await supabase.from('athletes').insert(athletes);
    }

    // Insert all-time roster
    if (school.allTimeRoster?.length) {
      const batch = school.allTimeRoster.map((p) => ({
        program_id: pid,
        name: p.name,
        first_year: p.firstYear || null,
        last_year: p.lastYear || null,
        grad_year: p.gradYear || null,
        is_current: p.isCurrent || false,
        is_active: p.isActive || false,
        school_hall_of_fame: p.schoolHallOfFame || false,
        state_hall_of_fame: p.stateHallOfFame || false,
        stats: p.stats || {},
      }));
      // Insert in chunks of 500 to avoid payload limits
      for (let i = 0; i < batch.length; i += 500) {
        await supabase.from('all_time_players').insert(batch.slice(i, i + 500));
      }
    }

    // Insert records
    if (school.records?.length) {
      const records = school.records.map((r) => ({
        program_id: pid,
        stat_name: r.statName,
        variant: r.variant,
        holder_name: r.holderName,
        holder_year: r.holderYear || r.season || null,
        value: r.value,
        sport: school.sport,
      }));
      await supabase.from('records').insert(records);
    }

    // Insert milestones
    if (school.milestones?.length) {
      const milestones = school.milestones.map((m, i) => ({
        program_id: pid,
        stat_name: m.statName,
        values: m.values,
        alert_pct: m.alertPct || 90,
        sort_order: i,
      }));
      await supabase.from('milestones').insert(milestones);
    }

    // Insert seasons
    if (school.seasons?.length) {
      const seasons = school.seasons.map((s) => ({
        program_id: pid,
        season: s.season || s['season'],
        wins: s.wins || s['wins'],
        losses: s.losses || s['losses'],
        league_wins: s.leagueWins || s['leagueWins'] || null,
        league_losses: s.leagueLosses || s['leagueLosses'] || null,
        coach: s.coach || s['coach'] || null,
        notes: s.notes || s['notes'] || null,
        win_pct: s.winPct || s['winPct'] || null,
      }));
      for (let i = 0; i < seasons.length; i += 500) {
        await supabase.from('seasons').insert(seasons.slice(i, i + 500));
      }
    }
  }
  return { success: true };
};

// ── School directory + role-based access (v2) ─────────────────────────────────

// Search the public school directory (non-sensitive columns) by state + name.
export const searchSchools = async (state, query) => {
  let q = supabase.from('schools_directory').select('*').order('name');
  if (state) q = q.eq('state', state);
  if (query) q = q.ilike('name', `%${query}%`);
  const { data, error } = await q.limit(50);
  return { data, error };
};

// Create a new school (organization) and add the creating user as a coach.
export const createSchoolWithMembership = async (school, userId) => {
  const slug = (school.name || '')
    .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: school.name,
      slug,
      city: school.city || null,
      state: school.state || null,
      address: school.address || null,
      zip: school.zip || null,
      website: school.website || null,
      level: school.level || null,
      ad_name: school.adName || null,
      ad_email: school.adEmail || null,
      created_by: userId,
    })
    .select()
    .single();
  if (orgErr) return { error: orgErr };
  const { error: memErr } = await supabase
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'admin' });
  if (memErr) return { error: memErr };
  return { data: org };
};

// Atomic onboarding: create org + admin membership + first program in ONE
// SECURITY DEFINER transaction as the real signed-in user (auth.uid()). Avoids the
// client-side multi-insert RLS race that left new schools unable to add a program.
// Returns { data: { org_id, program_id }, error }.
export const onboardNewSchool = async ({ name, city, state, address, zip, level, adName, adEmail, sport, mascot, color }) => {
  const { data, error } = await supabase.rpc('onboard_new_school', {
    p_name: name, p_city: city || null, p_state: state || null,
    p_address: address || null, p_zip: zip || null, p_level: level || null,
    p_ad_name: adName || null, p_ad_email: adEmail || null,
    p_sport: sport || 'basketball_boys', p_mascot: mascot, p_color: color || '#1a3a6b',
  });
  return { data, error };
};

// Join an existing school as a coach.
export const joinSchoolAsCoach = async (orgId, userId) => {
  const { error } = await supabase
    .from('org_members')
    .insert({ org_id: orgId, user_id: userId, role: 'coach' });
  return { error };
};

// Invite a coach or AD by email (calls the invite-member edge function). Best-effort.
// Invite by pre-authorizing an email+role — a plain insert (RLS-gated to school admins),
// no edge function / CORS. The handle_new_user trigger places this person on signup.
export const inviteMember = async (email, orgId, role, programId = null) => {
  const { error } = await supabase
    .from('pending_invites')
    .upsert({ org_id: orgId, email: (email || '').trim().toLowerCase(), role, program_id: programId }, { onConflict: 'org_id,email' });
  return { error };
};

export const getPendingInvites = async (orgId) => {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('id, email, role, program_id')
    .eq('org_id', orgId);
  return { data, error };
};

export const cancelInvite = async (inviteId) => {
  const { error } = await supabase.from('pending_invites').delete().eq('id', inviteId);
  return { error };
};

// Which coaches are assigned to a program (returns ids; names come from the school roster).
export const getProgramCoaches = async (programId) => {
  const { data, error } = await supabase
    .from('program_coaches')
    .select('id, user_id')
    .eq('program_id', programId);
  return { data, error };
};

export const addProgramCoach = async (programId, userId) => {
  const { error } = await supabase
    .from('program_coaches')
    .upsert({ program_id: programId, user_id: userId }, { onConflict: 'program_id,user_id' });
  return { error };
};

export const removeProgramCoach = async (programId, userId) => {
  const { error } = await supabase
    .from('program_coaches')
    .delete()
    .eq('program_id', programId)
    .eq('user_id', userId);
  return { error };
};

// School roster (with profile name/email — requires the v2.1 profiles read policy).
export const getMembers = async (orgId) => {
  const { data, error } = await supabase
    .from('org_members')
    .select('id, role, user_id, profiles ( full_name, email )')
    .eq('org_id', orgId);
  return { data, error };
};

export const updateMemberRole = async (orgId, userId, role) => {
  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId);
  return { error };
};

export const removeMember = async (orgId, userId) => {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);
  return { error };
};

// Permanently delete the signed-in user's account via the delete_my_account DB function
// (RPC goes through PostgREST — same channel as every other query — so no CORS/edge-fn issues).
export const deleteMyAccount = async () => {
  const { error } = await supabase.rpc('delete_my_account');
  return { error };
};

// Permanently delete a program and all its data (cascades to athletes/records/seasons/etc).
export const deleteProgram = async (programId) => {
  const { error } = await supabase.from('programs').delete().eq('id', programId);
  return { error };
};

// ── Instant email alerts ──────────────────────────────────────────────────────
// Fire-and-forget: post a program's current alerts to the send-alert edge function,
// which dedups and emails the program's coaches + AD via Resend. Best-effort — never
// blocks or breaks a save. Safe to call on every save (the function won't re-email).
export const sendAlerts = async (programId, alerts) => {
  try {
    if (!programId || !alerts?.length) return { data: { sent: 0 } };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'no session' };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ programId, alerts }),
    });
    const out = await res.json().catch(() => ({}));
    return { data: out, error: res.ok ? null : (out.error || 'send failed') };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

// ── Billing (Stripe) ──────────────────────────────────────────────────────────
// Start a Stripe Checkout session for a school (org). Returns { data:{ url }, error };
// the caller redirects the browser to data.url.
export const createCheckout = async (orgId, priceId, tier, billing) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'no session' };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ orgId, priceId, tier, billing }),
    });
    const out = await res.json().catch(() => ({}));
    return { data: out, error: res.ok ? null : (out.error || 'checkout failed') };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

// Open the Stripe billing portal for a school (org) to manage/cancel a subscription.
export const openBillingPortal = async (orgId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'no session' };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ orgId }),
    });
    const out = await res.json().catch(() => ({}));
    return { data: out, error: res.ok ? null : (out.error || 'portal failed') };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

// ── Promo / beta codes ─────────────────────────────────────────────────────────
// Redeem a code against a school (validation + apply happen server-side in the RPC).
// On success `data` is a friendly message; on any invalid case `error` is the reason.
export const redeemPromoCode = async (code, orgId) => {
  const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code, p_org_id: orgId });
  return { data, error };
};
// Platform-owner only (RPC enforces it). List / create / toggle codes for the panel.
export const listPromoCodes = async () => {
  const { data, error } = await supabase.rpc('list_promo_codes');
  return { data: data || [], error };
};
export const createPromoCode = async ({ code, kind = 'trial_days', trialDays = 90, note = null, max = null, expires = null, grantTier = null }) => {
  const { error } = await supabase.rpc('create_promo_code', {
    p_code: code, p_kind: kind, p_trial_days: trialDays, p_note: note,
    p_max: max, p_expires: expires, p_grant_tier: grantTier,
  });
  return { error };
};
export const setPromoActive = async (code, active) => {
  const { error } = await supabase.rpc('set_promo_active', { p_code: code, p_active: active });
  return { error };
};

// ── Invite email ──────────────────────────────────────────────────────────────
// Email an invited coach/AD a sign-up link (best-effort). The pending_invite row
// (from inviteMember) is what actually authorizes them; this just notifies them.
export const sendInviteEmail = async (email, orgId, role) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'no session' };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email, orgId, role }),
    });
    const out = await res.json().catch(() => ({}));
    return { data: out, error: res.ok ? null : (out.error || 'invite email failed') };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};
