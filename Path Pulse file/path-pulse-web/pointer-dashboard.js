/**
 * Path Pulse — 3D wireframe-style route time-lapse (Three.js)
 * Query: ?api=http://localhost:3030&expeditionId=<uuid>
 */
import * as THREE from 'three';

function qs(name) {
  return new URLSearchParams(location.search).get(name) || '';
}

function apiBase() {
  var el = document.getElementById('apiBase');
  var v = (el && el.value.trim()) || qs('api') || '';
  return v.replace(/\/$/, '');
}

function projectLocalMeters(points) {
  if (!points.length) return { positions: new Float32Array(0), origin: { lat: 0, lng: 0 } };
  var lat0 = (points[0].lat * Math.PI) / 180;
  var lng0 = (points[0].lng * Math.PI) / 180;
  var R = 6371000;
  var out = new Float32Array(points.length * 3);
  for (var i = 0; i < points.length; i++) {
    var lat = (points[i].lat * Math.PI) / 180;
    var lng = (points[i].lng * Math.PI) / 180;
    var x = R * (lng - lng0) * Math.cos(lat0);
    var z = -R * (lat - lat0);
    var y = points[i].alt != null && isFinite(points[i].alt) ? Number(points[i].alt) : 0;
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return { positions: out, origin: { lat: points[0].lat, lng: points[0].lng } };
}

function projectOneMeters(lat, lng, alt) {
  var lat0 = (liveOriginLat * Math.PI) / 180;
  var lng0 = (liveOriginLng * Math.PI) / 180;
  var R = 6371000;
  var lat1 = (lat * Math.PI) / 180;
  var lng1 = (lng * Math.PI) / 180;
  var x = R * (lng1 - lng0) * Math.cos(lat0);
  var z = -R * (lat1 - lat0);
  var y = alt != null && isFinite(alt) ? Number(alt) : 0;
  return { x: x, y: y, z: z };
}

function wsUrlFromApiBase(base) {
  if (!base) {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws/live';
  }
  if (base.indexOf('https://') === 0) return 'wss://' + base.slice(8) + '/ws/live';
  if (base.indexOf('http://') === 0) return 'ws://' + base.slice(7) + '/ws/live';
  return '';
}

function closeLiveWs() {
  if (liveWs) {
    try {
      liveWs.onclose = null;
      liveWs.close();
    } catch (e) {}
    liveWs = null;
  }
  liveExpeditionId = '';
}

function openLiveWs(expeditionId) {
  closeLiveWs();
  if (!expeditionId || typeof WebSocket === 'undefined') return;
  var url = wsUrlFromApiBase(apiBase());
  if (!url) return;
  liveExpeditionId = expeditionId;
  try {
    liveWs = new WebSocket(url);
    liveWs.onopen = function () {
      try {
        liveWs.send(JSON.stringify({ type: 'subscribe', expeditionId: expeditionId }));
      } catch (e) {}
    };
    liveWs.onmessage = function (ev) {
      try {
        var msg = JSON.parse(String(ev.data));
        if (msg.type === 'points_batch' && msg.last && msg.expeditionId === expeditionId) {
          appendLivePoint(msg.last);
        }
        if (msg.type === 'expedition_complete' && msg.expeditionId === expeditionId) {
          setStatus('Expedition completed (live)');
        }
      } catch (e) {}
    };
    liveWs.onerror = function () {};
    liveWs.onclose = function () {
      liveWs = null;
    };
  } catch (e) {
    liveWs = null;
  }
}

function appendLivePoint(last) {
  if (!fullPositions || nPoints < 1 || !last) return;
  var lat = Number(last.lat);
  var lng = Number(last.lng);
  if (!isFinite(lat) || !isFinite(lng)) return;
  var alt = last.alt != null ? Number(last.alt) : null;
  var m = projectOneMeters(lat, lng, alt);
  var next = new Float32Array(fullPositions.length + 3);
  next.set(fullPositions);
  next[fullPositions.length] = m.x;
  next[fullPositions.length + 1] = m.y;
  next[fullPositions.length + 2] = m.z;
  fullPositions = next;
  nPoints += 1;
  var mEl = document.getElementById('meta');
  if (mEl && mEl.textContent) mEl.textContent = mEl.textContent.replace(/Points: \d+/, 'Points: ' + nPoints);
  var atEnd = progress >= 0.999;
  updateVisibleCount(atEnd ? nPoints : 2 + Math.floor(progress * Math.max(1, nPoints - 2)));
}

function buildGeometries(fullPositions, count) {
  count = Math.max(2, Math.min(count, fullPositions.length / 3));
  var slice = count * 3;
  var linePos = fullPositions.slice(0, slice);
  var gLine = new THREE.BufferGeometry();
  gLine.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

  var segments = count - 1;
  var wirePos = new Float32Array(segments * 6);
  for (var i = 0; i < segments; i++) {
    var b = i * 3;
    wirePos[i * 6] = fullPositions[b];
    wirePos[i * 6 + 1] = fullPositions[b + 1];
    wirePos[i * 6 + 2] = fullPositions[b + 2];
    wirePos[i * 6 + 3] = fullPositions[b + 3];
    wirePos[i * 6 + 4] = fullPositions[b + 4];
    wirePos[i * 6 + 5] = fullPositions[b + 5];
  }
  var gWire = new THREE.BufferGeometry();
  gWire.setAttribute('position', new THREE.BufferAttribute(wirePos, 3));
  return { gLine, gWire };
}

var scene, camera, renderer, lineMesh, wireMesh, pointer, fullPositions, nPoints;
var playing = false;
var raf = 0;
var t0 = 0;
var progress = 0;
var liveOriginLat = 0;
var liveOriginLng = 0;
var liveWs = null;
var liveExpeditionId = '';

function setStatus(msg) {
  var s = document.getElementById('status');
  if (s) s.textContent = msg || '';
}

function setMeta(text) {
  var m = document.getElementById('meta');
  if (m) m.textContent = text || '';
}

function disposeSceneMeshes() {
  if (lineMesh) {
    scene.remove(lineMesh);
    lineMesh.geometry.dispose();
    lineMesh.material.dispose();
    lineMesh = null;
  }
  if (wireMesh) {
    scene.remove(wireMesh);
    wireMesh.geometry.dispose();
    wireMesh.material.dispose();
    wireMesh = null;
  }
  if (pointer) {
    scene.remove(pointer);
    pointer.geometry.dispose();
    pointer.material.dispose();
    pointer = null;
  }
}

function initThree() {
  var canvas = document.getElementById('c');
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030508);
  scene.fog = new THREE.Fog(0x030508, 80, 520);

  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 5000);
  camera.position.set(0, 120, 180);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  var amb = new THREE.AmbientLight(0x6a8cff, 0.35);
  scene.add(amb);
  var dir = new THREE.DirectionalLight(0x3dffe8, 0.9);
  dir.position.set(40, 120, 60);
  scene.add(dir);

  var grid = new THREE.GridHelper(400, 40, 0x1a3a44, 0x0d1820);
  grid.position.y = -2;
  scene.add(grid);

  window.addEventListener('resize', onResize);
}

