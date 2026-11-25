'use strict';

/* =========================================================================
 * Shiny Frame Calculator for Pokémon Emerald
 * Author: Thiago Souza (https://theiagod.com). Built with AI assistance.
 * ========================================================================= */

// GBA: 16.78 MHz clock / 280,896 cycles per frame ≈ 59.7275 frames per second
const FPS = 16777216 / 280896;

const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
];

const MAX_RANGE = 20000000;  // frames searched in one go
const MAX_ROWS = 1000;       // rows rendered in the results table

/* ------------------------------------------------------------------ RNG */

// Gen 3 linear congruential RNG: seed = seed * 0x41C64E6D + 0x6073 (mod 2^32)
const nextSeed = (s) => (Math.imul(s, 0x41C64E6D) + 0x6073) >>> 0;

/**
 * Generate frames. `visit(frame, info)` is called for every frame in
 * [from, to]. Returning `false` from visit stops early.
 * Method 1: PID(lo), PID(hi), IV1, IV2
 * Method 2: PID(lo), PID(hi), --, IV1, IV2
 * Method 4: PID(lo), PID(hi), IV1, --, IV2
 */
function generate({ seed, from, to, tid, sid }, visit) {
  let s = seed >>> 0;
  for (let i = 0; i < from; i++) s = nextSeed(s);

  let t = s;
  t = nextSeed(t); let r1 = t >>> 16;
  t = nextSeed(t); let r2 = t >>> 16;
  t = nextSeed(t); let r3 = t >>> 16;
  t = nextSeed(t); let r4 = t >>> 16;
  t = nextSeed(t); let r5 = t >>> 16;
  const tsv = (tid ^ sid) >>> 0;

  for (let frame = from; frame <= to; frame++) {
    const sv = tsv ^ r1 ^ r2;
    const info = { r1, r2, r3, r4, r5, shiny: sv < 8 };
    if (visit(frame, info) === false) return;
    r1 = r2; r2 = r3; r3 = r4; r4 = r5;
    t = nextSeed(t); r5 = t >>> 16;
  }
}

function describe(info, method) {
  const pid = ((info.r2 << 16) | info.r1) >>> 0;
  let iv1, iv2;
  if (method === 2) { iv1 = info.r4; iv2 = info.r5; }
  else if (method === 4) { iv1 = info.r3; iv2 = info.r5; }
  else { iv1 = info.r3; iv2 = info.r4; }
  const ivs = [
    iv1 & 31, (iv1 >> 5) & 31, (iv1 >> 10) & 31,   // HP, Atk, Def
    (iv2 >> 5) & 31, (iv2 >> 10) & 31, iv2 & 31,   // SpA, SpD, Spe
  ];
  return { pid, nature: pid % 25, ability: (pid & 1) + 1, ivs };
}

/* -------------------------------------------------------------- helpers */

const $ = (id) => document.getElementById(id);

function parseId(text) {
  const v = String(text).trim();
  if (!v) return NaN;
  let n;
  if (/^0x[0-9a-f]+$/i.test(v)) n = parseInt(v, 16);
  else if (/^\d+$/.test(v)) n = parseInt(v, 10);
  else return NaN;
  return n >= 0 && n <= 65535 ? n : NaN;
}

function parseHexSeed(text) {
  const v = String(text).trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{1,8}$/i.test(v)) return NaN;
  return parseInt(v, 16) >>> 0;
}

function fmtDuration(seconds, decimals = 0) {
  const neg = seconds < 0;
  seconds = Math.abs(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  let s = decimals ? sec.toFixed(decimals) : String(Math.floor(sec));
  if (sec < 10) s = '0' + s;
  const body = h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  return (neg ? '-' : '') + body;
}

function hex(n, width) { return '0x' + n.toString(16).toUpperCase().padStart(width, '0'); }

function ivHtml(ivs) {
  return ivs.map((v) => {
    const cls = v === 31 ? 'iv31' : v === 0 ? 'iv0' : '';
    return cls ? `<span class="${cls}">${v}</span>` : String(v);
  }).join('/');
}

function setMsg(el, text, kind) {
  el.textContent = text;
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('sfc:' + key); return v === null ? fallback : v; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('sfc:' + key, String(value)); } catch { /* storage unavailable */ }
  },
};

/* --------------------------------------------------------- calculator UI */

const natureSelect = $('nature');
NATURES.forEach((n, i) => {
  const o = document.createElement('option');
  o.value = i; o.textContent = n;
  natureSelect.appendChild(o);
});

// Restore saved inputs
['tid', 'sid', 'method', 'nature', 'min-adv', 'max-adv', 'seed', 'target', 'pre', 'cal', 'volume', 'near-range']
  .forEach((id) => {
    const v = store.get(id, null);
    if (v !== null) $(id).value = v;
    $(id).addEventListener('change', () => store.set(id, $(id).value));
  });

