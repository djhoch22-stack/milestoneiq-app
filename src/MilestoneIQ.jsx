import { useState, useCallback, useEffect, useMemo } from "react";
import { signOut, createProgram, seedDCPrograms, getMembers, updateMemberRole, removeMember, inviteMember, deleteMyAccount, updateProfile, deleteProgram, getPendingInvites, cancelInvite, getProgramCoaches, addProgramCoach, removeProgramCoach, sendAlerts, changePassword, sendInviteEmail, listPromoCodes, createPromoCode, setPromoActive, getPlayerSeasons as fetchPlayerSeasons, savePlayerSeason, deletePlayerSeason, replacePlayerSeasons, replacePlayerSeasonRowsForSeason, getPlayerSeasonsForSeason, getAllPlayerSeasons, extractPdfStats } from "./supabase_client";
import { SEED_SCHOOLS } from './seedData';
import { ChoosePlan } from './Auth';
import raftersLogo from '../raftersiq-logo.png';

const STAT_VARIANTS = ["Career total","Single season","Single game","Per game avg (season)","Per game avg (career)","Solo only","Assisted only"];

const STAT_VARIANTS_STANDARD = ["Career total","Single season","Single game"];
const STAT_VARIANTS_WITH_AVG = ["Career total","Single season","Single game","Per game avg (season)","Per game avg (career)"];
const STAT_VARIANTS_AVG_ONLY = ["Career total","Single season","Single game","Per game avg (season)"];
const STAT_VARIANTS_RATE = ["Single season","Career total"];
const STAT_VARIANTS_LONGEST = ["Single game","Single season","Career total"];

