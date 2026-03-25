/**
 * Path-Pulse — terrain-aware active energy (expedition / walking).
 *
 * Purpose: estimate kcal for a GPS route using horizontal distance, optional elevation,
 * and surface friction multipliers (parity with Flutter `LabEngine` terrain constants).
 *
 * Backend porting (Node/Python):
 * - Pure functions below; no DOM. Re-export `estimateRouteTerrainKcal` as your service
 *   `POST /routes/{id}/energy` body: { points[], weightKg, surfaceKey, defaultSpeedKmh }.
 * - For production precision, replace flat GPS altitude with a DEM pipeline
 *   (Mapbox Terrain-RGB, Open-Elevation, or your own PostGIS raster) and run the same
 *   segment loop on server-side smoothed profiles.
 *
 * Physiology / methods (summary — tune constants with your cohort):
 * - MET definition: active kcal ≈ MET × body_mass_kg × duration_hours (activity METs
 *   above rest; we use gross-walking MET band consistent with Compendium walking codes).
 * - Grade: metabolic cost rises faster than linear uphill (Minetti et al.-class behaviour);
 *   we use a compact polynomial on grade% with caps for stability.
 * - Surface: multiplicative factors on mechanical + metabolic work (sand >> pavement).
 *
 * Limitations: no wind, no backpack load (Pandolf), no run vs walk classifier — add speed
 * thresholds and running METs if you split gait.
 */
(function (global) {
  'use strict';

  var SURFACE = {
    pavement: 1.0,
    trail_grass: 1.2,
    sand: 2.1,
    snow: 1.45,
    gravel: 1.08,
  };

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lng - a.lng) * Math.PI / 180;
    var x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) *
        Math.cos(b.lat * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function surfaceMultiplier(surfaceKey) {
    var m = SURFACE[surfaceKey];
    return typeof m === 'number' ? m : SURFACE.pavement;
  }

  function smoothSeries1D(arr, radius) {
    if (!arr || !arr.length) return [];
    var w = Math.max(0, Math.floor(radius));
    if (w === 0) return arr.slice();
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var sum = 0;
      var c = 0;
      for (var j = i - w; j <= i + w; j++) {
        if (j >= 0 && j < arr.length) {
          sum += arr[j];
          c++;
        }
      }
      out.push(sum / c);
    }
    return out;
  }

  /**
   * Forward/backward fill sparse altitude, then light smoothing (reduces GPS vertical noise).
   */
  function buildSmoothedAltsM(points) {
    var n = points.length;
    var v = [];
    var i;
    for (i = 0; i < n; i++) {
      var a = points[i].alt;
      v[i] = typeof a === 'number' && isFinite(a) ? a : NaN;
    }
    if (!v.some(function (x) { return !isNaN(x); })) return null;
    var last = NaN;
    for (i = 0; i < n; i++) {
      if (!isNaN(v[i])) last = v[i];
      else if (!isNaN(last)) v[i] = last;
    }
    last = NaN;
    for (i = n - 1; i >= 0; i--) {
      if (!isNaN(v[i])) last = v[i];
      else if (!isNaN(last)) v[i] = last;
    }
    if (v.some(function (x) { return isNaN(x); })) return null;
    return smoothSeries1D(v, 1);
  }

  function positiveElevGainM(altsM, noiseM) {
    noiseM = noiseM == null ? 2 : noiseM;
    var sum = 0;
    for (var i = 1; i < altsM.length; i++) {
      var d = altsM[i] - altsM[i - 1];
      if (d > noiseM) sum += d;
    }
    return Math.round(sum * 10) / 10;
  }

  /**
   * Walking MET at ~5 km/h equivalent, adjusted for grade (% rise/run).
   */
  function metWalkingFromGrade(gradePct) {
    var base = 3.28;
    var g = Math.max(-30, Math.min(30, gradePct));
    var up = g > 0 ? 0.048 * g + 0.00175 * g * g : 0;
    var dn = g < 0 ? Math.min(0.95, -0.028 * g) : 0;
    return Math.max(2.15, Math.min(13.5, base + up - dn));
  }

  function kcalFromMetHours(met, weightKg, hours) {
    if (weightKg <= 0 || hours <= 0 || met <= 0) return 0;
    return met * weightKg * hours;
  }

  /**
   * @param {Array<{lat:number,lng:number,alt?:number,t?:number}>} points
   * @param {number} weightKg
   * @param {string} surfaceKey — keyof SURFACE
   * @param {number} [defaultSpeedKmh=5]
   * @returns {{ totalKcal:number, elevGainM:number, avgAbsGradePct:number, segmentCount:number, hasAltitudeData:boolean, usedFlatFallback:boolean }}
   */
  function estimateRouteTerrainKcal(points, weightKg, surfaceKey, defaultSpeedKmh) {
    var surf = surfaceMultiplier(surfaceKey);
    var speed = defaultSpeedKmh > 0 ? defaultSpeedKmh : 5;
    var empty = {
      totalKcal: 0,
      elevGainM: 0,
      avgAbsGradePct: 0,
      segmentCount: 0,
      hasAltitudeData: false,
      usedFlatFallback: true,
    };
    if (!points || points.length < 2 || weightKg <= 0) return empty;

    var smAlts = buildSmoothedAltsM(points);
    var hasAlt = !!smAlts;
    var totalKcal = 0;
    var horizSumM = 0;
    var gradeAbsWeighted = 0;
    var segs = 0;
    var i;

    if (!hasAlt) {
      var totalKm = 0;
      for (i = 1; i < points.length; i++) totalKm += haversineKm(points[i - 1], points[i]);
      var hoursFlat = totalKm / speed;
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

    for (i = 1; i < points.length; i++) {
      var a = points[i - 1];
      var b = points[i];
      var hKm = haversineKm(a, b);
      if (hKm < 1e-8) continue;
      var hM = hKm * 1000;
      var elevDelta = smAlts[i] - smAlts[i - 1];
      var grade = (elevDelta / hM) * 100;
      var met = metWalkingFromGrade(grade);
      var hours;
      if (typeof a.t === 'number' && typeof b.t === 'number' && b.t > a.t) {
        hours = (b.t - a.t) / (1000 * 60 * 60);
      } else {
        hours = hKm / speed;
      }
      if (hours <= 0 || !isFinite(hours)) hours = hKm / speed;
      totalKcal += kcalFromMetHours(met, weightKg, hours) * surf;
      horizSumM += hM;
      gradeAbsWeighted += Math.abs(grade) * hM;
      segs++;
    }

    var elevGainM = positiveElevGainM(smAlts, 2);
    var avgAbsGradePct = horizSumM > 0 ? gradeAbsWeighted / horizSumM : 0;

    return {
      totalKcal: Math.round(totalKcal),
      elevGainM: elevGainM,
      avgAbsGradePct: Math.round(avgAbsGradePct * 10) / 10,
      segmentCount: segs,
      hasAltitudeData: true,
      usedFlatFallback: false,
    };
  }

  global.PathPulseTerrainEnergy = {
    SURFACE: SURFACE,
    haversineKm: haversineKm,
    surfaceMultiplier: surfaceMultiplier,
    metWalkingFromGrade: metWalkingFromGrade,
    estimateRouteTerrainKcal: estimateRouteTerrainKcal,
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
