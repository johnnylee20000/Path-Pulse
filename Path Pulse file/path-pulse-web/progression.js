/**
 * Path Pulse — progression math: momentum decay, rested XP, milestones, epic expeditions.
 * Exposes window.PathPulseProgression (no DOM).
 */
(function (global) {
  'use strict';

  var MILESTONE_LEVELS = [10, 25, 50, 70, 90, 100];

  var MILESTONE_META = {
    10: {
      id: 'skin_slate',
      type: 'skin',
      name: 'Obsidian Slate',
      desc: 'Basalt panels, glass blur, cyan 1px wireframe accents.',
    },
    25: {
      id: 'badge_lattice',
      type: 'badge',
      name: 'Triangulation Crest',
      desc: 'Wireframe badge — triangular mesh outline.',
    },
    50: {
      id: 'skin_prism',
      type: 'skin',
      name: 'Prism Glass',
      desc: 'Translucent panels, refracted edge highlights.',
    },
    70: {
      id: 'badge_pulse',
      type: 'badge',
      name: 'Pulse Core',
      desc: 'Wireframe concentric rings (120° gaps).',
    },
    90: {
      id: 'skin_carbon',
      type: 'skin',
      name: 'Carbon Pulse',
      desc: 'Carbon texture + sharp neon cyan data lines.',
    },
    100: {
      id: 'badge_singularity',
      type: 'badge',
      name: 'Closed Loop',
      desc: 'Möbius-style infinite stroke — prestige frame.',
    },
  };

  var EPICS = [
    {
      id: 'basalt_ring',
      minLevel: 15,
      title: 'Basalt Ring',
      need: '≥ 5 km loop (start ≈ end within 80 m)',
      bonusXp: 120,
    },
    {
      id: 'meridian_traverse',
      minLevel: 30,
      title: 'Meridian Traverse',
      need: '≥ 8 km & ≥ 120 m climb (GPS altitude)',
      bonusXp: 180,
    },
    {
      id: 'twin_horizon',
      minLevel: 45,
      title: 'Twin Horizon',
      need: '2 expeditions same day, each ≥ 3 km',
      bonusXp: 220,
    },
    {
      id: 'night_lattice',
      minLevel: 65,
      title: 'Night Lattice',
      need: 'Expedition started after 20:00 local, ≥ 4 km',
      bonusXp: 280,
    },
    {
      id: 'singularity_circuit',
      minLevel: 85,
      title: 'Singularity Circuit',
      need: '7 consecutive days with ≥ 2 km expedition',
      bonusXp: 500,
    },
  ];

  function haversineKm(a, b) {
    if (!a || !b) return 1e9;
    var R = 6371;
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLon = ((b.lng - a.lng) * Math.PI) / 180;
    var x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function routeElevGainM(points) {
    var g = 0;
    if (!points || !points.length) return 0;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1].alt;
      var b = points[i].alt;
      if (a == null || b == null || !isFinite(a) || !isFinite(b)) continue;
      if (b > a) g += b - a;
    }
    return g;
  }

  function isLoopRoute(points, maxGapM) {
    maxGapM = maxGapM == null ? 80 : maxGapM;
    if (!points || points.length < 4) return false;
    return haversineKm(points[0], points[points.length - 1]) * 1000 <= maxGapM;
  }

  function daysBetweenKeys(earlierKey, laterKey) {
    if (!earlierKey || !laterKey) return 0;
    var a = new Date(earlierKey + 'T12:00:00').getTime();
    var b = new Date(laterKey + 'T12:00:00').getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  function addCalendarDays(key, n) {
    var d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function decayMomentum(momentum, inactiveDays, lambda) {
    lambda = lambda == null ? 12 : lambda;
    var m = momentum == null ? 100 : momentum;
    for (var i = 0; i < inactiveDays; i++) m = Math.max(0, m - lambda);
    return Math.round(Math.min(100, m));
  }

  function computeRestedBank(daysAway, levelVal, existing, maxBank, alpha) {
    if (daysAway < 3) return Math.max(0, existing || 0);
    alpha = alpha == null ? 8 : alpha;
    maxBank = maxBank == null ? 600 : maxBank;
    var L = Math.max(1, Math.floor(levelVal || 1));
    var grant = Math.floor(alpha * daysAway * Math.sqrt(L));
    return Math.min(maxBank, Math.max(0, existing || 0) + grant);
  }

  function momentumMultiplier(momentum) {
    var M = Math.max(0, Math.min(100, momentum == null ? 100 : momentum));
    return 0.85 + 0.15 * (M / 100);
  }

  function levelFromXp(xp) {
    return Math.min(100, Math.floor(0.1 * Math.sqrt(Math.max(0, xp)) + 1));
  }

  function applyXpGain(baseXp, ctx) {
    var mult = momentumMultiplier(ctx.momentum);
    var scaled = Math.max(0, Math.floor(baseXp * mult));
    var newBank = Math.max(0, ctx.restedBank || 0);
    var fromRested = 0;
    var today = ctx.todayKey || '';
    var boostUntil = ctx.restedBoostUntil || '';
    if (today && boostUntil && today <= boostUntil && newBank > 0 && scaled > 0) {
      var bonus = Math.min(newBank, Math.max(1, Math.floor(scaled * 0.25)));
      fromRested = bonus;
      newBank -= bonus;
      scaled += bonus;
    }
    return {
      total: scaled,
      fromRested: fromRested,
      restedBankAfter: newBank,
    };
  }

  function newMilestones(prevLevel, newLevel, unlocked) {
    unlocked = unlocked || {};
    var out = [];
    for (var i = 0; i < MILESTONE_LEVELS.length; i++) {
      var L = MILESTONE_LEVELS[i];
      if (L > prevLevel && L <= newLevel && !unlocked['L' + L]) out.push(L);
    }
    return out;
  }

  function milestoneMeta(level) {
    return MILESTONE_META[level] || { id: 'unknown', type: 'unknown', name: 'Reward', desc: '' };
  }

  function epicDefinitions() {
    return EPICS.slice();
  }

  function updateSingularityProgress(progress, todayKey, km) {
    progress = progress || {};
    if (km < 2) return progress;
    var last = progress.singLastDay || '';
    if (last === todayKey) return progress;
    var gap = last ? daysBetweenKeys(last, todayKey) : 99;
    if (!last || gap > 1) progress.singularityStreak = 1;
    else progress.singularityStreak = (progress.singularityStreak || 0) + 1;
    progress.singLastDay = todayKey;
    return progress;
  }

  function updateTwinProgress(progress, todayKey, km) {
    progress = progress || {};
    if (km < 3) return progress;
    if (progress.twinTodayKey !== todayKey) {
      progress.twinTodayKey = todayKey;
      progress.twinCount = 0;
    }
    progress.twinCount = (progress.twinCount || 0) + 1;
    return progress;
  }

  /**
   * @param {string} epicId
   * @param {object} ctx — { level, km, points, startMs }
   * @param {object} progress — mutable epic progress
   * @param {object} unlockedEpics — { basalt_ring: true, ... }
   */
  function evaluateEpicCompletion(epicId, ctx, progress, unlockedEpics) {
    unlockedEpics = unlockedEpics || {};
    if (unlockedEpics[epicId]) return null;
    var def = EPICS.find(function (e) {
      return e.id === epicId;
    });
    if (!def || ctx.level < def.minLevel) return null;

    var km = ctx.km || 0;
    var pts = ctx.points || [];
    var ok = false;

    if (epicId === 'basalt_ring') {
      ok = km >= 5 && isLoopRoute(pts, 80);
    } else if (epicId === 'meridian_traverse') {
      ok = km >= 8 && routeElevGainM(pts) >= 120;
    } else if (epicId === 'twin_horizon') {
      ok = (progress.twinCount || 0) >= 2;
    } else if (epicId === 'night_lattice') {
      var h = 12;
      if (ctx.startMs) {
        h = new Date(ctx.startMs).getHours();
      }
      var late = h >= 20 || h < 5;
      ok = late && km >= 4;
    } else if (epicId === 'singularity_circuit') {
      ok = (progress.singularityStreak || 0) >= 7;
    }

    if (!ok) return null;
    return { epicId: epicId, bonusXp: def.bonusXp, title: def.title };
  }

  function runAllEpicChecks(ctx, progress, unlockedEpics) {
    var results = [];
    for (var i = 0; i < EPICS.length; i++) {
      var id = EPICS[i].id;
      var r = evaluateEpicCompletion(id, ctx, progress, unlockedEpics);
      if (r) {
        results.push(r);
        unlockedEpics[r.epicId] = true;
      }
    }
    return results;
  }

  global.PathPulseProgression = {
    MILESTONE_LEVELS: MILESTONE_LEVELS,
    MILESTONE_META: MILESTONE_META,
    decayMomentum: decayMomentum,
    computeRestedBank: computeRestedBank,
    momentumMultiplier: momentumMultiplier,
    levelFromXp: levelFromXp,
    applyXpGain: applyXpGain,
    newMilestones: newMilestones,
    milestoneMeta: milestoneMeta,
    epicDefinitions: epicDefinitions,
    evaluateEpicCompletion: evaluateEpicCompletion,
    runAllEpicChecks: runAllEpicChecks,
    haversineKm: haversineKm,
    routeElevGainM: routeElevGainM,
    isLoopRoute: isLoopRoute,
    daysBetweenKeys: daysBetweenKeys,
    addCalendarDays: addCalendarDays,
    updateTwinProgress: updateTwinProgress,
    updateSingularityProgress: updateSingularityProgress,
  };
})(typeof window !== 'undefined' ? window : globalThis);
