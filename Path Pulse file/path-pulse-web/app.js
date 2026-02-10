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
  };

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
  };

  let map = null;
  let userMarker = null;
  let routeLine = null;
  let mapInited = false;
  let lastRoutePoints = [];
  let replayMarker = null;
  let replayAnimationId = null;
  let replayDurationSec = 8;
  let replayLoop = false;

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

  function getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.getFullYear() + '-' + String(mon.getMonth() + 1).padStart(2, '0') + '-' + String(mon.getDate()).padStart(2, '0');
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
      const steps = localStorage.getItem(STORAGE_KEYS.dailySteps);
      if (steps != null) state.dailySteps = parseInt(steps, 10);
      const week = getWeekStart();
      state.missionCompletedThisWeek = localStorage.getItem(STORAGE_KEYS.missionComplete) === week;
      var weekStats = getWeekStats();
      state.weekDistanceKm = weekStats.totalKm;
      if (!state.missionCompletedThisWeek && state.weekDistanceKm >= EXPEDITION_MISSION_KM) {
        state.missionCompletedThisWeek = true;
        try { localStorage.setItem(STORAGE_KEYS.missionComplete, week); } catch (e) {}
      }
      var cal = localStorage.getItem(STORAGE_KEYS.calories);
      if (cal) {
        try {
          var obj = JSON.parse(cal);
          var today = getTodayKey();
          if (obj[today] != null) state.calorieIntake = parseInt(obj[today], 10) || 0;
        } catch (e) {}
      }
      var asian = localStorage.getItem(STORAGE_KEYS.bmiAsian);
      if (asian != null) state.useAsianBmi = asian === '1';
    } catch (e) {}
  }

  function saveCalorieIntake() {
    try {
      var cal = {};
      try {
        var raw = localStorage.getItem(STORAGE_KEYS.calories);
        if (raw) cal = JSON.parse(raw);
      } catch (e) {}
      cal[getTodayKey()] = state.calorieIntake;
      localStorage.setItem(STORAGE_KEYS.calories, JSON.stringify(cal));
    } catch (e) {}
  }

  function saveOath() {
    try {
      localStorage.setItem(STORAGE_KEYS.oath, state.oathAccepted ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.xp, String(state.xp));
      localStorage.setItem(STORAGE_KEYS.dailySteps, String(state.dailySteps));
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
      saveWeightToHistory();
    } catch (e) {}
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
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
    if (tabName === 'map') {
      updateMapDistanceUI();
      updateReplayButton();
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
    const targetSteps = 10000;
    const progress = Math.min(1, state.dailySteps / targetSteps);
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

  function updateFuelUI() {
    var bmrEl = document.getElementById('fuel-bmr');
    var tdeeEl = document.getElementById('fuel-tdee');
    var burnEl = document.getElementById('fuel-burn');
    var balanceEl = document.getElementById('fuel-balance');
    var inputEl = document.getElementById('input-calories');
    if (bmrEl) bmrEl.textContent = Math.round(bmr()) + ' kcal';
    if (tdeeEl) tdeeEl.textContent = tdee() + ' kcal/day';
    if (burnEl) burnEl.textContent = burn() + ' kcal';
    if (inputEl) inputEl.value = state.calorieIntake || '';
    var totalBurn = Math.round(bmr()) + burn();
    var intake = state.calorieIntake || 0;
    var balance = totalBurn - intake;
    if (balanceEl) {
      balanceEl.textContent = (balance >= 0 ? '+' : '') + balance + ' kcal';
      balanceEl.classList.toggle('surplus', balance < 0);
      balanceEl.classList.toggle('deficit', balance >= 0);
    }
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
  }

  function updateProfileUI() {
    document.getElementById('input-weight').value = state.weight;
    document.getElementById('input-height').value = state.height;
    document.getElementById('input-age').value = state.age;
    document.getElementById('sex-male').classList.toggle('active', state.isMale);
    document.getElementById('sex-female').classList.toggle('active', !state.isMale);
    var asianCb = document.getElementById('use-asian-bmi');
    if (asianCb) asianCb.checked = state.useAsianBmi;
    var bmiVal = bmi();
    var bmiCat = bmiCategory(bmiVal);
    var ideal = idealWeightRange();
    var profileBmiEl = document.getElementById('profile-bmi');
    var profileBmiCatEl = document.getElementById('profile-bmi-cat');
    if (profileBmiEl) { profileBmiEl.textContent = bmiVal.toFixed(1); profileBmiEl.className = 'profile-bmi-val ' + bmiCat.class; }
    if (profileBmiCatEl) { profileBmiCatEl.textContent = bmiCat.label; profileBmiCatEl.className = 'profile-bmi-cat ' + bmiCat.class; }
    var idealRangeEl = document.getElementById('profile-ideal-range');
    if (idealRangeEl) idealRangeEl.textContent = ideal.min.toFixed(1) + ' – ' + ideal.max.toFixed(1) + ' kg';
    document.getElementById('profile-bmr').textContent = Math.round(bmr()) + ' kcal/day';
    var bsaEl = document.getElementById('profile-bsa');
    if (bsaEl) bsaEl.textContent = bsa().toFixed(2) + ' m²';
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
          return '<div class="trend-row"><span class="trend-date">' + e.date + '</span><span>' + e.weight + ' kg</span><span>BMI ' + bmiVal + '</span></div>';
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
    if (!btn) return;
    var points = getRouteForReplay();
    var show = points.length >= 2;
    btn.classList.toggle('hidden', !show);
    if (controls) controls.classList.toggle('hidden', !show);
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
          updateHomeUI();
          updateMapDistanceUI();
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

  function toggleExpedition() {
    state.isMissionActive = !state.isMissionActive;
    if (state.isMissionActive) {
      state.routePoints = state.currentPosition
        ? [{ lat: state.currentPosition.lat, lng: state.currentPosition.lng }]
        : [];
      updateRouteLine();
      state.xp += 10;
      saveOath();
    } else {
      var km = routeDistanceKm();
      state.lastRouteKm = km;
      var addedSteps = stepsFromDistanceKm(km);
      state.dailySteps += addedSteps;
      logToday(km);
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
    registerServiceWorker();

    document.getElementById('accept-oath').addEventListener('click', function () {
      state.oathAccepted = true;
      state.xp = 0;
      saveOath();
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
      updateMapDistanceUI();
    });

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
      const w = parseFloat(document.getElementById('input-weight').value);
      const h = parseFloat(document.getElementById('input-height').value);
      const a = parseInt(document.getElementById('input-age').value, 10);
      if (!isNaN(w) && w > 0) state.weight = w;
      if (!isNaN(h) && h > 0) state.height = h;
      if (!isNaN(a) && a > 0) state.age = a;
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

    var calorieInput = document.getElementById('input-calories');
    if (calorieInput) {
      calorieInput.addEventListener('change', function () {
        var v = parseInt(calorieInput.value, 10);
        state.calorieIntake = isNaN(v) || v < 0 ? 0 : v;
        saveCalorieIntake();
        updateFuelUI();
      });
    }

    function getReportShareText() {
      var weekStats = getWeekStats();
      var verdict = weekStats.totalKm >= EXPEDITION_MISSION_KM ? 'OPTIMAL EVOLUTION' :
        weekStats.totalKm > 0 ? 'STABLE PROGRESS' : 'INITIATE EXPEDITION';
      return 'Path-Pulse Weekly Diagnostic\n' +
        'Distance this week: ' + weekStats.totalKm.toFixed(2) + ' km\n' +
        "Today's steps: " + weekStats.todaySteps + '\n' +
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

    var installDismiss = document.getElementById('install-banner-dismiss');
    if (installDismiss) {
      installDismiss.addEventListener('click', function () {
        try { localStorage.setItem(STORAGE_KEYS.installDismissed, '1'); } catch (e) {}
        var banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    if (state.oathAccepted) {
      document.getElementById('loader').classList.add('hidden');
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
    } else {
      document.getElementById('loader').classList.add('hidden');
      showScreen('oath-screen');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
