(function () {
  'use strict';

  const STORAGE_KEYS = {
    oath: 'pathpulse_oath',
    weight: 'pathpulse_weight',
    height: 'pathpulse_height',
    age: 'pathpulse_age',
    male: 'pathpulse_male',
    xp: 'pathpulse_xp',
    dailySteps: 'pathpulse_daily_steps',
    history: 'pathpulse_history',
    missionComplete: 'pathpulse_mission_week',
    calories: 'pathpulse_calories',
    weightHistory: 'pathpulse_weight_history',
    bmiAsian: 'pathpulse_bmi_asian',
    installDismissed: 'pathpulse_install_dismissed',
    expedition: 'pathpulse_expedition',
    heightUnit: 'pathpulse_height_unit',
    weightUnit: 'pathpulse_weight_unit',
    waist: 'pathpulse_waist',
    neck: 'pathpulse_neck',
    hip: 'pathpulse_hip',
    showFuelWidget: 'pathpulse_show_fuel_widget',
    showExpeditionWidget: 'pathpulse_show_expedition_widget',
    stepsByDate: 'pathpulse_steps_by_date',
    calorieGoal: 'pathpulse_calorie_goal',
    prismSeen: 'pathpulse_prism_seen',
    lastRoute: 'pathpulse_last_route',
    heartRateLog: 'pathpulse_heart_rate_log',
    bloodPressureLog: 'pathpulse_blood_pressure_log',
    exerciseTimeLog: 'pathpulse_exercise_time_log',
    targetWeight: 'pathpulse_target_weight',
    waterLog: 'pathpulse_water_log',
    goals: 'pathpulse_goals',
    sleepLog: 'pathpulse_sleep_log',
    onboardingDismissed: 'pathpulse_onboarding_dismissed',
    expeditionStartTime: 'pathpulse_expedition_start_time',
    reminderEnabled: 'pathpulse_reminder_enabled',
    reminderTime: 'pathpulse_reminder_time',
    reminderLastSent: 'pathpulse_reminder_last_sent',
    deviceId: 'pathpulse_device_id',
  };

  var MAX_SAVED_ROUTE_POINTS = 5000;
  var KG_PER_LB = 0.453592;
  var M_PER_FT = 0.3048;
  var KCAL_PER_KG_FAT = 7700; // ~7700 kcal deficit ≈ 1 kg fat loss

  const EXPEDITION_MISSION_KM = 2; // "Walk 2 km this week"

  const state = {
    oathAccepted: false,
    weight: 85,
    height: 1.8,
    age: 30,
    isMale: true,
    dailySteps: 0,
    xp: 0,
    isMissionActive: false,
    routePoints: [],
    currentPosition: null,
    watchId: null,
    lastRouteKm: 0,
    weekDistanceKm: 0,
    missionCompletedThisWeek: false,
    calorieIntake: 0,
    useAsianBmi: false,
    heightUnit: 'm',
    weightUnit: 'kg',
    waistCm: null,
    neckCm: null,
    hipCm: null,
    showFuelWidget: true,
    showExpeditionWidget: true,
    lastTodayKey: '',
    calorieGoal: 'maintain', // 'lose' | 'maintain' | 'gain'
    todayMeals: { breakfast: { kcal: 0, ts: '' }, lunch: { kcal: 0, ts: '' }, dinner: { kcal: 0, ts: '' } },
    targetWeightKg: null,
    expeditionStartTime: null,
    reminderEnabled: false,
    reminderTime: '18:00',
  };

  function heightToM(val, unit) {
    if (unit === 'cm') return val / 100;
    if (unit === 'ft') return val * M_PER_FT;
    return val;
  }
  function heightFromM(m, unit) {
    if (unit === 'cm') return m * 100;
    if (unit === 'ft') return m / M_PER_FT;
    return m;
  }
  function weightToKg(val, unit) {
    if (unit === 'lbs') return val * KG_PER_LB;
    return val;
  }
  function weightFromKg(kg, unit) {
    if (unit === 'lbs') return kg / KG_PER_LB;
    return kg;
  }

  let map = null;
  let userMarker = null;
  let routeLine = null;
  let mapInited = false;
  let lastRoutePoints = [];
  let replayMarker = null;
  let replayAnimationId = null;
  let replayDurationSec = 8;
  let replayLoop = false;
  let ghostRouteLine = null;
  let showGhostPath = false;
  var calendarYear = new Date().getFullYear();
  var calendarMonth = new Date().getMonth();

  // WHO standard: BMI = weight (kg) / height (m)². Units SI (kg, m).
  function bmi() {
    return state.weight / (state.height * state.height);
  }
  // WHO/ICD-10 adult BMI categories. Optional WHO Asian cut-offs (overweight ≥23, obese ≥27).
  function bmiCategory(bmiVal) {
    if (bmiVal == null) bmiVal = bmi();
    var under = 18.5;
    var normalMax = state.useAsianBmi ? 22.9 : 24.9;
    var overMax = state.useAsianBmi ? 26.9 : 29.9;
    var obese2Max = state.useAsianBmi ? 36.9 : 39.9;
    if (bmiVal < under) return { label: 'Underweight', class: 'bmi-under' };
    if (bmiVal <= normalMax) return { label: 'Normal', class: 'bmi-normal' };
    if (bmiVal <= overMax) return { label: 'Overweight', class: 'bmi-over' };
    if (bmiVal <= (state.useAsianBmi ? 31.9 : 34.9)) return { label: 'Obese I', class: 'bmi-obese' };
    if (bmiVal <= obese2Max) return { label: 'Obese II', class: 'bmi-obese' };
    return { label: 'Obese III', class: 'bmi-obese' };
  }
  // WHO healthy BMI range 18.5–24.9 kg/m² (global). Asian option: 18.5–22.9.
  function idealWeightRange() {
    var h = state.height;
    var maxBmi = state.useAsianBmi ? 22.9 : 24.9;
    return { min: 18.5 * h * h, max: maxBmi * h * h };
  }
  // Du Bois & Du Bois (1916) BSA, international standard: 0.007184 × W^0.425 × H^0.725 (kg, cm).
  function bsa() {
    return 0.007184 * Math.pow(state.weight, 0.425) * Math.pow(state.height * 100, 0.725);
  }
  // Trefethen (2013) alternative BMI; not WHO standard, shown for reference.
  function newBmi() {
    return 1.3 * state.weight / Math.pow(state.height, 2.5);
  }
  // Mifflin-St Jeor (1990) BMR, recommended by FAO/WHO/UNU for resting energy expenditure. Units: kcal/day.
  function bmr() {
    var w = state.weight;
    var hCm = state.height * 100;
    var base = 10 * w + 6.25 * hCm - 5 * state.age;
    return state.isMale ? base + 5 : base - 161;
  }
  // TDEE: BMR × PAL (WHO/FAO Physical Activity Level). PAL estimated from daily steps.
  function palFromSteps(steps) {
    if (steps < 5000) return 1.2;
    if (steps < 7500) return 1.375;
    if (steps < 12500) return 1.55;
    return 1.725;
  }
  function tdee() {
    return Math.round(bmr() * palFromSteps(state.dailySteps));
  }

  function dailyTargetCalories() {
    var t = tdee();
    if (state.calorieGoal === 'lose') return Math.max(1200, t - 500);
    if (state.calorieGoal === 'gain') return t + 300;
    return t;
  }

  function calorieGoalLabel() {
    if (state.calorieGoal === 'lose') return 'lose';
    if (state.calorieGoal === 'gain') return 'gain';
    return 'maintain';
  }

  // Body composition. Navy method when waist/neck (and hip for women) available; else Deurenberg.
  function bodyFatPct() {
    var hCm = state.height * 100;
    var w = state.waistCm;
    var n = state.neckCm;
    var hi = state.hipCm;
    if (state.isMale && w != null && n != null && w > n && hCm > 0) {
      var log10 = Math.log10;
      var bf = 495 / (1.0324 - 0.19077 * log10(w - n) + 0.15456 * log10(hCm)) - 450;
      return Math.max(3, Math.min(50, bf));
    }
    if (!state.isMale && w != null && n != null && hi != null && (w + hi - n) > 0 && hCm > 0) {
      var bf = 495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.22100 * Math.log10(hCm)) - 450;
      return Math.max(3, Math.min(50, bf));
    }
    var bmiVal = bmi();
    var sex = state.isMale ? 1 : 0;
    var bf = (1.20 * bmiVal) + (0.23 * state.age) - (10.8 * sex) - 5.4;
    return Math.max(3, Math.min(50, bf));
  }
  function bodyFatSource() {
    if (state.isMale && state.waistCm != null && state.neckCm != null) return 'Navy';
    if (!state.isMale && state.waistCm != null && state.neckCm != null && state.hipCm != null) return 'Navy';
    return 'Deurenberg';
  }
  function fatMassKg() { return state.weight * (bodyFatPct() / 100); }
  function leanMassKg() { return state.weight - fatMassKg(); }
  function bodyWaterPct() {
    var h = state.height * 100;
    var w = state.weight;
    var tbw = state.isMale
      ? 2.447 - (0.09156 * state.age) + (0.1074 * h) + (0.3362 * w)
      : -2.097 + (0.1069 * h) + (0.2466 * w);
    return Math.max(40, Math.min(65, (tbw / w) * 100));
  }
  function skeletalMuscleKg() {
    var ffm = leanMassKg();
    return state.isMale ? ffm * 0.45 : ffm * 0.35;
  }
  function boneMassKg() {
    return Math.max(1.5, Math.min(8, leanMassKg() * 0.15));
  }
  function visceralFatLevel() {
    var w = state.waistCm;
    if (w != null) {
      var v = state.isMale ? 10 + (w - 80) * 0.4 + state.age * 0.05 : 10 + (w - 70) * 0.4 + state.age * 0.05;
      return Math.max(1, Math.min(59, Math.round(v)));
    }
    var v = 10 + (bmi() - 22) * 1.5 + state.age * 0.08;
    return Math.max(1, Math.min(59, Math.round(v)));
  }
  function visceralSource() { return state.waistCm != null ? 'waist' : 'BMI/age'; }
  function level() {
    return Math.floor(0.1 * Math.sqrt(Math.max(0, state.xp)) + 1);
  }
  function rank() {
    const l = level();
    if (l < 10) return 'RECRUIT';
    if (l < 25) return 'SCOUT';
    if (l < 50) return 'VANGUARD';
    if (l < 75) return 'BIO-COMMANDER';
    return 'APEX PATHFINDER';
  }
  function explorerId() {
    return 'PATHFINDER_' + (100 + (state.xp % 900)) + 'X';
  }
  function burn() {
    const base = state.dailySteps * 0.04 * 1.2;
    return Math.round(base);
  }
  // Burn so far today: BMR prorated by time of day + active burn (steps/workout). Used for energy gauge.
  function burnSoFarToday() {
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var hoursElapsed = (now - midnight) / (1000 * 60 * 60);
    var bmrPerHour = bmr() / 24;
    return Math.round(bmrPerHour * hoursElapsed + burn());
  }
  function protocol() {
    return state.dailySteps > 10000 ? 'High-Carb Recovery' : 'Baseline Protein';
  }

  function haversineKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function routeDistanceKm() {
    if (state.routePoints.length < 2) return 0;
    let km = 0;
    for (let i = 1; i < state.routePoints.length; i++) {
      km += haversineKm(state.routePoints[i - 1], state.routePoints[i]);
    }
    return Math.round(km * 100) / 100;
  }

  function stepsFromDistanceKm(km) {
    return Math.round(km * 1300);
  }

  function getTodayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getStepsByDate() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.stepsByDate);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return typeof obj === 'object' && obj !== null ? obj : {};
    } catch (e) { return {}; }
  }

  function setStepsForDate(key, steps) {
    try {
      var obj = getStepsByDate();
      obj[key] = steps;
      localStorage.setItem(STORAGE_KEYS.stepsByDate, JSON.stringify(obj));
    } catch (e) {}
    scheduleSync();
  }

  function getCaloriesData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.calories);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return typeof obj === 'object' && obj !== null ? obj : {};
    } catch (e) { return {}; }
  }

  function getMealsForDate(key) {
    var cal = getCaloriesData();
    var day = cal[key];
    if (day == null) return { breakfast: { kcal: 0, ts: '' }, lunch: { kcal: 0, ts: '' }, dinner: { kcal: 0, ts: '' } };
    if (typeof day === 'number') return { breakfast: { kcal: 0, ts: '' }, lunch: { kcal: 0, ts: '' }, dinner: { kcal: 0, ts: '' } };
    return {
      breakfast: day.breakfast || day.b || { kcal: 0, ts: '' },
      lunch: day.lunch || day.l || { kcal: 0, ts: '' },
      dinner: day.dinner || day.d || { kcal: 0, ts: '' },
    };
  }

  function saveMealsForDate(key, meals) {
    try {
      var cal = getCaloriesData();
      var total = totalKcalFromMeals(meals);
      cal[key] = { b: meals.breakfast, l: meals.lunch, d: meals.dinner, total: total };
      localStorage.setItem(STORAGE_KEYS.calories, JSON.stringify(cal));
    } catch (e) {}
  }

  function totalKcalFromMeals(meals) {
    return (meals.breakfast && meals.breakfast.kcal ? meals.breakfast.kcal : 0) +
      (meals.lunch && meals.lunch.kcal ? meals.lunch.kcal : 0) +
      (meals.dinner && meals.dinner.kcal ? meals.dinner.kcal : 0);
  }

  function refreshTodayData() {
    var today = getTodayKey();
    if (state.lastTodayKey === today) return false;
    state.lastTodayKey = today;
    var stepsObj = getStepsByDate();
    state.dailySteps = typeof stepsObj[today] === 'number' ? stepsObj[today] : 0;
    state.todayMeals = getMealsForDate(today);
    state.calorieIntake = totalKcalFromMeals(state.todayMeals);
    return true;
  }

  function nowTimeString() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.getFullYear() + '-' + String(mon.getMonth() + 1).padStart(2, '0') + '-' + String(mon.getDate()).padStart(2, '0');
  }

  function getWeeklyCalories() {
    var weekStart = getWeekStart();
    var today = getTodayKey();
    var cal = getCaloriesData();
    var total = 0;
    var daysWithData = 0;
    var d = new Date(weekStart);
    var end = new Date(today);
    while (d <= end) {
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var dayCal = cal[key];
      var kcal = 0;
      if (dayCal != null) {
        if (typeof dayCal.total === 'number') kcal = dayCal.total;
        else if (typeof dayCal === 'number') kcal = dayCal;
        else kcal = totalKcalFromMeals(getMealsForDate(key));
      }
      if (kcal > 0) { total += kcal; daysWithData++; }
      d.setDate(d.getDate() + 1);
    }
    return { total: total, daysWithData: daysWithData };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    } catch (e) {}
  }

  function logToday(distanceKm) {
    const key = getTodayKey();
    const hist = loadHistory();
    var found = hist.find(function (e) { return e.date === key; });
    if (found) {
      found.distanceKm = (found.distanceKm || 0) + distanceKm;
      found.steps = state.dailySteps;
    } else {
      hist.push({ date: key, distanceKm: distanceKm, steps: state.dailySteps });
    }
    saveHistory(hist);
  }

  function getWeekStats() {
    const weekStart = getWeekStart();
    const hist = loadHistory();
    var totalKm = 0;
    hist.forEach(function (e) {
      if (e.date >= weekStart) totalKm += e.distanceKm || 0;
    });
    return { totalKm: totalKm, todaySteps: state.dailySteps };
  }

  function getJsonStorage(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (defaultValue != null ? defaultValue : {});
    } catch (e) { return defaultValue != null ? defaultValue : {}; }
  }
  function setJsonStorage(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
    scheduleSync();
  }

  function getApiBase() {
    try { return (window.PATH_PULSE_API || '').replace(/\/$/, ''); } catch (e) { return ''; }
  }
  function getDeviceId() {
    try {
      var id = localStorage.getItem(STORAGE_KEYS.deviceId);
      if (id) return id;
      id = 'pp-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.deviceId, id);
      return id;
    } catch (e) { return 'pp-unknown'; }
  }
  function exportPathpulseStorage() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('pathpulse_') === 0 && k !== STORAGE_KEYS.deviceId)
          out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }
  function applyPathpulseStorage(obj) {
    if (!obj || typeof obj !== 'object') return;
    try {
      Object.keys(obj).forEach(function (k) {
        if (k && k.indexOf('pathpulse_') === 0)
          localStorage.setItem(k, String(obj[k]));
      });
    } catch (e) {}
  }
  var syncTimeoutId = null;
  function scheduleSync() {
    var api = getApiBase();
    if (!api) return;
    if (syncTimeoutId) clearTimeout(syncTimeoutId);
    syncTimeoutId = setTimeout(function () {
      syncTimeoutId = null;
      syncToServer();
    }, 2000);
  }
  function syncToServer() {
    var api = getApiBase();
    if (!api) return;
    var deviceId = getDeviceId();
    var payload = exportPathpulseStorage();
    fetch(api + '/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId, data: payload }),
    }).catch(function () {});
  }
  function syncFromServer(cb) {
    var api = getApiBase();
    if (!api) { if (cb) cb(); return; }
    var deviceId = getDeviceId();
    fetch(api + '/api/sync?deviceId=' + encodeURIComponent(deviceId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        applyPathpulseStorage(data);
        if (cb) cb();
      })
      .catch(function () { if (cb) cb(); });
  }
  function registerPushWithBackend(subscription, reminderTime) {
    var api = getApiBase();
    if (!api) return;
    fetch(api + '/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        subscription: { endpoint: subscription.endpoint, keys: subscription.keys, expirationTime: subscription.expirationTime },
        reminderTime: reminderTime || state.reminderTime || '09:00',
      }),
    }).catch(function () {});
  }
  function subscribePushAndRegister() {
    var api = getApiBase();
    if (!api || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    fetch(api + '/api/vapid-public')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var key = data && data.publicKey;
        if (!key) return;
        function base64UrlToUint8Array(base64) {
          var padding = '='.repeat((4 - base64.length % 4) % 4);
          var b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
          var raw = atob(b64);
          var arr = new Uint8Array(raw.length);
          for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          return arr;
        }
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(key),
          });
        }).then(function (sub) {
          registerPushWithBackend(sub, state.reminderTime);
        });
      })
      .catch(function () {});
  }

  function getHeartRateLog() {
    var o = getJsonStorage(STORAGE_KEYS.heartRateLog, []);
    return Array.isArray(o) ? o : [];
  }
  function addHeartRateEntry(bpm) {
    var log = getHeartRateLog();
    log.push({ dateKey: getTodayKey(), bpm: bpm, ts: nowTimeString() });
    if (log.length > 100) log = log.slice(-100);
    setJsonStorage(STORAGE_KEYS.heartRateLog, log);
  }
  function getBloodPressureLog() {
    var o = getJsonStorage(STORAGE_KEYS.bloodPressureLog, []);
    return Array.isArray(o) ? o : [];
  }
  function addBloodPressureEntry(systolic, diastolic) {
    var log = getBloodPressureLog();
    log.push({ dateKey: getTodayKey(), sys: systolic, dia: diastolic, ts: nowTimeString() });
    if (log.length > 100) log = log.slice(-100);
    setJsonStorage(STORAGE_KEYS.bloodPressureLog, log);
  }
  function getExerciseTimeLog() {
    return getJsonStorage(STORAGE_KEYS.exerciseTimeLog, {});
  }
  function addExerciseEntry(minutes) {
    var key = getTodayKey();
    var log = getExerciseTimeLog();
    log[key] = (log[key] || 0) + minutes;
    setJsonStorage(STORAGE_KEYS.exerciseTimeLog, log);
  }
  function getWaterLog() {
    return getJsonStorage(STORAGE_KEYS.waterLog, {});
  }
  function addWaterToday(ml) {
    var key = getTodayKey();
    var log = getWaterLog();
    log[key] = (log[key] || 0) + ml;
    setJsonStorage(STORAGE_KEYS.waterLog, log);
  }
  function getTargetWeightKg() {
    if (state.targetWeightKg != null) return state.targetWeightKg;
    try {
      var v = localStorage.getItem(STORAGE_KEYS.targetWeight);
      if (v != null) { var n = parseFloat(v); state.targetWeightKg = n; return n; }
    } catch (e) {}
    return null;
  }
  function setTargetWeightKg(kg) {
    state.targetWeightKg = kg;
    try {
      if (kg != null) localStorage.setItem(STORAGE_KEYS.targetWeight, String(kg));
      else localStorage.removeItem(STORAGE_KEYS.targetWeight);
    } catch (e) {}
  }

  var DEFAULT_GOALS = { steps: 10000, waterMl: 2000, exerciseWeeklyMins: 150 };
  function getGoals() {
    var o = getJsonStorage(STORAGE_KEYS.goals, DEFAULT_GOALS);
    return {
      steps: typeof o.steps === 'number' ? o.steps : DEFAULT_GOALS.steps,
      waterMl: typeof o.waterMl === 'number' ? o.waterMl : DEFAULT_GOALS.waterMl,
      exerciseWeeklyMins: typeof o.exerciseWeeklyMins === 'number' ? o.exerciseWeeklyMins : DEFAULT_GOALS.exerciseWeeklyMins,
    };
  }
  function setGoals(goals) {
    setJsonStorage(STORAGE_KEYS.goals, goals);
  }

  function getSleepLog() {
    return getJsonStorage(STORAGE_KEYS.sleepLog, {});
  }
  function getYesterdayKey() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addSleepEntry(dateKey, hours, quality) {
    var log = getSleepLog();
    log[dateKey] = { hours: hours, quality: quality || 'Fair' };
    setJsonStorage(STORAGE_KEYS.sleepLog, log);
  }
  function getSleepForDate(dateKey) {
    var log = getSleepLog();
    return log[dateKey] || null;
  }

  function getWeeklySummary() {
    var rWeek = getDateRangeForPeriod('week');
    var steps = sumStepsInRange(rWeek.start, rWeek.end);
    var burn = sumBurnInRange(rWeek.start, rWeek.end);
    var dist = sumDistanceInRange(rWeek.start, rWeek.end);
    var ex = sumExerciseInRange(rWeek.start, rWeek.end);
    var lastWeekStart = (function () {
      var d = new Date(rWeek.start);
      d.setDate(d.getDate() - 7);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    var lastWeekEnd = (function () {
      var d = new Date(rWeek.end);
      d.setDate(d.getDate() - 7);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    var lastSteps = sumStepsInRange(lastWeekStart, lastWeekEnd);
    var lastDist = sumDistanceInRange(lastWeekStart, lastWeekEnd);
    var insight = '';
    if (steps > lastSteps && lastSteps > 0) insight = 'Steps up from last week — keep it up.';
    else if (dist > lastDist && lastDist > 0) insight = 'You walked more this week than last.';
    else if (steps >= getGoals().steps * 5) insight = 'Strong step count this week.';
    else if (dist >= EXPEDITION_MISSION_KM) insight = 'Mission distance achieved this week.';
    else insight = 'Log expeditions and steps to see insights.';
    return { steps, burn, dist, ex, insight };
  }

  function getNudgeMessage() {
    var today = getTodayKey();
    var meals = state.todayMeals;
    var intake = state.calorieIntake || 0;
    var water = (getWaterLog()[today] || 0);
    var goals = getGoals();
    if (intake === 0 && (!meals.breakfast || !meals.breakfast.kcal) && (!meals.lunch || !meals.lunch.kcal) && (!meals.dinner || !meals.dinner.kcal)) return 'Log your meals on Home to track energy.';
    if (water < goals.waterMl * 0.5 && water > 0) return 'Halfway to your water goal — add more in Report.';
    if (water === 0) return 'Track your water intake in Report.';
    if (state.dailySteps < goals.steps * 0.3 && state.dailySteps > 0) return 'Time for a walk? Start an expedition on the Map.';
    if (state.dailySteps === 0) return 'Start an expedition to log distance and steps.';
    return null;
  }

  // Local (client-side) reminder notifications.
  // Note: Without a backend + Web Push, notifications only fire while the app is open.
  var reminderIntervalId = null;

  function parseReminderTimeParts(t) {
    if (!t) return null;
    var parts = String(t).split(':');
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return { h: h, m: m };
  }

  function getReminderSentKey() {
    try { return getTodayKey() + '|' + String(state.reminderTime || ''); } catch (e) { return ''; }
  }

  function getReminderStatusText() {
    if (!('Notification' in window)) return 'Not supported';
    if (Notification.permission === 'denied') return 'Blocked';
    if (Notification.permission === 'granted') return state.reminderEnabled ? 'Enabled' : 'Ready';
    return state.reminderEnabled ? 'Permission needed' : 'Off';
  }

  function updateReminderUI() {
    var statusEl = document.getElementById('reminder-status');
    if (statusEl) statusEl.textContent = getReminderStatusText();
    var timeEl = document.getElementById('reminder-time-input');
    if (timeEl) timeEl.value = state.reminderTime || '18:00';
  }

  function showReminderNotification(body) {
    var title = 'Path Pulse Reminder';
    var msg = body || 'Open Path Pulse and check your Report.';
    var icon = 'icon-512.png';
    var tag = 'pathpulse-reminder';
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg && typeof reg.showNotification === 'function') {
            reg.showNotification(title, { body: msg, icon: icon, tag: tag });
          } else {
            new Notification(title, { body: msg, icon: icon, tag: tag });
          }
        }).catch(function () {
          new Notification(title, { body: msg, icon: icon, tag: tag });
        });
      } else {
        new Notification(title, { body: msg, icon: icon, tag: tag });
      }
    } catch (e) {}
  }

  function maybeSendReminder() {
    if (!state.reminderEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    var parts = parseReminderTimeParts(state.reminderTime);
    if (!parts) return;

    var now = new Date();
    var target = new Date();
    target.setHours(parts.h, parts.m, 0, 0);
    if (now < target) return;

    var sentKey = getReminderSentKey();
    if (!sentKey) return;

    var lastSent = '';
    try { lastSent = localStorage.getItem(STORAGE_KEYS.reminderLastSent) || ''; } catch (e) {}
    if (lastSent === sentKey) return;

    var body = getNudgeMessage() || 'Keep moving. Log steps, water, and meals in Path Pulse.';
    showReminderNotification(body);
    try { localStorage.setItem(STORAGE_KEYS.reminderLastSent, sentKey); } catch (e) {}
    updateReminderUI();
  }

  function startReminderLoop() {
    if (reminderIntervalId) clearInterval(reminderIntervalId);
    reminderIntervalId = setInterval(function () { maybeSendReminder(); }, 60000);
    maybeSendReminder();
  }

  function stopReminderLoop() {
    if (reminderIntervalId) clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }

  function isOnboardingDismissed() {
    try { return localStorage.getItem(STORAGE_KEYS.onboardingDismissed) === '1'; } catch (e) { return false; }
  }
  function setOnboardingDismissed() {
    try { localStorage.setItem(STORAGE_KEYS.onboardingDismissed, '1'); } catch (e) {}
  }

  function getDateRangeForPeriod(period) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var weekStart = getWeekStart();
    if (period === 'week') return { start: weekStart, end: getTodayKey() };
    if (period === 'month') {
      var mStart = year + '-' + String(month + 1).padStart(2, '0') + '-01';
      var lastDay = new Date(year, month + 1, 0).getDate();
      var mEnd = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
      return { start: mStart, end: mEnd };
    }
    if (period === 'year') {
      return { start: year + '-01-01', end: year + '-12-31' };
    }
    return { start: getTodayKey(), end: getTodayKey() };
  }
  function sumStepsInRange(startKey, endKey) {
    var stepsObj = getStepsByDate();
    var total = 0;
    var d = new Date(startKey);
    var end = new Date(endKey);
    while (d <= end) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (k === getTodayKey()) total += state.dailySteps;
      else total += typeof stepsObj[k] === 'number' ? stepsObj[k] : 0;
      d.setDate(d.getDate() + 1);
    }
    return total;
  }
  function sumDistanceInRange(startKey, endKey) {
    var hist = loadHistory();
    var total = 0;
    hist.forEach(function (e) {
      if (e.date >= startKey && e.date <= endKey) total += e.distanceKm || 0;
    });
    return total;
  }
  function sumExerciseInRange(startKey, endKey) {
    var log = getExerciseTimeLog();
    var total = 0;
    Object.keys(log).forEach(function (k) {
      if (k >= startKey && k <= endKey) total += log[k] || 0;
    });
    return total;
  }
  function estimatedBurnForDay(dateKey) {
    var data = getDayData(dateKey);
    var steps = dateKey === getTodayKey() ? state.dailySteps : (data.steps || 0);
    var bmrVal = bmr();
    var activeBurn = Math.round(steps * 0.04 * 1.2);
    return Math.round(bmrVal + activeBurn);
  }
  function sumBurnInRange(startKey, endKey) {
    var total = 0;
    var d = new Date(startKey);
    var end = new Date(endKey);
    while (d <= end) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      total += estimatedBurnForDay(k);
      d.setDate(d.getDate() + 1);
    }
    return total;
  }

  function getDayData(dateKey) {
    var stepsObj = getStepsByDate();
    var cal = getCaloriesData();
    var hist = loadHistory();
    var weightHist = getWeightHistory();
    var steps = typeof stepsObj[dateKey] === 'number' ? stepsObj[dateKey] : 0;
    var dayCal = cal[dateKey];
    var calories = 0;
    if (dayCal != null) {
      if (typeof dayCal.total === 'number') calories = dayCal.total;
      else if (typeof dayCal === 'number') calories = dayCal;
      else calories = totalKcalFromMeals(getMealsForDate(dateKey));
    }
    var entry = hist.find(function (e) { return e.date === dateKey; });
    var distanceKm = entry && entry.distanceKm != null ? entry.distanceKm : 0;
    var weightEntry = weightHist.find(function (e) { return e.date === dateKey; });
    var weight = weightEntry ? weightEntry.weight : null;
    return { steps: steps, calories: calories, distanceKm: distanceKm, weight: weight };
  }

  var ACTIVITY_STEPS_REF = 10000;
  var ACTIVITY_KM_STEPS = 1200;

  function physicalActivityPercent(data) {
    var km = data.distanceKm || 0;
    var equiv = data.steps + km * ACTIVITY_KM_STEPS;
    return Math.min(100, Math.round((equiv / ACTIVITY_STEPS_REF) * 100));
  }

  function isActiveMovementDay(data) {
    return data.steps >= 5000 || (data.distanceKm || 0) >= 0.5;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renderProgressCalendar() {
    var labelEl = document.getElementById('calendar-month-label');
    var gridEl = document.getElementById('calendar-grid');
    var barsEl = document.getElementById('calendar-activity-bars');
    var summaryEl = document.getElementById('activity-chart-summary');
    var weekdaysEl = document.getElementById('calendar-weekdays');
    if (!labelEl || !gridEl) return;
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    labelEl.textContent = monthNames[calendarMonth] + ' ' + calendarYear;
    if (weekdaysEl) {
      weekdaysEl.innerHTML = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) {
        return '<span class="calendar-wd">' + d + '</span>';
      }).join('');
    }
    var first = new Date(calendarYear, calendarMonth, 1);
    var last = new Date(calendarYear, calendarMonth + 1, 0);
    var startDay = first.getDay();
    var daysInMonth = last.getDate();
    var now = new Date();
    var isCurrentMonth = calendarYear === now.getFullYear() && calendarMonth === now.getMonth();
    var isFutureMonth = calendarYear > now.getFullYear() || (calendarYear === now.getFullYear() && calendarMonth > now.getMonth());
    var lastEvalDay = isFutureMonth ? 0 : (isCurrentMonth ? now.getDate() : daysInMonth);
    var cells = [];
    var barCells = [];
    var activeCount = 0;
    var evalDays = 0;
    var dayActiveFlags = [];
    var i;
    for (i = 0; i < startDay; i++) {
      cells.push('<div class="calendar-cell calendar-cell-empty"></div>');
      barCells.push('<div class="activity-bar-cell activity-bar-empty" aria-hidden="true"></div>');
    }
    for (i = 1; i <= daysInMonth; i++) {
      var d = new Date(calendarYear, calendarMonth, i);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var data = getDayData(key);
      if (key === getTodayKey() && typeof state.dailySteps === 'number' && state.dailySteps > (data.steps || 0)) {
        data = { steps: state.dailySteps, calories: data.calories, distanceKm: data.distanceKm, weight: data.weight };
      }
      var parts = [];
      if (data.steps > 0) parts.push((data.steps >= 1000 ? (data.steps / 1000).toFixed(1) + 'k' : data.steps) + ' st');
      if (data.distanceKm > 0) parts.push(data.distanceKm.toFixed(1) + ' km');
      if (data.calories > 0) parts.push(data.calories + ' kcal');
      if (data.weight != null) parts.push((state.weightUnit === 'lbs' ? weightFromKg(data.weight, 'lbs').toFixed(1) : data.weight.toFixed(1)) + (state.weightUnit === 'lbs' ? ' lb' : ' kg'));
      var summary = parts.length ? parts.join(' · ') : '—';
      var isToday = key === getTodayKey();
      cells.push(
        '<div class="calendar-cell' + (isToday ? ' calendar-cell-today' : '') + '" role="gridcell" data-date="' + key + '" title="' + escapeAttr(key + ': ' + summary) + '">' +
          '<span class="calendar-day-num">' + i + '</span>' +
          '<span class="calendar-day-data">' + (parts.length ? summary : '—') + '</span>' +
        '</div>'
      );

      var pct = physicalActivityPercent(data);
      var isFutureDay = isCurrentMonth && i > now.getDate();
      var active = isActiveMovementDay(data);
      if (i <= lastEvalDay && lastEvalDay > 0) {
        evalDays++;
        dayActiveFlags.push(active);
        if (active) activeCount++;
      }
      var tier = '';
      if (data.steps > 0 || data.distanceKm > 0) {
        if (pct >= 60 || active) tier = 'is-active';
        else if (pct >= 25) tier = 'is-moderate';
        else tier = 'is-low';
      }
      var barTitle = key + ': ' + data.steps + ' steps' + (data.distanceKm > 0 ? ', ' + data.distanceKm.toFixed(2) + ' km' : '') + (isFutureDay ? '' : ' (~' + pct + '% vs ref)');
      var barClass = 'activity-bar-cell' + (isToday ? ' is-today' : '') + (isFutureDay ? ' activity-bar-future' : '');
      if (tier) barClass += ' ' + tier;
      var barH = isFutureDay ? 0 : (data.steps > 0 || data.distanceKm > 0 ? Math.max(pct, 6) : 4);
      barCells.push(
        '<div class="' + barClass + '" title="' + escapeAttr(barTitle) + '">' +
          '<div class="activity-bar-fill-wrap"><div class="activity-bar-fill" style="height:' + barH + '%"></div></div>' +
          '<span class="activity-bar-day">' + i + '</span></div>'
      );
    }
    gridEl.innerHTML = cells.join('');
    if (barsEl) barsEl.innerHTML = barCells.join('');

    if (summaryEl && lastEvalDay > 0) {
      var consistency = evalDays ? Math.round((activeCount / evalDays) * 100) : 0;
      var streak = 0;
      var j;
      for (j = dayActiveFlags.length - 1; j >= 0; j--) {
        if (dayActiveFlags[j]) streak++;
        else break;
      }
      var best = 0;
      var run = 0;
      for (j = 0; j < dayActiveFlags.length; j++) {
        if (dayActiveFlags[j]) { run++; best = Math.max(best, run); } else run = 0;
      }
      summaryEl.innerHTML =
        '<span class="stat-highlight">' + activeCount + '</span> / ' + evalDays + ' days active · Consistency <span class="stat-highlight">' + consistency + '%</span> · Current streak <span class="stat-highlight">' + streak + '</span> · Best streak <span class="stat-highlight">' + best + '</span>';
    } else if (summaryEl) {
      summaryEl.textContent = isFutureMonth ? 'No data for future months.' : 'Log steps and walks to see your consistency.';
    }
  }

  function loadStorage() {
    try {
      state.oathAccepted = localStorage.getItem(STORAGE_KEYS.oath) === '1';
      const w = localStorage.getItem(STORAGE_KEYS.weight);
      if (w != null) state.weight = parseFloat(w);
      const h = localStorage.getItem(STORAGE_KEYS.height);
      if (h != null) state.height = parseFloat(h);
      const a = localStorage.getItem(STORAGE_KEYS.age);
      if (a != null) state.age = parseInt(a, 10);
      const m = localStorage.getItem(STORAGE_KEYS.male);
      if (m != null) state.isMale = m === '1';
      const x = localStorage.getItem(STORAGE_KEYS.xp);
      if (x != null) state.xp = parseInt(x, 10);
      var today = getTodayKey();
      state.lastTodayKey = today;
      var stepsObj = getStepsByDate();
      if (Object.keys(stepsObj).length > 0) {
        state.dailySteps = typeof stepsObj[today] === 'number' ? stepsObj[today] : 0;
      } else {
        var legacySteps = localStorage.getItem(STORAGE_KEYS.dailySteps);
        if (legacySteps != null) {
          state.dailySteps = parseInt(legacySteps, 10);
          setStepsForDate(today, state.dailySteps);
        }
      }
      const week = getWeekStart();
      state.missionCompletedThisWeek = localStorage.getItem(STORAGE_KEYS.missionComplete) === week;
      var weekStats = getWeekStats();
      state.weekDistanceKm = weekStats.totalKm;
      if (!state.missionCompletedThisWeek && state.weekDistanceKm >= EXPEDITION_MISSION_KM) {
        state.missionCompletedThisWeek = true;
        try { localStorage.setItem(STORAGE_KEYS.missionComplete, week); } catch (e) {}
      }
      var cal = getCaloriesData();
      if (cal[today] != null) {
        if (typeof cal[today] === 'number') {
          state.calorieIntake = parseInt(cal[today], 10) || 0;
          state.todayMeals = { breakfast: { kcal: 0, ts: '' }, lunch: { kcal: 0, ts: '' }, dinner: { kcal: 0, ts: '' } };
        } else {
          state.todayMeals = getMealsForDate(today);
          state.calorieIntake = totalKcalFromMeals(state.todayMeals);
        }
      }
      var goal = localStorage.getItem(STORAGE_KEYS.calorieGoal);
      if (goal === 'lose' || goal === 'maintain' || goal === 'gain') state.calorieGoal = goal;
      var asian = localStorage.getItem(STORAGE_KEYS.bmiAsian);
      if (asian != null) state.useAsianBmi = asian === '1';
      var hu = localStorage.getItem(STORAGE_KEYS.heightUnit);
      if (hu === 'cm' || hu === 'ft') state.heightUnit = hu;
      var wu = localStorage.getItem(STORAGE_KEYS.weightUnit);
      if (wu === 'lbs') state.weightUnit = wu;
      getTargetWeightKg();
      var waistVal = localStorage.getItem(STORAGE_KEYS.waist);
      if (waistVal != null && waistVal !== '') { var v = parseFloat(waistVal); if (!isNaN(v) && v > 0) state.waistCm = v; }
      var neckVal = localStorage.getItem(STORAGE_KEYS.neck);
      if (neckVal != null && neckVal !== '') { var v = parseFloat(neckVal); if (!isNaN(v) && v > 0) state.neckCm = v; }
      var hipVal = localStorage.getItem(STORAGE_KEYS.hip);
      if (hipVal != null && hipVal !== '') { var v = parseFloat(hipVal); if (!isNaN(v) && v > 0) state.hipCm = v; }
      var showFuel = localStorage.getItem(STORAGE_KEYS.showFuelWidget);
      if (showFuel === '0') state.showFuelWidget = false;
      var showExp = localStorage.getItem(STORAGE_KEYS.showExpeditionWidget);
      if (showExp === '0') state.showExpeditionWidget = false;
      var re = localStorage.getItem(STORAGE_KEYS.reminderEnabled);
      if (re === '1') state.reminderEnabled = true;
      var rt = localStorage.getItem(STORAGE_KEYS.reminderTime);
      if (rt) state.reminderTime = rt;
    } catch (e) {}
  }

  function saveMeal(mealType, kcal, ts) {
    state.todayMeals[mealType] = { kcal: kcal, ts: ts || nowTimeString() };
    state.calorieIntake = totalKcalFromMeals(state.todayMeals);
    saveMealsForDate(getTodayKey(), state.todayMeals);
  }

  function saveOath() {
    try {
      localStorage.setItem(STORAGE_KEYS.oath, state.oathAccepted ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.xp, String(state.xp));
      setStepsForDate(getTodayKey(), state.dailySteps);
    } catch (e) {}
  }

  function getWeightHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.weightHistory);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveWeightToHistory() {
    try {
      var arr = getWeightHistory();
      var today = getTodayKey();
      var found = arr.findIndex(function (e) { return e.date === today; });
      var entry = { date: today, weight: state.weight };
      if (found >= 0) arr[found] = entry;
      else arr.push(entry);
      arr.sort(function (a, b) { return b.date.localeCompare(a.date); });
      arr = arr.slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.weightHistory, JSON.stringify(arr));
    } catch (e) {}
  }

  function getLast7WeightEntries() {
    var arr = getWeightHistory();
    return arr.slice(0, 7);
  }

  function getWeightTrendText() {
    var entries = getLast7WeightEntries();
    if (entries.length < 2) return null;
    var first = entries[entries.length - 1].weight;
    var last = entries[0].weight;
    var diff = last - first;
    if (Math.abs(diff) < 0.1) return '— stable';
    return (diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg over ' + entries.length + ' entries';
  }

  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEYS.weight, String(state.weight));
      localStorage.setItem(STORAGE_KEYS.height, String(state.height));
      localStorage.setItem(STORAGE_KEYS.age, String(state.age));
      localStorage.setItem(STORAGE_KEYS.male, state.isMale ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.heightUnit, state.heightUnit);
      localStorage.setItem(STORAGE_KEYS.weightUnit, state.weightUnit);
      if (state.waistCm != null) localStorage.setItem(STORAGE_KEYS.waist, String(state.waistCm)); else localStorage.removeItem(STORAGE_KEYS.waist);
      if (state.neckCm != null) localStorage.setItem(STORAGE_KEYS.neck, String(state.neckCm)); else localStorage.removeItem(STORAGE_KEYS.neck);
      if (state.hipCm != null) localStorage.setItem(STORAGE_KEYS.hip, String(state.hipCm)); else localStorage.removeItem(STORAGE_KEYS.hip);
      localStorage.setItem(STORAGE_KEYS.showFuelWidget, state.showFuelWidget ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.showExpeditionWidget, state.showExpeditionWidget ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.calorieGoal, state.calorieGoal);
      saveWeightToHistory();
    } catch (e) {}
  }

  function saveWidgetOptions() {
    try {
      localStorage.setItem(STORAGE_KEYS.showFuelWidget, state.showFuelWidget ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.showExpeditionWidget, state.showExpeditionWidget ? '1' : '0');
    } catch (e) {}
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function setPrismExplorerId() {
    var el = document.getElementById('prism-explorer-id');
    if (el) el.textContent = explorerId();
  }

  function playPrismSpeech() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(
      'Initialization successful. Welcome, Explorer. You have been assigned ID: ' + explorerId() + '. ' +
      'I am PRISM, your onboard mission assistant. Your biometric baseline is synchronized. ' +
      'Your Ghost-Path is ready. Set the pace. Do not just move. Evolve. ' +
      'Operation First Pulse is active. Step outside. The grid is watching.'
    );
    u.rate = 0.9;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  function showMainShellAndInit() {
    showScreen('main-shell');
    showInstallBannerIfAppropriate();
    setTab('home');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        updateMapPosition(lat, lng);
        if (map) map.setView([lat, lng], 16);
        startWatching();
      },
      function () { startWatching(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    updateHomeUI();
    updateProfileUI();
    updateReportUI();
    updateExpeditionButton();
    updateMapDistanceUI();
  }

  function setTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(function (p) {
      p.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      var isActive = b.dataset.tab === tabName;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    const pane = document.getElementById('tab-' + tabName);
    if (pane) pane.classList.add('active');
    if (tabName === 'map') {
      if (!mapInited) {
        mapInited = true;
        initMap();
        updateMapFromState();
      } else if (map) {
        setTimeout(function () { map.invalidateSize(); }, 100);
      }
    }
    if (tabName === 'report' && typeof updateReportUI === 'function') updateReportUI();
    if (tabName === 'profile' && typeof updateProfileUI === 'function') updateProfileUI();
    if (tabName === 'map') {
      updateMapDistanceUI();
      updateReplayButton();
      updateGhostLine();
    }
  }

  function updateMapFromState() {
    if (!map) return;
    if (state.currentPosition) {
      updateMapPosition(state.currentPosition.lat, state.currentPosition.lng);
    }
    updateRouteLine();
  }

  function updateHomeUI() {
    var onb = document.getElementById('onboarding-checklist');
    if (onb) onb.classList.toggle('hidden', isOnboardingDismissed());
    var nudgeEl = document.getElementById('home-nudge');
    if (nudgeEl) {
      var nudge = getNudgeMessage();
      nudgeEl.textContent = nudge || '';
      nudgeEl.classList.toggle('hidden', !nudge);
    }
    var fuelWidget = document.getElementById('home-widget-fuel');
    var expeditionWidget = document.getElementById('home-widget-expedition');
    if (fuelWidget) fuelWidget.classList.toggle('hidden', !state.showFuelWidget);
    if (expeditionWidget) expeditionWidget.classList.toggle('hidden', !state.showExpeditionWidget);
    var ghostHomeBtn = document.getElementById('btn-ghost-path-home');
    var hasRoute = lastRoutePoints && lastRoutePoints.length >= 2;
    if (ghostHomeBtn) {
      ghostHomeBtn.classList.toggle('no-route', !hasRoute);
      ghostHomeBtn.disabled = false;
    }
    var ghostHint = document.getElementById('btn-ghost-path-hint');
    if (ghostHint) ghostHint.textContent = hasRoute ? '' : 'Complete an expedition to race your ghost';

    var targetSteps = getGoals().steps;
    const progress = Math.min(1, targetSteps > 0 ? state.dailySteps / targetSteps : 0);
    document.getElementById('ring-fill').style.transform = 'rotate(-90deg) rotate(' + (progress * 360) + 'deg)';
    document.getElementById('steps').textContent = state.dailySteps;
    document.getElementById('explorer-id').textContent = explorerId();
    document.getElementById('level').textContent = level();
    document.getElementById('rank').textContent = rank();
    var bmiVal = bmi();
    var bmiCat = bmiCategory(bmiVal);
    var valBmiEl = document.getElementById('val-bmi');
    if (valBmiEl) { valBmiEl.textContent = bmiVal.toFixed(1) + ' (' + bmiCat.label + ')'; valBmiEl.className = 'val-bmi ' + bmiCat.class; }
    document.getElementById('val-bmr').textContent = Math.round(bmr()) + ' kcal/day';
    document.getElementById('val-burn').textContent = burn() + ' KCAL';
    document.getElementById('val-protocol').textContent = protocol();

    const missionBtn = document.getElementById('btn-mission-home');
    if (missionBtn) {
      missionBtn.classList.toggle('active', state.isMissionActive);
      document.getElementById('mission-icon').textContent = state.isMissionActive ? '◉' : '▶';
      document.getElementById('mission-label').textContent = state.isMissionActive ? 'MISSION ACTIVE' : 'START EXPEDITION';
    }
    var lastRouteEl = document.getElementById('last-route');
    if (lastRouteEl) {
      lastRouteEl.classList.toggle('hidden', !state.lastRouteKm);
      var kmEl = document.getElementById('last-route-km');
      if (kmEl) kmEl.textContent = state.lastRouteKm.toFixed(2);
    }
    var weekStats = getWeekStats();
    state.weekDistanceKm = weekStats.totalKm;
    var missionFill = document.getElementById('mission-progress-fill');
    var missionStatus = document.getElementById('mission-status');
    if (missionFill) {
      var pct = Math.min(1, state.weekDistanceKm / EXPEDITION_MISSION_KM);
      missionFill.style.width = (pct * 100) + '%';
    }
    if (missionStatus) {
      missionStatus.textContent = state.weekDistanceKm.toFixed(1) + ' / ' + EXPEDITION_MISSION_KM + ' km';
      if (state.missionCompletedThisWeek) missionStatus.innerHTML += ' <span class="mission-done">✓</span>';
    }
    updateFuelUI();
  }

  var FUEL_ARC_LENGTH = Math.PI * 80;

  function updateFuelUI() {
    var bmrEl = document.getElementById('fuel-bmr');
    var tdeeEl = document.getElementById('fuel-tdee');
    var burnEl = document.getElementById('fuel-burn');
    var burnSoFarEl = document.getElementById('fuel-burn-so-far');
    var balanceEl = document.getElementById('fuel-balance');
    var targetEl = document.getElementById('fuel-target');
    var weightEquivEl = document.getElementById('fuel-weight-equiv');
    if (bmrEl) bmrEl.textContent = Math.round(bmr()) + ' kcal';
    if (tdeeEl) tdeeEl.textContent = tdee() + ' kcal/day';
    if (burnEl) burnEl.textContent = burn() + ' kcal';
    var burnSoFar = burnSoFarToday();
    if (burnSoFarEl) burnSoFarEl.textContent = burnSoFar + ' kcal';
    var targetKcal = dailyTargetCalories();
    if (targetEl) targetEl.textContent = targetKcal + ' kcal (' + calorieGoalLabel() + ')';
    var totalBurn = Math.round(bmr()) + burn();
    var intake = state.calorieIntake || 0;
    var balance = totalBurn - intake;
    if (balanceEl) {
      balanceEl.textContent = (balance >= 0 ? '+' : '') + balance + ' kcal';
      balanceEl.classList.toggle('surplus', balance < 0);
      balanceEl.classList.toggle('deficit', balance >= 0);
    }
    var equivKg = balance / KCAL_PER_KG_FAT;
    if (weightEquivEl) {
      if (Math.abs(equivKg) < 0.005) weightEquivEl.textContent = '—';
      else weightEquivEl.textContent = (equivKg > 0 ? '−' : '+') + Math.abs(equivKg).toFixed(2) + ' kg (est.)';
    }
    var burnToday = burn();
    var walkEquivKg = burnToday / KCAL_PER_KG_FAT;
    var walkEquivEl = document.getElementById('fuel-walk-equiv');
    if (walkEquivEl) {
      if (burnToday < 10) walkEquivEl.textContent = '—';
      else walkEquivEl.textContent = '−' + walkEquivKg.toFixed(2) + ' kg (est. from steps)';
    }

    // Energy gauge: intake vs burn so far today (BMR prorated + activity). Based on your BMI/profile.
    var burnSoFarVal = burnSoFarToday();
    var level = burnSoFarVal > 0 ? intake / burnSoFarVal : (intake > 0 ? 1.5 : 0);
    var levelCapped = Math.min(level, 1.5);
    var needleDeg = -90 + levelCapped * 180;
    var needleEl = document.getElementById('fuel-gauge-needle');
    if (needleEl) needleEl.style.transform = 'rotate(' + needleDeg + 'deg)';
    var fillEl = document.getElementById('fuel-gauge-fill');
    if (fillEl) fillEl.style.strokeDashoffset = String(FUEL_ARC_LENGTH * (1 - Math.min(level, 1)));
    var valueEl = document.getElementById('fuel-gauge-value');
    var valueSubEl = document.getElementById('fuel-gauge-value-sub');
    if (valueEl) {
      if (level >= 0.95 && level <= 1.05) valueEl.textContent = 'OPTIMAL';
      else if (level > 1.5) valueEl.textContent = '150+';
      else valueEl.textContent = Math.round(level * 100);
    }
    if (valueSubEl) valueSubEl.textContent = level >= 0.95 && level <= 1.05 ? '' : ' intake vs burn';
    var unitEl = document.getElementById('fuel-gauge-unit');
    if (unitEl) unitEl.textContent = (level >= 0.95 && level <= 1.05) ? '' : '%';

    updateMealInputsAndTimestamps();
  }

  function updateMealInputsAndTimestamps() {
    var b = state.todayMeals.breakfast;
    var l = state.todayMeals.lunch;
    var d = state.todayMeals.dinner;
    var inB = document.getElementById('input-breakfast');
    var inL = document.getElementById('input-lunch');
    var inD = document.getElementById('input-dinner');
    var tsB = document.getElementById('meal-ts-breakfast');
    var tsL = document.getElementById('meal-ts-lunch');
    var tsD = document.getElementById('meal-ts-dinner');
    if (inB) inB.value = b && b.kcal ? b.kcal : '';
    if (inL) inL.value = l && l.kcal ? l.kcal : '';
    if (inD) inD.value = d && d.kcal ? d.kcal : '';
    if (tsB) tsB.textContent = b && b.ts ? b.ts : '—';
    if (tsL) tsL.textContent = l && l.ts ? l.ts : '—';
    if (tsD) tsD.textContent = d && d.ts ? d.ts : '—';
  }

  function updateMapDistanceUI() {
    var hud = document.getElementById('map-distance-hud');
    if (!hud) return;
    hud.classList.remove('hidden');
    var labelEl = document.getElementById('map-distance-label');
    var kmEl = document.getElementById('map-distance-km');
    var perimeterEl = document.getElementById('map-perimeter-km');
    var milometerEl = document.getElementById('map-milometer-km');
    var km = 0;
    if (state.isMissionActive) {
      km = routeDistanceKm();
      if (labelEl) labelEl.textContent = 'LIVE';
    } else if (lastRoutePoints && lastRoutePoints.length >= 2) {
      km = routeDistanceFromPoints(lastRoutePoints);
      if (labelEl) labelEl.textContent = 'Last';
    } else if (state.lastRouteKm > 0) {
      km = state.lastRouteKm;
      if (labelEl) labelEl.textContent = 'Last';
    } else {
      if (labelEl) labelEl.textContent = '—';
    }
    if (kmEl) kmEl.textContent = (km || 0).toFixed(2);
    if (perimeterEl) perimeterEl.textContent = (km || 0).toFixed(2);
    if (milometerEl) milometerEl.textContent = (km || 0).toFixed(2);
  }

  function routeDistanceFromPoints(points) {
    if (!points || points.length < 2) return 0;
    var km = 0;
    for (var i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
    return Math.round(km * 100) / 100;
  }

  function updateReportUI() {
    var weekStats = getWeekStats();
    var distEl = document.getElementById('report-distance');
    var stepsEl = document.getElementById('report-steps');
    var verdictEl = document.getElementById('report-verdict');
    if (distEl) distEl.textContent = weekStats.totalKm.toFixed(2) + ' km';
    if (stepsEl) stepsEl.textContent = weekStats.todaySteps;
    if (verdictEl) {
      if (weekStats.totalKm >= EXPEDITION_MISSION_KM) {
        verdictEl.textContent = 'OPTIMAL EVOLUTION';
        verdictEl.className = 'verdict success';
      } else if (weekStats.totalKm > 0) {
        verdictEl.textContent = 'STABLE PROGRESS';
        verdictEl.className = 'verdict warning';
      } else {
        verdictEl.textContent = 'INITIATE EXPEDITION';
        verdictEl.className = 'verdict';
      }
    }
    var weekCal = getWeeklyCalories();
    setElText('report-cal-total', weekCal.daysWithData > 0 ? weekCal.total + ' kcal' : '—');
    setElText('report-cal-days', weekCal.daysWithData > 0 ? weekCal.daysWithData + ' days' : '—');
    setElText('report-cal-avg', weekCal.daysWithData > 0 ? Math.round(weekCal.total / 7) + ' kcal/day' : '—');
    function setElText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
    var todayKey = getTodayKey();
    var rWeek = getDateRangeForPeriod('week');
    var rMonth = getDateRangeForPeriod('month');
    var rYear = getDateRangeForPeriod('year');
    setElText('report-steps-day', state.dailySteps);
    setElText('report-steps-week', sumStepsInRange(rWeek.start, rWeek.end));
    setElText('report-steps-month', sumStepsInRange(rMonth.start, rMonth.end));
    setElText('report-steps-year', sumStepsInRange(rYear.start, rYear.end));
    setElText('report-burn-day', estimatedBurnForDay(getTodayKey()) + ' kcal');
    setElText('report-burn-week', sumBurnInRange(rWeek.start, rWeek.end) + ' kcal');
    setElText('report-burn-month', sumBurnInRange(rMonth.start, rMonth.end) + ' kcal');
    setElText('report-dist-week', sumDistanceInRange(rWeek.start, rWeek.end).toFixed(2) + ' km');
    setElText('report-dist-month', sumDistanceInRange(rMonth.start, rMonth.end).toFixed(2) + ' km');
    setElText('report-dist-year', sumDistanceInRange(rYear.start, rYear.end).toFixed(2) + ' km');
    var exWeek = sumExerciseInRange(rWeek.start, rWeek.end);
    var exMonth = sumExerciseInRange(rMonth.start, rMonth.end);
    var exYear = sumExerciseInRange(rYear.start, rYear.end);
    setElText('report-exercise-week', exWeek ? exWeek + ' min' : '—');
    setElText('report-exercise-month', exMonth ? exMonth + ' min' : '—');
    setElText('report-exercise-year', exYear ? exYear + ' min' : '—');
    var tw = getTargetWeightKg();
    if (tw != null) {
      setElText('report-target-weight', state.weightUnit === 'lbs' ? weightFromKg(tw, 'lbs').toFixed(1) + ' lbs' : tw.toFixed(1) + ' kg');
      var twInp = document.getElementById('input-target-weight');
      var twUnit = document.getElementById('target-weight-unit');
      if (twInp) twInp.value = state.weightUnit === 'lbs' ? weightFromKg(tw, 'lbs').toFixed(1) : tw.toFixed(1);
      if (twUnit) twUnit.value = state.weightUnit;
    } else setElText('report-target-weight', '—');
    var waterToday = getWaterLog()[getTodayKey()] || 0;
    setElText('report-water-today', waterToday ? waterToday + ' ml' : '—');
    var hrLog = getHeartRateLog();
    var hrList = document.getElementById('heart-rate-log-list');
    if (hrList) hrList.innerHTML = hrLog.slice(-12).reverse().map(function (e) { return '<div class="report-log-row">' + e.dateKey + ' ' + e.ts + ' — ' + e.bpm + ' bpm</div>'; }).join('') || '<span class="report-log-empty">No entries</span>';
    var bpLog = getBloodPressureLog();
    var bpList = document.getElementById('blood-pressure-log-list');
    if (bpList) bpList.innerHTML = bpLog.slice(-12).reverse().map(function (e) { return '<div class="report-log-row">' + e.dateKey + ' ' + e.ts + ' — ' + e.sys + '/' + e.dia + '</div>'; }).join('') || '<span class="report-log-empty">No entries</span>';
    var exLog = getExerciseTimeLog();
    var exEntries = Object.keys(exLog).sort().reverse().slice(0, 12).map(function (k) { return { d: k, m: exLog[k] }; });
    var exList = document.getElementById('exercise-log-list');
    if (exList) exList.innerHTML = exEntries.length ? exEntries.map(function (e) { return '<div class="report-log-row">' + e.d + ' — ' + e.m + ' min</div>'; }).join('') : '<span class="report-log-empty">No entries</span>';
    var sum = getWeeklySummary();
    var sumText = document.getElementById('report-summary-text');
    var sumInsight = document.getElementById('report-summary-insight');
    if (sumText) sumText.textContent = 'This week: ' + sum.steps + ' steps, ' + sum.dist.toFixed(1) + ' km, ~' + sum.burn + ' kcal burned, ' + sum.ex + ' min exercise.';
    if (sumInsight) { sumInsight.textContent = sum.insight; sumInsight.className = 'report-summary-insight'; }
    var g = getGoals();
    setElText('report-goal-steps', g.steps + ' steps');
    setElText('report-goal-water', g.waterMl + ' ml');
    setElText('report-goal-exercise', g.exerciseWeeklyMins + ' min/week');
    var goalStepsInp = document.getElementById('input-goal-steps');
    var goalWaterInp = document.getElementById('input-goal-water');
    var goalExInp = document.getElementById('input-goal-exercise');
    if (goalStepsInp) goalStepsInp.value = g.steps;
    if (goalWaterInp) goalWaterInp.value = g.waterMl;
    if (goalExInp) goalExInp.value = g.exerciseWeeklyMins;
    var sleepLog = getSleepLog();
    var sleepEntries = [];
    for (var s = 0; s < 7; s++) {
      var dd = new Date();
      dd.setDate(dd.getDate() - s);
      var sk = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
      var se = sleepLog[sk];
      if (se) sleepEntries.push(sk + ' — ' + se.hours + ' h (' + se.quality + ')');
    }
    var sleepListEl = document.getElementById('sleep-log-list');
    if (sleepListEl) sleepListEl.innerHTML = sleepEntries.length ? sleepEntries.map(function (e) { return '<div class="report-log-row">' + e + '</div>'; }).join('') : '<span class="report-log-empty">Log last night to start</span>';
    renderProgressCalendar();
  }

  function updateProfileUI() {
    var weightInput = document.getElementById('input-weight');
    var heightInput = document.getElementById('input-height');
    var weightUnitSel = document.getElementById('weight-unit');
    var heightUnitSel = document.getElementById('height-unit');
    if (weightInput) weightInput.value = Math.round(weightFromKg(state.weight, state.weightUnit) * 10) / 10;
    if (heightInput) heightInput.value = Math.round(heightFromM(state.height, state.heightUnit) * 100) / 100;
    if (weightUnitSel) weightUnitSel.value = state.weightUnit;
    if (heightUnitSel) heightUnitSel.value = state.heightUnit;
    if (heightInput) {
      heightInput.min = state.heightUnit === 'ft' ? '4' : (state.heightUnit === 'cm' ? '100' : '0.5');
      heightInput.max = state.heightUnit === 'ft' ? '8' : (state.heightUnit === 'cm' ? '250' : '2.5');
      heightInput.step = state.heightUnit === 'cm' ? '1' : '0.01';
    }
    if (weightInput) {
      weightInput.min = state.weightUnit === 'lbs' ? '44' : '20';
      weightInput.max = state.weightUnit === 'lbs' ? '660' : '300';
    }
    document.getElementById('input-age').value = state.age;
    document.getElementById('sex-male').classList.toggle('active', state.isMale);
    document.getElementById('sex-female').classList.toggle('active', !state.isMale);
    document.getElementById('goal-lose').classList.toggle('active', state.calorieGoal === 'lose');
    document.getElementById('goal-maintain').classList.toggle('active', state.calorieGoal === 'maintain');
    document.getElementById('goal-gain').classList.toggle('active', state.calorieGoal === 'gain');
    var waistIn = document.getElementById('input-waist');
    var neckIn = document.getElementById('input-neck');
    var hipIn = document.getElementById('input-hip');
    if (waistIn) waistIn.value = state.waistCm != null ? state.waistCm : '';
    if (neckIn) neckIn.value = state.neckCm != null ? state.neckCm : '';
    if (hipIn) hipIn.value = state.hipCm != null ? state.hipCm : '';
    var asianCb = document.getElementById('use-asian-bmi');
    if (asianCb) asianCb.checked = state.useAsianBmi;
    var showFuelCb = document.getElementById('show-fuel-widget');
    var showExpCb = document.getElementById('show-expedition-widget');
    if (showFuelCb) showFuelCb.checked = state.showFuelWidget;
    if (showExpCb) showExpCb.checked = state.showExpeditionWidget;
    var bmiVal = bmi();
    var bmiCat = bmiCategory(bmiVal);
    var ideal = idealWeightRange();
    var profileBmiEl = document.getElementById('profile-bmi');
    var profileBmiCatEl = document.getElementById('profile-bmi-cat');
    if (profileBmiEl) { profileBmiEl.textContent = bmiVal.toFixed(1); profileBmiEl.className = 'profile-bmi-val ' + bmiCat.class; }
    if (profileBmiCatEl) { profileBmiCatEl.textContent = bmiCat.label; profileBmiCatEl.className = 'profile-bmi-cat ' + bmiCat.class; }
    var idealRangeEl = document.getElementById('profile-ideal-range');
    if (idealRangeEl) {
      var u = state.weightUnit === 'lbs' ? ' lbs' : ' kg';
      var minD = state.weightUnit === 'lbs' ? weightFromKg(ideal.min, 'lbs') : ideal.min;
      var maxD = state.weightUnit === 'lbs' ? weightFromKg(ideal.max, 'lbs') : ideal.max;
      idealRangeEl.textContent = minD.toFixed(1) + ' – ' + maxD.toFixed(1) + u;
    }
    document.getElementById('profile-bmr').textContent = Math.round(bmr()) + ' kcal/day';
    var bsaEl = document.getElementById('profile-bsa');
    if (bsaEl) bsaEl.textContent = bsa().toFixed(2) + ' m²';
    var bfEl = document.getElementById('profile-bodyfat');
    if (bfEl) bfEl.textContent = bodyFatPct().toFixed(1) + ' % (' + bodyFatSource() + ')';
    var bwEl = document.getElementById('profile-bodywater');
    if (bwEl) bwEl.textContent = bodyWaterPct().toFixed(1) + ' %';
    var viscEl = document.getElementById('profile-visceral');
    if (viscEl) viscEl.textContent = visceralFatLevel() + ' (1–59, ' + visceralSource() + ')';
    var muscleEl = document.getElementById('profile-muscle');
    if (muscleEl) {
      var sm = skeletalMuscleKg();
      muscleEl.textContent = (state.weightUnit === 'lbs' ? weightFromKg(sm, 'lbs').toFixed(1) + ' lbs' : sm.toFixed(1) + ' kg');
    }
    var boneEl = document.getElementById('profile-bone');
    if (boneEl) {
      var bm = boneMassKg();
      boneEl.textContent = (state.weightUnit === 'lbs' ? weightFromKg(bm, 'lbs').toFixed(1) + ' lbs' : bm.toFixed(1) + ' kg');
    }
    var newBmiEl = document.getElementById('profile-new-bmi');
    if (newBmiEl) newBmiEl.textContent = newBmi().toFixed(1) + ' (alt formula)';
    var entries = getLast7WeightEntries();
    var listEl = document.getElementById('weight-trend-list');
    var trendEl = document.getElementById('weight-trend-summary');
    if (listEl) {
      if (entries.length === 0) {
        listEl.innerHTML = '<p class="trend-empty">Save baseline to start logging. Each save records today\'s weight.</p>';
      } else {
        listEl.innerHTML = entries.map(function (e) {
          var bmiVal = (e.weight / (state.height * state.height)).toFixed(1);
          var wDisplay = state.weightUnit === 'lbs' ? weightFromKg(e.weight, 'lbs').toFixed(1) + ' lbs' : e.weight + ' kg';
          return '<div class="trend-row"><span class="trend-date">' + e.date + '</span><span>' + wDisplay + '</span><span>BMI ' + bmiVal + '</span></div>';
        }).join('');
      }
    }
    if (trendEl) {
      var trendText = getWeightTrendText();
      trendEl.textContent = trendText != null ? trendText : '—';
    }
  }

  function updateExpeditionButton() {
    const btn = document.getElementById('btn-expedition');
    btn.classList.toggle('expedition-active', state.isMissionActive);
    document.getElementById('expedition-icon').textContent = state.isMissionActive ? '■' : '▶';
    document.getElementById('expedition-label').textContent = state.isMissionActive ? 'STOP EXPEDITION' : 'START EXPEDITION';
  }

  var DEFAULT_CENTER = [10.65, -61.52];

  // Demo routes: offsets in degrees from center (≈111m per 0.001 deg lat). Center = user location or DEFAULT_CENTER.
  var DEMO_ROUTES = {
    park: {
      name: 'Park loop',
      desc: '~1.5 km loop',
      points: (function () {
        var r = 0.0022;
        var out = [];
        for (var i = 0; i <= 24; i++) {
          var t = (i / 24) * 2 * Math.PI;
          out.push({ dlat: r * Math.cos(t), dlng: r * 0.85 * Math.sin(t) });
        }
        return out;
      })(),
    },
    savannah: {
      name: 'Savannah trail',
      desc: '~2 km meandering',
      points: [
        { dlat: 0, dlng: 0 },
        { dlat: 0.0012, dlng: 0.0004 },
        { dlat: 0.0022, dlng: -0.0002 },
        { dlat: 0.003, dlng: 0.0006 },
        { dlat: 0.004, dlng: 0.0002 },
        { dlat: 0.0048, dlng: -0.0005 },
        { dlat: 0.0055, dlng: 0.0003 },
        { dlat: 0.0062, dlng: -0.0004 },
        { dlat: 0.0068, dlng: 0.0002 },
        { dlat: 0.0072, dlng: 0.0008 },
        { dlat: 0.0068, dlng: 0.0014 },
        { dlat: 0.006, dlng: 0.0016 },
        { dlat: 0.005, dlng: 0.0012 },
        { dlat: 0.0042, dlng: 0.0016 },
        { dlat: 0.0032, dlng: 0.001 },
        { dlat: 0.0024, dlng: 0.0014 },
        { dlat: 0.0014, dlng: 0.0008 },
        { dlat: 0.0006, dlng: 0.0012 },
        { dlat: 0, dlng: 0 },
      ],
    },
    steepHill: {
      name: 'Steep hill',
      desc: '~0.9 km switchback',
      points: [
        { dlat: 0, dlng: 0 },
        { dlat: 0.0012, dlng: 0 },
        { dlat: 0.0012, dlng: 0.0006 },
        { dlat: 0.0024, dlng: 0.0006 },
        { dlat: 0.0024, dlng: 0.0012 },
        { dlat: 0.0036, dlng: 0.0012 },
        { dlat: 0.0036, dlng: 0.0006 },
        { dlat: 0.0048, dlng: 0.0006 },
        { dlat: 0.0048, dlng: 0 },
        { dlat: 0.006, dlng: 0 },
        { dlat: 0.006, dlng: -0.0006 },
        { dlat: 0.0048, dlng: -0.0006 },
        { dlat: 0.0048, dlng: -0.0012 },
        { dlat: 0.0036, dlng: -0.0012 },
        { dlat: 0.0036, dlng: -0.0006 },
        { dlat: 0.0024, dlng: -0.0006 },
        { dlat: 0.0024, dlng: 0 },
        { dlat: 0.0012, dlng: 0 },
        { dlat: 0, dlng: 0 },
      ],
    },
  };

  function getDemoRoutePoints(demoKey, centerLat, centerLng) {
    var demo = DEMO_ROUTES[demoKey];
    if (!demo || !demo.points || !demo.points.length) return [];
    var lat = centerLat != null ? centerLat : DEFAULT_CENTER[0];
    var lng = centerLng != null ? centerLng : DEFAULT_CENTER[1];
    return demo.points.map(function (p) {
      return { lat: lat + p.dlat, lng: lng + p.dlng };
    });
  }

  function loadDemoRoute(demoKey) {
    var center = state.currentPosition || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    var pts = getDemoRoutePoints(demoKey, center.lat, center.lng);
    if (pts.length < 2) return;
    lastRoutePoints = pts;
    state.lastRouteKm = routeDistanceFromPoints(lastRoutePoints);
    saveLastRoute();
    updateRouteLine();
    updateGhostLine();
    updateReplayButton();
    updateHomeUI();
    updateMapDistanceUI();
    if (map) {
      var bounds = L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; }));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }

  function initMap() {
    const center = state.currentPosition
      ? [state.currentPosition.lat, state.currentPosition.lng]
      : DEFAULT_CENTER;
    map = L.map('map', { zoomControl: false }).setView(center, 15);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    if (state.currentPosition) {
      userMarker = L.marker([state.currentPosition.lat, state.currentPosition.lng], {
        icon: L.divIcon({
          className: 'user-marker',
          html: '<span style="color:#39FF14;font-size:24px">●</span>',
          iconSize: [24, 24],
        }),
      }).addTo(map);
    }

    routeLine = L.polyline([], { color: '#00F5FF', weight: 5 }).addTo(map);
    ghostRouteLine = L.polyline([], {
      color: '#00F5FF',
      weight: 4,
      opacity: 0.6,
      dashArray: '10, 10',
    }).addTo(map);
    updateGhostLine();
  }

  function updateMapPosition(lat, lng) {
    state.currentPosition = { lat: lat, lng: lng };
    if (!map) return;
    if (!userMarker) {
      userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'user-marker',
          html: '<span style="color:#39FF14;font-size:24px">●</span>',
          iconSize: [24, 24],
        }),
      }).addTo(map);
    }
    userMarker.setLatLng([lat, lng]);
    if (state.routePoints.length === 1) map.setView([lat, lng], 16);
  }

  function updateRouteLine() {
    if (!routeLine) return;
    var src = state.isMissionActive ? state.routePoints : lastRoutePoints;
    var pts = src.map(function (p) { return [p.lat, p.lng]; });
    routeLine.setLatLngs(pts);
    updateGhostLine();
  }

  function updateGhostLine() {
    if (!ghostRouteLine) return;
    if (!showGhostPath || !lastRoutePoints || lastRoutePoints.length < 2) {
      ghostRouteLine.setLatLngs([]);
      return;
    }
    if (!state.isMissionActive) {
      ghostRouteLine.setLatLngs([]);
      return;
    }
    var pts = lastRoutePoints.map(function (p) { return [p.lat, p.lng]; });
    ghostRouteLine.setLatLngs(pts);
  }

  function getRouteForReplay() {
    return state.isMissionActive ? state.routePoints : lastRoutePoints;
  }

  function startRouteReplay() {
    var points = getRouteForReplay();
    if (!map || points.length < 2) return;
    if (replayAnimationId) {
      cancelAnimationFrame(replayAnimationId);
      replayAnimationId = null;
    }
    if (replayMarker && map.hasLayer(replayMarker)) map.removeLayer(replayMarker);
    replayMarker = L.marker([points[0].lat, points[0].lng], {
      icon: L.divIcon({
        className: 'pulse-marker',
        html: '<span class="pulse-dot"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(map);
    var durationMs = replayDurationSec * 1000;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var t = Math.min(1, elapsed / durationMs);
      var eased = t * t * (3 - 2 * t);
      var idx = eased * (points.length - 1);
      var i0 = Math.floor(idx);
      var i1 = Math.min(points.length - 1, i0 + 1);
      var frac = idx - i0;
      var p0 = points[i0];
      var p1 = points[i1];
      var lat = p0.lat + frac * (p1.lat - p0.lat);
      var lng = p0.lng + frac * (p1.lng - p0.lng);
      replayMarker.setLatLng([lat, lng]);
      if (t < 1) {
        replayAnimationId = requestAnimationFrame(step);
      } else {
        replayAnimationId = null;
        if (replayLoop && points.length >= 2) {
          replayMarker.setLatLng([points[0].lat, points[0].lng]);
          startTime = null;
          replayAnimationId = requestAnimationFrame(step);
        } else {
          if (replayMarker && map.hasLayer(replayMarker)) map.removeLayer(replayMarker);
          replayMarker = null;
        }
      }
    }
    replayAnimationId = requestAnimationFrame(step);
  }

  function updateReplayButton() {
    var btn = document.getElementById('btn-replay-route');
    var controls = document.getElementById('replay-controls');
    var ghostBtn = document.getElementById('btn-ghost-path');
    if (!btn) return;
    var points = getRouteForReplay();
    var show = points.length >= 2;
    btn.classList.toggle('hidden', !show);
    if (controls) controls.classList.toggle('hidden', !show);
    if (ghostBtn) ghostBtn.classList.toggle('hidden', !(lastRoutePoints && lastRoutePoints.length >= 2));
    if (ghostBtn) ghostBtn.classList.toggle('active', showGhostPath);
    var ghostHomeBtn = document.getElementById('btn-ghost-path-home');
    if (ghostHomeBtn) ghostHomeBtn.classList.toggle('no-route', !(lastRoutePoints && lastRoutePoints.length >= 2));
  }

  var DESIRED_ACCURACY_M = 5;
  var lastPositionTime = 0;
  var accuracyFallbackMs = 15000;

  function startWatching() {
    if (state.watchId != null) return;
    lastPositionTime = 0;
    state.watchId = navigator.geolocation.watchPosition(
      function (pos) {
        var accuracy = pos.coords.accuracy;
        var now = Date.now();
        var usePosition = accuracy <= DESIRED_ACCURACY_M ||
          lastPositionTime === 0 ||
          (now - lastPositionTime >= accuracyFallbackMs);
        if (!usePosition) return;
        lastPositionTime = now;
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        updateMapPosition(lat, lng);
        if (state.isMissionActive) {
          state.routePoints.push({ lat: lat, lng: lng });
          updateRouteLine();
          state.dailySteps += Math.round(Math.random() * 4 + 8);
          setStepsForDate(getTodayKey(), state.dailySteps);
          updateHomeUI();
          updateMapDistanceUI();
          if (state.routePoints.length % 5 === 0) saveExpeditionState();
        }
      },
      function () {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  function stopWatching() {
    if (state.watchId != null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
  }

  function saveExpeditionState() {
    if (!state.isMissionActive) {
      try { localStorage.removeItem(STORAGE_KEYS.expedition); } catch (e) {}
      return;
    }
    try {
      var points = state.routePoints.length > MAX_SAVED_ROUTE_POINTS
        ? state.routePoints.slice(-MAX_SAVED_ROUTE_POINTS)
        : state.routePoints.slice();
      localStorage.setItem(STORAGE_KEYS.expedition, JSON.stringify({
        active: true,
        routePoints: points,
        savedAt: Date.now(),
      }));
    } catch (e) {}
  }

  function loadExpeditionState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.expedition);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.active && Array.isArray(data.routePoints)) {
          state.isMissionActive = true;
          state.routePoints = data.routePoints;
          var startRaw = localStorage.getItem(STORAGE_KEYS.expeditionStartTime);
          if (startRaw) state.expeditionStartTime = parseInt(startRaw, 10);
        }
      }
      var lastRaw = localStorage.getItem(STORAGE_KEYS.lastRoute);
      if (lastRaw) {
        var pts = JSON.parse(lastRaw);
        if (Array.isArray(pts) && pts.length >= 2) lastRoutePoints = pts;
      }
    } catch (e) {}
  }

  function saveLastRoute() {
    try {
      if (!lastRoutePoints || lastRoutePoints.length < 2) return;
      localStorage.setItem(STORAGE_KEYS.lastRoute, JSON.stringify(lastRoutePoints));
    } catch (e) {}
  }

  function toggleExpedition() {
    state.isMissionActive = !state.isMissionActive;
    if (state.isMissionActive) {
      state.routePoints = state.currentPosition
        ? [{ lat: state.currentPosition.lat, lng: state.currentPosition.lng }]
        : [];
      state.expeditionStartTime = Date.now();
      try { localStorage.setItem(STORAGE_KEYS.expeditionStartTime, String(state.expeditionStartTime)); } catch (e) {}
      updateRouteLine();
      state.xp += 10;
      saveOath();
      saveExpeditionState();
    } else {
      var km = routeDistanceKm();
      state.lastRouteKm = km;
      var addedSteps = stepsFromDistanceKm(km);
      state.dailySteps += addedSteps;
      setStepsForDate(getTodayKey(), state.dailySteps);
      logToday(km);
      var startRaw = state.expeditionStartTime || localStorage.getItem(STORAGE_KEYS.expeditionStartTime);
      if (startRaw) {
        var startMs = parseInt(startRaw, 10);
        if (!isNaN(startMs)) {
          var durationMins = Math.round((Date.now() - startMs) / 60000);
          if (durationMins >= 1) addExerciseEntry(durationMins);
        }
        state.expeditionStartTime = null;
        try { localStorage.removeItem(STORAGE_KEYS.expeditionStartTime); } catch (e) {}
      }
      state.weekDistanceKm = getWeekStats().totalKm;
      if (!state.missionCompletedThisWeek && state.weekDistanceKm >= EXPEDITION_MISSION_KM) {
        state.missionCompletedThisWeek = true;
        state.xp += 50;
        try {
          localStorage.setItem(STORAGE_KEYS.missionComplete, getWeekStart());
        } catch (e) {}
      }
      saveOath();
      lastRoutePoints = state.routePoints.slice();
      state.routePoints = [];
      saveLastRoute();
      saveExpeditionState();
      updateRouteLine();
      updateMapDistanceUI();
      updateReplayButton();
      if (typeof updateReportUI === 'function') updateReportUI();
    }
    updateExpeditionButton();
    updateHomeUI();
    updateReplayButton();
    if (typeof updateReportUI === 'function') updateReportUI();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').then(function () {}).catch(function () {});
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function showInstallBannerIfAppropriate() {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEYS.installDismissed) === '1') return;
    } catch (e) { return; }
    var banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  }

  function init() {
    loadStorage();
    loadExpeditionState();
    registerServiceWorker();
    updateReminderUI();
    if (state.reminderEnabled) startReminderLoop();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        saveExpeditionState();
      } else {
        if (refreshTodayData()) {
          updateHomeUI();
          updateFuelUI();
        }
        if (state.oathAccepted) {
          if (state.isMissionActive) {
            stopWatching();
            startWatching();
          }
          updateHomeUI();
          updateMapDistanceUI();
          updateExpeditionButton();
          updateRouteLine();
        }
      }
    });
    setInterval(function () {
      if (refreshTodayData()) {
        updateHomeUI();
        updateFuelUI();
      }
    }, 60000);
    window.addEventListener('pagehide', saveExpeditionState);

    document.getElementById('accept-oath').addEventListener('click', function () {
      state.oathAccepted = true;
      state.xp = 0;
      saveOath();
      showScreen('prism-screen');
      setPrismExplorerId();
      try { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } catch (e) {}
    });
    document.getElementById('prism-continue').addEventListener('click', function () {
      try { localStorage.setItem(STORAGE_KEYS.prismSeen, '1'); } catch (e) {}
      showMainShellAndInit();
    });
    var prismPlayBtn = document.getElementById('prism-play');
    if (prismPlayBtn) prismPlayBtn.addEventListener('click', playPrismSpeech);

    document.getElementById('abort-oath').addEventListener('click', function () {
      document.getElementById('oath-screen').classList.add('hidden');
    });

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTab(btn.dataset.tab);
      });
    });

    document.getElementById('btn-mission-home').addEventListener('click', toggleExpedition);
    document.getElementById('btn-expedition').addEventListener('click', toggleExpedition);
    var ghostPathHomeBtn = document.getElementById('btn-ghost-path-home');
    if (ghostPathHomeBtn) ghostPathHomeBtn.addEventListener('click', function () {
      setTab('map');
      showGhostPath = true;
      setTimeout(function () {
        updateGhostLine();
        updateReplayButton();
      }, 150);
    });

    var showcaseBtn = document.getElementById('btn-showcase-demo');
    if (showcaseBtn) showcaseBtn.addEventListener('click', function () {
      loadDemoRoute('park');
      setTab('map');
      showGhostPath = true;
      setTimeout(function () {
        updateGhostLine();
        updateReplayButton();
      }, 200);
    });

    document.querySelectorAll('.btn-demo-test').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var demoKey = btn.getAttribute('data-demo');
        if (!demoKey) return;
        loadDemoRoute(demoKey);
        setTab('map');
        showGhostPath = true;
        setTimeout(function () {
          updateGhostLine();
          updateReplayButton();
        }, 200);
      });
    });

    var demoSelect = document.getElementById('demo-route-select');
    if (demoSelect) demoSelect.addEventListener('change', function () {
      var v = demoSelect.value;
      if (v) { loadDemoRoute(v); demoSelect.value = ''; }
    });

    document.getElementById('btn-location').addEventListener('click', function () {
      if (!map) return;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          updateMapPosition(lat, lng);
          map.setView([lat, lng], 16);
        },
        function () {
          if (state.currentPosition) map.setView([state.currentPosition.lat, state.currentPosition.lng], 16);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    var replayBtn = document.getElementById('btn-replay-route');
    if (replayBtn) replayBtn.addEventListener('click', startRouteReplay);
    var ghostPathBtn = document.getElementById('btn-ghost-path');
    if (ghostPathBtn) ghostPathBtn.addEventListener('click', function () {
      showGhostPath = !showGhostPath;
      updateGhostLine();
      updateReplayButton();
    });
    document.querySelectorAll('.replay-dur').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.replay-dur').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        replayDurationSec = parseInt(b.dataset.duration, 10) || 8;
      });
    });
    var loopCheck = document.getElementById('replay-loop');
    if (loopCheck) loopCheck.addEventListener('change', function () { replayLoop = loopCheck.checked; });

    document.getElementById('save-profile').addEventListener('click', function () {
      var wRaw = parseFloat(document.getElementById('input-weight').value);
      var hRaw = parseFloat(document.getElementById('input-height').value);
      var a = parseInt(document.getElementById('input-age').value, 10);
      var wu = document.getElementById('weight-unit').value;
      var hu = document.getElementById('height-unit').value;
      state.weightUnit = wu;
      state.heightUnit = hu;
      if (!isNaN(wRaw) && wRaw > 0) state.weight = weightToKg(wRaw, wu);
      if (!isNaN(hRaw) && hRaw > 0) state.height = heightToM(hRaw, hu);
      if (!isNaN(a) && a > 0) state.age = a;
      var waistRaw = document.getElementById('input-waist').value.trim();
      var neckRaw = document.getElementById('input-neck').value.trim();
      var hipRaw = document.getElementById('input-hip').value.trim();
      var wCm = waistRaw === '' ? null : parseFloat(waistRaw);
      var nCm = neckRaw === '' ? null : parseFloat(neckRaw);
      var hCm = hipRaw === '' ? null : parseFloat(hipRaw);
      state.waistCm = (wCm != null && !isNaN(wCm) && wCm > 0) ? wCm : null;
      state.neckCm = (nCm != null && !isNaN(nCm) && nCm > 0) ? nCm : null;
      state.hipCm = (hCm != null && !isNaN(hCm) && hCm > 0) ? hCm : null;
      saveProfile();
      updateHomeUI();
      updateProfileUI();
      alert('Baseline saved. Today\'s weight logged for trend.');
    });

    document.getElementById('sex-male').addEventListener('click', function () {
      state.isMale = true;
      document.getElementById('sex-male').classList.add('active');
      document.getElementById('sex-female').classList.remove('active');
      updateProfileUI();
    });
    document.getElementById('sex-female').addEventListener('click', function () {
      state.isMale = false;
      document.getElementById('sex-female').classList.add('active');
      document.getElementById('sex-male').classList.remove('active');
      updateProfileUI();
    });

    var asianBmiCb = document.getElementById('use-asian-bmi');
    if (asianBmiCb) {
      asianBmiCb.addEventListener('change', function () {
        state.useAsianBmi = asianBmiCb.checked;
        try { localStorage.setItem(STORAGE_KEYS.bmiAsian, state.useAsianBmi ? '1' : '0'); } catch (e) {}
        updateProfileUI();
        updateHomeUI();
      });
    }
    var showFuelCb = document.getElementById('show-fuel-widget');
    if (showFuelCb) {
      showFuelCb.addEventListener('change', function () {
        state.showFuelWidget = showFuelCb.checked;
        saveWidgetOptions();
        updateHomeUI();
      });
    }
    var showExpCb = document.getElementById('show-expedition-widget');
    if (showExpCb) {
      showExpCb.addEventListener('change', function () {
        state.showExpeditionWidget = showExpCb.checked;
        saveWidgetOptions();
        updateHomeUI();
      });
    }
    var calPrev = document.getElementById('calendar-prev');
    var calNext = document.getElementById('calendar-next');
    if (calPrev) calPrev.addEventListener('click', function () {
      calendarMonth--;
      if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
      renderProgressCalendar();
    });
    if (calNext) calNext.addEventListener('click', function () {
      calendarMonth++;
      if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
      renderProgressCalendar();
    });
    ['lose', 'maintain', 'gain'].forEach(function (g) {
      var btn = document.getElementById('goal-' + g);
      if (btn) {
        btn.addEventListener('click', function () {
          state.calorieGoal = g;
          try { localStorage.setItem(STORAGE_KEYS.calorieGoal, g); } catch (e) {}
          updateProfileUI();
          updateHomeUI();
          updateFuelUI();
        });
      }
    });
    var weightUnitSel = document.getElementById('weight-unit');
    if (weightUnitSel) weightUnitSel.addEventListener('change', function () { state.weightUnit = weightUnitSel.value; updateProfileUI(); });
    var heightUnitSel = document.getElementById('height-unit');
    if (heightUnitSel) heightUnitSel.addEventListener('change', function () { state.heightUnit = heightUnitSel.value; updateProfileUI(); });

    document.querySelectorAll('.btn-meal-save').forEach(function (btn) {
      var meal = btn.getAttribute('data-meal');
      if (!meal) return;
      btn.addEventListener('click', function () {
        var input = document.getElementById('input-' + meal);
        var v = input ? parseInt(input.value, 10) : 0;
        if (isNaN(v) || v < 0) v = 0;
        saveMeal(meal, v, nowTimeString());
        updateFuelUI();
      });
    });

    function getReportShareText() {
      var weekStats = getWeekStats();
      var verdict = weekStats.totalKm >= EXPEDITION_MISSION_KM ? 'OPTIMAL EVOLUTION' :
        weekStats.totalKm > 0 ? 'STABLE PROGRESS' : 'INITIATE EXPEDITION';
      var weekCal = getWeeklyCalories();
      var calLine = weekCal.daysWithData > 0
        ? 'Calories this week: ' + weekCal.total + ' kcal (' + weekCal.daysWithData + ' days)\n'
        : '';
      var goalLine = 'Target: ' + calorieGoalLabel() + ' (' + dailyTargetCalories() + ' kcal)\n';
      return 'Path-Pulse Weekly Diagnostic\n' +
        'Distance this week: ' + weekStats.totalKm.toFixed(2) + ' km\n' +
        "Today's steps: " + weekStats.todaySteps + '\n' +
        (calLine || '') +
        goalLine +
        'Verdict: ' + verdict + '\n' +
        'Level ' + level() + ' · ' + rank();
    }

    var shareReportBtn = document.getElementById('share-report');
    if (shareReportBtn) {
      shareReportBtn.addEventListener('click', function () {
        var text = getReportShareText();
        var title = 'Path-Pulse Weekly Report';
        if (typeof navigator.share === 'function') {
          shareReportBtn.textContent = 'SHARING...';
          navigator.share({ title: title, text: text }).then(function () {
            shareReportBtn.textContent = 'SHARED!';
            setTimeout(function () { shareReportBtn.textContent = 'SHARE REPORT'; }, 1500);
          }).catch(function (err) {
            if (err.name !== 'AbortError') copyReportToClipboard(shareReportBtn, text);
            shareReportBtn.textContent = 'SHARE REPORT';
          });
        } else {
          copyReportToClipboard(shareReportBtn, text, 'SHARE REPORT');
        }
      });
    }

    function copyReportToClipboard(btn, text, label) {
      label = label || 'COPY TEXT';
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'COPIED!';
        setTimeout(function () { btn.textContent = label; }, 1500);
      }).catch(function () {
        btn.textContent = 'Copy failed';
        setTimeout(function () { btn.textContent = label; }, 1500);
      });
    }

    var copyReportBtn = document.getElementById('copy-report');
    if (copyReportBtn) {
      copyReportBtn.addEventListener('click', function () {
        copyReportToClipboard(copyReportBtn, getReportShareText(), 'COPY TEXT');
      });
    }

    var shareReportImageBtn = document.getElementById('share-report-image');
    if (shareReportImageBtn && typeof html2canvas === 'function') {
      shareReportImageBtn.addEventListener('click', function () {
        var el = document.getElementById('report-share-card');
        if (!el) return;
        shareReportImageBtn.textContent = 'GENERATING...';
        shareReportImageBtn.disabled = true;
        html2canvas(el, {
          scale: 2,
          backgroundColor: '#0B0E11',
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
        }).then(function (canvas) {
          var link = document.createElement('a');
          link.download = 'path-pulse-weekly-report.png';
          link.href = canvas.toDataURL('image/png');
          link.setAttribute('download', link.download);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          shareReportImageBtn.textContent = 'DOWNLOADED!';
          shareReportImageBtn.disabled = false;
          setTimeout(function () { shareReportImageBtn.textContent = 'DOWNLOAD AS IMAGE'; }, 1500);
        }).catch(function (err) {
          shareReportImageBtn.textContent = 'Try again';
          shareReportImageBtn.disabled = false;
          setTimeout(function () { shareReportImageBtn.textContent = 'DOWNLOAD AS IMAGE'; }, 2000);
        });
      });
    }

    var saveTargetBtn = document.getElementById('save-target-weight');
    if (saveTargetBtn) {
      saveTargetBtn.addEventListener('click', function () {
        var inp = document.getElementById('input-target-weight');
        var unitSel = document.getElementById('target-weight-unit');
        if (!inp || !unitSel) return;
        var val = parseFloat(inp.value);
        if (isNaN(val) || val < 20 || val > 300) return;
        var kg = unitSel.value === 'lbs' ? weightToKg(val, 'lbs') : val;
        setTargetWeightKg(kg);
        updateReportUI();
      });
    }
    var targetWeightUnitEl = document.getElementById('target-weight-unit');
    if (targetWeightUnitEl) targetWeightUnitEl.value = state.weightUnit;

    var addWaterBtn = document.getElementById('add-water');
    if (addWaterBtn) {
      addWaterBtn.addEventListener('click', function () {
        var inp = document.getElementById('input-water-ml');
        if (!inp) return;
        var ml = parseInt(inp.value, 10) || 0;
        if (ml <= 0) return;
        addWaterToday(ml);
        inp.value = '';
        updateReportUI();
      });
    }
    var logHrBtn = document.getElementById('log-heart-rate');
    if (logHrBtn) {
      logHrBtn.addEventListener('click', function () {
        var inp = document.getElementById('input-heart-rate');
        if (!inp) return;
        var bpm = parseInt(inp.value, 10);
        if (isNaN(bpm) || bpm < 30 || bpm > 250) return;
        addHeartRateEntry(bpm);
        inp.value = '';
        updateReportUI();
      });
    }
    var logBpBtn = document.getElementById('log-blood-pressure');
    if (logBpBtn) {
      logBpBtn.addEventListener('click', function () {
        var sysInp = document.getElementById('input-bp-sys');
        var diaInp = document.getElementById('input-bp-dia');
        if (!sysInp || !diaInp) return;
        var sys = parseInt(sysInp.value, 10);
        var dia = parseInt(diaInp.value, 10);
        if (isNaN(sys) || isNaN(dia) || sys < 70 || sys > 250 || dia < 40 || dia > 150) return;
        addBloodPressureEntry(sys, dia);
        sysInp.value = ''; diaInp.value = '';
        updateReportUI();
      });
    }
    var logExBtn = document.getElementById('log-exercise');
    if (logExBtn) {
      logExBtn.addEventListener('click', function () {
        var inp = document.getElementById('input-exercise-mins');
        if (!inp) return;
        var mins = parseInt(inp.value, 10);
        if (isNaN(mins) || mins < 1 || mins > 300) return;
        addExerciseEntry(mins);
        inp.value = '';
        updateReportUI();
      });
    }
    var saveGoalsBtn = document.getElementById('save-goals');
    if (saveGoalsBtn) {
      saveGoalsBtn.addEventListener('click', function () {
        var cur = getGoals();
        var sInp = document.getElementById('input-goal-steps');
        var wInp = document.getElementById('input-goal-water');
        var eInp = document.getElementById('input-goal-exercise');
        var s = sInp ? parseInt(sInp.value, 10) : NaN;
        var w = wInp ? parseInt(wInp.value, 10) : NaN;
        var e = eInp ? parseInt(eInp.value, 10) : NaN;
        setGoals({
          steps: !isNaN(s) && s >= 1000 ? s : cur.steps,
          waterMl: !isNaN(w) && w >= 500 ? w : cur.waterMl,
          exerciseWeeklyMins: !isNaN(e) && e >= 30 ? e : cur.exerciseWeeklyMins,
        });
        updateReportUI();
        updateHomeUI();
      });
    }
    var logSleepBtn = document.getElementById('log-sleep');
    if (logSleepBtn) {
      logSleepBtn.addEventListener('click', function () {
        var hoursInp = document.getElementById('input-sleep-hours');
        var qualitySel = document.getElementById('input-sleep-quality');
        if (!hoursInp) return;
        var hours = parseFloat(hoursInp.value);
        if (isNaN(hours) || hours < 0 || hours > 24) return;
        addSleepEntry(getYesterdayKey(), hours, qualitySel ? qualitySel.value : 'Fair');
        hoursInp.value = '';
        updateReportUI();
      });
    }
    var shareWeeklySummaryBtn = document.getElementById('share-weekly-summary');
    if (shareWeeklySummaryBtn) {
      shareWeeklySummaryBtn.addEventListener('click', function () {
        var sum = getWeeklySummary();
        var text = 'Path-Pulse weekly summary: ' + sum.steps + ' steps, ' + sum.dist.toFixed(1) + ' km, ~' + sum.burn + ' kcal burned, ' + sum.ex + ' min exercise. ' + sum.insight;
        if (typeof navigator.share === 'function') {
          navigator.share({ title: 'Path-Pulse Summary', text: text }).catch(function () {
            navigator.clipboard.writeText(text).then(function () { shareWeeklySummaryBtn.textContent = 'Copied!'; setTimeout(function () { shareWeeklySummaryBtn.textContent = 'Share summary'; }, 1500); });
          });
        } else {
          navigator.clipboard.writeText(text).then(function () {
            shareWeeklySummaryBtn.textContent = 'Copied!';
            setTimeout(function () { shareWeeklySummaryBtn.textContent = 'Share summary'; }, 1500);
          });
        }
      });
    }

    var syncStepsBtn = document.getElementById('sync-steps-btn');
    if (syncStepsBtn) {
      syncStepsBtn.addEventListener('click', function () {
        var inp = document.getElementById('input-sync-steps');
        if (!inp) return;
        var steps = parseInt(inp.value, 10);
        if (isNaN(steps) || steps < 0) return;
        state.dailySteps = steps;
        setStepsForDate(getTodayKey(), steps);
        inp.value = '';
        updateHomeUI();
        if (typeof updateReportUI === 'function') updateReportUI();
      });
    }
    var onboardingDismissBtn = document.getElementById('onboarding-dismiss');
    if (onboardingDismissBtn) {
      onboardingDismissBtn.addEventListener('click', function () {
        setOnboardingDismissed();
        updateHomeUI();
      });
    }

    var requestRemindersBtn = document.getElementById('btn-request-reminders');
    if (requestRemindersBtn) {
      requestRemindersBtn.addEventListener('click', function () {
        if (!('Notification' in window)) return;
        var tEl = document.getElementById('reminder-time-input');
        if (tEl && tEl.value) state.reminderTime = tEl.value;

        var perm = Notification.permission;
        var afterPerm = function () {
          try { localStorage.setItem(STORAGE_KEYS.reminderTime, state.reminderTime || '18:00'); } catch (e) {}
          state.reminderEnabled = true;
          try { localStorage.setItem(STORAGE_KEYS.reminderEnabled, '1'); } catch (e) {}
          updateReminderUI();
          startReminderLoop();
          subscribePushAndRegister();
        };

        if (perm === 'granted') {
          afterPerm();
          return;
        }

        Notification.requestPermission().then(function (p) {
          if (p === 'granted') afterPerm();
          else {
            state.reminderEnabled = false;
            try { localStorage.setItem(STORAGE_KEYS.reminderEnabled, '0'); } catch (e) {}
            stopReminderLoop();
            updateReminderUI();
          }
        }).catch(function () {
          state.reminderEnabled = false;
          try { localStorage.setItem(STORAGE_KEYS.reminderEnabled, '0'); } catch (e) {}
          stopReminderLoop();
          updateReminderUI();
        });
      });
    }

    var saveRemindersBtn = document.getElementById('btn-save-reminders');
    if (saveRemindersBtn) {
      saveRemindersBtn.addEventListener('click', function () {
        var tEl = document.getElementById('reminder-time-input');
        if (tEl && tEl.value) state.reminderTime = tEl.value;
        try { localStorage.setItem(STORAGE_KEYS.reminderTime, state.reminderTime || '18:00'); } catch (e) {}
        updateReminderUI();
        if (state.reminderEnabled) {
          startReminderLoop();
          subscribePushAndRegister();
        }
      });
    }

    var disableRemindersBtn = document.getElementById('btn-disable-reminders');
    if (disableRemindersBtn) {
      disableRemindersBtn.addEventListener('click', function () {
        state.reminderEnabled = false;
        try {
          localStorage.setItem(STORAGE_KEYS.reminderEnabled, '0');
          localStorage.removeItem(STORAGE_KEYS.reminderLastSent);
        } catch (e) {}
        stopReminderLoop();
        updateReminderUI();
      });
    }

    var installDismiss = document.getElementById('install-banner-dismiss');
    if (installDismiss) {
      installDismiss.addEventListener('click', function () {
        try { localStorage.setItem(STORAGE_KEYS.installDismissed, '1'); } catch (e) {}
        var banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    function finishInit() {
      loadStorage();
      document.getElementById('loader').classList.add('hidden');
      if (state.oathAccepted) {
        var prismSeen = localStorage.getItem(STORAGE_KEYS.prismSeen) === '1';
        if (!prismSeen) {
          showScreen('prism-screen');
          setPrismExplorerId();
        } else {
          showMainShellAndInit();
        }
      } else {
        showScreen('oath-screen');
      }
    }
    if (getApiBase()) {
      syncFromServer(finishInit);
    } else {
      finishInit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
