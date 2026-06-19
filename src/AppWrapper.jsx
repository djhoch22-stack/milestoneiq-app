// ── AppWrapper.jsx ────────────────────────────────────────────────────────────
// Replace the contents of src/main.jsx (or index.jsx) in StackBlitz with:
//
//   import AppWrapper from "./AppWrapper"
//   import ReactDOM from "react-dom/client"
//   ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />)
//
// This wraps your existing MilestoneIQ app with auth + subscription gating

import { useState, useEffect, useRef } from 'react';
import raftersLogo from '../raftersiq-logo.png';
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
  getAwards,
  createCheckout,
  changePlan,
  openBillingPortal,
  redeemPromoCode,
} from './supabase_client';
import Auth, { LockedScreen } from './Auth';
import App from './MilestoneIQ';
import SchoolOnboarding from './SchoolOnboarding';

// maxUsers = total members per school INCLUDING the AD (enforced at invite time).
const TIER_LIMITS = {
  program: { maxPrograms: 1, maxUsers: 2, maxCoachesPerProgram: 1 },
  program_plus: { maxPrograms: 1, maxUsers: 6, maxCoachesPerProgram: 5 },
  school: { maxPrograms: 5, maxUsers: 6, maxCoachesPerProgram: 6 },
  school_plus: { maxPrograms: 999, maxUsers: 999, maxCoachesPerProgram: 999 },
};

