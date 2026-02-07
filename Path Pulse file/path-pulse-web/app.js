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
  };

  const EXPEDITION_MISSION_KM = 2; // "Walk 2 km this week"

  const state = {
    oathAccepted: false,
    weight: 85,
    height: 1.8,
    age: 30,
    isMale: true,
    dailySteps: 7540,
    xp: 0,
    isMissionActive: false,
    routePoints: [],
    currentPosition: null,
    watchId: null,
    lastRouteKm: 0,
    weekDistanceKm: 0,
    missionCompletedThisWeek: false,
    calorieIntake: 0,
  };

  let map = null;
  let userMarker = null;
  let routeLine = null;
  let mapInited = false;

  function bmi() {
    return state.weight / (state.height * state.height);
  }
  function bmr() {
    const base = 10 * state.weight + 6.25 * (state.height * 100) - 5 * state.age;
    return state.isMale ? base + 5 : base - 161;
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

  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEYS.weight, String(state.weight));
      localStorage.setItem(STORAGE_KEYS.height, String(state.height));
      localStorage.setItem(STORAGE_KEYS.age, String(state.age));
      localStorage.setItem(STORAGE_KEYS.male, state.isMale ? '1' : '0');
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
      b.classList.toggle('active', b.dataset.tab === tabName);
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
    if (tabName === 'map') updateMapDistanceUI();
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
    document.getElementById('val-bmi').textContent = bmi().toFixed(1);
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
    var burnEl = document.getElementById('fuel-burn');
    var balanceEl = document.getElementById('fuel-balance');
    var inputEl = document.getElementById('input-calories');
    if (bmrEl) bmrEl.textContent = Math.round(bmr()) + ' kcal';
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
    var labelEl = document.getElementById('map-distance-label');
    var kmEl = document.getElementById('map-distance-km');
    if (state.isMissionActive) {
      var km = routeDistanceKm();
      hud.classList.remove('hidden');
      if (labelEl) labelEl.textContent = 'LIVE';
      if (kmEl) kmEl.textContent = km.toFixed(2);
    } else if (state.lastRouteKm > 0) {
      hud.classList.remove('hidden');
      if (labelEl) labelEl.textContent = 'Last';
      if (kmEl) kmEl.textContent = state.lastRouteKm.toFixed(2);
    } else {
      hud.classList.add('hidden');
    }
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
    document.getElementById('profile-bmi').textContent = bmi().toFixed(1);
    document.getElementById('profile-bmr').textContent = Math.round(bmr()) + ' kcal/day';
  }

  function updateExpeditionButton() {
    const btn = document.getElementById('btn-expedition');
    btn.classList.toggle('expedition-active', state.isMissionActive);
    document.getElementById('expedition-icon').textContent = state.isMissionActive ? '■' : '▶';
    document.getElementById('expedition-label').textContent = state.isMissionActive ? 'STOP EXPEDITION' : 'START EXPEDITION';
  }

  function initMap() {
    const center = state.currentPosition
      ? [state.currentPosition.lat, state.currentPosition.lng]
      : [51.5, -0.09];
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
    const pts = state.routePoints.map(function (p) { return [p.lat, p.lng]; });
    routeLine.setLatLngs(pts);
  }

  function startWatching() {
    if (state.watchId != null) return;
    state.watchId = navigator.geolocation.watchPosition(
      function (pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
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
      { enableHighAccuracy: true, maximumAge: 5000 }
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
      state.routePoints = [];
      updateRouteLine();
      updateMapDistanceUI();
      if (typeof updateReportUI === 'function') updateReportUI();
    }
    updateExpeditionButton();
    updateHomeUI();
    if (typeof updateReportUI === 'function') updateReportUI();
  }

  function init() {
    loadStorage();

    document.getElementById('accept-oath').addEventListener('click', function () {
      state.oathAccepted = true;
      state.xp = 0;
      saveOath();
      showScreen('main-shell');
      setTab('home');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          updateMapPosition(pos.coords.latitude, pos.coords.longitude);
          startWatching();
        },
        function () { startWatching(); },
        { enableHighAccuracy: true }
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
      if (!state.currentPosition || !map) return;
      map.setView([state.currentPosition.lat, state.currentPosition.lng], 16);
    });

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
      alert('Baseline saved. Lab recalculated.');
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

    var calorieInput = document.getElementById('input-calories');
    if (calorieInput) {
      calorieInput.addEventListener('change', function () {
        var v = parseInt(calorieInput.value, 10);
        state.calorieIntake = isNaN(v) || v < 0 ? 0 : v;
        saveCalorieIntake();
        updateFuelUI();
      });
    }

    var copyReportBtn = document.getElementById('copy-report');
    if (copyReportBtn) {
      copyReportBtn.addEventListener('click', function () {
        var weekStats = getWeekStats();
        var verdict = weekStats.totalKm >= EXPEDITION_MISSION_KM ? 'OPTIMAL EVOLUTION' :
          weekStats.totalKm > 0 ? 'STABLE PROGRESS' : 'INITIATE EXPEDITION';
        var text = 'Path-Pulse Weekly Diagnostic\n' +
          'Distance this week: ' + weekStats.totalKm.toFixed(2) + ' km\n' +
          "Today's steps: " + weekStats.todaySteps + '\n' +
          'Verdict: ' + verdict + '\n' +
          'Level ' + level() + ' · ' + rank();
        navigator.clipboard.writeText(text).then(function () {
          copyReportBtn.textContent = 'COPIED!';
          setTimeout(function () { copyReportBtn.textContent = 'COPY REPORT'; }, 1500);
        }).catch(function () {
          copyReportBtn.textContent = 'Copy failed';
          setTimeout(function () { copyReportBtn.textContent = 'COPY REPORT'; }, 1500);
        });
      });
    }

    if (state.oathAccepted) {
      document.getElementById('loader').classList.add('hidden');
      showScreen('main-shell');
      setTab('home');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          updateMapPosition(pos.coords.latitude, pos.coords.longitude);
          startWatching();
        },
        function () { startWatching(); },
        { enableHighAccuracy: true }
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