function readCalcInputs() {
  const tid = parseId($('tid').value);
  const sid = parseId($('sid').value);
  const seed = parseHexSeed($('seed').value);
  const method = parseInt($('method').value, 10);
  const from = Math.max(0, parseInt($('min-adv').value, 10) || 0);
  const to = parseInt($('max-adv').value, 10);
  const nature = parseInt($('nature').value, 10);

  if (Number.isNaN(tid)) throw new Error('Enter a valid TID (0–65535).');
  if (Number.isNaN(sid)) throw new Error('Enter a valid SID (0–65535, decimal or hex like 0x0766).');
  if (Number.isNaN(seed)) throw new Error('The initial seed must be a hex number, e.g. 0 or 5A0.');
  if (!(to >= from)) throw new Error('"To frame" must be greater than or equal to "From frame".');
  if (to - from > MAX_RANGE) throw new Error(`Please search at most ${MAX_RANGE.toLocaleString()} frames at once.`);
  return { tid, sid, seed, method, from, to, nature };
}

function updateTsv() {
  const tid = parseId($('tid').value);
  const sid = parseId($('sid').value);
  $('tsv').textContent = Number.isNaN(tid) || Number.isNaN(sid)
    ? ''
    : `Your shiny value (TSV): ${(tid ^ sid) >> 3}`;
}
$('tid').addEventListener('input', updateTsv);
$('sid').addEventListener('input', updateTsv);
updateTsv();

$('calc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = $('calc-msg');
  let p;
  try { p = readCalcInputs(); }
  catch (err) { setMsg(msg, err.message, 'error'); return; }

  const rows = [];
  let total = 0;
  const t0 = performance.now();
  generate(p, (frame, info) => {
    if (!info.shiny) return;
    const d = describe(info, p.method);
    if (p.nature >= 0 && d.nature !== p.nature) return;
    total++;
    if (rows.length < MAX_ROWS) rows.push([frame, d]);
  });
  const ms = Math.round(performance.now() - t0);

  const tbody = $('results').querySelector('tbody');
  tbody.innerHTML = rows.map(([frame, d]) => `
    <tr>
      <td class="mono">${frame.toLocaleString()}</td>
      <td class="mono">${fmtDuration(frame / FPS, 1)}</td>
      <td>${NATURES[d.nature]}</td>
      <td class="mono">${ivHtml(d.ivs)}</td>
      <td>${d.ability}</td>
      <td class="mono">${hex(d.pid, 8)}</td>
      <td><button type="button" class="primary use" data-frame="${frame}">Use</button></td>
    </tr>`).join('');
  $('results-wrap').hidden = rows.length === 0;

  if (total === 0) {
    setMsg(msg, 'No shiny frames in this range. Try a bigger range or a different nature.', 'error');
  } else {
    const shown = total > rows.length ? ` (showing the first ${rows.length.toLocaleString()})` : '';
    setMsg(msg, `Found ${total.toLocaleString()} shiny frame${total === 1 ? '' : 's'}${shown} in ${ms} ms. Click "Use" to send a frame to the timer.`, 'ok');
  }
});