function onResize() {
  var canvas = document.getElementById('c');
  if (!renderer || !camera) return;
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateVisibleCount(count) {
  if (!fullPositions || !nPoints) return;
  disposeSceneMeshes();
  var geo = buildGeometries(fullPositions, count);
  var matLine = new THREE.LineBasicMaterial({ color: 0x3dffe8, transparent: true, opacity: 0.95 });
  lineMesh = new THREE.Line(geo.gLine, matLine);
  scene.add(lineMesh);

  var matWire = new THREE.LineBasicMaterial({
    color: 0x66aaff,
    transparent: true,
    opacity: 0.35,
  });
  wireMesh = new THREE.LineSegments(geo.gWire, matWire);
  scene.add(wireMesh);

  var end = Math.max(0, count - 1);
  var px = fullPositions[end * 3];
  var py = fullPositions[end * 3 + 1];
  var pz = fullPositions[end * 3 + 2];
  var sph = new THREE.SphereGeometry(2.2, 16, 12);
  var spMat = new THREE.MeshStandardMaterial({
    color: 0xff6b4a,
    emissive: 0x441100,
    metalness: 0.2,
    roughness: 0.4,
  });
  pointer = new THREE.Mesh(sph, spMat);
  pointer.position.set(px, py, pz);
  scene.add(pointer);

  var box = new THREE.Box3().setFromObject(lineMesh);
  var center = new THREE.Vector3();
  var size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  var maxDim = Math.max(size.x, size.y, size.z, 40);
  camera.position.copy(center.clone().add(new THREE.Vector3(maxDim * 0.9, maxDim * 0.55, maxDim * 1.05)));
  camera.lookAt(center);
}

function tick() {
  raf = 0;
  if (!playing || !nPoints) return;
  var speedEl = document.getElementById('speed');
  var speed = speedEl ? parseInt(speedEl.value, 10) || 12 : 12;
  var now = performance.now();
  var dt = (now - t0) / 1000;
  t0 = now;
  progress += (dt * speed) / Math.max(30, nPoints);
  if (progress > 1) progress = 1;
  var scrub = document.getElementById('scrub');
  if (scrub) scrub.value = String(Math.round(progress * 1000));
  var cnt = 2 + Math.floor(progress * (nPoints - 2));
  updateVisibleCount(cnt);
  if (progress >= 1) {
    playing = false;
    var btn = document.getElementById('btnPlay');
    if (btn) btn.textContent = 'Play';
    return;
  }
  raf = requestAnimationFrame(tick);
}

async function loadReplay() {
  var base = apiBase();
  var exp = (document.getElementById('expeditionId') && document.getElementById('expeditionId').value.trim()) || qs('expeditionId');
  if (!exp) {
    setStatus('Set expedition UUID');
    return;
  }
  var url = base + '/api/v1/expeditions/' + encodeURIComponent(exp) + '/replay';
  setStatus('Loading…');
  try {
    var res = await fetch(url);
    var data = await res.json();
    if (!data.ok) {
      setStatus((data.error || 'failed') + ' (' + res.status + ')');
      return;
    }
    var pts = (data.points || []).map(function (p) {
      return {
        lat: p.lat,
        lng: p.lng,
        alt: p.alt,
        tMs: p.t_ms != null ? p.t_ms : p.tMs,
      };
    });
    if (pts.length < 2) {
      setStatus('Need at least 2 points');
      return;
    }
    var proj = projectLocalMeters(pts);
    fullPositions = proj.positions;
    nPoints = pts.length;
    liveOriginLat = pts[0].lat;
    liveOriginLng = pts[0].lng;
    closeLiveWs();
    if (document.getElementById('followLive') && document.getElementById('followLive').checked) {
      openLiveWs(exp);
    }
    setMeta(
      'Points: ' +
        nPoints +
        ' · status: ' +
        (data.expedition && data.expedition.status) +
        ' · distance_km: ' +
        (data.expedition && data.expedition.distance_km)
    );
    progress = 0;
    var scrub = document.getElementById('scrub');
    if (scrub) {
      scrub.max = '1000';
      scrub.value = '0';
    }
    updateVisibleCount(2);
    setStatus('Ready');
  } catch (e) {
    setStatus(String(e.message || e));
  }
}

function wireUi() {
  var apiEl = document.getElementById('apiBase');
  var expEl = document.getElementById('expeditionId');
  var followElInit = document.getElementById('followLive');
  if (apiEl && qs('api')) apiEl.value = qs('api');
  if (expEl && qs('expeditionId')) expEl.value = qs('expeditionId');
  if (followElInit && (qs('live') === '1' || qs('followLive') === '1')) followElInit.checked = true;

  document.getElementById('btnLoad').addEventListener('click', loadReplay);
  document.getElementById('btnPlay').addEventListener('click', function () {
    if (!nPoints) return;
    playing = !playing;
    document.getElementById('btnPlay').textContent = playing ? 'Pause' : 'Play';
    if (playing) {
      if (progress >= 1) progress = 0;
      t0 = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  });

  document.getElementById('scrub').addEventListener('input', function () {
    if (!nPoints || !fullPositions) return;
    playing = false;
    document.getElementById('btnPlay').textContent = 'Play';
    cancelAnimationFrame(raf);
    progress = parseInt(document.getElementById('scrub').value, 10) / 1000;
    var cnt = 2 + Math.floor(progress * (nPoints - 2));
    updateVisibleCount(cnt);
  });

  var followEl = document.getElementById('followLive');
  if (followEl) {
    followEl.addEventListener('change', function () {
      var exp = (document.getElementById('expeditionId') && document.getElementById('expeditionId').value.trim()) || qs('expeditionId');
      if (followEl.checked && exp && fullPositions && nPoints >= 1) openLiveWs(exp);
      else closeLiveWs();
    });
  }
}

initThree();
wireUi();
function frame() {
  if (renderer && scene && camera) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
