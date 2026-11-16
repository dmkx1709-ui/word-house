/* 单词小屋 · 主程序 */
(function () {
  'use strict';

  var D = window.WORD_HOUSE_DATA;
  var WORDS = D.words;
  var FURNITURE = D.furniture;
  var THEMES = D.themes;
  var KEY = 'wordhouse.save.v1';
  var INTERVALS = [
    10 * 60 * 1000,
    24 * 60 * 60 * 1000,
    3 * 24 * 60 * 60 * 1000,
    7 * 24 * 60 * 60 * 1000,
    15 * 24 * 60 * 60 * 1000,
    30 * 24 * 60 * 60 * 1000
  ];

  var state = null;
  var session = null;
  var wordMap = {};
  var furnMap = {};
  var selectedPlaced = null;
  var pendingPlace = null;
  var shopZone = 'all';
  var wordFilter = 'all';
  var wordQuery = '';
  var toastTimer = null;
  var enVoice = null;
  var audioCtx = null;
  var hintTimer = null;

  /* ---------------- 小工具 ---------------- */
  function byId(id) { return document.getElementById(id); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysUntil(ts) {
    var diff = ts - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 86400000);
  }

  /* ---------------- 状态 ---------------- */
  function defaultState() {
    return {
      v: 1,
      bricks: 20,
      owned: ['f_rug', 'f_cushion', 'f_plant'],
      placed: [
        { item: 'f_rug', x: 48, y: 83 },
        { item: 'f_cushion', x: 31, y: 76 },
        { item: 'f_plant', x: 89, y: 72 }
      ],
      theme: 'cream',
      sky: 'day',
      lights: true,
      houseName: 'MY ROOM',
      settings: { newPerDay: 8, startLesson: 1 },
      progress: {},
      customWords: [],
      stats: { days: [], sessions: 0, correct: 0, bricksEarned: 0, extraDate: '', extraCount: 0 },
      onboarded: false
    };
  }

  function normalizeState(raw) {
    var d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    var s = {};
    for (var k in d) if (Object.prototype.hasOwnProperty.call(d, k)) s[k] = raw[k] !== undefined ? raw[k] : d[k];
    s.settings = Object.assign({}, d.settings, raw.settings || {});
    s.stats = Object.assign({}, d.stats, raw.stats || {});
    if (!Array.isArray(s.owned)) s.owned = d.owned.slice();
    if (!Array.isArray(s.placed)) s.placed = d.placed.slice();
    if (!Array.isArray(s.customWords)) s.customWords = [];
    if (!Array.isArray(s.stats.days)) s.stats.days = [];
    if (!s.progress || typeof s.progress !== 'object') s.progress = {};
    s.bricks = Math.max(0, Number(s.bricks) || 0);
    s.settings.newPerDay = clamp(Number(s.settings.newPerDay) || 8, 4, 15);
    s.settings.startLesson = clamp(Number(s.settings.startLesson) || 1, 1, 35);
    if (['cream', 'mint', 'pink'].indexOf(s.theme) < 0) s.theme = 'cream';
    if (['day', 'sunset', 'night'].indexOf(s.sky) < 0) s.sky = 'day';
    s.lights = !!s.lights;
    s.houseName = (typeof s.houseName === 'string' && s.houseName.trim()) ? s.houseName.trim().slice(0, 12) : 'MY ROOM';
    return s;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 忽略存储错误 */ }
  }

  function allWords() { return WORDS.concat(state.customWords || []); }

  function refreshWordMap() {
    wordMap = {};
    allWords().forEach(function (w) { wordMap[w.id] = w; });
  }

  function buildFurnMap() {
    furnMap = {};
    FURNITURE.forEach(function (f) { furnMap[f.id] = f; });
  }

  /* ---------------- 声音 ---------------- */
  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, start, dur, type, vol) {
    try {
      var a = ensureAudio();
      if (!a) return;
      var o = a.createOscillator();
      var g = a.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(a.destination);
      var t = a.currentTime + (start || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.06, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* 忽略音频错误 */ }
  }

  function sfxCorrect() { tone(660, 0, 0.12, 'sine', 0.06); tone(880, 0.09, 0.2, 'sine', 0.055); }
  function sfxWrong() { tone(250, 0, 0.16, 'triangle', 0.045); tone(190, 0.11, 0.2, 'triangle', 0.035); }
  function sfxPop() { tone(520, 0, 0.08, 'sine', 0.045); tone(780, 0.05, 0.1, 'sine', 0.035); }
  function playMelody(notes) {
    notes.forEach(function (f, i) { tone(f, i * 0.15, 0.19, 'sine', 0.04); });
  }
  function sfxMeow() {
    try {
      var a = ensureAudio();
      if (!a) return;
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(620, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(920, a.currentTime + 0.12);
      o.frequency.exponentialRampToValueAtTime(470, a.currentTime + 0.34);
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.38);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.42);
    } catch (e) { /* 忽略 */ }
  }

  function pickVoice() {
    try {
      if (!('speechSynthesis' in window)) return;
      var list = window.speechSynthesis.getVoices().filter(function (v) { return /^en(-|_)?/i.test(v.lang); });
      enVoice = list.find(function (v) { return /Samantha|Google US English|Aria|Zira|Karen|Daniel/i.test(v.name); })
        || list.find(function (v) { return /en[-_]US/i.test(v.lang); })
        || list[0] || null;
    } catch (e) { /* 忽略 */ }
  }

  function speak(text, rate) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-US';
      u.rate = rate || 0.82;
      u.pitch = 1.02;
      if (enVoice) u.voice = enVoice;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 忽略 */ }
  }

  /* ---------------- 屏幕与提示 ---------------- */
  function showScreen(name) {
    $$('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === 'screen-' + name);
    });
    var active = byId('screen-' + name);
    if (active) active.scrollTop = 0;
  }

  function toast(msg) {
    var t = byId('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2400);
  }

  function dismissHint() {
    var h = byId('roomHint');
    if (h && !h.classList.contains('fade')) h.classList.add('fade');
  }

  /* ---------------- 主题 / 天空 / 灯 ---------------- */
  function applyTheme() {
    var room = byId('room');
    room.dataset.theme = state.theme;
    refreshThemeSwatches();
  }

  function refreshThemeSwatches() {
    $$('.theme-swatch').forEach(function (b) {
      b.classList.toggle('active', b.dataset.themeId === state.theme);
    });
  }

  function themeSwatchHtml() {
    return THEMES.map(function (t) {
      return '<button class="theme-swatch' + (state.theme === t.id ? ' active' : '') + '" data-theme-id="' + t.id + '">' +
        '<i style="background:' + t.swatch + '"></i><span>' + escapeHtml(t.name) + '</span></button>';
    }).join('');
  }

  function renderThemeRows() {
    ['themeRow', 'onboardThemes'].forEach(function (id) {
      var c = byId(id);
      if (c) c.innerHTML = themeSwatchHtml();
    });
  }

  function renderHouseName() {
    var sign = byId('doorSign');
    if (sign) sign.textContent = state.houseName;
    var settingsInput = byId('houseName');
    if (settingsInput) settingsInput.value = state.houseName;
    var onboardInput = byId('houseNameInput');
    if (onboardInput && !onboardInput.value) onboardInput.value = state.houseName;
  }

  function setSky(mode) {
    state.sky = mode;
    byId('sky').className = 'sky ' + mode;
    byId('room').dataset.sky = mode;
    save();
  }

  function applyLights() {
    var l = byId('stringLights');
    l.classList.toggle('on', state.lights);
    l.classList.toggle('off', !state.lights);
    byId('lightSwitch').classList.toggle('on', state.lights);
  }

  /* ---------------- 数据刷新 ---------------- */
  function updateBricks() {
    byId('brickCount').textContent = state.bricks;
    byId('shopBricks').textContent = state.bricks;
    if (session) byId('sessionBricks').textContent = session.bricks;
  }

  function completionStats() {
    var owned = state.owned.length;
    var total = FURNITURE.length;
    return { owned: owned, total: total, pct: total ? Math.round(owned / total * 100) : 0 };
  }

  function sessionPreview() {
    var words = allWords();
    var now = Date.now();
    var due = 0;
    words.forEach(function (w) {
      var p = state.progress[w.id];
      if (p && p.box < 5 && p.due <= now) due++;
    });
    var introducedToday = words.filter(function (w) {
      var p = state.progress[w.id];
      return p && p.firstSeen === todayKey();
    }).length;
    var remainingNew = words.filter(function (w) {
      if (state.progress[w.id]) return false;
      if (w.lesson && w.lesson < state.settings.startLesson) return false;
      return true;
    }).length;
    var fresh = clamp(state.settings.newPerDay - introducedToday, 0, remainingNew);
    return { due: due, fresh: fresh };
  }

  function hasWorkLeft() {
    var prev = sessionPreview();
    return prev.due > 0 || prev.fresh > 0;
  }

  function canFreePractice() {
    var k = todayKey();
    if (state.stats.extraDate !== k) return true;
    return (state.stats.extraCount || 0) < 2;
  }

  function renderHome() {
    updateBricks();
    var room = byId('room');
    room.dataset.theme = state.theme;
    room.dataset.sky = state.sky;
    applyLights();
    renderRoom();

    var cs = completionStats();
    byId('completionText').textContent = cs.owned + ' / ' + cs.total;
    byId('completionBar').style.width = cs.pct + '%';

    var unowned = FURNITURE.filter(function (f) { return state.owned.indexOf(f.id) < 0; })
      .sort(function (a, b) { return a.price - b.price; });
    var next = unowned[0];
    var goal = byId('goalLine');
    if (!next) {
      goal.textContent = '家具都收集齐了，小屋被你装得满满当当！';
    } else if (state.bricks >= next.price) {
      goal.textContent = '现在就能买下 ' + next.emoji + ' ' + next.name + ' 啦';
    } else {
      goal.textContent = '再答对 ' + (next.price - state.bricks) + ' 个词，就能买下 ' + next.emoji + ' ' + next.name;
    }

    var prev = sessionPreview();
    var label = byId('startLabel');
    var sub = byId('startSub');
    if (prev.due + prev.fresh > 0) {
      label.textContent = '开始今天的小任务';
      sub.textContent = prev.fresh > 0
        ? ('新词 ' + prev.fresh + ' · 复习 ' + prev.due)
        : ('复习 ' + prev.due + ' 个词');
    } else {
      label.textContent = '自由练习一小轮';
      sub.textContent = '今天的词都复习完啦';
    }
  }

  /* ---------------- 房间里的家具 ---------------- */
  function itemPx(size) {
    var w = byId('room').clientWidth || 360;
    return Math.round(w * size / 100);
  }

  function renderRoom() {
    var wrap = byId('roomItems');
    if (!wrap) return;
    wrap.innerHTML = '';
    state.placed.forEach(function (p) {
      var item = furnMap[p.item];
      if (!item) return;
      var el = document.createElement('div');
      el.className = 'room-item' + (item.kind === 'rug' ? ' is-rug' : '');
      el.dataset.item = p.item;
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      el.style.zIndex = String(10 + Math.round(p.y));
      if (item.kind === 'rug') {
        el.style.width = item.size + '%';
        el.style.height = (item.size * 0.4) + '%';
      } else {
        el.textContent = item.emoji;
        el.style.fontSize = itemPx(item.size) + 'px';
      }
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', item.name + '，点一下听英文');
      el.addEventListener('pointerdown', function (e) { onItemPointerDown(e, el, p); });
      wrap.appendChild(el);
      if (selectedPlaced && selectedPlaced.item === p.item) el.classList.add('selected');
    });
  }

  function clampPos(item, x, y) {
    var pad = Math.min(46, (item.size || 10) / 2 + 1);
    var xx = clamp(x, pad, 100 - pad);
    var yy;
    if (item.zone === 'wall') yy = clamp(y, 14, 52);
    else yy = clamp(y, 66, 92);
    return { x: xx, y: yy };
  }

  function onItemPointerDown(e, el, placed) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    if (pendingPlace) return;
    var startX = e.clientX, startY = e.clientY;
    var origX = placed.x, origY = placed.y;
    var rect = byId('room').getBoundingClientRect();
    var item = furnMap[placed.item];
    var moved = false;

    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }

    function move(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 7) {
        moved = true;
        el.classList.add('dragging');
        clearSelection();
      }
      if (!moved) return;
      var pos = clampPos(item, origX + dx / rect.width * 100, origY + dy / rect.height * 100);
      placed.x = pos.x;
      placed.y = pos.y;
      el.style.left = pos.x + '%';
      el.style.top = pos.y + '%';
      el.style.zIndex = '999';
    }

    function up() {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      if (moved) {
        el.style.zIndex = String(10 + Math.round(placed.y));
        save();
        dismissHint();
      } else {
        selectPlaced(placed, el);
        playItemEffect(placed.item, el);
      }
    }

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function selectPlaced(placed, el) {
    selectedPlaced = placed;
    $$('.room-item').forEach(function (x) { x.classList.remove('selected'); });
    if (el) el.classList.add('selected');
    var item = furnMap[placed.item];
    byId('toolbarName').textContent = item ? item.name : '家具';
    byId('roomToolbar').classList.remove('hidden');
  }

  function clearSelection() {
    selectedPlaced = null;
    $$('.room-item').forEach(function (x) { x.classList.remove('selected'); });
    byId('roomToolbar').classList.add('hidden');
  }

  function removeSelected() {
    if (!selectedPlaced) return;
    var name = (furnMap[selectedPlaced.item] || {}).name || '家具';
    var target = selectedPlaced.item;
    state.placed = state.placed.filter(function (p) { return p.item !== target; });
    clearSelection();
    save();
    renderRoom();
    sfxPop();
    toast(name + ' 收进仓库啦');
  }

  function placeItem(itemId, x, y) {
    var item = furnMap[itemId];
    if (!item) return;
    var pos = clampPos(item, x, y);
    var existing = state.placed.filter(function (p) { return p.item === itemId; })[0];
    if (existing) {
      existing.x = pos.x;
      existing.y = pos.y;
    } else {
      state.placed.push({ item: itemId, x: pos.x, y: pos.y });
    }
    pendingPlace = null;
    byId('room').classList.remove('placing');
    save();
    renderRoom();
    sfxPop();
    dismissHint();
    toast('摆好啦');
  }

  function enterPlacement(itemId) {
    var item = furnMap[itemId];
    if (!item) return;
    pendingPlace = itemId;
    closeSheet();
    showScreen('home');
    renderHome();
    byId('room').classList.add('placing');
    toast('点一下房间里的位置，把' + item.name + '放好');
  }

  function playItemEffect(itemId, el) {
    var item = furnMap[itemId];
    if (!item) return;
    speak(item.en);
    showItemBubble(el, item);
    el.classList.add('bounce');
    setTimeout(function () { el.classList.remove('bounce'); }, 520);

    if (itemId === 'f_cat') {
      sfxMeow();
      hearts(el, '💗');
    } else if (itemId === 'f_rabbit' || itemId === 'f_plant' || itemId === 'f_bigplant' || itemId === 'f_cactus') {
      el.classList.add('wiggle');
      setTimeout(function () { el.classList.remove('wiggle'); }, 580);
      sfxPop();
    } else if (itemId === 'f_piano') {
      playMelody([523, 659, 784, 1047]);
    } else if (itemId === 'f_musicbox' || itemId === 'f_record') {
      playMelody([784, 659, 523, 587, 659]);
    } else if (itemId === 'f_lamp' || itemId === 'f_cloud' || itemId === 'f_nightlight' || itemId === 'f_stars' || itemId === 'f_moon') {
      el.classList.toggle('lit');
      sfxPop();
    } else if (itemId === 'f_fish') {
      hearts(el, '🫧');
      sfxPop();
    } else {
      sfxPop();
    }
  }

  function showItemBubble(el, item) {
    var old = $('.item-bubble');
    if (old) old.remove();
    var r = el.getBoundingClientRect();
    var b = document.createElement('div');
    b.className = 'item-bubble';
    b.innerHTML = '<b>' + escapeHtml(item.en) + '</b><span>' + escapeHtml(item.zh) + '</span>';
    document.body.appendChild(b);
    b.style.left = clamp(r.left + r.width / 2, 50, window.innerWidth - 50) + 'px';
    var top = r.top - b.offsetHeight - 8;
    if (top < 8) top = r.bottom + 8;
    b.style.top = top + 'px';
    setTimeout(function () {
      b.style.transition = 'opacity .3s';
      b.style.opacity = '0';
      setTimeout(function () { b.remove(); }, 320);
    }, 1200);
  }

  function hearts(el, glyph) {
    var r = el.getBoundingClientRect();
    for (var i = 0; i < 3; i++) {
      (function (i) {
        var h = document.createElement('div');
        h.className = 'heart';
        h.textContent = glyph;
        h.style.left = (r.left + r.width / 2 + (Math.random() - 0.5) * 22) + 'px';
        h.style.top = (r.top + r.height * 0.2) + 'px';
        h.style.animationDelay = (i * 90) + 'ms';
        document.body.appendChild(h);
        setTimeout(function () { h.remove(); }, 1400);
      })(i);
    }
  }

  /* ---------------- 家具店 ---------------- */
  function renderShop() {
    var grid = byId('shopGrid');
    var placedIds = state.placed.map(function (p) { return p.item; });
    var items = FURNITURE.filter(function (f) { return shopZone === 'all' || f.zone === shopZone; });
    grid.innerHTML = items.map(function (f) {
      var owned = state.owned.indexOf(f.id) >= 0;
      var placed = placedIds.indexOf(f.id) >= 0;
      var locked = f.unlockOwned && state.owned.length < f.unlockOwned;
      var canBuy = !locked && !owned && state.bricks >= f.price;
      var btn;
      if (locked) {
        btn = '<button class="shop-btn" disabled>还差 ' + (f.unlockOwned - state.owned.length) + ' 件</button>';
      } else if (owned) {
        btn = '<button class="shop-btn go" data-buy="' + f.id + '">' + (placed ? '调整位置' : '去摆放') + '</button>';
      } else if (!canBuy) {
        btn = '<button class="shop-btn" disabled>砖块不够</button>';
      } else {
        btn = '<button class="shop-btn" data-buy="' + f.id + '">买下</button>';
      }
      return '<div class="shop-card' + (owned ? ' owned' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="zone-tag">' + (f.zone === 'wall' ? '墙面' : '地面') + '</span>' +
        '<div class="shop-emoji">' + f.emoji + '</div>' +
        '<div class="shop-name">' + escapeHtml(f.name) + '</div>' +
        '<div class="shop-desc">' + escapeHtml(f.desc) + '</div>' +
        '<div class="shop-meta"><span class="shop-price">🧱 ' + f.price + '</span>' + btn + '</div>' +
        '</div>';
    }).join('');
    byId('shopBricks').textContent = state.bricks;
  }

  function buyItem(item) {
    if (state.owned.indexOf(item.id) >= 0) { enterPlacement(item.id); return; }
    if (item.unlockOwned && state.owned.length < item.unlockOwned) {
      toast('再拥有 ' + (item.unlockOwned - state.owned.length) + ' 件家具，它才会出现');
      return;
    }
    if (state.bricks < item.price) {
      toast('还差 ' + (item.price - state.bricks) + ' 块砖，再背几个词吧');
      sfxWrong();
      return;
    }
    state.bricks -= item.price;
    state.owned.push(item.id);
    save();
    updateBricks();
    sfxPop();
    confetti(46);
    toast('买到了 ' + item.emoji + ' ' + item.name + '！');
    renderShop();
    renderHome();
    setTimeout(function () { enterPlacement(item.id); }, 520);
  }

  /* ---------------- 学习会话 ---------------- */
  function makeItem(word, isNew) {
    return { word: word, isNew: !!isNew, taught: false, retries: 0 };
  }

  function buildSession() {
    var words = allWords();
    var now = Date.now();
    var due = [];
    words.forEach(function (w) {
      var p = state.progress[w.id];
      if (p && p.box < 5 && p.due <= now) due.push(w);
    });
    due.sort(function (a, b) { return state.progress[a.id].due - state.progress[b.id].due; });
    due = due.slice(0, 20);

    var introducedToday = words.filter(function (w) {
      var p = state.progress[w.id];
      return p && p.firstSeen === todayKey();
    }).length;
    var cap = Math.max(0, state.settings.newPerDay - introducedToday);
    var learnedCount = words.filter(function (w) { return !!state.progress[w.id]; }).length;
    if (learnedCount === 0) cap = Math.min(cap, 5);

    var freshPool = words.filter(function (w) {
      if (state.progress[w.id]) return false;
      if (w.lesson && w.lesson < state.settings.startLesson) return false;
      return true;
    });
    freshPool = shuffle(freshPool).sort(function (a, b) {
      return (a.level - b.level) || ((a.lesson || 0) - (b.lesson || 0));
    });
    var fresh = freshPool.slice(0, cap);

    var items = [];
    var max = Math.max(due.length, fresh.length);
    for (var i = 0; i < max; i++) {
      if (due[i]) items.push(makeItem(due[i], false));
      if (fresh[i]) items.push(makeItem(fresh[i], true));
    }

    var free = false;
    if (items.length === 0) {
      free = true;
      var weak = words.filter(function (w) {
        var p = state.progress[w.id];
        return p && p.box < 5;
      });
      var pool = weak.length ? weak : words;
      shuffle(pool).slice(0, 8).forEach(function (w) { items.push(makeItem(w, false)); });
    }
    return { items: items, free: free };
  }

  function beginSession() {
    var built = buildSession();
    if (!built.items.length) { toast('词库还是空的，先去设置里加几个词吧'); return; }
    if (built.free && !canFreePractice()) {
      toast('今天已经练得够多啦，明天再来吧');
      return;
    }
    session = {
      queue: built.items,
      idx: 0,
      planned: built.items.length,
      free: built.free,
      correctCount: 0,
      introduced: new Set(),
      bricks: 0,
      locked: false,
      token: Date.now()
    };
    document.body.classList.add('in-session');
    byId('feedbackBar').classList.add('hidden');
    byId('sessionBricks').textContent = '0';
    showScreen('learn');
    updateBricks();
    renderCurrent();
  }

  function renderCurrent() {
    if (!session) return;
    if (session.idx >= session.queue.length) { finishSession(); return; }
    var item = session.queue[session.idx];
    session.locked = false;
    byId('feedbackBar').classList.add('hidden');
    byId('feedbackBar').innerHTML = '';
    var pct = Math.min(99, Math.round(session.idx / Math.max(1, session.planned) * 100));
    byId('learnBar').style.width = pct + '%';
    if (item.isNew && !item.taught) renderTeach(item);
    else renderQuestion(item);
    var body = byId('learnBody');
    body.scrollTop = 0;
  }

  function renderTeach(item) {
    var w = item.word;
    session.introduced.add(w.id);
    byId('learnBody').innerHTML =
      '<div class="teach-card">' +
      '<div class="teach-tag">' + (w.lesson ? '第 ' + w.lesson + ' 课 · ' : '') + '新朋友</div>' +
      '<div class="teach-emoji">' + escapeHtml(w.emoji || '🧩') + '</div>' +
      '<div class="teach-word">' + escapeHtml(w.en) + '</div>' +
      '<div class="teach-zh">' + escapeHtml(w.zh) + '</div>' +
      '<button class="speak-btn" id="btnTeachSpeak" aria-label="听发音">🔊</button>' +
      '<button class="btn primary big" id="btnKnowIt">记住啦，考考我</button>' +
      '</div>';
    byId('btnTeachSpeak').addEventListener('click', function () { speak(w.en); });
    byId('btnKnowIt').addEventListener('click', function () {
      item.taught = true;
      renderQuestion(item);
    });
    setTimeout(function () { speak(w.en); }, 260);
  }

  function chooseType(item) {
    var w = item.word;
    var p = state.progress[w.id];
    var box = p ? p.box : 0;
    if (item.isNew) return 'recognition';
    var spellable = /^[A-Za-z]+$/.test(w.en) && w.en.length >= 3 && w.en.length <= 10;
    if (box >= 2 && spellable && Math.random() < 0.6) return 'spelling';
    if (box >= 1 && Math.random() < 0.55) return 'listening';
    return 'recognition';
  }

  function makeChoices(word, type) {
    var field = type === 'recognition' ? 'en' : 'zh';
    var correct = word[field];
    var pool = allWords().filter(function (w) { return w.id !== word.id; });
    var same = pool.filter(function (w) { return w.cat === word.cat; });
    var seen = new Set([correct]);
    var chosen = [];
    function eligible(w) {
      // 听音选义时，同形同音的另一个义项不能当干扰项，否则答案不唯一
      if (type === 'listening' && w.en.toLowerCase() === word.en.toLowerCase()) return false;
      return true;
    }
    function addFrom(arr) {
      var list = shuffle(arr);
      for (var i = 0; i < list.length && chosen.length < 3; i++) {
        if (!eligible(list[i])) continue;
        var v = list[i][field];
        if (!seen.has(v)) { seen.add(v); chosen.push(v); }
      }
    }
    addFrom(same);
    if (chosen.length < 3) addFrom(pool);
    return shuffle([correct].concat(chosen));
  }

  function renderQuestion(item) {
    session.locked = false;
    var w = item.word;
    var type = chooseType(item);
    if (type === 'spelling') renderSpelling(item);
    else if (type === 'listening') renderListening(item);
    else renderRecognition(item);
  }

  function renderRecognition(item) {
    var w = item.word;
    var opts = makeChoices(w, 'recognition');
    byId('learnBody').innerHTML =
      '<div class="question-card">' +
      '<div class="q-top"><span class="q-type">看中文</span><span class="q-badge">选出英文</span></div>' +
      '<div class="q-prompt">' +
      '<div class="q-emoji">' + escapeHtml(w.emoji || '🧩') + '</div>' +
      '<div class="q-zh">' + escapeHtml(w.zh) + '</div>' +
      '<div class="q-sub">这个词的英文是？</div>' +
      '</div>' +
      '<div class="options">' + opts.map(function (v) {
        return '<button class="option" data-correct="' + (v === w.en ? '1' : '0') + '">' + escapeHtml(v) + '</button>';
      }).join('') + '</div>' +
      '</div>';
    bindChoice(item);
  }

  function renderListening(item) {
    var w = item.word;
    var opts = makeChoices(w, 'listening');
    byId('learnBody').innerHTML =
      '<div class="question-card">' +
      '<div class="q-top"><span class="q-type">听一听</span><span class="q-badge">选出中文意思</span></div>' +
      '<div class="q-prompt q-audio-only">' +
      '<button class="speak-btn big" id="btnReplay" aria-label="再听一次">🔊</button>' +
      '<div class="q-sub">点喇叭可以再听一次</div>' +
      '</div>' +
      '<div class="options">' + opts.map(function (v) {
        return '<button class="option" data-correct="' + (v === w.zh ? '1' : '0') + '">' + escapeHtml(v) + '</button>';
      }).join('') + '</div>' +
      '</div>';
    byId('btnReplay').addEventListener('click', function () { speak(w.en); });
    bindChoice(item);
    setTimeout(function () { speak(w.en); }, 300);
  }

  function bindChoice(item) {
    $$('.option', byId('learnBody')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!session || session.locked) return;
        var good = btn.dataset.correct === '1';
        $$('.option', byId('learnBody')).forEach(function (b) {
          b.disabled = true;
          if (b !== btn) b.classList.add('dim');
        });
        if (good) {
          btn.classList.remove('dim');
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          var right = $$('.option', byId('learnBody')).find(function (b) { return b.dataset.correct === '1'; });
          if (right) { right.classList.remove('dim'); right.classList.add('correct'); }
        }
        commitAnswer(item, good, btn);
      });
    });
  }

  function renderSpelling(item) {
    var w = item.word;
    var letters = w.en.toLowerCase().split('');
    var tiles = shuffle(letters.map(function (ch, i) { return { ch: ch, id: i }; }));
    var answer = []; // tile indices, in order
    var used = new Set();

    byId('learnBody').innerHTML =
      '<div class="question-card">' +
      '<div class="q-top"><span class="q-type">拼一拼</span><span class="q-badge">' + letters.length + ' 个字母</span></div>' +
      '<div class="q-prompt">' +
      '<div class="q-emoji">' + escapeHtml(w.emoji || '🧩') + '</div>' +
      '<div class="q-zh">' + escapeHtml(w.zh) + '</div>' +
      '<button class="speak-btn small" id="btnSpellSpeak" aria-label="听发音">🔊</button>' +
      '</div>' +
      '<div class="spell-slots" id="spellSlots"></div>' +
      '<div class="spell-tiles" id="spellTiles"></div>' +
      '<div class="spell-actions">' +
      '<button class="btn soft" id="btnSpellBack">删一个</button>' +
      '<button class="btn primary" id="btnSpellCheck">检查</button>' +
      '</div>' +
      '<div class="spell-hint" id="spellHint">按顺序点字母，拼好后点检查</div>' +
      '</div>';

    var slotsEl = byId('spellSlots');
    var tilesEl = byId('spellTiles');
    var hintEl = byId('spellHint');

    function paintSlots() {
      var html = '';
      for (var i = 0; i < letters.length; i++) {
        var ch = answer[i] !== undefined ? tiles[answer[i]].ch : '';
        html += '<div class="spell-slot' + (ch ? ' filled' : '') + '">' + escapeHtml(ch) + '</div>';
      }
      slotsEl.innerHTML = html;
    }

    function paintTiles() {
      tilesEl.innerHTML = tiles.map(function (t, i) {
        return '<button class="spell-tile' + (used.has(i) ? ' used' : '') + '" data-i="' + i + '">' + escapeHtml(t.ch) + '</button>';
      }).join('');
      $$('.spell-tile', tilesEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!session || session.locked) return;
          var i = Number(btn.dataset.i);
          if (used.has(i) || answer.length >= letters.length) return;
          used.add(i);
          answer.push(i);
          hintEl.textContent = '按顺序点字母，拼好后点检查';
          paintSlots();
          paintTiles();
        });
      });
    }

    function check() {
      if (!session || session.locked) return;
      if (answer.length < letters.length) {
        hintEl.textContent = '还差 ' + (letters.length - answer.length) + ' 个字母';
        slotsEl.classList.add('shake');
        setTimeout(function () { slotsEl.classList.remove('shake'); }, 420);
        return;
      }
      var built = answer.map(function (i) { return tiles[i].ch; }).join('');
      var good = built === letters.join('');
      if (!good) {
        slotsEl.classList.add('shake');
        setTimeout(function () { slotsEl.classList.remove('shake'); }, 420);
      }
      commitAnswer(item, good, slotsEl);
    }

    byId('btnSpellSpeak').addEventListener('click', function () { speak(w.en); });
    byId('btnSpellBack').addEventListener('click', function () {
      if (!session || session.locked) return;
      var last = answer.pop();
      if (last !== undefined) used.delete(last);
      paintSlots();
      paintTiles();
    });
    byId('btnSpellCheck').addEventListener('click', check);

    paintSlots();
    paintTiles();
    setTimeout(function () { speak(w.en); }, 300);
  }

  function commitAnswer(item, good, sourceEl) {
    if (!session || session.locked) return;
    session.locked = true;
    if (good) {
      session.correctCount++;
      awardBrick(sourceEl);
      if (!session.free) gradeWord(item.word, true);
      sfxCorrect();
      showFeedback(true, item, nextQuestion);
    } else {
      if (!session.free) gradeWord(item.word, false);
      sfxWrong();
      item.retries = (item.retries || 0) + 1;
      if (item.retries <= 1) {
        session.queue.push({ word: item.word, isNew: false, taught: true, retries: item.retries });
      }
      showFeedback(false, item, nextQuestion);
    }
  }

  function awardBrick(sourceEl) {
    state.bricks++;
    session.bricks++;
    state.stats.correct = (state.stats.correct || 0) + 1;
    state.stats.bricksEarned = (state.stats.bricksEarned || 0) + 1;
    save();
    updateBricks();
    flyBrick(sourceEl);
  }

  function flyBrick(fromEl) {
    if (!fromEl || !fromEl.getBoundingClientRect) return;
    var targetEl = document.body.classList.contains('in-session')
      ? byId('sessionBricks').parentElement
      : byId('brickChip');
    var target = targetEl.getBoundingClientRect();
    var from = fromEl.getBoundingClientRect();
    if (!target.width) return;
    var b = document.createElement('div');
    b.className = 'flying-brick';
    b.textContent = '🧱';
    b.style.left = (from.left + from.width / 2) + 'px';
    b.style.top = (from.top + from.height / 2) + 'px';
    document.body.appendChild(b);
    var dx = target.left + target.width / 2 - (from.left + from.width / 2);
    var dy = target.top + target.height / 2 - (from.top + from.height / 2);
    b.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.6)', opacity: 0.2 }
    ], { duration: 620, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = function () {
      b.remove();
      var chip = byId('brickChip');
      chip.classList.add('just-gained');
      setTimeout(function () { chip.classList.remove('just-gained'); }, 500);
    };
  }

  function showFeedback(good, item, onNext) {
    var bar = byId('feedbackBar');
    var w = item.word;
    bar.className = 'feedback-bar ' + (good ? 'good' : 'bad');
    if (good) {
      bar.innerHTML = '<div class="fb-emoji">🎉</div>' +
        '<div class="fb-text"><div class="fb-title">太棒了！+1 🧱</div>' +
        '<div class="fb-sub">' + escapeHtml(w.en) + ' · ' + escapeHtml(w.zh) + '</div></div>' +
        '<button class="btn" id="fbNext">继续</button>';
    } else {
      bar.innerHTML = '<div class="fb-emoji">🌱</div>' +
        '<div class="fb-text"><div class="fb-title">没关系，再记一次</div>' +
        '<div class="fb-sub">正确答案：<b>' + escapeHtml(w.en) + '</b> · ' + escapeHtml(w.zh) + '</div></div>' +
        '<button class="btn soft" id="fbNext">记住了</button>';
    }
    bar.classList.remove('hidden');
    var done = false;
    var tok = session ? session.token : null;
    function go() {
      if (done) return;
      if (!session || session.token !== tok) return;
      done = true;
      onNext();
    }
    byId('fbNext').addEventListener('click', go);
    if (good) {
      setTimeout(function () { speak(w.en); }, 280);
      setTimeout(go, 1300);
    } else {
      setTimeout(function () { speak(w.en); }, 260);
    }
  }

  function nextQuestion() {
    if (!session) return;
    session.locked = false;
    byId('feedbackBar').classList.add('hidden');
    byId('feedbackBar').innerHTML = '';
    session.idx++;
    renderCurrent();
  }

  function gradeWord(word, good) {
    var now = Date.now();
    var p = state.progress[word.id];
    if (!p) {
      p = state.progress[word.id] = {
        box: 0, due: now, firstSeen: todayKey(), lastSeen: '',
        seen: 0, correct: 0, wrong: 0
      };
    }
    p.seen = (p.seen || 0) + 1;
    p.lastSeen = todayKey();
    if (good) {
      p.correct = (p.correct || 0) + 1;
      p.box = Math.min(5, (p.box || 0) + 1);
      p.due = now + INTERVALS[p.box];
    } else {
      p.wrong = (p.wrong || 0) + 1;
      p.box = Math.max(0, (p.box || 0) - 1);
      p.due = now + INTERVALS[0];
    }
    save();
  }

  function finishSession() {
    if (!session) return;
    var s = session;
    var key = todayKey();
    if (state.stats.days.indexOf(key) < 0) state.stats.days.push(key);
    state.stats.sessions = (state.stats.sessions || 0) + 1;
    if (s.free) {
      if (state.stats.extraDate !== key) {
        state.stats.extraDate = key;
        state.stats.extraCount = 0;
      }
      state.stats.extraCount = (state.stats.extraCount || 0) + 1;
    }
    save();
    document.body.classList.remove('in-session');

    byId('sumCorrect').textContent = s.correctCount;
    byId('sumBricks').textContent = s.bricks;
    byId('sumNew').textContent = s.introduced.size;
    byId('summaryEmoji').textContent = s.correctCount > 0 ? '🎉' : '🌙';
    byId('summaryTitle').textContent = s.correctCount > 0 ? '今天的小屋又亮了一点' : '慢慢来，小屋不会跑';

    var msg;
    if (s.free) msg = '这是自由练习，答对的词也会变成砖块。';
    else if (s.correctCount === 0) msg = '没关系，明天它们还会来找你玩。';
    else if (s.introduced.size > 0) msg = '认识了 ' + s.introduced.size + ' 个新朋友，去小屋看看还缺什么吧。';
    else msg = '复习做得很稳，小屋又舒服了一点。';
    byId('summaryMsg').textContent = msg;

    var again = hasWorkLeft() || (s.free ? canFreePractice() : true);
    byId('btnSummaryAgain').classList.toggle('hidden', !again);

    session = null;
    byId('feedbackBar').classList.add('hidden');
    showScreen('summary');
    renderHome();
    confetti(s.correctCount > 0 ? 76 : 30);
  }

  function quitSession() {
    if (!session) { showScreen('home'); renderHome(); return; }
    if (session.idx > 0) {
      if (!window.confirm('先不学了吗？已经赚到的砖块会保存下来。')) return;
    }
    session = null;
    document.body.classList.remove('in-session');
    byId('feedbackBar').classList.add('hidden');
    showScreen('home');
    renderHome();
  }

  /* ---------------- 家具仓库 ---------------- */
  function renderInventory() {
    var grid = byId('inventoryGrid');
    if (!state.owned.length) {
      grid.innerHTML = '<div class="inventory-empty">还没有家具，先去家具店看看吧。</div>';
      return;
    }
    var placedIds = state.placed.map(function (p) { return p.item; });
    grid.innerHTML = state.owned.map(function (id) {
      var f = furnMap[id];
      if (!f) return '';
      var placed = placedIds.indexOf(id) >= 0;
      return '<div class="inventory-item' + (placed ? ' placed' : '') + '" data-inv="' + id + '">' +
        (placed ? '<span class="inv-check">✓</span>' : '') +
        '<div class="inv-emoji">' + f.emoji + '</div>' +
        '<div class="inv-name">' + escapeHtml(f.name) + '</div>' +
        '</div>';
    }).join('');
    $$('.inventory-item', grid).forEach(function (el) {
      bindInventoryItem(el, el.dataset.inv);
    });
  }

  function bindInventoryItem(el, itemId) {
    var item = furnMap[itemId];
    if (!item) return;
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      var startX = e.clientX, startY = e.clientY;
      var moved = false;
      var ghost = null;

      function move(ev) {
        if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 7) {
          moved = true;
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.textContent = item.emoji;
          document.body.appendChild(ghost);
          el.style.opacity = '0.45';
        }
        if (ghost) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
        }
      }

      function up(ev) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        el.style.opacity = '';
        if (ghost) ghost.remove();
        var rect = byId('room').getBoundingClientRect();
        var inside = ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
        if (moved && inside) {
          closeSheet();
          showScreen('home');
          placeItem(itemId, (ev.clientX - rect.left) / rect.width * 100, (ev.clientY - rect.top) / rect.height * 100);
        } else if (!moved) {
          enterPlacement(itemId);
        }
      }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  function openSheet() {
    renderInventory();
    byId('inventorySheet').classList.add('open');
    byId('sheetBackdrop').classList.remove('hidden');
  }

  function closeSheet() {
    byId('inventorySheet').classList.remove('open');
    byId('sheetBackdrop').classList.add('hidden');
  }

  /* ---------------- 单词本 ---------------- */
  function wordStatus(w) {
    var p = state.progress[w.id];
    if (!p) return { key: 'new', label: '新词' };
    if (p.box >= 5) return { key: 'mastered', label: '已掌握' };
    if (p.due <= Date.now()) return { key: 'learning', label: '今天复习' };
    return { key: 'learning', label: '学习中' };
  }

  function renderWordbook() {
    var words = allWords();
    var newCount = 0, learning = 0, mastered = 0;
    words.forEach(function (w) {
      var st = wordStatus(w);
      if (st.key === 'new') newCount++;
      else if (st.key === 'mastered') mastered++;
      else learning++;
    });
    byId('wordbookStats').innerHTML =
      '<div class="stat"><b>' + newCount + '</b><span>新词</span></div>' +
      '<div class="stat"><b>' + learning + '</b><span>学习中</span></div>' +
      '<div class="stat"><b>' + mastered + '</b><span>已掌握</span></div>';

    var q = wordQuery.trim().toLowerCase();
    var list = words.filter(function (w) {
      var st = wordStatus(w);
      if (wordFilter === 'new' && st.key !== 'new') return false;
      if (wordFilter === 'learning' && st.key !== 'learning') return false;
      if (wordFilter === 'mastered' && st.key !== 'mastered') return false;
      if (q && w.en.toLowerCase().indexOf(q) < 0 && w.zh.indexOf(q) < 0) return false;
      return true;
    });

    if (!list.length) {
      byId('wordList').innerHTML = '<div class="empty-state">这里还没有单词。</div>';
      return;
    }

    byId('wordList').innerHTML = list.map(function (w) {
      var st = wordStatus(w);
      var p = state.progress[w.id];
      var dueText = '';
      if (p && p.box > 0 && p.box < 5) {
        var d = daysUntil(p.due);
        dueText = d === 0 ? '该复习啦' : (d + ' 天后复习');
      }
      var action = st.key === 'mastered'
        ? ''
        : '<button class="word-btn known" data-known="' + w.id + '">已掌握</button>';
      var lessonText = w.lesson ? '第' + w.lesson + '课' : '';
      return '<div class="word-row">' +
        '<div class="word-emoji">' + escapeHtml(w.emoji || '🧩') + '</div>' +
        '<div class="word-main">' +
        '<div class="word-en">' + escapeHtml(w.en) + '</div>' +
        '<div class="word-zh">' + escapeHtml(w.zh) + (lessonText ? ' · ' + lessonText : '') + (dueText ? ' · ' + dueText : '') + '</div>' +
        '</div>' +
        '<div class="word-side">' +
        '<button class="speak-btn small" data-speak="' + w.id + '" aria-label="听发音">🔊</button>' +
        '<span class="badge ' + st.key + '">' + st.label + '</span>' +
        action +
        '</div>' +
        '</div>';
    }).join('');
  }

  function markKnown(id) {
    var w = wordMap[id];
    if (!w) return;
    var p = state.progress[id];
    if (!p) {
      state.progress[id] = {
        box: 5, due: Date.now() + INTERVALS[5], firstSeen: todayKey(),
        lastSeen: todayKey(), seen: 0, correct: 0, wrong: 0
      };
    } else {
      p.box = 5;
      p.due = Date.now() + INTERVALS[5];
      p.lastSeen = todayKey();
    }
    save();
    renderWordbook();
    renderHome();
    sfxPop();
    toast(w.en + ' 标为已掌握');
  }

  /* ---------------- 设置 / 导入导出 ---------------- */
  function renderSettings() {
    byId('newPerDay').value = state.settings.newPerDay;
    byId('newPerDayVal').textContent = state.settings.newPerDay;
    byId('startLesson').value = state.settings.startLesson;
    byId('startLessonVal').textContent = state.settings.startLesson;
    byId('themeRow').innerHTML = themeSwatchHtml();
    byId('houseName').value = state.houseName;
  }

  function parseWords(text) {
    var existing = {};
    allWords().forEach(function (w) { existing[w.en.toLowerCase()] = true; });
    var out = [];
    text.split(/\n+/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var parts = trimmed.split(/[,，\t|]/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length === 1) {
        var m = trimmed.match(/^([A-Za-z][A-Za-z' -]*?)\s+([^A-Za-z0-9].*)$/);
        if (m) parts = [m[1].trim(), m[2].trim()];
      }
      var en = (parts[0] || '').replace(/\s+/g, ' ');
      var zh = parts[1] || '';
      var emoji = parts[2] || '🧩';
      if (!/^[A-Za-z][A-Za-z' -]*$/.test(en)) return;
      if (!zh) return;
      if (existing[en.toLowerCase()]) return;
      existing[en.toLowerCase()] = true;
      out.push({
        id: 'custom_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5),
        en: en, zh: zh, emoji: emoji, cat: '自定义', level: 2, custom: true
      });
    });
    return out;
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'word-house-backup.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1200);
    toast('备份文件已经导出');
  }

  function importDataFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        if (!obj || typeof obj !== 'object' || !obj.progress) throw new Error('bad');
        if (!window.confirm('导入会覆盖现在的进度，确定吗？')) return;
        state = normalizeState(obj);
        save();
        refreshWordMap();
        renderHome();
        renderShop();
        renderWordbook();
        renderSettings();
        renderHouseName();
        applyTheme();
        applyLights();
        byId('sky').className = 'sky ' + state.sky;
        updateClock();
        toast('备份恢复好啦');
      } catch (e) {
        toast('这个文件看起来不是小屋的备份');
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- 彩纸 ---------------- */
  var confettiRaf = null;
  function confetti(count) {
    var canvas = byId('confetti');
    if (!canvas) return;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    canvas.classList.remove('hidden');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#F6C85F', '#F5A97F', '#7FAE7A', '#E88CA5', '#8FB8E8', '#C97B54', '#B79BE0'];
    var cx = window.innerWidth / 2, cy = window.innerHeight * 0.33;
    var parts = [];
    for (var i = 0; i < (count || 70); i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 2 + Math.random() * 8;
      parts.push({
        x: cx + (Math.random() - 0.5) * 90,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        w: 5 + Math.random() * 6,
        h: 7 + Math.random() * 8,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        c: colors[i % colors.length]
      });
    }
    var start = performance.now();
    function frame(t) {
      var elapsed = t - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var alive = false;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.vy += 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.vx *= 0.995;
        var alpha = Math.max(0, 1 - elapsed / 1800);
        if (alpha > 0 && p.y < window.innerHeight + 30) alive = true;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < 1800 && alive) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        canvas.classList.add('hidden');
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        confettiRaf = null;
      }
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  /* ---------------- 时钟 ---------------- */
  function updateClock() {
    var d = new Date();
    var m = d.getMinutes();
    var h = d.getHours() % 12;
    var mh = byId('minuteHand'), hh = byId('hourHand');
    if (mh) mh.style.transform = 'rotate(' + (m * 6) + 'deg)';
    if (hh) hh.style.transform = 'rotate(' + (h * 30 + m * 0.5) + 'deg)';
  }

  function clockToast() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    toast('现在是 ' + h + ' 点' + (m ? ' ' + m + ' 分' : '整'));
    sfxPop();
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindStatic() {
    byId('btnSettings').addEventListener('click', function () {
      renderSettings();
      showScreen('settings');
    });

    $$('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () {
        showScreen('home');
        renderHome();
      });
    });

    byId('btnStart').addEventListener('click', beginSession);
    byId('btnShop').addEventListener('click', function () {
      renderShop();
      showScreen('shop');
    });
    byId('btnDecorate').addEventListener('click', openSheet);
    byId('btnWordbook').addEventListener('click', function () {
      renderWordbook();
      showScreen('wordbook');
    });

    byId('btnQuitLearn').addEventListener('click', quitSession);
    byId('btnSummaryHome').addEventListener('click', function () {
      showScreen('home');
      renderHome();
    });
    byId('btnSummaryAgain').addEventListener('click', beginSession);

    byId('btnCloseSheet').addEventListener('click', closeSheet);
    byId('sheetBackdrop').addEventListener('click', closeSheet);

    byId('btnOnboardStart').addEventListener('click', function () {
      var nameInput = byId('houseNameInput');
      state.houseName = (nameInput.value.trim() || 'MY ROOM').slice(0, 12);
      state.onboarded = true;
      save();
      renderHouseName();
      byId('onboardBackdrop').classList.add('hidden');
      renderHome();
      toast('先点窗户和串灯玩玩，再去家具店看看');
    });

    byId('shopFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-zone]');
      if (!b) return;
      shopZone = b.dataset.zone;
      $$('.chip', byId('shopFilters')).forEach(function (c) { c.classList.toggle('active', c === b); });
      renderShop();
    });

    byId('shopGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-buy]');
      if (!btn) return;
      var item = furnMap[btn.dataset.buy];
      if (!item) return;
      if (state.owned.indexOf(item.id) >= 0) enterPlacement(item.id);
      else buyItem(item);
    });

    byId('wordFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b) return;
      wordFilter = b.dataset.filter;
      $$('.chip', byId('wordFilters')).forEach(function (c) { c.classList.toggle('active', c === b); });
      renderWordbook();
    });

    byId('wordSearch').addEventListener('input', function (e) {
      wordQuery = e.target.value;
      renderWordbook();
    });

    byId('wordList').addEventListener('click', function (e) {
      var sp = e.target.closest('[data-speak]');
      if (sp) {
        var w = wordMap[sp.dataset.speak];
        if (w) speak(w.en);
        return;
      }
      var known = e.target.closest('[data-known]');
      if (known) markKnown(known.dataset.known);
    });

    byId('newPerDay').addEventListener('input', function (e) {
      var v = clamp(Number(e.target.value) || 8, 4, 15);
      state.settings.newPerDay = v;
      byId('newPerDayVal').textContent = v;
      save();
      renderHome();
    });

    byId('houseName').addEventListener('input', function (e) {
      var v = e.target.value.slice(0, 12);
      state.houseName = v.trim() || 'MY ROOM';
      byId('doorSign').textContent = state.houseName;
      save();
    });

    byId('startLesson').addEventListener('input', function (e) {
      var v = clamp(Number(e.target.value) || 1, 1, 35);
      state.settings.startLesson = v;
      byId('startLessonVal').textContent = v;
      save();
      renderHome();
    });

    ['themeRow', 'onboardThemes'].forEach(function (id) {
      var c = byId(id);
      if (!c) return;
      c.addEventListener('click', function (e) {
        var b = e.target.closest('[data-theme-id]');
        if (!b) return;
        state.theme = b.dataset.themeId;
        applyTheme();
        save();
        sfxPop();
      });
    });

    byId('btnImport').addEventListener('click', function () {
      var added = parseWords(byId('importText').value);
      if (!added.length) {
        toast('没找到新单词，检查一下格式：apple,苹果,🍎');
        return;
      }
      state.customWords = state.customWords.concat(added);
      save();
      refreshWordMap();
      byId('importText').value = '';
      renderWordbook();
      renderHome();
      sfxPop();
      toast('加了 ' + added.length + ' 个新单词');
    });

    byId('btnExport').addEventListener('click', exportData);
    byId('btnImportFile').addEventListener('click', function () { byId('fileInput').click(); });
    byId('fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importDataFile(f);
      e.target.value = '';
    });
    byId('btnReset').addEventListener('click', function () {
      if (!window.confirm('确定要重新开始吗？所有进度都会清空。')) return;
      if (!window.confirm('再确认一次：真的要清空小屋吗？')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
      window.location.reload();
    });

    byId('btnRemoveItem').addEventListener('click', removeSelected);

    byId('window').addEventListener('click', function () {
      var order = ['day', 'sunset', 'night'];
      var next = order[(order.indexOf(state.sky) + 1) % 3];
      setSky(next);
      sfxPop();
      dismissHint();
      toast(next === 'day' ? '天亮了 ☀️' : next === 'sunset' ? '太阳要落山了 🌇' : '天黑了，星星出来了 🌙');
    });

    byId('stringLights').addEventListener('click', function () {
      state.lights = !state.lights;
      applyLights();
      save();
      sfxPop();
      dismissHint();
      toast(state.lights ? '灯亮啦 ✨' : '灯关掉了 🌙');
    });

    byId('lightSwitch').addEventListener('click', function (e) {
      e.stopPropagation();
      state.lights = !state.lights;
      applyLights();
      save();
      sfxPop();
      dismissHint();
      toast(state.lights ? '灯亮啦 ✨' : '灯关掉了 🌙');
    });

    byId('wallClock').addEventListener('click', function (e) {
      e.stopPropagation();
      clockToast();
    });

    byId('door').addEventListener('click', function (e) {
      e.stopPropagation();
      speak('door');
      toast('门：door 🚪');
      sfxPop();
    });

    var room = byId('room');
    room.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.room-item')) return;
      if (e.target.closest('#window') || e.target.closest('#stringLights') ||
        e.target.closest('#wallClock') || e.target.closest('#door') ||
        e.target.closest('#lightSwitch') || e.target.closest('#roomToolbar')) return;
      if (pendingPlace) {
        var rect = room.getBoundingClientRect();
        placeItem(pendingPlace,
          (e.clientX - rect.left) / rect.width * 100,
          (e.clientY - rect.top) / rect.height * 100);
        return;
      }
      clearSelection();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) updateClock();
    });
  }

  function setupResize() {
    var timer = null;
    function redraw() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (state) renderRoom();
      }, 160);
    }
    if (window.ResizeObserver) {
      try { new ResizeObserver(redraw).observe(byId('room')); } catch (e) { /* 忽略 */ }
    }
    window.addEventListener('resize', redraw);
    window.addEventListener('orientationchange', redraw);
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!ok) return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* 忽略 */ });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    state = loadState();
    buildFurnMap();
    refreshWordMap();
    bindStatic();
    renderThemeRows();
    applyTheme();
    applyLights();
    byId('sky').className = 'sky ' + state.sky;
    byId('room').dataset.sky = state.sky;
    renderHome();
    renderShop();
    renderWordbook();
    renderSettings();
    renderHouseName();
    updateClock();
    updateBricks();
    setInterval(updateClock, 20000);
    setupResize();
    registerSW();
    pickVoice();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
      setTimeout(pickVoice, 500);
    }
    setTimeout(function () { dismissHint(); }, 12000);
    if (!state.onboarded) {
      renderThemeRows();
      byId('onboardBackdrop').classList.remove('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
