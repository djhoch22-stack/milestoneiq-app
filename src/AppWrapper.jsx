// ── AppWrapper.jsx ────────────────────────────────────────────────────────────
// Replace the contents of src/main.jsx (or index.jsx) in StackBlitz with:
//
//   import AppWrapper from "./AppWrapper"
//   import ReactDOM from "react-dom/client"
//   ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />)
//
// This wraps your existing MilestoneIQ app with auth + subscription gating

import { useState, useEffect, useRef } from 'react';
import {
  supabase,
  getProfile,
  getUserOrgs,
  getPrograms,
  getAthletes,
  getAllTimePlayers,
  getRecords,
  getMilestones,
  getSeasons,
  createCheckout,
  openBillingPortal,
} from './supabase_client';
import Auth, { LockedScreen } from './Auth';
import App from './MilestoneIQ';
import SchoolOnboarding from './SchoolOnboarding';

const TIER_LIMITS = {
  program: { maxPrograms: 1, maxCoachesPerProgram: 1 },
  school: { maxPrograms: 8, maxCoachesPerProgram: 3 },
  school_plus: { maxPrograms: 999, maxCoachesPerProgram: 999 },
};

function rowToSchool(prog, athletes, allTime, records, milestones, seasons) {
  return {
    id: prog.id,
    name: prog.name,
    mascot: prog.mascot,
    sport: prog.sport,
    primaryColor: prog.primary_color,
    logo: prog.logo_url,
    incomingCoach: prog.incoming_coach,
    coachHof: prog.coach_hof || {},
    dismissedAlerts: prog.dismissed_alerts || [],
    athletes: (athletes || []).map((a) => ({
      id: a.id,
      name: a.name,
      position: a.position,
      gradYear: a.grad_year,
      jersey: a.jersey,
      isActive: a.is_active,
      stats: a.stats || {},
    })),
    allTimeRoster: (allTime || []).map((p) => ({
      id: p.id,
      name: p.name,
      firstYear: p.first_year,
      lastYear: p.last_year,
      gradYear: p.grad_year,
      isCurrent: p.is_current,
      isActive: p.is_active,
      schoolHallOfFame: p.school_hall_of_fame,
      stateHallOfFame: p.state_hall_of_fame,
      stats: p.stats || {},
    })),
    records: (records || []).map((r) => ({
      id: r.id,
      statName: r.stat_name,
      variant: r.variant,
      holderName: r.holder_name,
      holderYear: r.holder_year,
      value: r.value,
      sport: r.sport,
    })),
    milestones: (milestones || []).map((m) => ({
      id: m.id,
      statName: m.stat_name,
      values: m.values,
      alertPct: m.alert_pct,
    })),
    seasons: (seasons || []).map((s) => ({
      season: s.season,
      wins: s.wins,
      losses: s.losses,
      leagueWins: s.league_wins,
      leagueLosses: s.league_losses,
      coach: s.coach,
      notes: s.notes,
      winPct: s.win_pct,
    })),
  };
}