$('results').addEventListener('click', (e) => {
  const btn = e.target.closest('button.use');
  if (!btn) return;
  $('target').value = btn.dataset.frame;
  store.set('target', btn.dataset.frame);
  $('timer').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ------------------------------------------------------------- audio */

let audioCtx = null;
let masterGain = null;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx({ latencyHint: 'interactive' });
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat($('volume').value);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

$('volume').addEventListener('input', () => {
  if (masterGain) masterGain.gain.value = parseFloat($('volume').value);
  store.set('volume', $('volume').value);
});

/** Schedule a short tone at AudioContext time `when`. */
function tone(dest, when, freq, duration, type = 'square', level = 0.5) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(g).connect(dest);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

const sounds = {
  tick(dest, t) { tone(dest, t, 1200, 0.07, 'square', 0.35); },
  resetTick(dest, t) { tone(dest, t, 740, 0.08, 'square', 0.35); },
  hit(dest, t) {
    tone(dest, t, 1760, 0.35, 'square', 0.5);
    tone(dest, t, 880, 0.35, 'triangle', 0.4);
  },
  reset(dest, t) {
    tone(dest, t, 660, 0.18, 'sawtooth', 0.35);
    tone(dest, t + 0.2, 990, 0.3, 'sawtooth', 0.35);
  },
};

$('test-sound').addEventListener('click', () => {
  if (!ensureAudio()) return;
  const t = audioCtx.currentTime + 0.05;
  sounds.tick(masterGain, t);
  sounds.tick(masterGain, t + 0.5);
  sounds.hit(masterGain, t + 1.0);
});

/* ------------------------------------------------------------- timer */

const timerBox = $('timer-box');
const timeline = $('timeline');
const dot = $('dot');
const marks = [...timeline.querySelectorAll('.mark[data-k]')];

const run = {
  active: false,
  raf: 0,
  resetAt: 0,
  hitAt: 0,
  phase: 'idle',
  lastBeat: null,
  bus: null,
  wakeLock: null,
  doneTimer: 0,
};

function setPhase(phase, label, hint) {
  run.phase = phase;
  timerBox.dataset.phase = phase;
  $('phase-label').textContent = label;
  $('phase-hint').textContent = hint;
}

function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // restart CSS animation
  el.classList.add(cls);
}

const finalMarkLabel = timeline.querySelector('.mark.final span');

function resetTimeline(finalLabel = 'A') {
  timeline.classList.remove('active', 'pulsing');
  dot.style.left = '0%';
  marks.forEach((m) => m.classList.remove('lit'));
  finalMarkLabel.textContent = finalLabel;
  run.lastBeat = null;
}

/**
 * Drive the 5-second timeline for the current phase.
 * Returns true the first time the timeline becomes active in this phase.
 */
function updateTimeline(remaining) {
  if (remaining > 5000) return false;
  let started = false;
  if (!timeline.classList.contains('active')) {
    timeline.classList.add('active');
    started = true;
  }
  dot.style.left = ((1 - remaining / 5000) * 100).toFixed(2) + '%';
  // Last 4 seconds: the dot pulses continuously and beats on each second (3, 2, 1 left)
  timeline.classList.toggle('pulsing', remaining <= 4000);
  const beat = Math.ceil(remaining / 1000);
  if (run.lastBeat !== null && beat < run.lastBeat && beat <= 3) {
    retrigger(dot, 'beat');
    const m = marks.find((el) => Number(el.dataset.k) === beat);
    if (m) m.classList.add('lit');
  }
  run.lastBeat = beat;
  return started;
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) run.wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* not critical */ }
}

function releaseWakeLock() {
  try { if (run.wakeLock) run.wakeLock.release(); } catch { /* ignore */ }
  run.wakeLock = null;
}

function startTimer() {
  const target = parseInt($('target').value, 10);
  const cal = parseInt($('cal').value, 10) || 0;
  const pre = Math.max(0, parseFloat($('pre').value) || 0);

  if (!(target >= 0)) {
    setPhase('idle', 'Ready', 'Enter a target frame first (pick one from step 1).');
    $('target').focus();
    return;
  }
  const frames = target + cal;
  if (frames < 0) {
    setPhase('idle', 'Ready', 'Target + calibration is below zero. Check your calibration.');
    return;
  }

  clearTimeout(run.doneTimer);
  const duration = frames / FPS;           // seconds from soft reset to A press
  const now = performance.now();
  run.resetAt = now + pre * 1000;
  run.hitAt = run.resetAt + duration * 1000;
  run.lastBeat = null;
  run.active = true;

  // Schedule all sounds ahead of time on the audio clock (much more precise than setTimeout).
  const ctx = ensureAudio();
  if (ctx) {
    run.bus = ctx.createGain();
    run.bus.connect(masterGain);
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    const toAudio = (perfMs) => ctx.currentTime + (perfMs - performance.now()) / 1000 - latency;

    if (pre > 0) {
      for (let k = 3; k >= 1; k--) {
        const at = run.resetAt - k * 1000;
        if (at > now + 1) sounds.resetTick(run.bus, toAudio(at));
      }
      sounds.reset(run.bus, Math.max(ctx.currentTime, toAudio(run.resetAt)));
    }
    for (let k = 3; k >= 1; k--) {
      const at = run.hitAt - k * 1000;
      if (at > run.resetAt + 1) sounds.tick(run.bus, toAudio(at));
    }
    sounds.hit(run.bus, toAudio(run.hitAt));
  }

  requestWakeLock();
  resetTimeline(pre > 0 ? 'SR' : 'A');
  $('start').disabled = true;
  $('stop').disabled = false;
  $('hit').value = '';
  run.raf = requestAnimationFrame(tick);
}

function stopTimer(message) {
  cancelAnimationFrame(run.raf);
  clearTimeout(run.doneTimer);
  run.active = false;
  if (run.bus) { try { run.bus.disconnect(); } catch { /* ignore */ } run.bus = null; }
  releaseWakeLock();
  resetTimeline();
  $('start').disabled = false;
  $('stop').disabled = true;
  $('clock').textContent = '0:00.0';
  setPhase('idle', 'Ready', message || 'Press Start when you are ready.');
}

