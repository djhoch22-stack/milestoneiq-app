import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://odirpbptemubzysrvajh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXJwYnB0ZW11Ynp5c3J2YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwNzQsImV4cCI6MjA5NTkxNzA3NH0.Ikr03FPjiYcXdwr0ng5aNKA-cyHH2tnRpOieeCuy1JI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const getProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data, error }
}

export const getUserOrgs = async (userId) => {
  const { data, error } = await supabase.from('org_members').select('role, organizations(*)').eq('user_id', userId)
  return { data, error }
}

export const getPrograms = async (orgId) => {
  const { data, error } = await supabase.from('programs').select('*').eq('org_id', orgId).order('created_at')
  return { data, error }
}

export const getAthletes = async (programId) => {
  const { data, error } = await supabase.from('athletes').select('*').eq('program_id', programId).order('name')
  return { data, error }
}

export const getAllTimePlayers = async (programId) => {
  const { data, error } = await supabase.from('all_time_players').select('*').eq('program_id', programId).order('name')
  return { data, error }
}

export const getRecords = async (programId) => {
  const { data, error } = await supabase.from('records').select('*').eq('program_id', programId).order('stat_name
cat > src/supabase_client.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://odirpbptemubzysrvajh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXJwYnB0ZW11Ynp5c3J2YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwNzQsImV4cCI6MjA5NTkxNzA3NH0.Ikr03FPjiYcXdwr0ng5aNKA-cyHH2tnRpOieeCuy1JI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const getProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data, error }
}

export const getUserOrgs = async (userId) => {
  const { data, error } = await supabase.from('org_members').select('role, organizations(*)').eq('user_id', userId)
  return { data, error }
}

export const getPrograms = async (orgId) => {
  const { data, error } = await supabase.from('programs').select('*').eq('org_id', orgId).order('created_at')
  return { data, error }
}

export const getAthletes = async (programId) => {
  const { data, error } = await supabase.from('athletes').select('*').eq('program_id', programId).order('name')
  return { data, error }
}

export const getAllTimePlayers = async (programId) => {
  const { data, error } = await supabase.from('all_time_players').select('*').eq('program_id', programId).order('name')
  return { data, error }
}

export const getRecords = async (programId) => {
  const { data, error } = await supabase.from('records').select('*').eq('program_id', programId).order('stat_name')
  return { data, error }
}

export const getMilestones = async (programId) => {
  const { data, error } = await supabase.from('milestones').select('*').eq('program_id', programId).order('sort_order')
  return { data, error }
}

export const getSeasons = async (programId) => {
  const { data, error } = await supabase.from('seasons').select('*').eq('program_id', programId).order('season', { ascending: false })
  return { data, error }
}

export const createOrg = async (name, userId) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const { data: org, error: orgErr } = await supabase.from('organizations').insert({ name, slug, created_by: userId }).select().single()
  if (orgErr) return { error: orgErr }
  const { error: memberErr } = await supabase.from('org_members').insert({ org_id: org.id, user_id: userId, role: 'owner' })
  if (memberErr) return { error: memberErr }
  return { data: org }
}

export const seedDCPrograms = async (orgId, seedSchools) => {
  for (const school of seedSchools) {
    const { data: prog, error: progErr } = await supabase.from('programs').insert({
      org_id: orgId, name: school.name, mascot: school.mascot, sport: school.sport,
      primary_color: school.primaryColor, logo_url: school.logo || null,
      coach_hof: school.coachHof || {}, dismissed_alerts: school.dismissedAlerts || [],
    }).select().single()
    if (progErr) { console.error('Program error:', progErr); continue }
    const pid = prog.id
    if (school.athletes?.length) {
      await supabase.from('athletes').insert(school.athletes.map(a => ({
        program_id: pid, name: a.name, position: a.position, grad_year: a.gradYear,
        jersey: a.jersey, is_active: a.isActive !== false, stats: a.stats || {},
      })))
    }
    if (school.allTimeRoster?.length) {
      const batch = school.allTimeRoster.map(p => ({
        program_id: pid, name: p.name, first_year: p.firstYear || null,
        last_year: p.lastYear || null, grad_year: p.gradYear || null,
        is_current: p.isCurrent || false, is_active: p.isActive || false,
        school_hall_of_fame: p.schoolHallOfFame || false, state_hall_of_fame: p.stateHallOfFame || false,
        stats: p.stats || {},
      }))
      for (let i = 0; i < batch.length; i += 500) {
        await supabase.from('all_time_players').insert(batch.slice(i, i + 500))
      }
    }
    if (school.records?.length) {
      await supabase.from('records').insert(school.records.map(r => ({
        program_id: pid, stat_name: r.statName, variant: r.variant,
        holder_name: r.holderName, holder_year: r.holderYear || r.season || null,
        value: r.value, sport: school.sport,
      })))
    }
    if (school.milestones?.length) {
      await supabase.from('milestones').insert(school.milestones.map((m, i) => ({
        program_id: pid, stat_name: m.statName, values: m.values, alert_pct: m.alertPct || 90, sort_order: i,
      })))
    }
    if (school.seasons?.length) {
      const seasons = school.seasons.map(s => ({
        program_id: pid, season: s.season || s['season'], wins: s.wins || s['wins'],
        losses: s.losses || s['losses'], league_wins: s.leagueWins || s['leagueWins'] || null,
        league_losses: s.leagueLosses || s['leagueLosses'] || null,
        coach: s.coach || s['coach'] || null, notes: s.notes || s['notes'] || null,
      }))
      for (let i = 0; i < seasons.length; i += 500) {
        await supabase.from('seasons').insert(seasons.slice(i, i + 500))
      }
    }
  }
  return { success: true }
}