export default function AppWrapper() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [schools, setSchools] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [org, setOrg] = useState(null);
  const [role, setRole] = useState('coach');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedUserId = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const checkoutResult = params.get('checkout');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        if (session.user.id !== loadedUserId.current) {
          loadedUserId.current = session.user.id;
          loadUserData(session.user.id);
        }
      } else setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        loadedUserId.current = null;
        setLoading(false);
        setSchools([]);
        setProfile(null);
        setOrg(null);
        return;
      }
      // Only (re)load data when the actual user changes. Ignore token refreshes and
      // same-user updates (e.g. a password change) so the current view — like the
      // Settings tab — isn't reset out from under the user.
      if (session.user.id !== loadedUserId.current) {
        loadedUserId.current = session.user.id;
        loadUserData(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      const { data: prof } = await getProfile(userId);
      setProfile(prof);
      const { data: orgs } = await getUserOrgs(userId);
      if (!orgs?.length) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }
      setNeedsOnboarding(false);
      setRole(orgs[0].role || 'coach');
      const org = orgs[0].organizations;
      setOrgId(org.id);
      setOrg(org);
      const { data: programs } = await getPrograms(org.id);
      if (!programs?.length) {
        setLoading(false);
        return;
      }
      const schoolsData = await Promise.all(
        programs.map(async (prog) => {
          const [
            { data: athletes },
            { data: allTime },
            { data: records },
            { data: milestones },
            { data: seasons },
          ] = await Promise.all([
            getAthletes(prog.id),
            getAllTimePlayers(prog.id),
            getRecords(prog.id),
            getMilestones(prog.id),
            getSeasons(prog.id),
          ]);
          return rowToSchool(
            prog,
            athletes,
            allTime,
            records,
            milestones,
            seasons
          );
        })
      );
      setSchools(schoolsData);
    } catch (e) {
      setError('Failed to load data: ' + e.message);
    }
    setLoading(false);
  };

  const handleUpdateSchool = async (updated) => {
    setSchools((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    // DB primary keys are uuids (always contain a "-"); seed/in-app ids ("bb026",
    // "br5", "s4"…) do not. Send undefined for those so the DB assigns a fresh uuid.
    const isUuid = (v) => typeof v === 'string' && v.includes('-');

    // Program-level fields
    await supabase
      .from('programs')
      .update({
        name: updated.name,
        mascot: updated.mascot,
        sport: updated.sport,
        primary_color: updated.primaryColor,
        logo_url: updated.logo || null,
        incoming_coach: updated.incomingCoach || null,
        coach_hof: updated.coachHof || {},
        dismissed_alerts: updated.dismissedAlerts || [],
      })
      .eq('id', updated.id);

    // Athletes
    if (updated.athletes?.length) {
      const rows = updated.athletes.map((a) => ({
        id: isUuid(a.id) ? a.id : undefined,
        program_id: updated.id,
        name: a.name,
        position: a.position,
        grad_year: a.gradYear,
        jersey: a.jersey,
        is_active: a.isActive !== false,
        stats: a.stats || {},
      }));
      await supabase.from('athletes').upsert(rows, { onConflict: 'id' });
    }

    // All-time roster — full upsert so edited stats persist (not just HOF flags)
    if (updated.allTimeRoster?.length) {
      const rows = updated.allTimeRoster.map((p) => ({
        id: isUuid(p.id) ? p.id : undefined,
        program_id: updated.id,
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
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from('all_time_players').upsert(rows.slice(i, i + 500), { onConflict: 'id' });
      }
    }

    // Records
    if (updated.records) {
      const rows = updated.records.map((r) => ({
        id: isUuid(r.id) ? r.id : undefined,
        program_id: updated.id,
        stat_name: r.statName,
        variant: r.variant,
        holder_name: r.holderName,
        holder_year: r.holderYear || r.season || null,
        value: r.value,
        sport: updated.sport,
      }));
      await supabase.from('records').upsert(rows, { onConflict: 'id' });
    }

    // Seasons — replace wholesale (app season objects carry no stable id)
    if (updated.seasons) {
      await supabase.from('seasons').delete().eq('program_id', updated.id);
      if (updated.seasons.length) {
        await supabase.from('seasons').insert(
          updated.seasons.map((s) => ({
            program_id: updated.id,
            season: s.season,
            wins: s.wins,
            losses: s.losses,
            league_wins: s.leagueWins ?? null,
            league_losses: s.leagueLosses ?? null,
            coach: s.coach || null,
            notes: s.notes || null,
            win_pct: s.winPct ?? null,
          }))
        );
      }
    }

    // Milestones — replace wholesale (handles reordering)
    if (updated.milestones) {
      await supabase.from('milestones').delete().eq('program_id', updated.id);
      if (updated.milestones.length) {
        await supabase.from('milestones').insert(
          updated.milestones.map((m, i) => ({
            program_id: updated.id,
            stat_name: m.statName,
            values: m.values,
            alert_pct: m.alertPct || 90,
            sort_order: i,
          }))
        );
      }
    }
  };

  if (session === undefined || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f7f4',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <img src="/raftersiq-logo.png" alt="RaftersIQ" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#6b7280' }}>
            Loading RaftersIQ…
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthenticated={() => loadUserData(session?.user?.id)} />;
  }

  if (needsOnboarding) {
    return (
      <SchoolOnboarding
        userId={session.user.id}
        fullName={profile?.full_name}
        onComplete={() => loadUserData(session.user.id)}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  const tier = org?.subscription_tier || 'program';
  const status = org?.subscription_status || 'trialing';
  const trialEnd = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const trialValid = status === 'trialing' && trialEnd && trialEnd > new Date();
  const unlocked = status === 'active' || trialValid;

  const goCheckout = async (priceId, tierId, billing) => {
    const { data, error } = await createCheckout(orgId, priceId, tierId, billing);
    if (data?.url) { window.location.href = data.url; return null; }
    return error || 'Could not start checkout';
  };
  const goPortal = async () => {
    const { data, error } = await openBillingPortal(orgId);
    if (data?.url) { window.location.href = data.url; return null; }
    return error || 'Could not open billing portal';
  };

  if (!unlocked) {
    return (
      <LockedScreen
        role={role}
        status={status}
        onCheckout={goCheckout}
        onManageBilling={goPortal}
      />
    );
  }

  return (
    <>
      {checkoutResult === 'success' && (
        <div
          style={{
            background: '#f0fdf4',
            borderBottom: '1px solid #86efac',
            padding: '10px 24px',
            fontSize: 13,
            color: '#166534',
            fontWeight: 600,
            fontFamily: 'Georgia, serif',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          🎉 Welcome to RaftersIQ! Your 7-day trial has started.
          <span
            style={{ cursor: 'pointer' }}
            onClick={() =>
              window.history.replaceState({}, '', window.location.pathname)
            }
          >
            ✕
          </span>
        </div>
      )}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            padding: '10px 24px',
            fontSize: 13,
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}
      <App
        initialSchools={schools}
        onUpdateSchool={handleUpdateSchool}
        orgId={orgId}
        tier={tier}
        tierLimits={TIER_LIMITS[tier] || TIER_LIMITS.program}
        role={role}
        userEmail={session.user.email}
        userName={profile?.full_name || ''}
        userPhone={profile?.phone || ''}
        userId={session.user.id}
        subscriptionStatus={status}
        trialEndsAt={org?.trial_ends_at || null}
        onCheckout={goCheckout}
        onManageBilling={goPortal}
        onSignOut={() => supabase.auth.signOut()}
      />
    </>
  );
}