const SPORTS = {
  football: {
    label: "Football", icon: "🏈",
    groups: [
      {
        group: "General",
        stats: [
          { name: "Games Played",      variants: ["Career total","Single season"] },
          { name: "Wins",              variants: ["Career total","Single season"] },
        ]
      },
      {
        group: "Passing",
        stats: [
          { name: "Passing Yards",                  variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Pass Completions",               variants: STAT_VARIANTS_STANDARD },
          { name: "Pass Attempts",                  variants: STAT_VARIANTS_STANDARD },
          { name: "Passing TDs",                    variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Pass",                   variants: STAT_VARIANTS_LONGEST },
          { name: "Passing Yards Per Game",         variants: STAT_VARIANTS_RATE },
          { name: "Passing Yards Per Attempt",      variants: STAT_VARIANTS_RATE },
          { name: "Passing Yards Per Season",       variants: STAT_VARIANTS_RATE },
          { name: "Passing Yards Per Completion",   variants: STAT_VARIANTS_RATE },
          { name: "Completions Per Game",           variants: STAT_VARIANTS_RATE },
          { name: "Completion %",                   variants: STAT_VARIANTS_RATE },
          { name: "Passing TD %",                   variants: STAT_VARIANTS_RATE },
        ]
      },
      {
        group: "Rushing",
        stats: [
          { name: "Rushing Yards",          variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Rushing Attempts",       variants: STAT_VARIANTS_STANDARD },
          { name: "Rushing TDs",            variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Rush",           variants: STAT_VARIANTS_LONGEST },
          { name: "Yards Per Rush Attempt", variants: STAT_VARIANTS_RATE },
          { name: "Rushing Yards Per Game", variants: STAT_VARIANTS_RATE },
          { name: "Rushing Yards Per Season", variants: STAT_VARIANTS_RATE },
        ]
      },
      {
        group: "Receiving",
        stats: [
          { name: "Receiving Yards",          variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Receptions",               variants: STAT_VARIANTS_STANDARD },
          { name: "Receiving TDs",            variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Reception",        variants: STAT_VARIANTS_LONGEST },
          { name: "Targets",                  variants: STAT_VARIANTS_STANDARD },
          { name: "Yards Per Reception",      variants: STAT_VARIANTS_RATE },
          { name: "Yards Per Target",         variants: STAT_VARIANTS_RATE },
          { name: "Receiving Yards Per Game", variants: STAT_VARIANTS_RATE },
          { name: "Receiving Yards Per Season", variants: STAT_VARIANTS_RATE },
        ]
      },
      {
        group: "Other Offense",
        stats: [
          { name: "Total TDs",             variants: STAT_VARIANTS_STANDARD },
          { name: "2 Pt Conversions Made", variants: STAT_VARIANTS_STANDARD },
          { name: "Yards From Scrimmage",  variants: STAT_VARIANTS_AVG_ONLY },
          { name: "All-Purpose Yards",     variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Total Offense",         variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Touches",               variants: STAT_VARIANTS_STANDARD },
          { name: "Yards Per Touch",       variants: STAT_VARIANTS_RATE },
        ]
      },
      {
        group: "Defense",
        stats: [
          { name: "Total Tackles",                variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Combined Tackles",             variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Solo Tackles",                 variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Tackles For Loss",             variants: STAT_VARIANTS_STANDARD },
          { name: "Sacks",                        variants: STAT_VARIANTS_STANDARD },
          { name: "Interceptions",                variants: STAT_VARIANTS_STANDARD },
          { name: "Interception Return Yards",    variants: STAT_VARIANTS_STANDARD },
          { name: "Interception Return TDs",      variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Interception Return",  variants: STAT_VARIANTS_LONGEST },
          { name: "Passes Defended",              variants: STAT_VARIANTS_STANDARD },
          { name: "Fumbles Forced",               variants: STAT_VARIANTS_STANDARD },
          { name: "Fumbles Recovered",            variants: STAT_VARIANTS_STANDARD },
          { name: "Fumble Return Yards",          variants: STAT_VARIANTS_STANDARD },
          { name: "Fumble Return TDs",            variants: STAT_VARIANTS_STANDARD },
          { name: "Safeties",                     variants: STAT_VARIANTS_STANDARD },
        ]
      },
      {
        group: "Special Teams",
        stats: [
          { name: "Kick Returns",            variants: STAT_VARIANTS_STANDARD },
          { name: "Kick Return Yards",       variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Kick Return TDs",         variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Kick Return",     variants: STAT_VARIANTS_LONGEST },
          { name: "Yards Per Kick Return",   variants: STAT_VARIANTS_RATE },
          { name: "Punt Returns",            variants: STAT_VARIANTS_STANDARD },
          { name: "Punt Return Yards",       variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Punt Return TDs",         variants: STAT_VARIANTS_STANDARD },
          { name: "Longest Punt Return",     variants: STAT_VARIANTS_LONGEST },
          { name: "Yards Per Punt Return",   variants: STAT_VARIANTS_RATE },
          { name: "Kick & Punt Returns",     variants: STAT_VARIANTS_STANDARD },
          { name: "Kick & Punt Return Yards",variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Kick & Punt Return TDs",  variants: STAT_VARIANTS_STANDARD },
          { name: "Extra Points Made",       variants: STAT_VARIANTS_STANDARD },
          { name: "Extra Points Attempted",  variants: STAT_VARIANTS_STANDARD },
          { name: "Extra Point %",           variants: STAT_VARIANTS_RATE },
          { name: "Field Goals Made",        variants: STAT_VARIANTS_STANDARD },
          { name: "Field Goals Attempted",   variants: STAT_VARIANTS_STANDARD },
          { name: "Field Goal %",            variants: STAT_VARIANTS_RATE },
          { name: "Longest Field Goal Made", variants: STAT_VARIANTS_LONGEST },
          { name: "Punts",                   variants: STAT_VARIANTS_STANDARD },
          { name: "Punting Yards",           variants: STAT_VARIANTS_AVG_ONLY },
          { name: "Longest Punt",            variants: STAT_VARIANTS_LONGEST },
          { name: "Yards Per Punt",          variants: STAT_VARIANTS_RATE },
          { name: "Coach Wins",              variants: ["Career total","Single season"] },
        ]
      },
    ],
    // Flat statCategories for backwards compatibility
    get statCategories() {
      return this.groups.flatMap(g => g.stats);
    }
  },
  basketball: {
    label: "Boys Basketball", icon: "🏀",
    statCategories: [
      { name: "Games Played", variants: ["Career total","Single season"] },
      { name: "Wins", variants: ["Career total","Single season"] },
      { name: "Points", variants: ["Career total","Single season","Single game","Per game avg (season)","Per game avg (career)"] },
      { name: "Assists", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Total Rebounds", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Offensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Defensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Steals", variants: ["Career total","Single season","Single game"] },
      { name: "Blocks", variants: ["Career total","Single season","Single game"] },
      { name: "Field Goals Made", variants: ["Career total","Single season","Single game"] },
      { name: "Field Goals Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Made", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Made", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  baseball: {
    label: "Baseball", icon: "⚾",
    statCategories: [
      { name: "Home Runs", variants: ["Career total","Single season","Single game"] },
      { name: "RBIs", variants: ["Career total","Single season","Single game"] },
      { name: "Hits", variants: ["Career total","Single season","Single game"] },
      { name: "Batting Average", variants: ["Single season","Career total"] },
      { name: "Stolen Bases", variants: ["Career total","Single season"] },
      { name: "Strikeouts (Pitching)", variants: ["Career total","Single season","Single game"] },
      { name: "Wins (Pitching)", variants: ["Career total","Single season"] },
      { name: "ERA", variants: ["Single season","Career total"] },
      { name: "Innings Pitched", variants: ["Career total","Single season"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  softball: {
    label: "Softball", icon: "🥎",
    statCategories: [
      { name: "Home Runs", variants: ["Career total","Single season","Single game"] },
      { name: "RBIs", variants: ["Career total","Single season","Single game"] },
      { name: "Hits", variants: ["Career total","Single season"] },
      { name: "Batting Average", variants: ["Single season","Career total"] },
      { name: "Stolen Bases", variants: ["Career total","Single season"] },
      { name: "Strikeouts (Pitching)", variants: ["Career total","Single season","Single game"] },
      { name: "Wins (Pitching)", variants: ["Career total","Single season"] },
      { name: "ERA", variants: ["Single season","Career total"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  basketball_boys: {
    label: "Boys Basketball", icon: "🏀",
    statCategories: [
      { name: "Games Played", variants: ["Career total","Single season"] },
      { name: "Wins", variants: ["Career total","Single season"] },
      { name: "Points", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Assists", variants: ["Career total","Single season","Single game"] },
      { name: "Total Rebounds", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Offensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Defensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Steals", variants: ["Career total","Single season"] },
      { name: "Blocks", variants: ["Career total","Single season"] },
      { name: "Field Goals Made", variants: ["Career total","Single season","Single game"] },
      { name: "Field Goals Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Made", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Made", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  basketball_girls: {
    label: "Girls Basketball", icon: "🏀",
    statCategories: [
      { name: "Games Played", variants: ["Career total","Single season"] },
      { name: "Wins", variants: ["Career total","Single season"] },
      { name: "Points", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Assists", variants: ["Career total","Single season","Single game"] },
      { name: "Total Rebounds", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Offensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Defensive Rebounds", variants: ["Career total","Single season","Single game"] },
      { name: "Steals", variants: ["Career total","Single season"] },
      { name: "Blocks", variants: ["Career total","Single season"] },
      { name: "Field Goals Made", variants: ["Career total","Single season","Single game"] },
      { name: "Field Goals Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Made", variants: ["Career total","Single season","Single game"] },
      { name: "Three Pointers Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Made", variants: ["Career total","Single season","Single game"] },
      { name: "Free Throws Attempted", variants: ["Career total","Single season","Single game"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  soccer: {
    label: "Boys Soccer", icon: "⚽",
    statCategories: [
      { name: "Goals", variants: ["Career total","Single season","Single game"] },
      { name: "Assists", variants: ["Career total","Single season","Single game"] },
      { name: "Saves", variants: ["Career total","Single season","Single game"] },
      { name: "Clean Sheets", variants: ["Career total","Single season"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  soccer_girls: {
    label: "Girls Soccer", icon: "⚽",
    statCategories: [
      { name: "Goals", variants: ["Career total","Single season","Single game"] },
      { name: "Assists", variants: ["Career total","Single season","Single game"] },
      { name: "Saves", variants: ["Career total","Single season","Single game"] },
      { name: "Clean Sheets", variants: ["Career total","Single season"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  wrestling: {
    label: "Wrestling", icon: "🤼",
    statCategories: [
      { name: "Career Wins", variants: ["Career total","Single season"] },
      { name: "Pins", variants: ["Career total","Single season"] },
      { name: "Tech Falls", variants: ["Career total","Single season"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  volleyball: {
    label: "Volleyball", icon: "🏐",
    statCategories: [
      { name: "Kills", variants: ["Career total","Single season","Single game","Per game avg (season)"] },
      { name: "Aces", variants: ["Career total","Single season","Single game"] },
      { name: "Digs", variants: ["Career total","Single season","Single game"] },
      { name: "Assists", variants: ["Career total","Single season","Single game"] },
      { name: "Blocks", variants: ["Career total","Single season","Single game"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  },
  track: {
    label: "Track & Field", icon: "🏃",
    statCategories: [
      { name: "Events Won", variants: ["Career total","Single season"] },
      { name: "State Qualifications", variants: ["Career total"] },
      { name: "Conference Titles", variants: ["Career total","Single season"] },
      { name: "Coach Wins", variants: ["Career total","Single season"] },
    ]
  }
};

// Returns flat list of all stat category names for a sport (for legacy athlete.stats keys)
function getSportStatNames(sport) {
  const def = SPORTS[sport] || SPORTS.football;
  return [...new Set(def.statCategories.map(s => s.name))];
}

// school.records is now an array of:
// { id, statName, variant, holderName, holderYear, value, sport }
// athlete.stats is still a flat object keyed by stat name (career totals by default)

// Canonical stat order — used by AllTimeTab dropdown and MilestoneSettings dropdown
const STAT_ORDER = [
  "Games Played","Wins","Points","Assists",
  "Total Rebounds","Offensive Rebounds","Defensive Rebounds",
  "Steals","Blocks",
  "Field Goals Made","Field Goals Attempted",
  "Three Pointers Made","Three Pointers Attempted",
  "Free Throws Made","Free Throws Attempted",
  // Football offense
  "Passing Yards","Pass Completions","Pass Attempts","Passing TDs","Longest Pass",
  "Passing Yards Per Game","Passing Yards Per Attempt","Passing Yards Per Season",
  "Passing Yards Per Completion","Completions Per Game","Completion %","Passing TD %",
  "Rushing Yards","Rushing Attempts","Rushing TDs","Longest Rush",
  "Yards Per Rush Attempt","Rushing Yards Per Game","Rushing Yards Per Season",
  "Receiving Yards","Receptions","Receiving TDs","Longest Reception","Targets",
  "Yards Per Reception","Yards Per Target","Receiving Yards Per Game","Receiving Yards Per Season",
  "Total TDs","2 Pt Conversions Made","Yards From Scrimmage","All-Purpose Yards",
  "Total Offense","Touches","Yards Per Touch",
  // Football defense
  "Total Tackles","Combined Tackles","Solo Tackles","Tackles For Loss","Sacks",
  "Interceptions","Interception Return Yards","Interception Return TDs","Longest Interception Return",
  "Passes Defended","Fumbles Forced","Fumbles Recovered","Fumble Return Yards","Fumble Return TDs","Safeties",
  // Football special teams
  "Kick Returns","Kick Return Yards","Kick Return TDs","Longest Kick Return","Yards Per Kick Return",
  "Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return","Yards Per Punt Return",
  "Kick & Punt Returns","Kick & Punt Return Yards","Kick & Punt Return TDs",
  "Extra Points Made","Extra Points Attempted","Extra Point %",
  "Field Goals Made","Field Goals Attempted","Field Goal %","Longest Field Goal Made",
  "Punts","Punting Yards","Longest Punt","Yards Per Punt",
  "Coach Wins",
];

// Sort stat names into the canonical STAT_ORDER (unknown stats last, alphabetically). Shared so the
// all-time grid, the player profile, AND the athletes-tab cards all display stats in identical order.
function byStatOrder(a, b) {
  const ai = STAT_ORDER.indexOf(a), bi = STAT_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}

// Stat list for a roster — every stat name with any value > 0, in canonical order.
function allStatsFor(roster) {
  return [...new Set(roster.flatMap(p => Object.keys(p.stats || {})))]
    .filter(s => roster.some(p => (p.stats[s] || 0) > 0))
    .sort(byStatOrder);
}
// effectiveIsActive(player): an active-roster name override wins; otherwise the player's own isCurrent.
function makeEffectiveIsActive(athletes = []) {
  const activeNames = new Set(athletes.filter(a => a.isActive !== false).map(a => a.name.toLowerCase()));
  const inactiveNames = new Set(athletes.filter(a => a.isActive === false).map(a => a.name.toLowerCase()));
  return (p) => {
    const nameLower = p.name.toLowerCase();
    if (inactiveNames.has(nameLower)) return false;
    if (activeNames.has(nameLower)) return true;
    return p.isCurrent;
  };
}
// rankFor(player, stat) → 1-based rank across the roster; rankFor(null, stat) → count with that stat > 0.
function makeRankFor(roster) {
  return (player, stat) => {
    const sorted = roster.filter(p => (p.stats[stat] || 0) > 0).sort((a, b) => (b.stats[stat] || 0) - (a.stats[stat] || 0));
    if (player === null) return sorted.length;
    const idx = sorted.findIndex(p => p.id === player.id);
    return idx === -1 ? sorted.length + 1 : idx + 1;
  };
}

// Default milestone thresholds for football — all stat categories in canonical order
const DEFAULT_MILESTONES = [
  { id:"dm1",  statName:"Games Played",       values:[25,50,75,100],          alertPct:90 },
  { id:"dm2",  statName:"Wins",               values:[25,50,75,100],          alertPct:90 },
  { id:"dm3",  statName:"Passing Yards",      values:[500,1000,2000,3000],    alertPct:90 },
  { id:"dm4",  statName:"Passing TDs",        values:[10,25,50],              alertPct:90 },
  { id:"dm5",  statName:"Rushing Yards",      values:[250,500,1000,1500,2000],alertPct:90 },
  { id:"dm6",  statName:"Rushing TDs",        values:[10,25,50],              alertPct:90 },
  { id:"dm7",  statName:"Receiving Yards",    values:[250,500,1000],          alertPct:90 },
  { id:"dm8",  statName:"Receiving TDs",      values:[10,25,50],              alertPct:90 },
  { id:"dm9",  statName:"Total Yards",        values:[500,1000,2000,3000],    alertPct:90 },
  { id:"dm10", statName:"Total TDs",          values:[10,20,30,40,50],        alertPct:90 },
  { id:"dm11", statName:"Combined Tackles",   values:[50,100,150,200],        alertPct:90 },
  { id:"dm12", statName:"Sacks",              values:[5,10,15,20],            alertPct:90 },
  { id:"dm13", statName:"Interceptions",      values:[5,10,15],               alertPct:90 },
  { id:"dm14", statName:"Fumbles Forced",     values:[5,10,15],               alertPct:90 },
  { id:"dm15", statName:"Fumbles Recovered",  values:[5,10,15],               alertPct:90 },
  { id:"dm16", statName:"Passes Defended",    values:[5,10,20],               alertPct:90 },
  { id:"dm17", statName:"Extra Points Made",  values:[10,20,30],              alertPct:90 },
  { id:"dm18", statName:"Punting Yards",      values:[500,1000,2000],         alertPct:90 },
  { id:"dm19", statName:"Kick Return Yards",  values:[500,1000],              alertPct:90 },
  { id:"dm20", statName:"Punt Return Yards",  values:[250,500],               alertPct:90 },
];

function getMilestoneAlerts(athlete, records = [], milestones = []) {
  const alerts = [];
  const effectiveMilestones = milestones.length > 0 ? milestones : DEFAULT_MILESTONES;

  for (const rec of records) {
    if (rec.variant !== "Career total") continue;
    const val = athlete.stats[rec.statName];
    if (typeof val !== "number" || val <= 0) continue;
    const p = val / rec.value;
    if (p >= 0.85 && p < 1) {
      alerts.push({
        type: "near_record", statName: rec.statName, variant: rec.variant,
        current: val, target: rec.value, holderName: rec.holderName, holderYear: rec.holderYear, pct: p,
        shortLabel: rec.statName + " record (" + val.toLocaleString() + "/" + rec.value.toLocaleString() + ")",
        fullLabel: athlete.name + " needs " + (rec.value - val).toLocaleString() + " more " + rec.statName.toLowerCase() + " to break " + (rec.holderName ? rec.holderName + "'s" : "the") + " career record of " + rec.value.toLocaleString() + (rec.holderYear ? ", set in " + rec.holderYear : "")
      });
    } else if (p >= 1) {
      alerts.push({
        type: "record_broken", statName: rec.statName, variant: rec.variant,
        current: val, target: rec.value, holderName: rec.holderName, holderYear: rec.holderYear, pct: p,
        shortLabel: rec.statName + " record BROKEN! (" + val.toLocaleString() + ")",
        fullLabel: athlete.name + " has broken " + (rec.holderName ? rec.holderName + "'s" : "the") + " career " + rec.statName.toLowerCase() + " record of " + rec.value.toLocaleString() + (rec.holderYear ? " set in " + rec.holderYear : "") + ", now at " + val.toLocaleString()
      });
    }
  }

  for (const ms of effectiveMilestones) {
    const val = athlete.stats[ms.statName];
    if (typeof val !== "number" || val <= 0) continue;
    const threshold = (ms.alertPct || 90) / 100;
    const sortedVals = [...ms.values].sort((a,b) => a - b);
    for (const target of sortedVals) {
      const p = val / target;
      if (p >= threshold && p < 1) {
        alerts.push({
          type: "near_milestone", statName: ms.statName, variant: "Career total",
          current: val, target, pct: p,
          shortLabel: target.toLocaleString() + " " + ms.statName + " (" + val.toLocaleString() + "/" + target.toLocaleString() + ")",
          fullLabel: athlete.name + " needs " + (target - val).toLocaleString() + " more " + ms.statName.toLowerCase() + " to reach the " + target.toLocaleString() + " career milestone"
        });
        break;
      } else if (p >= 1 && val < target * 1.15) {
        alerts.push({
          type: "milestone_hit", statName: ms.statName, variant: "Career total",
          current: val, target, pct: 1,
          shortLabel: target.toLocaleString() + " " + ms.statName + " reached!",
          fullLabel: athlete.name + " has reached the " + target.toLocaleString() + " career " + ms.statName.toLowerCase() + " milestone with " + val.toLocaleString()
        });
        break;
      }
    }
  }

  return alerts;
}

// ── Derived shooting percentages ─────────────────────────────────────────────
// FG%/3P%/FT% are NEVER stored, imported, or hand-edited — they're always computed
// from makes ÷ attempts wherever they appear (season tables, career rows, records),
// so they can't go stale and the AI can't invent them. A minimum-attempts qualifier
// stops a 1-for-1 fluke (100%) from owning a record.
const PCT_DEFS = [
  { name: "Field Goal Percentage",  short: "FG%", made: "Field Goals Made",   att: "Field Goals Attempted",   minSeasonAtt: 30, minCareerAtt: 100 },
  { name: "Three Point Percentage", short: "3P%", made: "Three Pointers Made", att: "Three Pointers Attempted", minSeasonAtt: 15, minCareerAtt: 40 },
  { name: "Free Throw Percentage",  short: "FT%", made: "Free Throws Made",    att: "Free Throws Attempted",    minSeasonAtt: 20, minCareerAtt: 50 },
];
function shootingPct(stats, made, att) {
  const m = Number(stats?.[made]); const a = Number(stats?.[att]);
  if (!a || a <= 0 || isNaN(m) || isNaN(a)) return null;
  return Math.round((m / a) * 1000) / 10; // one decimal, e.g. 47.3
}
// Auto record-holders for FG%/3P%/FT%: single-season (from player_seasons rows) and
// career (from the career-totals pool). Returns record objects the Records tab renders.
function pctRecordsFrom(seasonRows, careerPlayers, sport) {
  const out = [];
  for (const d of PCT_DEFS) {
    let ss = null;
    for (const r of (seasonRows || [])) {
      if (Number(r.stats?.[d.att]) < d.minSeasonAtt) continue;
      const p = shootingPct(r.stats, d.made, d.att);
      if (p != null && (!ss || p > ss.value)) ss = { value: p, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-ss-${d.name}`, statName: d.name, variant: "Single season", sport, auto: true, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if (Number(pl.stats?.[d.att]) < d.minCareerAtt) continue;
      const p = shootingPct(pl.stats, d.made, d.att);
      if (p != null && (!car || p > car.value)) car = { value: p, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-c-${d.name}`, statName: d.name, variant: "Career total", sport, auto: true, ...car });
  }
  return out;
}
// Two season labels refer to the same year if they share a 4-digit start year
// ("2011-2012" ≡ "2011-12"). Used to look up a team's wins for a season.
function sameSeason(a, b) {
  const y = (s) => (String(s || "").match(/\d{4}/) || [""])[0];
  return !!y(a) && y(a) === y(b);
}

// ── Derived per-game averages ───────────────────────────────────────────────
// Per-game = counting stat ÷ Games Played. Like shooting %, NEVER stored — computed
// wherever shown, and their record-holders auto-computed. Records attach to the PARENT
// stat as variants ("Per game avg (season)"/"(career)") so the Records tab nests them.
const PERGAME_DEFS = [
  { name: "Points Per Game",             short: "PPG",  stat: "Points" },
  { name: "Assists Per Game",            short: "APG",  stat: "Assists" },
  { name: "Rebounds Per Game",           short: "RPG",  stat: "Total Rebounds" },
  { name: "Offensive Rebounds Per Game", short: "ORPG", stat: "Offensive Rebounds" },
  { name: "Defensive Rebounds Per Game", short: "DRPG", stat: "Defensive Rebounds" },
  { name: "Steals Per Game",             short: "SPG",  stat: "Steals" },
  { name: "Blocks Per Game",             short: "BPG",  stat: "Blocks" },
];
const PERGAME_MIN_SEASON_GP = 5;   // min games to qualify a single-season per-game record
const PERGAME_MIN_CAREER_GP = 20;  // min games to qualify a career per-game record
function perGame(stats, statKey) {
  const v = Number(stats?.[statKey]); const g = Number(stats?.["Games Played"]);
  if (!g || g <= 0 || isNaN(v) || isNaN(g)) return null;
  return Math.round((v / g) * 10) / 10; // one decimal, e.g. 18.3
}
// Auto per-game record-holders: single-season high (from player_seasons) + career avg
// (career stat ÷ career games). Returned as variants of the parent stat.
function pergameRecordsFrom(seasonRows, careerPlayers, sport) {
  const out = [];
  for (const d of PERGAME_DEFS) {
    let ss = null;
    for (const r of (seasonRows || [])) {
      if (Number(r.stats?.["Games Played"]) < PERGAME_MIN_SEASON_GP) continue;
      const v = perGame(r.stats, d.stat);
      if (v != null && (!ss || v > ss.value)) ss = { value: v, holderName: r.player_name, holderYear: r.season || "" };
    }
    if (ss) out.push({ id: `auto-pg-ss-${d.stat}`, statName: d.stat, variant: "Per game avg (season)", sport, auto: true, ...ss });
    let car = null;
    for (const pl of (careerPlayers || [])) {
      if (Number(pl.stats?.["Games Played"]) < PERGAME_MIN_CAREER_GP) continue;
      const v = perGame(pl.stats, d.stat);
      if (v != null && (!car || v > car.value)) car = { value: v, holderName: pl.name, holderYear: pl.firstYear ? String(pl.firstYear) : (pl.gradYear ? String(pl.gradYear) : "") };
    }
    if (car) out.push({ id: `auto-pg-c-${d.stat}`, statName: d.stat, variant: "Per game avg (career)", sport, auto: true, ...car });
  }
  return out;
}

function pct(v, t) { return Math.min(100, Math.round((v / t) * 100)); }

function ProgressBar({ value, max, color = "#1a56db" }) {
  const p = pct(value, max);
  return (
    <div style={{ height: 6, background: "#f0f0ee", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

function AlertBadge({ alert, mode = "short" }) {
  const isHit = alert.type === "milestone_hit" || alert.type === "record_broken";
  const isRecord = alert.type === "near_record" || alert.type === "record_broken";
  const bg = isHit ? "#f0fdf4" : isRecord ? "#fefce8" : "#eff6ff";
  const border = isHit ? "#86efac" : isRecord ? "#fde047" : "#bfdbfe";
  const text = isHit ? "#14532d" : isRecord ? "#713f12" : "#1e3a5f";
  const icon = isHit ? "🎉" : isRecord ? "🏆" : "📈";
  const label = mode === "full" ? alert.fullLabel : alert.shortLabel;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: text, lineHeight: 1.4 }}>{label}</div>
        <div style={{ fontSize: 11, color: text, opacity: 0.75, marginTop: 3 }}>
          {alert.current.toLocaleString()} / {alert.target.toLocaleString()} — {pct(alert.current, alert.target)}%
        </div>
        <ProgressBar value={alert.current} max={alert.target} color={isHit ? "#22c55e" : isRecord ? "#eab308" : "#3b82f6"} />
      </div>
    </div>
  );
}


// ── Milestone Settings Modal ───────────────────────────────────────────────────
function MilestoneSettingsModal({ school, onClose, onSave }) {
  const sportDef = SPORTS[school.sport] || SPORTS.football;
  // Build stat list in the same order as the All-Time tab
  const rawStatNames = sportDef.statCategories.map(s => s.name).filter(n => n !== "Coach Wins");
  const allStatNames = [
    ...STAT_ORDER.filter(s => rawStatNames.includes(s)),
    ...rawStatNames.filter(s => !STAT_ORDER.includes(s))
  ];
  const [milestones, setMilestones] = useState(
    school.milestones && school.milestones.length > 0
      ? school.milestones.map(m => ({ ...m, _valStr: m.values.join(", ") }))
      : DEFAULT_MILESTONES.map(m => ({ ...m, _valStr: m.values.join(", ") }))
  );
  const [newStat, setNewStat] = useState(allStatNames[0]);
  const [newVals, setNewVals] = useState("");
  const [newPct, setNewPct] = useState(90);

  const addMilestone = () => {
    if (!newVals.trim()) return;
    const values = newVals.split(",").map(v => Number(v.trim())).filter(v => !isNaN(v) && v > 0);
    if (!values.length) return;
    const ms = { id: "ms" + Date.now(), statName: newStat, values, alertPct: newPct, _valStr: newVals };
    setMilestones(m => [...m, ms]);
    setNewVals("");
  };

  const removeMilestone = (id) => setMilestones(m => m.filter(ms => ms.id !== id));

  const updateMilestone = (id, field, val) => {
    setMilestones(m => m.map(ms => {
      if (ms.id !== id) return ms;
      if (field === "_valStr") {
        const values = val.split(",").map(v => Number(v.trim())).filter(v => !isNaN(v) && v > 0);
        return { ...ms, _valStr: val, values };
      }
      return { ...ms, [field]: field === "alertPct" ? Number(val) : val };
    }));
  };

  const handleSave = () => {
    const clean = milestones.map(({ _valStr, ...rest }) => rest);
    onSave(clean);
    onClose();
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:660,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
          <div>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Milestone thresholds — {school.name}</h2>
            <p style={{ margin:"4px 0 0",fontSize:13,color:"#666" }}>Set the numbers your program wants to celebrate. Alerts fire when an athlete gets within the set % of each threshold.</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#666" }}>✕</button>
        </div>

        <div style={{ background:"#eff6ff",borderRadius:8,padding:12,fontSize:13,color:"#1e3a5f",marginBottom:16 }}>
          💡 These are <strong>your school's</strong> milestones — completely independent of any other school. A 1A program celebrating 500 rushing yards is just as meaningful as a 5A program celebrating 2,000.
        </div>

        {/* Add new */}
        <div style={{ background:"#f9fafb",borderRadius:12,padding:16,marginBottom:20,border:"1px solid #e5e7eb" }}>
          <div style={{ fontWeight:700,fontSize:14,color:"#111",marginBottom:12 }}>+ Add a milestone threshold</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
            <div>
              <label style={{ display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3 }}>Stat category</label>
              <select value={newStat} onChange={e => setNewStat(e.target.value)}
                style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13 }}>
                {allStatNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3 }}>Alert when within</label>
              <select value={newPct} onChange={e => setNewPct(Number(e.target.value))}
                style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13 }}>
                <option value={95}>5% away</option>
                <option value={90}>10% away</option>
                <option value={80}>20% away</option>
                <option value={75}>25% away</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"flex-end" }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3 }}>Threshold values (comma-separated)</label>
              <input value={newVals} onChange={e => setNewVals(e.target.value)} placeholder="e.g. 250, 500, 1000"
                style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box" }} />
            </div>
            <button onClick={addMilestone}
              style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap" }}>
              Add
            </button>
          </div>
          <div style={{ fontSize:12,color:"#9ca3af",marginTop:6 }}>
            Example: "500, 1000" means alert when an athlete approaches 500 rushing yards, then again at 1,000.
          </div>
        </div>

        {/* Existing milestones */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
          <div style={{ fontWeight:700,fontSize:14,color:"#111" }}>
            {milestones.length} milestone{milestones.length!==1?"s":""} configured
          </div>
          <div style={{ fontSize:12,color:"#9ca3af" }}>Use ↑ ↓ to reorder</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20 }}>
          {milestones.map((ms, idx) => {
            const moveUp   = () => setMilestones(m => { const a=[...m]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a; });
            const moveDown = () => setMilestones(m => { const a=[...m]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; return a; });
            return (
              <div key={ms.id} style={{ background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                {/* Reorder buttons */}
                <div style={{ display:"flex",flexDirection:"column",gap:2,flexShrink:0 }}>
                  <button onClick={moveUp} disabled={idx===0}
                    style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:5,width:24,height:24,cursor:idx===0?"not-allowed":"pointer",
                      color:idx===0?"#d1d5db":"#374151",fontSize:12,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    ↑
                  </button>
                  <button onClick={moveDown} disabled={idx===milestones.length-1}
                    style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:5,width:24,height:24,cursor:idx===milestones.length-1?"not-allowed":"pointer",
                      color:idx===milestones.length-1?"#d1d5db":"#374151",fontSize:12,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    ↓
                  </button>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                    <span style={{ fontWeight:600,fontSize:14,color:"#111" }}>{ms.statName}</span>
                    <span style={{ fontSize:12,color:"#9ca3af" }}>· alert at {100 - ms.alertPct}% away</span>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <input value={ms._valStr} onChange={e => updateMilestone(ms.id, "_valStr", e.target.value)}
                        style={{ width:"100%",border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 10px",fontSize:13,boxSizing:"border-box" }} />
                    </div>
                    <select value={ms.alertPct} onChange={e => updateMilestone(ms.id, "alertPct", e.target.value)}
                      style={{ border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",fontSize:12,color:"#374151" }}>
                      <option value={95}>5% away</option>
                      <option value={90}>10% away</option>
                      <option value={80}>20% away</option>
                      <option value={75}>25% away</option>
                    </select>
                  </div>
                  <div style={{ display:"flex",gap:6,marginTop:6,flexWrap:"wrap" }}>
                    {[...ms.values].sort((a,b)=>a-b).map(v => (
                      <span key={v} style={{ background:"#f3f4f6",color:"#374151",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:600 }}>
                        {v.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeMilestone(ms.id)}
                  style={{ background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",color:"#991b1b",flexShrink:0 }}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex",gap:10 }}>
          <button onClick={() => setMilestones(DEFAULT_MILESTONES.map(m => ({ ...m, _valStr: m.values.join(", ") })))}
            style={{ background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 16px",fontWeight:600,fontSize:13,cursor:"pointer",color:"#374151" }}>
            Reset to defaults
          </button>
          <button onClick={handleSave}
            style={{ flex:1,background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14,cursor:"pointer" }}>
            Save milestone settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Records Manager Modal ──────────────────────────────────────────────────────
function RecordsModal({ school, onClose, onSave }) {
  const sportDef = SPORTS[school.sport] || SPORTS.football;
  const [records, setRecords] = useState(school.records || []);
  const [editingId, setEditingId] = useState(null);
  const variantsForStat = (statName) => {
    const found = sportDef.statCategories.find(s => s.name === statName);
    return found ? found.variants : STAT_VARIANTS_STANDARD;
  };

  const firstStat = sportDef.statCategories[0]?.name || "Passing Yards";
  const [newForm, setNewForm] = useState({ statName: firstStat, variant: variantsForStat(firstStat)[0], holderName: "", holderYear: "", value: "" });
  const [filter, setFilter] = useState("");

  const addRecord = () => {
    if (!newForm.value) return;
    const rec = { id: `r${Date.now()}`, ...newForm, value: Number(newForm.value), sport: school.sport };
    setRecords(r => [...r, rec]);
    setNewForm(f => ({ ...f, holderName: "", holderYear: "", value: "" }));
  };

  const updateRecord = (id, field, val) => {
    setRecords(r => r.map(rec => rec.id === id ? { ...rec, [field]: field === "value" ? Number(val) : val } : rec));
  };

  const deleteRecord = (id) => setRecords(r => r.filter(rec => rec.id !== id));

  const filtered = records.filter(r => !filter || r.statName.toLowerCase().includes(filter.toLowerCase()) || (r.holderName || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>School records — {school.name}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>Each record tracks the specific stat, variant, record holder, year set, and value</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>✕</button>
        </div>

        <div style={{ background: "#eff6ff", borderRadius: 8, padding: 12, fontSize: 13, color: "#1e3a5f", marginBottom: 16 }}>
          💡 Alerts fire when an athlete reaches <strong>85%</strong> of any career total record. Be as specific as possible — "Tackles (Career total)" and "Tackles (Single game)" are tracked separately.
        </div>

        {/* Add new record */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 12 }}>+ Add a record</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 3 }}>Stat category</label>
              <select value={newForm.statName} onChange={e => setNewForm(f => ({ ...f, statName: e.target.value, variant: variantsForStat(e.target.value)[0] }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 13 }}>
                {sportDef.groups ? sportDef.groups.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.stats.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </optgroup>
                )) : sportDef.statCategories.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 3 }}>Variant</label>
              <select value={newForm.variant} onChange={e => setNewForm(f => ({ ...f, variant: e.target.value }))}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 13 }}>
                {variantsForStat(newForm.statName).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 3 }}>Record holder name</label>
              <input value={newForm.holderName} onChange={e => setNewForm(f => ({ ...f, holderName: e.target.value }))} placeholder="e.g. Don Lammers"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 3 }}>Year set</label>
              <input value={newForm.holderYear} onChange={e => setNewForm(f => ({ ...f, holderYear: e.target.value }))} placeholder="e.g. 1979-1980"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 3 }}>Record value</label>
              <input type="number" value={newForm.value} onChange={e => setNewForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 227"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <button onClick={addRecord}
              style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              Add record
            </button>
          </div>
        </div>

        {/* Existing records */}
        {records.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{records.length} records on file</div>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter records..."
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", fontSize: 13, width: 180 }} />
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Stat","Variant","Record holder","Year","Value",""].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec, i) => (
                    <tr key={rec.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#111" }}>{rec.statName}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: "#eff6ff", color: "#1e3a5f", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{rec.variant}</span>
                      </td>
                      <td style={{ padding: "9px 12px", color: rec.holderName ? "#111" : "#9ca3af" }}>
                        {editingId === rec.id
                          ? <input value={rec.holderName || ""} onChange={e => updateRecord(rec.id, "holderName", e.target.value)}
                              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: 13, width: 120 }} />
                          : (rec.holderName || "—")}
                      </td>
                      <td style={{ padding: "9px 12px", color: rec.holderYear ? "#374151" : "#9ca3af" }}>
                        {editingId === rec.id
                          ? <input value={rec.holderYear || ""} onChange={e => updateRecord(rec.id, "holderYear", e.target.value)}
                              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: 13, width: 90 }} />
                          : (rec.holderYear || "—")}
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#111" }}>
                        {editingId === rec.id
                          ? <input type="number" value={rec.value} onChange={e => updateRecord(rec.id, "value", e.target.value)}
                              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: 13, width: 80 }} />
                          : rec.value.toLocaleString()}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditingId(editingId === rec.id ? null : rec.id)}
                            style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "#374151" }}>
                            {editingId === rec.id ? "Done" : "Edit"}
                          </button>
                          <button onClick={() => deleteRecord(rec.id)}
                            style={{ background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "#991b1b" }}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {records.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 14 }}>
            No records added yet. Add your first record above.
          </div>
        )}

        <button onClick={() => { onSave(records); onClose(); }}
          style={{ marginTop: 20, width: "100%", background: "#1a56db", color: "#fff", border: "none", borderRadius: 8, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Save {records.length} records
        </button>
      </div>
    </div>
  );
}

// ── CSV / PDF Upload Modal ─────────────────────────────────────────────────────
function ImportModal({ school, onClose, onImport }) {
  const [activeTab, setActiveTab] = useState("csv");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const [pdfFileName, setPdfFileName] = useState(null);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = isNaN(vals[i]) ? vals[i] : Number(vals[i]); });
      return obj;
    });
    return { headers, rows };
  };

  // Accepts CSV *or* Excel (.xlsx/.xls) and normalizes both to { headers, rows }.
  const handleCSVFile = async (file) => {
    setError(null); setPreview(null);
    const name = (file.name || "").toLowerCase();
    try {
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await loadSheetJS();
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        if (aoa.length < 2) throw new Error("The spreadsheet needs a header row and at least one player row");
        const headers = (aoa[0] || []).map(h => String(h).trim()).filter(Boolean);
        const rows = aoa.slice(1).filter(r => r && r.some(c => c !== "" && c != null)).map(r => {
          const obj = {};
          headers.forEach((h, i) => { const v = r[i]; obj[h] = (v === "" || v == null) ? "" : (isNaN(v) ? v : Number(v)); });
          return obj;
        });
        if (!rows.length) throw new Error("No player rows found in the spreadsheet");
        setPreview({ headers, rows });
      } else {
        setPreview(parseCSV(await file.text()));
      }
    } catch (err) { setError(err.message || String(err)); }
  };

  const handlePDFFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (!files.length) return;
    setError(null); setPdfLoading(true); setPdfResult(null);
    setPdfFileName(files.length === 1 ? files[0].name : `${files.length} PDFs`);
    const byName = {};
    const errs = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setPdfFileName(`Reading ${i + 1} of ${files.length}: ${f.name}…`);
      try {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = () => rej(new Error("read failed"));
          r.readAsDataURL(f);
        });
        const { data, error } = await extractPdfStats(base64);
        if (error) { errs.push(`${f.name}: ${error}`); continue; }
        for (const a of (data.athletes || [])) {
          const key = String(a.name || "").toLowerCase().trim();
          if (!key) continue;
          if (!byName[key]) byName[key] = { ...a, stats: { ...(a.stats || {}) } };
          else Object.assign(byName[key].stats, a.stats || {});
        }
      } catch (err) { errs.push(`${f.name}: ${err.message || err}`); }
    }
    setPdfLoading(false);
    setPdfFileName(files.length === 1 ? files[0].name : `${files.length} PDFs`);
    const merged = Object.values(byName);
    if (!merged.length) { setError("Couldn't extract athletes from those PDFs." + (errs.length ? " " + errs[0] : "")); return; }
    if (errs.length) setError(`Imported ${files.length - errs.length} of ${files.length} files. Issues: ${errs.join("; ")}`);
    setPdfResult(merged);
  };
  const handlePDFFile = (file) => handlePDFFiles([file]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (!dropped.length) return;
    const pdfs = dropped.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    const sheet = dropped.find(f => /\.(csv|xlsx|xls)$/i.test(f.name));
    if (pdfs.length) { setActiveTab("pdf"); handlePDFFiles(pdfs); }
    else if (sheet) { setActiveTab("csv"); handleCSVFile(sheet); }
    else setError("Please drop a .csv, .xlsx, or .pdf file");
  };

  const handlePDFImport = () => {
    const allStatKeys = [...new Set(pdfResult.flatMap(a => Object.keys(a.stats)))];
    const headers = ["Player Name", "Position", "Grad Year", ...allStatKeys];
    const rows = pdfResult.map(a => {
      const row = { "Player Name": a.name, "Position": a.position || "—", "Grad Year": a.gradYear };
      allStatKeys.forEach(k => { row[k] = a.stats[k] ?? 0; });
      return row;
    });
    onImport({ headers, rows });
    onClose();
  };

  // Sport-aware CSV template
  const SPORT_TEMPLATES = {
    basketball: {
      headers: "Name,Grad Year,Games Played,Wins,Points,Assists,Total Rebounds,Offensive Rebounds,Defensive Rebounds,Steals,Blocks,Field Goals Made,Field Goals Attempted,Three Pointers Made,Three Pointers Attempted,Free Throws Made,Free Throws Attempted",
      example:  "Alex Johnson,2026,28,22,394,54,186,62,124,41,8,142,298,38,102,72,95"
    },
    basketball_boys: {
      headers: "Name,Grad Year,Games Played,Wins,Points,Assists,Total Rebounds,Offensive Rebounds,Defensive Rebounds,Steals,Blocks,Field Goals Made,Field Goals Attempted,Three Pointers Made,Three Pointers Attempted,Free Throws Made,Free Throws Attempted",
      example:  "Alex Johnson,2026,28,22,394,54,186,62,124,41,8,142,298,38,102,72,95"
    },
    basketball_girls: {
      headers: "Name,Grad Year,Games Played,Wins,Points,Assists,Total Rebounds,Offensive Rebounds,Defensive Rebounds,Steals,Blocks,Field Goals Made,Field Goals Attempted,Three Pointers Made,Three Pointers Attempted,Free Throws Made,Free Throws Attempted",
      example:  "Natalie Bohannon,2026,82,72,986,118,586,194,392,104,12,358,798,42,128,228,310"
    },
    football: {
      headers: "Name,Position,Grad Year,Games Played,Wins,Passing Yards,Pass Completions,Pass Attempts,Passing TDs,Rushing Yards,Rushing Attempts,Rushing TDs,Receptions,Receiving Yards,Receiving TDs,Total Tackles,Sacks,Interceptions,Coach Wins",
      example:  "Quinn Barkema,QB,2025,22,18,1847,142,248,18,243,38,4,0,0,0,0,0,0,0"
    },
    soccer_girls: {
      headers: "Name,Grad Year,Games Played,Goals,Assists,Saves,Clean Sheets",
      example:  "Emma Schoenwald,2026,22,18,12,0,0"
    },
    soccer: {
      headers: "Name,Grad Year,Games Played,Goals,Assists,Saves,Clean Sheets",
      example:  "Emma Schoenwald,2026,22,18,12,0,0"
    },
  };
  const tpl = SPORT_TEMPLATES[school.sport] || SPORT_TEMPLATES.football;
  const sampleCSV = tpl.headers + "\n" + tpl.example;

  const downloadTemplate = async () => {
    setError(null);
    try {
      const XLSX = await loadSheetJS();
      const aoa = [
        tpl.headers.split(","),
        tpl.example.split(",").map(v => (v === "" || isNaN(v)) ? v : Number(v)),
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Career stats");
      XLSX.writeFile(wb, `${school.name.replace(/\s+/g,"_")}_${school.sport}_career_template.xlsx`);
    } catch (err) { setError("Template error: " + (err.message || err)); }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Import career stats — {school.name}</h2>
            <p style={{ margin:"4px 0 0",fontSize:13,color:"#666" }}>Upload a CSV or Excel file, or let AI extract stats from any PDF</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#666" }}>✕</button>
        </div>

        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"12px 14px", marginBottom:18, fontSize:13, color:"#92400e", display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:16, lineHeight:1.2 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, marginBottom:2 }}>This imports CAREER totals — one row per player (their all-time numbers).</div>
            For <strong>season-by-season</strong> stats (a separate row per player per season), close this and use <strong>“📥 Import season stats”</strong> on the All-Time tab instead.
          </div>
        </div>

        <div style={{ display:"flex",gap:0,marginBottom:20,border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden" }}>
          {[["csv","📄 CSV / Excel"],["pdf","🤖 AI PDF import"]].map(([tab,label]) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setError(null); setPreview(null); setPdfResult(null); }}
              style={{ flex:1,padding:"10px",fontSize:13,fontWeight:activeTab===tab?700:400,cursor:"pointer",border:"none",
                background:activeTab===tab?"#1a56db":"#f9fafb", color:activeTab===tab?"#fff":"#6b7280" }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "csv" && (
          <>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
              style={{ border:`2px dashed ${dragOver?"#1a56db":"#ddd"}`,borderRadius:12,padding:32,textAlign:"center",background:dragOver?"#eff6ff":"#fafafa",marginBottom:16,transition:"all 0.2s" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>📁</div>
              <div style={{ fontWeight:600,color:"#333",marginBottom:4 }}>Drop your CSV or Excel file here</div>
              <div style={{ fontSize:13,color:"#888",marginBottom:12 }}>or click to browse</div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={e=>e.target.files[0]&&handleCSVFile(e.target.files[0])} style={{ display:"none" }} id="csv-input" />
              <label htmlFor="csv-input" style={{ background:"#1a56db",color:"#fff",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>Choose file</label>
            </div>
            {preview && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontWeight:600,color:"#111",marginBottom:8,fontSize:14 }}>Preview — {preview.rows.length} athletes found</div>
                <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e5e7eb" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                    <thead><tr style={{ background:"#f9fafb" }}>
                      {preview.headers.slice(0,6).map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#374151",fontWeight:600,borderBottom:"1px solid #e5e7eb" }}>{h}</th>)}
                      {preview.headers.length>6&&<th style={{ padding:"8px 12px",color:"#9ca3af" }}>+{preview.headers.length-6} more</th>}
                    </tr></thead>
                    <tbody>
                      {preview.rows.slice(0,4).map((row,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f3f4f6" }}>
                          {preview.headers.slice(0,6).map(h=><td key={h} style={{ padding:"7px 12px",color:"#374151" }}>{String(row[h]??"—")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={()=>{onImport(preview);onClose();}}
                  style={{ marginTop:12,background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:600,fontSize:14,cursor:"pointer",width:"100%" }}>
                  Import {preview.rows.length} athletes
                </button>
              </div>
            )}
            <div style={{ marginTop:12, display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={downloadTemplate}
                style={{ background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                ⬇ Download Excel template
              </button>
              <details style={{ flex:1 }}>
                <summary style={{ fontSize:13,color:"#6b7280",cursor:"pointer",userSelect:"none" }}>View expected format</summary>
                <pre style={{ background:"#f9fafb",borderRadius:8,padding:12,fontSize:11,overflowX:"auto",color:"#374151",marginTop:8,whiteSpace:"pre-wrap",wordBreak:"break-all" }}>{sampleCSV}</pre>
              </details>
            </div>
          </>
        )}

        {activeTab === "pdf" && (
          <>
            <div style={{ background:"#eff6ff",borderRadius:8,padding:12,fontSize:13,color:"#1e3a5f",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start" }}>
              <span style={{ fontSize:16 }}>🤖</span>
              <div><div style={{ fontWeight:600,marginBottom:2 }}>AI-powered extraction</div>
                Upload any PDF — stat sheet, MaxPreps export, program booklet — and AI automatically finds every athlete and stat.</div>
            </div>
            {!pdfResult && !pdfLoading && (
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
                style={{ border:`2px dashed ${dragOver?"#1a56db":"#ddd"}`,borderRadius:12,padding:36,textAlign:"center",background:dragOver?"#eff6ff":"#fafafa",marginBottom:16 }}>
                <div style={{ fontSize:40,marginBottom:8 }}>📋</div>
                <div style={{ fontWeight:600,color:"#333",marginBottom:4 }}>Drop your PDFs here</div>
                <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>Stat sheets, program booklets, MaxPreps exports — one or many, any format</div>
                <input type="file" accept=".pdf" multiple onChange={e=>e.target.files.length&&handlePDFFiles(e.target.files)} style={{ display:"none" }} id="pdf-input" />
                <label htmlFor="pdf-input" style={{ background:"#1a56db",color:"#fff",padding:"10px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600 }}>Choose PDFs</label>
              </div>
            )}
            {pdfLoading && (
              <div style={{ textAlign:"center",padding:40 }}>
                <div style={{ fontSize:36,marginBottom:12 }}>🤖</div>
                <div style={{ fontWeight:600,color:"#111",marginBottom:6 }}>AI is reading your PDF...</div>
                <div style={{ fontSize:13,color:"#6b7280" }}>Extracting athletes and stats from {pdfFileName}</div>
              </div>
            )}
            {pdfResult && (
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                  <div style={{ background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#14532d",fontWeight:600,flex:1 }}>
                    ✓ AI found {pdfResult.length} athletes in {pdfFileName}
                  </div>
                  <button onClick={()=>{setPdfResult(null);setPdfFileName(null);}}
                    style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",color:"#6b7280" }}>
                    Try another
                  </button>
                </div>
                <div style={{ borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden",marginBottom:16 }}>
                  {pdfResult.map((athlete,i)=>(
                    <div key={i} style={{ padding:"12px 16px",borderBottom:i<pdfResult.length-1?"1px solid #f3f4f6":"none",background:i%2===0?"#fff":"#fafafa" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontWeight:600,fontSize:14,color:"#111" }}>{athlete.name}</div>
                          <div style={{ fontSize:12,color:"#9ca3af" }}>{athlete.position||"—"} · Class of {athlete.gradYear}</div>
                        </div>
                        <div style={{ display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:"60%" }}>
                          {Object.entries(athlete.stats).slice(0,4).map(([k,v])=>(
                            <span key={k} style={{ background:"#eff6ff",color:"#1e3a5f",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600 }}>
                              {v.toLocaleString()} {k}
                            </span>
                          ))}
                          {Object.keys(athlete.stats).length>4&&<span style={{ color:"#9ca3af",fontSize:11 }}>+{Object.keys(athlete.stats).length-4} more</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handlePDFImport}
                  style={{ width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"11px",fontWeight:600,fontSize:14,cursor:"pointer" }}>
                  Import {pdfResult.length} athletes from PDF
                </button>
              </div>
            )}
          </>
        )}

        {error && <div style={{ background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:12,color:"#991b1b",fontSize:13,marginTop:12 }}>{error}</div>}
      </div>
    </div>
  );
}

// ── Email Preview Modal ────────────────────────────────────────────────────────
function EmailPreviewModal({ allAlerts, school, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [result, setResult] = useState(null);
  const sport = SPORTS[school.sport] || SPORTS.football;
  const totalAlerts = allAlerts.reduce((a, x) => a + x.alerts.length, 0);

  const doSend = async () => {
    setStatus("sending"); setResult(null);
    const payload = [];
    allAlerts.forEach(({ athlete, alerts }) => (alerts || []).forEach(al => payload.push({
      athlete_id: String(athlete.id), athlete_name: athlete.name,
      stat_name: al.statName, kind: al.type,
      current: al.current, target: al.target, holder_name: al.holderName || null,
    })));
    if (!payload.length) { setResult({ sent: 0 }); setStatus("done"); return; }
    const { data, error } = await sendAlerts(school.id, payload);
    if (error) { setResult({ error }); setStatus("error"); }
    else { setResult(data || { sent: 0 }); setStatus("done"); }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:600,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Alert email preview</h2>
            <p style={{ margin:"4px 0 0",fontSize:13,color:"#666" }}>{totalAlerts} milestone{totalAlerts!==1?"s":""} to report</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:16 }}>
          <div style={{ background:"#1a56db",padding:"16px 20px",color:"#fff" }}>
            <div style={{ fontSize:11,opacity:0.8,marginBottom:2 }}>FROM: alerts@raftersiq.com</div>
            <div style={{ fontSize:11,opacity:0.8,marginBottom:8 }}>TO: coaching staff & athletic director</div>
            <div style={{ fontSize:16,fontWeight:700 }}>🏆 {school.name} milestone alert — {new Date().toLocaleDateString()}</div>
          </div>
          <div style={{ padding:20,fontSize:14,color:"#374151",lineHeight:1.7 }}>
            <p>Hi Coach,</p>
            <p>Here's your weekly milestone update for <strong>{school.name} {sport.label}</strong>. The following athletes are approaching or have reached significant milestones:</p>
            {allAlerts.map(({ athlete, alerts: ats }) => ats.length > 0 && (
              <div key={athlete.id} style={{ marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f3f4f6" }}>
                <div style={{ fontWeight:700,fontSize:15,color:"#111",marginBottom:8 }}>{athlete.name} · {athlete.position} · Class of {athlete.gradYear}</div>
                {ats.map((a,i) => (
                  <div key={i} style={{ paddingLeft:12,borderLeft:"3px solid #1a56db",marginBottom:8 }}>
                    <div style={{ fontWeight:600,color:"#111" }}>{a.fullLabel}</div>
                    <div style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>
                      Current: {a.current.toLocaleString()} / Target: {a.target.toLocaleString()} ({pct(a.current,a.target)}%)
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontSize:13,color:"#6b7280",marginTop:8 }}>Generated automatically by RaftersIQ.</p>
          </div>
        </div>
        {status==="done" && (result?.sent > 0
          ? <div style={{ background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:12,textAlign:"center",color:"#14532d",fontWeight:600 }}>✓ Sent {result.sent} alert{result.sent!==1?"s":""} to your coaches &amp; AD{result.recipients?` (${result.recipients} recipient${result.recipients!==1?"s":""})`:""}</div>
          : <div style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:12,textAlign:"center",color:"#374151",fontWeight:600 }}>✓ Nothing new to send — these alerts were already emailed.</div>
        )}
        {status==="error" && <div style={{ background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:12,color:"#991b1b",fontSize:13,fontWeight:600,lineHeight:1.5 }}>⚠ Couldn't send: {result?.error}{result?.detail ? ` — ${typeof result.detail === "string" ? result.detail : JSON.stringify(result.detail)}` : ""}</div>}
        {(status==="idle" || status==="error") && <button onClick={doSend} style={{ width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14,cursor:"pointer",marginTop:status==="error"?8:0 }}>{status==="error"?"Try again":"Send alert now"}</button>}
        {status==="sending" && <button disabled style={{ width:"100%",background:"#93b4f0",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14 }}>Sending…</button>}
      </div>
    </div>
  );
}

// ── Add Athlete Modal ──────────────────────────────────────────────────────────
function AddAthleteModal({ onClose, onAdd, sport }) {
  const sportDef = SPORTS[sport] || SPORTS.football;
  const statNames = [...new Set(sportDef.statCategories.map(s => s.name))];
  const [form, setForm] = useState({ name:"", position:"", gradYear: new Date().getFullYear()+2 });
  const [stats, setStats] = useState({});
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onAdd({ id:`a${Date.now()}`, isActive:true, ...form, gradYear: Number(form.gradYear), stats });
    onClose();
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:500,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Add athlete</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
          {[["name","Full name","text"],["position","Position","text"],["gradYear","Grad year","number"]].map(([k,label,type])=>(
            <div key={k} style={{ gridColumn:k==="name"?"1/-1":"auto" }}>
              <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4 }}>{label}</label>
              <input type={type} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14,boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ fontWeight:600,fontSize:13,color:"#374151",marginBottom:10 }}>Career stats (optional)</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
          {statNames.map(cat=>(
            <div key={cat}>
              <label style={{ display:"block",fontSize:11,color:"#6b7280",marginBottom:3 }}>{cat}</label>
              <input type="number" value={stats[cat]||""} onChange={e=>setStats(s=>({...s,[cat]:Number(e.target.value)}))} placeholder="0"
                style={{ width:"100%",border:"1px solid #e5e7eb",borderRadius:6,padding:"6px 10px",fontSize:13,boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <button onClick={handleSubmit} style={{ marginTop:20,width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"11px",fontWeight:600,fontSize:14,cursor:"pointer" }}>
          Add athlete
        </button>
      </div>
    </div>
  );
}

// ── Add School Modal ───────────────────────────────────────────────────────────
// Account section — real name (from registration), saves to the profile.
function AccountSection({ userId, userName, userEmail, userPhone, tier, onSignOut }) {
  const parts = (userName || "").trim().split(/\s+/).filter(Boolean);
  const [first, setFirst] = useState(parts[0] || "");
  const [last, setLast] = useState(parts.slice(1).join(" "));
  const [phone, setPhone] = useState(userPhone || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const display = `${first} ${last}`.trim() || userEmail || "Your account";
  const initial = ((first[0] || userEmail[0] || "?")).toUpperCase();
  const planLabel = ({ program:"Program", school:"School", school_plus:"School Plus" }[tier] || "Program");
  const inp = { width:"100%", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 12px", fontSize:14, boxSizing:"border-box", color:"#111" };
  const lbl = { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:4 };

  const save = async () => {
    if (!userId) return;
    setSaving(true); setMsg("");
    const full_name = `${first} ${last}`.trim();
    let res = await updateProfile(userId, { full_name, phone });
    if (res.error) res = await updateProfile(userId, { full_name }); // phone column may not exist yet
    setSaving(false);
    if (res.error) { setMsg("Couldn't save: " + (res.error.message || res.error)); return; }
    setMsg("Saved ✓");
    // Reload so the new name shows everywhere (e.g. the Users & access roster).
    setTimeout(() => window.location.reload(), 700);
  };

  return (
    <>
      <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:16,background:"#f9fafb",borderRadius:10 }}>
        <div style={{ width:56,height:56,borderRadius:"50%",background:"#1a56db",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:20 }}>{initial}</div>
        <div>
          <div style={{ fontWeight:700,fontSize:15,color:"#111" }}>{display}</div>
          <div style={{ fontSize:13,color:"#6b7280" }}>{userEmail || "—"}</div>
          <div style={{ display:"inline-block",background:"#dbeafe",color:"#1e40af",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,marginTop:4 }}>{planLabel} plan</div>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <button onClick={onSignOut} style={{ background:"none",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer",color:"#991b1b",fontWeight:600 }}>Sign out</button>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div><label style={lbl}>First name</label><input style={inp} value={first} onChange={e=>setFirst(e.target.value)} /></div>
        <div><label style={lbl}>Last name</label><input style={inp} value={last} onChange={e=>setLast(e.target.value)} /></div>
        <div><label style={lbl}>Email address</label><input style={{ ...inp, background:"#f3f4f6", color:"#6b7280" }} value={userEmail || ""} disabled /></div>
        <div><label style={lbl}>Phone number</label><input style={inp} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
      </div>
      <button onClick={save} disabled={saving} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:600,fontSize:13,cursor:"pointer",marginTop:12 }}>{saving ? "Saving…" : "Save changes"}</button>
      {msg && <span style={{ marginLeft:12,fontSize:13,color:"#6b7280" }}>{msg}</span>}
    </>
  );
}

// Password change — verifies the current password, then updates via Supabase auth.
function PasswordSection({ userEmail }) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const inp = { width:"100%", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 12px", fontSize:14, boxSizing:"border-box", color:"#111" };
  const lbl = { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:4 };
  const save = async () => {
    setMsg("");
    if (!cur || !pw || !confirm) { setMsg("Fill in all three fields."); return; }
    if (pw.length < 8) { setMsg("New password must be at least 8 characters."); return; }
    if (pw !== confirm) { setMsg("New passwords don't match."); return; }
    setSaving(true);
    const { error } = await changePassword(userEmail, cur, pw);
    setSaving(false);
    if (error) { setMsg("Couldn't update: " + (error.message || error)); return; }
    setCur(""); setPw(""); setConfirm("");
    setMsg("Password updated ✓");
  };
  return (
    <>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div><label style={lbl}>Current password</label><input style={inp} type="password" value={cur} onChange={e=>setCur(e.target.value)} placeholder="••••••••" /></div>
        <div />
        <div><label style={lbl}>New password</label><input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min. 8 characters" /></div>
        <div><label style={lbl}>Confirm new password</label><input style={inp} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" /></div>
      </div>
      <button onClick={save} disabled={saving} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:600,fontSize:13,cursor:"pointer",marginTop:12 }}>{saving ? "Updating…" : "Update password"}</button>
      {msg && <span style={{ marginLeft:12,fontSize:13,color:"#6b7280" }}>{msg}</span>}
    </>
  );
}

// School roster + role management (admin only manages; everyone sees the list).
function MembersSection({ orgId, role, userId, programs = [], tierLimits = {} }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("coach");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [inviteProgram, setInviteProgram] = useState("");
  const [roleEdits, setRoleEdits] = useState({});
  const isAdmin = role === "admin";
  const progLabel = (id) => { const p = programs.find(x => x.id === id); return p ? (SPORTS[p.sport]?.label || p.mascot || "program") : ""; };

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await getMembers(orgId);
    setMembers(data || []);
    const { data: inv } = await getPendingInvites(orgId);
    setPending(inv || []);
    // Which program(s) each coach is assigned to → user_id: [programId,…]
    const map = {};
    for (const p of programs) {
      const { data: pcs } = await getProgramCoaches(p.id);
      (pcs || []).forEach((pc) => { (map[pc.user_id] = map[pc.user_id] || []).push(p.id); });
    }
    setAssignments(map);
    setLoading(false);
  }, [orgId, programs]);
  useEffect(() => { load(); }, [load]);

  const stageRole = (uid, newRole) => setRoleEdits(r => ({ ...r, [uid]: newRole }));
  const dirtyRoles = members.filter(m => roleEdits[m.user_id] != null && roleEdits[m.user_id] !== m.role);
  const saveRoles = async () => {
    if (!dirtyRoles.length) return;
    for (const m of dirtyRoles) {
      const { error } = await updateMemberRole(orgId, m.user_id, roleEdits[m.user_id]);
      if (error) { alert("Couldn't save role change: " + (error.message || error)); return; }
    }
    setRoleEdits({});
    load();
  };
  const removeOne = async (uid) => {
    if (!window.confirm("Remove this member from the school?")) return;
    const { error } = await removeMember(orgId, uid);
    if (error) { alert("Couldn't remove member: " + (error.message || error)); return; }
    load();
  };
  const assignTeam = async (uid, programId) => {
    if (!programId) return;
    const max = tierLimits?.maxCoachesPerProgram || 999;
    const already = (assignments[uid] || []).includes(programId);
    const onProg = Object.values(assignments).filter(arr => arr.includes(programId)).length;
    if (!already && onProg >= max) { setMsg(`That team is at its ${max}-coach limit for your plan. Upgrade to add more.`); return; }
    const { error } = await addProgramCoach(programId, uid);
    if (error) { setMsg("Couldn't assign team: " + (error.message || error)); return; }
    setMsg(`✓ Assigned to ${progLabel(programId)}`);
    load();
  };
  const unassignTeam = async (uid, programId) => {
    const { error } = await removeProgramCoach(programId, uid);
    if (error) { setMsg("Couldn't remove from team: " + (error.message || error)); return; }
    load();
  };
  const sendInvite = async () => {
    if (!inviteEmail) return;
    if (inviteRole === "coach" && !inviteProgram) { setMsg("Pick which program this coach will run."); return; }
    const maxUsers = tierLimits?.maxUsers || 999;
    if (members.length + pending.length >= maxUsers) {
      setMsg(`Your plan allows up to ${maxUsers} users (including the AD). Upgrade to add more seats.`);
      return;
    }
    setMsg("Inviting…");
    const programId = inviteRole === "coach" ? inviteProgram : null;
    const { error } = await inviteMember(inviteEmail, orgId, inviteRole, programId);
    if (error) { setMsg("Invite failed: " + (error.message || error)); return; }
    const { error: emailErr } = await sendInviteEmail(inviteEmail, orgId, inviteRole);
    setMsg(emailErr
      ? `✓ ${inviteEmail} is set as ${inviteRole}${programId ? " (" + progLabel(programId) + ")" : ""} — but the email didn't send (${emailErr}). Tell them to sign up at raftersiq.com.`
      : `✓ Invited ${inviteEmail} as ${inviteRole}${programId ? " (" + progLabel(programId) + ")" : ""} — we emailed them a sign-up link. 📨`);
    setInviteEmail("");
    load();
  };
  const cancelOne = async (id) => {
    const { error } = await cancelInvite(id);
    if (error) { alert("Couldn't cancel invite: " + (error.message || error)); return; }
    load();
  };

  if (loading) return <div style={{ fontSize:13,color:"#9ca3af" }}>Loading members…</div>;
  return (
    <>
      <div style={{ marginBottom:16 }}>
        {members.length===0
          ? <div style={{ fontSize:13,color:"#9ca3af" }}>No members yet.</div>
          : members.map((mb,i)=>{
              const nm = mb.profiles?.full_name || mb.profiles?.email || "Member";
              const em = mb.profiles?.email || "";
              const initials = nm.split(" ").map(x=>x[0]||"").join("").slice(0,2).toUpperCase();
              return (
                <div key={mb.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<members.length-1?"1px solid #f3f4f6":"none" }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"#e0e7ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#4338ca",flexShrink:0 }}>{initials}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"#111" }}>{nm}</div>
                    <div style={{ fontSize:12,color:"#6b7280" }}>{em}</div>
                    {isAdmin && (roleEdits[mb.user_id] ?? mb.role) === "coach" ? (
                      <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4,alignItems:"center" }}>
                        {(assignments[mb.user_id] || []).map(pid => (
                          <span key={pid} style={{ display:"inline-flex",alignItems:"center",gap:3,background:"#eff6ff",color:"#1a56db",border:"1px solid #bfdbfe",borderRadius:10,padding:"1px 4px 1px 8px",fontSize:11,fontWeight:600 }}>
                            {progLabel(pid)}
                            <button onClick={()=>unassignTeam(mb.user_id, pid)} title="Remove from team" style={{ background:"none",border:"none",cursor:"pointer",color:"#1a56db",fontSize:13,lineHeight:1,padding:"0 2px" }}>×</button>
                          </span>
                        ))}
                        <select value="" onChange={e=>{ const v=e.target.value; e.target.value=""; assignTeam(mb.user_id, v); }}
                          style={{ border:"1px dashed #93c5fd",borderRadius:10,padding:"2px 6px",fontSize:11,color:"#1a56db",background:"#fff",cursor:"pointer" }}>
                          <option value="">+ assign team…</option>
                          {programs.filter(p => !(assignments[mb.user_id] || []).includes(p.id)).map(p => (
                            <option key={p.id} value={p.id}>{progLabel(p.id)}</option>
                          ))}
                        </select>
                      </div>
                    ) : assignments[mb.user_id]?.length > 0 ? (
                      <div style={{ fontSize:11,color:"#1a56db",marginTop:2,fontWeight:600 }}>📋 {assignments[mb.user_id].map(progLabel).join(", ")}</div>
                    ) : null}
                  </div>
                  {mb.user_id === userId ? (
                    <span style={{ fontSize:12,fontWeight:600,color:"#1a56db",whiteSpace:"nowrap" }}>You · {mb.role}</span>
                  ) : isAdmin ? (
                    <>
                      <select value={roleEdits[mb.user_id] ?? mb.role} onChange={e=>stageRole(mb.user_id, e.target.value)}
                        style={{ border:`1px solid ${roleEdits[mb.user_id] != null && roleEdits[mb.user_id] !== mb.role ? "#f59e0b" : "#e5e7eb"}`,borderRadius:6,padding:"4px 8px",fontSize:12,color:"#374151" }}>
                        <option value="admin">Admin (sees all)</option>
                        <option value="coach">Coach</option>
                      </select>
                      <button onClick={()=>removeOne(mb.user_id)} style={{ background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#991b1b" }}>Remove</button>
                    </>
                  ) : (
                    <span style={{ fontSize:12,fontWeight:600,color:"#6b7280",textTransform:"capitalize" }}>{mb.role}</span>
                  )}
                </div>
              );
            })
        }
      </div>
      {isAdmin ? (
        <>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
            <button onClick={saveRoles} disabled={!dirtyRoles.length}
              style={{ background: dirtyRoles.length ? "#1a56db" : "#cbd5e1",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor: dirtyRoles.length ? "pointer" : "default" }}>
              Save role changes
            </button>
            {dirtyRoles.length > 0 && <span style={{ fontSize:12,color:"#b45309",fontWeight:600 }}>{dirtyRoles.length} unsaved</span>}
          </div>
          {pending.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:6 }}>Pending invites</div>
              {pending.map(pi => (
                <div key={pi.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",fontSize:13,borderBottom:"1px solid #f3f4f6" }}>
                  <span style={{ flex:1,color:"#374151" }}>{pi.email}</span>
                  <span style={{ fontSize:11,color:"#9ca3af" }}>{pi.role}{pi.program_id ? " · " + progLabel(pi.program_id) : ""} · pending</span>
                  <button onClick={()=>cancelOne(pi.id)} style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"#6b7280" }}>Cancel</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@school.org" type="email"
              style={{ border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:13 }} />
            <div style={{ display:"flex",gap:8 }}>
              <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{ border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#374151" }}>
                <option value="coach">Coach</option>
                <option value="admin">Admin (sees all)</option>
              </select>
              {inviteRole === "coach" && (
                <select value={inviteProgram} onChange={e=>setInviteProgram(e.target.value)} style={{ flex:1,border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#374151" }}>
                  <option value="">Which program?</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{SPORTS[p.sport]?.label || p.mascot || p.name}</option>)}
                </select>
              )}
              <button onClick={sendInvite} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap" }}>Send invite</button>
            </div>
          </div>
          {msg && <div style={{ fontSize:12,color:"#6b7280",marginTop:8 }}>{msg}</div>}
        </>
      ) : (
        <div style={{ fontSize:12,color:"#9ca3af" }}>Only your school's admin (AD) can invite or manage members.</div>
      )}
    </>
  );
}

// Assign school coaches to a specific program (admin-only); gated by tier coach limit.
function ProgramCoaches({ programId, orgId, tierLimits }) {
  const [coaches, setCoaches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUid, setAddUid] = useState("");
  const max = (tierLimits && tierLimits.maxCoachesPerProgram) || 1;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: pc } = await getProgramCoaches(programId);
    setCoaches(pc || []);
    const { data: mem } = await getMembers(orgId);
    setMembers(mem || []);
    setLoading(false);
  }, [programId, orgId]);
  useEffect(() => { load(); }, [load]);

  const nameOf = (uid) => {
    const m = members.find(x => x.user_id === uid);
    return m?.profiles?.full_name || m?.profiles?.email || "Coach";
  };
  const assigned = new Set(coaches.map(c => c.user_id));
  const addable = members.filter(m => !assigned.has(m.user_id));
  const atLimit = coaches.length >= max;

  const add = async () => {
    if (!addUid) return;
    if (atLimit) { alert(`Your plan allows ${max} coach${max===1?"":"es"} per program. Upgrade to Program Plus to add more.`); return; }
    const { error } = await addProgramCoach(programId, addUid);
    if (error) { alert("Couldn't add coach: " + (error.message || error)); return; }
    setAddUid(""); load();
  };
  const remove = async (uid) => {
    const { error } = await removeProgramCoach(programId, uid);
    if (error) { alert("Couldn't remove coach: " + (error.message || error)); return; }
    load();
  };

  if (loading) return null;
  return (
    <div style={{ borderTop:"1px solid #e5e7eb",padding:"10px 16px",background:"#fff" }}>
      <div style={{ fontSize:12,color:"#6b7280",fontWeight:600,marginBottom:6 }}>Coaches ({coaches.length}/{max===999?"∞":max})</div>
      {coaches.length === 0
        ? <div style={{ fontSize:12,color:"#9ca3af",marginBottom:6 }}>No coaches assigned yet.</div>
        : coaches.map(c => (
            <div key={c.id} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"3px 0" }}>
              <span style={{ flex:1,color:"#374151" }}>{nameOf(c.user_id)}</span>
              <button onClick={()=>remove(c.user_id)} style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"#6b7280" }}>Remove</button>
            </div>
          ))
      }
      <div style={{ display:"flex",gap:6,marginTop:6 }}>
        <select value={addUid} onChange={e=>setAddUid(e.target.value)} disabled={atLimit || addable.length===0}
          style={{ flex:1,border:"1px solid #d1d5db",borderRadius:6,padding:"5px 8px",fontSize:12,color:"#374151" }}>
          <option value="">{addable.length===0 ? "No more members to add" : "Add a coach…"}</option>
          {addable.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email || "Member"}</option>)}
        </select>
        <button onClick={add} disabled={!addUid || atLimit}
          style={{ background:(!addUid||atLimit)?"#cbd5e1":"#1a56db",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:(!addUid||atLimit)?"default":"pointer",whiteSpace:"nowrap" }}>Add</button>
      </div>
      {atLimit && <div style={{ fontSize:11,color:"#92400e",marginTop:6 }}>⭐ At your plan's coach limit — upgrade to Program Plus to add more coaches per program.</div>}
    </div>
  );
}

// Sports a NEW program can currently be created for; everything else shows "Coming soon".
const AVAILABLE_SPORTS = ["basketball_boys", "basketball_girls", "soccer"];

function AddSchoolModal({ onClose, onAdd, existingSports = [] }) {
  const openSports = AVAILABLE_SPORTS.filter(sp => !existingSports.includes(sp));
  const [form, setForm] = useState(() => ({ name:"", mascot:"", sport: openSports[0] || AVAILABLE_SPORTS[0], primaryColor:"#1a3a6b" }));
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:440 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Add program</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        {[["name","School name"],["mascot","Mascot / team name"]].map(([k,label])=>(
          <div key={k} style={{ marginBottom:12 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4 }}>{label}</label>
            <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
              style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14,boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4 }}>Primary sport</label>
          <select value={form.sport} onChange={e=>setForm(f=>({...f,sport:e.target.value}))}
            style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14 }}>
            {Object.entries(SPORTS)
              .filter(([k])=>k!=="basketball")
              .sort((a,b)=>{ const av=AVAILABLE_SPORTS.includes(a[0]), bv=AVAILABLE_SPORTS.includes(b[0]); return av===bv?0:av?-1:1; })
              .map(([k,v])=>{ const taken=existingSports.includes(k); const avail=AVAILABLE_SPORTS.includes(k); const ok=avail&&!taken; return <option key={k} value={k} disabled={!ok}>{v.icon} {v.label}{taken?" — already added":(avail?"":" — Coming soon")}</option>; })}
          </select>
        </div>
        <button onClick={()=>{ if(!form.name) return; if(existingSports.includes(form.sport)){ alert("This school already has a "+(SPORTS[form.sport]?.label||"that")+" program."); return; } onAdd({ id:`s${Date.now()}`, ...form, athletes:[], records:[] }); onClose(); }}
          style={{ width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14,cursor:"pointer" }}>
          Add program
        </button>
      </div>
    </div>
  );
}


// ── All-Time Leaderboard Tab ───────────────────────────────────────────────────
function PlayerSeasons({ programId, playerName, sport, columns = [], allStats = [], seasonOptions = [], careerStats = {}, canEdit = true }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!programId || !playerName) { setRows([]); return; }
    const { data } = await fetchPlayerSeasons(programId, playerName);
    setRows(data || []);
  }, [programId, playerName]);
  useEffect(() => { load(); }, [load]);

  // Edit grid shows EVERY stat for the sport (so any stat is enterable); the view
  // table shows only stats that actually have values (career or any season).
  const sportCols = (SPORTS[sport]?.groups || []).flatMap(g => (g.stats || []).map(s => s.name));
  const editCols = sportCols.length ? sportCols : (allStats.length ? allStats : (columns || []));
  const hasVal = (c) => Number(careerStats?.[c]) > 0 || (rows || []).some(r => Number(r.stats?.[c]) > 0);
  const extraKeys = [...new Set((rows || []).flatMap(r => Object.keys(r.stats || {})))].filter(c => !editCols.includes(c));
  const viewCols = [...editCols, ...extraKeys].filter(hasVal);
  const startEdit = () => { setDraft((rows || []).map(r => ({ ...r, stats: { ...(r.stats || {}) } }))); setErr(""); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(""); };
  const addRow = () => setDraft(d => [...d, { _key: `${d.length}-${(rows || []).length}`, season: "", grade: "", stats: {} }]);
  const setField = (i, key, val) => setDraft(d => d.map((r, j) => j === i ? { ...r, [key]: val } : r));
  const setStat = (i, stat, val) => setDraft(d => d.map((r, j) => j === i ? { ...r, stats: { ...r.stats, [stat]: val } } : r));
  const removeRow = async (i) => {
    const row = draft[i];
    if (row.id && !window.confirm(`Delete the ${row.season || "selected"} season?`)) return;
    if (row.id) { const { error } = await deletePlayerSeason(row.id); if (error) { setErr(error.message || String(error)); return; } }
    setDraft(d => d.filter((_, j) => j !== i));
  };
  const save = async () => {
    setBusy(true); setErr("");
    for (const row of draft) {
      if (!String(row.season || "").trim()) continue;
      const stats = {};
      for (const k in (row.stats || {})) { const v = row.stats[k]; if (v !== "" && v != null && !isNaN(Number(v))) stats[k] = Number(v); }
      const { error } = await savePlayerSeason({
        id: row.id, program_id: programId, player_name: playerName,
        season: String(row.season).trim(), grade: row.grade ? String(row.grade).trim() : null, stats,
      });
      if (error) { setBusy(false); setErr(`Couldn't save ${row.season}: ${error.message || error}`); return; }
    }
    setBusy(false); setEditing(false); load();
  };

  const th = { textAlign: "right", padding: "6px 8px", fontSize: 11, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "6px 8px", fontSize: 13, color: "#111", whiteSpace: "nowrap" };
  const inp = { width: 58, border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 6px", fontSize: 12, textAlign: "right" };
  const careerOf = (c) => careerStats[c] != null ? Number(careerStats[c]) : (rows || []).reduce((s, r) => s + (Number(r.stats?.[c]) || 0), 0);
  // Derived columns — shooting % (made÷att) and per-game (stat÷GP) — computed, shown only
  // when the program tracks the inputs so other sports stay unaffected.
  const pctCols = PCT_DEFS.filter((d) => careerOf(d.att) > 0 || (rows || []).some((r) => Number(r.stats?.[d.att]) > 0));
  const hasGP = careerOf("Games Played") > 0 || (rows || []).some((r) => Number(r.stats?.["Games Played"]) > 0);
  const pgCols = hasGP ? PERGAME_DEFS.filter((d) => careerOf(d.stat) > 0 || (rows || []).some((r) => Number(r.stats?.[d.stat]) > 0)) : [];
  // Interleave per-game right after its stat, and % right after its "Attempted" column.
  const orderedCols = [];
  const placedPct = new Set();
  for (const c of viewCols) {
    orderedCols.push({ col: c });
    const pg = pgCols.find((p) => p.stat === c);
    if (pg) orderedCols.push({ pg });
    const d = pctCols.find((p) => p.att === c);
    if (d) { orderedCols.push({ pct: d }); placedPct.add(d.name); }
  }
  for (const d of pctCols) if (!placedPct.has(d.name)) orderedCols.push({ pct: d });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#374151" }}>Season by season</h3>
        {canEdit && !editing && rows !== null && (
          <button onClick={startEdit} style={{ background: "#eff6ff", color: "#1a56db", border: "1px solid #bfdbfe", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{rows.length ? "Edit" : "+ Add seasons"}</button>
        )}
      </div>
      {err && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991b1b", marginBottom: 10 }}>{err}</div>}

      {rows === null ? (
        <div style={{ fontSize: 13, color: "#9ca3af", padding: "6px 0" }}>Loading seasons…</div>
      ) : !editing ? (
        rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af", padding: "6px 0" }}>No season-by-season stats yet.</div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #f0eeea", borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 }}>
              <thead><tr style={{ background: "#f9fafb" }}>
                <th style={{ ...th, textAlign: "left" }}>Season</th>
                {orderedCols.map(e => e.pg
                  ? <th key={"pg-" + e.pg.stat} style={th} title={e.pg.name}>{e.pg.short}</th>
                  : e.pct
                  ? <th key={"pct-" + e.pct.name} style={th} title={e.pct.name}>{e.pct.short}</th>
                  : <th key={e.col} style={th}>{e.col}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid #f6f4f0" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{r.season}</td>
                    {orderedCols.map(e => e.pg
                      ? <td key={"pg-" + e.pg.stat} style={td}>{(() => { const v = perGame(r.stats, e.pg.stat); return v != null ? v : "—"; })()}</td>
                      : e.pct
                      ? <td key={"pct-" + e.pct.name} style={td}>{(() => { const v = shootingPct(r.stats, e.pct.made, e.pct.att); return v != null ? v + "%" : "—"; })()}</td>
                      : <td key={e.col} style={td}>{r.stats?.[e.col] != null ? Number(r.stats[e.col]).toLocaleString() : "—"}</td>)}
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>Career</td>
                  {orderedCols.map(e => e.pg
                    ? <td key={"pg-" + e.pg.stat} style={{ ...td, fontWeight: 700 }}>{(() => { const v = perGame({ [e.pg.stat]: careerOf(e.pg.stat), "Games Played": careerOf("Games Played") }, e.pg.stat); return v != null ? v : "—"; })()}</td>
                    : e.pct
                    ? <td key={"pct-" + e.pct.name} style={{ ...td, fontWeight: 700 }}>{(() => { const v = shootingPct({ [e.pct.made]: careerOf(e.pct.made), [e.pct.att]: careerOf(e.pct.att) }, e.pct.made, e.pct.att); return v != null ? v + "%" : "—"; })()}</td>
                    : <td key={e.col} style={{ ...td, fontWeight: 700 }}>{careerOf(e.col).toLocaleString()}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div>
          <div style={{ overflowX: "auto", border: "1px solid #f0eeea", borderRadius: 10, marginBottom: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 }}>
              <thead><tr style={{ background: "#f9fafb" }}>
                <th style={{ ...th, textAlign: "left" }}>Season</th>
                {editCols.map(c => <th key={c} style={th}>{c}</th>)}
                <th style={th}></th>
              </tr></thead>
              <tbody>
                {draft.map((r, i) => (
                  <tr key={r.id || r._key} style={{ borderTop: "1px solid #f6f4f0" }}>
                    <td style={{ padding: "4px 8px" }}><input list="ps-seasons" value={r.season} onChange={e => setField(i, "season", e.target.value)} placeholder="2024-25" style={{ ...inp, width: 82, textAlign: "left" }} /></td>
                    {editCols.map(c => <td key={c} style={{ padding: "4px 8px" }}><input type="number" value={r.stats?.[c] ?? ""} onChange={e => setStat(i, c, e.target.value)} style={inp} /></td>)}
                    <td style={{ padding: "4px 8px", textAlign: "center" }}><button onClick={() => removeRow(i)} title="Remove season" style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontSize: 15, lineHeight: 1 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="ps-seasons">{seasonOptions.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={addRow} style={{ background: "#fff", color: "#374151", border: "1px dashed #cbd5e1", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add season</button>
            <div style={{ flex: 1 }} />
            <button onClick={cancel} disabled={busy} style={{ background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>Cancel</button>
            <button onClick={save} disabled={busy} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 7, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save seasons"}</button>
          </div>
          {editCols.length === 0 && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>No stat columns yet for this sport — add career stats first and they'll appear here.</div>}
        </div>
      )}
    </div>
  );
}

function PlayerProfileModal({ player, school, onClose, onUpdate, ALL_STATS, effectiveIsActive, rankFor }) {
  const isActive = effectiveIsActive(player);

  const handleToggleActive = () => {
    const nameLower = player.name.toLowerCase();
    const existing = school.athletes.find(a => a.name.toLowerCase() === nameLower);
    if (existing) {
      const updated = school.athletes.map(a =>
        a.name.toLowerCase() === nameLower ? { ...a, isActive: !isActive } : a
      );
      onUpdate({ ...school, athletes: updated });
    } else {
      // Not in athletes array yet — add them as alumni toggled active
      const newAthlete = { ...player, isActive: !isActive };
      onUpdate({ ...school, athletes: [...school.athletes, newAthlete] });
    }
    onClose();
  };

  const statsToShow = ALL_STATS.filter(s => (player.stats[s] || 0) > 0);
  const initials = player.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const years = (player.firstYear && player.lastYear)
    ? (player.firstYear === player.lastYear ? player.firstYear : `${player.firstYear} – ${player.lastYear}`)
    : player.gradYear ? `Class of ${player.gradYear}` : '';

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:school.primaryColor||"#1a3a6b",padding:"24px 24px 20px",borderRadius:"16px 16px 0 0",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:18,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",flexShrink:0}}>
              {initials}
            </div>
            <div>
              <div style={{color:"#fff",fontWeight:700,fontSize:20,display:"flex",alignItems:"center",gap:8}}>
                {player.name}
                {isActive && <span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>Active</span>}
                {player.schoolHallOfFame && <span title="School Hall of Fame" style={{fontSize:18}}>🏛️</span>}
                {player.stateHallOfFame  && <span title="State Hall of Fame"  style={{fontSize:18}}>⭐</span>}
              </div>
              <div style={{color:"rgba(255,255,255,0.75)",fontSize:13,marginTop:3,display:"flex",gap:12}}>
                {years && <span>🗓 {years}</span>}
                {player.gradYear && <span style={{marginLeft: years ? 14 : 0}}>Grad {player.gradYear}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:24}}>

          {/* Hall of fame badges */}
          {(player.schoolHallOfFame || player.stateHallOfFame) && (
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              {player.schoolHallOfFame && (
                <div style={{display:"flex",alignItems:"center",gap:6,background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,color:"#92400e"}}>
                  🏛️ School Hall of Fame
                </div>
              )}
              {player.stateHallOfFame && (
                <div style={{display:"flex",alignItems:"center",gap:6,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,color:"#166534"}}>
                  ⭐ State Hall of Fame
                </div>
              )}
            </div>
          )}

          {/* Stats grid with rankings */}
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:"#374151"}}>Career statistics & all-time rank</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
            {statsToShow.flatMap(stat => {
              // After each stat show its per-game avg; after each "…Attempted" its shooting %.
              const out = [{ stat }];
              const pg = PERGAME_DEFS.find(p => p.stat === stat);
              if (pg) out.push({ pgDef: pg });
              const d = PCT_DEFS.find(p => p.att === stat);
              if (d) out.push({ pctDef: d });
              return out;
            }).map(entry => {
              if (entry.pgDef) {
                const pg = entry.pgDef;
                const v = perGame(player.stats, pg.stat);
                if (v == null) return null;
                return (
                  <div key={pg.name} style={{background:"#f9fafb",borderRadius:10,padding:"10px 14px",border:"1px solid #f0eeea"}}>
                    <div style={{fontSize:11,color:"#9ca3af",fontWeight:600,marginBottom:3}}>{pg.name.toUpperCase()}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                      <div style={{fontSize:22,fontWeight:700,color:"#111"}}>{v}</div>
                      <div style={{fontSize:11,color:"#6b7280",textAlign:"right"}}>per game</div>
                    </div>
                  </div>
                );
              }
              if (entry.pctDef) {
                const d = entry.pctDef;
                const v = shootingPct(player.stats, d.made, d.att);
                if (v == null) return null;
                return (
                  <div key={d.name} style={{background:"#f9fafb",borderRadius:10,padding:"10px 14px",border:"1px solid #f0eeea"}}>
                    <div style={{fontSize:11,color:"#9ca3af",fontWeight:600,marginBottom:3}}>{d.name.toUpperCase()}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                      <div style={{fontSize:22,fontWeight:700,color:"#111"}}>{v}%</div>
                      <div style={{fontSize:11,color:"#6b7280",textAlign:"right"}}>{(player.stats[d.made]||0).toLocaleString()}/{(player.stats[d.att]||0).toLocaleString()}</div>
                    </div>
                  </div>
                );
              }
              const stat = entry.stat;
              const val = player.stats[stat] || 0;
              const rank = rankFor(player, stat);
              return (
                <div key={stat} style={{background:"#f9fafb",borderRadius:10,padding:"10px 14px",border:"1px solid #f0eeea"}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600,marginBottom:3}}>{stat.toUpperCase()}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                    <div style={{fontSize:22,fontWeight:700,color:"#111"}}>{val.toLocaleString()}</div>
                    <div style={{fontSize:11,color: rank===1?"#b45309":"#6b7280",fontWeight:rank<=3?700:400,textAlign:"right"}}>
                      {rank===1?"🥇 All-time leader":rank===2?"🥈 #2 all-time":rank===3?"🥉 #3 all-time":`#${rank} all-time`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            // Per-game averages need Games Played — nudge coaches who entered stats but no games.
            const hasGames = Number(player.stats?.["Games Played"]) > 0;
            const hasPerGameStat = PERGAME_DEFS.some(d => Number(player.stats?.[d.stat]) > 0);
            return (!hasGames && hasPerGameStat) ? (
              <div style={{ fontSize:12, color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px", marginBottom:20 }}>
                💡 Add <strong>Games Played</strong> to see per-game averages (PPG, APG, RPG, …).
              </div>
            ) : null;
          })()}

          <PlayerSeasons
            programId={school.id}
            playerName={player.name}
            sport={school.sport}
            columns={statsToShow}
            allStats={ALL_STATS}
            seasonOptions={(school.seasons || []).map(s => s.season).filter(Boolean)}
            careerStats={player.stats}
          />

          {/* Active toggle */}
          <div style={{borderTop:"1px solid #f0eeea",paddingTop:18,display:"flex",gap:10}}>
            <button onClick={handleToggleActive}
              style={{flex:1,padding:"11px 0",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,
                background: isActive ? "#fee2e2" : "#dbeafe",
                color: isActive ? "#991b1b" : "#1e40af"}}>
              {isActive ? "Mark as inactive" : "Mark as active"}
            </button>
            <button onClick={onClose}
              style={{padding:"11px 20px",borderRadius:9,border:"1px solid #e5e7eb",cursor:"pointer",fontWeight:600,fontSize:14,background:"#fff",color:"#374151"}}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk import: season-by-season stats from a spreadsheet ─────────────────────
// Workbook format: one SHEET per stat (Games, Points, Rebounds, …); each sheet is
// players-as-rows × seasons-as-columns with a trailing "Total Career" column.
// SheetJS is loaded from CDN on demand (no build dependency / bundle bloat).
const SEASON_STAT_MAP = {
  "Games": "Games Played", "Wins": "Wins", "Points": "Points", "Assists": "Assists",
  "Rebounds": "Total Rebounds", "O Rebounds": "Offensive Rebounds", "Def. Rebounds": "Defensive Rebounds",
  "Steals": "Steals", "Blocks": "Blocks", "FGM": "Field Goals Made", "FGA": "Field Goals Attempted",
  "3pFGM": "Three Pointers Made", "3pFGA": "Three Pointers Attempted", "FTM": "Free Throws Made", "FTA": "Free Throws Attempted",
};
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error("reader unavailable")));
    s.onerror = () => reject(new Error("Couldn't load the spreadsheet reader (network?)"));
    document.head.appendChild(s);
  });
}
function normSeason(h) {
  const m = String(h || "").match(/\d{4}-\d{4}/);
  return m ? m[0] : String(h || "").trim();
}
function parseSeasonsWorkbook(XLSX, buf) {
  const wb = XLSX.read(buf, { type: "array" });
  const byPS = {};
  for (const sheetName of wb.SheetNames) {
    const stat = SEASON_STAT_MAP[String(sheetName).trim()];
    if (!stat) continue; // skip unmapped sheets (e.g. "Seasons")
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false });
    if (!grid.length) continue;
    const header = grid[0] || [];
    const seasonCols = [];
    for (let c = 1; c < header.length; c++) {
      const h = String(header[c] || "").trim();
      if (!h || /total|career/i.test(h)) continue; // skip the career column
      seasonCols.push({ c, season: normSeason(h) });
    }
    for (let r = 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const player = String(row[0] || "").trim();
      if (!player) continue;
      for (const sc of seasonCols) {
        const v = row[sc.c];
        if (v === "" || v == null) continue;
        const num = Number(v);
        if (!isFinite(num) || num === 0) continue;
        const key = player + "|||" + sc.season;
        if (!byPS[key]) byPS[key] = { player_name: player, season: sc.season, stats: {} };
        byPS[key].stats[stat] = num;
      }
    }
  }
  return Object.values(byPS);
}
function seasonFromFilename(name) {
  const m = String(name || "").match(/(\d{4})\D+(\d{2,4})/);
  if (!m) return null;
  let b = m[2]; if (b.length === 2) b = m[1].slice(0, 2) + b;
  return `${m[1]}-${b}`;
}
// MaxPreps / sheet abbreviations → the app's stat names. Per-game averages, percentages,
// height, fouls, turnovers, and the 2-pt-only splits are dropped (the app tracks totals).
const SEASON_STAT_ALIASES = {
  "Games": "Games Played", "GP": "Games Played", "Wins": "Wins", "W": "Wins",
  "Points": "Points", "Pts": "Points", "PTS": "Points",
  "Assists": "Assists", "Asst": "Assists", "AST": "Assists",
  "Rebounds": "Total Rebounds", "Tot Reb": "Total Rebounds", "Reb": "Total Rebounds", "TRB": "Total Rebounds",
  "O Rebounds": "Offensive Rebounds", "Off Reb": "Offensive Rebounds", "ORB": "Offensive Rebounds",
  "Def. Rebounds": "Defensive Rebounds", "Def Reb": "Defensive Rebounds", "DRB": "Defensive Rebounds",
  "Steals": "Steals", "Stls": "Steals", "STL": "Steals",
  "Blocks": "Blocks", "Blk Shts": "Blocks", "BLK": "Blocks",
  "FGM": "Field Goals Made", "Field Goals Made": "Field Goals Made",
  "FGA": "Field Goals Attempted", "Field Goals Attempted": "Field Goals Attempted",
  "3pFGM": "Three Pointers Made", "3FGM": "Three Pointers Made",
  "3pFGA": "Three Pointers Attempted", "3FGA": "Three Pointers Attempted",
  "FTM": "Free Throws Made", "Free Throws Made": "Free Throws Made",
  "FTA": "Free Throws Attempted", "Free Throws Attempted": "Free Throws Attempted",
};
function remapSeasonStats(stats, valid) {
  const useFilter = valid && valid.size > 0; // never filter against an empty set (would drop everything)
  const out = {};
  for (const k in (stats || {})) {
    const mapped = SEASON_STAT_ALIASES[String(k).trim()] || String(k).trim();
    if (useFilter && !valid.has(mapped)) continue; // ONLY stats that exist in our structure — drop AI-invented ones
    out[mapped] = stats[k];
  }
  return out;
}
// Match the stat sheet's abbreviated names ("A. Terpstra") to the roster's full names
// ("Alex Terpstra") by last name + first initial; keep the fuller name as canonical.
function seasonNameKey(name) {
  const parts = String(name || "").toLowerCase().replace(/[.,]/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts.join(" ");
  return `${parts[parts.length - 1]}|${parts[0][0] || ""}`;
}
function fullerSeasonName(a, b) {
  const af = String(a).trim().split(/\s+/)[0].replace(/\./g, "");
  const bf = String(b).trim().split(/\s+/)[0].replace(/\./g, "");
  if (af.length > 1 && bf.length <= 1) return true;
  if (af.length <= 1 && bf.length > 1) return false;
  return String(a).length > String(b).length;
}
// Reconcile athletes pulled from multiple PDFs (a roster + a stat sheet) into one row per
// player. Jersey number is unique on a team, so it differentiates same-name players
// (siblings/cousins): numbered entries group by last name + number; un-numbered entries
// attach to a numbered group only when their last-name+initial is unambiguous, else stand alone.
function reconcileSeasonAthletes(athletes) {
  const norm = (n) => String(n || "").toLowerCase().replace(/[.,]/g, "").trim().split(/\s+/).filter(Boolean);
  const lastInit = (n) => { const p = norm(n); return p.length >= 2 ? `${p[p.length - 1]}|${p[0][0]}` : p.join(" "); };
  const groups = {};
  const numbered = {}; // `${last}|${init}` -> Set(group keys that carry a number)
  const add = (key, a) => {
    if (!groups[key]) groups[key] = { player_name: a.name, stats: { ...a.stats } };
    else {
      Object.assign(groups[key].stats, a.stats);
      if (fullerSeasonName(a.name, groups[key].player_name)) groups[key].player_name = a.name;
    }
  };
  for (const a of athletes) {
    if (a.number == null) continue;
    const p = norm(a.name);
    const key = `${p.length ? p[p.length - 1] : ""}|#${a.number}`;
    add(key, a);
    (numbered[lastInit(a.name)] = numbered[lastInit(a.name)] || new Set()).add(key);
  }
  for (const a of athletes) {
    if (a.number != null) continue;
    const cand = numbered[lastInit(a.name)];
    add(cand && cand.size === 1 ? [...cand][0] : lastInit(a.name), a);
  }
  return Object.values(groups).map((g) => ({ player_name: g.player_name, stats: g.stats }));
}
function mergeSeasonRows(all) {
  const byPS = {};
  for (const r of all) {
    const k = r.player_name + "|||" + r.season;
    if (!byPS[k]) byPS[k] = { player_name: r.player_name, season: r.season, stats: {} };
    Object.assign(byPS[k].stats, r.stats);
  }
  return Object.values(byPS);
}
function ImportSeasons({ school, roster = [] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (!school || !school.id) { setMsg("Open a saved program first."); return; }
    const xlsxFiles = files.filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    const pdfFiles = files.filter((f) => /\.pdf$/i.test(f.name));
    setBusy(true);
    try {
      // PDFs: each file is ONE season's roster → AI-extract, then replace just that season
      // (other seasons untouched). Season comes from the filename, else we ask.
      if (pdfFiles.length) {
        const seasonValid = new Set([
          ...(SPORTS[school.sport]?.groups || []).flatMap((g) => (g.stats || []).map((s) => s.name)),
          ...(roster || []).flatMap((p) => Object.keys(p.stats || {})), // the program's ACTUAL stat names
        ]);
        let shared = null;
        const rawBySeason = {}; // season -> [{ name, number, stats }]
        const errs = [];
        for (let i = 0; i < pdfFiles.length; i++) {
          const f = pdfFiles[i];
          let season = seasonFromFilename(f.name);
          if (!season) {
            if (!shared) shared = (window.prompt("What season are these PDF stats for? (e.g. 2011-2012)") || "").trim();
            season = shared;
          }
          if (!season) { errs.push(`${f.name}: no season given`); continue; }
          setMsg(`Reading ${i + 1} of ${pdfFiles.length}: ${f.name}…`);
          const base64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result.split(",")[1]);
            r.onerror = () => rej(new Error("read failed"));
            r.readAsDataURL(f);
          });
          const { data, error } = await extractPdfStats(base64);
          if (error) { errs.push(`${f.name}: ${error}`); continue; }
          const arr = (rawBySeason[season] = rawBySeason[season] || []);
          for (const a of (data.athletes || [])) {
            const name = String(a.name || "").trim();
            if (!name) continue;
            const number = (a.number != null && String(a.number).trim() !== "") ? String(a.number).trim() : null;
            arr.push({ name, number, stats: remapSeasonStats(a.stats || {}, seasonValid) });
          }
        }
        const seasons = Object.keys(rawBySeason);
        if (!seasons.length) { setBusy(false); setMsg("No season stats found in those PDFs." + (errs.length ? " " + errs[0] : "")); return; }
        // Reconcile each season: merge roster (full names) + stat sheet (abbreviated) into one
        // row per player, using jersey number to keep same-name players (siblings) separate.
        const bySeason = {};
        for (const s of seasons) {
          bySeason[s] = reconcileSeasonAthletes(rawBySeason[s]);
          // Wins are a TEAM stat — the team's win total belongs to every player on the
          // roster, not just whoever appeared in the most games. Use the largest Wins we
          // saw for the season (a full-season player = the team total), falling back to
          // the team's recorded win count for that season if the sheet had no per-player wins.
          const teamWins = Math.max(
            0,
            ...bySeason[s].map((p) => Number(p.stats?.Wins) || 0),
            Number(((school.seasons || []).find((x) => sameSeason(x.season, s)) || {}).wins) || 0,
          );
          if (teamWins > 0) for (const p of bySeason[s]) p.stats.Wins = teamWins;
        }
        const summary = seasons.map((s) => `${bySeason[s].length} players for ${s}`).join(", ");
        if (!window.confirm(`Import ${summary}?\n\nThis replaces those season(s) for ${school.name || "this program"} — every other season is left alone.`)) {
          setBusy(false); setMsg(""); return;
        }
        let total = 0;
        for (const s of seasons) {
          const { data, error } = await replacePlayerSeasonRowsForSeason(school.id, s, bySeason[s]);
          if (error) { setBusy(false); setMsg("Import failed: " + (error.message || error)); return; }
          total += (data && data.inserted) || 0;
        }
        setBusy(false);
        setMsg(`✓ Imported ${total} player-season rows${errs.length ? ` (${errs.length} file issue${errs.length > 1 ? "s" : ""})` : ""} — open a player to see them.`);
        return;
      }
      // Spreadsheet matrix (one workbook = the WHOLE history) → replace all season data.
      setMsg(`Reading ${xlsxFiles.length} file${xlsxFiles.length > 1 ? "s" : ""}…`);
      const XLSX = await loadSheetJS();
      let all = [];
      for (const f of xlsxFiles) {
        const buf = await f.arrayBuffer();
        all = all.concat(parseSeasonsWorkbook(XLSX, new Uint8Array(buf)));
      }
      const rows = mergeSeasonRows(all);
      if (!rows.length) { setBusy(false); setMsg("No season rows found in those files."); return; }
      const players = new Set(rows.map((r) => r.player_name)).size;
      const seasons = new Set(rows.map((r) => r.season)).size;
      if (!window.confirm(`Import ${rows.length} player-season rows (${players} players, ${seasons} seasons)?\n\nThis REPLACES all existing season-by-season stats for ${school.name || "this program"}.`)) {
        setBusy(false); setMsg(""); return;
      }
      setMsg("Importing…");
      const { data, error } = await replacePlayerSeasons(school.id, rows);
      setBusy(false);
      if (error) { setMsg("Import failed: " + (error.message || error)); return; }
      setMsg(`✓ Imported ${data.inserted} rows — open a player to see their seasons.`);
    } catch (err) {
      setBusy(false); setMsg("Import error: " + (err && err.message ? err.message : String(err)));
    }
  };
  const downloadTemplate = async () => {
    setBusy(true); setMsg("Building template…");
    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.utils.book_new();
      const seasonHeaders = [...new Set((school.seasons || []).map((s) => s.season).filter(Boolean))];
      const cols = seasonHeaders.length ? seasonHeaders : ["2023-2024", "2024-2025"];
      const names = [...new Set((roster || []).map((p) => p.name).filter(Boolean))].sort();
      for (const sheet of Object.keys(SEASON_STAT_MAP)) {
        const aoa = [["", ...cols, "Total Career"], ...names.map((n) => [n])];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheet);
      }
      XLSX.writeFile(wb, `${String(school.name || "program").replace(/[^a-z0-9]+/gi, "_")}_season_stats_template.xlsx`);
      setBusy(false); setMsg("✓ Template downloaded — fill in the numbers and re-upload.");
    } catch (err) { setBusy(false); setMsg("Template error: " + (err && err.message ? err.message : String(err))); }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={{ background: "#eff6ff", color: "#1a56db", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", whiteSpace: "nowrap", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Working…" : "📥 Import season stats (.xlsx or PDF)"}
        <input type="file" accept=".xlsx,.xls,.pdf" multiple onChange={onFiles} disabled={busy} style={{ display: "none" }} />
      </label>
      <button onClick={downloadTemplate} disabled={busy} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", whiteSpace: "nowrap" }}>⬇︎ Download template</button>
      {msg && <span style={{ fontSize: 12, color: msg.indexOf("✓") === 0 ? "#166534" : ((msg.indexOf("fail") >= 0 || msg.indexOf("error") >= 0) ? "#991b1b" : "#6b7280") }}>{msg}</span>}
    </div>
  );
}

function AllTimeTab({ roster, athletes = [], school, onUpdate }) {
  const ALL_STATS = allStatsFor(roster);

  const defaultStat = ALL_STATS.find(s => s === "Points") || ALL_STATS.find(s => s === "Rushing Yards") || ALL_STATS[0] || "Points";
  const [sortStat, setSortStat] = useState(defaultStat);
  const [filterActive, setFilterActive] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const PAGE_SIZE = 25;

  if (!roster.length) return (
    <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No all-time roster data available.</div>
  );

  const effectiveIsActive = makeEffectiveIsActive(athletes);
  const rankFor = makeRankFor(roster);

  const filtered = roster
    .filter(p => {
      const active = effectiveIsActive(p);
      if (filterActive==="current" && !active) return false;
      if (filterActive==="alumni" && active) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .filter(p => (p.stats[sortStat]||0) > 0)
    .sort((a,b) => (b.stats[sortStat]||0) - (a.stats[sortStat]||0));

  const maxVal = filtered[0]?.stats[sortStat] || 1;

  return (
    <div>
      {selectedPlayer && school && onUpdate && (
        <PlayerProfileModal
          player={selectedPlayer}
          school={school}
          onClose={()=>setSelectedPlayer(null)}
          onUpdate={(updated)=>{ onUpdate(updated); setSelectedPlayer(null); }}
          ALL_STATS={ALL_STATS}
          effectiveIsActive={effectiveIsActive}
          rankFor={rankFor}
        />
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#111"}}>All-time program history</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#6b7280"}}>
            {roster.length} players · {roster.filter(p=>effectiveIsActive(p)).length} currently active · records since 1977
          </p>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <select value={sortStat} onChange={e=>{setSortStat(e.target.value);setPage(0);}}
          style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,fontWeight:600,background:"#fff",color:"#111"}}>
          {ALL_STATS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{display:"flex",gap:0,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
          {[["all","All players"],["current","Active"],["alumni","Alumni"]].map(([val,label])=>(
            <button key={val} onClick={()=>{setFilterActive(val);setPage(0);}}
              style={{padding:"8px 14px",fontSize:13,border:"none",cursor:"pointer",
                fontWeight:filterActive===val?700:400,
                background:filterActive===val?"#1a56db":"#fff",
                color:filterActive===val?"#fff":"#6b7280"}}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Search player..."
          style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,flex:1,minWidth:160}} />
        <span style={{fontSize:13,color:"#9ca3af",whiteSpace:"nowrap"}}>{filtered.length} players</span>
      </div>
      {school && school.id && <div style={{ marginBottom:12 }}><ImportSeasons school={school} roster={roster} /></div>}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f9fafb"}}>
              <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb",width:36}}>#</th>
              <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>Player</th>
              <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>Years</th>
              <th style={{padding:"10px 16px",textAlign:"right",fontSize:11,fontWeight:700,color:"#1a56db",borderBottom:"1px solid #e5e7eb"}}>{sortStat}</th>
              <th style={{padding:"10px 16px",borderBottom:"1px solid #e5e7eb",width:"28%"}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((p,i)=>{
              const rank = page * PAGE_SIZE + i;
              const val = p.stats[sortStat]||0;
              const barPct = Math.round((val/maxVal)*100);
              const active = effectiveIsActive(p);
              return (
                <tr key={p.id}
                  onClick={()=>setSelectedPlayer(p)}
                  style={{borderBottom:"1px solid #f9f7f4",background:i%2===0?"#fff":"#fafaf8",cursor:"pointer",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafaf8"}>
                  <td style={{padding:"9px 16px",color:"#9ca3af",fontWeight:700,fontSize:12}}>{rank+1}</td>
                  <td style={{padding:"9px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontWeight:600,color:"#111"}}>{p.name}</span>
                      {active && <span style={{background:"#dbeafe",color:"#1e40af",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>Active</span>}
                      {p.schoolHallOfFame && <span title="School Hall of Fame" style={{fontSize:13}}>🏛️</span>}
                      {p.stateHallOfFame  && <span title="State Hall of Fame"  style={{fontSize:13}}>⭐</span>}
                    </div>
                  </td>
                  <td style={{padding:"9px 16px",color:"#9ca3af",fontSize:12,whiteSpace:"nowrap"}}>
                    {p.firstYear===p.lastYear ? p.firstYear : p.firstYear && p.lastYear ? p.firstYear+" – "+p.lastYear : p.gradYear ? "Class of "+p.gradYear : ""}
                  </td>
                  <td style={{padding:"9px 16px",textAlign:"right",fontWeight:700,color:"#111",fontSize:15}}>{val.toLocaleString()}</td>
                  <td style={{padding:"9px 16px 9px 0"}}>
                    <div style={{height:6,background:"#f0f0ee",borderRadius:3,overflow:"hidden"}}>
                      <div style={{width:barPct+"%",height:"100%",background:active?"#1a56db":"#94a3b8",borderRadius:3}} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > PAGE_SIZE && (
          <div style={{padding:"10px 16px",borderTop:"1px solid #f3f0ea",background:"#fafaf8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
              style={{padding:"6px 14px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:8,cursor:page===0?"not-allowed":"pointer",
                background:page===0?"#f9fafb":"#fff",color:page===0?"#d1d5db":"#374151",fontWeight:600}}>
              ← Prev
            </button>
            <span style={{fontSize:13,color:"#6b7280"}}>
              {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, filtered.length)} of {filtered.length} players
            </span>
            <button onClick={()=>setPage(p=>Math.min(Math.ceil(filtered.length/PAGE_SIZE)-1,p+1))} disabled={(page+1)*PAGE_SIZE>=filtered.length}
              style={{padding:"6px 14px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:8,cursor:(page+1)*PAGE_SIZE>=filtered.length?"not-allowed":"pointer",
                background:(page+1)*PAGE_SIZE>=filtered.length?"#f9fafb":"#fff",color:(page+1)*PAGE_SIZE>=filtered.length?"#d1d5db":"#374151",fontWeight:600}}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Season History Tab ────────────────────────────────────────────────────────
function SeasonsTab({ seasons = [], onSave }) {
  const [sortDir, setSortDir] = useState("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const blankForm = { season:"", wins:"", losses:"", leagueWins:"", leagueLosses:"", coach:"", notes:"" };
  const [form, setForm] = useState(blankForm);

  const buildSeason = (f) => {
    const w = f.wins !== "" ? Number(f.wins) : null;
    const l = f.losses !== "" ? Number(f.losses) : null;
    return {
      season: f.season,
      wins: w,
      losses: l,
      leagueWins:   f.leagueWins   !== "" ? Number(f.leagueWins)   : null,
      leagueLosses: f.leagueLosses !== "" ? Number(f.leagueLosses) : null,
      coach:  f.coach  || null,
      notes:  f.notes  || null,
      winPct: w != null && l != null && (w + l) > 0 ? Math.round(w / (w + l) * 1000) / 10 : null
    };
  };

  const handleAdd = () => {
    if (!form.season.trim()) return;
    const newSeason = buildSeason(form);
    onSave([newSeason, ...seasons]);
    setForm(blankForm);
    setShowAddForm(false);
  };

  const handleEdit = (s) => {
    setEditingId(s.season);
    setForm({
      season:       s.season || "",
      wins:         s.wins   ?? "",
      losses:       s.losses ?? "",
      leagueWins:   s.leagueWins   ?? "",
      leagueLosses: s.leagueLosses ?? "",
      coach:        s.coach  || "",
      notes:        s.notes  || "",
    });
  };

  const handleSaveEdit = () => {
    const updated = seasons.map(s =>
      s.season === editingId ? buildSeason(form) : s
    );
    onSave(updated);
    setEditingId(null);
    setForm(blankForm);
  };

  const handleDelete = (seasonLabel) => {
    onSave(seasons.filter(s => s.season !== seasonLabel));
  };

  const NOTE_SUGGESTIONS = [
    "League Champions", "State Champions", "State Runner-Up", "3rd Place Finish",
    "Final Four", "Elite Eight", "Sweet 16", "Round of 32", "First Round",
    "Playoff Appearance", "District Champions", "Regional Champions"
  ];

  const SeasonForm = ({ onSubmit, submitLabel }) => (
    <div style={{background:"#f9fafb",borderRadius:12,border:"1px solid #e5e7eb",padding:16,marginBottom:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>Season *</label>
          <input value={form.season} onChange={e=>setForm(f=>({...f,season:e.target.value}))}
            placeholder="e.g. 2025-2026"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>Wins</label>
          <input type="number" min="0" value={form.wins} onChange={e=>setForm(f=>({...f,wins:e.target.value}))}
            placeholder="0"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>Losses</label>
          <input type="number" min="0" value={form.losses} onChange={e=>setForm(f=>({...f,losses:e.target.value}))}
            placeholder="0"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>League wins</label>
          <input type="number" min="0" value={form.leagueWins} onChange={e=>setForm(f=>({...f,leagueWins:e.target.value}))}
            placeholder="0"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>League losses</label>
          <input type="number" min="0" value={form.leagueLosses} onChange={e=>setForm(f=>({...f,leagueLosses:e.target.value}))}
            placeholder="0"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>Head coach</label>
          <input value={form.coach} onChange={e=>setForm(f=>({...f,coach:e.target.value}))}
            placeholder="Coach name"
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:3}}>Notes / postseason</label>
        <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
          placeholder="e.g. League Champions / Final Four"
          style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 10px",fontSize:13,boxSizing:"border-box"}} />
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
          {NOTE_SUGGESTIONS.map(s => (
            <button key={s} onClick={()=>setForm(f=>({...f,notes:f.notes ? f.notes+"/"+s : s}))}
              style={{background:"#eff6ff",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:6,
                padding:"2px 8px",fontSize:11,cursor:"pointer",fontWeight:500}}>
              + {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>{setShowAddForm(false);setEditingId(null);setForm(blankForm);}}
          style={{padding:"7px 16px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",background:"#fff",color:"#374151"}}>
          Cancel
        </button>
        <button onClick={onSubmit}
          style={{padding:"7px 18px",fontSize:13,fontWeight:600,border:"none",borderRadius:8,cursor:"pointer",background:"#1a56db",color:"#fff"}}>
          {submitLabel}
        </button>
      </div>
    </div>
  );

  // Empty program: still allow adding the FIRST season/coach (uses SeasonForm defined above).
  if (!seasons.length) return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        {!showAddForm && (
          <button onClick={()=>{setShowAddForm(true);setForm(blankForm);}}
            style={{background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            + Add season
          </button>
        )}
      </div>
      {showAddForm && <SeasonForm onSubmit={handleAdd} submitLabel="Add season" />}
      {!showAddForm && (
        <div style={{padding:40,textAlign:"center",color:"#9ca3af",background:"#fff",borderRadius:12,border:"2px dashed #e5e7eb"}}>
          <div style={{fontSize:32,marginBottom:8}}>📅</div>
          <div style={{fontWeight:600,marginBottom:4,color:"#374151"}}>No seasons yet</div>
          <div style={{fontSize:13}}>Add a season — year, head coach, wins/losses — to start building season &amp; coach history.</div>
        </div>
      )}
    </div>
  );

  const sorted = [...seasons]
    .filter(s => s.wins !== null || s.coach)
    .sort((a, b) => sortDir === "desc"
      ? b.season.localeCompare(a.season)
      : a.season.localeCompare(b.season));

  // Coach summary — includes year range, overall + league record, titles, current status
  const coachMap = {};
  const mostRecentCoach = seasons
    .filter(s => s.coach)
    .sort((a, b) => b.season.localeCompare(a.season))[0]?.coach || null;

  seasons.forEach(s => {
    if (!s.coach) return;
    if (!coachMap[s.coach]) {
      coachMap[s.coach] = {
        wins: 0, losses: 0,
        leagueWins: 0, leagueLosses: 0,
        seasons: 0, titles: 0,
        firstYear: s.season, lastYear: s.season
      };
    }
    const rec = coachMap[s.coach];
    rec.seasons++;
    if (s.wins != null) rec.wins += s.wins;
    if (s.losses != null) rec.losses += s.losses;
    if (s.leagueWins != null) rec.leagueWins += s.leagueWins;
    if (s.leagueLosses != null) rec.leagueLosses += s.leagueLosses;
    if (s.notes && /champion/i.test(s.notes)) rec.titles++;
    if (s.season < rec.firstYear) rec.firstYear = s.season;
    if (s.season > rec.lastYear) rec.lastYear = s.season;
  });

  const seasonsWithRecord = seasons.filter(s => s.wins != null && s.losses != null);
  const totalWins = seasonsWithRecord.reduce((a, s) => a + (s.wins || 0), 0);
  const totalLosses = seasonsWithRecord.reduce((a, s) => a + (s.losses || 0), 0);
  const totalPct = totalWins + totalLosses > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1) : "—";
  const totalLeagueWins = seasons.reduce((a, s) => a + (s.leagueWins || 0), 0);
  const totalLeagueLosses = seasons.reduce((a, s) => a + (s.leagueLosses || 0), 0);
  const leaguePct = totalLeagueWins + totalLeagueLosses > 0 ? ((totalLeagueWins / (totalLeagueWins + totalLeagueLosses)) * 100).toFixed(1) : "—";
  // Helper reads both legacy notes strings AND boolean flags
  const sf = (s, boolKey, noteRx) => s[boolKey] || (s.notes && noteRx.test(s.notes));
  const champSeasons = seasons.filter(s => sf(s,'leagueChampion', /league champion|league champ/i)).length;
  const stateChamps   = seasons.filter(s => sf(s,'stateChampion',  /state champ|state champion/i)).length;
  const stateRunnerUp = seasons.filter(s => sf(s,'stateRunnerUp',  /runner.?up|runner up|2nd place/i)).length;
  const thirdPlace    = seasons.filter(s => sf(s,'thirdPlace',     /3rd place|3rd/i)).length;
  const finalFoursRaw = seasons.filter(s => sf(s,'finalFour',      /final.?4|final four/i)).length;
  const eliteEightsRaw= seasons.filter(s => sf(s,'eliteEight',     /elite.?8|elite eight/i)).length;
  const sweetSixRaw   = seasons.filter(s => sf(s,'sweetSixteen',   /sweet.?16|sweet sixteen/i)).length;
  const playoffRaw    = seasons.filter(s => sf(s,'firstRound',     /playoff|round of|first round|state first/i)).length;

  // Hierarchical — each tier includes all seasons from higher tiers
  // State champ, runner-up, 3rd place all count as Final Four
  // Final Four counts as Elite Eight, Elite Eight as Sweet 16, Sweet 16 as Playoff
  const finalFours  = finalFoursRaw + stateChamps + stateRunnerUp + thirdPlace;
  const eliteEights = eliteEightsRaw + finalFours;
  const sweetSixteen= sweetSixRaw + eliteEights;
  const playoffApps = playoffRaw + sweetSixteen;

  const notesBadge = (notes) => {
    if (!notes) return null;
    const isChamp = /league champion/i.test(notes);
    const isState = /state|final|runner|sweet|elite|round/i.test(notes);
    const bg = isChamp ? "#fef3c7" : isState ? "#eff6ff" : "#f3f4f6";
    const tc = isChamp ? "#92400e" : isState ? "#1e40af" : "#6b7280";
    const icon = isChamp ? "🏆 " : isState ? "🏀 " : "";
    return (
      <span style={{background:bg,color:tc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>
        {icon}{notes}
      </span>
    );
  };

  return (
    <div>
      {/* Add season button + form */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        {!showAddForm && !editingId && (
          <button onClick={()=>{setShowAddForm(true);setForm(blankForm);}}
            style={{background:"#1a56db",color:"#fff",border:"none",borderRadius:8,
              padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            + Add season
          </button>
        )}
      </div>
      {showAddForm && <SeasonForm onSubmit={handleAdd} submitLabel="Add season" />}

      {/* Summary stats — top row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:12}}>
        {[
          ["Program record",    `${totalWins}-${totalLosses}`,             "📊"],
          ["Win percentage",    `${totalPct}%`,                            "📈"],
          ["League record",     `${totalLeagueWins}-${totalLeagueLosses}`, "🏅"],
          ["League win %",      `${leaguePct}%`,                           "📉"],
          ["Seasons tracked",   seasonsWithRecord.length,                  "📅"],
          ["League titles",     champSeasons,                              "🏆"],
        ].map(([label, val, icon]) => (
          <div key={label} style={{background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #e8e4dd"}}>
            <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#111"}}>{val}</div>
            <div style={{fontSize:11,color:"#6b7280"}}>{label}</div>
          </div>
        ))}
      </div>
      {/* Summary stats — postseason row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
        {[
          ["Playoff appearances", playoffApps,   "🏟️", "#eff6ff", "#1e40af", "#bfdbfe"],
          ["Sweet Sixteens",      sweetSixteen,  "⭐", "#fdf4ff", "#7e22ce", "#e9d5ff"],
          ["Elite Eights",        eliteEights,   "🎖️", "#f5f3ff", "#5b21b6", "#ddd6fe"],
          ["Final Fours",         finalFours,    "🎯", "#f0fdf4", "#166534", "#86efac"],
          ["State runner-up",     stateRunnerUp, "🥈", "#f8fafc", "#374151", "#e2e8f0"],
          ["State championships", stateChamps,   "🏅", "#fef3c7", "#92400e", "#fde68a"],
        ].map(([label, val, icon, bg, tc, border]) => (
          <div key={label} style={{background:bg,borderRadius:12,padding:"14px 16px",border:`1px solid ${border}`}}>
            <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:700,color:tc}}>{val}</div>
            <div style={{fontSize:11,color:tc,opacity:0.8}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Coach records */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",marginBottom:20,overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:"1px solid #f3f0ea",fontWeight:700,fontSize:14,color:"#111"}}>
          Head coaches
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:0}}>
          {Object.entries(coachMap)
            .sort((a,b) => b[1].wins - a[1].wins)
            .map(([coach, rec], i) => {
              const isCurrent = coach === mostRecentCoach;
              const pct = rec.wins + rec.losses > 0 ? ((rec.wins/(rec.wins+rec.losses))*100).toFixed(1) : "—";
              const lPct = rec.leagueWins + rec.leagueLosses > 0 ? ((rec.leagueWins/(rec.leagueWins+rec.leagueLosses))*100).toFixed(1) : "—";
              const yearRange = rec.firstYear === rec.lastYear ? rec.firstYear : `${rec.firstYear} – ${rec.lastYear}`;
              return (
                <div key={coach} style={{
                  padding:"16px 20px",
                  borderBottom:"1px solid #f3f0ea",
                  background: isCurrent ? "#eff6ff" : "transparent",
                  borderLeft: isCurrent ? "4px solid #1a56db" : "4px solid transparent",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#111"}}>{coach}</div>
                    {isCurrent && (
                      <span style={{background:"#1a56db",color:"#fff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>
                        Current
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{yearRange} · {rec.seasons} season{rec.seasons!==1?"s":""}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{background:isCurrent?"#dbeafe":"#f9fafb",borderRadius:8,padding:"8px 12px"}}>
                      <div style={{fontSize:10,color:"#9ca3af",marginBottom:2}}>Overall</div>
                      <div style={{fontWeight:700,fontSize:16,color:"#111"}}>{rec.wins}-{rec.losses}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{pct}%</div>
                    </div>
                    <div style={{background:isCurrent?"#dbeafe":"#f9fafb",borderRadius:8,padding:"8px 12px"}}>
                      <div style={{fontSize:10,color:"#9ca3af",marginBottom:2}}>League</div>
                      <div style={{fontWeight:700,fontSize:16,color:"#111"}}>{rec.leagueWins}-{rec.leagueLosses}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{lPct}%</div>
                    </div>
                  </div>
                  {rec.titles > 0 && (
                    <div style={{fontSize:11,color:"#92400e",marginTop:8,display:"flex",alignItems:"center",gap:4}}>
                      <span>🏆</span>
                      <span>{rec.titles} league title{rec.titles!==1?"s":""}</span>
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      </div>

      {/* Season-by-season table */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:"1px solid #f3f0ea",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:14,color:"#111"}}>Season by season</span>
          <button onClick={() => setSortDir(d => d==="desc"?"asc":"desc")}
            style={{background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",color:"#374151"}}>
            {sortDir === "desc" ? "Oldest first ↑" : "Newest first ↓"}
          </button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f9fafb"}}>
              {["Season","Coach","Record","League","Win %","Postseason / Notes",""].map(h => (
                <th key={h} style={{padding:"9px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const pct = s.winPct != null ? `${s.winPct}%` : "—";
              const record = s.wins != null ? `${s.wins}-${s.losses ?? "?"}` : "—";
              const leagueRecord = s.leagueWins != null ? `${s.leagueWins}-${s.leagueLosses ?? "?"}` : "—";
              const isChamp = s.leagueChampion || (s.notes && /league champion/i.test(s.notes));
              const isEditing = editingId === s.season;

              if (isEditing) return (
                <tr key={s.season} style={{borderBottom:"1px solid #e5e7eb",background:"#fffbeb"}}>
                  <td colSpan={7} style={{padding:"12px 16px"}}>
                    <SeasonForm onSubmit={handleSaveEdit} submitLabel="Save changes" />
                  </td>
                </tr>
              );

              return (
                <tr key={s.season} style={{borderBottom:"1px solid #f9f7f4", background: isChamp ? "#fffbeb" : i%2===0?"#fff":"#fafaf8"}}>
                  <td style={{padding:"9px 16px",fontWeight:700,color:"#111"}}>{s.season}</td>
                  <td style={{padding:"9px 16px",color:"#374151"}}>{s.coach || "—"}</td>
                  <td style={{padding:"9px 16px",fontWeight:600,color: s.wins && s.wins > (s.losses||0) ? "#166534":"#991b1b"}}>{record}</td>
                  <td style={{padding:"9px 16px",color:"#6b7280"}}>{leagueRecord}</td>
                  <td style={{padding:"9px 16px",color:"#374151"}}>{pct}</td>
                  <td style={{padding:"9px 16px"}}>{notesBadge(s.notes)}</td>
                  <td style={{padding:"9px 16px",whiteSpace:"nowrap"}}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>handleEdit(s)}
                        style={{background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",color:"#374151"}}>
                        Edit
                      </button>
                      <button onClick={()=>handleDelete(s.season)}
                        style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",color:"#991b1b"}}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"10px 20px",fontSize:12,color:"#9ca3af",borderTop:"1px solid #f3f0ea",background:"#fafaf8"}}>
          Overall: {totalWins}-{totalLosses} ({totalPct}%) · League: {totalLeagueWins}-{totalLeagueLosses} ({leaguePct}%)
        </div>
      </div>
    </div>
  );
}


// ── Hall of Fame Engine ───────────────────────────────────────────────────────

// Stat weights: how much each stat contributes to dominance score
const HOF_STAT_WEIGHTS = {
  // Basketball / Boys Basketball
  "Points":                   10,
  "Assists":                   7,
  "Total Rebounds":            6,
  "Steals":                    6,
  "Blocks":                    5,
  "Wins":                      8,
  "Games Played":              3,
  "Field Goals Made":          4,
  "Field Goals Attempted":     2,
  "Three Pointers Made":       4,
  "Three Pointers Attempted":  2,
  "Free Throws Made":          3,
  "Free Throws Attempted":     2,
  "Offensive Rebounds":        4,
  "Defensive Rebounds":        4,
  // Football
  "Passing Yards":            10,
  "Passing TDs":               9,
  "Rushing Yards":            10,
  "Rushing TDs":               9,
  "Receiving Yards":          10,
  "Receiving TDs":             9,
  "Total Tackles":             8,
  "Sacks":                     8,
  "Interceptions":             7,
  "Total TDs":                 9,
  // Soccer
  "Goals":                    10,
  "Saves":                     8,
  "Clean Sheets":              7,
  // Generic
  "Coach Wins":                0,  // excluded from player scoring
};

// Postseason / team success weight per season
function getSeasonSuccessScore(notes) {
  if (!notes) return 0;
  const n = notes.toLowerCase();
  let score = 0;
  if (/state champ/.test(n))              score += 30;
  else if (/state runner.?up/.test(n))    score += 22;
  else if (/final.?four|final 4/.test(n)) score += 16;
  else if (/elite.?8/.test(n))            score += 12;
  else if (/sweet.?16/.test(n))           score +=  8;
  else if (/round of|first round|playoff/.test(n)) score += 4;
  if (/league champ/.test(n))             score += 10;
  return score;
}

// Get the seasons a player was active (from firstYear/lastYear or gradYear)
function getPlayerSeasons(player) {
  if (player.firstYear && player.lastYear) {
    // e.g. "2009-2010" → "2010", "2012-2013" → "2013"
    const startYr = parseInt(player.firstYear.split('-')[1]);
    const endYr   = parseInt(player.lastYear.split('-')[1]);
    const yrs = [];
    for (let y = startYr; y <= endYr; y++) yrs.push(y);
    return yrs;
  }
  if (player.gradYear) {
    // Assume 4-year career ending at gradYear
    return [player.gradYear - 3, player.gradYear - 2, player.gradYear - 1, player.gradYear];
  }
  return [];
}

// Match a school season record to a player's active years
function playerSeasonOverlap(player, season) {
  const playerYrs = getPlayerSeasons(player);
  if (!playerYrs.length) return false;
  // season string like "2012-2013" → end year = 2013
  const endYr = parseInt(String(season.season || '').split('-')[1]);
  return playerYrs.includes(endYr);
}

// Core HOF score for one player in one program (0–100 raw)
function calcProgramHofScore(player, school) {
  if (!player || !school) return 0;
  const roster = school.allTimeRoster || [];
  if (!roster.length) return 0;

  const stats = player.stats || {};
  let statScore = 0;
  let totalWeight = 0;

  // For each stat the player has, compute rank-based contribution
  Object.entries(stats).forEach(([stat, val]) => {
    const weight = HOF_STAT_WEIGHTS[stat];
    if (!weight || !val) return;
    totalWeight += weight;

    // Rank among all roster players with this stat
    const sorted = roster
      .filter(p => (p.stats[stat] || 0) > 0)
      .sort((a, b) => (b.stats[stat] || 0) - (a.stats[stat] || 0));
    const rank = sorted.findIndex(p => p.id === player.id) + 1;
    const total = sorted.length;
    if (!rank || !total) return;

    // Score: #1 = 100%, #2 = 85%, #3 = 70%, top 10% = 50%, top 25% = 30%, else 10%
    let rankPct;
    if      (rank === 1)              rankPct = 1.00;
    else if (rank === 2)              rankPct = 0.85;
    else if (rank === 3)              rankPct = 0.70;
    else if (rank / total <= 0.10)    rankPct = 0.50;
    else if (rank / total <= 0.25)    rankPct = 0.35;
    else if (rank / total <= 0.50)    rankPct = 0.20;
    else                              rankPct = 0.05;

    statScore += weight * rankPct;
  });

  // Normalize stat score to 0–70 (leaves room for team success bonus)
  const statNorm = totalWeight > 0 ? (statScore / totalWeight) * 70 : 0;

  // Team success score: sum success of seasons player was active
  const seasons = school.seasons || [];
  let teamScore = 0;
  seasons.forEach(s => {
    if (playerSeasonOverlap(player, s)) {
      teamScore += getSeasonSuccessScore(s.notes);
    }
  });
  // Cap team score contribution at 30 points (0–30 range)
  const teamNorm = Math.min(teamScore / 3, 30);

  // Record-holder bonus: +5 per career record held, +3 per single-season record
  const records = school.records || [];
  const playerNameLower = (player.name || "").toLowerCase().trim();
  let recordBonus = 0;
  records.forEach(rec => {
    const holderLower = (rec.holderName || "").toLowerCase().trim();
    if (!holderLower || holderLower === "multiple players") return;
    if (holderLower === playerNameLower) {
      recordBonus += (rec.variant || "").toLowerCase().includes("career") ? 5 : 3;
    }
  });
  // Cap record bonus at 20 points
  const recordNorm = Math.min(recordBonus, 20);

  const raw = statNorm + teamNorm + recordNorm;
  return Math.min(Math.round(raw), 100);
}

// Cross-sport compound score for a player name across all schools
function calcCrossSportScore(playerName, allSchools) {
  const norm = (n) => String(n || "").toLowerCase().replace(/\s+/g, " ").trim();
  const nameLower = norm(playerName);
  const programScores = [];

  allSchools.forEach(school => {
    const roster = school.allTimeRoster || [];
    const match = roster.find(p => norm(p.name) === nameLower);
    if (match) {
      const score = calcProgramHofScore(match, school);
      if (score > 0) programScores.push({ school, player: match, score });
    }
  });

  if (programScores.length === 0) return null;
  if (programScores.length === 1) return { ...programScores[0], crossSport: false, finalScore: programScores[0].score };

  // Multi-sport: compound bonus
  // Base = highest single-sport score, then add diminishing returns for each additional sport
  programScores.sort((a, b) => b.score - a.score);
  let finalScore = programScores[0].score;
  for (let i = 1; i < programScores.length; i++) {
    finalScore += programScores[i].score * (0.3 / i);
  }
  finalScore = Math.min(Math.round(finalScore), 100);

  return { ...programScores[0], crossSport: true, allScores: programScores, finalScore };
}

// Score tier label
function hofTier(score) {
  if (score >= 90) return { label: "Lock",          color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" };
  if (score >= 75) return { label: "Strong",        color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" };
  if (score >= 60) return { label: "Contender",     color: "#065f46", bg: "#f0fdf4", border: "#6ee7b7" };
  if (score >= 45) return { label: "Candidate",     color: "#92400e", bg: "#fffbeb", border: "#fcd34d" };
  if (score >= 30) return { label: "Honorable",     color: "#374151", bg: "#f9fafb", border: "#d1d5db" };
  return                  { label: "Emerging",      color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
}


// ── Coach HOF Engine ──────────────────────────────────────────────────────────

// Wins/record a coach earned at a PREVIOUS school, folded into their RaftersIQ
// profile here ("for now" — there's no per-coach DB field yet). Matched by exact name.
const COACH_PRIOR_STATS = {
  "Steve Schimpeler": { wins:308, losses:145, seasons:19, leagueChamps:9, eliteEights:3, finalFours:1 },
};

function buildCoachStats(seasons) {
  const coaches = {};
  (seasons || []).forEach(s => {
    const name = (s.coach || s["coach"] || "").trim();
    if (!name) return;
    if (!coaches[name]) {
      coaches[name] = { name, wins:0, losses:0, leagueWins:0, leagueLosses:0, seasons:0,
        stateChamps:0, stateRunnerUp:0, finalFours:0, eliteEights:0, sweetSixteens:0,
        playoffs:0, leagueChamps:0 };
    }
    const co = coaches[name];
    co.seasons    += 1;
    co.wins       += (s.wins || s["wins"] || 0);
    co.losses     += (s.losses || s["losses"] || 0);
    co.leagueWins += (s.leagueWins || s["leagueWins"] || 0);
    co.leagueLosses += (s.leagueLosses || s["leagueLosses"] || 0);
    const notes = (s.notes || s["notes"] || "").toLowerCase();
    if (/state champ/.test(notes))                       co.stateChamps    += 1;
    if (/runner.?up|runner-up/.test(notes))              co.stateRunnerUp  += 1;
    if (/final.?four|final 4/.test(notes))               co.finalFours     += 1;
    if (/elite.?8/.test(notes))                          co.eliteEights    += 1;
    if (/sweet.?16/.test(notes))                         co.sweetSixteens  += 1;
    if (/round of|first round|playoff|sweet|elite|final four|state/.test(notes)) co.playoffs += 1;
    if (/league champ/.test(notes))                      co.leagueChamps   += 1;
  });
  // Fold in any wins/record a coach brought from a previous school.
  Object.entries(COACH_PRIOR_STATS).forEach(([name, prior]) => {
    if (!coaches[name]) {
      coaches[name] = { name, wins:0, losses:0, leagueWins:0, leagueLosses:0, seasons:0,
        stateChamps:0, stateRunnerUp:0, finalFours:0, eliteEights:0, sweetSixteens:0,
        playoffs:0, leagueChamps:0 };
    }
    const co = coaches[name];
    Object.keys(prior).forEach(k => { if (typeof co[k] === "number") co[k] += prior[k]; });
  });
  return Object.values(coaches);
}

function calcCoachHofScore(coach, allCoachesInProgram) {
  const total = allCoachesInProgram.length;
  if (!total) return 0;

  // Win total rank (0–25 pts)
  const winRank = [...allCoachesInProgram].sort((a,b)=>b.wins-a.wins).findIndex(c=>c.name===coach.name)+1;
  const winScore = winRank===1?25:winRank===2?20:winRank===3?15:(winRank/total)<=0.25?10:5;

  // Win % (min 20 games) (0–15 pts)
  const games = coach.wins + coach.losses;
  const pct = games >= 20 ? coach.wins / games : 0;
  const pctScore = pct>=0.75?15:pct>=0.65?12:pct>=0.55?8:pct>=0.45?4:0;

  // Seasons coached (longevity) (0–10 pts)
  const seasRank = [...allCoachesInProgram].sort((a,b)=>b.seasons-a.seasons).findIndex(c=>c.name===coach.name)+1;
  const seasScore = seasRank===1?10:seasRank===2?8:seasRank===3?6:(coach.seasons>=5?4:2);

  // Postseason success (0–35 pts)
  const postScore = Math.min(
    coach.stateChamps   * 10 +
    coach.stateRunnerUp *  6 +
    coach.finalFours    *  5 +
    coach.eliteEights   *  3 +
    coach.sweetSixteens *  2 +
    coach.leagueChamps  *  2,
    35
  );

  // League titles rank (0–15 pts)
  const lgRank = [...allCoachesInProgram].sort((a,b)=>b.leagueChamps-a.leagueChamps).findIndex(c=>c.name===coach.name)+1;
  const lgScore = lgRank===1&&coach.leagueChamps>0?15:lgRank===2&&coach.leagueChamps>0?10:coach.leagueChamps>0?5:0;

  return Math.min(Math.round(winScore + pctScore + seasScore + postScore + lgScore), 100);
}

function coachHofTier(score) {
  if (score >= 90) return { label:"Legend",     color:"#7c3aed", bg:"#f5f3ff", border:"#c4b5fd" };
  if (score >= 75) return { label:"Elite",      color:"#1d4ed8", bg:"#eff6ff", border:"#93c5fd" };
  if (score >= 60) return { label:"Strong",     color:"#065f46", bg:"#f0fdf4", border:"#6ee7b7" };
  if (score >= 45) return { label:"Contender",  color:"#92400e", bg:"#fffbeb", border:"#fcd34d" };
  if (score >= 30) return { label:"Honorable",  color:"#374151", bg:"#f9fafb", border:"#d1d5db" };
  return                  { label:"Developing", color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb" };
}

function CoachHofSection({ school, onUpdate }) {
  const [selectedCoach, setSelectedCoach] = useState(null);
  const seasons = school.seasons || [];
  const coaches = useMemo(() => buildCoachStats(seasons), [school.id, seasons.length]); // eslint-disable-line
  const confirmedHof = school.coachHof || {};

  if (!coaches.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"#9ca3af", fontSize:13 }}>
      No season data available — add seasons to generate coach ratings.
    </div>
  );

  const scored = coaches
    .map(coach => ({ ...coach, score: calcCoachHofScore(coach, coaches), confirmed: !!confirmedHof[coach.name] }))
    .sort((a, b) => b.score - a.score);

  const toggleCoachHof = (coachName) => {
    const updated = { ...confirmedHof, [coachName]: !confirmedHof[coachName] };
    if (!updated[coachName]) delete updated[coachName];
    onUpdate({ ...school, coachHof: updated });
  };

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, color:"#374151", marginBottom:12, paddingTop:8, borderTop:"2px solid #f0eeea" }}>
        🎓 Coaching staff rankings
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {scored.map((coach, i) => {
          const tier = coachHofTier(coach.score);
          const winPct = coach.wins + coach.losses > 0
            ? Math.round(coach.wins/(coach.wins+coach.losses)*100) : 0;
          return (
            <div key={coach.name}
              style={{ background:"#fff", borderRadius:10, border:`1px solid ${coach.confirmed?"#c4b5fd":"#e8e4dd"}`,
                padding:"12px 16px", cursor:"pointer",
                boxShadow: coach.confirmed?"0 0 0 2px #7c3aed22":"none" }}
              onClick={() => setSelectedCoach(coach)}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:32, textAlign:"center", fontSize:13, fontWeight:700, color:"#9ca3af", flexShrink:0 }}>{i+1}</div>
                {/* Score ring */}
                <div style={{ width:48, height:48, borderRadius:"50%", background:tier.bg,
                  border:`2px solid ${tier.border}`, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:tier.color, lineHeight:1 }}>{coach.score}</div>
                  <div style={{ fontSize:7, fontWeight:700, color:tier.color, textTransform:"uppercase" }}>{tier.label}</div>
                </div>
                {/* Name + stats */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:"#111" }}>{coach.name}</span>
                    {coach.confirmed && <span style={{ fontSize:11 }}>🏛️</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:1, display:"flex", gap:10, flexWrap:"wrap" }}>
                    <span>{coach.seasons} seasons</span>
                    <span>{coach.wins}W–{coach.losses}L ({winPct}%)</span>
                    {coach.stateChamps > 0 && <span style={{ color:"#b45309", fontWeight:600 }}>🏆 {coach.stateChamps} state</span>}
                    {coach.leagueChamps > 0 && <span style={{ color:"#1d4ed8", fontWeight:600 }}>🎖 {coach.leagueChamps} league</span>}
                  </div>
                </div>
                {/* Bar */}
                <div style={{ width:80, flexShrink:0 }}>
                  <div style={{ height:5, background:"#f0f0ee", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${coach.score}%`, height:"100%", background:tier.color, borderRadius:3 }} />
                  </div>
                </div>
                {/* Flag button */}
                <button onClick={e=>{ e.stopPropagation(); toggleCoachHof(coach.name); }}
                  style={{ background: coach.confirmed?"#7c3aed":"#f3f4f6",
                    color: coach.confirmed?"#fff":"#6b7280",
                    border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                  🏛️ HOF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coach detail modal */}
      {selectedCoach && (
        <CoachHofModal
          coach={selectedCoach}
          school={school}
          allCoaches={scored}
          confirmed={!!confirmedHof[selectedCoach.name]}
          onClose={() => setSelectedCoach(null)}
          onToggle={() => { toggleCoachHof(selectedCoach.name); setSelectedCoach(null); }}
        />
      )}
    </div>
  );
}

function CoachHofModal({ coach, school, allCoaches, confirmed, onClose, onToggle }) {
  const tier = coachHofTier(coach.score);
  const winPct = coach.wins+coach.losses>0 ? Math.round(coach.wins/(coach.wins+coach.losses)*100) : 0;
  const seasons = (school.seasons||[]).filter(s=>(s.coach||s["coach"]||"").trim()===coach.name);
  const notableSeasons = seasons.filter(s=>getSeasonSuccessScore(s.notes||s["notes"]||"")>0)
    .sort((a,b)=>getSeasonSuccessScore(b.notes||b["notes"]||"")-getSeasonSuccessScore(a.notes||a["notes"]||""));

  const statRows = [
    ["Total wins",      coach.wins,         [...allCoaches].sort((a,b)=>b.wins-a.wins)],
    ["Win %",           winPct+"%",         [...allCoaches].sort((a,b)=>(b.wins/(b.wins+b.losses||1))-(a.wins/(a.wins+a.losses||1)))],
    ["Seasons coached", coach.seasons,      [...allCoaches].sort((a,b)=>b.seasons-a.seasons)],
    ["State titles",    coach.stateChamps,  [...allCoaches].sort((a,b)=>b.stateChamps-a.stateChamps)],
    ["League titles",   coach.leagueChamps, [...allCoaches].sort((a,b)=>b.leagueChamps-a.leagueChamps)],
    ["Final Fours",     coach.finalFours,   [...allCoaches].sort((a,b)=>b.finalFours-a.finalFours)],
    ["Postseason apps", coach.playoffs,     [...allCoaches].sort((a,b)=>b.playoffs-a.playoffs)],
  ];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:20 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
        {/* Header */}
        <div style={{ background:confirmed?"#7c3aed":school.primaryColor||"#1a3a6b",padding:"22px 24px 18px",borderRadius:"16px 16px 0 0",position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <div style={{ fontSize:18,fontWeight:800,color:"#fff",lineHeight:1 }}>{coach.score}</div>
              <div style={{ fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase" }}>{tier.label}</div>
            </div>
            <div>
              <div style={{ color:"#fff",fontWeight:700,fontSize:18 }}>
                {coach.name}{confirmed?" 🏛️":""}
              </div>
              <div style={{ color:"rgba(255,255,255,0.75)",fontSize:12,marginTop:2 }}>
                {coach.seasons} seasons · {coach.wins}W–{coach.losses}L ({winPct}% win rate)
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:22 }}>
          {/* Stat breakdown */}
          <div style={{ fontSize:13,fontWeight:700,color:"#374151",marginBottom:10 }}>Program rankings</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:18 }}>
            {statRows.map(([label, val, sorted]) => {
              const rank = sorted.findIndex(co=>co.name===coach.name)+1;
              const hasVal = typeof val==="number" ? val>0 : true;
              if (!hasVal && rank>1) return null;
              return (
                <div key={label} style={{ background:"#f9fafb",borderRadius:8,padding:"9px 12px",border:rank<=3?"1px solid #fcd34d":"1px solid #f0eeea" }}>
                  <div style={{ fontSize:10,color:"#9ca3af",fontWeight:600 }}>{label.toUpperCase()}</div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:2 }}>
                    <div style={{ fontSize:18,fontWeight:700,color:"#111" }}>{val}</div>
                    <div style={{ fontSize:11,fontWeight:700,color:rank===1?"#b45309":rank<=3?"#1d4ed8":"#6b7280" }}>
                      {rank===1?"🥇 #1":rank===2?"🥈 #2":rank===3?"🥉 #3":`#${rank}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notable seasons */}
          {notableSeasons.length>0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#374151",marginBottom:8 }}>Notable seasons</div>
              <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                {notableSeasons.slice(0,6).map(s => {
                  const notes = s.notes||s["notes"]||"";
                  return (
                    <div key={s.season||s["season"]} style={{ display:"flex",justifyContent:"space-between",background:"#f9fafb",borderRadius:8,padding:"7px 12px",fontSize:13 }}>
                      <span style={{ fontWeight:600,color:"#111" }}>{s.season||s["season"]}</span>
                      <span style={{ color:"#6b7280" }}>{notes}</span>
                      <span style={{ fontWeight:700,color:"#92400e" }}>+{getSeasonSuccessScore(notes)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle button */}
          <div style={{ borderTop:"1px solid #f0eeea",paddingTop:14,display:"flex",gap:8 }}>
            <button onClick={onToggle}
              style={{ flex:1,padding:"10px 0",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
                background:confirmed?"#7c3aed":"#f5f3ff",color:confirmed?"#fff":"#7c3aed" }}>
              {confirmed?"🏛️ Remove from HOF":"🏛️ Induct into HOF"}
            </button>
            <button onClick={onClose}
              style={{ padding:"10px 20px",borderRadius:9,border:"1px solid #e5e7eb",cursor:"pointer",fontWeight:600,fontSize:13,background:"#fff",color:"#374151" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HallOfFameTab({ school, allSchools, onUpdate }) {
  const [view, setView] = useState("athletes"); // athletes | coaches
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hofPage, setHofPage] = useState(1);
  // HOF candidacy scope: "multi" combines an athlete's sports (cross-sport bonus); "single" = this program only.
  const [hofScope, setHofScope] = useState("multi");

  const roster = school.allTimeRoster || [];
  const hasSeasons = (school.seasons || []).length > 0;

  // Build scored athletes list — memoized so it only recalculates when roster changes
  const scored = useMemo(() => roster.map(player => {
    try {
      const programScore = calcProgramHofScore(player, school);
      const crossResult = (hofScope === "multi" && allSchools.length > 1) ? calcCrossSportScore(player.name, allSchools) : null;
      const finalScore = crossResult ? crossResult.finalScore : programScore;
      const confirmed = !!(player.schoolHallOfFame || player.stateHallOfFame);
      return { player, programScore, crossSport: crossResult?.crossSport || false, allScores: crossResult?.allScores || [], finalScore, confirmed };
    } catch(e) {
      return { player, programScore: 0, crossSport: false, allScores: [], finalScore: 0, confirmed: false };
    }
  }), [school.id, school.allTimeRoster, school.seasons, school.records, allSchools, hofScope]); // eslint-disable-line

  const filtered = scored
    .filter(r => {
      if (filter === "confirmed" && !r.confirmed) return false;
      if (filter === "contenders" && r.finalScore < 60) return false;
      if (search && !r.player.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score")     return b.finalScore - a.finalScore;
      if (sortBy === "name")      return a.player.name.localeCompare(b.player.name);
      if (sortBy === "confirmed") return (b.confirmed ? 1 : 0) - (a.confirmed ? 1 : 0);
      return 0;
    });

  const confirmedCount = scored.filter(r => r.confirmed).length;
  const contenderCount = scored.filter(r => r.finalScore >= 60 && !r.confirmed).length;
  const confirmedCoachCount = Object.values(school.coachHof || {}).filter(Boolean).length;

  const toggleConfirmed = (player, type) => {
    const key = type === 'state' ? 'stateHallOfFame' : 'schoolHallOfFame';
    const updated = (school.allTimeRoster || []).map(p =>
      p.id === player.id ? { ...p, [key]: !p[key] } : p
    );
    onUpdate({ ...school, allTimeRoster: updated });
  };

  return (
    <div>
      {/* Header + view toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111" }}>🏛️ Hall of Fame</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#6b7280" }}>
            {view==="athletes"
              ? `${confirmedCount} confirmed · ${contenderCount} contenders · ${roster.length} players rated`
              : `${confirmedCoachCount} inducted · ${(school.seasons||[]).length} seasons of data`}
          </p>
        </div>
        {hasSeasons && (
          <div style={{ display:"flex", gap:0, border:"1px solid #e5e7eb", borderRadius:9, overflow:"hidden" }}>
            {[["athletes","👤 Athletes"],["coaches","🎓 Coaches"]].map(([val,label]) => (
              <button key={val} onClick={() => { setView(val); setSearch(""); setFilter("all"); }}
                style={{ padding:"8px 18px", fontSize:13, border:"none", cursor:"pointer",
                  fontWeight: view===val ? 700 : 400,
                  background: view===val ? "#1a3a6b" : "#fff",
                  color: view===val ? "#fff" : "#6b7280" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Athletes view controls */}
      {view === "athletes" && (
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setHofPage(1); }} placeholder="Search player..."
          style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 12px", fontSize:13, flex:1, minWidth:160 }} />
        <div style={{ display:"flex", gap:0, border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden" }}>
          {[["all","All"],["confirmed","Confirmed"],["contenders","Contenders (60+)"]].map(([val,label]) => (
            <button key={val} onClick={() => { setFilter(val); setHofPage(1); }}
              style={{ padding:"8px 14px", fontSize:13, border:"none", cursor:"pointer",
                fontWeight: filter===val ? 700 : 400,
                background: filter===val ? "#1a56db" : "#fff",
                color: filter===val ? "#fff" : "#6b7280" }}>
              {label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setHofPage(1); }}
          style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 12px", fontSize:13, background:"#fff" }}>
          <option value="score">Sort: Score</option>
          <option value="name">Sort: Name</option>
          <option value="confirmed">Sort: Confirmed first</option>
        </select>
        {allSchools.length > 1 && (
          <div style={{ display:"flex", gap:0, border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden" }}
            title="Multi-sport combines an athlete's sports into one candidacy; This sport only rates this program alone">
            {[["multi","🔗 Multi-sport"],["single","This sport only"]].map(([val,label]) => (
              <button key={val} onClick={() => { setHofScope(val); setHofPage(1); }}
                style={{ padding:"8px 14px", fontSize:13, border:"none", cursor:"pointer",
                  fontWeight: hofScope===val ? 700 : 400,
                  background: hofScope===val ? "#7c3aed" : "#fff",
                  color: hofScope===val ? "#fff" : "#6b7280" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Player grid */}
      {view === "athletes" && <><div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.slice(0, hofPage * 25).map(({ player, programScore, crossSport, allScores, finalScore, confirmed }, i) => {
          const tier = hofTier(finalScore);
          return (
            <div key={player.id}
              style={{ background:"#fff", borderRadius:12, border:`1px solid ${confirmed ? "#c4b5fd" : "#e8e4dd"}`,
                padding:"14px 18px", cursor:"pointer", transition:"box-shadow 0.1s",
                boxShadow: confirmed ? "0 0 0 2px #7c3aed22" : "none" }}
              onClick={() => setSelectedPlayer({ player, programScore, crossSport, allScores, finalScore, confirmed })}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = confirmed ? "0 0 0 2px #7c3aed22" : "none"}>

              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {/* Rank */}
                <div style={{ width:32, textAlign:"center", fontSize:13, fontWeight:700, color:"#9ca3af", flexShrink:0 }}>
                  {sortBy==="score" ? i+1 : ""}
                </div>

                {/* Score ring */}
                <div style={{ width:52, height:52, borderRadius:"50%", background:tier.bg,
                  border:`2px solid ${tier.border}`, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:tier.color, lineHeight:1 }}>{finalScore}</div>
                  <div style={{ fontSize:8, fontWeight:700, color:tier.color, textTransform:"uppercase", letterSpacing:"0.05em" }}>{tier.label}</div>
                </div>

                {/* Name + badges */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#111" }}>{player.name}</span>
                    {confirmed && <span style={{ fontSize:11 }}>🏛️</span>}
                    {player.stateHallOfFame && <span style={{ fontSize:11 }}>⭐</span>}
                    {crossSport && <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:700 }}>Multi-sport</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>
                    {player.firstYear && player.lastYear
                      ? (player.firstYear === player.lastYear ? player.firstYear : `${player.firstYear} – ${player.lastYear}`)
                      : player.gradYear ? `Class of ${player.gradYear}` : ""}
                    {crossSport && allScores.length > 1 && (
                      <span style={{ marginLeft:8, color:"#6b7280" }}>
                        {allScores.map(s => `${SPORTS[s.school.sport]?.icon || ""} ${s.score}`).join("  ·  ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ width:120, flexShrink:0 }}>
                  <div style={{ height:6, background:"#f0f0ee", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${finalScore}%`, height:"100%", background:tier.color, borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                  {crossSport && programScore !== finalScore && (
                    <div style={{ fontSize:10, color:"#9ca3af", marginTop:2, textAlign:"right" }}>
                      {programScore} + multi-sport boost
                    </div>
                  )}
                </div>

                {/* Admin flag buttons */}
                <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleConfirmed(player, 'school')}
                    title={player.schoolHallOfFame ? "Remove from School HOF" : "Add to School HOF"}
                    style={{ background: player.schoolHallOfFame ? "#7c3aed" : "#f3f4f6",
                      color: player.schoolHallOfFame ? "#fff" : "#6b7280",
                      border:"none", borderRadius:6, padding:"5px 9px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    🏛️ School
                  </button>
                  <button
                    onClick={() => toggleConfirmed(player, 'state')}
                    title={player.stateHallOfFame ? "Remove from State HOF" : "Add to State HOF"}
                    style={{ background: player.stateHallOfFame ? "#b45309" : "#f3f4f6",
                      color: player.stateHallOfFame ? "#fff" : "#6b7280",
                      border:"none", borderRadius:6, padding:"5px 9px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    ⭐ State
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No players match your filter.</div>
        )}
      </div>
      {filtered.length > hofPage * 25 && (
        <button onClick={() => setHofPage(p => p + 1)}
          style={{ width:"100%", marginTop:10, padding:"10px 0", background:"#f9fafb",
            border:"1px solid #e5e7eb", borderRadius:10, fontSize:13, fontWeight:600,
            color:"#374151", cursor:"pointer" }}>
          Load more ({filtered.length - hofPage * 25} remaining)
        </button>
      )}
      {selectedPlayer && (
        <HofDetailModal
          {...selectedPlayer}
          school={school}
          allSchools={allSchools}
          onClose={() => setSelectedPlayer(null)}
          onToggle={toggleConfirmed}
        />
      )}
      </>}

      {/* Coaches view */}
      {view === "coaches" && (
        <CoachHofSection school={school} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function HofDetailModal({ player, programScore, crossSport, allScores, finalScore, confirmed, school, allSchools, onClose, onToggle }) {
  const tier = hofTier(finalScore);
  // Per-sport breakdown: multi-sport mode shows every sport the athlete played; otherwise just
  // this program. Each context carries that sport's program (school) + its roster entry (player).
  const sportContexts = (crossSport && allScores && allScores.length > 1)
    ? allScores.map(a => ({ school: a.school, player: a.player }))
    : [{ school, player }];
  const buildStatBreakdown = (pl, rost) => Object.entries(pl.stats || {})
    .filter(([stat]) => HOF_STAT_WEIGHTS[stat] > 0)
    .map(([stat, val]) => {
      const sorted = rost.filter(p => (p.stats[stat] || 0) > 0).sort((a, b) => (b.stats[stat] || 0) - (a.stats[stat] || 0));
      const rank = sorted.findIndex(p => p.id === pl.id) + 1;
      return { stat, val, rank, total: sorted.length };
    })
    .filter(r => r.rank > 0)
    .sort((a, b) => a.rank - b.rank);
  const playerHeldRecords = (sch, pl) => {
    const nameLower = (pl.name || "").toLowerCase().trim();
    return (sch.records || []).filter(r => {
      const h = (r.holderName || "").toLowerCase().trim();
      return h && h !== "multiple players" && h === nameLower;
    });
  };

  // Team success during player's career
  const seasons = school.seasons || [];
  const playerSeasons = seasons.filter(s => playerSeasonOverlap(player, s) && getSeasonSuccessScore(s.notes) > 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:580, maxHeight:"88vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ background: confirmed ? "#7c3aed" : school.primaryColor || "#1a3a6b", padding:"24px 24px 20px", borderRadius:"16px 16px 0 0", position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:"#fff", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#fff", lineHeight:1 }}>{finalScore}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.8)", textTransform:"uppercase" }}>{tier.label}</div>
            </div>
            <div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:20 }}>
                {player.name}
                {player.schoolHallOfFame && " 🏛️"}
                {player.stateHallOfFame && " ⭐"}
              </div>
              <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13, marginTop:3 }}>
                {player.firstYear && player.lastYear
                  ? `${player.firstYear} – ${player.lastYear}`
                  : player.gradYear ? `Class of ${player.gradYear}` : ""}
                {crossSport && " · Multi-sport athlete"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:24 }}>

          {/* Score breakdown */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
            <div style={{ background:"#f9fafb", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginBottom:4 }}>PROGRAM SCORE</div>
              <div style={{ fontSize:24, fontWeight:800, color:tier.color }}>{programScore}</div>
              <div style={{ fontSize:12, color:"#6b7280" }}>{SPORTS[school.sport]?.label}</div>
            </div>
            {crossSport
              ? <div style={{ background:"#fffbeb", borderRadius:10, padding:"12px 16px", border:"1px solid #fcd34d" }}>
                  <div style={{ fontSize:11, color:"#92400e", fontWeight:600, marginBottom:4 }}>MULTI-SPORT SCORE</div>
                  <div style={{ fontSize:24, fontWeight:800, color:"#92400e" }}>{finalScore}</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{allScores?.length || 0} programs</div>
                </div>
              : <div style={{ background:"#f9fafb", borderRadius:10, padding:"12px 16px" }}>
                  <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, marginBottom:4 }}>TEAM SUCCESS</div>
                  <div style={{ fontSize:24, fontWeight:800, color:"#374151" }}>
                    {Math.min(playerSeasons.reduce((a,s)=>a+getSeasonSuccessScore(s.notes),0),30)}
                  </div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>pts from postseason</div>
                </div>
            }
          </div>

          {/* Cross-sport breakdown */}
          {crossSport && allScores && allScores.length > 1 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Sport breakdown</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {allScores.map(({ school: s, score }) => {
                  const t = hofTier(score);
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, background:"#f9fafb", borderRadius:8, padding:"8px 12px" }}>
                      <span style={{ fontSize:16 }}>{SPORTS[s.sport]?.icon}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{SPORTS[s.sport]?.label}</span>
                      <div style={{ width:80, height:5, background:"#e5e7eb", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${score}%`, height:"100%", background:t.color, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:t.color, width:28, textAlign:"right" }}>{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stat rankings — per sport when multi-sport */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Statistical rank</div>
            {sportContexts.map(({ school: s, player: pl }) => {
              const rows = buildStatBreakdown(pl, s.allTimeRoster || []);
              if (!rows.length) return null;
              return (
                <div key={s.id} style={{ marginBottom: sportContexts.length > 1 ? 12 : 0 }}>
                  {sportContexts.length > 1 && (
                    <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", margin:"0 0 6px", display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:14 }}>{SPORTS[s.sport]?.icon}</span> {SPORTS[s.sport]?.label || s.sport}
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {rows.map(({ stat, val, rank, total }) => (
                      <div key={stat} style={{ background:"#f9fafb", borderRadius:8, padding:"8px 12px", border: rank<=3 ? "1px solid #fcd34d" : "1px solid #f0eeea" }}>
                        <div style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>{stat.toUpperCase()}</div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:2 }}>
                          <div style={{ fontSize:17, fontWeight:700, color:"#111" }}>{val.toLocaleString()}</div>
                          <div style={{ fontSize:11, fontWeight:700, color: rank===1?"#b45309":rank<=3?"#1d4ed8":"#6b7280" }}>
                            {rank===1?"🥇 #1":rank===2?"🥈 #2":rank===3?"🥉 #3":`#${rank}`} of {total}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Records held — per sport when multi-sport */}
          {(() => {
            const blocks = sportContexts
              .map(({ school: s, player: pl }) => ({ s, recs: playerHeldRecords(s, pl) }))
              .filter(b => b.recs.length);
            if (!blocks.length) return null;
            const allRecs = blocks.flatMap(b => b.recs);
            const bonus = Math.min(allRecs.reduce((a,r)=>(r.variant||"").toLowerCase().includes("career")?a+5:a+3,0),20);
            return (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>
                  Records held <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:700, marginLeft:6 }}>+{bonus} pts</span>
                </div>
                {blocks.map(({ s, recs }) => (
                  <div key={s.id} style={{ marginBottom: blocks.length > 1 ? 10 : 0 }}>
                    {blocks.length > 1 && (
                      <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", margin:"0 0 6px", display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:14 }}>{SPORTS[s.sport]?.icon}</span> {SPORTS[s.sport]?.label || s.sport}
                      </div>
                    )}
                    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                      {recs.map(r => (
                        <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"7px 12px", fontSize:13 }}>
                          <span style={{ fontWeight:600, color:"#111" }}>{r.statName}</span>
                          <span style={{ color:"#6b7280" }}>{r.variant}</span>
                          <span style={{ fontWeight:700, color:"#b45309" }}>{(r.value||0).toLocaleString()} 🏆</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Team success seasons — per sport when multi-sport, so each sport is differentiated */}
          {(() => {
            const blocks = sportContexts
              .map(({ school: s, player: pl }) => ({
                s,
                secs: (s.seasons || []).filter(season => playerSeasonOverlap(pl, season) && getSeasonSuccessScore(season.notes) > 0)
              }))
              .filter(b => b.secs.length);
            if (!blocks.length) return null;
            return (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Team success during career</div>
                {blocks.map(({ s, secs }) => (
                  <div key={s.id} style={{ marginBottom: blocks.length > 1 ? 10 : 0 }}>
                    {blocks.length > 1 && (
                      <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", margin:"0 0 6px", display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:14 }}>{SPORTS[s.sport]?.icon}</span> {SPORTS[s.sport]?.label || s.sport}
                      </div>
                    )}
                    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                      {secs.map(season => (
                        <div key={season.season} style={{ display:"flex", justifyContent:"space-between", background:"#f9fafb", borderRadius:8, padding:"7px 12px", fontSize:13 }}>
                          <span style={{ fontWeight:600, color:"#111" }}>{season.season}</span>
                          <span style={{ color:"#6b7280" }}>{season.notes}</span>
                          <span style={{ fontWeight:700, color:"#92400e" }}>+{getSeasonSuccessScore(season.notes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Admin HOF toggle buttons */}
          <div style={{ borderTop:"1px solid #f0eeea", paddingTop:16, display:"flex", gap:8 }}>
            <button onClick={() => { onToggle(player, 'school'); onClose(); }}
              style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
                background: player.schoolHallOfFame ? "#7c3aed" : "#f5f3ff",
                color: player.schoolHallOfFame ? "#fff" : "#7c3aed" }}>
              {player.schoolHallOfFame ? "🏛️ Remove School HOF" : "🏛️ Add to School HOF"}
            </button>
            <button onClick={() => { onToggle(player, 'state'); onClose(); }}
              style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
                background: player.stateHallOfFame ? "#b45309" : "#fffbeb",
                color: player.stateHallOfFame ? "#fff" : "#b45309" }}>
              {player.stateHallOfFame ? "⭐ Remove State HOF" : "⭐ Add to State HOF"}
            </button>
            <button onClick={onClose}
              style={{ padding:"10px 20px", borderRadius:9, border:"1px solid #e5e7eb", cursor:"pointer", fontWeight:600, fontSize:13, background:"#fff", color:"#374151" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolDashboard({ school, allSchools = [], onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState(() => { try { return sessionStorage.getItem("mq_dash_tab") || "overview"; } catch (e) { return "overview"; } });
  useEffect(() => { try { sessionStorage.setItem("mq_dash_tab", activeTab); } catch (e) {} }, [activeTab]);
  const [showImport, setShowImport] = useState(false);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showMilestoneSettings, setShowMilestoneSettings] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  // Every season row for this program — feeds the single-season shooting-% record holders.
  const [allSeasonRows, setAllSeasonRows] = useState([]);
  useEffect(() => {
    let alive = true;
    if (!school?.id) { setAllSeasonRows([]); return; }
    getAllPlayerSeasons(school.id).then(({ data }) => { if (alive) setAllSeasonRows(data || []); });
    return () => { alive = false; };
  }, [school.id]);
  const dismissedSet = new Set(school.dismissedAlerts || []);

  const dismissAlert = (athleteId, statName, target) => {
    const key = `${athleteId}|${statName}|${target}`;
    const updated = [...new Set([...(school.dismissedAlerts || []), key])];
    onUpdate({ ...school, dismissedAlerts: updated });
  };
  const restoreAlerts = () => onUpdate({ ...school, dismissedAlerts: [] });
  const isAlertDismissed = (athleteId, statName, target) =>
    dismissedSet.has(`${athleteId}|${statName}|${target}`);

  const sport = SPORTS[school.sport] || SPORTS.football;
  // Clicking an athlete card opens the SAME full profile modal as the All-Time tab.
  const atRoster = school.allTimeRoster || [];
  const atAllStats = allStatsFor(atRoster);
  const atEffectiveIsActive = makeEffectiveIsActive(school.athletes || []);
  const atRankFor = makeRankFor(atRoster);
  // Open by the all-time-roster entry (matched by name) so career totals + rank match the All-Time tab.
  const openAthlete = (athlete) => setSelectedAthlete(atRoster.find(p => (p.name || "").toLowerCase() === (athlete.name || "").toLowerCase()) || athlete);
  const allAlerts = school.athletes.filter(a => a.isActive !== false).map(a => ({
    athlete: a,
    alerts: getMilestoneAlerts(a, school.records || [], school.milestones || [])
      .filter(alert => !isAlertDismissed(a.id, alert.statName, alert.target))
  })).filter(x => x.alerts.length > 0);

  const totalAlertCount = allAlerts.reduce((a, x) => a + x.alerts.length, 0);

  const handleImport = (parsed) => {
    const nameCol = parsed.headers.find(h => /^name$/i.test(h.trim()) || /player.?name/i.test(h));
    const posCol  = parsed.headers.find(h => /^pos(ition)?$/i.test(h.trim()));
    const gradCol = parsed.headers.find(h => /grad.?year|class.?of/i.test(h));
    // Non-stat columns to exclude
    const metaCols = new Set([nameCol, posCol, gradCol].filter(Boolean));
    const validStats = new Set([
      ...(SPORTS[school.sport]?.groups || []).flatMap((g) => (g.stats || []).map((s) => s.name)),
      ...(school.allTimeRoster || []).flatMap((p) => Object.keys(p.stats || {})), // the program's ACTUAL stat names
    ]);
    const imported = parsed.rows.map((row, i) => {
      const name = nameCol ? String(row[nameCol]).trim() : `Athlete ${i+1}`;
      if (!name || name === "undefined") return null;
      const stats = {};
      parsed.headers.forEach(h => {
        if (metaCols.has(h)) return;
        const val = row[h];
        if (typeof val !== "number" || val <= 0) return;
        const mapped = SEASON_STAT_ALIASES[String(h).trim()] || String(h).trim();
        if (!validStats.has(mapped)) return; // only stats in our structure — no AI-invented ones
        stats[mapped] = val;
      });
      return { name, gradYear: gradCol ? (Number(row[gradCol]) || null) : null, stats };
    }).filter(Boolean);
    // Career/stat imports belong in the ALL-TIME roster — that's what the All-Time tab
    // shows and where existing players live. Merge by name so we never duplicate a player
    // who's already there; brand-new players come in as alumni, NOT active (mark current
    // players active from their profile). Fixes: duplicates, missing-from-all-time, all-active.
    const roster = [...(school.allTimeRoster || [])];
    const idxByName = new Map(roster.map((p, i) => [p.name.toLowerCase().trim(), i]));
    imported.forEach(imp => {
      const key = imp.name.toLowerCase().trim();
      if (idxByName.has(key)) {
        const idx = idxByName.get(key);
        roster[idx] = { ...roster[idx], stats: { ...roster[idx].stats, ...imp.stats } };
      } else {
        roster.push({
          id: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: imp.name, gradYear: imp.gradYear, firstYear: null, lastYear: null,
          isCurrent: false, isActive: false, schoolHallOfFame: false, stateHallOfFame: false,
          stats: imp.stats,
        });
        idxByName.set(key, roster.length - 1);
      }
    });
    onUpdate({ ...school, allTimeRoster: roster });
  };

  const tabs = ["overview","athletes","milestones","alerts","records","all-time","seasons","hof","export"];

  return (
    <div style={{ fontFamily:"Georgia, serif", minHeight:"100vh", background:"#f8f7f4" }}>
      {showImport && <ImportModal school={school} onClose={()=>setShowImport(false)} onImport={handleImport} />}
      {showAddAthlete && <AddAthleteModal onClose={()=>setShowAddAthlete(false)} sport={school.sport} onAdd={a=>{ onUpdate({...school,athletes:[...school.athletes,a]}); }} />}
      {showRecords && <RecordsModal school={school} onClose={()=>setShowRecords(false)} onSave={recs=>onUpdate({...school,records:recs})} />}
      {showMilestoneSettings && <MilestoneSettingsModal school={school} onClose={()=>setShowMilestoneSettings(false)} onSave={ms=>onUpdate({...school,milestones:ms})} />}
      {showEmailPreview && <EmailPreviewModal allAlerts={allAlerts} school={school} onClose={()=>setShowEmailPreview(false)} />}

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e4dd", padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 0 0" }}>
          <button onClick={onBack} style={{ background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontSize:13 }}>← All programs</button>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:12 }}>
            {school.logo
              ? <img src={school.logo} alt={school.name} style={{ width:44,height:44,borderRadius:10,objectFit:"contain",background:school.primaryColor,padding:4 }} />
              : <div style={{ width:44,height:44,borderRadius:10,background:school.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{sport.icon}</div>
            }
            <div>
              <h1 style={{ margin:0,fontSize:20,fontWeight:700,color:"#111" }}>{school.name}</h1>
              <div style={{ fontSize:13,color:"#6b7280" }}>{school.mascot} · {sport.label} · {school.athletes.filter(a=>a.isActive!==false).length} athletes · {(school.records||[]).length} records on file</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {(activeTab==="milestones" || activeTab==="alerts") && (
              <button onClick={()=>setShowEmailPreview(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                📧 Send alerts ({totalAlertCount})
              </button>
            )}
          </div>
        </div>
        <div style={{ display:"flex",gap:0,marginTop:16 }}>
          {tabs.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{ background:"none",border:"none",borderBottom:activeTab===tab?"2px solid #1a56db":"2px solid transparent",
                padding:"10px 16px",fontSize:13,fontWeight:activeTab===tab?700:400,
                color:activeTab===tab?"#1a56db":"#6b7280",cursor:"pointer",textTransform:"capitalize" }}>
              {{"overview":"Overview","athletes":"Athletes","records":"Records","milestones":"Milestones","alerts":"Alerts","all-time":"All-Time","seasons":"Seasons","hof":"🏛️ HOF","export":"Export"}[tab]||tab}{tab==="alerts"&&totalAlertCount>0?` (${totalAlertCount})`:""}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:24 }}>

        {/* OVERVIEW TAB */}
        {activeTab==="overview" && (
          <div>
            {totalAlertCount > 0 && (
              <div style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:16,marginBottom:20 }}>
                <div style={{ fontWeight:700,fontSize:14,color:"#92400e",marginBottom:12 }}>🔔 {totalAlertCount} active milestone alerts</div>
                {allAlerts.slice(0,3).map(({athlete,alerts:ats})=>ats.slice(0,1).map((a,i)=>(
                  <AlertBadge key={`${athlete.id}-${i}`} alert={a} mode="short" />
                )))}
                {allAlerts.length>3&&<div style={{ fontSize:13,color:"#6b7280",marginTop:8,cursor:"pointer" }} onClick={()=>setActiveTab("alerts")}>View all {totalAlertCount} alerts →</div>}
              </div>
            )}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
              {[["Athletes",school.athletes.filter(a=>a.isActive!==false).length,"👤"],["Active alerts",totalAlertCount,"🎯"],["Records on file",(school.records||[]).length,"📋"],["Sport",sport.label.split(" ")[0],sport.icon]].map(([label,val,icon])=>(
                <div key={label} style={{ background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #e8e4dd" }}>
                  <div style={{ fontSize:22,marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:26,fontWeight:700,color:"#111" }}>{val}</div>
                  <div style={{ fontSize:12,color:"#6b7280" }}>{label}</div>
                </div>
              ))}
            </div>
            {(() => {
              // Career stats for ACTIVE players — all stats, same order as the all-time tab /
              // athlete profile (byStatOrder + each % right after its "Attempted" column).
              // Name column is frozen (sticky-left); the rest scrolls horizontally.
              const activeAthletes = school.athletes.filter(a => a.isActive !== false);
              const baseCols = allStatsFor(activeAthletes);
              const ovCols = [];
              for (const c of baseCols) { ovCols.push({ stat: c }); const d = PCT_DEFS.find(p => p.att === c); if (d) ovCols.push({ pct: d }); }
              const rows = [...activeAthletes].sort((a, b) => a.name.localeCompare(b.name));
              const cellBg = (i) => i % 2 === 0 ? "#fff" : "#fafaf8";
              return (
                <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",overflow:"hidden" }}>
                  <div style={{ padding:"14px 20px",borderBottom:"1px solid #f3f0ea",fontWeight:700,fontSize:15,color:"#111",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span>Career stats · active roster</span>
                    {ovCols.length > 4 && <span style={{ fontSize:12,fontWeight:400,color:"#9ca3af" }}>scroll for more →</span>}
                  </div>
                  {(!rows.length || !ovCols.length) ? (
                    <div style={{ padding:"24px 20px",color:"#9ca3af",fontSize:13 }}>No active athletes with stats yet.</div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ borderCollapse:"separate", borderSpacing:0, fontSize:13, minWidth:"100%" }}>
                        <thead><tr>
                          <th style={{ position:"sticky", left:0, zIndex:2, background:"#fafaf8", padding:"10px 16px", textAlign:"left", fontSize:12, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #f3f0ea", borderRight:"1px solid #f0eeea", minWidth:170 }}>Athlete</th>
                          {ovCols.map(col => (
                            <th key={col.pct ? "p-"+col.pct.name : col.stat} title={col.pct ? col.pct.name : col.stat}
                              style={{ background:"#fafaf8", padding:"10px 12px", textAlign:"right", fontSize:12, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #f3f0ea", whiteSpace:"nowrap" }}>
                              {col.pct ? col.pct.short : col.stat}
                            </th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {rows.map((a, i) => (
                            <tr key={a.id} onClick={()=>{ openAthlete(a); setActiveTab("athletes"); }} style={{ cursor:"pointer" }}>
                              <td style={{ position:"sticky", left:0, zIndex:1, background:cellBg(i), padding:"10px 16px", borderBottom:"1px solid #f9f7f4", borderRight:"1px solid #f0eeea", minWidth:170 }}>
                                <div style={{ fontWeight:600, color:"#111", whiteSpace:"nowrap" }}>{a.name}</div>
                                <div style={{ fontSize:11, color:"#9ca3af", whiteSpace:"nowrap" }}>{a.position}{a.gradYear ? ` · Class of ${a.gradYear}` : ""}</div>
                              </td>
                              {ovCols.map(col => {
                                const v = col.pct ? shootingPct(a.stats, col.pct.made, col.pct.att) : a.stats[col.stat];
                                const display = col.pct ? (v != null ? v + "%" : "—") : (v != null ? Number(v).toLocaleString() : "—");
                                return <td key={col.pct ? "p-"+col.pct.name : col.stat} style={{ padding:"10px 12px", textAlign:"right", color: v != null ? "#111" : "#d1d5db", background:cellBg(i), borderBottom:"1px solid #f9f7f4", whiteSpace:"nowrap" }}>{display}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ATHLETES TAB */}
        {activeTab==="athletes" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div>
                <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Athletes</h2>
                <p style={{ margin:"4px 0 0",fontSize:13,color:"#6b7280" }}>
                  {school.athletes.filter(a=>a.isActive!==false).length} active · {school.athletes.filter(a=>a.isActive===false).length} inactive
                </p>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ display:"flex",gap:0,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden" }}>
                  {[["active","Active"],["all","All"],["inactive","Inactive"]].map(([val,label])=>{
                    const [rosterFilter, setRosterFilter] = [school._rosterFilter||"active", (v)=>onUpdate({...school,_rosterFilter:v})];
                    const isSelected = rosterFilter===val;
                    return (
                      <button key={val} onClick={e=>{e.stopPropagation();setRosterFilter(val);}}
                        style={{padding:"7px 14px",fontSize:12,border:"none",cursor:"pointer",fontWeight:isSelected?700:400,
                          background:isSelected?"#1a56db":"#fff",color:isSelected?"#fff":"#6b7280"}}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={()=>setShowImport(true)} style={{ background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer" }}>↑ Import</button>
                <button onClick={()=>setShowAddAthlete(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>+ Add athlete</button>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px,1fr))",gap:12 }}>
              {school.athletes
                .filter(a => {
                  const f = school._rosterFilter || "active";
                  if (f==="active") return a.isActive !== false;
                  if (f==="inactive") return a.isActive === false;
                  return true;
                })
                .map(athlete=>{
                const ats = getMilestoneAlerts(athlete, school.records||[], school.milestones||[])
                  .filter(a => !isAlertDismissed(athlete.id, a.statName, a.target));
                const isSelected = selectedAthlete?.id===athlete.id;
                const isActive = athlete.isActive !== false;

                const toggleActive = (e) => {
                  e.stopPropagation();
                  const updated = school.athletes.map(a =>
                    a.id===athlete.id ? {...a, isActive: !isActive} : a
                  );
                  onUpdate({...school, athletes: updated});
                };

                // Bucket stats by group using sport definition
                const isFootball = school.sport === "football";
                const OFFENSE_STATS = new Set(["Pass Completions","Pass Attempts","Passing Yards","Passing TDs","Longest Pass","Passing Yards Per Game","Completions Per Game","Completion %","Passing TD %","Rushing Attempts","Rushing Yards","Rushing TDs","Longest Rush","Rushing Yards Per Game","Yards Per Rush Attempt","Receptions","Receiving Yards","Receiving TDs","Longest Reception","Targets","Receiving Yards Per Game","Yards Per Reception","Total TDs","2 Pt Conversions Made","Yards From Scrimmage","All-Purpose Yards","Total Offense","Touches","Yards Per Touch"]);
                const DEFENSE_STATS = new Set(["Solo Tackles","Combined Tackles","Tackles For Loss","Sacks","Interceptions","Interception Return Yards","Interception Return TDs","Longest Interception Return","Passes Defended","Fumbles Forced","Fumbles Recovered","Fumble Return Yards","Fumble Return TDs","Safeties"]);
                const SPECIAL_STATS = new Set(["Extra Points Made","Extra Points Attempted","Extra Point %","Field Goals Made","Field Goals Attempted","Field Goal %","Longest Field Goal Made","Punts","Punting Yards","Longest Punt","Yards Per Punt","Kick Returns","Kick Return Yards","Kick Return TDs","Longest Kick Return","Yards Per Kick Return","Punt Returns","Punt Return Yards","Punt Return TDs","Longest Punt Return","Yards Per Punt Return","Kick & Punt Returns","Kick & Punt Return Yards","Kick & Punt Return TDs"]);

                const offStats = isFootball ? Object.entries(athlete.stats).filter(([k]) => OFFENSE_STATS.has(k) && k !== "Games Played") : [];
                const defStats = isFootball ? Object.entries(athlete.stats).filter(([k]) => DEFENSE_STATS.has(k)) : [];
                const stStats  = isFootball ? Object.entries(athlete.stats).filter(([k]) => SPECIAL_STATS.has(k)) : [];
                const hasMultipleSides = isFootball && ((offStats.length > 0 && defStats.length > 0) || stStats.length > 0);

                const StatGroup = ({ label, color, textColor, entries }) => entries.length === 0 ? null : (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
                      color:textColor, background:color, borderRadius:4, padding:"2px 6px",
                      display:"inline-block", marginBottom:5 }}>{label}</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:4 }}>
                      {entries.map(([k,v])=>(
                        <div key={k} style={{ background:"#f9fafb",borderRadius:6,padding:"5px 8px" }}>
                          <div style={{ fontSize:10,color:"#9ca3af",lineHeight:1.2 }}>{k}</div>
                          <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{typeof v==="number"?v.toLocaleString():v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );

                return (
                  <div key={athlete.id} onClick={()=>openAthlete(athlete)}
                    style={{ background:"#fff",borderRadius:12,
                      border:`1px solid ${isSelected?"#1a56db":isActive?"#e8e4dd":"#e5e7eb"}`,
                      padding:16,cursor:"pointer",opacity:isActive?1:0.6 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
                          <div style={{ fontWeight:700,fontSize:15,color:isActive?"#111":"#6b7280" }}>{athlete.name}</div>
                          {!isActive && <span style={{ background:"#f3f4f6",color:"#9ca3af",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600 }}>Inactive</span>}
                        </div>
                        <div style={{ fontSize:12,color:"#6b7280" }}>
                          {athlete.position} · Class of {athlete.gradYear}
                          {isFootball && hasMultipleSides && <span style={{ marginLeft:6,background:"#eff6ff",color:"#1e40af",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600 }}>2-way</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8 }}>
                        {ats.length>0&&isActive&&<span style={{ background:"#fef3c7",color:"#92400e",borderRadius:12,padding:"3px 10px",fontSize:12,fontWeight:700 }}>{ats.length} 🔔</span>}
                        <button onClick={toggleActive}
                          style={{ background:isActive?"#f0fdf4":"#f3f4f6",
                            border:`1px solid ${isActive?"#86efac":"#e5e7eb"}`,
                            borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",
                            color:isActive?"#14532d":"#6b7280",fontWeight:600,whiteSpace:"nowrap" }}>
                          {isActive?"✓ Active":"Set active"}
                        </button>
                      </div>
                    </div>

                    {hasMultipleSides ? (
                      <div>
                        <StatGroup label="Offense" color="#dbeafe" textColor="#1e40af" entries={offStats} />
                        <StatGroup label="Defense" color="#fee2e2" textColor="#991b1b" entries={defStats} />
                        <StatGroup label="Special Teams" color="#ffedd5" textColor="#c2410c" entries={stStats} />
                      </div>
                    ) : (
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
                        {Object.entries(athlete.stats)
                          .sort(([a],[b]) => byStatOrder(a, b))
                          .flatMap(([k,v])=>{
                            const tile = (
                              <div key={k} style={{ background:"#f9fafb",borderRadius:6,padding:"5px 8px" }}>
                                <div style={{ fontSize:10,color:"#9ca3af",lineHeight:1.2 }}>{k}</div>
                                <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{typeof v==="number"?v.toLocaleString():v}</div>
                              </div>
                            );
                            const out = [tile];
                            // After a stat show its per-game avg; after an "…Attempted" its shooting %.
                            const pg = PERGAME_DEFS.find(p => p.stat === k);
                            const pgVal = pg ? perGame(athlete.stats, pg.stat) : null;
                            if (pg && pgVal != null) out.push(
                              <div key={pg.name} style={{ background:"#f9fafb",borderRadius:6,padding:"5px 8px" }}>
                                <div style={{ fontSize:10,color:"#9ca3af",lineHeight:1.2 }}>{pg.name}</div>
                                <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{pgVal}</div>
                              </div>
                            );
                            const d = PCT_DEFS.find(p => p.att === k);
                            const pctVal = d ? shootingPct(athlete.stats, d.made, d.att) : null;
                            if (d && pctVal != null) out.push(
                              <div key={d.name} style={{ background:"#f9fafb",borderRadius:6,padding:"5px 8px" }}>
                                <div style={{ fontSize:10,color:"#9ca3af",lineHeight:1.2 }}>{d.name}</div>
                                <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{pctVal}%</div>
                              </div>
                            );
                            return out;
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedAthlete && (
              <PlayerProfileModal
                player={selectedAthlete}
                school={school}
                onClose={()=>setSelectedAthlete(null)}
                onUpdate={(updated)=>{ onUpdate(updated); setSelectedAthlete(null); }}
                ALL_STATS={atAllStats}
                effectiveIsActive={atEffectiveIsActive}
                rankFor={atRankFor}
              />
            )}
          </div>
        )}

        {/* RECORDS TAB */}
        {activeTab==="records" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div>
                <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>School records</h2>
                <p style={{ margin:"4px 0 0",fontSize:13,color:"#6b7280" }}>Each record is tracked by stat, variant, record holder, and year set. Alerts fire at 85%, 95%, and 100%.</p>
              </div>
              <button onClick={()=>setShowRecords(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>+ Add / edit records</button>
            </div>

            {([...(school.records||[]), ...pctRecordsFrom(allSeasonRows, [...(school.athletes||[]), ...(school.allTimeRoster||[])], school.sport), ...pergameRecordsFrom(allSeasonRows, [...(school.athletes||[]), ...(school.allTimeRoster||[])], school.sport)].length===0)
              ? <div style={{ background:"#fff",borderRadius:12,border:"2px dashed #e5e7eb",padding:40,textAlign:"center",color:"#9ca3af" }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>📋</div>
                  <div style={{ fontWeight:600,marginBottom:4 }}>No records on file yet</div>
                  <div style={{ fontSize:13 }}>Add records to start tracking milestones</div>
                  <button onClick={()=>setShowRecords(true)} style={{ marginTop:12,background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontWeight:600,fontSize:13,cursor:"pointer" }}>Add records</button>
                </div>
              : (()=>{
                  const groupColors = { "Passing":"#dbeafe","Rushing":"#dcfce7","Receiving":"#fef3c7","Other Offense":"#f3e8ff","Special Teams":"#ffedd5","Defense":"#fee2e2","General":"#f1f5f9" };
                  const groupTextColors = { "Passing":"#1e40af","Rushing":"#166534","Receiving":"#92400e","Other Offense":"#6b21a8","Special Teams":"#c2410c","Defense":"#991b1b","General":"#334155" };

                  const getGroup = (statName) => {
                    if (!sport.groups) return "Other";
                    const g = sport.groups.find(g => g.stats.some(s => s.name === statName));
                    return g ? g.group : "Other";
                  };

                  const RECORD_STAT_ORDER = [...STAT_ORDER, "Coach Wins", "Field Goal Percentage", "Three Point Percentage", "Free Throw Percentage"];
                  const recStatIdx = (n) => { const i = RECORD_STAT_ORDER.indexOf(n); return i===-1 ? 999 : i; };
                  const VARIANT_ORDER = ["Career total","Single season","Single game","Per game avg (season)","Per game avg (career)"];
                  const recVariantIdx = (v) => { const i = VARIANT_ORDER.indexOf(v); return i===-1 ? 999 : i; };
                  // Percentage records live inside their "made" tile (e.g. FG% under Field Goals Made)
                  const PCT_PARENT = { "Field Goal Percentage":"Field Goals Made", "Three Point Percentage":"Three Pointers Made", "Free Throw Percentage":"Free Throws Made" };
                  // Manual records (minus any hand-entered % rows) + auto-computed FG%/3P%/FT%
                  // record holders (single-season from player_seasons, career from the roster pool).
                  const allRecords = [
                    ...(school.records||[]).filter(r => !PCT_PARENT[r.statName] && !String(r.variant||"").startsWith("Per game avg")),
                    ...pctRecordsFrom(allSeasonRows, [...(school.athletes||[]), ...(school.allTimeRoster||[])], school.sport),
                    ...pergameRecordsFrom(allSeasonRows, [...(school.athletes||[]), ...(school.allTimeRoster||[])], school.sport),
                  ];
                  const byGroup = {};
                  allRecords.forEach(r => {
                    const tileStat = PCT_PARENT[r.statName] || r.statName;
                    const grp = getGroup(tileStat);
                    if (!byGroup[grp]) byGroup[grp] = {};
                    if (!byGroup[grp][tileStat]) byGroup[grp][tileStat] = [];
                    byGroup[grp][tileStat].push(r);
                  });

                  return Object.entries(byGroup).map(([grpName, statMap]) => (
                    <div key={grpName} style={{ marginBottom:20 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                        <span style={{ background:groupColors[grpName]||"#f1f5f9",color:groupTextColors[grpName]||"#334155",borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700 }}>{grpName}</span>
                        <div style={{ flex:1,height:1,background:"#e8e4dd" }} />
                        <span style={{ fontSize:12,color:"#9ca3af" }}>{Object.values(statMap).flat().length} records</span>
                      </div>
                      {Object.entries(statMap).sort((a,b)=>recStatIdx(a[0])-recStatIdx(b[0])).map(([statName, recs]) => {
                        const leaders = school.athletes.filter(a=>a.isActive!==false && a.stats[statName]!=null).sort((a,b)=>b.stats[statName]-a.stats[statName]);
                        const leader = leaders[0];
                        return (
                          <div key={statName} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",marginBottom:8,overflow:"hidden" }}>
                            <div style={{ padding:"10px 16px",borderBottom:"1px solid #f3f0ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                              <div style={{ fontWeight:700,fontSize:14,color:"#111" }}>{statName}</div>
                              {leader&&<div style={{ fontSize:12,color:"#6b7280" }}>Current leader: <strong>{leader.name}</strong> ({leader.stats[statName].toLocaleString()})</div>}
                            </div>
                            <div style={{ padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8 }}>
                              {(() => {
                                const sorted = [...recs].sort((a,b)=>((PCT_PARENT[a.statName]?100:0)+recVariantIdx(a.variant))-((PCT_PARENT[b.statName]?100:0)+recVariantIdx(b.variant)));
                                // Collapse tie records (same stat+variant+value) into one card with multiple holders
                                const groups = []; const seen = {};
                                sorted.forEach(r => {
                                  const k = r.statName+"|"+r.variant+"|"+r.value;
                                  if (seen[k]!=null) groups[seen[k]].push(r);
                                  else { seen[k]=groups.length; groups.push([r]); }
                                });
                                return groups.map(group => {
                                  const rec = group[0];
                                  const isPct = !!PCT_PARENT[rec.statName];
                                  const leaderVal = leader?.stats[statName];
                                  // % records aren't a "chase the leader" progress bar — only counting records show one.
                                  const p = (!isPct && leaderVal && rec.variant==="Career total") ? pct(leaderVal, rec.value) : null;
                                  return (
                                    <div key={rec.id} style={{ background:"#f9fafb",borderRadius:8,padding:12 }}>
                                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                                        <span style={{ background:groupColors[grpName]||"#eff6ff",color:groupTextColors[grpName]||"#1e3a5f",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600 }}>{isPct ? "Best %" : rec.variant}</span>
                                        <span style={{ fontSize:17,fontWeight:700,color:"#111" }}>{isPct ? `${rec.value}%` : rec.value.toLocaleString()}</span>
                                      </div>
                                      {group.map(r => r.holderName && (
                                        <div key={r.id} style={{ fontSize:12,color:"#6b7280" }}>🏅 {r.holderName}{r.holderYear?` · ${r.holderYear}`:""}</div>
                                      ))}
                                      {p!==null&&rec.variant==="Career total"&&(
                                        <div style={{ marginTop:8 }}>
                                          <div style={{ fontSize:11,color:"#6b7280",marginBottom:3 }}>{leader.name}: {leaderVal.toLocaleString()} ({p}%)</div>
                                          <ProgressBar value={leaderVal} max={rec.value} color={p>=85?"#f59e0b":"#1a56db"} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
            }
          </div>
        )}


        {/* MILESTONES TAB */}
        {activeTab==="milestones" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div>
                <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Milestone thresholds</h2>
                <p style={{ margin:"4px 0 0",fontSize:13,color:"#6b7280" }}>
                  Your school's custom celebration milestones — unique to {school.name}. Alerts fire when athletes approach each threshold.
                </p>
              </div>
              <button onClick={()=>setShowMilestoneSettings(true)}
                style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                Edit milestones
              </button>
            </div>

            {(() => {
              const userMilestones = (school.milestones && school.milestones.length > 0) ? school.milestones : DEFAULT_MILESTONES;
              // Coach Wins is always automatic and always last
              const COACH_WINS_MILESTONE = {
                id: "__coach_wins__", statName: "Coach Wins", alertPct: 90,
                values: [100,200,300,400,500,600,700,800,900,1000], _auto: true
              };
              const effectiveMilestones = [
                ...userMilestones
                  .filter(m => m.statName !== "Coach Wins"),
                COACH_WINS_MILESTONE,
              ];
              const sport2 = SPORTS[school.sport] || SPORTS.football;
              const groupColors2 = { "Passing":"#dbeafe","Rushing":"#dcfce7","Receiving":"#fef3c7","Other Offense":"#f3e8ff","Special Teams":"#ffedd5","Defense":"#fee2e2","General":"#f1f5f9" };
              const groupTextColors2 = { "Passing":"#1e40af","Rushing":"#166534","Receiving":"#92400e","Other Offense":"#6b21a8","Special Teams":"#c2410c","Defense":"#991b1b","General":"#334155" };
              const getGroup2 = (statName) => {
                if (!sport2.groups) return null;
                const g = sport2.groups.find(g => g.stats.some(s => s.name === statName));
                return g ? g.group : null;
              };

              const activeAthletes = school.athletes.filter(a => a.isActive !== false);

              // Build current head coach win total from seasons data for Coach Wins milestones
              const currentCoach = (school.seasons || [])
                .filter(s => s.coach)
                .sort((a, b) => b.season.localeCompare(a.season))[0]?.coach || null;
              const currentCoachWins = (school.seasons || [])
                .filter(s => s.coach === currentCoach)
                .reduce((sum, s) => sum + (s.wins || 0), 0)
                + (currentCoach && COACH_PRIOR_STATS[currentCoach] ? (COACH_PRIOR_STATS[currentCoach].wins || 0) : 0);
              const coachLeaders = currentCoach
                ? [{ id: currentCoach, name: currentCoach, wins: currentCoachWins }]
                : [];

              return effectiveMilestones.map(ms => {
                const isCoachWins = ms.statName === "Coach Wins";
                const grp = getGroup2(ms.statName);
                const bg = groupColors2[grp] || "#f1f5f9";
                const tc = groupTextColors2[grp] || "#334155";
                const sortedVals = [...ms.values].sort((a,b) => a-b);

                // Coach Wins: pull from seasons data. All other stats: pull from active athletes.
                // Each athlete appears on exactly one tile: the lowest target they haven't yet reached,
                // provided they've already passed the previous one.
                const leadersByVal = sortedVals.map((target, tIdx) => {
                  const prevTarget = tIdx > 0 ? sortedVals[tIdx - 1] : 0;
                  const isLastTile = tIdx === sortedVals.length - 1;
                  if (isCoachWins) {
                    const approaching = coachLeaders
                      .filter(c => {
                        const v = c.wins;
                        return v >= prevTarget && (isLastTile ? v >= prevTarget : v < target);
                      })
                      .map(c => ({ athlete: c, val: c.wins, p: c.wins / target }))
                      .filter(x => x.p >= 0.5)
                      .sort((a,b) => b.p - a.p)
                      .slice(0, 3);
                    return { target, approaching };
                  }
                  const approaching = activeAthletes
                    .filter(a => {
                      const val = a.stats[ms.statName];
                      if (typeof val !== "number") return false;
                      return val >= prevTarget && (isLastTile ? val >= prevTarget : val < target);
                    })
                    .map(a => ({ athlete: a, val: a.stats[ms.statName], p: a.stats[ms.statName] / target }))
                    .filter(x => x.p >= 0.5)
                    .sort((a,b) => b.p - a.p)
                    .slice(0, 3);
                  return { target, approaching };
                });

                return (
                  <div key={ms.id} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",marginBottom:12,overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px",borderBottom:"1px solid #f3f0ea",display:"flex",alignItems:"center",gap:10 }}>
                      {grp && <span style={{ background:bg,color:tc,borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:700 }}>{grp}</span>}
                      <span style={{ fontWeight:700,fontSize:15,color:"#111" }}>{ms.statName}</span>
                      <span style={{ fontSize:12,color:"#9ca3af",marginLeft:"auto" }}>Alert at {100 - ms.alertPct}% away</span>
                    </div>
                    <div style={{ padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8 }}>
                      {leadersByVal.map(({ target, approaching }) => (
                        <div key={target} style={{ background:"#f9fafb",borderRadius:8,padding:12 }}>
                          <div style={{ fontSize:20,fontWeight:700,color:"#111",marginBottom:6 }}>{target.toLocaleString()}</div>
                          {approaching.length === 0
                            ? <div style={{ fontSize:12,color:"#d1d5db" }}>No {isCoachWins ? "coaches" : "athletes"} in range yet</div>
                            : approaching.map(({ athlete, val, p }) => (
                              <div key={athlete.id} style={{ marginBottom:6 }}>
                                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2 }}>
                                  <span style={{ fontWeight:600,color: p >= 1 ? "#14532d" : "#111" }}>{athlete.name}</span>
                                  <span style={{ color: p >= 1 ? "#14532d" : "#6b7280" }}>{val.toLocaleString()}</span>
                                </div>
                                <ProgressBar value={val} max={target} color={p >= 1 ? "#22c55e" : p >= (ms.alertPct/100) ? "#f59e0b" : "#1a56db"} />
                              </div>
                            ))
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}

            <div style={{ background:"#f9fafb",borderRadius:10,border:"1px solid #e5e7eb",padding:14,marginTop:8,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:13,color:"#6b7280",flex:1 }}>
                {school.milestones && school.milestones.length > 0
                  ? `Using ${school.milestones.length} custom milestone${school.milestones.length!==1?"s":""} for ${school.name} · Coach wins tracked automatically.`
                  : "Using default milestones · Coach wins tracked automatically. Customize to match your program's standards."}
              </div>
              <button onClick={()=>setShowMilestoneSettings(true)}
                style={{ background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer",color:"#374151",whiteSpace:"nowrap" }}>
                Customize
              </button>
            </div>
          </div>
        )}

        {activeTab==="alerts" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Active milestone alerts</h2>
              <div style={{ display:"flex",gap:8 }}>
                {(school.dismissedAlerts||[]).length > 0 && (
                  <button onClick={restoreAlerts}
                    style={{ background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer" }}>
                    Restore {(school.dismissedAlerts||[]).length} dismissed
                  </button>
                )}
                <button onClick={()=>setShowEmailPreview(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>📧 Send all alerts</button>
              </div>
            </div>
            {allAlerts.length===0
              ? <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",padding:32,textAlign:"center",color:"#6b7280" }}>
                  {(school.dismissedAlerts||[]).length > 0
                    ? <div>All alerts dismissed. <button onClick={restoreAlerts} style={{ background:"none",border:"none",color:"#1a56db",cursor:"pointer",fontSize:14,textDecoration:"underline" }}>Restore {(school.dismissedAlerts||[]).length} dismissed alerts</button></div>
                    : "No active alerts. Athletes appear here when they reach 85% of any school record or round-number milestone."
                  }
                </div>
              : allAlerts.map(({athlete,alerts:ats})=>(
                <div key={athlete.id} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",padding:16,marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:15,color:"#111" }}>{athlete.name}</div>
                      <div style={{ fontSize:12,color:"#6b7280" }}>{athlete.position} · Class of {athlete.gradYear}</div>
                    </div>
                    <span style={{ background:"#fef3c7",color:"#92400e",borderRadius:12,padding:"3px 10px",fontSize:12,fontWeight:700 }}>
                      {ats.length} alert{ats.length>1?"s":""}
                    </span>
                  </div>
                  {ats.map((a,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:8,marginBottom:6 }}>
                      <div style={{ flex:1 }}>
                        <AlertBadge alert={a} mode="full" />
                      </div>
                      <button
                        onClick={() => dismissAlert(athlete.id, a.statName, a.target)}
                        title="Dismiss this alert"
                        style={{ flexShrink:0,marginTop:4,background:"none",border:"1px solid #e5e7eb",borderRadius:6,
                          padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#9ca3af",whiteSpace:"nowrap" }}>
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              ))
            }
          </div>
        )}


        {/* ALL-TIME TAB */}
        {activeTab==="all-time" && <AllTimeTab roster={school.allTimeRoster||[]} athletes={school.athletes} school={school} onUpdate={onUpdate} />}

        {/* SEASONS TAB */}
        {activeTab==="seasons" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#111"}}>Season history</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#6b7280"}}>
                  Every season on record for {school.name} {SPORTS[school.sport]?.label}
                </p>
              </div>
            </div>
            <SeasonsTab seasons={school.seasons} onSave={(updatedSeasons) => onUpdate({...school, seasons: updatedSeasons})} />
          </div>
        )}

        {activeTab==="hof" && (
          <HallOfFameTab school={school} allSchools={allSchools.length ? allSchools : [school]} onUpdate={onUpdate} />
        )}

        {activeTab==="export" && (
          <div>
            <h2 style={{ margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#111" }}>Export & integrations</h2>
            <p style={{ margin:"0 0 20px",fontSize:14,color:"#6b7280" }}>Generate spreadsheets and connect to stat platforms</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {[
                { icon:"📊",label:"Record-book spreadsheet",desc:"Full career stats in your format, one tab per stat category",status:"active" },
                { icon:"📧",label:"Weekly digest email",desc:"Auto-sent every Monday to coaches and ADs",status:"active" },
                { icon:"🔗",label:"MaxPreps sync",desc:"Automatic daily pull from MaxPreps",status:"coming" },
                { icon:"🎮",label:"Hudl integration",desc:"Connect Hudl for automatic stat import",status:"coming" },
                { icon:"⚾",label:"GameChanger sync",desc:"Baseball, softball and more via GameChanger API",status:"coming" },
                { icon:"📱",label:"Social milestone graphics",desc:"Auto-generated graphics for Instagram/Twitter when a record falls",status:"coming" }
              ].map(item=>(
                <div key={item.label} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",padding:16,display:"flex",gap:12,alignItems:"flex-start" }}>
                  <div style={{ fontSize:24,flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                      <div style={{ fontWeight:600,fontSize:14,color:"#111" }}>{item.label}</div>
                      <span style={{ fontSize:11,padding:"2px 8px",borderRadius:12,fontWeight:600,
                        background:item.status==="active"?"#f0fdf4":"#f3f4f6",
                        color:item.status==="active"?"#14532d":"#6b7280" }}>
                        {item.status==="active"?"✓ Active":"Coming soon"}
                      </span>
                    </div>
                    <div style={{ fontSize:13,color:"#6b7280" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const LS_KEY = "milestoneiq_v1";

function loadSchools() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  return SEED_SCHOOLS;
}

function saveSchools(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch(e) {}
}

// Settings → Billing card (admins only). Shows trial/plan status and opens the
// shared ChoosePlan picker (→ Stripe checkout) or the Stripe billing portal.
function BillingSection({ tier, status, trialEndsAt, onCheckout, onManageBilling, onRedeemCode, isPlatformOwner }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tierName = { program: "Program", school: "School", school_plus: "School Plus" }[tier] || "Program";
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / 86400000)) : null;
  const planLine = status === "active" ? `${tierName} plan · active`
    : status === "trialing" ? `Free trial${daysLeft != null ? ` — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : ""}`
    : status === "past_due" ? "Payment past due"
    : status === "canceled" ? "Subscription canceled"
    : (status || "—");
  const showErr = (e) => setErr(typeof e === "string" ? e : (e?.message || "Something went wrong"));
  const select = async (priceId, t, b) => { setBusy(true); setErr(""); const e = await onCheckout?.(priceId, t, b); setBusy(false); if (e) showErr(e); };
  const manage = async () => { setErr(""); const e = await onManageBilling?.(); if (e) showErr(e); };
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const redeem = async () => {
    if (!code.trim() || !onRedeemCode) return;
    setRedeeming(true); setErr(""); setRedeemMsg("");
    const { error, message } = await onRedeemCode(code.trim());
    setRedeeming(false);
    if (error) showErr(error); else { setRedeemMsg(message || "Applied!"); setCode(""); }
  };
  const errStyle = { background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#991b1b" };
  return (
    <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e8e4dd",marginBottom:20,overflow:"hidden" }}>
      <div style={{ padding:"14px 24px",borderBottom:"1px solid #f3f0ea",fontWeight:700,fontSize:15,color:"#111" }}>💳 Subscription &amp; billing</div>
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"14px 16px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,marginBottom:16 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:600,color:"#111" }}>{planLine}</div>
            <div style={{ fontSize:13,color:"#6b7280" }}>{status === "active" ? "You're subscribed. Pick a different plan below, or manage your card / cancel." : "Pick a plan below to subscribe — your data stays put either way."}</div>
          </div>
          {status === "active" && <button onClick={manage} style={{ background:"#fff",color:"#374151",border:"1px solid #d1d5db",borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>Manage billing</button>}
        </div>
        {err && <div style={{ ...errStyle, marginBottom:14 }}>{err}</div>}
        <ChoosePlan onSelect={select} busy={busy} initial={tier} currentTier={status === "active" ? tier : undefined} ctaLabel={status === "active" ? "Switch to selected plan →" : "Subscribe & continue →"} />
        <div style={{ borderTop:"1px solid #f3f0ea",marginTop:18,paddingTop:16 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#374151",marginBottom:6 }}>Have a beta or promo code?</div>
          {redeemMsg && <div style={{ background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#166534",marginBottom:8 }}>{redeemMsg}</div>}
          <div style={{ display:"flex",gap:8,maxWidth:420 }}>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Enter code"
              style={{ flex:1,border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14,textTransform:"uppercase" }} />
            <button onClick={redeem} disabled={redeeming || !code.trim()}
              style={{ background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:redeeming||!code.trim()?"default":"pointer",opacity:redeeming||!code.trim()?0.6:1 }}>
              {redeeming ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
        {isPlatformOwner && <PromoAdmin />}
      </div>
    </div>
  );
}

const pInp = (w) => ({ width: w, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13 });
function PField({ label, children }) {
  return <label style={{ display:"flex",flexDirection:"column",gap:3,fontSize:11,color:"#6b7280",fontWeight:600 }}>{label}{children}</label>;
}
function PromoAdmin() {
  const [codes, setCodes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code:"", kind:"trial_days", trialDays:90, grantTier:"", max:"", note:"" });
  const [msg, setMsg] = useState("");
  const load = async () => { const { data } = await listPromoCodes(); setCodes(data || []); };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.code.trim()) { setMsg("Enter a code."); return; }
    const { error } = await createPromoCode({
      code: form.code.trim(), kind: form.kind, trialDays: Number(form.trialDays) || 90,
      grantTier: form.grantTier || null, max: form.max ? Number(form.max) : null, note: form.note || null,
    });
    if (error) { setMsg(error.message || String(error)); return; }
    setMsg("✓ Saved"); setForm({ code:"", kind:"trial_days", trialDays:90, grantTier:"", max:"", note:"" }); load();
  };
  const toggle = async (c) => { await setPromoActive(c.code, !c.active); load(); };
  return (
    <div style={{ borderTop:"1px solid #f3f0ea",marginTop:18,paddingTop:16 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ fontSize:13,fontWeight:700,color:"#7c3aed" }}>🎟️ Promo codes (owner)</div>
        <span style={{ fontSize:12,color:"#9ca3af" }}>{open ? "Hide ▲" : "Manage ▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop:12 }}>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-end",marginBottom:12 }}>
            <PField label="Code"><input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="BETA90" style={pInp(120)} /></PField>
            <PField label="Type">
              <select value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value}))} style={pInp(130)}>
                <option value="trial_days">Free days</option>
                <option value="comp">Comp (full)</option>
              </select>
            </PField>
            {form.kind === "trial_days" && <PField label="Days"><input type="number" value={form.trialDays} onChange={e=>setForm(f=>({...f,trialDays:e.target.value}))} style={pInp(70)} /></PField>}
            <PField label="Tier (opt)">
              <select value={form.grantTier} onChange={e=>setForm(f=>({...f,grantTier:e.target.value}))} style={pInp(120)}>
                <option value="">— keep —</option>
                <option value="program">Program</option>
                <option value="program_plus">Program+</option>
                <option value="school">School</option>
                <option value="school_plus">School+</option>
              </select>
            </PField>
            <PField label="Max uses"><input type="number" value={form.max} onChange={e=>setForm(f=>({...f,max:e.target.value}))} placeholder="∞" style={pInp(70)} /></PField>
            <PField label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Launch beta" style={pInp(140)} /></PField>
            <button onClick={create} style={{ background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer" }}>Save code</button>
          </div>
          {msg && <div style={{ fontSize:12,color:"#6b7280",marginBottom:8 }}>{msg}</div>}
          {codes.length === 0 ? <div style={{ fontSize:13,color:"#9ca3af" }}>No codes yet.</div> : (
            <div style={{ border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden" }}>
              {codes.map((c,i) => (
                <div key={c.code} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",fontSize:13,borderBottom:i<codes.length-1?"1px solid #f3f4f6":"none",background:c.active?"#fff":"#f9fafb" }}>
                  <span style={{ fontWeight:700,fontFamily:"monospace",color:"#111" }}>{c.code}</span>
                  <span style={{ color:"#6b7280" }}>{c.kind === "comp" ? "Comp" : `${c.trial_days}d`}{c.grant_tier ? ` · ${c.grant_tier}` : ""}</span>
                  <span style={{ color:"#9ca3af",fontSize:12 }}>{c.redemptions}{c.max_redemptions ? `/${c.max_redemptions}` : ""} used</span>
                  {c.note && <span style={{ color:"#9ca3af",fontSize:12 }}>{c.note}</span>}
                  <button onClick={()=>toggle(c)} style={{ marginLeft:"auto",background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"2px 10px",fontSize:11,cursor:"pointer",color:c.active?"#991b1b":"#166534" }}>{c.active ? "Disable" : "Enable"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App({ initialSchools, onUpdateSchool, orgId, tier, tierLimits, userEmail, onSignOut, role, userName, userId, userPhone, subscriptionStatus, trialEndsAt, onCheckout, onManageBilling, onRedeemCode, isPlatformOwner } = {}) {
  const supabaseMode = !!orgId;
  // "authed" = rendered by AppWrapper (the user is logged in), even if they have no org yet.
  // For ANY logged-in user, schools come ONLY from the DB (initialSchools). We must NEVER
  // fall back to SEED_SCHOOLS / localStorage, or a brand-new account with no org would be
  // shown Denver Christian's seed data. AppWrapper always passes userEmail + onUpdateSchool.
  const authed = !!(orgId || userEmail || onUpdateSchool);
  const [schools, setSchoolsRaw] = useState(() => authed ? (initialSchools || []) : loadSchools());
  const [activeSchool, setActiveSchool] = useState(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [homeTab, setHomeTab] = useState(() => {
    try { return sessionStorage.getItem("mq_tab") || "schools"; } catch (e) { return "schools"; }
  });
  // Remember the active tab so any reload (e.g. saving your name) returns you here
  // instead of bouncing to the home page.
  useEffect(() => { try { sessionStorage.setItem("mq_tab", homeTab); } catch (e) {} }, [homeTab]);

  useEffect(() => {
    if (authed) {
      setSchoolsRaw(initialSchools || []);
      try { localStorage.removeItem(LS_KEY); } catch(e) {}   // purge any stale demo cache in this browser
    }
  }, [authed, initialSchools]);

  // Remember which program is open so a reload returns to it (not the home page). The persist
  // effect only WRITES (never clears) so the initial null render before restore can't wipe the
  // saved id; clearing happens explicitly on Back / sign-out.
  useEffect(() => {
    try { if (activeSchool) sessionStorage.setItem("mq_school", String(activeSchool.id)); } catch (e) {}
  }, [activeSchool]);
  // On (re)load, reopen the last program once schools are available.
  useEffect(() => {
    if (activeSchool || !schools.length) return;
    let savedId = null;
    try { savedId = sessionStorage.getItem("mq_school"); } catch (e) {}
    if (!savedId) return;
    const sc = schools.find(s => String(s.id) === savedId);
    if (sc) setActiveSchool(sc);
  }, [schools, activeSchool]);

  const setSchools = useCallback((updater) => {
    setSchoolsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!authed) saveSchools(next);   // localStorage cache only in true standalone/demo
      return next;
    });
  }, [authed]);

  const updateSchool = useCallback((updated) => {
    setSchools(s => s.map(sc => sc.id===updated.id ? updated : sc));
    // Keep the dashboard in sync ONLY if it's already open — never navigate INTO a
    // school view from elsewhere (e.g. editing a logo on the Settings page).
    setActiveSchool(prev => (prev && prev.id === updated.id) ? updated : prev);
    if (onUpdateSchool) onUpdateSchool(updated);   // persist this program to Supabase
  }, [setSchools, onUpdateSchool]);

  const handleSignOut = useCallback(() => {
    try { sessionStorage.removeItem("mq_tab"); sessionStorage.removeItem("mq_school"); sessionStorage.removeItem("mq_dash_tab"); } catch (e) {}   // fresh start (home) on next login
    if (onSignOut) onSignOut();
    else signOut().then(() => window.location.reload());
  }, [onSignOut]);

  if (activeSchool) {
    return <SchoolDashboard school={activeSchool} allSchools={schools} onBack={()=>{ setActiveSchool(null); try { sessionStorage.removeItem("mq_school"); } catch (e) {} }} onUpdate={updateSchool} />;
  }

  const totalAlerts = schools.reduce((acc,sc) => {
    const dismissed = new Set(sc.dismissedAlerts || []);
    return acc + sc.athletes
      .filter(a => a.isActive !== false)
      .reduce((a, athlete) =>
        a + getMilestoneAlerts(athlete, sc.records||[], sc.milestones||[])
          .filter(al => !dismissed.has(`${athlete.id}|${al.statName}|${al.target}`)).length
      , 0);
  }, 0);

  // ── Settings page ─────────────────────────────────────────────────────────
  const SettingsPage = () => {
    const Section = ({ title, children }) => (
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e8e4dd",marginBottom:20,overflow:"hidden" }}>
        <div style={{ padding:"14px 24px",borderBottom:"1px solid #f3f0ea",fontWeight:700,fontSize:15,color:"#111" }}>{title}</div>
        <div style={{ padding:"20px 24px" }}>{children}</div>
      </div>
    );

    const Field = ({ label, hint, children }) => (
      <div style={{ marginBottom:20 }}>
        <label style={{ display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:4 }}>{label}</label>
        {hint && <p style={{ margin:"0 0 6px",fontSize:12,color:"#9ca3af" }}>{hint}</p>}
        {children}
      </div>
    );

    const Input = ({ placeholder, defaultValue, type="text" }) => (
      <input type={type} defaultValue={defaultValue} placeholder={placeholder}
        style={{ width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14,boxSizing:"border-box",color:"#111" }} />
    );

    const SaveBtn = ({ label="Save changes" }) => (
      <button style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:600,fontSize:13,cursor:"pointer",marginTop:4 }}>
        {label}
      </button>
    );

    // School roster now loads live from the database via <MembersSection/>.

    return (
      <div style={{ padding:24, maxWidth:760, margin:"0 auto" }}>

        {/* Account */}
        <Section title="👤 Account">
          <AccountSection userId={userId} userName={userName} userEmail={userEmail} userPhone={userPhone} tier={tier} onSignOut={handleSignOut} />
        </Section>

        {/* Password */}
        <Section title="🔒 Password">
          <PasswordSection userEmail={userEmail} />
        </Section>

        {/* Users & Access */}
        <Section title="👥 Users & access">
          <MembersSection orgId={orgId} role={role} userId={userId} programs={schools} tierLimits={tierLimits} />
        </Section>

        {role === "admin" && <BillingSection tier={tier} status={subscriptionStatus} trialEndsAt={trialEndsAt} onCheckout={onCheckout} onManageBilling={onManageBilling} onRedeemCode={onRedeemCode} isPlatformOwner={isPlatformOwner} />}

        {/* Notifications */}
        <Section title="🔔 Notifications">
          <div style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10 }}>
            <span style={{ fontSize:22 }}>✅</span>
            <div>
              <div style={{ fontSize:14,fontWeight:600,color:"#111" }}>Email alerts are on</div>
              <div style={{ fontSize:13,color:"#6b7280" }}>Open any program and click <strong>📧 Send alerts</strong> to email this program's coaches and your AD about every active athlete approaching or breaking a record, or reaching a milestone. You'll see a preview first, and each alert is only sent once (we won't re-send the same one). Text (SMS) alerts are coming later.</div>
            </div>
          </div>
        </Section>

        {/* School settings */}
        <Section title="🏫 Program settings">
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {schools.map(sc => {
              const handleLogoUpload = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => updateSchool({ ...sc, logo: ev.target.result });
                reader.readAsDataURL(file);
              };
              const removeLogo = () => updateSchool({ ...sc, logo: null });
              return (
                <div key={sc.id} style={{ background:"#f9fafb",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px" }}>
                    <div style={{ width:40,height:40,borderRadius:8,background:sc.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,overflow:"hidden",flexShrink:0 }}>
                      {sc.logo
                        ? <img src={sc.logo} alt={sc.name} style={{ width:"100%",height:"100%",objectFit:"contain",padding:3 }} />
                        : SPORTS[sc.sport]?.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:600,color:"#111" }}>{sc.name}</div>
                      <div style={{ fontSize:12,color:"#6b7280" }}>{sc.mascot} · {SPORTS[sc.sport]?.label}</div>
                    </div>
                    <button style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#374151" }}>Edit</button>
                    <button onClick={async ()=>{
                        if(!window.confirm(`⚠️ Permanently delete the ${SPORTS[sc.sport]?.label||""} program "${sc.mascot||sc.name}"?\n\nThis ALSO deletes every athlete, all-time player, record, season, and milestone in it. This CANNOT be undone and the data is lost for good.`)) return;
                        const { error } = await deleteProgram(sc.id);
                        if(error){ alert("Could not delete program: "+(error.message||error)); return; }
                        setSchools(prev => prev.filter(x => x.id !== sc.id));
                        setActiveSchool(a => a && a.id===sc.id ? null : a);
                      }}
                      style={{ background:"none",border:"1px solid #fca5a5",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#991b1b" }}>Delete</button>
                  </div>
                  <div style={{ borderTop:"1px solid #e5e7eb",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#fff" }}>
                    <span style={{ fontSize:12,color:"#6b7280",fontWeight:600 }}>Logo</span>
                    {sc.logo
                      ? <>
                          <img src={sc.logo} alt="logo" style={{ width:32,height:32,objectFit:"contain",borderRadius:4,border:"1px solid #e5e7eb" }} />
                          <span style={{ fontSize:12,color:"#374151" }}>Logo uploaded</span>
                          <button onClick={removeLogo} style={{ background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",color:"#991b1b",marginLeft:"auto" }}>Remove</button>
                        </>
                      : <>
                          <span style={{ fontSize:12,color:"#9ca3af" }}>No logo — sport icon is used</span>
                          <label style={{ marginLeft:"auto",background:"#eff6ff",color:"#1a56db",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                            ↑ Upload logo
                            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:"none" }} />
                          </label>
                        </>
                    }
                  </div>
                  {role === "admin" && <ProgramCoaches programId={sc.id} orgId={orgId} tierLimits={tierLimits} />}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="⚠️ Danger zone">
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {!orgId && (
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",border:"1px solid #fcd34d",borderRadius:10,background:"#fffbeb" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:"#92400e" }}>Reset to demo data</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>Wipe all changes and reload the original sample data.</div>
              </div>
              <button onClick={()=>{ if(window.confirm("Reset everything to the original demo data? All your changes will be lost.")) { localStorage.removeItem(LS_KEY); window.location.reload(); } }}
                style={{ background:"#92400e",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>Reset data</button>
            </div>
            )}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",border:"1px solid #fca5a5",borderRadius:10,background:"#fff5f5" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:"#991b1b" }}>Delete account</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>Permanently delete your account and all data. This cannot be undone.</div>
              </div>
              <button onClick={async ()=>{ if(!window.confirm("Permanently delete your account and sign out? This cannot be undone.")) return; const { error } = await deleteMyAccount(); if(error){ alert("Could not delete account: "+(error.message || error.hint || error.code || JSON.stringify(error))); return; } try { sessionStorage.removeItem("mq_tab"); } catch(e){} await signOut(); window.location.href = "/"; }}
                style={{ background:"#991b1b",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>Delete account</button>
            </div>
          </div>
        </Section>

      </div>
    );
  };

  return (
    <div style={{ fontFamily:"Georgia, serif", minHeight:"100vh", background:"#f8f7f4" }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
      {showAddSchool && <AddSchoolModal onClose={()=>setShowAddSchool(false)} existingSports={schools.map(sc=>sc.sport)} onAdd={async (s)=>{
        if (orgId) {
          if (tierLimits && schools.length >= tierLimits.maxPrograms) {
            alert(`Your ${({program:"Program",school:"School",school_plus:"School Plus"}[tier]||"current")} plan includes ${tierLimits.maxPrograms} program${tierLimits.maxPrograms===1?"":"s"}. Upgrade to add more.`);
            return;
          }
          const { data, error } = await createProgram(orgId, { name:s.name, mascot:s.mascot, sport:s.sport, primary_color:s.primaryColor, logo_url:null });
          if (error || !data) { alert("Could not create program: "+(error?.message||"unknown error")); return; }
          setSchools(sc=>[...sc, { id:data.id, name:data.name, mascot:data.mascot, sport:data.sport, primaryColor:data.primary_color, logo:data.logo_url, athletes:[], allTimeRoster:[], records:[], milestones:[], seasons:[], coachHof:{}, dismissedAlerts:[] }]);
        } else {
          setSchools(sc=>[...sc, { ...s, allTimeRoster:s.allTimeRoster||[], milestones:s.milestones||[], seasons:s.seasons||[] }]);
        }
      }} />}

      <div style={{ background:"#111",padding:"0 24px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:16,height:56 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <img src={raftersLogo} alt="RaftersIQ" style={{ width:36,height:36,objectFit:"contain" }} />
            <span style={{ color:"#fff",fontWeight:700,fontSize:18,fontFamily:"Crimson Pro,serif" }}>RaftersIQ</span>
          </div>
          <div style={{ display:"flex",gap:0,marginLeft:16,border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,overflow:"hidden" }}>
            {[["schools","Programs"],["settings","Settings"]].map(([tab,label]) => (
              <button key={tab} onClick={()=>setHomeTab(tab)}
                style={{ padding:"6px 18px",fontSize:13,fontWeight:homeTab===tab?600:400,cursor:"pointer",border:"none",
                  background:homeTab===tab?"rgba(255,255,255,0.15)":"transparent",
                  color:homeTab===tab?"#fff":"rgba(255,255,255,0.55)" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex:1 }} />
          {totalAlerts>0&&<div style={{ background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700 }}>🔔 {totalAlerts} active alerts</div>}
          <div style={{ background:"#1e293b",color:"#94a3b8",borderRadius:20,padding:"4px 14px",fontSize:12 }}>⭐ {({program:"Program",school:"School",school_plus:"School Plus"}[tier]||"Program")} plan</div>
          {userEmail && <div style={{ color:"rgba(255,255,255,0.55)",fontSize:12 }}>{userEmail}</div>}
          <button onClick={handleSignOut}
            style={{ background:"none",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",color:"rgba(255,255,255,0.7)",fontWeight:600 }}>
            Sign out
          </button>
        </div>
      </div>

      {homeTab === "settings" ? <SettingsPage /> : (
        <div style={{ padding:24 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20 }}>
            <div>
              <h1 style={{ margin:0,fontSize:28,fontWeight:700,color:"#111" }}>Your programs</h1>
              <p style={{ margin:"4px 0 0",fontSize:14,color:"#6b7280" }}>
                {schools.length} program{schools.length!==1?"s":""} · {schools.reduce((a,s)=>a+s.athletes.filter(a=>a.isActive!==false).length,0)} athletes · {totalAlerts} active alerts
              </p>
            </div>
            {role === "admin" && <button onClick={()=>setShowAddSchool(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:14,cursor:"pointer" }}>+ Add program</button>}
          </div>

          {supabaseMode && schools.length===0 && new URLSearchParams(window.location.search).get("seed")==="dc" && (
            <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:20,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:15,color:"#1e40af",marginBottom:2 }}>Load Denver Christian historical data</div>
                <div style={{ fontSize:13,color:"#3b5b8c" }}>One-time import: all programs, the full all-time roster, records, and season history.</div>
              </div>
              <button onClick={async ()=>{
                if(!window.confirm("Import the full Denver Christian historical dataset into this account? This is a one-time setup action.")) return;
                try { await seedDCPrograms(orgId, SEED_SCHOOLS); window.location.reload(); }
                catch(e){ alert("Import failed: "+(e?.message||e)); }
              }} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:14,cursor:"pointer",whiteSpace:"nowrap" }}>
                Load data
              </button>
            </div>
          )}

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
            {schools.map(school=>{
              const sport = SPORTS[school.sport]||SPORTS.football;
              const dismissed = new Set(school.dismissedAlerts || []);
              const alerts = school.athletes
                .filter(a => a.isActive !== false)
                .reduce((a,athlete) =>
                  a + getMilestoneAlerts(athlete,school.records||[],school.milestones||[])
                    .filter(al => !dismissed.has(`${athlete.id}|${al.statName}|${al.target}`)).length
                , 0);
              const topAthlete = [...school.athletes].filter(a=>a.isActive!==false).sort((a,b)=>{
                const at=Object.values(a.stats).filter(v=>typeof v==="number").reduce((x,y)=>x+y,0);
                const bt=Object.values(b.stats).filter(v=>typeof v==="number").reduce((x,y)=>x+y,0);
                return bt-at;
              })[0];
              return (
                <div key={school.id} onClick={()=>setActiveSchool(school)}
                  style={{ background:"#fff",borderRadius:14,border:"1px solid #e8e4dd",overflow:"hidden",cursor:"pointer",transition:"transform 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                  <div style={{ background:school.primaryColor,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      {school.logo
                        ? <img src={school.logo} alt={school.name} style={{ width:48,height:48,borderRadius:8,objectFit:"contain",background:"rgba(255,255,255,0.15)",padding:4 }} />
                        : <div style={{ width:48,height:48,borderRadius:8,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{sport.icon}</div>
                      }
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.7)",fontSize:12,marginBottom:2 }}>{sport.icon} {sport.label}</div>
                        <div style={{ color:"#fff",fontWeight:700,fontSize:17 }}>{school.name}</div>
                        <div style={{ color:"rgba(255,255,255,0.7)",fontSize:12 }}>{school.mascot.replace(/\s*\(.*?\)/g,"")}</div>
                      </div>
                    </div>
                    {alerts>0&&<div style={{ background:"#fef3c7",color:"#92400e",borderRadius:12,padding:"4px 10px",fontSize:13,fontWeight:700 }}>🔔 {alerts}</div>}
                  </div>
                  <div style={{ padding:16 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
                      {[[school.athletes.filter(a=>a.isActive!==false).length,"athletes"],
                    [(school.allTimeRoster||[]).filter(p=>p.schoolHallOfFame||p.stateHallOfFame).length||null,"HOF"],[alerts,"alerts"],[(school.records||[]).length,"records"]].map(([v,l])=>(
                        <div key={l} style={{ textAlign:"center",background:"#f9fafb",borderRadius:8,padding:"8px 4px" }}>
                          <div style={{ fontWeight:700,fontSize:18,color:"#111" }}>{v}</div>
                          <div style={{ fontSize:11,color:"#9ca3af" }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {topAthlete&&(
                      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#f9fafb",borderRadius:8 }}>
                        <div style={{ width:28,height:28,borderRadius:"50%",background:school.primaryColor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:school.primaryColor }}>
                          {topAthlete.name.split(" ").map(n=>n[0]).join("")}
                        </div>
                        <div>
                          <div style={{ fontSize:12,fontWeight:600,color:"#111" }}>{topAthlete.name}</div>
                          <div style={{ fontSize:11,color:"#9ca3af" }}>Top athlete by total stats</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {role === "admin" && (
            <div onClick={()=>setShowAddSchool(true)}
              style={{ borderRadius:14,border:"2px dashed #d1d5db",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,cursor:"pointer",color:"#9ca3af",minHeight:160,transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#1a56db"; e.currentTarget.style.color="#1a56db"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#9ca3af"; }}>
              <div style={{ fontSize:32,marginBottom:8 }}>+</div>
              <div style={{ fontWeight:600,fontSize:14 }}>Add program</div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}