function tick() {
  if (!run.active) return;
  const now = performance.now();

  if (now < run.resetAt) {
    if (run.phase !== 'reset') {
      setPhase('reset', 'Get ready to soft reset', 'Soft reset on the beep: Start + Select + A + B');
    }
    const remaining = run.resetAt - now;
    $('clock').textContent = fmtDuration(remaining / 1000, 1);
    if (updateTimeline(remaining)) {
      $('phase-hint').textContent = 'Follow the dot, then soft reset on the last beep! (Start + Select + A + B)';
    }
  } else if (now < run.hitAt) {
    if (run.phase !== 'target') {
      if (run.phase === 'reset') {
        retrigger(timerBox, 'flash-reset');
        resetTimeline('A');
      }
      setPhase('target', 'Waiting for your frame', `Load your save, stand in front of the Pokémon and get ready to press A. Target: frame ${$('target').value}`);
    }
    const remaining = run.hitAt - now;
    $('clock').textContent = fmtDuration(remaining / 1000, 1);

    if (updateTimeline(remaining)) {
      $('phase-hint').textContent = 'Follow the dot, then press A on the last beep!';
    }
  } else {
    // Hit!
    dot.style.left = '100%';
    retrigger(dot, 'beat');
    marks.forEach((m) => m.classList.add('lit'));
    retrigger(timerBox, 'flash-hit');
    $('clock').textContent = '0:00.0';
    setPhase('hit', 'Now!', 'PRESS A!');
    run.active = false;
    releaseWakeLock();
    $('start').disabled = false;
    $('stop').disabled = true;
    run.doneTimer = setTimeout(() => {
      resetTimeline();
      setPhase('idle', 'Done', 'Not shiny? Check which frame you hit in step 3, then try again.');
    }, 2500);
    return;
  }
  run.raf = requestAnimationFrame(tick);
}

$('start').addEventListener('click', startTimer);
$('stop').addEventListener('click', () => stopTimer('Stopped.'));

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'select', 'textarea', 'button'].includes(tag)) return;
  e.preventDefault();
  if (run.active) stopTimer('Stopped.');
  else startTimer();
});

/* -------------------------------------------------------- calibration */

function showNearby() {
  const msg = $('cal-msg');
  let p;
  try { p = readCalcInputs(); }
  catch (err) { setMsg(msg, err.message, 'error'); return; }

  const target = parseInt($('target').value, 10);
  if (!(target >= 0)) { setMsg(msg, 'Set a target frame in step 2 first.', 'error'); return; }
  const range = Math.min(500, Math.max(5, parseInt($('near-range').value, 10) || 40));

  const rows = [];
  generate({ ...p, from: Math.max(0, target - range), to: target + range }, (frame, info) => {
    rows.push([frame, describe(info, p.method), info.shiny]);
  });

  $('near').querySelector('tbody').innerHTML = rows.map(([frame, d, shiny]) => {
    const off = frame - target;
    const cls = [off === 0 ? 'is-target' : '', shiny ? 'is-shiny' : ''].join(' ').trim();
    return `
      <tr class="${cls}" data-frame="${frame}">
        <td class="mono">${frame.toLocaleString()}</td>
        <td class="mono">${off > 0 ? '+' + off : off}</td>
        <td>${NATURES[d.nature]}</td>
        <td class="mono">${ivHtml(d.ivs)}</td>
        <td>${shiny ? '★ Shiny' : ''}</td>
      </tr>`;
  }).join('');
  $('near-wrap').hidden = false;
  setMsg(msg, 'Click the row that matches the Pokémon you got.', '');
  const targetRow = $('near').querySelector('tr.is-target');
  if (targetRow) targetRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

$('show-near').addEventListener('click', showNearby);

$('near').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-frame]');
  if (!tr) return;
  $('hit').value = tr.dataset.frame;
  setMsg($('cal-msg'), `Selected frame ${Number(tr.dataset.frame).toLocaleString()}. Click "Update calibration".`, '');
});

$('apply-cal').addEventListener('click', () => {
  const msg = $('cal-msg');
  const target = parseInt($('target').value, 10);
  const hit = parseInt($('hit').value, 10);
  if (!(target >= 0) || !(hit >= 0)) {
    setMsg(msg, 'Enter both the target frame (step 2) and the frame you hit.', 'error');
    return;
  }
  const diff = hit - target;
  if (diff === 0) {
    setMsg(msg, 'You hit your target frame. If it still is not shiny, double-check your TID, SID and method.', 'ok');
    return;
  }
  const oldCal = parseInt($('cal').value, 10) || 0;
  const newCal = oldCal - diff;
  $('cal').value = newCal;
  store.set('cal', newCal);
  const dir = diff > 0 ? `${diff} frame${diff === 1 ? '' : 's'} late` : `${-diff} frame${diff === -1 ? '' : 's'} early`;
  setMsg(msg, `You were ${dir}. Calibration changed from ${oldCal} to ${newCal}. Start the timer again!`, 'ok');
});
