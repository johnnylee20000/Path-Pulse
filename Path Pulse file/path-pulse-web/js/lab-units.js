/**
 * Height/weight unit conversions for Lab (SI storage). No DOM. Load before app.js.
 */
(function (global) {
  'use strict';

  var KG_PER_LB = 0.453592;
  var M_PER_FT = 0.3048;

  global.PathPulseLabUnits = {
    KG_PER_LB: KG_PER_LB,
    M_PER_FT: M_PER_FT,

    heightToM: function (val, unit) {
      if (unit === 'cm') return val / 100;
      if (unit === 'ft') return val * M_PER_FT;
      return val;
    },
    heightFromM: function (m, unit) {
      if (unit === 'cm') return m * 100;
      if (unit === 'ft') return m / M_PER_FT;
      return m;
    },
    weightToKg: function (val, unit) {
      if (unit === 'lbs') return val * KG_PER_LB;
      return val;
    },
    weightFromKg: function (kg, unit) {
      if (unit === 'lbs') return kg / KG_PER_LB;
      return kg;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
