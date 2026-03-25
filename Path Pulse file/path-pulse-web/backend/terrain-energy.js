/**
 * Path-Pulse terrain-aware expedition energy (Node).
 * Mirrors path-pulse-web/terrain-energy-core.js — keep in sync when tuning constants.
 */

'use strict';

const SURFACE = {
  pavement: 1.0,
  trail_grass: 1.2,
  sand: 2.1,
  snow: 1.45,
  gravel: 1.08,
};

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function surfaceMultiplier(surfaceKey) {
  const m = SURFACE[surfaceKey];
  return typeof m === 'number' ? m : SURFACE.pavement;
}

function smoothSeries1D(arr, radius) {
  if (!arr || !arr.length) return [];
  const w = Math.max(0, Math.floor(radius));
  if (w === 0) return arr.slice();
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let c = 0;
    for (let j = i - w; j <= i + w; j++) {
      if (j >= 0 && j < arr.length) {
        sum += arr[j];
        c++;
      }
    }
    out.push(sum / c);
  }
  return out;
}

function buildSmoothedAltsM(points) {
  const n = points.length;
  const v = [];
  for (let i = 0; i < n; i++) {
    const a = points[i].alt;
    v[i] = typeof a === 'number' && Number.isFinite(a) ? a : NaN;
  }
  if (!v.some((x) => !Number.isNaN(x))) return null;
  let last = NaN;
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(v[i])) last = v[i];
    else if (!Number.isNaN(last)) v[i] = last;
  }
  last = NaN;
  for (let i = n - 1; i >= 0; i--) {
    if (!Number.isNaN(v[i])) last = v[i];
    else if (!Number.isNaN(last)) v[i] = last;
  }
  if (v.some((x) => Number.isNaN(x))) return null;
  return smoothSeries1D(v, 1);
}

function positiveElevGainM(altsM, noiseM) {
  const noise = noiseM == null ? 2 : noiseM;
  let sum = 0;
  for (let i = 1; i < altsM.length; i++) {
    const d = altsM[i] - altsM[i - 1];
    if (d > noise) sum += d;
  }
  return Math.round(sum * 10) / 10;
}

function metWalkingFromGrade(gradePct) {
  const base = 3.28;
  const g = Math.max(-30, Math.min(30, gradePct));
  const up = g > 0 ? 0.048 * g + 0.00175 * g * g : 0;
  const dn = g < 0 ? Math.min(0.95, -0.028 * g) : 0;
  return Math.max(2.15, Math.min(13.5, base + up - dn));
}

function kcalFromMetHours(met, weightKg, hours) {
  if (weightKg <= 0 || hours <= 0 || met <= 0) return 0;
  return met * weightKg * hours;
}

/**
 * @param {Array<{lat:number,lng:number,alt?:number,t?:number}>} points
 * @param {number} weightKg
 * @param {string} surfaceKey
 * @param {number} [defaultSpeedKmh=5]
 */
function estimateRouteTerrainKcal(points, weightKg, surfaceKey, defaultSpeedKmh) {
  const surf = surfaceMultiplier(surfaceKey);
  const speed = defaultSpeedKmh > 0 ? defaultSpeedKmh : 5;
  const empty = {
    totalKcal: 0,
    elevGainM: 0,
    avgAbsGradePct: 0,
    segmentCount: 0,
    hasAltitudeData: false,
    usedFlatFallback: true,
  };
  if (!points || points.length < 2 || weightKg <= 0) return empty;

  const smAlts = buildSmoothedAltsM(points);
  const hasAlt = !!smAlts;
  let totalKcal = 0;
  let horizSumM = 0;
  let gradeAbsWeighted = 0;
  let segs = 0;

  if (!hasAlt) {
    let totalKm = 0;
    for (let i = 1; i < points.length; i++) totalKm += haversineKm(points[i - 1], points[i]);
    const hoursFlat = totalKm / speed;
    totalKcal = kcalFromMetHours(3.28, weightKg, hoursFlat) * surf;
    segs = Math.max(0, points.length - 1);
    return {
      totalKcal: Math.round(totalKcal),
      elevGainM: 0,
      avgAbsGradePct: 0,
      segmentCount: segs,
      hasAltitudeData: false,
      usedFlatFallback: true,
    };
  }

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const hKm = haversineKm(a, b);
    if (hKm < 1e-8) continue;
    const hM = hKm * 1000;
    const elevDelta = smAlts[i] - smAlts[i - 1];
    const grade = (elevDelta / hM) * 100;
    const met = metWalkingFromGrade(grade);
    let hours;
    if (typeof a.t === 'number' && typeof b.t === 'number' && b.t > a.t) {
      hours = (b.t - a.t) / (1000 * 60 * 60);
    } else {
      hours = hKm / speed;
    }
    if (hours <= 0 || !Number.isFinite(hours)) hours = hKm / speed;
    totalKcal += kcalFromMetHours(met, weightKg, hours) * surf;
    horizSumM += hM;
    gradeAbsWeighted += Math.abs(grade) * hM;
    segs++;
  }

  const elevGainM = positiveElevGainM(smAlts, 2);
  const avgAbsGradePct = horizSumM > 0 ? gradeAbsWeighted / horizSumM : 0;

  return {
    totalKcal: Math.round(totalKcal),
    elevGainM,
    avgAbsGradePct: Math.round(avgAbsGradePct * 10) / 10,
    segmentCount: segs,
    hasAltitudeData: true,
    usedFlatFallback: false,
  };
}

module.exports = {
  SURFACE,
  haversineKm,
  surfaceMultiplier,
  metWalkingFromGrade,
  estimateRouteTerrainKcal,
};