function rowToSchool(prog, athletes, allTime, records, milestones, seasons, awards) {
  return {
    id: prog.id,
    name: prog.name,
    mascot: prog.mascot,
    sport: prog.sport,
    primaryColor: prog.primary_color,
    logo: prog.logo_url,
    incomingCoach: prog.incoming_coach,
    coachHof: prog.coach_hof || {},
    coachPrior: prog.coach_prior || {},
    recordMins: prog.record_minimums || {},
    notifySettings: prog.notify_settings || {},
    dismissedAlerts: prog.dismissed_alerts || [],
    slug: prog.slug || null,
    // Public record book (SEO). Default true to mirror the DB default (public-by-default).
    isPublic: prog.is_public !== false,
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
      hofYear: p.hof_year,
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
      ties: s.ties,
      leagueWins: s.league_wins,
      leagueLosses: s.league_losses,
      leagueTies: s.league_ties,
      coach: s.coach,
      notes: s.notes,
      winPct: s.win_pct,
    })),
    awards: awards || [],
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
  const _ref = params.get('ref');
  if (_ref) { try { localStorage.setItem('rq_ref', _ref); } catch (e) {} }   // remember the referral code through signup + onboarding

  useEffect(() => {
    const _icon = document.querySelector("link[rel='icon']");
    if (_icon) _icon.href = raftersLogo;   // browser-tab favicon → the logo
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
      // Apply any pending invite for this user's email (e.g. an admin invite) — works
      // even if they already had an account, and upgrades their role if needed.
      try { await supabase.rpc('claim_my_invites'); } catch (e) { /* best-effort */ }
      const { data: orgs } = await getUserOrgs(userId);
      if (!orgs?.length) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }
      setNeedsOnboarding(false);
      // Pick the org with the most programs so we never land on an empty/stray org
      // (e.g. a leftover school from a botched onboarding).
      let chosen = orgs[0];
      let programs = [];
      for (const m of orgs) {
        const { data: progs } = await getPrograms(m.organizations.id);
        if ((progs?.length || 0) > programs.length) { chosen = m; programs = progs || []; }
      }
      setRole(chosen.role || 'coach');
      const org = chosen.organizations;
      setOrgId(org.id);
      setOrg(org);
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
            { data: awards },
          ] = await Promise.all([
            getAthletes(prog.id),
            getAllTimePlayers(prog.id),
            getRecords(prog.id),
            getMilestones(prog.id),
            getSeasons(prog.id),
            getAwards(prog.id),
          ]);
          return rowToSchool(
            prog,
            athletes,
            allTime,
            records,
            milestones,
            seasons,
            awards
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
        coach_prior: updated.coachPrior || {},
        record_minimums: updated.recordMins || {},
        notify_settings: updated.notifySettings || {},
        dismissed_alerts: updated.dismissedAlerts || [],
        is_public: updated.isPublic !== false,
      })
      .eq('id', updated.id);

    // Athletes — update existing by id, INSERT new ones WITHOUT an id (let the DB make the uuid).
    // A null id mixed into the upsert silently fails the whole batch, so active/inactive toggles
    // (and any athlete edit) never saved when even one unsaved athlete was present.
    if (updated.athletes?.length) {
      const toRow = (a) => ({
        program_id: updated.id,
        name: a.name,
        position: a.position,
        grad_year: a.gradYear,
        jersey: a.jersey,
        is_active: a.isActive !== false,
        stats: a.stats || {},
      });
      const existing = updated.athletes.filter((a) => isUuid(a.id)).map((a) => ({ id: a.id, ...toRow(a) }));
      const fresh = updated.athletes.filter((a) => !isUuid(a.id)).map(toRow);
      // A "fresh" athlete carries a TEMP id until the next reload, so re-saving the roster would re-INSERT
      // it every time → duplicate rows. Match each fresh row to an existing same-name athlete and UPDATE
      // that one (by its real id); only a genuinely new name gets inserted. Prevents the duplicate-player bug.
      let toInsert = fresh;
      if (fresh.length) {
        const { data: have } = await supabase.from('athletes').select('id,name').eq('program_id', updated.id);
        const byName = new Map((have || []).map((r) => [(r.name || '').toLowerCase().trim(), r.id]));
        toInsert = [];
        for (const r of fresh) {
          const id = byName.get((r.name || '').toLowerCase().trim());
          if (id) existing.push({ id, ...r }); else toInsert.push(r);
        }
      }
      if (existing.length) {
        const { error } = await supabase.from('athletes').upsert(existing, { onConflict: 'id' });
        if (error) console.error('Athlete save (update) failed:', error.message || error);
      }
      if (toInsert.length) {
        const { error } = await supabase.from('athletes').insert(toInsert);
        if (error) console.error('Athlete save (insert) failed:', error.message || error);
      }
    }

    // All-time roster — full upsert so edited stats persist (not just HOF flags).
    if (updated.allTimeRoster?.length) {
      const toRow = (p) => ({
        program_id: updated.id,
        name: p.name,
        first_year: p.firstYear || null,
        last_year: p.lastYear || null,
        grad_year: p.gradYear || null,
        is_current: p.isCurrent || false,
        is_active: p.isActive || false,
        school_hall_of_fame: p.schoolHallOfFame || false,
        state_hall_of_fame: p.stateHallOfFame || false,
        hof_year: p.hofYear || null,
        stats: p.stats || {},
      });
      const existing = updated.allTimeRoster.filter((p) => isUuid(p.id)).map((p) => ({ id: p.id, ...toRow(p) }));
      const fresh = updated.allTimeRoster.filter((p) => !isUuid(p.id)).map(toRow);
      // Same duplicate-player guard as athletes: a fresh (temp-id) player gets matched to an existing
      // same-name row and UPDATED, never re-inserted. (Without this, a hand-added player duplicated on
      // every save — the 13-Randy-DeBoer bug.)
      let toInsert = fresh;
      if (fresh.length) {
        const { data: have } = await supabase.from('all_time_players').select('id,name').eq('program_id', updated.id);
        const byName = new Map((have || []).map((r) => [(r.name || '').toLowerCase().trim(), r.id]));
        toInsert = [];
        for (const r of fresh) {
          const id = byName.get((r.name || '').toLowerCase().trim());
          if (id) existing.push({ id, ...r }); else toInsert.push(r);
        }
      }
      for (let i = 0; i < existing.length; i += 500) await supabase.from('all_time_players').upsert(existing.slice(i, i + 500), { onConflict: 'id' });
      for (let i = 0; i < toInsert.length; i += 500) await supabase.from('all_time_players').insert(toInsert.slice(i, i + 500));
    }

    // Records — update existing by id, INSERT new ones WITHOUT an id (let the DB generate the uuid).
    // The old code sent a null id for new records mixed into the upsert, which silently failed the
    // whole batch — so manual records never persisted. Then delete any the user removed.
    if (updated.records) {
      const toRow = (r) => ({
        program_id: updated.id,
        stat_name: r.statName,
        variant: r.variant,
        holder_name: r.holderName,
        holder_year: r.holderYear || r.season || null,
        value: r.value,
        sport: updated.sport,
      });
      const existing = updated.records.filter((r) => isUuid(r.id)).map((r) => ({ id: r.id, ...toRow(r) }));
      const fresh = updated.records.filter((r) => !isUuid(r.id)).map(toRow);
      const keepIds = existing.map((r) => r.id);
      if (existing.length) {
        const { error } = await supabase.from('records').upsert(existing, { onConflict: 'id' });
        if (error) console.error('Record update failed:', error.message || error);
      }
      if (fresh.length) {
        const { data, error } = await supabase.from('records').insert(fresh).select('id');
        if (error) console.error('Record insert failed:', error.message || error);
        else (data || []).forEach((d) => keepIds.push(d.id));
      }
      // Remove records the user deleted (everything for this program no longer in the kept set).
      if (keepIds.length) {
        await supabase.from('records').delete().eq('program_id', updated.id).not('id', 'in', `(${keepIds.join(',')})`);
      }
    }

    // Seasons — replace SAFELY: insert the new set first, then delete the OLD rows only
    // after the insert succeeds. Never blanket-delete first (a failed insert would wipe
    // every season — which is exactly what happened when the ties column was missing).
    if (updated.seasons) {
      const { data: existingS } = await supabase.from('seasons').select('id').eq('program_id', updated.id);
      const oldIds = (existingS || []).map((r) => r.id);
      const rows = updated.seasons.map((s) => ({
        program_id: updated.id,
        season: s.season,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties ?? 0,
        league_wins: s.leagueWins ?? null,
        league_losses: s.leagueLosses ?? null,
        league_ties: s.leagueTies ?? 0,
        coach: s.coach || null,
        notes: s.notes || null,
        win_pct: s.winPct ?? null,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from('seasons').insert(rows);
        if (insErr) {
          console.error('Season save failed — keeping existing seasons to avoid data loss:', insErr);
        } else if (oldIds.length) {
          await supabase.from('seasons').delete().in('id', oldIds);
        }
      } else if (oldIds.length) {
        await supabase.from('seasons').delete().in('id', oldIds); // intentional clear of all seasons
      }
    }

    // Milestones — same safe replace (insert new, then delete old only on success)
    if (updated.milestones) {
      const { data: existingM } = await supabase.from('milestones').select('id').eq('program_id', updated.id);
      const oldIds = (existingM || []).map((r) => r.id);
      const rows = updated.milestones.map((m, i) => ({
        program_id: updated.id,
        stat_name: m.statName,
        values: m.values,
        alert_pct: m.alertPct || 90,
        sort_order: i,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from('milestones').insert(rows);
        if (insErr) {
          console.error('Milestone save failed — keeping existing to avoid data loss:', insErr);
        } else if (oldIds.length) {
          await supabase.from('milestones').delete().in('id', oldIds);
        }
      } else if (oldIds.length) {
        await supabase.from('milestones').delete().in('id', oldIds);
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
          <img src={raftersLogo} alt="RaftersIQ" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
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
  // Switch an ACTIVE school to a different plan by editing its existing subscription in place
  // (no second subscription → no double-billing). Falls back to checkout if there's no live sub.
  const goChangePlan = async (priceId, tierId) => {
    const { data, error } = await changePlan(orgId, priceId, tierId);
    if (error) return error;
    if (data?.needsCheckout) return goCheckout(priceId, tierId);
    await loadUserData(session.user.id); // refresh tier/gate in place
    return null;
  };
  // Redeem a beta/promo code against this school, then refresh the gate (unlock/extend).
  const goRedeem = async (code) => {
    const { data, error } = await redeemPromoCode((code || '').trim(), orgId);
    if (error) return { error: error.message || String(error) };
    await loadUserData(session.user.id);
    return { message: data || 'Applied!' };
  };

  if (!unlocked) {
    return (
      <LockedScreen
        role={role}
        status={status}
        onCheckout={goCheckout}
        onManageBilling={goPortal}
        onRedeemCode={goRedeem}
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
        orgName={org?.name || ''}
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
        onChangePlan={goChangePlan}
        hasStripeCustomer={!!org?.stripe_customer_id}
        onManageBilling={goPortal}
        onRedeemCode={goRedeem}
        isPlatformOwner={!!profile?.is_platform_owner}
        onSignOut={() => supabase.auth.signOut()}
      />
    </>
  );
}
