// ScheduleIQ scheduling engine — dependency-free ES module.
// Ported 1:1 from the validated Python reference (tools/schedule_prototype.py),
// which passes all constraints for even leagues of 8–16 teams.
//
// Approach: circle-method single round-robin pairings -> per-week 2-coloring
// (guarantees one home + one away in every full week) -> DFS that balances
// early-week vs late-week home games. Layout: Thursday start & end, Tue/Thu cadence.

// --- seedable RNG (mulberry32) so "regenerate" is reproducible ---
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Circle-method single round-robin. Returns rounds: Array<Array<[i, j]>>.
export function roundRobin(n) {
  let rot = [];
  for (let i = 1; i < n; i++) rot.push(i);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const a = [0, ...rot];
    const games = [];
    for (let i = 0; i < n / 2; i++) games.push([a[i], a[n - 1 - i]]);
    rounds.push(games);
    rot.unshift(rot.pop()); // rotate right
  }
  return rounds;
}

// Even n: Week 1 = single late (Thu) day; Weeks 2..n/2 = early(Tue)+late(Thu) pairs.
export function dayLayout(n) {
  const days = [{ week: 1, slot: "late" }];
  let w = 2;
  for (let k = 0; k < n / 2 - 1; k++) {
    days.push({ week: w, slot: "early" });
    days.push({ week: w, slot: "late" });
    w++;
  }
  return days; // length n-1
}

// All host choices for one full week so every team is home exactly once that week.
function weekAssignments(earlyGames, lateGames, n) {
  const half = n / 2;
  const res = [];
  for (let mask = 0; mask < (1 << half); mask++) {
    const earlyHost = [];
    const isLateHost = new Array(n).fill(false); // away early => must host late
    const earlySet = new Array(n).fill(false);
    for (let i = 0; i < half; i++) {
      const [a, b] = earlyGames[i];
      const host = (mask >> i) & 1 ? b : a;
      const away = host === a ? b : a;
      earlyHost.push(host);
      earlySet[host] = true;
      isLateHost[away] = true;
    }
    let ok = true;
    const lateHost = [];
    for (let i = 0; i < half; i++) {
      const [a, b] = lateGames[i];
      if (isLateHost[a] === isLateHost[b]) { ok = false; break; } // need exactly one
      lateHost.push(isLateHost[a] ? a : b);
    }
    if (ok) res.push({ earlyHost, lateHost, earlySet });
  }
  return res;
}

function solveOrder(order, n) {
  const rounds = roundRobin(n);
  const slotRounds = order.map((i) => rounds[i]);
  const layout = dayLayout(n);
  const weekSlots = [];
  for (let s = 1; s < layout.length; s += 2) weekSlots.push([s, s + 1]);
  const weekData = [];
  for (const [es, ls] of weekSlots) {
    const opts = weekAssignments(slotRounds[es], slotRounds[ls], n);
    if (!opts.length) return null;
    weekData.push({ es, ls, opts, chosen: null });
  }
  const avg = (weekSlots.length * (n / 2)) / n;
  const lo = Math.floor(avg), hi = Math.ceil(avg);
  const homeEarly = new Array(n).fill(0);
  function dfs(k) {
    if (k === weekData.length) return homeEarly.every((h) => h >= lo && h <= hi);
    for (const opt of weekData[k].opts) {
      for (let t = 0; t < n; t++) if (opt.earlySet[t]) homeEarly[t]++;
      let bad = false;
      const left = weekData.length - (k + 1);
      for (let t = 0; t < n; t++) if (homeEarly[t] > hi || homeEarly[t] + left < lo) { bad = true; break; }
      if (!bad) { weekData[k].chosen = opt; if (dfs(k + 1)) return true; }
      for (let t = 0; t < n; t++) if (opt.earlySet[t]) homeEarly[t]--;
    }
    return false;
  }
  return dfs(0) ? { slotRounds, weekData, layout } : null;
}

// Main entry: { teams, seed?, dayNames? } -> { ok, teams, days, verification } | { ok:false, reason }
export function generateSchedule({ teams, seed = 12345, dayNames = { early: "Tue", late: "Thu" }, maxTries = 8000 }) {
  const n = teams.length;
  if (n < 4) return { ok: false, reason: "Add at least 4 teams.", teams, days: [] };
  if (n % 2 !== 0) return { ok: false, reason: "Odd team counts aren't supported yet — add a bye team.", teams, days: [] };

  const rng = makeRng(seed);
  let sol = solveOrder([...Array(n - 1).keys()], n);
  for (let t = 0; !sol && t < maxTries; t++) sol = solveOrder(shuffle([...Array(n - 1).keys()], rng), n);
  if (!sol) return { ok: false, reason: "No schedule satisfies all constraints for this league size.", teams, days: [] };

  const { slotRounds, weekData, layout } = sol;
  const final = new Array(n - 1);
  final[0] = slotRounds[0].map(([a, b]) => ({ home: a, away: b })); // Week 1: first team hosts
  for (const { es, ls, chosen } of weekData) {
    const eg = slotRounds[es], lg = slotRounds[ls];
    final[es] = eg.map((g, i) => ({ home: chosen.earlyHost[i], away: g[0] === chosen.earlyHost[i] ? g[1] : g[0] }));
    final[ls] = lg.map((g, i) => ({ home: chosen.lateHost[i], away: g[0] === chosen.lateHost[i] ? g[1] : g[0] }));
  }
  const days = layout.map((d, s) => ({
    week: d.week,
    slot: d.slot,
    dayName: dayNames[d.slot],
    opener: s === 0,
    games: final[s].map((g) => ({ homeIdx: g.home, awayIdx: g.away, home: teams[g.home], away: teams[g.away] })),
  }));
  return { ok: true, teams, days, ...verifySchedule({ teams, days }) };
}

// Independent checker — never trusts the generator.
export function verifySchedule({ teams, days }) {
  const n = teams.length;
  const stat = teams.map(() => ({ home: 0, away: 0, homeEarly: 0, homeLate: 0, weeks: {} }));
  const pairs = new Set();
  const weekDayCount = {};
  for (const d of days) {
    weekDayCount[d.week] = (weekDayCount[d.week] || 0) + 1;
    for (const g of d.games) {
      stat[g.homeIdx].home++;
      stat[g.awayIdx].away++;
      stat[g.homeIdx][d.slot === "early" ? "homeEarly" : "homeLate"]++;
      for (const t of [g.homeIdx, g.awayIdx]) stat[t].weeks[d.week] = stat[t].weeks[d.week] || { h: 0, a: 0 };
      stat[g.homeIdx].weeks[d.week].h++;
      stat[g.awayIdx].weeks[d.week].a++;
      pairs.add([g.homeIdx, g.awayIdx].sort((x, y) => x - y).join("-"));
    }
  }
  const fullWeeks = Object.keys(weekDayCount).filter((w) => weekDayCount[w] === 2).map(Number);
  const perTeam = stat.map((st, t) => {
    const homeOk = st.home === n / 2 - 1 || st.home === n / 2;
    const weekOk = fullWeeks.every((w) => st.weeks[w] && st.weeks[w].h === 1 && st.weeks[w].a === 1);
    return { team: teams[t], ...st, ok: homeOk && weekOk };
  });
  const expectedMatchups = (n * (n - 1)) / 2;
  const ok = pairs.size === expectedMatchups && perTeam.every((p) => p.ok);
  return { verification: { ok, uniqueMatchups: pairs.size, expectedMatchups, perTeam, fullWeeks } };
}
