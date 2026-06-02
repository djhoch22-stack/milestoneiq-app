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
