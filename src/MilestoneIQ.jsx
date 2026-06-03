import { useState, useCallback, useEffect, useMemo } from "react";
import { signOut } from "./supabase_client";

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
    label: "Soccer", icon: "⚽",
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

  const handleCSVFile = (file) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try { setPreview(parseCSV(e.target.result)); }
      catch (err) { setError(err.message); }
    };
    reader.readAsText(file);
  };

  const handlePDFFile = async (file) => {
    setError(null); setPdfLoading(true); setPdfResult(null); setPdfFileName(file.name);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: `Extract all athlete stats from this document. Return ONLY valid JSON, no markdown:
{"athletes":[{"name":"Full Name","position":"Position or empty","gradYear":2025,"stats":{"Stat Name":numericValue}}]}
Rules: numeric stats only, exact stat names from document, unknown grad year = ${new Date().getFullYear()+2}, include every athlete and stat found.` }
            ]
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!parsed.athletes?.length) throw new Error("No athletes found in this PDF.");
      setPdfResult(parsed.athletes);
    } catch (err) {
      setError("Could not parse PDF: " + (err.message || "Try a CSV instead."));
    } finally { setPdfLoading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith(".csv")) { setActiveTab("csv"); handleCSVFile(file); }
    else if (file.name.endsWith(".pdf")) { setActiveTab("pdf"); handlePDFFile(file); }
    else setError("Please drop a .csv or .pdf file");
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

  const downloadTemplate = () => {
    const blob = new Blob([tpl.headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${school.name.replace(/\s+/g,"_")}_${school.sport}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,width:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#111" }}>Import stats — {school.name}</h2>
            <p style={{ margin:"4px 0 0",fontSize:13,color:"#666" }}>Upload a CSV or let AI extract stats from any PDF</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#666" }}>✕</button>
        </div>

        <div style={{ display:"flex",gap:0,marginBottom:20,border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden" }}>
          {[["csv","📄 CSV file"],["pdf","🤖 AI PDF import"]].map(([tab,label]) => (
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
              <div style={{ fontWeight:600,color:"#333",marginBottom:4 }}>Drop your CSV here</div>
              <div style={{ fontSize:13,color:"#888",marginBottom:12 }}>or click to browse</div>
              <input type="file" accept=".csv" onChange={e=>e.target.files[0]&&handleCSVFile(e.target.files[0])} style={{ display:"none" }} id="csv-input" />
              <label htmlFor="csv-input" style={{ background:"#1a56db",color:"#fff",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>Choose CSV</label>
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
                ⬇ Download template CSV
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
                <div style={{ fontWeight:600,color:"#333",marginBottom:4 }}>Drop your PDF here</div>
                <div style={{ fontSize:13,color:"#888",marginBottom:16 }}>Stat sheets, program booklets, MaxPreps exports — any format</div>
                <input type="file" accept=".pdf" onChange={e=>e.target.files[0]&&handlePDFFile(e.target.files[0])} style={{ display:"none" }} id="pdf-input" />
                <label htmlFor="pdf-input" style={{ background:"#1a56db",color:"#fff",padding:"10px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600 }}>Choose PDF</label>
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
  const [sent, setSent] = useState(false);
  const sport = SPORTS[school.sport] || SPORTS.football;
  const totalAlerts = allAlerts.reduce((a, x) => a + x.alerts.length, 0);

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
            <div style={{ fontSize:11,opacity:0.8,marginBottom:2 }}>FROM: alerts@milestoneiq.com</div>
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
            <p style={{ fontSize:13,color:"#6b7280",marginTop:8 }}>Generated automatically by MilestoneIQ.</p>
          </div>
        </div>
        {sent
          ? <div style={{ background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:12,textAlign:"center",color:"#14532d",fontWeight:600 }}>✓ Alert sent to coaching staff</div>
          : <button onClick={()=>setSent(true)} style={{ width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14,cursor:"pointer" }}>Send alert now</button>
        }
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
function AddSchoolModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:"", mascot:"", sport:"football", primaryColor:"#1a3a6b" });
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
            {Object.entries(SPORTS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <button onClick={()=>{ if(form.name){ onAdd({ id:`s${Date.now()}`, ...form, athletes:[], records:[] }); onClose(); }}}
          style={{ width:"100%",background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:11,fontWeight:600,fontSize:14,cursor:"pointer" }}>
          Add program
        </button>
      </div>
    </div>
  );
}

// ── School Dashboard ───────────────────────────────────────────────────────────
// 63 total players in DC football program history
const DC_FOOTBALL_ALL_TIME = [
  {id:"ft1", name:"Alex Monzon", firstYear:"2010-2011", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":3}},
  {id:"ft2", name:"Allen Opie", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":90, "Fumbles Recovered":1}},
  {id:"ft3", name:"Ben Borger", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":27}},
  {id:"ft4", name:"Brad Lenderink", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":80, "Fumbles Recovered":2}},
  {id:"ft5", name:"Brian Fedders", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":9, "Wins":11, "Combined Tackles":7}},
  {id:"ft6", name:"Cary Van Norden", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":1}},
  {id:"ft7", name:"Collin Barr", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Pass Attempts":22, "Passing Yards":33, "Rushing Yards":349, "Rushing TDs":5, "Receiving Yards":54, "Total Yards":613, "Total TDs":6, "Combined Tackles":59, "Interceptions":1, "Fumbles Recovered":1, "Passes Defended":3, "Punt Return Yards":50, "Kick Returns":2}},
  {id:"ft8", name:"Craig Top", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Pass Attempts":11, "Passing Yards":42, "Passing TDs":1, "Rushing Yards":352, "Rushing TDs":8, "Receiving Yards":46, "Total Yards":1075, "Total TDs":8, "Combined Tackles":88, "Interceptions":1, "Fumbles Recovered":1, "Extra Points Made":2, "Punt Return Yards":10, "Kick Returns":185}},
  {id:"ft9", name:"Dale Wayne", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Total TDs":1, "Combined Tackles":54, "Interceptions":1, "Punt Return Yards":2}},
  {id:"ft10", name:"Dan Anema", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Rushing Yards":1, "Combined Tackles":4, "Extra Points Made":20, "Kick Return Yards":1440}},
  {id:"ft11", name:"Dan Lammers", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Rushing Yards":84, "Rushing TDs":1, "Total Yards":544, "Total TDs":1, "Combined Tackles":165, "Fumbles Recovered":4, "Passes Defended":1, "Kick Returns":280}},
  {id:"ft12", name:"Dan Vanden Burg", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":7}},
  {id:"ft13", name:"Darrell Olson", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Combined Tackles":3}},
  {id:"ft14", name:"Dave Afman", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":78, "Fumbles Recovered":1}},
  {id:"ft15", name:"Dave Hanenburg", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":3}},
  {id:"ft16", name:"Demetrius Lujan", firstYear:"2013-2014", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":8, "Wins":1, "Pass Attempts":1}},
  {id:"ft17", name:"Don Gibson", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":19, "Fumbles Recovered":1}},
  {id:"ft18", name:"Don Lammers", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Rushing Yards":17, "Rushing TDs":3, "Total Yards":378, "Total TDs":3, "Combined Tackles":227, "Interceptions":3, "Fumbles Recovered":1, "Passes Defended":1, "Kick Returns":6}},
  {id:"ft19", name:"Don Van Zytveld", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Receiving Yards":196, "Receiving TDs":4, "Total TDs":1, "Combined Tackles":58, "Fumbles Recovered":1, "Extra Points Made":1, "Punting Yards":2303, "Punt Return Yards":2, "Kick Return Yards":1440}},
  {id:"ft20", name:"Doug Pousma", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":14, "Fumbles Recovered":1}},
  {id:"ft21", name:"Eric Keesen", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Pass Attempts":215, "Passing Yards":1429, "Passing TDs":14, "Rushing Yards":87, "Rushing TDs":1, "Total TDs":1, "Combined Tackles":52, "Interceptions":5, "Fumbles Recovered":4, "Passes Defended":1}},
  {id:"ft22", name:"Glenn Paauw", firstYear:"1975-1976", lastYear:"1975-1976", isCurrent:false, stats:{"Combined Tackles":177}},
  {id:"ft23", name:"Greg Afman", firstYear:"2000-2001", lastYear:"2010-2011", isCurrent:false, stats:{"Punting Yards":2097.9}},
  {id:"ft24", name:"Greg Ham", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Pass Attempts":83, "Passing Yards":335, "Passing TDs":2, "Rushing Yards":161, "Receiving Yards":663, "Total Yards":376, "Total TDs":2, "Combined Tackles":67, "Interceptions":7, "Fumbles Recovered":3, "Passes Defended":9, "Punt Return Yards":50, "Kick Returns":280}},
  {id:"ft25", name:"Greg Lucht", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Rushing Yards":23, "Combined Tackles":87, "Passes Defended":2, "Punting Yards":570}},
  {id:"ft26", name:"Herman Aardsma", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Combined Tackles":53, "Passes Defended":1}},
  {id:"ft27", name:"Jim Hardin", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Combined Tackles":16, "Passes Defended":1}},
  {id:"ft28", name:"Jim Medema", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":9, "Wins":11, "Combined Tackles":7}},
  {id:"ft29", name:"Joe Koops", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":16}},
  {id:"ft30", name:"Joel Perri", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":100, "Fumbles Recovered":1, "Extra Points Made":1}},
  {id:"ft31", name:"John Hardin", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Rushing Yards":324, "Rushing TDs":2, "Receiving Yards":3, "Total Yards":140, "Total TDs":2, "Combined Tackles":32, "Interceptions":1, "Fumbles Recovered":3, "Passes Defended":2, "Punt Return Yards":1, "Kick Returns":190}},
  {id:"ft32", name:"Josh VanEps", firstYear:"2001-2002", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":8, "Wins":1, "Pass Attempts":0.5, "Passing Yards":482, "Passing TDs":6, "Rushing Yards":2001}},
  {id:"ft33", name:"Keith Aardema", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Rushing Yards":1, "Receiving Yards":150, "Receiving TDs":4, "Total Yards":652, "Total TDs":4, "Combined Tackles":83, "Fumbles Recovered":2, "Passes Defended":5, "Extra Points Made":2, "Kick Returns":18}},
  {id:"ft34", name:"Keith Anema", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Pass Attempts":2, "Passing Yards":3}},
  {id:"ft35", name:"Keith Katte", firstYear:"1976-1977", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Rushing Yards":864, "Receiving Yards":54, "Total Yards":138, "Total TDs":17, "Combined Tackles":18, "Passes Defended":2, "Punting Yards":82, "Punt Return Yards":10, "Kick Return Yards":48, "Kick Returns":18}},
  {id:"ft36", name:"Ken Anderson", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":7}},
  {id:"ft37", name:"Kent Hamstra", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Rushing Yards":176, "Rushing TDs":1, "Receiving Yards":3, "Total Yards":181, "Total TDs":1, "Combined Tackles":167, "Interceptions":5, "Fumbles Recovered":2, "Kick Returns":2}},
  {id:"ft38", name:"Kent Spoelstra", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Combined Tackles":106, "Fumbles Recovered":2}},
  {id:"ft39", name:"Kevin Stark", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Receiving Yards":9, "Receiving TDs":4, "Total Yards":201, "Total TDs":4, "Combined Tackles":79, "Interceptions":1, "Kick Returns":185}},
  {id:"ft40", name:"Lee Poulette", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Rushing Yards":112, "Receiving Yards":3, "Total Yards":53, "Combined Tackles":93, "Interceptions":7, "Passes Defended":1, "Extra Points Made":2, "Kick Returns":145}},
  {id:"ft41", name:"Mark Davids", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Pass Attempts":24, "Passing Yards":162, "Passing TDs":2, "Rushing Yards":8, "Combined Tackles":3, "Interceptions":1, "Fumbles Recovered":1}},
  {id:"ft42", name:"Mark Spinder", firstYear:"1979-1980", lastYear:"1981-1982", isCurrent:false, stats:{"Games Played":9, "Wins":11, "Rushing Yards":7, "Total TDs":16, "Combined Tackles":7, "Interceptions":3, "Kick Returns":2}},
  {id:"ft43", name:"Mark Van Beek", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":123, "Fumbles Recovered":1}},
  {id:"ft44", name:"Mike Hogan", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Rushing Yards":415, "Receiving Yards":102, "Total Yards":89, "Combined Tackles":64, "Passes Defended":2}},
  {id:"ft45", name:"Mike Van Wyk", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Combined Tackles":62, "Fumbles Recovered":2, "Field Goals Made":1, "Extra Points Made":1, "Kick Return Yards":390}},
  {id:"ft46", name:"Paul Gunnink", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":9, "Wins":11, "Combined Tackles":7, "Kick Returns":2}},
  {id:"ft47", name:"Randy Rosendale", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Receiving Yards":27, "Total Yards":37, "Total TDs":1, "Combined Tackles":11}},
  {id:"ft48", name:"Randy Van Roekel", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Rushing Yards":19, "Combined Tackles":7, "Punt Return Yards":61, "Kick Returns":2}},
  {id:"ft49", name:"Ray Vander Wal", firstYear:"1975-1976", lastYear:"1975-1976", isCurrent:false, stats:{"Passing Yards":1386}},
  {id:"ft50", name:"Reed VandenBroeke", firstYear:"2001-2002", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":17, "Wins":1, "Pass Attempts":0.4, "Passing Yards":23}},
  {id:"ft51", name:"Roger Van Gelder", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Combined Tackles":23, "Kick Return Yards":1440}},
  {id:"ft52", name:"Ron Andersen", firstYear:"1983-1984", lastYear:"2001-2002", isCurrent:false, stats:{"Rushing Yards":8.3, "Total Yards":1539}},
  {id:"ft53", name:"Scott Shannon", firstYear:"2001-2002", lastYear:"2001-2002", isCurrent:false, stats:{"Extra Points Made":23}},
  {id:"ft54", name:"Scott Stevenson", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":9, "Wins":11, "Receiving Yards":54, "Receiving TDs":4, "Total TDs":1, "Combined Tackles":7}},
  {id:"ft55", name:"Steve Wolffis", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":9, "Wins":1, "Pass Attempts":5, "Passing Yards":81, "Rushing Yards":1376, "Receiving Yards":1067, "Total Yards":263, "Combined Tackles":51, "Interceptions":1, "Passes Defended":4, "Punt Return Yards":107, "Kick Returns":190}},
  {id:"ft56", name:"Tate Kastens", firstYear:"2000-2001", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":34, "Wins":15, "Pass Attempts":0.5, "Passing Yards":28.1, "Passing TDs":22, "Rushing Yards":1978, "Rushing TDs":104.5, "Receiving Yards":2250, "Receiving TDs":124.1, "Total Yards":89.2, "Total TDs":42, "Combined Tackles":25.6, "Interceptions":4, "Fumbles Forced":11, "Punting Yards":2066.8, "Punt Return Yards":17.8}},
  {id:"ft57", name:"Terry Van Roskel", firstYear:"1975-1976", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":27, "Wins":12, "Rushing Yards":521, "Rushing TDs":10, "Receiving Yards":33, "Total Yards":644, "Total TDs":10, "Combined Tackles":87, "Fumbles Recovered":1, "Punt Return Yards":2, "Kick Returns":2}},
  {id:"ft58", name:"Tim Bylsma", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":58, "Fumbles Recovered":1}},
  {id:"ft59", name:"Tim Spykstra", firstYear:"1983-1984", lastYear:"1983-1984", isCurrent:false, stats:{"Receiving Yards":663, "Interceptions":9}},
  {id:"ft60", name:"Tim Spykstra*", firstYear:"1983-1984", lastYear:"1983-1984", isCurrent:false, stats:{"Receiving Yards":40}},
  {id:"ft61", name:"Tobey Schneider", firstYear:"2008-2009", lastYear:"2009-2010", isCurrent:false, stats:{"Field Goals Made":1978}},
  {id:"ft62", name:"Tom Lenderink", firstYear:"1971-1972", lastYear:"1971-1972", isCurrent:false, stats:{"Fumbles Forced":7}},
  {id:"ft63", name:"Troy Van Wyke", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":18, "Wins":11, "Combined Tackles":9, "Passes Defended":1}},
];

// 195 total players in program history
const DC_GIRLS_ALL_TIME = [
  {id:"ht1", name:"Aaliyah Borger", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Wins":18}},
  {id:"ht2", name:"Abby Koorneef", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":23, "Wins":18, "Points":76, "Assists":5, "Total Rebounds":51, "Offensive Rebounds":25, "Defensive Rebounds":26, "Steals":12, "Blocks":3, "Field Goals Made":27, "Field Goals Attempted":76, "Three Pointers Made":6, "Three Pointers Attempted":25, "Free Throws Made":12, "Free Throws Attempted":30}},
  {id:"ht3", name:"Addison Ruter", firstYear:"2022-2023", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":78, "Wins":86, "Points":229, "Assists":45, "Total Rebounds":268, "Offensive Rebounds":130, "Defensive Rebounds":138, "Steals":65, "Blocks":16, "Field Goals Made":102, "Field Goals Attempted":246, "Three Pointers Made":2, "Three Pointers Attempted":15, "Free Throws Made":23, "Free Throws Attempted":37}},
  {id:"ht4", name:"Adele Hofer", firstYear:"2012-2013", lastYear:"2014-2015", isCurrent:false, stats:{"Games Played":60, "Wins":24, "Points":356, "Assists":66, "Total Rebounds":176, "Offensive Rebounds":50, "Defensive Rebounds":126, "Steals":79, "Blocks":7, "Field Goals Made":135, "Field Goals Attempted":481, "Three Pointers Made":56, "Three Pointers Attempted":207, "Free Throws Made":30, "Free Throws Attempted":61}},
  {id:"ht5", name:"Ali Lammers", firstYear:"2011-2012", lastYear:"2011-2012", isCurrent:false, stats:{"Games Played":23, "Wins":17, "Points":84, "Assists":37, "Total Rebounds":35, "Offensive Rebounds":11, "Defensive Rebounds":24, "Steals":51, "Blocks":7, "Field Goals Made":39, "Field Goals Attempted":134, "Three Pointers Made":3, "Three Pointers Attempted":14, "Free Throws Made":3, "Free Throws Attempted":5}},
  {id:"ht6", name:"Ali Schroder", firstYear:"2018-2019", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":39, "Wins":33, "Points":59, "Assists":2, "Total Rebounds":32, "Offensive Rebounds":5, "Defensive Rebounds":27, "Steals":12, "Field Goals Made":19, "Field Goals Attempted":95, "Three Pointers Made":14, "Three Pointers Attempted":69, "Free Throws Made":4, "Free Throws Attempted":8}},
  {id:"ht7", name:"Alli Hogan", firstYear:"2008-2009", lastYear:"2009-2010", isCurrent:false, stats:{"Games Played":43, "Wins":13, "Points":188, "Assists":54, "Total Rebounds":95, "Offensive Rebounds":29, "Defensive Rebounds":66, "Steals":39, "Blocks":15, "Field Goals Made":65, "Field Goals Attempted":206, "Three Pointers Made":30, "Three Pointers Attempted":76, "Free Throws Made":28, "Free Throws Attempted":53}},
  {id:"ht8", name:"Allie O'Toole", firstYear:"2011-2012", lastYear:"2011-2012", isCurrent:false, stats:{"Games Played":3, "Wins":17, "Points":4, "Assists":2, "Total Rebounds":3, "Offensive Rebounds":1, "Defensive Rebounds":2, "Field Goals Made":2, "Field Goals Attempted":7}},
  {id:"ht9", name:"Alyssa LeFebre", firstYear:"2011-2012", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":23, "Wins":29, "Points":81, "Assists":8, "Total Rebounds":116, "Offensive Rebounds":31, "Defensive Rebounds":85, "Steals":15, "Blocks":16, "Field Goals Made":31, "Field Goals Attempted":87, "Free Throws Made":19, "Free Throws Attempted":32}},
  {id:"ht10", name:"Amy Keesen", firstYear:"1986-1987", lastYear:"1987-1988", isCurrent:false, stats:{"Games Played":39, "Wins":40, "Points":67, "Assists":3, "Total Rebounds":95, "Offensive Rebounds":15, "Defensive Rebounds":34, "Steals":2, "Blocks":2, "Field Goals Made":13, "Field Goals Attempted":56, "Free Throws Made":5, "Free Throws Attempted":16}},
  {id:"ht11", name:"Amy Skidmore", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Wins":8, "Points":7, "Total Rebounds":8, "Field Goals Made":2, "Field Goals Attempted":13, "Free Throws Made":3, "Free Throws Attempted":6}},
  {id:"ht12", name:"Anna Everett", firstYear:"2021-2022", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":96, "Wins":74, "Points":648, "Assists":144, "Total Rebounds":370, "Offensive Rebounds":147, "Defensive Rebounds":223, "Steals":162, "Blocks":23, "Field Goals Made":251, "Field Goals Attempted":831, "Three Pointers Made":96, "Three Pointers Attempted":344, "Free Throws Made":50, "Free Throws Attempted":86}},
  {id:"ht13", name:"Anna Kaemingk", firstYear:"2016-2017", lastYear:"2019-2020", isCurrent:false, stats:{"Games Played":77, "Wins":60, "Points":256, "Assists":53, "Total Rebounds":285, "Offensive Rebounds":87, "Defensive Rebounds":198, "Steals":95, "Blocks":27, "Field Goals Made":97, "Field Goals Attempted":282, "Three Pointers Made":17, "Three Pointers Attempted":75, "Free Throws Made":45, "Free Throws Attempted":102}},
  {id:"ht14", name:"Anna Sas", firstYear:"2021-2022", lastYear:"2021-2022", isCurrent:false, stats:{"Games Played":16, "Wins":14, "Points":21, "Assists":3, "Total Rebounds":12, "Offensive Rebounds":5, "Defensive Rebounds":7, "Steals":10, "Field Goals Made":8, "Field Goals Attempted":78, "Three Pointers Made":1, "Three Pointers Attempted":16, "Free Throws Made":4, "Free Throws Attempted":7}},
  {id:"ht15", name:"Annika Carlson", firstYear:"2013-2014", lastYear:"2015-2016", isCurrent:false, stats:{"Games Played":61, "Wins":24, "Points":338, "Assists":34, "Total Rebounds":305, "Offensive Rebounds":83, "Defensive Rebounds":222, "Steals":48, "Blocks":7, "Field Goals Made":123, "Field Goals Attempted":452, "Three Pointers Made":3, "Three Pointers Attempted":37, "Free Throws Made":89, "Free Throws Attempted":160}},
  {id:"ht16", name:"Ashleigh O'Donnell", firstYear:"2009-2010", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":42, "Wins":13, "Points":96, "Assists":29, "Total Rebounds":89, "Offensive Rebounds":30, "Defensive Rebounds":59, "Steals":35, "Blocks":7, "Field Goals Made":33, "Field Goals Attempted":168, "Three Pointers Made":10, "Three Pointers Attempted":53, "Free Throws Made":20, "Free Throws Attempted":34}},
  {id:"ht17", name:"Ashley Shepardson", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":22, "Wins":23, "Points":41, "Assists":3, "Total Rebounds":43, "Offensive Rebounds":22, "Defensive Rebounds":21, "Steals":8, "Blocks":4, "Field Goals Made":15, "Field Goals Attempted":57, "Free Throws Made":11, "Free Throws Attempted":29}},
  {id:"ht18", name:"Ashley Wind", firstYear:"2020-2021", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":6, "Wins":7, "Total Rebounds":10, "Offensive Rebounds":5, "Defensive Rebounds":5, "Steals":2, "Field Goals Attempted":8}},
  {id:"ht19", name:"Ava Vande Griend", firstYear:"2023-2024", lastYear:"2023-2024", isCurrent:false, stats:{"Games Played":13, "Wins":20, "Points":31, "Assists":7, "Total Rebounds":22, "Offensive Rebounds":12, "Defensive Rebounds":10, "Steals":5, "Field Goals Made":12, "Field Goals Attempted":28, "Three Pointers Made":7, "Three Pointers Attempted":18, "Free Throws Attempted":2}},
  {id:"ht20", name:"Barb Howerzyl", firstYear:"1986-1987", lastYear:"1987-1988", isCurrent:false, stats:{"Games Played":30, "Wins":40, "Points":99, "Assists":3, "Total Rebounds":130, "Offensive Rebounds":62, "Defensive Rebounds":68, "Steals":23, "Blocks":11, "Field Goals Made":43, "Field Goals Attempted":125, "Free Throws Made":13, "Free Throws Attempted":24}},
  {id:"ht21", name:"Baylee Versteeg", firstYear:"2012-2013", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":40, "Wins":16, "Points":77, "Assists":16, "Total Rebounds":98, "Offensive Rebounds":34, "Defensive Rebounds":64, "Steals":33, "Blocks":1, "Field Goals Made":35, "Field Goals Attempted":124, "Three Pointers Made":1, "Three Pointers Attempted":6, "Free Throws Made":6, "Free Throws Attempted":22}},
  {id:"ht22", name:"Becky Wildrick", firstYear:"2009-2010", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":38, "Wins":13, "Points":69, "Assists":11, "Total Rebounds":36, "Offensive Rebounds":14, "Defensive Rebounds":22, "Steals":8, "Blocks":2, "Field Goals Made":22, "Field Goals Attempted":106, "Three Pointers Made":1, "Three Pointers Attempted":5, "Free Throws Made":24, "Free Throws Attempted":51}},
  {id:"ht23", name:"Betsy George", firstYear:"1985-1986", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":42, "Wins":36, "Points":87, "Assists":48, "Total Rebounds":95, "Offensive Rebounds":48, "Defensive Rebounds":47, "Steals":73, "Blocks":4, "Field Goals Made":39, "Field Goals Attempted":103, "Free Throws Made":12, "Free Throws Attempted":23}},
  {id:"ht24", name:"Blair Humbargar", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":5, "Points":4, "Assists":1, "Total Rebounds":4, "Offensive Rebounds":2, "Defensive Rebounds":2, "Field Goals Attempted":6, "Free Throws Made":4, "Free Throws Attempted":1}},
  {id:"ht25", name:"Bosman", firstYear:"1978-1979", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":15, "Wins":6, "Points":14, "Assists":2, "Total Rebounds":25, "Offensive Rebounds":7, "Defensive Rebounds":18, "Steals":6, "Blocks":1, "Field Goals Made":8, "Field Goals Attempted":22, "Free Throws Attempted":2}},
  {id:"ht26", name:"Bre Reagor", firstYear:"2015-2016", lastYear:"2016-2017", isCurrent:false, stats:{"Games Played":32, "Wins":28, "Points":22, "Assists":6, "Total Rebounds":37, "Offensive Rebounds":8, "Defensive Rebounds":29, "Steals":11, "Blocks":3, "Field Goals Made":7, "Field Goals Attempted":37, "Three Pointers Made":2, "Three Pointers Attempted":7, "Free Throws Made":6, "Free Throws Attempted":15}},
  {id:"ht27", name:"Breanna Reagor", firstYear:"2016-2017", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":9, "Wins":34, "Points":2, "Assists":1, "Total Rebounds":3, "Defensive Rebounds":3, "Steals":1, "Field Goals Attempted":5, "Three Pointers Attempted":1, "Free Throws Made":2, "Free Throws Attempted":6}},
  {id:"ht28", name:"Bri All Swing", firstYear:"2012-2013", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":10, "Wins":12, "Points":13, "Assists":3, "Total Rebounds":25, "Offensive Rebounds":12, "Defensive Rebounds":13, "Steals":9, "Blocks":1, "Field Goals Made":5, "Field Goals Attempted":35, "Three Pointers Attempted":3, "Free Throws Made":3}},
  {id:"ht29", name:"Brooke Peterson", firstYear:"2009-2010", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":41, "Wins":13, "Points":164, "Assists":33, "Total Rebounds":125, "Offensive Rebounds":30, "Defensive Rebounds":95, "Steals":27, "Blocks":53, "Field Goals Made":64, "Field Goals Attempted":194, "Three Pointers Made":7, "Three Pointers Attempted":32, "Free Throws Made":29, "Free Throws Attempted":58}},
  {id:"ht30", name:"Caitlin Matthies", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":6, "Wins":18, "Points":32, "Assists":12, "Total Rebounds":21, "Offensive Rebounds":7, "Defensive Rebounds":14, "Steals":6, "Field Goals Made":8, "Field Goals Attempted":60, "Free Throws Made":2, "Free Throws Attempted":4}},
  {id:"ht31", name:"Callae Walcott", firstYear:"1977-1978", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":17, "Wins":14, "Points":74, "Total Rebounds":40, "Field Goals Made":26, "Field Goals Attempted":146, "Free Throws Made":22, "Free Throws Attempted":60}},
  {id:"ht32", name:"Cara Jansen", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":24, "Wins":23, "Points":313, "Assists":42, "Total Rebounds":224, "Offensive Rebounds":101, "Defensive Rebounds":123, "Steals":57, "Blocks":11, "Field Goals Made":127, "Field Goals Attempted":256, "Free Throws Made":59, "Free Throws Attempted":95}},
  {id:"ht33", name:"Cari VanWyke", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":37, "Wins":34, "Points":221, "Assists":19, "Total Rebounds":152, "Offensive Rebounds":65, "Defensive Rebounds":87, "Steals":31, "Blocks":9, "Field Goals Made":79, "Field Goals Attempted":198, "Free Throws Made":65, "Free Throws Attempted":128}},
  {id:"ht34", name:"Carolyn DeKok", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Wins":8, "Points":6, "Total Rebounds":2, "Field Goals Made":3, "Field Goals Attempted":19, "Free Throws Attempted":1}},
  {id:"ht35", name:"Cassie Lenderink", firstYear:"2012-2013", lastYear:"2015-2016", isCurrent:false, stats:{"Games Played":73, "Wins":36, "Points":115, "Assists":82, "Total Rebounds":196, "Offensive Rebounds":75, "Defensive Rebounds":121, "Steals":86, "Blocks":4, "Field Goals Made":40, "Field Goals Attempted":185, "Three Pointers Made":8, "Three Pointers Attempted":45, "Free Throws Made":27, "Free Throws Attempted":67}},
  {id:"ht36", name:"Cassie Morris", firstYear:"2014-2015", lastYear:"2014-2015", isCurrent:false, stats:{"Games Played":10, "Wins":8, "Points":6, "Assists":3, "Total Rebounds":11, "Offensive Rebounds":6, "Defensive Rebounds":5, "Steals":4, "Field Goals Made":1, "Field Goals Attempted":19, "Three Pointers Attempted":2, "Free Throws Made":4, "Free Throws Attempted":9}},
  {id:"ht37", name:"Chelsea Lefebre", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":6, "Wins":18, "Points":84, "Assists":12, "Total Rebounds":57, "Offensive Rebounds":29, "Defensive Rebounds":28, "Steals":14, "Blocks":23, "Field Goals Made":2, "Field Goals Attempted":85, "Free Throws Made":20, "Free Throws Attempted":37}},
  {id:"ht38", name:"Cheri VanWyke", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":33, "Wins":34, "Points":25, "Assists":3, "Total Rebounds":37, "Offensive Rebounds":10, "Defensive Rebounds":27, "Steals":2, "Blocks":1, "Field Goals Made":8, "Field Goals Attempted":31, "Free Throws Made":9, "Free Throws Attempted":28}},
  {id:"ht39", name:"Chloe Hansum", firstYear:"2013-2014", lastYear:"2016-2017", isCurrent:false, stats:{"Games Played":73, "Wins":40, "Points":427, "Assists":24, "Total Rebounds":465, "Offensive Rebounds":192, "Defensive Rebounds":273, "Steals":52, "Blocks":69, "Field Goals Made":182, "Field Goals Attempted":396, "Three Pointers Attempted":1, "Free Throws Made":63, "Free Throws Attempted":142}},
  {id:"ht40", name:"Christina Drost", firstYear:"2009-2010", lastYear:"2011-2012", isCurrent:false, stats:{"Games Played":66, "Wins":30, "Points":250, "Assists":94, "Total Rebounds":273, "Offensive Rebounds":96, "Defensive Rebounds":177, "Steals":114, "Blocks":63, "Field Goals Made":106, "Field Goals Attempted":300, "Three Pointers Attempted":2, "Free Throws Made":38, "Free Throws Attempted":91}},
  {id:"ht41", name:"Cindy Baukema", firstYear:"1985-1986", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":48, "Wins":36, "Points":357, "Assists":18, "Offensive Rebounds":192, "Defensive Rebounds":252, "Steals":61, "Blocks":9, "Field Goals Made":148, "Field Goals Attempted":401, "Free Throws Made":57, "Free Throws Attempted":130}},
  {id:"ht42", name:"Courtney Johnson", firstYear:"2019-2020", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":78, "Wins":49, "Points":242, "Assists":132, "Total Rebounds":177, "Offensive Rebounds":47, "Defensive Rebounds":130, "Steals":101, "Blocks":9, "Field Goals Made":89, "Field Goals Attempted":403, "Three Pointers Made":33, "Three Pointers Attempted":205, "Free Throws Made":31, "Free Throws Attempted":95}},
  {id:"ht43", name:"Daija Jenkins", firstYear:"2012-2013", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":17, "Wins":16, "Points":41, "Assists":8, "Total Rebounds":20, "Offensive Rebounds":12, "Defensive Rebounds":8, "Steals":27, "Field Goals Made":17, "Field Goals Attempted":73, "Three Pointers Attempted":4, "Free Throws Made":7, "Free Throws Attempted":11}},
  {id:"ht44", name:"Danice Puckett", firstYear:"1980-1981", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":58, "Wins":21, "Points":126, "Assists":54, "Total Rebounds":104, "Offensive Rebounds":47, "Defensive Rebounds":57, "Steals":77, "Blocks":2, "Field Goals Made":57, "Field Goals Attempted":242, "Free Throws Made":12, "Free Throws Attempted":40}},
  {id:"ht45", name:"Danya Dyk", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":19, "Wins":23, "Points":28, "Assists":3, "Total Rebounds":34, "Offensive Rebounds":9, "Defensive Rebounds":25, "Blocks":2, "Field Goals Made":12, "Field Goals Attempted":41, "Free Throws Made":4, "Free Throws Attempted":7}},
  {id:"ht46", name:"Debbie Van Heukelem", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":24, "Wins":23, "Points":87, "Assists":7, "Total Rebounds":81, "Offensive Rebounds":43, "Defensive Rebounds":38, "Steals":19, "Blocks":27, "Field Goals Made":36, "Field Goals Attempted":104, "Free Throws Made":15, "Free Throws Attempted":26}},
  {id:"ht47", name:"Delia VanHuekelem", firstYear:"2015-2016", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":35, "Wins":46, "Points":19, "Assists":2, "Total Rebounds":40, "Offensive Rebounds":9, "Defensive Rebounds":31, "Steals":9, "Blocks":16, "Field Goals Made":8, "Field Goals Attempted":25, "Free Throws Made":3, "Free Throws Attempted":6}},
  {id:"ht48", name:"Denali Schmitt", firstYear:"2018-2019", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":55, "Wins":33, "Points":158, "Assists":25, "Total Rebounds":319, "Offensive Rebounds":133, "Defensive Rebounds":186, "Steals":65, "Blocks":25, "Field Goals Made":71, "Field Goals Attempted":226, "Three Pointers Made":5, "Three Pointers Attempted":38, "Free Throws Made":11, "Free Throws Attempted":28}},
  {id:"ht49", name:"Denise Olsen", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":17, "Wins":8, "Points":144, "Total Rebounds":105, "Field Goals Made":58, "Field Goals Attempted":160, "Free Throws Made":28, "Free Throws Attempted":72}},
  {id:"ht50", name:"Diane Koops", firstYear:"1977-1978", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":34, "Wins":14, "Points":108, "Assists":1, "Total Rebounds":121, "Offensive Rebounds":32, "Defensive Rebounds":50, "Steals":7, "Blocks":6, "Field Goals Made":42, "Field Goals Attempted":128, "Free Throws Made":18, "Free Throws Attempted":44}},
  {id:"ht51", name:"Diane Lammers", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":38, "Wins":15, "Points":65, "Assists":7, "Total Rebounds":42, "Offensive Rebounds":23, "Defensive Rebounds":19, "Steals":16, "Blocks":2, "Field Goals Made":28, "Field Goals Attempted":88, "Free Throws Made":17, "Free Throws Attempted":27}},
  {id:"ht52", name:"Diane VanKooten", firstYear:"1977-1978", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":36, "Wins":14, "Points":193, "Assists":33, "Total Rebounds":100, "Offensive Rebounds":26, "Defensive Rebounds":30, "Steals":56, "Blocks":5, "Field Goals Made":77, "Field Goals Attempted":239, "Free Throws Made":36, "Free Throws Attempted":77}},
  {id:"ht53", name:"Dykstra", firstYear:"1978-1979", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":13, "Wins":6, "Points":16, "Total Rebounds":15, "Offensive Rebounds":10, "Defensive Rebounds":5, "Steals":5, "Field Goals Made":8, "Field Goals Attempted":19, "Free Throws Attempted":6}},
  {id:"ht54", name:"Elisa Gautier", firstYear:"2009-2010", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":13, "Wins":13, "Points":12, "Assists":3, "Total Rebounds":8, "Offensive Rebounds":4, "Defensive Rebounds":4, "Steals":6, "Field Goals Made":3, "Field Goals Attempted":20, "Three Pointers Made":1, "Three Pointers Attempted":3, "Free Throws Made":5, "Free Throws Attempted":9}},
  {id:"ht55", name:"Eliza Walker", firstYear:"2011-2012", lastYear:"2011-2012", isCurrent:false, stats:{"Games Played":20, "Wins":17, "Points":20, "Assists":10, "Total Rebounds":21, "Offensive Rebounds":8, "Defensive Rebounds":13, "Steals":6, "Blocks":3, "Field Goals Made":7, "Field Goals Attempted":34, "Three Pointers Made":2, "Three Pointers Attempted":11, "Free Throws Made":4, "Free Throws Attempted":9}},
  {id:"ht56", name:"Ellie Nadon", firstYear:"2025-2026", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":26, "Wins":26, "Points":39, "Assists":9, "Total Rebounds":65, "Offensive Rebounds":34, "Defensive Rebounds":31, "Steals":12, "Blocks":3, "Field Goals Made":19, "Field Goals Attempted":50, "Free Throws Made":1, "Free Throws Attempted":2}},
  {id:"ht57", name:"Emily Clark", firstYear:"2013-2014", lastYear:"2014-2015", isCurrent:false, stats:{"Games Played":13, "Wins":12, "Points":16, "Assists":5, "Total Rebounds":20, "Offensive Rebounds":12, "Defensive Rebounds":8, "Steals":2, "Field Goals Made":5, "Field Goals Attempted":27, "Three Pointers Attempted":1, "Free Throws Made":6, "Free Throws Attempted":12}},
  {id:"ht58", name:"Emily Hansum", firstYear:"2013-2014", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":20, "Wins":4, "Points":86, "Assists":7, "Total Rebounds":77, "Offensive Rebounds":38, "Defensive Rebounds":39, "Steals":5, "Blocks":1, "Field Goals Made":26, "Field Goals Attempted":68, "Free Throws Made":34, "Free Throws Attempted":68}},
  {id:"ht59", name:"Emily Herrema", firstYear:"2007-2008", lastYear:"2008-2009", isCurrent:false, stats:{"Games Played":45, "Wins":28, "Points":491, "Assists":56, "Total Rebounds":342, "Offensive Rebounds":124, "Defensive Rebounds":218, "Steals":46, "Blocks":89, "Field Goals Made":199, "Field Goals Attempted":411, "Three Pointers Made":5, "Three Pointers Attempted":10, "Free Throws Made":88, "Free Throws Attempted":137}},
  {id:"ht60", name:"Emily Ritsema", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":19, "Wins":23, "Points":14, "Assists":7, "Total Rebounds":14, "Offensive Rebounds":7, "Defensive Rebounds":7, "Steals":9, "Field Goals Made":6, "Field Goals Attempted":25, "Free Throws Made":2, "Free Throws Attempted":2}},
  {id:"ht61", name:"Erin Vandenend", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":6, "Points":4, "Assists":3, "Total Rebounds":5, "Offensive Rebounds":2, "Defensive Rebounds":3, "Steals":3, "Field Goals Attempted":12, "Three Pointers Attempted":1, "Free Throws Made":4, "Free Throws Attempted":1}},
  {id:"ht62", name:"Erin Youngsma", firstYear:"2018-2019", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":29, "Wins":21, "Points":9, "Assists":3, "Total Rebounds":28, "Offensive Rebounds":13, "Defensive Rebounds":15, "Steals":3, "Blocks":2, "Field Goals Made":3, "Field Goals Attempted":30, "Three Pointers Attempted":6, "Free Throws Made":3, "Free Throws Attempted":6}},
  {id:"ht63", name:"Ezekia Johnson", firstYear:"2012-2013", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":19, "Wins":12, "Points":216, "Assists":11, "Total Rebounds":190, "Offensive Rebounds":88, "Defensive Rebounds":102, "Steals":30, "Blocks":46, "Field Goals Made":86, "Field Goals Attempted":237, "Free Throws Made":44, "Free Throws Attempted":77}},
  {id:"ht64", name:"Fabiana Genc", firstYear:"2021-2022", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":69, "Wins":74, "Points":213, "Assists":110, "Total Rebounds":396, "Offensive Rebounds":208, "Defensive Rebounds":188, "Steals":111, "Blocks":12, "Field Goals Made":98, "Field Goals Attempted":296, "Three Pointers Made":1, "Three Pointers Attempted":8, "Free Throws Made":16, "Free Throws Attempted":44}},
  {id:"ht65", name:"Fonda Keessen", firstYear:"1979-1980", lastYear:"1981-1982", isCurrent:false, stats:{"Games Played":49, "Wins":30, "Points":163, "Assists":30, "Total Rebounds":165, "Offensive Rebounds":60, "Defensive Rebounds":105, "Steals":24, "Blocks":7, "Field Goals Made":59, "Field Goals Attempted":279, "Free Throws Made":46, "Free Throws Attempted":98}},
  {id:"ht66", name:"Francesca Galeon", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Wins":18}},
  {id:"ht67", name:"Gabbi Mucerino", firstYear:"2015-2016", lastYear:"2015-2016", isCurrent:false, stats:{"Games Played":9, "Wins":12, "Points":9, "Total Rebounds":10, "Offensive Rebounds":3, "Defensive Rebounds":7, "Field Goals Made":4, "Field Goals Attempted":9, "Three Pointers Attempted":1, "Free Throws Made":1, "Free Throws Attempted":2}},
  {id:"ht68", name:"Glory Schmidt", firstYear:"2012-2013", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":22, "Wins":16, "Points":67, "Assists":8, "Total Rebounds":53, "Offensive Rebounds":27, "Defensive Rebounds":26, "Steals":14, "Blocks":4, "Field Goals Made":26, "Field Goals Attempted":89, "Three Pointers Made":2, "Three Pointers Attempted":6, "Free Throws Made":13, "Free Throws Attempted":31}},
  {id:"ht69", name:"Hally Herder", firstYear:"2014-2015", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":86, "Wins":54, "Points":485, "Assists":83, "Total Rebounds":540, "Offensive Rebounds":192, "Defensive Rebounds":348, "Steals":153, "Blocks":55, "Field Goals Made":187, "Field Goals Attempted":417, "Three Pointers Made":4, "Three Pointers Attempted":19, "Free Throws Made":99, "Free Throws Attempted":197}},
  {id:"ht70", name:"Heidi Cutright", firstYear:"2008-2009", lastYear:"2009-2010", isCurrent:false, stats:{"Games Played":34, "Wins":13, "Points":19, "Assists":9, "Total Rebounds":30, "Offensive Rebounds":9, "Defensive Rebounds":21, "Steals":13, "Blocks":2, "Field Goals Made":6, "Field Goals Attempted":26, "Free Throws Made":7, "Free Throws Attempted":25}},
  {id:"ht71", name:"Holland Reece", firstYear:"2019-2020", lastYear:"2019-2020", isCurrent:false, stats:{"Games Played":23, "Wins":14, "Points":17, "Assists":10, "Total Rebounds":35, "Offensive Rebounds":11, "Defensive Rebounds":24, "Steals":12, "Blocks":1, "Field Goals Made":6, "Field Goals Attempted":26, "Three Pointers Made":2, "Three Pointers Attempted":10, "Free Throws Made":3, "Free Throws Attempted":9}},
  {id:"ht72", name:"Isabel Scadden", firstYear:"2019-2020", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":25, "Wins":21, "Points":15, "Assists":1, "Total Rebounds":16, "Offensive Rebounds":8, "Defensive Rebounds":8, "Steals":9, "Field Goals Made":7, "Field Goals Attempted":38, "Three Pointers Made":2, "Three Pointers Attempted":7, "Free Throws Made":2, "Free Throws Attempted":4}},
  {id:"ht73", name:"Jackie Baukema", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":21, "Wins":18, "Points":69, "Total Rebounds":94, "Offensive Rebounds":35, "Defensive Rebounds":59, "Steals":19, "Blocks":10, "Field Goals Made":27, "Field Goals Attempted":84, "Free Throws Made":15, "Free Throws Attempted":39}},
  {id:"ht74", name:"Jackie Bucher", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":24, "Wins":23, "Points":339, "Assists":25, "Total Rebounds":171, "Offensive Rebounds":87, "Defensive Rebounds":84, "Steals":82, "Blocks":46, "Field Goals Made":146, "Field Goals Attempted":268, "Free Throws Made":47, "Free Throws Attempted":68}},
  {id:"ht75", name:"Jamie Katte", firstYear:"1980-1981", lastYear:"1981-1982", isCurrent:false, stats:{"Games Played":37, "Wins":21, "Points":74, "Assists":43, "Total Rebounds":58, "Offensive Rebounds":20, "Defensive Rebounds":38, "Steals":37, "Blocks":5, "Field Goals Made":30, "Field Goals Attempted":164, "Free Throws Made":14, "Free Throws Attempted":29}},
  {id:"ht76", name:"Jane Fedders", firstYear:"1984-1985", lastYear:"1985-1986", isCurrent:false, stats:{"Games Played":40, "Wins":30, "Points":103, "Assists":16, "Total Rebounds":84, "Offensive Rebounds":35, "Defensive Rebounds":49, "Steals":23, "Blocks":5, "Field Goals Made":43, "Field Goals Attempted":133, "Free Throws Made":17, "Free Throws Attempted":35}},
  {id:"ht77", name:"Janee Harvey", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":20, "Wins":23, "Points":104, "Assists":88, "Total Rebounds":32, "Offensive Rebounds":6, "Defensive Rebounds":26, "Steals":55, "Blocks":3, "Field Goals Made":42, "Field Goals Attempted":97, "Three Pointers Made":1, "Three Pointers Attempted":10, "Free Throws Made":19, "Free Throws Attempted":32}},
  {id:"ht78", name:"Janelle Purvis", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":24, "Wins":23, "Points":165, "Assists":91, "Total Rebounds":76, "Offensive Rebounds":38, "Defensive Rebounds":38, "Steals":48, "Blocks":1, "Field Goals Made":68, "Field Goals Attempted":200, "Three Pointers Made":1, "Three Pointers Attempted":5, "Free Throws Made":28, "Free Throws Attempted":48}},
  {id:"ht79", name:"Jeannette Smith", firstYear:"1979-1980", lastYear:"1980-1981", isCurrent:false, stats:{"Games Played":35, "Wins":13, "Points":70, "Assists":19, "Total Rebounds":68, "Offensive Rebounds":23, "Defensive Rebounds":45, "Steals":55, "Blocks":2, "Field Goals Made":21, "Field Goals Attempted":97, "Free Throws Made":28, "Free Throws Attempted":71}},
  {id:"ht80", name:"Jen Tubergen", firstYear:"1985-1986", lastYear:"1987-1988", isCurrent:false, stats:{"Games Played":72, "Wins":54, "Assists":62, "Total Rebounds":573, "Offensive Rebounds":225, "Defensive Rebounds":348, "Steals":132, "Blocks":21, "Field Goals Attempted":847, "Three Pointers Made":3, "Three Pointers Attempted":4, "Free Throws Made":149, "Free Throws Attempted":201}},
  {id:"ht81", name:"Jenna Kuzava", firstYear:"2007-2008", lastYear:"2009-2010", isCurrent:false, stats:{"Games Played":61, "Wins":31, "Points":450, "Assists":38, "Total Rebounds":108, "Offensive Rebounds":26, "Defensive Rebounds":82, "Steals":51, "Blocks":7, "Field Goals Made":142, "Field Goals Attempted":396, "Three Pointers Made":103, "Three Pointers Attempted":287, "Free Throws Made":63, "Free Throws Attempted":93}},
  {id:"ht82", name:"Jenna Peters", firstYear:"2016-2017", lastYear:"2018-2019", isCurrent:false, stats:{"Games Played":64, "Wins":46, "Points":170, "Assists":27, "Total Rebounds":144, "Offensive Rebounds":47, "Defensive Rebounds":97, "Steals":81, "Blocks":14, "Field Goals Made":68, "Field Goals Attempted":213, "Three Pointers Made":6, "Three Pointers Attempted":66, "Free Throws Made":25, "Free Throws Attempted":63}},
  {id:"ht83", name:"Jerika Schmitt", firstYear:"2010-2011", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":49, "Wins":39, "Points":607, "Assists":79, "Total Rebounds":646, "Offensive Rebounds":250, "Defensive Rebounds":396, "Steals":204, "Blocks":116, "Field Goals Made":241, "Field Goals Attempted":574, "Three Pointers Made":11, "Three Pointers Attempted":52, "Free Throws Made":114, "Free Throws Attempted":195}},
  {id:"ht84", name:"Jessie Koorneef", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":22, "Wins":18, "Points":142, "Assists":10, "Total Rebounds":91, "Offensive Rebounds":39, "Defensive Rebounds":52, "Steals":13, "Blocks":3, "Field Goals Made":46, "Field Goals Attempted":121, "Three Pointers Made":12, "Three Pointers Attempted":47, "Free Throws Made":10, "Free Throws Attempted":28}},
  {id:"ht85", name:"Jessie Mueller", firstYear:"2016-2017", lastYear:"2018-2019", isCurrent:false, stats:{"Games Played":47, "Wins":46, "Points":75, "Assists":34, "Total Rebounds":27, "Offensive Rebounds":8, "Defensive Rebounds":19, "Steals":35, "Blocks":1, "Field Goals Made":27, "Field Goals Attempted":127, "Three Pointers Made":12, "Three Pointers Attempted":60, "Free Throws Made":7, "Free Throws Attempted":5}},
  {id:"ht86", name:"Jill Schemper", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":19, "Wins":23, "Points":10, "Assists":15, "Total Rebounds":12, "Offensive Rebounds":6, "Defensive Rebounds":6, "Steals":12, "Blocks":1, "Field Goals Made":3, "Field Goals Attempted":24, "Free Throws Made":4, "Free Throws Attempted":12}},
  {id:"ht87", name:"Jill Van Kooten", firstYear:"1984-1985", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":20, "Wins":16, "Points":162, "Assists":13, "Total Rebounds":113, "Offensive Rebounds":41, "Defensive Rebounds":72, "Steals":26, "Field Goals Made":68, "Field Goals Attempted":180, "Free Throws Made":26, "Free Throws Attempted":49}},
  {id:"ht88", name:"Jill VanderArk", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":56, "Wins":23, "Points":385, "Assists":11, "Total Rebounds":304, "Offensive Rebounds":106, "Defensive Rebounds":159, "Steals":26, "Blocks":13, "Field Goals Made":151, "Field Goals Attempted":503, "Free Throws Made":79, "Free Throws Attempted":184}},
  {id:"ht89", name:"Jodi Kats", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":23, "Wins":18, "Points":24, "Assists":10, "Total Rebounds":33, "Offensive Rebounds":13, "Defensive Rebounds":20, "Steals":19, "Field Goals Made":7, "Field Goals Attempted":43, "Three Pointers Attempted":3, "Free Throws Made":10, "Free Throws Attempted":22}},
  {id:"ht90", name:"Jodi Lenderink", firstYear:"1978-1979", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":36, "Wins":15, "Points":77, "Assists":6, "Total Rebounds":164, "Offensive Rebounds":58, "Defensive Rebounds":106, "Steals":12, "Blocks":10, "Field Goals Made":35, "Field Goals Attempted":123, "Free Throws Made":7, "Free Throws Attempted":36}},
  {id:"ht91", name:"Joelle Jenkins", firstYear:"2013-2014", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":4, "Wins":4, "Points":2, "Assists":1, "Total Rebounds":4, "Offensive Rebounds":3, "Defensive Rebounds":1, "Steals":4, "Blocks":1, "Field Goals Made":1, "Field Goals Attempted":4, "Three Pointers Attempted":1}},
  {id:"ht92", name:"Judy Meyer", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":15, "Wins":9, "Points":7, "Assists":3, "Total Rebounds":11, "Offensive Rebounds":3, "Defensive Rebounds":8, "Steals":2, "Field Goals Made":2, "Field Goals Attempted":11, "Free Throws Made":3, "Free Throws Attempted":7}},
  {id:"ht93", name:"Julie Geels", firstYear:"1984-1985", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":20, "Wins":16, "Points":45, "Assists":3, "Total Rebounds":62, "Offensive Rebounds":23, "Defensive Rebounds":39, "Steals":8, "Blocks":4, "Field Goals Made":19, "Field Goals Attempted":65, "Free Throws Made":8, "Free Throws Attempted":28}},
  {id:"ht94", name:"Julie Snow", firstYear:"1984-1985", lastYear:"1985-1986", isCurrent:false, stats:{"Games Played":36, "Wins":30, "Points":93, "Assists":8, "Total Rebounds":40, "Offensive Rebounds":14, "Defensive Rebounds":26, "Steals":17, "Blocks":1, "Field Goals Made":35, "Field Goals Attempted":124, "Free Throws Made":13, "Free Throws Attempted":28}},
  {id:"ht95", name:"Kaitlyn Fitzgerald", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Wins":18}},
  {id:"ht96", name:"Kallie Stevenson", firstYear:"1979-1980", lastYear:"1980-1981", isCurrent:false, stats:{"Games Played":19, "Wins":13, "Points":24, "Assists":2, "Total Rebounds":50, "Offensive Rebounds":21, "Defensive Rebounds":29, "Steals":4, "Blocks":1, "Field Goals Made":11, "Field Goals Attempted":52, "Free Throws Made":2, "Free Throws Attempted":8}},
  {id:"ht97", name:"Kamiree Fuller", firstYear:"2021-2022", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":93, "Wins":74, "Points":1332, "Assists":209, "Total Rebounds":264, "Offensive Rebounds":114, "Defensive Rebounds":150, "Steals":351, "Blocks":17, "Field Goals Made":524, "Field Goals Attempted":1434, "Three Pointers Made":179, "Three Pointers Attempted":669, "Free Throws Made":105, "Free Throws Attempted":168}},
  {id:"ht98", name:"Kara Amidon", firstYear:"2016-2017", lastYear:"2019-2020", isCurrent:false, stats:{"Games Played":93, "Wins":60, "Points":960, "Assists":138, "Total Rebounds":251, "Offensive Rebounds":82, "Defensive Rebounds":169, "Steals":389, "Blocks":8, "Field Goals Made":358, "Field Goals Attempted":827, "Three Pointers Made":33, "Three Pointers Attempted":133, "Free Throws Made":189, "Free Throws Attempted":382}},
  {id:"ht99", name:"Kara Plender", firstYear:"1985-1986", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":48, "Wins":36, "Points":118, "Assists":71, "Total Rebounds":78, "Offensive Rebounds":27, "Defensive Rebounds":51, "Steals":63, "Blocks":2, "Field Goals Made":42, "Field Goals Attempted":123, "Free Throws Made":32, "Free Throws Attempted":63}},
  {id:"ht100", name:"Karen Van Essen", firstYear:"1979-1980", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":13, "Wins":9, "Points":2, "Total Rebounds":7, "Offensive Rebounds":1, "Defensive Rebounds":6, "Steals":2, "Blocks":1, "Field Goals Made":1, "Field Goals Attempted":11}},
  {id:"ht101", name:"Karen Warne", firstYear:"1980-1981", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":57, "Wins":21, "Points":32, "Assists":56, "Total Rebounds":44, "Offensive Rebounds":9, "Defensive Rebounds":35, "Steals":43, "Blocks":1, "Field Goals Made":8, "Field Goals Attempted":48, "Free Throws Made":16, "Free Throws Attempted":45}},
  {id:"ht102", name:"Katie Lucht", firstYear:"1980-1981", lastYear:"1981-1982", isCurrent:false, stats:{"Games Played":38, "Wins":21, "Points":110, "Assists":62, "Total Rebounds":69, "Offensive Rebounds":26, "Defensive Rebounds":43, "Steals":84, "Blocks":5, "Field Goals Made":42, "Field Goals Attempted":161, "Free Throws Made":26, "Free Throws Attempted":57}},
  {id:"ht103", name:"Katie Pranger", firstYear:"2007-2008", lastYear:"2008-2009", isCurrent:false, stats:{"Games Played":46, "Wins":28, "Points":126, "Assists":89, "Total Rebounds":97, "Offensive Rebounds":32, "Defensive Rebounds":65, "Steals":71, "Blocks":18, "Field Goals Made":45, "Field Goals Attempted":112, "Three Pointers Made":1, "Three Pointers Attempted":4, "Free Throws Made":35, "Free Throws Attempted":57}},
  {id:"ht104", name:"Kaylee Natelborg", firstYear:"2012-2013", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":29, "Wins":16, "Points":36, "Assists":7, "Total Rebounds":34, "Offensive Rebounds":12, "Defensive Rebounds":22, "Steals":19, "Blocks":1, "Field Goals Made":15, "Field Goals Attempted":72, "Three Pointers Made":2, "Three Pointers Attempted":13, "Free Throws Made":4, "Free Throws Attempted":10}},
  {id:"ht105", name:"Kella Millican", firstYear:"2018-2019", lastYear:"2021-2022", isCurrent:false, stats:{"Games Played":65, "Wins":47, "Points":375, "Assists":61, "Total Rebounds":223, "Offensive Rebounds":148, "Defensive Rebounds":75, "Steals":120, "Blocks":11, "Field Goals Made":157, "Field Goals Attempted":483, "Three Pointers Made":14, "Three Pointers Attempted":76, "Free Throws Made":47, "Free Throws Attempted":123}},
  {id:"ht106", name:"Kim Spoelstra", firstYear:"1985-1986", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":44, "Wins":36, "Points":123, "Assists":23, "Total Rebounds":118, "Offensive Rebounds":46, "Defensive Rebounds":72, "Steals":26, "Blocks":2, "Field Goals Made":50, "Field Goals Attempted":161, "Free Throws Made":23, "Free Throws Attempted":35}},
  {id:"ht107", name:"Kimi Bryson", firstYear:"2012-2013", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":10, "Wins":12, "Points":2, "Assists":2, "Total Rebounds":9, "Offensive Rebounds":3, "Defensive Rebounds":6, "Field Goals Made":1, "Field Goals Attempted":13, "Three Pointers Attempted":1}},
  {id:"ht108", name:"Klara Van Andel", firstYear:"2021-2022", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":45, "Wins":74, "Points":34, "Assists":21, "Total Rebounds":60, "Offensive Rebounds":22, "Defensive Rebounds":38, "Steals":19, "Field Goals Made":15, "Field Goals Attempted":53, "Three Pointers Made":3, "Three Pointers Attempted":16, "Free Throws Made":1, "Free Throws Attempted":5}},
  {id:"ht109", name:"Kris Disselkoen", firstYear:"1985-1986", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":47, "Wins":36, "Points":345, "Assists":73, "Total Rebounds":178, "Offensive Rebounds":74, "Defensive Rebounds":105, "Steals":79, "Field Goals Made":138, "Field Goals Attempted":392, "Free Throws Made":69, "Free Throws Attempted":124}},
  {id:"ht110", name:"Kristen Lefebre", firstYear:"2006-2007", lastYear:"2008-2009", isCurrent:false, stats:{"Games Played":48, "Wins":46, "Points":403, "Assists":68, "Total Rebounds":243, "Offensive Rebounds":77, "Defensive Rebounds":166, "Steals":52, "Blocks":26, "Field Goals Made":151, "Field Goals Attempted":387, "Three Pointers Made":1, "Three Pointers Attempted":8, "Free Throws Made":100, "Free Throws Attempted":178}},
  {id:"ht111", name:"Kristyn Borger", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":3, "Wins":23, "Points":15, "Assists":3, "Total Rebounds":14, "Offensive Rebounds":5, "Defensive Rebounds":9, "Steals":6, "Blocks":2, "Field Goals Made":6, "Field Goals Attempted":20, "Three Pointers Attempted":4, "Free Throws Made":3, "Free Throws Attempted":6}},
  {id:"ht112", name:"Kyleigh Roejtter", firstYear:"2019-2020", lastYear:"2020-2021", isCurrent:false, stats:{"Games Played":24, "Wins":21, "Points":21, "Assists":3, "Total Rebounds":56, "Offensive Rebounds":10, "Defensive Rebounds":46, "Steals":10, "Blocks":3, "Field Goals Made":9, "Field Goals Attempted":49, "Three Pointers Made":1, "Three Pointers Attempted":17, "Free Throws Made":2, "Free Throws Attempted":12}},
  {id:"ht113", name:"Laine Baity", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":6, "Wins":18, "Points":41, "Assists":12, "Total Rebounds":19, "Offensive Rebounds":8, "Defensive Rebounds":11, "Steals":14, "Field Goals Made":9, "Field Goals Attempted":50, "Three Pointers Made":2, "Three Pointers Attempted":7, "Free Throws Made":3, "Free Throws Attempted":9}},
  {id:"ht114", name:"Lauren Frazier", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":4, "Total Rebounds":1, "Offensive Rebounds":1, "Blocks":1, "Field Goals Attempted":5}},
  {id:"ht115", name:"Laurie May", firstYear:"1983-1984", lastYear:"1983-1984", isCurrent:false, stats:{"Games Played":19, "Wins":18, "Points":8, "Assists":1, "Total Rebounds":23, "Offensive Rebounds":12, "Defensive Rebounds":11, "Field Goals Made":3, "Field Goals Attempted":20, "Free Throws Made":2, "Free Throws Attempted":5}},
  {id:"ht116", name:"Leane Jarvis", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":23, "Wins":23, "Points":37, "Assists":8, "Total Rebounds":39, "Offensive Rebounds":16, "Defensive Rebounds":23, "Steals":9, "Blocks":7, "Field Goals Made":15, "Field Goals Attempted":76, "Free Throws Made":7, "Free Throws Attempted":21}},
  {id:"ht117", name:"Leann Tetrick", firstYear:"2008-2009", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":49, "Wins":23, "Points":82, "Assists":74, "Total Rebounds":91, "Offensive Rebounds":30, "Defensive Rebounds":61, "Steals":75, "Blocks":4, "Field Goals Made":32, "Field Goals Attempted":156, "Three Pointers Made":1, "Three Pointers Attempted":10, "Free Throws Made":17, "Free Throws Attempted":43}},
  {id:"ht118", name:"Leanne Draayer", firstYear:"2006-2007", lastYear:"2007-2008", isCurrent:false, stats:{"Games Played":27, "Wins":36, "Points":107, "Assists":32, "Total Rebounds":101, "Offensive Rebounds":25, "Defensive Rebounds":76, "Steals":28, "Blocks":14, "Field Goals Made":42, "Field Goals Attempted":141, "Three Pointers Made":1, "Three Pointers Attempted":9, "Free Throws Made":10, "Free Throws Attempted":19}},
  {id:"ht119", name:"Leslie Dykstra", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":17, "Wins":18, "Points":4, "Total Rebounds":23, "Offensive Rebounds":8, "Defensive Rebounds":15, "Steals":5, "Field Goals Made":2, "Field Goals Attempted":23, "Free Throws Attempted":7}},
  {id:"ht120", name:"Leslie Wirth", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":39, "Wins":23, "Points":373, "Assists":63, "Total Rebounds":167, "Offensive Rebounds":63, "Defensive Rebounds":84, "Steals":141, "Blocks":23, "Field Goals Made":147, "Field Goals Attempted":443, "Free Throws Made":75, "Free Throws Attempted":147}},
  {id:"ht121", name:"Lexi Ries", firstYear:"2025-2026", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":18, "Wins":26, "Points":17, "Assists":2, "Total Rebounds":21, "Offensive Rebounds":12, "Defensive Rebounds":9, "Steals":3, "Blocks":1, "Field Goals Made":7, "Field Goals Attempted":22, "Three Pointers Attempted":1, "Free Throws Made":3, "Free Throws Attempted":6}},
  {id:"ht122", name:"Lilly Martinez", firstYear:"2022-2023", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":45, "Wins":60, "Points":77, "Assists":23, "Total Rebounds":24, "Offensive Rebounds":7, "Defensive Rebounds":17, "Steals":21, "Blocks":3, "Field Goals Made":26, "Field Goals Attempted":79, "Three Pointers Made":24, "Three Pointers Attempted":72, "Free Throws Made":1, "Free Throws Attempted":5}},
  {id:"ht123", name:"Lindsay Landhuis", firstYear:"2006-2007", lastYear:"2007-2008", isCurrent:false, stats:{"Games Played":29, "Wins":36, "Points":287, "Assists":69, "Total Rebounds":100, "Offensive Rebounds":58, "Defensive Rebounds":42, "Steals":101, "Blocks":10, "Field Goals Made":98, "Field Goals Attempted":239, "Three Pointers Made":5, "Three Pointers Attempted":13, "Free Throws Made":50, "Free Throws Attempted":83}},
  {id:"ht124", name:"Lisa Noordewier", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":43, "Wins":34, "Points":171, "Assists":53, "Total Rebounds":91, "Offensive Rebounds":37, "Defensive Rebounds":54, "Steals":49, "Blocks":5, "Field Goals Made":63, "Field Goals Attempted":195, "Free Throws Made":41, "Free Throws Attempted":82}},
  {id:"ht125", name:"Lisa Singleton", firstYear:"2006-2007", lastYear:"2007-2008", isCurrent:false, stats:{"Games Played":27, "Points":62, "Assists":41, "Total Rebounds":75, "Offensive Rebounds":27, "Defensive Rebounds":48, "Steals":70, "Blocks":6, "Field Goals Made":22, "Field Goals Attempted":62, "Three Pointers Attempted":4, "Free Throws Made":18, "Free Throws Attempted":34}},
  {id:"ht126", name:"Lisa Spoelhof", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":21, "Wins":18, "Points":37, "Assists":10, "Total Rebounds":26, "Offensive Rebounds":10, "Defensive Rebounds":16, "Steals":10, "Field Goals Made":16, "Field Goals Attempted":34, "Free Throws Made":5, "Free Throws Attempted":10}},
  {id:"ht127", name:"Lisa Van Denend", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":22, "Wins":18, "Points":50, "Assists":21, "Total Rebounds":52, "Offensive Rebounds":21, "Defensive Rebounds":31, "Steals":14, "Field Goals Made":24, "Field Goals Attempted":89, "Free Throws Made":2, "Free Throws Attempted":9}},
  {id:"ht128", name:"Liz Harper", firstYear:"1980-1981", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":59, "Wins":21, "Points":61, "Assists":27, "Total Rebounds":103, "Offensive Rebounds":44, "Defensive Rebounds":59, "Steals":54, "Blocks":5, "Field Goals Made":26, "Field Goals Attempted":132, "Free Throws Made":9, "Free Throws Attempted":39}},
  {id:"ht129", name:"Lori Freeze", firstYear:"1981-1982", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":41, "Wins":17, "Points":85, "Assists":7, "Total Rebounds":72, "Offensive Rebounds":24, "Defensive Rebounds":48, "Steals":16, "Blocks":2, "Field Goals Made":36, "Field Goals Attempted":137, "Free Throws Made":13, "Free Throws Attempted":36}},
  {id:"ht130", name:"Lori Smith", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":23, "Wins":18, "Points":57, "Assists":24, "Total Rebounds":93, "Offensive Rebounds":35, "Defensive Rebounds":58, "Steals":26, "Blocks":2, "Field Goals Made":20, "Field Goals Attempted":87, "Free Throws Made":17, "Free Throws Attempted":27}},
  {id:"ht131", name:"Lorri Wirth", firstYear:"1977-1978", lastYear:"1977-1978", isCurrent:false, stats:{"Games Played":17, "Wins":8, "Points":167, "Total Rebounds":130, "Field Goals Made":69, "Field Goals Attempted":221, "Free Throws Made":29, "Free Throws Attempted":49}},
  {id:"ht132", name:"Luann Paauw", firstYear:"1984-1985", lastYear:"1985-1986", isCurrent:false, stats:{"Games Played":40, "Wins":30, "Points":175, "Assists":73, "Total Rebounds":124, "Offensive Rebounds":49, "Defensive Rebounds":75, "Steals":78, "Blocks":11, "Field Goals Made":73, "Field Goals Attempted":201, "Free Throws Made":27, "Free Throws Attempted":63}},
  {id:"ht133", name:"Luci Fletcher", firstYear:"2022-2023", lastYear:"2023-2024", isCurrent:false, stats:{"Games Played":28, "Wins":34, "Points":27, "Assists":5, "Total Rebounds":60, "Offensive Rebounds":18, "Defensive Rebounds":42, "Steals":20, "Blocks":4, "Field Goals Made":12, "Field Goals Attempted":41, "Three Pointers Attempted":1, "Free Throws Made":3, "Free Throws Attempted":21}},
  {id:"ht134", name:"Lucy Bell", firstYear:"2006-2007", lastYear:"2007-2008", isCurrent:false, stats:{"Games Played":29, "Wins":36, "Points":222, "Assists":34, "Total Rebounds":102, "Offensive Rebounds":44, "Defensive Rebounds":58, "Steals":36, "Blocks":8, "Field Goals Made":87, "Field Goals Attempted":216, "Three Pointers Made":2, "Three Pointers Attempted":8, "Free Throws Made":46, "Free Throws Attempted":71}},
  {id:"ht135", name:"Lynn Wong", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":41, "Wins":34, "Points":80, "Assists":33, "Total Rebounds":60, "Offensive Rebounds":14, "Defensive Rebounds":46, "Steals":70, "Blocks":1, "Field Goals Made":33, "Field Goals Attempted":91, "Free Throws Made":17, "Free Throws Attempted":38}},
  {id:"ht136", name:"Maggie Harder", firstYear:"2020-2021", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":22, "Wins":21, "Points":16, "Assists":12, "Total Rebounds":22, "Offensive Rebounds":11, "Defensive Rebounds":11, "Steals":19, "Field Goals Made":5, "Field Goals Attempted":57, "Three Pointers Attempted":1, "Free Throws Made":6, "Free Throws Attempted":15}},
  {id:"ht137", name:"Maggie Rosendale", firstYear:"2006-2007", lastYear:"2006-2007", isCurrent:false, stats:{"Games Played":6, "Points":2, "Assists":1, "Total Rebounds":9, "Offensive Rebounds":6, "Defensive Rebounds":3, "Blocks":4, "Field Goals Made":1, "Field Goals Attempted":7, "Free Throws Attempted":3}},
  {id:"ht138", name:"Makenna Duntsch", firstYear:"2021-2022", lastYear:"2021-2022", isCurrent:false, stats:{"Games Played":2, "Wins":14, "Assists":1, "Field Goals Attempted":2}},
  {id:"ht139", name:"Mandee Middleton", firstYear:"2012-2013", lastYear:"2012-2013", isCurrent:false, stats:{"Wins":12}},
  {id:"ht140", name:"Marci Borger", firstYear:"1980-1981", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":56, "Wins":21, "Points":109, "Assists":17, "Total Rebounds":97, "Offensive Rebounds":36, "Defensive Rebounds":61, "Steals":35, "Blocks":2, "Field Goals Made":51, "Field Goals Attempted":190, "Free Throws Made":9, "Free Throws Attempted":38}},
  {id:"ht141", name:"Margot Hamstra", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":56, "Wins":23, "Points":227, "Assists":47, "Total Rebounds":189, "Offensive Rebounds":44, "Defensive Rebounds":104, "Steals":62, "Blocks":11, "Field Goals Made":87, "Field Goals Attempted":301, "Free Throws Made":53, "Free Throws Attempted":138}},
  {id:"ht142", name:"Maycee Fowler", firstYear:"2024-2025", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":27, "Wins":52, "Points":22, "Assists":5, "Total Rebounds":40, "Offensive Rebounds":14, "Defensive Rebounds":26, "Steals":14, "Blocks":1, "Field Goals Made":10, "Field Goals Attempted":37, "Three Pointers Attempted":1, "Free Throws Made":2, "Free Throws Attempted":6}},
  {id:"ht143", name:"Mckenna Mueller", firstYear:"2015-2016", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":69, "Wins":46, "Points":324, "Assists":134, "Total Rebounds":272, "Offensive Rebounds":91, "Defensive Rebounds":181, "Steals":131, "Blocks":9, "Field Goals Made":121, "Field Goals Attempted":448, "Three Pointers Made":16, "Three Pointers Attempted":106, "Free Throws Made":48, "Free Throws Attempted":93}},
  {id:"ht144", name:"Melonie Van Beek", firstYear:"1980-1981", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":61, "Wins":21, "Points":754, "Assists":17, "Total Rebounds":492, "Offensive Rebounds":214, "Defensive Rebounds":278, "Steals":64, "Blocks":28, "Field Goals Made":295, "Field Goals Attempted":699, "Free Throws Made":164, "Free Throws Attempted":310}},
  {id:"ht145", name:"Merissa Prentiss", firstYear:"2011-2012", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":44, "Wins":29, "Points":626, "Assists":50, "Total Rebounds":260, "Offensive Rebounds":103, "Defensive Rebounds":157, "Steals":101, "Blocks":16, "Field Goals Made":271, "Field Goals Attempted":739, "Three Pointers Made":6, "Three Pointers Attempted":46, "Free Throws Made":78, "Free Throws Attempted":132}},
  {id:"ht146", name:"Mia Twinam", firstYear:"2014-2015", lastYear:"2015-2016", isCurrent:false, stats:{"Games Played":30, "Wins":20, "Points":28, "Assists":5, "Total Rebounds":45, "Offensive Rebounds":16, "Defensive Rebounds":29, "Steals":9, "Blocks":1, "Field Goals Made":12, "Field Goals Attempted":55, "Three Pointers Attempted":3, "Free Throws Made":4, "Free Throws Attempted":18}},
  {id:"ht147", name:"Michelle Hamstra", firstYear:"2007-2008", lastYear:"2008-2009", isCurrent:false, stats:{"Games Played":46, "Wins":28, "Points":146, "Assists":49, "Total Rebounds":56, "Offensive Rebounds":18, "Defensive Rebounds":38, "Steals":20, "Blocks":1, "Field Goals Made":54, "Field Goals Attempted":158, "Three Pointers Made":25, "Three Pointers Attempted":81, "Free Throws Made":13, "Free Throws Attempted":22}},
  {id:"ht148", name:"Michelle Swierenga", firstYear:"1986-1987", lastYear:"1987-1988", isCurrent:false, stats:{"Games Played":50, "Wins":40, "Points":375, "Assists":47, "Total Rebounds":211, "Offensive Rebounds":82, "Defensive Rebounds":129, "Steals":73, "Blocks":7, "Field Goals Made":162, "Field Goals Attempted":442, "Three Pointers Attempted":3, "Free Throws Made":51, "Free Throws Attempted":93}},
  {id:"ht149", name:"Mieke Dykhouse", firstYear:"2008-2009", lastYear:"2009-2010", isCurrent:false, stats:{"Games Played":25, "Wins":13, "Points":20, "Assists":7, "Total Rebounds":34, "Offensive Rebounds":9, "Defensive Rebounds":25, "Steals":1, "Blocks":8, "Field Goals Made":8, "Field Goals Attempted":35, "Free Throws Made":4, "Free Throws Attempted":10}},
  {id:"ht150", name:"Miranda Kortenhoeven", firstYear:"2014-2015", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":83, "Wins":54, "Points":622, "Assists":135, "Total Rebounds":406, "Offensive Rebounds":128, "Defensive Rebounds":278, "Steals":235, "Blocks":12, "Field Goals Made":227, "Field Goals Attempted":715, "Three Pointers Made":58, "Three Pointers Attempted":221, "Free Throws Made":90, "Free Throws Attempted":167}},
  {id:"ht151", name:"Missy Van Heukelem", firstYear:"1985-1986", lastYear:"1987-1988", isCurrent:false, stats:{"Games Played":72, "Wins":54, "Points":493, "Total Rebounds":223, "Offensive Rebounds":91, "Defensive Rebounds":132, "Steals":212, "Blocks":23, "Field Goals Made":196, "Field Goals Attempted":569, "Three Pointers Made":5, "Three Pointers Attempted":13, "Free Throws Made":96, "Free Throws Attempted":174}},
  {id:"ht152", name:"Morgan Church", firstYear:"2025-2026", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":18, "Wins":26, "Points":5, "Assists":4, "Total Rebounds":10, "Offensive Rebounds":5, "Defensive Rebounds":5, "Steals":1, "Blocks":1, "Field Goals Made":2, "Field Goals Attempted":23, "Three Pointers Attempted":3, "Free Throws Made":1, "Free Throws Attempted":2}},
  {id:"ht153", name:"Morgan Van Eps", firstYear:"2011-2012", lastYear:"2013-2014", isCurrent:false, stats:{"Games Played":54, "Wins":33, "Points":156, "Assists":50, "Total Rebounds":199, "Offensive Rebounds":61, "Defensive Rebounds":138, "Steals":28, "Blocks":17, "Field Goals Made":65, "Field Goals Attempted":252, "Three Pointers Made":2, "Three Pointers Attempted":22, "Free Throws Made":24, "Free Throws Attempted":67}},
  {id:"ht154", name:"Natalie Beattie", firstYear:"2019-2020", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":65, "Wins":49, "Points":331, "Assists":117, "Total Rebounds":230, "Offensive Rebounds":91, "Defensive Rebounds":139, "Steals":88, "Blocks":9, "Field Goals Made":122, "Field Goals Attempted":448, "Three Pointers Made":31, "Three Pointers Attempted":127, "Free Throws Made":56, "Free Throws Attempted":110}},
  {id:"ht155", name:"Natalie Bohannon", firstYear:"2023-2024", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":82, "Wins":72, "Points":986, "Assists":118, "Total Rebounds":586, "Offensive Rebounds":278, "Defensive Rebounds":308, "Steals":199, "Blocks":125, "Field Goals Made":388, "Field Goals Attempted":932, "Three Pointers Made":128, "Three Pointers Attempted":423, "Free Throws Made":82, "Free Throws Attempted":124}},
  {id:"ht156", name:"Nerea Genc", firstYear:"2020-2021", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":45, "Wins":35, "Points":97, "Assists":36, "Total Rebounds":218, "Offensive Rebounds":123, "Defensive Rebounds":95, "Steals":68, "Blocks":6, "Field Goals Made":39, "Field Goals Attempted":184, "Three Pointers Attempted":2, "Free Throws Made":19, "Free Throws Attempted":43}},
  {id:"ht157", name:"Nicole Landhuis", firstYear:"2011-2012", lastYear:"2012-2013", isCurrent:false, stats:{"Games Played":27, "Wins":29, "Points":42, "Assists":28, "Total Rebounds":89, "Offensive Rebounds":30, "Defensive Rebounds":59, "Steals":43, "Blocks":2, "Field Goals Made":17, "Field Goals Attempted":59, "Three Pointers Attempted":4, "Free Throws Made":8, "Free Throws Attempted":13}},
  {id:"ht158", name:"Nina Botero", firstYear:"2010-2011", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":15, "Wins":10, "Points":17, "Assists":7, "Total Rebounds":15, "Offensive Rebounds":8, "Defensive Rebounds":7, "Steals":8, "Blocks":1, "Field Goals Made":8, "Field Goals Attempted":31, "Three Pointers Attempted":1, "Free Throws Made":1, "Free Throws Attempted":6}},
  {id:"ht159", name:"Noelani Book", firstYear:"2023-2024", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":53, "Wins":46, "Points":553, "Assists":216, "Total Rebounds":172, "Offensive Rebounds":70, "Defensive Rebounds":102, "Steals":141, "Blocks":5, "Field Goals Made":193, "Field Goals Attempted":570, "Three Pointers Made":89, "Three Pointers Attempted":300, "Free Throws Made":78, "Free Throws Attempted":109}},
  {id:"ht160", name:"Patti DeJong", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":43, "Wins":34, "Points":125, "Assists":13, "Total Rebounds":148, "Offensive Rebounds":72, "Defensive Rebounds":76, "Steals":31, "Blocks":8, "Field Goals Made":47, "Field Goals Attempted":170, "Free Throws Made":31, "Free Throws Attempted":92}},
  {id:"ht161", name:"Patty Buikema", firstYear:"1979-1980", lastYear:"1982-1983", isCurrent:false, stats:{"Games Played":79, "Wins":30, "Points":744, "Assists":92, "Total Rebounds":569, "Offensive Rebounds":265, "Defensive Rebounds":304, "Steals":199, "Blocks":191, "Field Goals Made":317, "Field Goals Attempted":770, "Free Throws Made":113, "Free Throws Attempted":237}},
  {id:"ht162", name:"Patty Vander Molen", firstYear:"1981-1982", lastYear:"1983-1984", isCurrent:false, stats:{"Games Played":68, "Wins":35, "Points":394, "Assists":189, "Total Rebounds":227, "Offensive Rebounds":94, "Defensive Rebounds":133, "Steals":179, "Blocks":9, "Field Goals Made":151, "Field Goals Attempted":427, "Free Throws Made":92, "Free Throws Attempted":201}},
  {id:"ht163", name:"Paula Been", firstYear:"1986-1987", lastYear:"1986-1987", isCurrent:false, stats:{"Games Played":12, "Wins":22, "Points":7, "Assists":2, "Total Rebounds":9, "Offensive Rebounds":7, "Defensive Rebounds":2, "Steals":3, "Blocks":1, "Field Goals Made":3, "Field Goals Attempted":14, "Free Throws Made":1, "Free Throws Attempted":2}},
  {id:"ht164", name:"Quin Covey", firstYear:"2023-2024", lastYear:"2023-2024", isCurrent:false, stats:{"Games Played":11, "Wins":20, "Points":16, "Assists":5, "Total Rebounds":15, "Offensive Rebounds":10, "Defensive Rebounds":5, "Steals":2, "Blocks":3, "Field Goals Made":7, "Field Goals Attempted":26, "Three Pointers Made":1, "Three Pointers Attempted":9, "Free Throws Made":1, "Free Throws Attempted":4}},
  {id:"ht165", name:"Rachael Afman", firstYear:"2007-2008", lastYear:"2008-2009", isCurrent:false, stats:{"Games Played":42, "Wins":28, "Points":97, "Assists":23, "Total Rebounds":103, "Offensive Rebounds":28, "Defensive Rebounds":75, "Steals":16, "Blocks":13, "Field Goals Made":36, "Field Goals Attempted":108, "Three Pointers Attempted":1, "Free Throws Made":25, "Free Throws Attempted":36}},
  {id:"ht166", name:"Rachel Delcid", firstYear:"2009-2010", lastYear:"2009-2010", isCurrent:false, stats:{"Games Played":20, "Wins":3, "Points":26, "Assists":5, "Total Rebounds":15, "Offensive Rebounds":8, "Defensive Rebounds":7, "Steals":3, "Blocks":3, "Field Goals Made":10, "Field Goals Attempted":32, "Three Pointers Made":2, "Three Pointers Attempted":8, "Free Throws Made":4, "Free Throws Attempted":17}},
  {id:"ht167", name:"Rachel Papineau", firstYear:"2016-2017", lastYear:"2018-2019", isCurrent:false, stats:{"Games Played":46, "Wins":46, "Points":92, "Assists":16, "Total Rebounds":73, "Offensive Rebounds":26, "Defensive Rebounds":47, "Steals":40, "Blocks":1, "Field Goals Made":35, "Field Goals Attempted":127, "Three Pointers Made":6, "Three Pointers Attempted":30, "Free Throws Made":16, "Free Throws Attempted":32}},
  {id:"ht168", name:"Rachel Verhoef", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":20, "Wins":23, "Points":133, "Assists":48, "Total Rebounds":51, "Offensive Rebounds":20, "Defensive Rebounds":31, "Steals":59, "Blocks":13, "Field Goals Made":61, "Field Goals Attempted":193, "Three Pointers Made":3, "Three Pointers Attempted":18, "Free Throws Made":8, "Free Throws Attempted":26}},
  {id:"ht169", name:"Raelynne VanHeukelem", firstYear:"2017-2018", lastYear:"2017-2018", isCurrent:false, stats:{"Wins":18}},
  {id:"ht170", name:"Riah Moore", firstYear:"2024-2025", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":47, "Wins":52, "Points":374, "Assists":111, "Total Rebounds":117, "Offensive Rebounds":57, "Defensive Rebounds":60, "Steals":143, "Blocks":4, "Field Goals Made":150, "Field Goals Attempted":359, "Three Pointers Made":36, "Three Pointers Attempted":140, "Free Throws Made":38, "Free Throws Attempted":64}},
  {id:"ht171", name:"Riley Chalmers", firstYear:"2021-2022", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":32, "Wins":28, "Points":28, "Assists":15, "Total Rebounds":47, "Offensive Rebounds":21, "Defensive Rebounds":26, "Steals":17, "Blocks":1, "Field Goals Made":13, "Field Goals Attempted":28, "Three Pointers Attempted":4, "Free Throws Made":2, "Free Throws Attempted":5}},
  {id:"ht172", name:"Risa Wolffis", firstYear:"2009-2010", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":43, "Wins":13, "Points":274, "Assists":35, "Total Rebounds":274, "Offensive Rebounds":111, "Defensive Rebounds":163, "Steals":60, "Blocks":25, "Field Goals Made":92, "Field Goals Attempted":287, "Free Throws Made":90, "Free Throws Attempted":151}},
  {id:"ht173", name:"Robin Hunsinger", firstYear:"1987-1988", lastYear:"1993-1994", isCurrent:false, stats:{"Games Played":15, "Wins":18, "Points":25, "Assists":6, "Total Rebounds":12, "Offensive Rebounds":3, "Defensive Rebounds":9, "Steals":3, "Field Goals Made":12, "Field Goals Attempted":40, "Free Throws Made":1, "Free Throws Attempted":5}},
  {id:"ht174", name:"Ryleigh Newcombe", firstYear:"2009-2010", lastYear:"2011-2012", isCurrent:false, stats:{"Games Played":63, "Wins":30, "Points":243, "Assists":81, "Total Rebounds":54, "Offensive Rebounds":13, "Defensive Rebounds":41, "Steals":54, "Blocks":7, "Field Goals Made":86, "Field Goals Attempted":356, "Three Pointers Made":20, "Three Pointers Attempted":99, "Free Throws Made":51, "Free Throws Attempted":81}},
  {id:"ht175", name:"Sandy Forseth", firstYear:"1982-1983", lastYear:"1983-1984", isCurrent:false, stats:{"Games Played":45, "Wins":18, "Points":132, "Assists":83, "Total Rebounds":182, "Offensive Rebounds":48, "Defensive Rebounds":134, "Steals":66, "Blocks":2, "Field Goals Made":47, "Field Goals Attempted":140, "Free Throws Made":38, "Free Throws Attempted":63}},
  {id:"ht176", name:"Sandy Jeltema", firstYear:"1977-1978", lastYear:"1978-1979", isCurrent:false, stats:{"Games Played":35, "Wins":14, "Points":78, "Assists":6, "Total Rebounds":129, "Offensive Rebounds":27, "Defensive Rebounds":40, "Steals":7, "Field Goals Made":30, "Field Goals Attempted":106, "Free Throws Made":18, "Free Throws Attempted":42}},
  {id:"ht177", name:"Seaura Merritt", firstYear:"2012-2013", lastYear:"2014-2015", isCurrent:false, stats:{"Games Played":45, "Wins":24, "Points":162, "Assists":16, "Total Rebounds":146, "Offensive Rebounds":55, "Defensive Rebounds":91, "Steals":42, "Blocks":1, "Field Goals Made":62, "Field Goals Attempted":190, "Three Pointers Attempted":1, "Free Throws Made":38, "Free Throws Attempted":104}},
  {id:"ht178", name:"Sheila Van Kooten", firstYear:"1985-1986", lastYear:"1985-1986", isCurrent:false, stats:{"Games Played":22, "Wins":14, "Points":109, "Assists":70, "Total Rebounds":86, "Offensive Rebounds":34, "Defensive Rebounds":51, "Blocks":1, "Field Goals Made":46, "Field Goals Attempted":107, "Free Throws Made":19, "Free Throws Attempted":41}},
  {id:"ht179", name:"Sheila Van Kooten", firstYear:"1983-1984", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":41, "Wins":34, "Points":84, "Assists":18, "Total Rebounds":101, "Offensive Rebounds":28, "Defensive Rebounds":73, "Steals":53, "Blocks":6, "Field Goals Made":31, "Field Goals Attempted":95, "Free Throws Made":23, "Free Throws Attempted":50}},
  {id:"ht180", name:"Shelly DeGroot", firstYear:"1982-1983", lastYear:"1983-1984", isCurrent:false, stats:{"Games Played":28, "Wins":18, "Points":248, "Assists":14, "Total Rebounds":231, "Offensive Rebounds":88, "Defensive Rebounds":143, "Steals":23, "Blocks":69, "Field Goals Made":108, "Field Goals Attempted":286, "Free Throws Made":32, "Free Throws Attempted":99}},
  {id:"ht181", name:"Sheri Kraai", firstYear:"1980-1981", lastYear:"1980-1981", isCurrent:false, stats:{"Games Played":15, "Wins":4, "Points":2, "Total Rebounds":4, "Offensive Rebounds":2, "Defensive Rebounds":2, "Field Goals Made":1, "Field Goals Attempted":4, "Free Throws Attempted":2}},
  {id:"ht182", name:"Sloane Huscroft", firstYear:"2023-2024", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":42, "Wins":72, "Points":110, "Assists":46, "Total Rebounds":91, "Offensive Rebounds":38, "Defensive Rebounds":53, "Steals":49, "Blocks":9, "Field Goals Made":50, "Field Goals Attempted":132, "Three Pointers Made":2, "Three Pointers Attempted":8, "Free Throws Made":8, "Free Throws Attempted":10}},
  {id:"ht183", name:"Sophie Bull", firstYear:"2018-2019", lastYear:"2021-2022", isCurrent:false, stats:{"Games Played":80, "Wins":47, "Points":655, "Assists":88, "Total Rebounds":365, "Offensive Rebounds":141, "Defensive Rebounds":224, "Steals":186, "Blocks":5, "Field Goals Made":236, "Field Goals Attempted":786, "Three Pointers Made":73, "Three Pointers Attempted":337, "Free Throws Made":108, "Free Throws Attempted":226}},
  {id:"ht184", name:"Starla Navis", firstYear:"1982-1983", lastYear:"1983-1984", isCurrent:false, stats:{"Games Played":35, "Wins":18, "Points":32, "Assists":8, "Total Rebounds":27, "Offensive Rebounds":9, "Defensive Rebounds":18, "Steals":19, "Field Goals Made":16, "Field Goals Attempted":70, "Free Throws Attempted":7}},
  {id:"ht185", name:"Suzanne Meyering", firstYear:"1994-1995", lastYear:"1994-1995", isCurrent:false, stats:{"Games Played":24, "Wins":23, "Points":92, "Assists":10, "Total Rebounds":75, "Offensive Rebounds":33, "Defensive Rebounds":42, "Steals":27, "Blocks":4, "Field Goals Made":34, "Field Goals Attempted":110, "Three Pointers Made":1, "Three Pointers Attempted":2, "Free Throws Made":23, "Free Throws Attempted":31}},
  {id:"ht186", name:"Sydney Beijer", firstYear:"2016-2017", lastYear:"2017-2018", isCurrent:false, stats:{"Games Played":47, "Wins":34, "Points":277, "Assists":37, "Total Rebounds":122, "Offensive Rebounds":37, "Defensive Rebounds":85, "Steals":88, "Field Goals Made":103, "Field Goals Attempted":354, "Three Pointers Made":23, "Three Pointers Attempted":134, "Free Throws Made":27, "Free Throws Attempted":63}},
  {id:"ht187", name:"Sydney Fitzgerald", firstYear:"2019-2020", lastYear:"2022-2023", isCurrent:false, stats:{"Games Played":77, "Wins":49, "Points":254, "Assists":76, "Total Rebounds":348, "Offensive Rebounds":157, "Defensive Rebounds":191, "Steals":149, "Blocks":24, "Field Goals Made":104, "Field Goals Attempted":352, "Three Pointers Made":1, "Three Pointers Attempted":23, "Free Throws Made":43, "Free Throws Attempted":104}},
  {id:"ht188", name:"Tammy Vaughan", firstYear:"1981-1982", lastYear:"1984-1985", isCurrent:false, stats:{"Games Played":88, "Wins":51, "Points":641, "Assists":64, "Total Rebounds":505, "Offensive Rebounds":186, "Defensive Rebounds":319, "Steals":83, "Blocks":31, "Field Goals Made":263, "Field Goals Attempted":708, "Free Throws Made":121, "Free Throws Attempted":236}},
  {id:"ht189", name:"Taylor McNally", firstYear:"2018-2019", lastYear:"2021-2022", isCurrent:false, stats:{"Games Played":41, "Wins":33, "Points":78, "Assists":30, "Total Rebounds":72, "Offensive Rebounds":24, "Defensive Rebounds":48, "Steals":38, "Blocks":2, "Field Goals Made":34, "Field Goals Attempted":149, "Three Pointers Made":1, "Three Pointers Attempted":20, "Free Throws Made":9, "Free Throws Attempted":21}},
  {id:"ht190", name:"Teagan Fuller", firstYear:"2022-2023", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":90, "Wins":86, "Points":635, "Assists":204, "Total Rebounds":204, "Offensive Rebounds":97, "Defensive Rebounds":107, "Steals":192, "Blocks":15, "Field Goals Made":249, "Field Goals Attempted":645, "Three Pointers Made":36, "Three Pointers Attempted":193, "Free Throws Made":101, "Free Throws Attempted":192}},
  {id:"ht191", name:"Tenley Fuller", firstYear:"2025-2026", lastYear:"2025-2026", isCurrent:true, stats:{"Games Played":27, "Wins":26, "Points":394, "Assists":143, "Total Rebounds":149, "Offensive Rebounds":77, "Defensive Rebounds":72, "Steals":170, "Blocks":6, "Field Goals Made":152, "Field Goals Attempted":364, "Three Pointers Made":17, "Three Pointers Attempted":99, "Free Throws Made":73, "Free Throws Attempted":130}},
  {id:"ht192", name:"Tina Vaughan", firstYear:"1985-1986", lastYear:"1985-1986", isCurrent:false, stats:{"Games Played":18, "Wins":14, "Points":215, "Assists":11, "Total Rebounds":118, "Offensive Rebounds":49, "Defensive Rebounds":69, "Steals":19, "Blocks":2, "Field Goals Made":91, "Field Goals Attempted":173, "Free Throws Made":37, "Free Throws Attempted":65}},
  {id:"ht193", name:"Tricia Colsman", firstYear:"1977-1978", lastYear:"1979-1980", isCurrent:false, stats:{"Games Played":56, "Wins":23, "Points":226, "Assists":25, "Total Rebounds":174, "Offensive Rebounds":63, "Defensive Rebounds":89, "Steals":48, "Blocks":11, "Field Goals Made":89, "Field Goals Attempted":364, "Free Throws Made":54, "Free Throws Attempted":141}},
  {id:"ht194", name:"Trynn Ekeren", firstYear:"2024-2025", lastYear:"2024-2025", isCurrent:false, stats:{"Games Played":19, "Wins":26, "Points":8, "Assists":6, "Total Rebounds":15, "Offensive Rebounds":6, "Defensive Rebounds":9, "Steals":4, "Blocks":1, "Field Goals Made":3, "Field Goals Attempted":21, "Three Pointers Attempted":1, "Free Throws Made":2, "Free Throws Attempted":4}},
  {id:"ht195", name:"Zoe Herrington", firstYear:"2010-2011", lastYear:"2010-2011", isCurrent:false, stats:{"Games Played":5, "Wins":10, "Points":4, "Assists":2, "Total Rebounds":2, "Offensive Rebounds":2, "Field Goals Made":2, "Field Goals Attempted":10, "Three Pointers Attempted":1, "Free Throws Attempted":2}},
];

const DC_FOOTBALL_SEASONS = [
  {
    "season": "2025-2026",
    "wins": 0,
    "losses": 0,
    "leagueWins": 0,
    "leagueLosses": 0,
    "coach": "Bret McGatlin",
    "notes": null,
    "winPct": null
  },
  {
    "season": "2024-2025",
    "wins": 4,
    "losses": 5,
    "leagueWins": 3,
    "leagueLosses": 1,
    "coach": "Bret McGatlin",
    "notes": null,
    "winPct": 44.4
  },
  {
    "season": "2023-2024",
    "wins": 2,
    "losses": 7,
    "leagueWins": 1,
    "leagueLosses": 3,
    "coach": "Rob Harris",
    "notes": null,
    "winPct": 22.2
  },
  {
    "season": "2022-2023",
    "wins": 4,
    "losses": 5,
    "leagueWins": 3,
    "leagueLosses": 2,
    "coach": "Rob Harris",
    "notes": null,
    "winPct": 44.4
  },
  {
    "season": "2021-2022",
    "wins": 4,
    "losses": 5,
    "leagueWins": 3,
    "leagueLosses": 2,
    "coach": "Rob Harris",
    "notes": null,
    "winPct": 44.4
  },
  {
    "season": "2020-2021",
    "wins": 0,
    "losses": 9,
    "leagueWins": 0,
    "leagueLosses": 6,
    "coach": "Jordan Quinn",
    "notes": null,
    "winPct": 0.0
  },
  {
    "season": "2020-2021",
    "wins": 0,
    "losses": 6,
    "leagueWins": 0,
    "leagueLosses": 4,
    "coach": "Dirk Visser",
    "notes": null,
    "winPct": 0.0
  },
  {
    "season": "2019-2020",
    "wins": 3,
    "losses": 4,
    "leagueWins": 2,
    "leagueLosses": 2,
    "coach": "Dirk Visser",
    "notes": null,
    "winPct": 42.9
  },
  {
    "season": "2013-2014",
    "wins": 1,
    "losses": 7,
    "leagueWins": 1,
    "leagueLosses": 5,
    "coach": "Troy VandenBroeke",
    "notes": null,
    "winPct": 12.5
  },
  {
    "season": "2012-2013",
    "wins": 6,
    "losses": 3,
    "leagueWins": 4,
    "leagueLosses": 3,
    "coach": "Troy VandenBroeke",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "2011-2012",
    "wins": 3,
    "losses": 6,
    "leagueWins": 1,
    "leagueLosses": 2,
    "coach": "Troy VandenBroeke",
    "notes": null,
    "winPct": 33.3
  },
  {
    "season": "2010-2011",
    "wins": 5,
    "losses": 4,
    "leagueWins": 1,
    "leagueLosses": 3,
    "coach": "Troy VandenBroeke",
    "notes": null,
    "winPct": 55.6
  },
  {
    "season": "2009-2010",
    "wins": 2,
    "losses": 8,
    "leagueWins": 2,
    "leagueLosses": 5,
    "coach": "Troy VandenBroeke",
    "notes": null,
    "winPct": 20.0
  },
  {
    "season": "2008-2009",
    "wins": 5,
    "losses": 5,
    "leagueWins": 3,
    "leagueLosses": 4,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 50.0
  },
  {
    "season": "2007-2008",
    "wins": 3,
    "losses": 6,
    "leagueWins": 3,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 33.3
  },
  {
    "season": "2006-2007",
    "wins": 7,
    "losses": 4,
    "leagueWins": 5,
    "leagueLosses": 1,
    "coach": "Mark Swalley",
    "notes": "League Champs",
    "winPct": 63.6
  },
  {
    "season": "2005-2006",
    "wins": 6,
    "losses": 3,
    "leagueWins": 5,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "2004-2005",
    "wins": 6,
    "losses": 3,
    "leagueWins": 5,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "2003-2004",
    "wins": 12,
    "losses": 1,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": "League Champs/State Champs",
    "winPct": 92.3
  },
  {
    "season": "2002-2003",
    "wins": 9,
    "losses": 2,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": "Elite 8",
    "winPct": 81.8
  },
  {
    "season": "2001-2002",
    "wins": 9,
    "losses": 1,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": "League Champs",
    "winPct": 90.0
  },
  {
    "season": "2000-2001",
    "wins": 6,
    "losses": 3,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "1999-2000",
    "wins": 8,
    "losses": 1,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": "League Champs",
    "winPct": 88.9
  },
  {
    "season": "1998-1999",
    "wins": 8,
    "losses": 2,
    "leagueWins": 5,
    "leagueLosses": 2,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 80.0
  },
  {
    "season": "1997-1998",
    "wins": 5,
    "losses": 5,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 50.0
  },
  {
    "season": "1996-1997",
    "wins": 5,
    "losses": 4,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 55.6
  },
  {
    "season": "1995-1996",
    "wins": 7,
    "losses": 3,
    "leagueWins": 7,
    "leagueLosses": 2,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 70.0
  },
  {
    "season": "1994-1995",
    "wins": 9,
    "losses": 2,
    "leagueWins": 8,
    "leagueLosses": 1,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 81.8
  },
  {
    "season": "1993-1994",
    "wins": 7,
    "losses": 3,
    "leagueWins": 7,
    "leagueLosses": 2,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 70.0
  },
  {
    "season": "1992-1993",
    "wins": 10,
    "losses": 1,
    "leagueWins": 9,
    "leagueLosses": 0,
    "coach": "Mark Swalley",
    "notes": "League Champs",
    "winPct": 90.9
  },
  {
    "season": "1991-1992",
    "wins": 5,
    "losses": 4,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 55.6
  },
  {
    "season": "1990-1991",
    "wins": 3,
    "losses": 6,
    "leagueWins": 3,
    "leagueLosses": 6,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 33.3
  },
  {
    "season": "1989-1990",
    "wins": 8,
    "losses": 3,
    "leagueWins": 8,
    "leagueLosses": 2,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 72.7
  },
  {
    "season": "1988-1989",
    "wins": 5,
    "losses": 4,
    "leagueWins": 5,
    "leagueLosses": 4,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 55.6
  },
  {
    "season": "1987-1988",
    "wins": 6,
    "losses": 3,
    "leagueWins": 2,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "1986-1987",
    "wins": 4,
    "losses": 5,
    "leagueWins": 2,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 44.4
  },
  {
    "season": "1985-1986",
    "wins": 4,
    "losses": 5,
    "leagueWins": 1,
    "leagueLosses": 4,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 44.4
  },
  {
    "season": "1984-1985",
    "wins": 6,
    "losses": 3,
    "leagueWins": 2,
    "leagueLosses": 3,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "1983-1984",
    "wins": 9,
    "losses": 2,
    "leagueWins": 4,
    "leagueLosses": 1,
    "coach": "Mark Swalley",
    "notes": null,
    "winPct": 81.8
  },
  {
    "season": "1982-1983",
    "wins": 9,
    "losses": 2,
    "leagueWins": 5,
    "leagueLosses": 0,
    "coach": "Mark Swalley",
    "notes": "League Champs",
    "winPct": 81.8
  },
  {
    "season": "1981-1982",
    "wins": 8,
    "losses": 2,
    "leagueWins": 5,
    "leagueLosses": 0,
    "coach": "Eldon Dyk",
    "notes": "League Champs",
    "winPct": 80.0
  },
  {
    "season": "1980-1981",
    "wins": 7,
    "losses": 2,
    "leagueWins": 4,
    "leagueLosses": 1,
    "coach": null,
    "notes": null,
    "winPct": 77.8
  },
  {
    "season": "1979-1980",
    "wins": 6,
    "losses": 3,
    "leagueWins": 5,
    "leagueLosses": 3,
    "coach": null,
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "1978-1979",
    "wins": 5,
    "losses": 4,
    "leagueWins": 3,
    "leagueLosses": 4,
    "coach": null,
    "notes": null,
    "winPct": 55.6
  },
  {
    "season": "1977-1978",
    "wins": 1,
    "losses": 8,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": null,
    "notes": null,
    "winPct": 11.1
  },
  {
    "season": "1976-1977",
    "wins": null,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": null,
    "notes": "League Champs",
    "winPct": null
  },
  {
    "season": "1975-1976",
    "wins": null,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": null,
    "notes": "League Champs",
    "winPct": null
  }
];

const DC_GIRLS_SEASONS = [
  {
    "season": "2025-2026",
    "wins": 26,
    "losses": 2,
    "leagueWins": 10,
    "leagueLosses": 0,
    "coach": "Chris Fuller",
    "notes": "League Champions/Final 4/3rd Place",
    "winPct": 92.9
  },
  {
    "season": "2024-2025",
    "wins": 26,
    "losses": 2,
    "leagueWins": 10,
    "leagueLosses": 0,
    "coach": "Chris Fuller",
    "notes": "League Champions/State Runner Up",
    "winPct": 92.9
  },
  {
    "season": "2023-2024",
    "wins": 20,
    "losses": 6,
    "leagueWins": 9,
    "leagueLosses": 0,
    "coach": "Chris Fuller",
    "notes": "League Champions/Elite 8",
    "winPct": 76.9
  },
  {
    "season": "2022-2023",
    "wins": 14,
    "losses": 8,
    "leagueWins": 7,
    "leagueLosses": 3,
    "coach": "Chris Fuller",
    "notes": "Round of 32",
    "winPct": 63.6
  },
  {
    "season": "2021-2022",
    "wins": 14,
    "losses": 9,
    "leagueWins": 7,
    "leagueLosses": 3,
    "coach": "Chris Fuller",
    "notes": "Sweet 16",
    "winPct": 60.9
  },
  {
    "season": "2020-2021",
    "wins": 7,
    "losses": 6,
    "leagueWins": 7,
    "leagueLosses": 4,
    "coach": "Chris Fuller",
    "notes": null,
    "winPct": 53.8
  },
  {
    "season": "2019-2020",
    "wins": 14,
    "losses": 9,
    "leagueWins": 9,
    "leagueLosses": 3,
    "coach": "Kelvin Haidle",
    "notes": null,
    "winPct": 60.9
  },
  {
    "season": "2018-2019",
    "wins": 12,
    "losses": 11,
    "leagueWins": 8,
    "leagueLosses": 4,
    "coach": "Kelvin Haidle",
    "notes": null,
    "winPct": 52.2
  },
  {
    "season": "2017-2018",
    "wins": 18,
    "losses": 5,
    "leagueWins": 11,
    "leagueLosses": 0,
    "coach": "Kelvin Haidle",
    "notes": "League Champions",
    "winPct": 78.3
  },
  {
    "season": "2016-2017",
    "wins": 16,
    "losses": 8,
    "leagueWins": 8,
    "leagueLosses": 3,
    "coach": "Kelvin Haidle",
    "notes": null,
    "winPct": 66.7
  },
  {
    "season": "2015-2016",
    "wins": 12,
    "losses": 11,
    "leagueWins": 6,
    "leagueLosses": 5,
    "coach": "Amber Van",
    "notes": null,
    "winPct": 52.2
  },
  {
    "season": "2014-2015",
    "wins": 8,
    "losses": 13,
    "leagueWins": 5,
    "leagueLosses": 6,
    "coach": "Amber Van",
    "notes": null,
    "winPct": 38.1
  },
  {
    "season": "2013-2014",
    "wins": 4,
    "losses": 16,
    "leagueWins": 2,
    "leagueLosses": 7,
    "coach": "Amber Van",
    "notes": null,
    "winPct": 20.0
  },
  {
    "season": "2012-2013",
    "wins": 12,
    "losses": 10,
    "leagueWins": 8,
    "leagueLosses": 1,
    "coach": "Becky Mudd",
    "notes": "League Champions",
    "winPct": 54.5
  },
  {
    "season": "2011-2012",
    "wins": 17,
    "losses": 6,
    "leagueWins": 7,
    "leagueLosses": 0,
    "coach": "Becky Mudd",
    "notes": "League Champions",
    "winPct": 73.9
  },
  {
    "season": "2010-2011",
    "wins": 10,
    "losses": 13,
    "leagueWins": 6,
    "leagueLosses": 5,
    "coach": "Becky Mudd",
    "notes": "State Sweet 16",
    "winPct": 43.5
  },
  {
    "season": "2009-2010",
    "wins": 3,
    "losses": 17,
    "leagueWins": 2,
    "leagueLosses": 11,
    "coach": "Becky Mudd",
    "notes": null,
    "winPct": 15.0
  },
  {
    "season": "2008-2009",
    "wins": 10,
    "losses": 13,
    "leagueWins": 7,
    "leagueLosses": 5,
    "coach": "Becky Mudd",
    "notes": "State Round of 32",
    "winPct": 43.5
  },
  {
    "season": "2007-2008",
    "wins": 18,
    "losses": 4,
    "leagueWins": 7,
    "leagueLosses": 2,
    "coach": "Becky Mudd",
    "notes": "State Round of 32",
    "winPct": 81.8
  },
  {
    "season": "2006-2007",
    "wins": 18,
    "losses": 8,
    "leagueWins": 8,
    "leagueLosses": 2,
    "coach": "Becky Mudd",
    "notes": "State Final 8",
    "winPct": 69.2
  },
  {
    "season": "2005-2006",
    "wins": 25,
    "losses": 2,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "League Champions, District Champs, Regional Champs, State Runner-Up",
    "winPct": 92.6
  },
  {
    "season": "2004-2005",
    "wins": 19,
    "losses": 6,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "League Champions, State Sweet 16",
    "winPct": 76.0
  },
  {
    "season": "2003-2004",
    "wins": 18,
    "losses": 7,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "State Sweet 16",
    "winPct": 72.0
  },
  {
    "season": "2002-2003",
    "wins": 13,
    "losses": 10,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "State First Round",
    "winPct": 56.5
  },
  {
    "season": "2001-2002",
    "wins": 23,
    "losses": 3,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "District Champs, Regional Champs, State Final 8",
    "winPct": 88.5
  },
  {
    "season": "2000-2001",
    "wins": 24,
    "losses": 2,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "District Champs, Regional Champs, State 3rd place",
    "winPct": 92.3
  },
  {
    "season": "1999-2000",
    "wins": 17,
    "losses": 8,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Becky Mudd",
    "notes": "Regional Champs, State Final 8",
    "winPct": 68.0
  },
  {
    "season": "1998-1999",
    "wins": 61,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": null
  },
  {
    "season": "1997-1998",
    "wins": 19,
    "losses": 7,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": "3rd Place Finish",
    "winPct": 73.1
  },
  {
    "season": "1996-1997",
    "wins": null,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": "League Champions",
    "winPct": null
  },
  {
    "season": "1995-1996",
    "wins": null,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": null
  },
  {
    "season": "1994-1995",
    "wins": 23,
    "losses": 1,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": "Final 4",
    "winPct": 95.8
  },
  {
    "season": "1993-1994",
    "wins": 22,
    "losses": 2,
    "leagueWins": 14,
    "leagueLosses": 0,
    "coach": "Duane Buys",
    "notes": "League Champions, Elite 8",
    "winPct": 91.7
  },
  {
    "season": "1992-1993",
    "wins": 23,
    "losses": 3,
    "leagueWins": 13,
    "leagueLosses": 1,
    "coach": "Duane Buys",
    "notes": "League Champions, State Runner Up",
    "winPct": 88.5
  },
  {
    "season": "1991-1992",
    "wins": null,
    "losses": null,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": null
  },
  {
    "season": "1990-1991",
    "wins": 15,
    "losses": 5,
    "leagueWins": 10,
    "leagueLosses": 3,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 75.0
  },
  {
    "season": "1989-1990",
    "wins": 12,
    "losses": 9,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 57.1
  },
  {
    "season": "1988-1989",
    "wins": 10,
    "losses": 9,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 52.6
  },
  {
    "season": "1987-1988",
    "wins": 18,
    "losses": 5,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 78.3
  },
  {
    "season": "1986-1987",
    "wins": 22,
    "losses": 4,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": "League Champions, State 3rd place, first time team ever qualified for state tournament",
    "winPct": 84.6
  },
  {
    "season": "1985-1986",
    "wins": 14,
    "losses": 8,
    "leagueWins": 8,
    "leagueLosses": 2,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 63.6
  },
  {
    "season": "1984-1985",
    "wins": 16,
    "losses": 4,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 80.0
  },
  {
    "season": "1983-1984",
    "wins": 18,
    "losses": 5,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 78.3
  },
  {
    "season": "1982-1983",
    "wins": 17,
    "losses": 6,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": "League Champions",
    "winPct": 73.9
  },
  {
    "season": "1981-1982",
    "wins": 17,
    "losses": 6,
    "leagueWins": 9,
    "leagueLosses": 1,
    "coach": "Duane Buys",
    "notes": "League Champions",
    "winPct": 73.9
  },
  {
    "season": "1980-1981",
    "wins": 4,
    "losses": 12,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 25.0
  },
  {
    "season": "1979-1980",
    "wins": 9,
    "losses": 11,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 45.0
  },
  {
    "season": "1978-1979",
    "wins": 6,
    "losses": 13,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Duane Buys",
    "notes": null,
    "winPct": 31.6
  },
  {
    "season": "1977-1978",
    "wins": 8,
    "losses": 9,
    "leagueWins": null,
    "leagueLosses": null,
    "coach": "Arlo Kreun",
    "notes": null,
    "winPct": 47.1
  }
];

const SEED_SCHOOLS = [
  {
    id:"s1", name:"Denver Christian", mascot:"Thunder", sport:"football", primaryColor:"#1a3a6b",
    athletes:[
      { id:"p1", isActive:true,  name:"Deven Lord",         position:"K/P",    gradYear:2029, stats:{"Games Played":9,"Extra Points Made":17,"Extra Points Attempted":17,"Field Goals Made":1,"Field Goals Attempted":1,"Longest Field Goal Made":29}},
      { id:"p2", isActive:true,  name:"Josiah Correa",       position:"RB/CB",  gradYear:2028, stats:{"Games Played":9}},
      { id:"p3", isActive:true,  name:"Elijah Whitfield",    position:"RB/DB",  gradYear:2028, stats:{"Games Played":9,"Rushing Attempts":15,"Rushing Yards":243,"Rushing Yards Per Game":27.0,"Longest Rush":75,"Rushing TDs":3,"Total TDs":3,"Solo Tackles":16,"Combined Tackles":26,"Interceptions":2,"Interception Return Yards":17,"Passes Defended":1,"Fumbles Recovered":1,"Kick Returns":12,"Kick Return Yards":192,"Longest Kick Return":36}},
      { id:"p4", isActive:true,  name:"Cole McCabe",         position:"QB/SS",  gradYear:2028, stats:{"Games Played":9,"Pass Completions":37,"Pass Attempts":77,"Passing Yards":481,"Completion %":48.1,"Passing Yards Per Game":53.4,"Completions Per Game":4.1,"Passing TDs":6,"Interceptions":7,"Longest Pass":48,"Rushing Attempts":60,"Rushing Yards":263,"Rushing Yards Per Game":29.2,"Longest Rush":37,"Rushing TDs":2,"Total TDs":2,"Solo Tackles":34,"Combined Tackles":55,"Tackles For Loss":1.5,"Kick Returns":2,"Kick Return Yards":60,"Longest Kick Return":40}},
      { id:"p5", isActive:true,  name:"Malachi Torrez",      position:"TE/DE",  gradYear:2026, stats:{"Games Played":9,"Rushing Attempts":1,"Rushing Yards":9,"Longest Rush":9,"Solo Tackles":6,"Combined Tackles":16,"Tackles For Loss":1.5,"Sacks":1.0,"Passes Defended":1,"Kick Returns":1,"Kick Return Yards":6,"Longest Kick Return":6}},
      { id:"p6", isActive:true,  name:"Pete Smith",          position:"RB/CB",  gradYear:2027, stats:{"Games Played":9,"Pass Completions":0,"Pass Attempts":1,"Passing Yards":0,"Rushing Attempts":31,"Rushing Yards":172,"Rushing Yards Per Game":19.1,"Longest Rush":63,"Rushing TDs":2,"Receptions":10,"Receiving Yards":112,"Receiving Yards Per Game":12.4,"Longest Reception":44,"Total TDs":2,"Solo Tackles":11,"Combined Tackles":14,"Interceptions":1,"Interception Return Yards":39,"Passes Defended":3,"Fumbles Recovered":1,"Punts":1,"Punting Yards":28,"Longest Punt":28}},
      { id:"p7", isActive:true,  name:"Driggs Silvernale",   position:"WR/CB",  gradYear:2028, stats:{"Games Played":9,"Rushing Attempts":15,"Rushing Yards":101,"Rushing Yards Per Game":11.2,"Longest Rush":29,"Rushing TDs":3,"Total TDs":3,"Solo Tackles":13,"Combined Tackles":20,"Tackles For Loss":1.0,"Passes Defended":4,"Kick Returns":8,"Kick Return Yards":90,"Longest Kick Return":21,"Punt Returns":1,"Punt Return Yards":6,"Longest Punt Return":6}},
      { id:"p8", isActive:true,  name:"Camden Epperhart",    position:"QB/P",   gradYear:2029, stats:{"Games Played":9,"Rushing Attempts":5,"Rushing Yards":11,"Rushing Yards Per Game":1.2,"Longest Rush":9,"Solo Tackles":5,"Combined Tackles":6,"Fumbles Recovered":1,"Punts":14,"Punting Yards":412,"Longest Punt":44}},
      { id:"p9", isActive:true,  name:"Austin Fitzgerald",   position:"WR/FS",  gradYear:2028, stats:{"Games Played":9,"Receptions":14,"Receiving Yards":327,"Receiving Yards Per Game":36.3,"Longest Reception":48,"Receiving TDs":3,"Total TDs":3,"Solo Tackles":15,"Combined Tackles":31,"Tackles For Loss":2.0,"Sacks":0,"Interceptions":2,"Interception Return Yards":43,"Passes Defended":1,"Fumbles Recovered":1}},
      { id:"p10", isActive:true, name:"Jace Navarro",        position:"FB/LB",  gradYear:2028, stats:{"Games Played":9,"Rushing Attempts":1,"Rushing Yards":4,"Longest Rush":4,"Solo Tackles":3,"Combined Tackles":7,"Interceptions":1,"Interception Return Yards":18}},
      { id:"p11", isActive:true, name:"Mason Priebe",        position:"WR/FS",  gradYear:2027, stats:{"Games Played":9,"Receptions":3,"Receiving Yards":36,"Receiving Yards Per Game":4.0,"Longest Reception":19,"Receiving TDs":1,"Total TDs":1,"Solo Tackles":13,"Combined Tackles":25,"Tackles For Loss":3.0,"Sacks":1.5,"Passes Defended":2,"Kick Returns":1,"Kick Return Yards":2,"Longest Kick Return":2}},
      { id:"p12", isActive:true, name:"Tobin Delle Donne",   position:"TE/DE",  gradYear:2028, stats:{"Games Played":9,"Receptions":2,"Receiving Yards":18,"Receiving Yards Per Game":2.0,"Longest Reception":10,"Receiving TDs":1,"Total TDs":1,"Solo Tackles":16,"Combined Tackles":28,"Tackles For Loss":7.5,"Sacks":2.0,"Fumbles Recovered":1}},
      { id:"p13", isActive:true, name:"Vinny DeLeo",         position:"WR/FS",  gradYear:2029, stats:{"Games Played":9}},
      { id:"p14", isActive:true, name:"Brody Wardenburg",    position:"LB/RB",  gradYear:2029, stats:{"Games Played":9,"Solo Tackles":2,"Combined Tackles":3}},
      { id:"p16", isActive:true, name:"Silas Flinn",         position:"WB/CB",  gradYear:2027, stats:{"Games Played":9}},
      { id:"p18", isActive:true, name:"Maura O'Neill",       position:"K",      gradYear:2029, stats:{"Games Played":9,"Extra Points Made":9,"Extra Points Attempted":10}},
      { id:"p19", isActive:true, name:"Ethan Bond",          position:"DE/TE",  gradYear:2029, stats:{"Games Played":9,"Sacks":0}},
      { id:"p20", isActive:true, name:"Daniel Copeland",     position:"RB/DB",  gradYear:2029, stats:{"Games Played":9,"Rushing Attempts":24,"Rushing Yards":266,"Rushing Yards Per Game":29.6,"Longest Rush":63,"Rushing TDs":3,"Receptions":1,"Receiving Yards":0,"Total TDs":4,"Solo Tackles":15,"Combined Tackles":22,"Interceptions":1,"Interception Return Yards":19,"Passes Defended":2,"Fumbles Recovered":1,"Kick Returns":10,"Kick Return Yards":241,"Longest Kick Return":80}},
      { id:"p22", isActive:true, name:"Noah Smith",          position:"WR/DB",  gradYear:2029, stats:{"Games Played":9}},
      { id:"p23", isActive:true, name:"Owen Esmond",         position:"RB/OLB", gradYear:2028, stats:{"Games Played":9,"Rushing Attempts":1,"Rushing Yards":0}},
      { id:"p25", isActive:true, name:"Elijah Moreno",       position:"RB/LB",  gradYear:2027, stats:{"Games Played":9,"Rushing Attempts":1,"Rushing Yards":3,"Longest Rush":3,"Solo Tackles":18,"Combined Tackles":36,"Tackles For Loss":1.0,"Sacks":0,"Passes Defended":1,"Kick Returns":1,"Kick Return Yards":0}},
      { id:"p30", isActive:true, name:"Quinn Barkema",       position:"OLB/RB", gradYear:2027, stats:{"Games Played":9,"Pass Completions":2,"Pass Attempts":2,"Passing Yards":79,"Completion %":100.0,"Longest Pass":41,"Rushing Attempts":117,"Rushing Yards":857,"Rushing Yards Per Game":95.2,"Longest Rush":58,"Rushing TDs":14,"Receptions":9,"Receiving Yards":67,"Receiving Yards Per Game":7.4,"Longest Reception":20,"Receiving TDs":1,"Total TDs":15,"Solo Tackles":42,"Combined Tackles":73,"Tackles For Loss":3.0,"Sacks":0,"Punts":4,"Punting Yards":93,"Longest Punt":60,"Kick Returns":1,"Kick Return Yards":17,"Longest Kick Return":17,"Punt Returns":1,"Punt Return Yards":0}},
      { id:"p32", isActive:true, name:"Judah Ellis",         position:"FB/LB",  gradYear:2028, stats:{"Games Played":9}},
      { id:"p44", isActive:true, name:"Robert Burns",        position:"OLB/RB", gradYear:2026, stats:{"Games Played":9,"Rushing Attempts":13,"Rushing Yards":73,"Rushing Yards Per Game":8.1,"Longest Rush":22,"Rushing TDs":1,"Total TDs":1,"Solo Tackles":14,"Combined Tackles":19,"Kick Returns":1,"Kick Return Yards":-1}},
      { id:"p50", isActive:true, name:"Hunter Sullivan",     position:"FB/DE",  gradYear:2027, stats:{"Games Played":9,"Rushing Attempts":1,"Rushing Yards":3,"Longest Rush":3,"Solo Tackles":6,"Combined Tackles":9,"Tackles For Loss":1.0,"Sacks":1.0}},
      { id:"p51", isActive:true, name:"Dominic Khadiwala",   position:"G/DT",   gradYear:2029, stats:{"Games Played":9,"Solo Tackles":1,"Combined Tackles":1}},
      { id:"p52", isActive:true, name:"Reece Miller",        position:"C/NG",   gradYear:2027, stats:{"Games Played":9,"Solo Tackles":6,"Combined Tackles":14,"Tackles For Loss":1.0,"Sacks":0,"Fumbles Recovered":1}},
      { id:"p53", isActive:true, name:"Kaleb Elmore",        position:"C/DT",   gradYear:2028, stats:{"Games Played":9}},
      { id:"p54", isActive:true, name:"Josiah Schott",       position:"DE/DT",  gradYear:2027, stats:{"Games Played":9,"Solo Tackles":12,"Combined Tackles":30,"Tackles For Loss":4.5,"Sacks":1.5}},
      { id:"p55", isActive:true, name:"Kody Olson",          position:"DE/T",   gradYear:2027, stats:{"Games Played":9,"Solo Tackles":1,"Combined Tackles":2}},
      { id:"p58", isActive:true, name:"Levi Hawes",          position:"C/DT",   gradYear:2029, stats:{"Games Played":9}},
      { id:"p60", isActive:true, name:"George Smith",        position:"G/DT",   gradYear:2026, stats:{"Games Played":9,"Solo Tackles":3,"Combined Tackles":3}},
      { id:"p70", isActive:true, name:"Wallace Sabell",      position:"NG/G",   gradYear:2028, stats:{"Games Played":9,"Solo Tackles":2,"Combined Tackles":2,"Tackles For Loss":1.0,"Sacks":1.0}},
      { id:"p74", isActive:true, name:"Landon Sullivan",     position:"G/DT",   gradYear:2028, stats:{"Games Played":9}},
      { id:"p85", isActive:true, name:"Ryan Krajewski",      position:"TE/FS",  gradYear:2029, stats:{"Games Played":9,"Solo Tackles":1,"Combined Tackles":1}},
      { id:"p88", isActive:true, name:"Max Slaughter",       position:"TE/LB",  gradYear:2029, stats:{"Games Played":9}},
    ],
    records:[
      { id:"r1",  statName:"Combined Tackles",    variant:"Career total",  holderName:"Don Lammers",      holderYear:"1977-1980", value:227, sport:"football" },
      { id:"r2",  statName:"Combined Tackles",    variant:"Single season", holderName:"Tate Kastens",     holderYear:"2012-2013", value:67,  sport:"football" },
      { id:"r3",  statName:"Combined Tackles",    variant:"Single game",   holderName:"Unknown",          holderYear:"",          value:18,  sport:"football" },
      { id:"r4",  statName:"Passing Yards",       variant:"Career total",  holderName:"Tate Kastens",     holderYear:"2011-2014", value:3847,sport:"football" },
      { id:"r5",  statName:"Passing Yards",       variant:"Single season", holderName:"Tate Kastens",     holderYear:"2012-2013", value:1397,sport:"football" },
      { id:"r6",  statName:"Passing Yards",       variant:"Single game",   holderName:"Randy DeBoer",     holderYear:"1970",      value:274, sport:"football" },
      { id:"r7",  statName:"Rushing Yards",       variant:"Career total",  holderName:"Craig Top",        holderYear:"1977-1979", value:1842,sport:"football" },
      { id:"r8",  statName:"Rushing Yards",       variant:"Single game",   holderName:"Craig Top",        holderYear:"1978",      value:262, sport:"football" },
      { id:"r9",  statName:"Rushing Attempts",    variant:"Single game",   holderName:"Ben Buys",         holderYear:"",          value:32,  sport:"football" },
      { id:"r10", statName:"Total TDs",           variant:"Career total",  holderName:"Tate Kastens",     holderYear:"2011-2014", value:42,  sport:"football" },
      { id:"r11", statName:"Interceptions",       variant:"Career total",  holderName:"Greg Ham",         holderYear:"1977-1978", value:9,   sport:"football" },
      { id:"r12", statName:"All-Purpose Yards",   variant:"Career total",  holderName:"Tate Kastens",     holderYear:"2011-2014", value:4101,sport:"football" },
      { id:"r13", statName:"Pass Completions",    variant:"Career total",  holderName:"Guy Boyer",        holderYear:"",          value:168, sport:"football" },
      { id:"r14", statName:"Passing TDs",         variant:"Career total",  holderName:"Guy Boyer",        holderYear:"",          value:30,  sport:"football" },
      { id:"r15", statName:"Receptions",          variant:"Career total",  holderName:"Scott Shannon",    holderYear:"",          value:52,  sport:"football" },
      { id:"r16", statName:"Receptions",          variant:"Single game",   holderName:"Craig Shannon",    holderYear:"1970",      value:12,  sport:"football" },
      { id:"r17", statName:"Receiving Yards",     variant:"Single game",   holderName:"Craig Shannon",    holderYear:"1970",      value:237, sport:"football" },
      { id:"r18", statName:"Punting Yards",       variant:"Career total",  holderName:"Don Van Zytveld",  holderYear:"1977-1980", value:2303,sport:"football" },
      { id:"r19", statName:"Extra Points Made",   variant:"Career total",  holderName:"Dan Anema",        holderYear:"1978-1980", value:20,  sport:"football" },
      { id:"r20", statName:"Coach Wins",           variant:"Career total",  holderName:"Mark Swalley",     holderYear:"1982-2009", value:181, sport:"football" },
    ],
    allTimeRoster: DC_FOOTBALL_ALL_TIME,
    seasons: DC_FOOTBALL_SEASONS,
  },
  {
    id:"s2", name:"Denver Christian", mascot:"Thunder (Girls)", sport:"basketball_girls", primaryColor:"#1a3a6b",
    athletes:[
      { id:"gb1", isActive:true,  name:"Teagan Fuller",    position:"G", gradYear:2026, stats:{"Games Played":90,"Wins":86,"Points":635,"Assists":204,"Total Rebounds":204,"Offensive Rebounds":97,"Defensive Rebounds":107,"Steals":192,"Blocks":15,"Field Goals Made":249,"Field Goals Attempted":645,"Three Pointers Made":36,"Three Pointers Attempted":193,"Free Throws Made":101,"Free Throws Attempted":192}},
      { id:"gb2", isActive:true,  name:"Addison Ruter",    position:"F", gradYear:2026, stats:{"Games Played":78,"Wins":86,"Points":229,"Assists":45,"Total Rebounds":268,"Offensive Rebounds":130,"Defensive Rebounds":138,"Steals":65,"Blocks":16,"Field Goals Made":102,"Field Goals Attempted":246,"Three Pointers Made":2,"Three Pointers Attempted":15,"Free Throws Made":23,"Free Throws Attempted":37}},
      { id:"gb3", isActive:true,  name:"Natalie Bohannon", position:"F", gradYear:2027, stats:{"Games Played":82,"Wins":72,"Points":986,"Assists":118,"Total Rebounds":586,"Offensive Rebounds":278,"Defensive Rebounds":308,"Steals":199,"Blocks":125,"Field Goals Made":388,"Field Goals Attempted":932,"Three Pointers Made":128,"Three Pointers Attempted":423,"Free Throws Made":82,"Free Throws Attempted":124}},
      { id:"gb4", isActive:true,  name:"Riah Moore",       position:"G", gradYear:2028, stats:{"Games Played":47,"Wins":52,"Points":374,"Assists":111,"Total Rebounds":117,"Offensive Rebounds":57,"Defensive Rebounds":60,"Steals":143,"Blocks":4,"Field Goals Made":150,"Field Goals Attempted":359,"Three Pointers Made":36,"Three Pointers Attempted":140,"Free Throws Made":38,"Free Throws Attempted":64}},
      { id:"gb5", isActive:true,  name:"Sloane Huscroft",  position:"F", gradYear:2028, stats:{"Games Played":42,"Wins":72,"Points":110,"Assists":46,"Total Rebounds":91,"Offensive Rebounds":38,"Defensive Rebounds":53,"Steals":49,"Blocks":9,"Field Goals Made":50,"Field Goals Attempted":132,"Three Pointers Made":2,"Three Pointers Attempted":8,"Free Throws Made":8,"Free Throws Attempted":10}},
      { id:"gb6", isActive:true,  name:"Maycee Fowler",    position:"G", gradYear:2028, stats:{"Games Played":27,"Wins":52,"Points":22,"Assists":5,"Total Rebounds":40,"Offensive Rebounds":14,"Defensive Rebounds":26,"Steals":14,"Blocks":1,"Field Goals Made":10,"Field Goals Attempted":37,"Three Pointers Attempted":1,"Free Throws Made":2,"Free Throws Attempted":6}},
      { id:"gb7", isActive:true,  name:"Ellie Nadon",      position:"F", gradYear:2029, stats:{"Games Played":26,"Wins":26,"Points":39,"Assists":9,"Total Rebounds":65,"Offensive Rebounds":34,"Defensive Rebounds":31,"Steals":12,"Blocks":3,"Field Goals Made":19,"Field Goals Attempted":50,"Free Throws Made":1,"Free Throws Attempted":2}},
      { id:"gb8", isActive:true,  name:"Tenley Fuller",    position:"G", gradYear:2029, stats:{"Games Played":27,"Wins":26,"Points":394,"Assists":143,"Total Rebounds":149,"Offensive Rebounds":77,"Defensive Rebounds":72,"Steals":170,"Blocks":6,"Field Goals Made":152,"Field Goals Attempted":364,"Three Pointers Made":17,"Three Pointers Attempted":99,"Free Throws Made":73,"Free Throws Attempted":130}},
      { id:"gb9", isActive:true,  name:"Lexi Ries",        position:"G", gradYear:2029, stats:{"Games Played":18,"Wins":26,"Points":17,"Assists":2,"Total Rebounds":21,"Offensive Rebounds":12,"Defensive Rebounds":9,"Steals":3,"Blocks":1,"Field Goals Made":7,"Field Goals Attempted":22,"Three Pointers Attempted":1,"Free Throws Made":3,"Free Throws Attempted":6}},
      { id:"gb10", isActive:true, name:"Morgan Church",    position:"F", gradYear:2029, stats:{"Games Played":18,"Wins":26,"Points":5,"Assists":4,"Total Rebounds":10,"Offensive Rebounds":5,"Defensive Rebounds":5,"Steals":1,"Blocks":1,"Field Goals Made":2,"Field Goals Attempted":23,"Three Pointers Attempted":3,"Free Throws Made":1,"Free Throws Attempted":2}},
    ],
    records:[
      { id:"gr1",  statName:"Games Played",           variant:"Career total",  holderName:"Anna Everett",       holderYear:"2021-2025", value:96,   sport:"basketball_girls" },
      { id:"gr2",  statName:"Games Played",           variant:"Single season", holderName:"Multiple players",   holderYear:"2025-2026", value:28,   sport:"basketball_girls" },
      { id:"gr3",  statName:"Wins",                   variant:"Career total",  holderName:"Addison Ruter",      holderYear:"2022-2026", value:86,   sport:"basketball_girls" },
      { id:"gr4",  statName:"Wins",                   variant:"Single season", holderName:"Multiple players",   holderYear:"2025-2026", value:26,   sport:"basketball_girls" },
      { id:"gr5",  statName:"Points",                 variant:"Career total",  holderName:"Kamiree Fuller",     holderYear:"2021-2025", value:1332, sport:"basketball_girls" },
      { id:"gr6",  statName:"Points",                 variant:"Single season", holderName:"Natalie Bohannon",   holderYear:"2025-2026", value:429,  sport:"basketball_girls" },
      { id:"gr7",  statName:"Assists",                variant:"Career total",  holderName:"Noelani Book",       holderYear:"2021-2025", value:216,  sport:"basketball_girls" },
      { id:"gr8",  statName:"Assists",                variant:"Single season", holderName:"Missy Van Heukelem", holderYear:"1987-1988", value:162,  sport:"basketball_girls" },
      { id:"gr9",  statName:"Total Rebounds",               variant:"Career total",  holderName:"Jerika Schmitt",     holderYear:"2009-2012", value:646,  sport:"basketball_girls" },
      { id:"gr10", statName:"Total Rebounds",               variant:"Single season", holderName:"Jerika Schmitt",     holderYear:"2011-2012", value:346,  sport:"basketball_girls" },
      { id:"gr11", statName:"Offensive Rebounds",     variant:"Career total",  holderName:"Natalie Bohannon",   holderYear:"2022-2026", value:278,  sport:"basketball_girls" },
      { id:"gr12", statName:"Offensive Rebounds",     variant:"Single season", holderName:"Jerika Schmitt",     holderYear:"2010-2011", value:129,  sport:"basketball_girls" },
      { id:"gr13", statName:"Defensive Rebounds",     variant:"Career total",  holderName:"Jerika Schmitt",     holderYear:"2009-2012", value:396,  sport:"basketball_girls" },
      { id:"gr14", statName:"Defensive Rebounds",     variant:"Single season", holderName:"Jerika Schmitt",     holderYear:"2011-2012", value:237,  sport:"basketball_girls" },
      { id:"gr15", statName:"Steals",                 variant:"Career total",  holderName:"Kara Amidon",        holderYear:"2013-2017", value:389,  sport:"basketball_girls" },
      { id:"gr16", statName:"Steals",                 variant:"Single season", holderName:"Tenley Fuller",      holderYear:"2025-2026", value:170,  sport:"basketball_girls" },
      { id:"gr17", statName:"Blocks",                 variant:"Career total",  holderName:"Patty Buikema",      holderYear:"1978-1982", value:191,  sport:"basketball_girls" },
      { id:"gr18", statName:"Blocks",                 variant:"Single season", holderName:"Jerika Schmitt",     holderYear:"2011-2012", value:69,   sport:"basketball_girls" },
      { id:"gr19", statName:"Field Goals Made",       variant:"Career total",  holderName:"Kamiree Fuller",     holderYear:"2021-2025", value:524,  sport:"basketball_girls" },
      { id:"gr20", statName:"Field Goals Made",       variant:"Single season", holderName:"Natalie Bohannon",   holderYear:"2025-2026", value:163,  sport:"basketball_girls" },
      { id:"gr21", statName:"Field Goals Attempted",  variant:"Career total",  holderName:"Kamiree Fuller",     holderYear:"2021-2025", value:1434, sport:"basketball_girls" },
      { id:"gr22", statName:"Field Goals Attempted",  variant:"Single season", holderName:"Merissa Prentiss",   holderYear:"2012-2013", value:425,  sport:"basketball_girls" },
      { id:"gr23", statName:"Three Pointers Made",    variant:"Career total",  holderName:"Kamiree Fuller",     holderYear:"2021-2025", value:179,  sport:"basketball_girls" },
      { id:"gr24", statName:"Three Pointers Made",    variant:"Single season", holderName:"Natalie Bohannon",   holderYear:"2025-2026", value:63,   sport:"basketball_girls" },
      { id:"gr25", statName:"Three Pointers Attempted",variant:"Career total", holderName:"Kamiree Fuller",     holderYear:"2021-2025", value:669,  sport:"basketball_girls" },
      { id:"gr26", statName:"Three Pointers Attempted",variant:"Single season",holderName:"Kamiree Fuller",     holderYear:"2023-2024", value:223,  sport:"basketball_girls" },
      { id:"gr27", statName:"Free Throws Made",       variant:"Career total",  holderName:"Kara Amidon",        holderYear:"2013-2017", value:189,  sport:"basketball_girls" },
      { id:"gr28", statName:"Free Throws Made",       variant:"Single season", holderName:"Melonie Van Beek",   holderYear:"1981-1982", value:82,   sport:"basketball_girls" },
      { id:"gr29", statName:"Free Throws Attempted",  variant:"Career total",  holderName:"Kara Amidon",        holderYear:"2013-2017", value:382,  sport:"basketball_girls" },
      { id:"gr30", statName:"Free Throws Attempted",  variant:"Single season", holderName:"Melonie Van Beek",   holderYear:"1981-1982", value:152,  sport:"basketball_girls" },
      { id:"gr31", statName:"Coach Wins",             variant:"Career total",  holderName:"Duane Buys",         holderYear:"1980-2001", value:326,  sport:"basketball_girls" },
      { id:"gr32", statName:"Coach Wins",             variant:"Single season", holderName:"Duane Buys",         holderYear:"2000-2001", value:30,   sport:"basketball_girls" },
    ],
    allTimeRoster: DC_GIRLS_ALL_TIME,
    seasons: DC_GIRLS_SEASONS,
    milestones:[
      { id:"gm1",  statName:"Games Played",               values:[25,50,75,100],              alertPct:90 },
      { id:"gm2",  statName:"Wins",                        values:[25,50,75,100],              alertPct:90 },
      { id:"gm3",  statName:"Points",                      values:[100,250,500,750,1000],      alertPct:90 },
      { id:"gm4",  statName:"Assists",                     values:[50,100,150,200],            alertPct:90 },
      { id:"gm5",  statName:"Total Rebounds",              values:[100,250,500],               alertPct:90 },
      { id:"gm6",  statName:"Offensive Rebounds",          values:[50,100,150,200],            alertPct:90 },
      { id:"gm7",  statName:"Defensive Rebounds",          values:[50,100,200,300],            alertPct:90 },
      { id:"gm8",  statName:"Steals",                      values:[50,100,200,300],            alertPct:90 },
      { id:"gm9",  statName:"Blocks",                      values:[25,50,100],                 alertPct:90 },
      { id:"gm10", statName:"Field Goals Made",            values:[100,250,500],               alertPct:90 },
      { id:"gm11", statName:"Field Goals Attempted",       values:[200,500,1000],              alertPct:90 },
      { id:"gm12", statName:"Three Pointers Made",         values:[25,50,100,150],             alertPct:90 },
      { id:"gm13", statName:"Three Pointers Attempted",    values:[100,250,500],               alertPct:90 },
      { id:"gm14", statName:"Free Throws Made",            values:[50,100,150],                alertPct:90 },
      { id:"gm15", statName:"Free Throws Attempted",       values:[50,100,200,300],            alertPct:90 },
    ]
  },
  {
    id:"s4", name:"Denver Christian", mascot:"Thunder (Boys)", sport:"basketball_boys", primaryColor:"#1a3a6b", incomingCoach:"Steve Schimpeler",
    athletes: [
      { id:"s4p00", isActive:true, name:"Micah Warren", position:"G", gradYear:2028, jersey:0, stats:{"Games Played":17,"Wins":13,"Points":22,"Assists":2,"Total Rebounds":14,"Offensive Rebounds":4,"Defensive Rebounds":10,"Steals":5,"Field Goals Made":8,"Field Goals Attempted":26,"Three Pointers Made":5,"Three Pointers Attempted":17,"Free Throws Made":1,"Free Throws Attempted":2} },
      { id:"s4p01", isActive:true, name:"Bryce Peters", position:"G", gradYear:2028, jersey:1, stats:{"Games Played":24,"Wins":13,"Points":83,"Assists":16,"Total Rebounds":52,"Offensive Rebounds":19,"Defensive Rebounds":33,"Steals":23,"Blocks":2,"Field Goals Made":30,"Field Goals Attempted":81,"Three Pointers Made":11,"Three Pointers Attempted":39,"Free Throws Made":12,"Free Throws Attempted":22} },
      { id:"s4p02", isActive:true, name:"Cole McCabe", position:"G", gradYear:2028, jersey:2, stats:{"Games Played":12,"Wins":13,"Points":5,"Assists":1,"Total Rebounds":4,"Offensive Rebounds":1,"Defensive Rebounds":3,"Steals":4,"Field Goals Made":1,"Field Goals Attempted":4,"Three Pointers Attempted":1,"Free Throws Made":3,"Free Throws Attempted":6} },
      { id:"s4p04", isActive:true, name:"Luke DeBoer", position:"G", gradYear:2027, jersey:4, stats:{"Games Played":25,"Wins":13,"Points":187,"Assists":71,"Total Rebounds":118,"Offensive Rebounds":29,"Defensive Rebounds":89,"Steals":32,"Blocks":7,"Field Goals Made":65,"Field Goals Attempted":163,"Three Pointers Made":28,"Three Pointers Attempted":89,"Free Throws Made":29,"Free Throws Attempted":45} },
      { id:"s4p05", isActive:true, name:"Zeke Swartwood", position:"G", gradYear:2027, jersey:5, stats:{"Games Played":24,"Wins":13,"Points":203,"Assists":46,"Total Rebounds":40,"Offensive Rebounds":5,"Defensive Rebounds":35,"Steals":35,"Blocks":5,"Field Goals Made":72,"Field Goals Attempted":190,"Three Pointers Made":34,"Three Pointers Attempted":95,"Free Throws Made":25,"Free Throws Attempted":39} },
      { id:"s4p10", isActive:true, name:"Rhodes Nwankwo", position:"G", gradYear:2027, jersey:10, stats:{"Games Played":23,"Wins":13,"Points":125,"Assists":22,"Total Rebounds":53,"Offensive Rebounds":18,"Defensive Rebounds":35,"Steals":13,"Blocks":5,"Field Goals Made":52,"Field Goals Attempted":100,"Three Pointers Made":11,"Three Pointers Attempted":27,"Free Throws Made":10,"Free Throws Attempted":17} },
      { id:"s4p12", isActive:true, name:"Jayden Cain", position:"G", gradYear:2026, jersey:12, stats:{"Games Played":25,"Wins":13,"Points":370,"Assists":50,"Total Rebounds":148,"Offensive Rebounds":33,"Defensive Rebounds":115,"Steals":41,"Blocks":34,"Field Goals Made":129,"Field Goals Attempted":353,"Three Pointers Made":34,"Three Pointers Attempted":125,"Free Throws Made":78,"Free Throws Attempted":113} },
      { id:"s4p20", isActive:true, name:"Matthijs Vande Griend", position:"G", gradYear:2028, jersey:20, stats:{"Games Played":8,"Wins":13,"Points":2,"Total Rebounds":1,"Defensive Rebounds":1,"Field Goals Attempted":4,"Free Throws Made":2,"Free Throws Attempted":2} },
      { id:"s4p22", isActive:true, name:"Luke Gonzales", position:"G", gradYear:2027, jersey:22, stats:{"Games Played":9,"Wins":13,"Points":9,"Assists":3,"Total Rebounds":8,"Offensive Rebounds":4,"Defensive Rebounds":4,"Steals":3,"Field Goals Made":3,"Field Goals Attempted":4,"Three Pointers Attempted":1,"Free Throws Made":3,"Free Throws Attempted":4} },
      { id:"s4p23", isActive:true, name:"Walker Politte", position:"F", gradYear:2026, jersey:23, stats:{"Games Played":20,"Wins":13,"Points":241,"Assists":55,"Total Rebounds":90,"Offensive Rebounds":15,"Defensive Rebounds":75,"Steals":59,"Blocks":21,"Field Goals Made":75,"Field Goals Attempted":163,"Three Pointers Made":36,"Three Pointers Attempted":93,"Free Throws Made":55,"Free Throws Attempted":81} },
      { id:"s4p24", isActive:true, name:"Graham Wolgemuth", position:"F", gradYear:2028, jersey:24, stats:{"Games Played":24,"Wins":13,"Points":46,"Assists":9,"Total Rebounds":69,"Offensive Rebounds":21,"Defensive Rebounds":48,"Steals":9,"Blocks":9,"Field Goals Made":18,"Field Goals Attempted":46,"Three Pointers Made":1,"Three Pointers Attempted":7,"Free Throws Made":9,"Free Throws Attempted":9} },
      { id:"s4p25", isActive:true, name:"Dylan Laverty", position:"F", gradYear:2027, jersey:25, stats:{"Games Played":13,"Wins":13,"Points":12,"Assists":3,"Total Rebounds":3,"Offensive Rebounds":1,"Defensive Rebounds":2,"Steals":1,"Field Goals Made":4,"Field Goals Attempted":11,"Three Pointers Made":4,"Three Pointers Attempted":10} },
      { id:"s4p33", isActive:true, name:"Tobin Delle Donne", position:"F", gradYear:2028, jersey:33, stats:{"Games Played":4,"Wins":13,"Total Rebounds":3,"Defensive Rebounds":3} },
      { id:"s4p50", isActive:true, name:"Austin Fitzgerald", position:"F", gradYear:2028, jersey:50, stats:{"Games Played":25,"Wins":13,"Points":64,"Assists":50,"Total Rebounds":97,"Offensive Rebounds":30,"Defensive Rebounds":67,"Steals":22,"Blocks":24,"Field Goals Made":21,"Field Goals Attempted":68,"Three Pointers Made":6,"Three Pointers Attempted":25,"Free Throws Made":16,"Free Throws Attempted":23} },
    ],
    records: [
      { id:"br1",  statName:"Games Played",              variant:"Career total",  holderName:"Alex Terpstra",    value:99,   season:"2009-2013" },
      { id:"br2",  statName:"Games Played",              variant:"Single season", holderName:"Rafael Luna",      value:27,   season:"2012-2013" },
      { id:"br3",  statName:"Wins",                      variant:"Career total",  holderName:"Alex Terpstra",    value:62,   season:"2009-2013" },
      { id:"br4",  statName:"Wins",                      variant:"Single season", holderName:"Alex Terpstra",    value:26,   season:"2011-2012" },
      { id:"br5",  statName:"Points",                    variant:"Career total",  holderName:"Craig Matthies",   value:1889, season:"1977-1979" },
      { id:"br6",  statName:"Points",                    variant:"Single season", holderName:"Craig Matthies",   value:599,  season:"1978-1979" },
      { id:"br7",  statName:"Assists",                   variant:"Career total",  holderName:"Ethan Liebert",    value:219,  season:"2019-2022" },
      { id:"br8",  statName:"Assists",                   variant:"Single season", holderName:"Josh Vriesman",    value:166,  season:"2000-2001" },
      { id:"br9",  statName:"Total Rebounds",            variant:"Career total",  holderName:"Tom Dykstra",      value:385,  season:"1972-1973" },
      { id:"br10", statName:"Total Rebounds",            variant:"Single season", holderName:"Tom Dykstra",      value:385,  season:"1972-1973" },
      { id:"br11", statName:"Steals",                    variant:"Career total",  holderName:"Ben Buhler",       value:141,  season:"2019-2022" },
      { id:"br12", statName:"Steals",                    variant:"Single season", holderName:"Ben Buhler",       value:61,   season:"2021-2022" },
      { id:"br13", statName:"Blocks",                    variant:"Career total",  holderName:"Austin LeFebre",   value:99,   season:"2009-2012" },
      { id:"br14", statName:"Blocks",                    variant:"Single season", holderName:"Austin LeFebre",   value:99,   season:"2010-2011" },
      { id:"br15", statName:"Field Goals Made",          variant:"Career total",  holderName:"Alex Terpstra",    value:524,  season:"2009-2013" },
      { id:"br16", statName:"Field Goals Made",          variant:"Single season", holderName:"Craig Kispert",    value:251,  season:"1982-1983" },
      { id:"br17", statName:"Field Goals Attempted",     variant:"Career total",  holderName:"Alex Terpstra",    value:1154, season:"2009-2013" },
      { id:"br18", statName:"Field Goals Attempted",     variant:"Single season", holderName:"Austin LeFebre",   value:350,  season:"2011-2012" },
      { id:"br19", statName:"Three Pointers Made",       variant:"Career total",  holderName:"Alex Terpstra",    value:207,  season:"2009-2013" },
      { id:"br20", statName:"Three Pointers Made",       variant:"Single season", holderName:"Tristan Matthies", value:89,   season:"2005-2006" },
      { id:"br21", statName:"Three Pointers Attempted",  variant:"Career total",  holderName:"Alex Terpstra",    value:529,  season:"2009-2013" },
      { id:"br22", statName:"Three Pointers Attempted",  variant:"Single season", holderName:"Alex Terpstra",    value:150,  season:"2011-2012" },
      { id:"br23", statName:"Free Throws Made",          variant:"Career total",  holderName:"Alex Terpstra",    value:317,  season:"2009-2013" },
      { id:"br24", statName:"Free Throws Made",          variant:"Single season", holderName:"Craig Matthies",   value:125,  season:"1978-1979" },
      { id:"br25", statName:"Free Throws Attempted",     variant:"Career total",  holderName:"Alex Terpstra",    value:366,  season:"2009-2013" },
      { id:"br26", statName:"Free Throws Attempted",     variant:"Single season", holderName:"Austin LeFebre",   value:145,  season:"2011-2012" },
      { id:"br27", statName:"Coach Wins",                variant:"Career total",  holderName:"Dick Katte",       value:876,  season:"1964-2013" },
      { id:"br28", statName:"Coach Wins",                variant:"Single season", holderName:"Dick Katte",       value:27,   season:"2005-2006" },
    ],
    milestones:[
      { id:"bm1",  statName:"Games Played",               values:[25,50,75,100],              alertPct:90 },
      { id:"bm2",  statName:"Wins",                        values:[25,50,75,100],              alertPct:90 },
      { id:"bm3",  statName:"Points",                      values:[100,250,500,750,1000],      alertPct:90 },
      { id:"bm4",  statName:"Assists",                     values:[50,100,150,200],            alertPct:90 },
      { id:"bm5",  statName:"Total Rebounds",              values:[100,250,500],               alertPct:90 },
      { id:"bm6",  statName:"Offensive Rebounds",          values:[50,100,150,200],            alertPct:90 },
      { id:"bm7",  statName:"Defensive Rebounds",          values:[50,100,200,300],            alertPct:90 },
      { id:"bm8",  statName:"Steals",                      values:[50,100,200,300],            alertPct:90 },
      { id:"bm9",  statName:"Blocks",                      values:[25,50,100],                 alertPct:90 },
      { id:"bm10", statName:"Field Goals Made",            values:[100,250,500],               alertPct:90 },
      { id:"bm11", statName:"Field Goals Attempted",       values:[200,500,1000],              alertPct:90 },
      { id:"bm12", statName:"Three Pointers Made",         values:[25,50,100,150],             alertPct:90 },
      { id:"bm13", statName:"Three Pointers Attempted",    values:[100,250,500],               alertPct:90 },
      { id:"bm14", statName:"Free Throws Made",            values:[50,100,150],                alertPct:90 },
      { id:"bm15", statName:"Free Throws Attempted",       values:[50,100,200,300],            alertPct:90 },
    ],
    seasons: [
      { season:"2025-2026", wins:13, losses:12, leagueWins:3,  leagueLosses:6,    coach:"Dennis Burrage", notes:"Sweet 16" },
      { season:"2024-2025", wins:10, losses:14, leagueWins:2,  leagueLosses:7,    coach:"Dennis Burrage" },
      { season:"2023-2024", wins:18, losses:7,  leagueWins:8,  leagueLosses:3,    coach:"Wesley Burke", notes:"Elite Eight" },
      { season:"2022-2023", wins:14, losses:10, leagueWins:10, leagueLosses:2,    coach:"Wesley Burke", notes:"League Champions/Sweet 16" },
      { season:"2021-2022", wins:21, losses:4,  leagueWins:11, leagueLosses:1,    coach:"Kevin Boley", notes:"League Champions/Final Four" },
      { season:"2020-2021", wins:13, losses:3,  leagueWins:9,  leagueLosses:1,    coach:"Billy Berglund" },
      { season:"2019-2020", wins:18, losses:6,  leagueWins:10, leagueLosses:2,    coach:"Billy Berglund" },
      { season:"2018-2019", wins:17, losses:8,  leagueWins:10, leagueLosses:2,    coach:"Ben Dirksen" },
      { season:"2017-2018", wins:10, losses:13, leagueWins:6,  leagueLosses:6,    coach:"Ben Dirksen" },
      { season:"2016-2017", wins:11, losses:11, leagueWins:8,  leagueLosses:4,    coach:"Ben Dirksen" },
      { season:"2015-2016", wins:4,  losses:15, leagueWins:1,  leagueLosses:8,    coach:"Ben Dirksen" },
      { season:"2014-2015", wins:12, losses:11, leagueWins:7,  leagueLosses:4,    coach:"Ben Dirksen" },
      { season:"2013-2014", wins:15, losses:8,  leagueWins:9,  leagueLosses:1,    coach:"Ray Van Heukelem" },
      { season:"2012-2013", wins:21, losses:6,  leagueWins:9,  leagueLosses:1,    coach:"Ray Van Heukelem", notes:"League Champions/State Champions" },
      { season:"2011-2012", wins:26, losses:0,  leagueWins:9,  leagueLosses:0,    coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"2010-2011", wins:22, losses:4,  leagueWins:12, leagueLosses:1,    coach:"Dick Katte", notes:"League Champions" },
      { season:"2009-2010", wins:14, losses:10, leagueWins:5,  leagueLosses:7,    coach:"Dick Katte" },
      { season:"2008-2009", wins:9,  losses:12, leagueWins:6,  leagueLosses:6,    coach:"Dick Katte" },
      { season:"2007-2008", wins:16, losses:8,  leagueWins:8,  leagueLosses:1,    coach:"Dick Katte" },
      { season:"2006-2007", wins:12, losses:12, leagueWins:7,  leagueLosses:3,    coach:"Dick Katte" },
      { season:"2005-2006", wins:27, losses:1,  leagueWins:12, leagueLosses:1,    coach:"Dick Katte", notes:"State Champions" },
      { season:"2004-2005", wins:24, losses:4,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"State Champions" },
      { season:"2003-2004", wins:16, losses:9,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"2002-2003", wins:16, losses:8,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"2001-2002", wins:25, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"2000-2001", wins:21, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1999-2000", wins:12, losses:7,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1998-1999", wins:20, losses:4,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1997-1998", wins:22, losses:3,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1996-1997", wins:17, losses:6,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1995-1996", wins:14, losses:7,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1994-1995", wins:17, losses:6,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1993-1994", wins:20, losses:4,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1992-1993", wins:19, losses:3,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1991-1992", wins:22, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1990-1991", wins:20, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1989-1990", wins:18, losses:4,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1988-1989", wins:14, losses:6,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1987-1988", wins:21, losses:3,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1986-1987", wins:18, losses:6,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1985-1986", wins:13, losses:7,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1984-1985", wins:6,  losses:14, leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1983-1984", wins:20, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1982-1983", wins:23, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"1981-1982", wins:19, losses:6,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"1980-1981", wins:17, losses:4,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1979-1980", wins:24, losses:1,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"1978-1979", wins:23, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1977-1978", wins:25, losses:0,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"1976-1977", wins:19, losses:3,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1975-1976", wins:25, losses:1,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1974-1975", wins:14, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1973-1974", wins:10, losses:9,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1972-1973", wins:20, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1971-1972", wins:19, losses:3,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions" },
      { season:"1970-1971", wins:13, losses:9,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1969-1970", wins:20, losses:1,  leagueWins:null, leagueLosses:null, coach:"Dick Katte", notes:"League Champions/State Champions" },
      { season:"1968-1969", wins:18, losses:2,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1967-1968", wins:16, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1966-1967", wins:20, losses:1,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1965-1966", wins:16, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
      { season:"1964-1965", wins:14, losses:5,  leagueWins:null, leagueLosses:null, coach:"Dick Katte" },
    ],
    allTimeRoster: [
      { id:"bb001", isActive:false, name:"Aden Cariveau",        firstYear:"2019-2020", lastYear:"2021-2022", stats:{"Games Played":66,"Wins":52,"Points":322,"Assists":78,"Total Rebounds":115,"Steals":74,"Blocks":5,"Field Goals Made":101,"Field Goals Attempted":316,"Three Pointers Made":47,"Three Pointers Attempted":176,"Free Throws Made":63,"Free Throws Attempted":100} },
      { id:"bb002", isActive:false, name:"Alex Terpstra",        firstYear:"2009-2010", lastYear:"2012-2013", stats:{"Games Played":99,"Wins":62,"Points":1543,"Field Goals Made":524,"Field Goals Attempted":1154,"Three Pointers Made":207,"Three Pointers Attempted":529,"Free Throws Made":317,"Free Throws Attempted":366} },
      { id:"bb003", isActive:false, name:"Andrejs Tobiss",       firstYear:"1985-1986", lastYear:"1986-1987", stats:{"Games Played":24,"Points":132,"Total Rebounds":84,"Field Goals Made":55,"Field Goals Attempted":105,"Free Throws Made":17,"Free Throws Attempted":44} },
      { id:"bb004", isActive:false, name:"Andrew Schneider",     firstYear:"2021-2022", lastYear:"2021-2022", stats:{"Games Played":26,"Wins":21,"Points":167,"Assists":14,"Total Rebounds":40,"Steals":21,"Field Goals Made":57,"Field Goals Attempted":125,"Three Pointers Made":18,"Three Pointers Attempted":48,"Free Throws Made":21,"Free Throws Attempted":21} },
      { id:"bb005", isActive:false, name:"Andy Bosman",          firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":21,"Points":68,"Total Rebounds":32,"Field Goals Made":15,"Field Goals Attempted":58,"Free Throws Made":38,"Free Throws Attempted":58} },
      { id:"bb006", isActive:false, name:"Austin Hart",          firstYear:"2009-2010", lastYear:"2011-2012", stats:{"Games Played":58,"Wins":62,"Points":125,"Field Goals Made":50,"Field Goals Attempted":149,"Three Pointers Made":8,"Three Pointers Attempted":37,"Free Throws Made":17,"Free Throws Attempted":41} },
      { id:"bb007", isActive:false, name:"Austin LeFebre",       firstYear:"2009-2010", lastYear:"2011-2012", stats:{"Games Played":76,"Wins":36,"Points":991,"Blocks":99,"Field Goals Made":415,"Field Goals Attempted":740,"Three Pointers Made":3,"Free Throws Made":161,"Free Throws Attempted":259} },
      { id:"bb008", isActive:false, name:"Beau Baker",           firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":22,"Wins":16,"Points":278,"Assists":35,"Total Rebounds":107,"Steals":14,"Blocks":36,"Field Goals Made":123,"Field Goals Attempted":205,"Free Throws Made":32,"Free Throws Attempted":42} },
      { id:"bb009", isActive:false, name:"Ben Borger",           firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":22,"Wins":16,"Points":91,"Assists":54,"Total Rebounds":42,"Three Pointers Made":1} },
      { id:"bb010", isActive:false, name:"Ben Buhler",           firstYear:"2019-2020", lastYear:"2021-2022", stats:{"Games Played":66,"Wins":52,"Points":1090,"Assists":100,"Total Rebounds":194,"Steals":141,"Blocks":33,"Field Goals Made":416,"Field Goals Attempted":927,"Three Pointers Made":94,"Three Pointers Attempted":296,"Free Throws Made":138,"Free Throws Attempted":218} },
      { id:"bb011", isActive:false, name:"Ben Mayberry",         firstYear:"2020-2021", lastYear:"2020-2021", stats:{"Games Played":14,"Wins":13,"Points":32,"Assists":8,"Total Rebounds":8,"Steals":8,"Field Goals Made":12,"Field Goals Attempted":30,"Three Pointers Made":5,"Three Pointers Attempted":12,"Free Throws Made":3,"Free Throws Attempted":3} },
      { id:"bb012", isActive:false, name:"Brayden Epperhart",    firstYear:"2022-2023", lastYear:"2023-2024", stats:{"Games Played":9,"Wins":14,"Points":56,"Assists":5,"Total Rebounds":9,"Steals":2,"Field Goals Made":7,"Field Goals Attempted":13,"Three Pointers Made":2,"Three Pointers Attempted":6,"Free Throws Made":7,"Free Throws Attempted":15} },
      { id:"bb013", isActive:false, name:"Bret Dorhout",         firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":24,"Wins":18,"Points":279,"Total Rebounds":45,"Field Goals Made":108,"Field Goals Attempted":80,"Free Throws Made":63,"Free Throws Attempted":80} },
      { id:"bb014", isActive:false, name:"Brian Albright",       firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":203,"Total Rebounds":94,"Field Goals Made":79,"Field Goals Attempted":149,"Free Throws Made":80} },
      { id:"bb015", isActive:false, name:"Carsyn Romero",        firstYear:"2023-2024", lastYear:"2023-2024", stats:{"Points":19} },
      { id:"bb016", isActive:false, name:"Charlie Bull",         firstYear:"2022-2023", lastYear:"2023-2024", stats:{"Games Played":9,"Wins":14,"Points":8,"Assists":5,"Total Rebounds":4,"Steals":2,"Blocks":1,"Field Goals Made":1,"Field Goals Attempted":5,"Three Pointers Made":6,"Free Throws Made":1,"Free Throws Attempted":3} },
      { id:"bb017", isActive:false, name:"Chase Viss",           firstYear:"2009-2010", lastYear:"2010-2011", stats:{"Games Played":49,"Wins":36,"Points":397,"Field Goals Made":161,"Field Goals Attempted":271,"Three Pointers Made":1,"Three Pointers Attempted":3,"Free Throws Made":74,"Free Throws Attempted":97} },
      { id:"bb018", isActive:false, name:"Chris Pranger",        firstYear:"2010-2011", lastYear:"2011-2012", stats:{"Games Played":52,"Wins":48,"Points":179,"Field Goals Made":76,"Field Goals Attempted":191,"Three Pointers Made":10,"Three Pointers Attempted":58,"Free Throws Made":17,"Free Throws Attempted":34} },
      { id:"bb019", isActive:false, name:"Chris Taylor",         firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":13,"Wins":16,"Points":26,"Assists":14,"Total Rebounds":20,"Blocks":4,"Field Goals Made":10,"Field Goals Attempted":41,"Free Throws Made":5,"Free Throws Attempted":8} },
      { id:"bb020", isActive:false, name:"Cj Caro",              firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":21,"Wins":9,"Points":13,"Field Goals Made":5,"Field Goals Attempted":15,"Three Pointers Made":1,"Free Throws Made":3,"Free Throws Attempted":5} },
      { id:"bb021", isActive:false, name:"Clint Randolph",       firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":17,"Points":23,"Total Rebounds":12,"Field Goals Made":9,"Field Goals Attempted":10,"Free Throws Made":5,"Free Throws Attempted":10} },
      { id:"bb022", isActive:false, name:"Colin Lanser",         firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":18,"Wins":25,"Points":22,"Assists":4,"Total Rebounds":20,"Steals":2,"Field Goals Made":10,"Field Goals Attempted":26,"Free Throws Made":2,"Free Throws Attempted":5} },
      { id:"bb023", isActive:false, name:"Collin Barr",          firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":20,"Wins":25,"Points":65,"Assists":3,"Total Rebounds":38,"Steals":1,"Blocks":3,"Field Goals Made":27,"Free Throws Made":11} },
      { id:"bb024", isActive:false, name:"Connor Kroshus",       firstYear:"2009-2010", lastYear:"2011-2012", stats:{"Games Played":48,"Wins":26,"Points":274,"Assists":50,"Total Rebounds":54,"Steals":35,"Blocks":3,"Field Goals Made":164,"Field Goals Attempted":100,"Three Pointers Made":60,"Three Pointers Attempted":195,"Free Throws Made":59,"Free Throws Attempted":43} },
      { id:"bb025", isActive:false, name:"Craig Kispert",        firstYear:"1982-1983", lastYear:"1982-1983", stats:{"Field Goals Made":251} },
      { id:"bb026", isActive:false, name:"Craig Matthies",       firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":1889,"Assists":28,"Total Rebounds":183,"Steals":12,"Blocks":13,"Field Goals Made":204,"Free Throws Made":118} },
      { id:"bb027", isActive:false, name:"Dale Sanderson",       firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":35,"Total Rebounds":17,"Field Goals Made":12,"Field Goals Attempted":26,"Free Throws Made":18} },
      { id:"bb028", isActive:false, name:"Dave Van Zytveld",     firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":41,"Total Rebounds":33,"Field Goals Made":15,"Field Goals Attempted":35,"Free Throws Made":22} },
      { id:"bb029", isActive:false, name:"Derrin Quinn",         firstYear:"2020-2021", lastYear:"2022-2023", stats:{"Games Played":58,"Wins":48,"Points":394,"Assists":162,"Total Rebounds":113,"Steals":65,"Blocks":1,"Field Goals Made":68,"Field Goals Attempted":160,"Three Pointers Made":34,"Three Pointers Attempted":108,"Free Throws Made":73,"Free Throws Attempted":108} },
      { id:"bb030", isActive:false, name:"Devon Van Andel",      firstYear:"2020-2021", lastYear:"2022-2023", stats:{"Games Played":42,"Wins":48,"Points":134,"Assists":28,"Total Rebounds":66,"Steals":28,"Blocks":1,"Field Goals Made":11,"Field Goals Attempted":41,"Three Pointers Made":17,"Three Pointers Attempted":71,"Free Throws Made":21,"Free Throws Attempted":44} },
      { id:"bb031", isActive:false, name:"Doug Baltzer",         firstYear:"1985-1986", lastYear:"1986-1987", stats:{"Games Played":24,"Wins":18,"Points":190,"Total Rebounds":41,"Field Goals Made":82,"Field Goals Attempted":67,"Free Throws Made":23,"Free Throws Attempted":53} },
      { id:"bb032", isActive:false, name:"Drew Kastens",         firstYear:"2009-2010", lastYear:"2010-2011", stats:{"Games Played":34,"Wins":36,"Points":78,"Field Goals Made":33,"Field Goals Attempted":70,"Free Throws Made":12,"Free Throws Attempted":25} },
      { id:"bb033", isActive:false, name:"Ed Buteyn",            firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":20,"Wins":25,"Points":31,"Assists":7,"Total Rebounds":25,"Blocks":2,"Field Goals Made":9,"Free Throws Made":13} },
      { id:"bb034", isActive:false, name:"Elias Romero",         firstYear:"2022-2023", lastYear:"2023-2024", stats:{"Games Played":13,"Wins":14,"Points":100,"Assists":9,"Total Rebounds":5,"Steals":2,"Field Goals Made":17,"Field Goals Attempted":45,"Three Pointers Made":18,"Three Pointers Attempted":56} },
      { id:"bb035", isActive:false, name:"Engelsman",            firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":13,"Wins":25,"Points":36,"Assists":6,"Total Rebounds":42,"Steals":1,"Blocks":12,"Field Goals Made":17,"Free Throws Made":2} },
      { id:"bb036", isActive:false, name:"Eric Forseth",         firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":456,"Assists":57,"Total Rebounds":355,"Steals":21,"Blocks":38,"Field Goals Made":195,"Free Throws Made":66} },
      { id:"bb037", isActive:false, name:"Erik Terpstra",        firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":22,"Wins":16,"Points":330,"Assists":52,"Total Rebounds":170,"Steals":18,"Blocks":4,"Field Goals Made":126,"Field Goals Attempted":321,"Free Throws Made":33,"Free Throws Attempted":51} },
      { id:"bb038", isActive:false, name:"Ethan Liebert",        firstYear:"2019-2020", lastYear:"2020-2021", stats:{"Games Played":40,"Wins":31,"Points":338,"Assists":219,"Total Rebounds":72,"Steals":59,"Blocks":5,"Field Goals Made":116,"Field Goals Attempted":299,"Three Pointers Made":50,"Three Pointers Attempted":146,"Free Throws Made":56,"Free Throws Attempted":75} },
      { id:"bb039", isActive:false, name:"Evan Rice",            firstYear:"2020-2021", lastYear:"2021-2022", stats:{"Games Played":16,"Wins":34,"Points":25,"Assists":1,"Total Rebounds":4,"Steals":3,"Blocks":1,"Field Goals Made":11,"Field Goals Attempted":17,"Three Pointers Made":2,"Three Pointers Attempted":4,"Free Throws Made":1,"Free Throws Attempted":1} },
      { id:"bb040", isActive:false, name:"Forrest Sanderson",    firstYear:"2011-2012", lastYear:"2011-2012", stats:{"Wins":26} },
      { id:"bb041", isActive:false, name:"Garrett Mudd",         firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":24,"Points":81,"Total Rebounds":10,"Field Goals Made":34,"Field Goals Attempted":19,"Free Throws Made":13,"Free Throws Attempted":19} },
      { id:"bb042", isActive:false, name:"Greg Ham",             firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":165,"Assists":66,"Total Rebounds":23,"Steals":16,"Field Goals Made":61,"Free Throws Made":45} },
      { id:"bb043", isActive:false, name:"Greg Lucht",           firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":115,"Assists":8,"Total Rebounds":99,"Steals":3,"Blocks":10,"Field Goals Made":50,"Free Throws Made":15} },
      { id:"bb044", isActive:false, name:"Greg Nyhoff",          firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":190,"Assists":61,"Total Rebounds":162,"Steals":16,"Blocks":41,"Field Goals Made":81,"Free Throws Made":28} },
      { id:"bb045", isActive:false, name:"Henry Vandeberg",      firstYear:"2020-2021", lastYear:"2020-2021", stats:{"Total Rebounds":81,"Blocks":6} },
      { id:"bb046", isActive:false, name:"Henry Vandenberg",     firstYear:"2020-2021", lastYear:"2020-2021", stats:{"Games Played":15,"Wins":31,"Points":244,"Assists":40,"Total Rebounds":37,"Steals":29,"Field Goals Made":104,"Field Goals Attempted":172,"Three Pointers Made":35,"Free Throws Made":20,"Free Throws Attempted":28} },
      { id:"bb047", isActive:false, name:"Jackson Schroder",     firstYear:"2021-2022", lastYear:"2023-2024", stats:{"Games Played":38,"Wins":35,"Points":191,"Assists":62,"Total Rebounds":55,"Steals":21,"Field Goals Made":60,"Field Goals Attempted":183,"Three Pointers Made":39,"Three Pointers Attempted":123,"Free Throws Made":6,"Free Throws Attempted":25} },
      { id:"bb048", isActive:false, name:"Jacob Percell",        firstYear:"2009-2010", lastYear:"2009-2010", stats:{"Games Played":24,"Wins":14,"Points":243,"Field Goals Made":89,"Field Goals Attempted":209,"Three Pointers Made":20,"Three Pointers Attempted":65,"Free Throws Made":47,"Free Throws Attempted":82} },
      { id:"bb049", isActive:false, name:"Jake Heffron",         firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Wins":16} },
      { id:"bb050", isActive:false, name:"Jake Morris",          firstYear:"2023-2024", lastYear:"2023-2024", stats:{"Points":18,"Three Pointers Made":5,"Three Pointers Attempted":8} },
      { id:"bb051", isActive:false, name:"Jared Van Dyke",       firstYear:"2011-2012", lastYear:"2012-2013", stats:{"Games Played":42,"Wins":26,"Points":171,"Assists":25,"Total Rebounds":120,"Steals":11,"Blocks":64,"Field Goals Made":76,"Field Goals Attempted":139,"Free Throws Made":19,"Free Throws Attempted":28} },
      { id:"bb052", isActive:false, name:"Jeff Lenderink",       firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":296,"Total Rebounds":24,"Field Goals Made":122,"Field Goals Attempted":278,"Free Throws Made":79} },
      { id:"bb053", isActive:false, name:"Jim Dumler",           firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":19,"Wins":25,"Points":59,"Assists":12,"Total Rebounds":33,"Steals":4,"Blocks":5,"Field Goals Made":28,"Free Throws Made":3} },
      { id:"bb054", isActive:false, name:"Joe Wong",             firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":141,"Total Rebounds":11,"Field Goals Made":52,"Field Goals Attempted":124,"Free Throws Made":59} },
      { id:"bb055", isActive:false, name:"John Lenderink",       firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":22,"Wins":16,"Points":269,"Assists":76,"Total Rebounds":67,"Steals":30,"Blocks":4,"Field Goals Made":104,"Field Goals Attempted":203,"Free Throws Made":31,"Free Throws Attempted":48} },
      { id:"bb056", isActive:false, name:"John Meintjes",        firstYear:"2019-2020", lastYear:"2019-2020", stats:{"Games Played":9,"Wins":18,"Points":8,"Assists":1,"Total Rebounds":9,"Field Goals Made":4,"Field Goals Attempted":15,"Free Throws Made":4} },
      { id:"bb057", isActive:false, name:"Jon Vander Hoek",      firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":22,"Wins":16,"Points":109,"Assists":30,"Total Rebounds":58,"Steals":16,"Blocks":11,"Field Goals Made":40,"Field Goals Attempted":82,"Free Throws Made":29,"Free Throws Attempted":56} },
      { id:"bb058", isActive:false, name:"Josh Beijer",          firstYear:"2019-2020", lastYear:"2019-2020", stats:{"Games Played":4,"Wins":18,"Total Rebounds":2,"Field Goals Made":6,"Three Pointers Made":16,"Three Pointers Attempted":4} },
      { id:"bb059", isActive:false, name:"Josh Va Eps",          firstYear:"2012-2013", lastYear:"2012-2013", stats:{"Field Goals Made":30} },
      { id:"bb060", isActive:false, name:"Josh Van Eps",         firstYear:"2012-2013", lastYear:"2013-2014", stats:{"Points":140,"Total Rebounds":42} },
      { id:"bb061", isActive:false, name:"Josh Vriesman",        firstYear:"2000-2001", lastYear:"2000-2001", stats:{"Assists":166} },
      { id:"bb062", isActive:false, name:"Joshua Carter",        firstYear:"2011-2012", lastYear:"2011-2012", stats:{"Games Played":22,"Wins":26,"Points":26,"Total Rebounds":16,"Steals":3,"Field Goals Made":9,"Field Goals Attempted":44,"Three Pointers Made":4,"Free Throws Made":4,"Free Throws Attempted":6} },
      { id:"bb063", isActive:false, name:"Josiah Romero",        firstYear:"2017-2018", lastYear:"2019-2020", stats:{"Games Played":56,"Wins":45,"Points":374,"Assists":153,"Total Rebounds":157,"Steals":109,"Field Goals Made":146,"Field Goals Attempted":129,"Three Pointers Made":47,"Three Pointers Attempted":71,"Free Throws Made":35,"Free Throws Attempted":9} },
      { id:"bb064", isActive:false, name:"Josiah Scadden",       firstYear:"2023-2024", lastYear:"2023-2024", stats:{"Points":9,"Three Pointers Made":3} },
      { id:"bb065", isActive:false, name:"Kaden Moore",          firstYear:"2021-2022", lastYear:"2023-2024", stats:{"Games Played":19,"Wins":35,"Points":80,"Assists":13,"Total Rebounds":21,"Steals":18,"Blocks":3,"Field Goals Made":17,"Field Goals Attempted":44,"Three Pointers Made":14,"Three Pointers Attempted":52,"Free Throws Made":2,"Free Throws Attempted":6} },
      { id:"bb066", isActive:false, name:"Keaton Denooy",        firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Wins":16,"Total Rebounds":21,"Three Pointers Made":1} },
      { id:"bb067", isActive:false, name:"Keith Katte",          firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":130,"Assists":55,"Total Rebounds":56,"Steals":6,"Blocks":3,"Field Goals Made":57,"Free Throws Made":16} },
      { id:"bb068", isActive:false, name:"Kendal Kaemingk",      firstYear:"1985-1986", lastYear:"1986-1987", stats:{"Games Played":24,"Wins":18,"Points":331,"Total Rebounds":135,"Field Goals Made":142,"Field Goals Attempted":131,"Free Throws Made":34,"Free Throws Attempted":71} },
      { id:"bb069", isActive:false, name:"Kyle Poland",          firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Wins":16,"Total Rebounds":39,"Field Goals Made":30} },
      { id:"bb070", isActive:false, name:"Lee Poulette",         firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":18,"Wins":25,"Points":18,"Assists":4,"Total Rebounds":21,"Field Goals Made":9} },
      { id:"bb071", isActive:false, name:"Logan Posthumus",      firstYear:"2019-2020", lastYear:"2019-2020", stats:{"Games Played":8,"Wins":18,"Points":9,"Assists":3,"Total Rebounds":11,"Field Goals Made":4,"Field Goals Attempted":16,"Three Pointers Made":1,"Free Throws Made":1,"Free Throws Attempted":4} },
      { id:"bb072", isActive:false, name:"Luke Booysen",         firstYear:"2021-2022", lastYear:"2022-2023", stats:{"Games Played":13,"Wins":35,"Points":7,"Assists":10,"Total Rebounds":9,"Steals":2,"Field Goals Made":1,"Field Goals Attempted":2,"Three Pointers Made":2,"Free Throws Made":1,"Free Throws Attempted":4} },
      { id:"bb073", isActive:false, name:"Marcus Landhuis",      firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":8,"Wins":9,"Points":4,"Assists":7,"Total Rebounds":6,"Steals":1,"Field Goals Made":1,"Field Goals Attempted":4,"Free Throws Made":2,"Free Throws Attempted":3} },
      { id:"bb074", isActive:false, name:"Mason Hofer",          firstYear:"2010-2011", lastYear:"2012-2013", stats:{"Games Played":57,"Points":141,"Field Goals Made":54,"Field Goals Attempted":165,"Three Pointers Made":18,"Three Pointers Attempted":67,"Free Throws Made":15,"Free Throws Attempted":30} },
      { id:"bb075", isActive:false, name:"Max Attwood",          firstYear:"2019-2020", lastYear:"2020-2021", stats:{"Games Played":15,"Wins":31,"Points":13,"Assists":6,"Total Rebounds":10,"Steals":2,"Blocks":1,"Field Goals Made":6,"Field Goals Attempted":17,"Free Throws Made":1,"Free Throws Attempted":2} },
      { id:"bb076", isActive:false, name:"Micah Kortenhoeven",   firstYear:"2020-2021", lastYear:"2022-2023", stats:{"Games Played":56,"Wins":48,"Points":302,"Assists":37,"Total Rebounds":82,"Steals":43,"Blocks":14,"Field Goals Made":45,"Field Goals Attempted":98,"Three Pointers Made":4,"Three Pointers Attempted":34,"Free Throws Made":48,"Free Throws Attempted":83} },
      { id:"bb077", isActive:false, name:"Michael Reutz",        firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":21,"Wins":9,"Points":42,"Assists":9,"Total Rebounds":8,"Steals":7,"Blocks":8,"Field Goals Made":16,"Field Goals Attempted":43,"Free Throws Made":2,"Free Throws Attempted":4} },
      { id:"bb078", isActive:false, name:"Nathan Buehrer",       firstYear:"2022-2023", lastYear:"2023-2024", stats:{"Games Played":5,"Wins":14,"Points":4,"Total Rebounds":2,"Field Goals Made":2,"Field Goals Attempted":6,"Three Pointers Made":5} },
      { id:"bb079", isActive:false, name:"Nathan Herrema",       firstYear:"2019-2020", lastYear:"2021-2022", stats:{"Games Played":25,"Wins":52,"Points":10,"Assists":11,"Total Rebounds":7,"Steals":11,"Blocks":1,"Field Goals Made":4,"Field Goals Attempted":18,"Three Pointers Made":1,"Three Pointers Attempted":5,"Free Throws Made":1,"Free Throws Attempted":2} },
      { id:"bb080", isActive:false, name:"Owen Kleager",         firstYear:"2023-2024", lastYear:"2023-2024", stats:{"Points":1} },
      { id:"bb081", isActive:false, name:"Peyton Hofer",         firstYear:"2007-2008", lastYear:"2008-2009", stats:{"Games Played":41,"Wins":9,"Points":22,"Assists":42,"Total Rebounds":55,"Steals":31,"Field Goals Made":65,"Field Goals Attempted":174,"Three Pointers Made":39,"Three Pointers Attempted":104,"Free Throws Made":24,"Free Throws Attempted":35} },
      { id:"bb082", isActive:false, name:"Rafael Luna",          firstYear:"2010-2011", lastYear:"2012-2013", stats:{"Games Played":68,"Wins":48,"Points":152,"Field Goals Made":60,"Field Goals Attempted":162,"Three Pointers Made":4,"Three Pointers Attempted":33,"Free Throws Made":28,"Free Throws Attempted":60} },
      { id:"bb083", isActive:false, name:"Randy Mulder",         firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":81,"Total Rebounds":10,"Field Goals Made":36,"Field Goals Attempted":85,"Free Throws Made":14} },
      { id:"bb084", isActive:false, name:"Randy Ruter",          firstYear:"1985-1986", lastYear:"1986-1987", stats:{"Games Played":24,"Wins":18,"Points":596,"Total Rebounds":234,"Field Goals Made":243,"Field Goals Attempted":305,"Free Throws Made":83,"Free Throws Attempted":173} },
      { id:"bb085", isActive:false, name:"Rick Medema",          firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":23,"Points":95,"Total Rebounds":58,"Field Goals Made":36,"Field Goals Attempted":41,"Free Throws Made":23,"Free Throws Attempted":41} },
      { id:"bb086", isActive:false, name:"Riley Herren",         firstYear:"2010-2011", lastYear:"2011-2012", stats:{"Games Played":52,"Wins":48,"Points":103,"Field Goals Made":26,"Field Goals Attempted":111,"Three Pointers Made":2,"Free Throws Made":15,"Free Throws Attempted":26} },
      { id:"bb087", isActive:false, name:"Riley Herron",         firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":11,"Wins":9,"Points":2,"Field Goals Made":1,"Field Goals Attempted":5} },
      { id:"bb088", isActive:false, name:"Robert Parker",        firstYear:"2010-2011", lastYear:"2012-2013", stats:{"Games Played":59,"Wins":60,"Points":224,"Assists":16,"Total Rebounds":94,"Steals":20,"Blocks":4,"Field Goals Made":100,"Field Goals Attempted":223,"Three Pointers Made":1,"Free Throws Made":24,"Free Throws Attempted":45} },
      { id:"bb089", isActive:false, name:"Russ Smith",           firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":24,"Wins":25,"Points":41,"Assists":34,"Total Rebounds":15,"Steals":4,"Field Goals Made":18,"Free Throws Made":5} },
      { id:"bb090", isActive:false, name:"Ryan Beattie",         firstYear:"2017-2018", lastYear:"2019-2020", stats:{"Games Played":48,"Wins":18,"Points":92,"Assists":21,"Total Rebounds":26,"Steals":17,"Blocks":5,"Field Goals Made":37,"Field Goals Attempted":51,"Three Pointers Made":3,"Free Throws Made":17,"Free Throws Attempted":19} },
      { id:"bb091", isActive:false, name:"Ryan Wind",            firstYear:"2022-2023", lastYear:"2023-2024", stats:{"Games Played":15,"Wins":14,"Points":109,"Assists":12,"Total Rebounds":48,"Steals":3,"Blocks":24,"Field Goals Made":31,"Field Goals Attempted":51,"Free Throws Made":6,"Free Throws Attempted":8} },
      { id:"bb092", isActive:false, name:"Sam Bull",             firstYear:"2019-2020", lastYear:"2019-2020", stats:{"Games Played":9,"Wins":18,"Points":5,"Assists":2,"Total Rebounds":11,"Steals":4,"Blocks":1,"Field Goals Made":2,"Field Goals Attempted":10,"Three Pointers Made":1,"Three Pointers Attempted":5,"Free Throws Made":2} },
      { id:"bb093", isActive:false, name:"Sam Marsh",            firstYear:"2008-2009", lastYear:"2008-2009", stats:{"Games Played":20,"Wins":9,"Points":28,"Assists":22,"Total Rebounds":16,"Steals":14,"Field Goals Made":11,"Field Goals Attempted":35,"Free Throws Made":3,"Free Throws Attempted":11} },
      { id:"bb094", isActive:false, name:"Scott Hoffman",        firstYear:"1985-1986", lastYear:"1985-1986", stats:{"Points":91,"Total Rebounds":48,"Field Goals Made":40,"Field Goals Attempted":80,"Free Throws Made":32} },
      { id:"bb095", isActive:false, name:"Sean Van Kooten",      firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Wins":16} },
      { id:"bb096", isActive:false, name:"Steve Wolffis",        firstYear:"1977-1978", lastYear:"1977-1978", stats:{"Games Played":25,"Wins":25,"Points":63,"Assists":19,"Total Rebounds":37,"Steals":4,"Blocks":2,"Field Goals Made":26,"Free Throws Made":11} },
      { id:"bb097", isActive:false, name:"Steven Conway",        firstYear:"2009-2010", lastYear:"2010-2011", stats:{"Games Played":49,"Wins":36,"Points":418,"Field Goals Made":92,"Field Goals Attempted":366,"Three Pointers Made":28,"Three Pointers Attempted":104,"Free Throws Made":100,"Free Throws Attempted":132} },
      { id:"bb098", isActive:false, name:"Tate Kastens",         firstYear:"2011-2012", lastYear:"2013-2014", stats:{"Games Played":74,"Wins":62,"Points":413,"Assists":167,"Total Rebounds":290,"Steals":71,"Blocks":76,"Field Goals Made":336,"Field Goals Attempted":366,"Three Pointers Made":105,"Three Pointers Attempted":161,"Free Throws Made":172,"Free Throws Attempted":245} },
      { id:"bb099", isActive:false, name:"Taylor Smith",         firstYear:"2007-2008", lastYear:"2009-2010", stats:{"Games Played":61,"Wins":25,"Points":488,"Assists":170,"Total Rebounds":131,"Steals":84,"Field Goals Made":190,"Field Goals Attempted":499,"Three Pointers Made":43,"Three Pointers Attempted":153,"Free Throws Made":65,"Free Throws Attempted":102} },
      { id:"bb100", isActive:false, name:"Tobey Schneider",      firstYear:"1985-1986", lastYear:"1986-1987", stats:{"Games Played":24,"Wins":18,"Points":217,"Total Rebounds":50,"Field Goals Made":81,"Field Goals Attempted":133,"Free Throws Made":37,"Free Throws Attempted":104} },
      { id:"bb101", isActive:false, name:"Todd Griess",          firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":17,"Points":10,"Total Rebounds":8,"Field Goals Made":1,"Field Goals Attempted":15,"Free Throws Made":8,"Free Throws Attempted":15} },
      { id:"bb102", isActive:false, name:"Tom Dykstra",          firstYear:"1972-1973", lastYear:"1972-1973", stats:{"Total Rebounds":385} },
      { id:"bb103", isActive:false, name:"Tom Lenderick",        firstYear:"2008-2009", lastYear:"2009-2010", stats:{"Games Played":45,"Wins":39,"Points":154,"Field Goals Made":64,"Field Goals Attempted":176,"Three Pointers Made":6,"Free Throws Made":38,"Free Throws Attempted":65} },
      { id:"bb104", isActive:false, name:"Travis Vanden Broeke", firstYear:"1986-1987", lastYear:"1986-1987", stats:{"Games Played":15,"Points":14,"Total Rebounds":7,"Field Goals Made":6,"Field Goals Attempted":5,"Free Throws Made":2,"Free Throws Attempted":5} },
      { id:"bb105", isActive:false, name:"Trevin Schmitt",       firstYear:"2021-2022", lastYear:"2022-2023", stats:{"Games Played":23,"Wins":35,"Points":32,"Assists":10,"Total Rebounds":33,"Steals":7,"Blocks":3,"Field Goals Made":4,"Three Pointers Made":1,"Free Throws Made":7,"Free Throws Attempted":18} },
      { id:"bb106", isActive:false, name:"Tristan Matthies",     firstYear:"2005-2006", lastYear:"2005-2006", stats:{"Three Pointers Made":89} },
      { id:"bb107", isActive:false, name:"Tyson Millican",       firstYear:"2019-2020", lastYear:"2020-2021", stats:{"Games Played":19,"Wins":31,"Points":33,"Assists":13,"Total Rebounds":14,"Steals":8,"Blocks":2,"Field Goals Made":15,"Field Goals Attempted":57,"Three Pointers Made":8,"Free Throws Made":3,"Free Throws Attempted":8} },
      { id:"bb108", isActive:true,  name:"Walker Politte",       firstYear:"2023-2024", lastYear:"2025-2026", stats:{"Games Played":20,"Wins":13,"Points":255,"Assists":55,"Total Rebounds":90,"Offensive Rebounds":15,"Defensive Rebounds":75,"Steals":59,"Blocks":21,"Field Goals Made":79,"Field Goals Attempted":175,"Three Pointers Made":40,"Three Pointers Attempted":105,"Free Throws Made":55,"Free Throws Attempted":81} },
      { id:"bb109", isActive:false, name:"Westin Wiley",         firstYear:"2009-2010", lastYear:"2009-2010", stats:{"Games Played":24,"Wins":14,"Points":63,"Field Goals Made":22,"Field Goals Attempted":70,"Three Pointers Made":7,"Three Pointers Attempted":20,"Free Throws Made":12,"Free Throws Attempted":22} },
      { id:"bb110", isActive:false, name:"Xander Neu",           firstYear:"2019-2020", lastYear:"2021-2022", stats:{"Games Played":63,"Wins":52,"Points":509,"Assists":49,"Total Rebounds":197,"Steals":56,"Blocks":33,"Field Goals Made":228,"Field Goals Attempted":383,"Three Pointers Made":6,"Three Pointers Attempted":23,"Free Throws Made":40,"Free Throws Attempted":72} },
      { id:"bb111", isActive:false, name:"Zac Beijer",           firstYear:"2019-2020", lastYear:"2022-2023", stats:{"Games Played":26,"Wins":53,"Points":104,"Assists":33,"Total Rebounds":31,"Steals":25,"Blocks":2,"Field Goals Made":3,"Field Goals Attempted":8,"Three Pointers Made":16,"Three Pointers Attempted":68,"Free Throws Made":16,"Free Throws Attempted":29} },
      { id:"bb112", isActive:false, name:"Zach Johnson",         firstYear:"2017-2018", lastYear:"2019-2020", stats:{"Games Played":61,"Wins":45,"Points":308,"Assists":182,"Total Rebounds":141,"Steals":82,"Blocks":7,"Field Goals Made":45,"Field Goals Attempted":276,"Three Pointers Made":4,"Three Pointers Attempted":88,"Free Throws Made":23,"Free Throws Attempted":128} },
      { id:"bb113", isActive:false, name:"Zach Smith",           firstYear:"2007-2008", lastYear:"2008-2009", stats:{"Games Played":43,"Wins":25,"Points":201,"Assists":123,"Total Rebounds":96,"Steals":54,"Field Goals Made":84,"Field Goals Attempted":229,"Free Throws Made":27,"Free Throws Attempted":60} },
      { id:"bb114", isActive:false, name:"Zak Attwood",          firstYear:"2021-2022", lastYear:"2022-2023", stats:{"Games Played":14,"Wins":35,"Points":20,"Assists":6,"Total Rebounds":8,"Steals":3,"Blocks":1,"Field Goals Made":1,"Field Goals Attempted":2,"Three Pointers Made":1,"Free Throws Made":4,"Free Throws Attempted":8} },
      { id:"bb115", isActive:false, name:"Zane Dacus",           firstYear:"2007-2008", lastYear:"2007-2008", stats:{"Games Played":21,"Wins":16,"Points":188,"Assists":64,"Total Rebounds":60,"Steals":35,"Blocks":4,"Field Goals Made":70,"Field Goals Attempted":186,"Free Throws Made":38} },
      { id:"bb116", isActive:true,  name:"Micah Warren", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":17,"Wins":13,"Points":22,"Assists":2,"Total Rebounds":14,"Offensive Rebounds":4,"Defensive Rebounds":10,"Steals":5,"Field Goals Made":8,"Field Goals Attempted":26,"Three Pointers Made":5,"Three Pointers Attempted":17,"Free Throws Made":1,"Free Throws Attempted":2} },
      { id:"bb117", isActive:true,  name:"Bryce Peters", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":24,"Wins":13,"Points":83,"Assists":16,"Total Rebounds":52,"Offensive Rebounds":19,"Defensive Rebounds":33,"Steals":23,"Blocks":2,"Field Goals Made":30,"Field Goals Attempted":81,"Three Pointers Made":11,"Three Pointers Attempted":39,"Free Throws Made":12,"Free Throws Attempted":22} },
      { id:"bb118", isActive:true,  name:"Cole McCabe", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":12,"Wins":13,"Points":5,"Assists":1,"Total Rebounds":4,"Offensive Rebounds":1,"Defensive Rebounds":3,"Steals":4,"Field Goals Made":1,"Field Goals Attempted":4,"Three Pointers Attempted":1,"Free Throws Made":3,"Free Throws Attempted":6} },
      { id:"bb119", isActive:true,  name:"Luke DeBoer", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":25,"Wins":13,"Points":187,"Assists":71,"Total Rebounds":118,"Offensive Rebounds":29,"Defensive Rebounds":89,"Steals":32,"Blocks":7,"Field Goals Made":65,"Field Goals Attempted":163,"Three Pointers Made":28,"Three Pointers Attempted":89,"Free Throws Made":29,"Free Throws Attempted":45} },
      { id:"bb120", isActive:true,  name:"Zeke Swartwood", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":24,"Wins":13,"Points":203,"Assists":46,"Total Rebounds":40,"Offensive Rebounds":5,"Defensive Rebounds":35,"Steals":35,"Blocks":5,"Field Goals Made":72,"Field Goals Attempted":190,"Three Pointers Made":34,"Three Pointers Attempted":95,"Free Throws Made":25,"Free Throws Attempted":39} },
      { id:"bb121", isActive:true,  name:"Rhodes Nwankwo", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":23,"Wins":13,"Points":125,"Assists":22,"Total Rebounds":53,"Offensive Rebounds":18,"Defensive Rebounds":35,"Steals":13,"Blocks":5,"Field Goals Made":52,"Field Goals Attempted":100,"Three Pointers Made":11,"Three Pointers Attempted":27,"Free Throws Made":10,"Free Throws Attempted":17} },
      { id:"bb122", isActive:true,  name:"Jayden Cain", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":25,"Wins":13,"Points":370,"Assists":50,"Total Rebounds":148,"Offensive Rebounds":33,"Defensive Rebounds":115,"Steals":41,"Blocks":34,"Field Goals Made":129,"Field Goals Attempted":353,"Three Pointers Made":34,"Three Pointers Attempted":125,"Free Throws Made":78,"Free Throws Attempted":113} },
      { id:"bb123", isActive:true,  name:"Matthijs Vande Griend", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":8,"Wins":13,"Points":2,"Total Rebounds":1,"Defensive Rebounds":1,"Field Goals Attempted":4,"Free Throws Made":2,"Free Throws Attempted":2} },
      { id:"bb124", isActive:true,  name:"Luke Gonzales", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":9,"Wins":13,"Points":9,"Assists":3,"Total Rebounds":8,"Offensive Rebounds":4,"Defensive Rebounds":4,"Steals":3,"Field Goals Made":3,"Field Goals Attempted":4,"Three Pointers Attempted":1,"Free Throws Made":3,"Free Throws Attempted":4} },
      { id:"bb125", isActive:true,  name:"Graham Wolgemuth", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":24,"Wins":13,"Points":46,"Assists":9,"Total Rebounds":69,"Offensive Rebounds":21,"Defensive Rebounds":48,"Steals":9,"Blocks":9,"Field Goals Made":18,"Field Goals Attempted":46,"Three Pointers Made":1,"Three Pointers Attempted":7,"Free Throws Made":9,"Free Throws Attempted":9} },
      { id:"bb126", isActive:true,  name:"Dylan Laverty", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":13,"Wins":13,"Points":12,"Assists":3,"Total Rebounds":3,"Offensive Rebounds":1,"Defensive Rebounds":2,"Steals":1,"Field Goals Made":4,"Field Goals Attempted":11,"Three Pointers Made":4,"Three Pointers Attempted":10} },
      { id:"bb127", isActive:true,  name:"Tobin Delle Donne", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":4,"Wins":13,"Total Rebounds":3,"Defensive Rebounds":3} },
      { id:"bb128", isActive:true,  name:"Austin Fitzgerald", firstYear:"2025-2026", lastYear:"2025-2026", stats:{"Games Played":25,"Wins":13,"Points":64,"Assists":50,"Total Rebounds":97,"Offensive Rebounds":30,"Defensive Rebounds":67,"Steals":22,"Blocks":24,"Field Goals Made":21,"Field Goals Attempted":68,"Three Pointers Made":6,"Three Pointers Attempted":25,"Free Throws Made":16,"Free Throws Attempted":23} },
    ],
  },
  {
    id:"s3", name:"Denver Christian", mascot:"Thunder", sport:"soccer_girls", primaryColor:"#1a3a6b",
    athletes: [
      { id:"p_sc1",  isActive:true, name:"Emma Schoenwald",   position:"F",  gradYear:2026, stats:{"Goals":18,"Assists":12,"Games Played":22} },
      { id:"p_sc2",  isActive:true, name:"Lily Tran",         position:"F",  gradYear:2026, stats:{"Goals":14,"Assists":8, "Games Played":22} },
      { id:"p_sc3",  isActive:true, name:"Ava Petersen",      position:"M",  gradYear:2027, stats:{"Goals":9, "Assists":15,"Games Played":22} },
      { id:"p_sc4",  isActive:true, name:"Sofia Ramirez",     position:"M",  gradYear:2027, stats:{"Goals":6, "Assists":11,"Games Played":21} },
      { id:"p_sc5",  isActive:true, name:"Claire Weston",     position:"M",  gradYear:2028, stats:{"Goals":4, "Assists":7, "Games Played":20} },
      { id:"p_sc6",  isActive:true, name:"Maya Johnson",      position:"D",  gradYear:2026, stats:{"Goals":2, "Assists":3, "Games Played":22} },
      { id:"p_sc7",  isActive:true, name:"Ella Forseth",      position:"D",  gradYear:2027, stats:{"Goals":1, "Assists":4, "Games Played":21} },
      { id:"p_sc8",  isActive:true, name:"Grace Kim",         position:"D",  gradYear:2028, stats:{"Goals":0, "Assists":2, "Games Played":19} },
      { id:"p_sc9",  isActive:true, name:"Nora Sullivan",     position:"D",  gradYear:2029, stats:{"Goals":0, "Assists":1, "Games Played":18} },
      { id:"p_sc10", isActive:true, name:"Paige Hartman",     position:"GK", gradYear:2027, stats:{"Saves":74,"Clean Sheets":8,"Games Played":22} },
    ],
    records: [
      { id:"sr1", statName:"Goals",        variant:"Career total",   holderName:"",  holderYear:"", value:30,  sport:"soccer" },
      { id:"sr2", statName:"Goals",        variant:"Single season",  holderName:"",  holderYear:"", value:20,  sport:"soccer" },
      { id:"sr3", statName:"Assists",      variant:"Career total",   holderName:"",  holderYear:"", value:25,  sport:"soccer" },
      { id:"sr4", statName:"Assists",      variant:"Single season",  holderName:"",  holderYear:"", value:15,  sport:"soccer" },
      { id:"sr5", statName:"Saves",        variant:"Career total",   holderName:"",  holderYear:"", value:150, sport:"soccer" },
      { id:"sr6", statName:"Clean Sheets", variant:"Career total",   holderName:"",  holderYear:"", value:20,  sport:"soccer" },
      { id:"sr7", statName:"Coach Wins",   variant:"Career total",   holderName:"",  holderYear:"", value:50,  sport:"soccer" },
    ],
    milestones: [
      { id:"sm1", statName:"Goals",         values:[5,10,15,20,25,30], alertPct:90 },
      { id:"sm2", statName:"Assists",       values:[5,10,15,20,25],    alertPct:90 },
      { id:"sm3", statName:"Saves",         values:[25,50,75,100,150], alertPct:90 },
      { id:"sm4", statName:"Clean Sheets",  values:[5,10,15,20],       alertPct:90 },
      { id:"sm5", statName:"Games Played",  values:[25,50,75],         alertPct:90 },
    ]
  }
];

// ── All-Time Leaderboard Tab ───────────────────────────────────────────────────
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
            {statsToShow.map(stat => {
              const val = player.stats[stat] || 0;
              const rank = rankFor(player, stat);
              const total = rankFor(null, stat); // total players with this stat
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

function AllTimeTab({ roster, athletes = [], school, onUpdate }) {
  const ALL_STATS = [...new Set(roster.flatMap(p => Object.keys(p.stats)))]
    .filter(s => roster.some(p => (p.stats[s]||0) > 0))
    .sort((a,b) => {
      const ai = STAT_ORDER.indexOf(a); const bi = STAT_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

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

  const activeNames = new Set(
    athletes.filter(a => a.isActive !== false).map(a => a.name.toLowerCase())
  );
  const inactiveNames = new Set(
    athletes.filter(a => a.isActive === false).map(a => a.name.toLowerCase())
  );

  const effectiveIsActive = (p) => {
    const nameLower = p.name.toLowerCase();
    if (inactiveNames.has(nameLower)) return false;
    if (activeNames.has(nameLower)) return true;
    return p.isCurrent;
  };

  // rankFor(player, stat) → 1-based rank of player in that stat across all roster
  // rankFor(null, stat)   → count of players with that stat > 0
  const rankFor = (player, stat) => {
    const sorted = roster
      .filter(p => (p.stats[stat]||0) > 0)
      .sort((a,b) => (b.stats[stat]||0) - (a.stats[stat]||0));
    if (player === null) return sorted.length;
    const idx = sorted.findIndex(p => p.id === player.id);
    return idx === -1 ? sorted.length + 1 : idx + 1;
  };

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
function SeasonsTab({ seasons, onSave }) {
  const [sortDir, setSortDir] = useState("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const blankForm = { season:"", wins:"", losses:"", leagueWins:"", leagueLosses:"", coach:"", notes:"" };
  const [form, setForm] = useState(blankForm);

  if (!seasons || !seasons.length) return (
    <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No season history available.</div>
  );

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
  const nameLower = playerName.toLowerCase().trim();
  const programScores = [];

  allSchools.forEach(school => {
    const roster = school.allTimeRoster || [];
    const match = roster.find(p => p.name.toLowerCase().trim() === nameLower);
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

  const roster = school.allTimeRoster || [];
  const hasSeasons = (school.seasons || []).length > 0;

  // Build scored athletes list — memoized so it only recalculates when roster changes
  const scored = useMemo(() => roster.map(player => {
    try {
      const programScore = calcProgramHofScore(player, school);
      const crossResult = allSchools.length > 1 ? calcCrossSportScore(player.name, allSchools) : null;
      const finalScore = crossResult ? crossResult.finalScore : programScore;
      const confirmed = !!(player.schoolHallOfFame || player.stateHallOfFame);
      return { player, programScore, crossSport: crossResult?.crossSport || false, allScores: crossResult?.allScores || [], finalScore, confirmed };
    } catch(e) {
      return { player, programScore: 0, crossSport: false, allScores: [], finalScore: 0, confirmed: false };
    }
  }), [school.id, school.allTimeRoster, school.seasons, school.records, allSchools]); // eslint-disable-line

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
  const roster = school.allTimeRoster || [];

  // Build stat breakdown — rank + contribution for each stat
  const statBreakdown = Object.entries(player.stats || {})
    .filter(([stat]) => HOF_STAT_WEIGHTS[stat] > 0)
    .map(([stat, val]) => {
      const weight = HOF_STAT_WEIGHTS[stat] || 1;
      const sorted = roster.filter(p => (p.stats[stat]||0) > 0).sort((a,b)=>(b.stats[stat]||0)-(a.stats[stat]||0));
      const rank = sorted.findIndex(p => p.id === player.id) + 1;
      const total = sorted.length;
      return { stat, val, rank, total, weight };
    })
    .filter(r => r.rank > 0)
    .sort((a, b) => a.rank - b.rank);

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

          {/* Stat rankings */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Statistical rank</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {statBreakdown.map(({ stat, val, rank, total }) => (
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

          {/* Records held */}
          {(() => {
            const playerNameLower = (player.name||"").toLowerCase().trim();
            const heldRecords = (school.records||[]).filter(r => {
              const h = (r.holderName||"").toLowerCase().trim();
              return h && h !== "multiple players" && h === playerNameLower;
            });
            if (!heldRecords.length) return null;
            const bonus = Math.min(heldRecords.reduce((a,r)=>(r.variant||"").toLowerCase().includes("career")?a+5:a+3,0),20);
            return (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>
                  Records held <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:700, marginLeft:6 }}>+{bonus} pts</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {heldRecords.map(r => (
                    <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"7px 12px", fontSize:13 }}>
                      <span style={{ fontWeight:600, color:"#111" }}>{r.statName}</span>
                      <span style={{ color:"#6b7280" }}>{r.variant}</span>
                      <span style={{ fontWeight:700, color:"#b45309" }}>{(r.value||0).toLocaleString()} 🏆</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Team success seasons */}
          {playerSeasons.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Team success during career</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {playerSeasons.map(s => (
                  <div key={s.season} style={{ display:"flex", justifyContent:"space-between", background:"#f9fafb", borderRadius:8, padding:"7px 12px", fontSize:13 }}>
                    <span style={{ fontWeight:600, color:"#111" }}>{s.season}</span>
                    <span style={{ color:"#6b7280" }}>{s.notes}</span>
                    <span style={{ fontWeight:700, color:"#92400e" }}>+{getSeasonSuccessScore(s.notes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

function SchoolDashboard({ school, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showImport, setShowImport] = useState(false);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showMilestoneSettings, setShowMilestoneSettings] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
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
    const newAthletes = parsed.rows.map((row, i) => {
      const name = nameCol ? String(row[nameCol]).trim() : `Athlete ${i+1}`;
      if (!name || name === "undefined") return null;
      const stats = {};
      parsed.headers.forEach(h => {
        if (metaCols.has(h)) return;
        const val = row[h];
        if (typeof val === "number" && val > 0) stats[h] = val;
      });
      return {
        id: `imported_${Date.now()}_${i}`,
        isActive: true,
        name,
        position: posCol ? String(row[posCol]) : "—",
        gradYear: gradCol ? Number(row[gradCol]) : new Date().getFullYear() + 2,
        stats
      };
    }).filter(Boolean);
    // Merge: update existing athletes by name, append new ones
    const existingNames = new Map(school.athletes.map(a => [a.name.toLowerCase(), a]));
    const updated = [...school.athletes];
    newAthletes.forEach(imp => {
      const key = imp.name.toLowerCase();
      if (existingNames.has(key)) {
        const idx = updated.findIndex(a => a.name.toLowerCase() === key);
        updated[idx] = { ...updated[idx], stats: { ...updated[idx].stats, ...imp.stats } };
      } else {
        updated.push(imp);
      }
    });
    onUpdate({ ...school, athletes: updated });
  };

  const tabs = ["overview","athletes","records","milestones","alerts","all-time",
    ...(school.seasons?.length ? ["seasons"] : []),
    "hof","export"];

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
            <button onClick={()=>setShowImport(true)} style={{ background:"#eff6ff",color:"#1a56db",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>↑ Import</button>
            <button onClick={()=>setShowEmailPreview(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer" }}>
              📧 Send alerts ({totalAlertCount})
            </button>
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
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",overflow:"hidden" }}>
              <div style={{ padding:"14px 20px",borderBottom:"1px solid #f3f0ea",fontWeight:700,fontSize:15,color:"#111" }}>Athlete leaderboard</div>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
                <thead><tr style={{ background:"#fafaf8" }}>
                  <th style={{ padding:"10px 20px",textAlign:"left",fontSize:12,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #f3f0ea" }}>Athlete</th>
                  {sport.statCategories.slice(0,4).map(c=>(
                    <th key={c.name} style={{ padding:"10px 12px",textAlign:"right",fontSize:12,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #f3f0ea" }}>{c.name}</th>
                  ))}
                  <th style={{ padding:"10px 12px",textAlign:"center",fontSize:12,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #f3f0ea" }}>Alerts</th>
                </tr></thead>
                <tbody>
                  {school.athletes.filter(a=>a.isActive!==false).map((a,i)=>{
                    const ats = getMilestoneAlerts(a, school.records||[], school.milestones||[])
                      .filter(al => !isAlertDismissed(a.id, al.statName, al.target));
                    return (
                      <tr key={a.id} onClick={()=>{ setSelectedAthlete(a); setActiveTab("athletes"); }}
                        style={{ borderBottom:"1px solid #f9f7f4",cursor:"pointer",background:i%2===0?"#fff":"#fafaf8" }}>
                        <td style={{ padding:"11px 20px" }}>
                          <div style={{ fontWeight:600,color:"#111" }}>{a.name}</div>
                          <div style={{ fontSize:12,color:"#9ca3af" }}>{a.position} · Class of {a.gradYear}</div>
                        </td>
                        {sport.statCategories.slice(0,4).map(c=>(
                          <td key={c.name} style={{ padding:"11px 12px",textAlign:"right",color:a.stats[c.name]?"#111":"#d1d5db" }}>
                            {a.stats[c.name]!=null?a.stats[c.name].toLocaleString():"—"}
                          </td>
                        ))}
                        <td style={{ padding:"11px 12px",textAlign:"center" }}>
                          {ats.length>0?<span style={{ background:"#fef3c7",color:"#92400e",borderRadius:12,padding:"2px 8px",fontSize:12,fontWeight:700 }}>{ats.length}</span>:<span style={{ color:"#d1d5db" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                  <div key={athlete.id} onClick={()=>setSelectedAthlete(isSelected?null:athlete)}
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
                        {Object.entries(athlete.stats).filter(([k]) => k !== "Games Played" || Object.keys(athlete.stats).length === 1).map(([k,v])=>(
                          <div key={k} style={{ background:"#f9fafb",borderRadius:6,padding:"5px 8px" }}>
                            <div style={{ fontSize:10,color:"#9ca3af",lineHeight:1.2 }}>{k}</div>
                            <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{typeof v==="number"?v.toLocaleString():v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isSelected&&ats.length>0&&isActive&&(
                      <div style={{ marginTop:12,borderTop:"1px solid #f3f0ea",paddingTop:10 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:"#374151",marginBottom:6 }}>Milestone alerts</div>
                        {ats.map((a,i)=><AlertBadge key={i} alert={a} mode="short" />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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

            {(school.records||[]).length===0
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

                  const byGroup = {};
                  (school.records||[]).forEach(r => {
                    const grp = getGroup(r.statName);
                    if (!byGroup[grp]) byGroup[grp] = {};
                    if (!byGroup[grp][r.statName]) byGroup[grp][r.statName] = [];
                    byGroup[grp][r.statName].push(r);
                  });

                  return Object.entries(byGroup).map(([grpName, statMap]) => (
                    <div key={grpName} style={{ marginBottom:20 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                        <span style={{ background:groupColors[grpName]||"#f1f5f9",color:groupTextColors[grpName]||"#334155",borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700 }}>{grpName}</span>
                        <div style={{ flex:1,height:1,background:"#e8e4dd" }} />
                        <span style={{ fontSize:12,color:"#9ca3af" }}>{Object.values(statMap).flat().length} records</span>
                      </div>
                      {Object.entries(statMap).map(([statName, recs]) => {
                        const leaders = school.athletes.filter(a=>a.isActive!==false && a.stats[statName]!=null).sort((a,b)=>b.stats[statName]-a.stats[statName]);
                        const leader = leaders[0];
                        return (
                          <div key={statName} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8e4dd",marginBottom:8,overflow:"hidden" }}>
                            <div style={{ padding:"10px 16px",borderBottom:"1px solid #f3f0ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                              <div style={{ fontWeight:700,fontSize:14,color:"#111" }}>{statName}</div>
                              {leader&&<div style={{ fontSize:12,color:"#6b7280" }}>Current leader: <strong>{leader.name}</strong> ({leader.stats[statName].toLocaleString()})</div>}
                            </div>
                            <div style={{ padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8 }}>
                              {recs.map(rec=>{
                                const leaderVal = leader?.stats[statName];
                                const p = leaderVal && rec.variant==="Career total" ? pct(leaderVal, rec.value) : null;
                                return (
                                  <div key={rec.id} style={{ background:"#f9fafb",borderRadius:8,padding:12 }}>
                                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                                      <span style={{ background:groupColors[grpName]||"#eff6ff",color:groupTextColors[grpName]||"#1e3a5f",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600 }}>{rec.variant}</span>
                                      <span style={{ fontSize:17,fontWeight:700,color:"#111" }}>{rec.value.toLocaleString()}</span>
                                    </div>
                                    {rec.holderName&&<div style={{ fontSize:12,color:"#6b7280" }}>🏅 {rec.holderName}{rec.holderYear?` · ${rec.holderYear}`:""}</div>}
                                    {p!==null&&rec.variant==="Career total"&&(
                                      <div style={{ marginTop:8 }}>
                                        <div style={{ fontSize:11,color:"#6b7280",marginBottom:3 }}>{leader.name}: {leaderVal.toLocaleString()} ({p}%)</div>
                                        <ProgressBar value={leaderVal} max={rec.value} color={p>=85?"#f59e0b":"#1a56db"} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                .reduce((sum, s) => sum + (s.wins || 0), 0);
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
          <HallOfFameTab school={school} allSchools={[school]} onUpdate={onUpdate} />
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

export default function App() {
  const [schools, setSchoolsRaw] = useState(() => loadSchools());
  const [activeSchool, setActiveSchool] = useState(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [homeTab, setHomeTab] = useState("schools");

  const setSchools = useCallback((updater) => {
    setSchoolsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveSchools(next);
      return next;
    });
  }, []);

  const updateSchool = useCallback((updated) => {
    setSchools(s => s.map(sc => sc.id===updated.id ? updated : sc));
    setActiveSchool(updated);
  }, [setSchools]);

  if (activeSchool) {
    return <SchoolDashboard school={activeSchool} onBack={()=>setActiveSchool(null)} onUpdate={updateSchool} />;
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

    const users = [
      { name:"Bret McGatlin", email:"bmcgatlin@denchristian.org", role:"Admin", avatar:"BM" },
      { name:"Chris Fuller",  email:"cfuller@denchristian.org",   role:"Coach", avatar:"CF" },
      { name:"Athletic Director", email:"ad@denchristian.org",    role:"View only", avatar:"AD" },
    ];

    return (
      <div style={{ padding:24, maxWidth:760, margin:"0 auto" }}>

        {/* Account */}
        <Section title="👤 Account">
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:16,background:"#f9fafb",borderRadius:10 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"#1a56db",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:20 }}>A</div>
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:"#111" }}>Admin User</div>
              <div style={{ fontSize:13,color:"#6b7280" }}>admin@denchristian.org</div>
              <div style={{ display:"inline-block",background:"#dbeafe",color:"#1e40af",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,marginTop:4 }}>Pro plan</div>
            </div>
            <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
              <button style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer",color:"#374151" }}>Change photo</button>
              <button onClick={()=>signOut().then(()=>window.location.reload())}
                style={{ background:"none",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer",color:"#991b1b",fontWeight:600 }}>Sign out</button>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            <Field label="First name"><Input defaultValue="Admin" /></Field>
            <Field label="Last name"><Input defaultValue="User" /></Field>
            <Field label="Email address"><Input defaultValue="admin@denchristian.org" type="email" /></Field>
            <Field label="Phone number"><Input placeholder="(555) 000-0000" type="tel" /></Field>
          </div>
          <SaveBtn />
        </Section>

        {/* Password */}
        <Section title="🔒 Password">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            <Field label="Current password"><Input placeholder="••••••••" type="password" /></Field>
            <div />
            <Field label="New password" hint="Minimum 8 characters"><Input placeholder="••••••••" type="password" /></Field>
            <Field label="Confirm new password"><Input placeholder="••••••••" type="password" /></Field>
          </div>
          <SaveBtn label="Update password" />
        </Section>

        {/* Subscription */}
        <Section title="⭐ Subscription">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16 }}>
            {[
              { plan:"Starter", price:"Free", annual:"", features:[
                  "1 program",
                  "Up to 20 athletes",
                  "Basic milestones",
                  "No email alerts",
                ], current:false, highlight:false },
              { plan:"Pro", price:"$19/mo", annual:"$190/yr — save $38", features:[
                  "1 school, unlimited programs",
                  "Unlimited athletes",
                  "Custom milestones & alerts",
                  "Email alerts",
                  "All-time records & seasons",
                  "Multi-coach access",
                ], current:true, highlight:true },
              { plan:"School", price:"$49/mo", annual:"$490/yr — save $98", features:[
                  "1 school, unlimited programs",
                  "Everything in Pro",
                  "Multi-coach access",
                  "Admin dashboard",
                  "Priority support",
                ], current:false, highlight:false },
              { plan:"District", price:"$149/mo", annual:"$1,490/yr — save $298", features:[
                  "Multiple schools",
                  "Everything in School",
                  "District admin dashboard",
                  "Bulk program setup",
                  "Dedicated support",
                ], current:false, highlight:false },
            ].map(({ plan, price, annual, features, current, highlight }) => (
              <div key={plan} style={{ border:`2px solid ${highlight?"#1a56db":"#e5e7eb"}`,borderRadius:12,padding:16,position:"relative",display:"flex",flexDirection:"column" }}>
                {current && <div style={{ position:"absolute",top:-1,right:12,background:"#1a56db",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:"0 0 6px 6px" }}>Current</div>}
                <div style={{ fontWeight:700,fontSize:15,color:"#111",marginBottom:2 }}>{plan}</div>
                <div style={{ fontSize:22,fontWeight:700,color:highlight?"#1a56db":"#374151",marginBottom:2 }}>{price}</div>
                {annual && <div style={{ fontSize:11,color:"#22c55e",fontWeight:600,marginBottom:10 }}>{annual}</div>}
                {!annual && <div style={{ marginBottom:10 }} />}
                <div style={{ flex:1 }}>
                  {features.map(f => (
                    <div key={f} style={{ display:"flex",alignItems:"flex-start",gap:6,fontSize:11,color:"#374151",marginBottom:5 }}>
                      <span style={{ color:"#22c55e",fontWeight:700,flexShrink:0,marginTop:1 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                {!current && plan !== "Starter" && (
                  <button style={{ width:"100%",marginTop:12,background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    Upgrade to {plan}
                  </button>
                )}
                {!current && plan === "Starter" && (
                  <button style={{ width:"100%",marginTop:12,background:"none",color:"#991b1b",border:"1px solid #fca5a5",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    Downgrade
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ background:"#eff6ff",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:"#1e40af" }}>
            💡 <strong>Annual billing saves up to $298/year.</strong> Switch to annual at any time and we'll prorate the difference.
          </div>
          <div style={{ background:"#f9fafb",borderRadius:10,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>Billing</div>
              <div style={{ fontSize:12,color:"#6b7280" }}>Next charge: $19.00 on July 1, 2026 · Visa ending 4242</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#374151" }}>Switch to annual</button>
              <button style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#374151" }}>Update billing</button>
              <button style={{ background:"none",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#991b1b" }}>Cancel plan</button>
            </div>
          </div>
        </Section>

        {/* Users & Access */}
        <Section title="👥 Users & access">
          <div style={{ marginBottom:16 }}>
            {users.map((u, i) => (
              <div key={u.email} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<users.length-1?"1px solid #f3f4f6":"none" }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"#e0e7ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#4338ca",flexShrink:0 }}>{u.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:"#111" }}>{u.name}</div>
                  <div style={{ fontSize:12,color:"#6b7280" }}>{u.email}</div>
                </div>
                <select defaultValue={u.role} style={{ border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px",fontSize:12,color:"#374151" }}>
                  <option>Admin</option>
                  <option>Coach</option>
                  <option>View only</option>
                </select>
                <button style={{ background:"none",border:"1px solid #fca5a5",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:"#991b1b" }}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <input placeholder="colleague@school.org" type="email"
              style={{ flex:1,border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:13 }} />
            <select style={{ border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#374151" }}>
              <option>Coach</option>
              <option>Admin</option>
              <option>View only</option>
            </select>
            <button style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap" }}>Send invite</button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="🔔 Notifications">
          <Field label="Alert email recipients" hint="Who receives milestone alert emails">
            <Input defaultValue="bmcgatlin@denchristian.org, cfuller@denchristian.org" />
          </Field>
          <Field label="Alert frequency">
            <select defaultValue="weekly" style={{ border:"1px solid #d1d5db",borderRadius:8,padding:"8px 12px",fontSize:14,width:"100%",color:"#111" }}>
              <option value="instant">Instant — send as soon as an alert fires</option>
              <option value="daily">Daily digest — once per day</option>
              <option value="weekly">Weekly digest — every Monday morning</option>
              <option value="off">Off — don't send alert emails</option>
            </select>
          </Field>
          <Field label="Notify on">
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {["Record approaching (85%+)","Record broken","Milestone reached","Milestone approaching"].map(opt => (
                <label key={opt} style={{ display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#374151",cursor:"pointer" }}>
                  <input type="checkbox" defaultChecked style={{ width:16,height:16,cursor:"pointer" }} /> {opt}
                </label>
              ))}
            </div>
          </Field>
          <SaveBtn label="Save notification settings" />
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
                    <button style={{ background:"none",border:"1px solid #fca5a5",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#991b1b" }}>Delete</button>
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
                </div>
              );
            })}
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="⚠️ Danger zone">
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",border:"1px solid #fcd34d",borderRadius:10,background:"#fffbeb" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:"#92400e" }}>Reset to demo data</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>Wipe all changes and reload the original sample data.</div>
              </div>
              <button onClick={()=>{ if(window.confirm("Reset everything to the original demo data? All your changes will be lost.")) { localStorage.removeItem(LS_KEY); window.location.reload(); } }}
                style={{ background:"#92400e",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>Reset data</button>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",border:"1px solid #fca5a5",borderRadius:10,background:"#fff5f5" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:"#991b1b" }}>Delete account</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>Permanently delete your account and all data. This cannot be undone.</div>
              </div>
              <button style={{ background:"#991b1b",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>Delete account</button>
            </div>
          </div>
        </Section>

      </div>
    );
  };

  return (
    <div style={{ fontFamily:"Georgia, serif", minHeight:"100vh", background:"#f8f7f4" }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
      {showAddSchool && <AddSchoolModal onClose={()=>setShowAddSchool(false)} onAdd={s=>setSchools(sc=>[...sc,s])} />}

      <div style={{ background:"#111",padding:"0 24px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:16,height:56 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:32,height:32,background:"#1a56db",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🏆</div>
            <span style={{ color:"#fff",fontWeight:700,fontSize:18,fontFamily:"Crimson Pro,serif" }}>MilestoneIQ</span>
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
          <div style={{ background:"#1e293b",color:"#94a3b8",borderRadius:20,padding:"4px 14px",fontSize:12 }}>⭐ Pro plan</div>
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
            <button onClick={()=>setShowAddSchool(true)} style={{ background:"#1a56db",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:14,cursor:"pointer" }}>+ Add program</button>
          </div>

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
              const topAthlete = [...school.athletes].sort((a,b)=>{
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
            <div onClick={()=>setShowAddSchool(true)}
              style={{ borderRadius:14,border:"2px dashed #d1d5db",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,cursor:"pointer",color:"#9ca3af",minHeight:160,transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#1a56db"; e.currentTarget.style.color="#1a56db"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#9ca3af"; }}>
              <div style={{ fontSize:32,marginBottom:8 }}>+</div>
              <div style={{ fontWeight:600,fontSize:14 }}>Add program</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}