/* Starfall Pact — an original 1v1 elemental card duel.
 * You are a sky cartographer; Vesk, the Hollow Star, is your rival.
 * Both duelists hold 30 life and a 48-card deck (24 original cards, two copies
 * each). Spend mana to play cards: strikes wound,
 * wards shield, leeches wound and mend, surges draw, tailwinds grant mana.
 * Reduce the rival to 0 life to win. Keyboard: 1-7 play, Enter ends turn,
 * R restarts, M mutes. Mouse: click a card, click End Turn.
 * Query params (for screenshots and self-play tests): ?scene=title|table|win|loss
 * stages that state through the same renderer; ?autoplay=1 plays both sides.
 */
'use strict';

/* ---------- seeded RNG (mulberry32) ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- elements & cards ---------- */
const ELEMENTS = {
  ember: { name: 'Ember', icon: '🔥' },
  tide: { name: 'Tide', icon: '💧' },
  thorn: { name: 'Thorn', icon: '🌿' },
  gale: { name: 'Gale', icon: '🌪️' },
};

// id, name, element, cost, dmg, ward, heal, draw, mana, text
const CARD_DEFS = [
  { id: 'cinder', name: 'Cinder Slash', el: 'ember', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'flame', name: 'Flame Lash', el: 'ember', cost: 3, dmg: 6, text: 'Deal 6 damage.' },
  { id: 'pyre', name: 'Pyre Burst', el: 'ember', cost: 6, dmg: 11, text: 'Deal 11 damage.' },
  { id: 'ashen', name: 'Ashen Guard', el: 'ember', cost: 2, ward: 6, text: 'Gain 6 shield.' },
  { id: 'blood', name: 'Blood Ember', el: 'ember', cost: 3, dmg: 3, heal: 4, text: 'Deal 3 damage. Heal 4.' },
  { id: 'kindle', name: 'Kindle', el: 'ember', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'tidecut', name: 'Tide Cut', el: 'tide', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'riptide', name: 'Riptide', el: 'tide', cost: 4, dmg: 7, text: 'Deal 7 damage.' },
  { id: 'maelstrom', name: 'Maelstrom', el: 'tide', cost: 6, dmg: 10, text: 'Deal 10 damage.' },
  { id: 'still', name: 'Still Water', el: 'tide', cost: 2, ward: 6, text: 'Gain 6 shield.' },
  { id: 'siphon', name: 'Siphon Tide', el: 'tide', cost: 3, dmg: 3, heal: 4, text: 'Deal 3 damage. Heal 4.' },
  { id: 'current', name: 'Deep Current', el: 'tide', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'thornwhip', name: 'Thorn Whip', el: 'thorn', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'briar', name: 'Briar Volley', el: 'thorn', cost: 3, dmg: 5, text: 'Deal 5 damage.' },
  { id: 'rootmaw', name: 'Rootmaw', el: 'thorn', cost: 5, dmg: 9, text: 'Deal 9 damage.' },
  { id: 'barkskin', name: 'Barkskin', el: 'thorn', cost: 2, ward: 7, text: 'Gain 7 shield.' },
  { id: 'sapbloom', name: 'Sap Bloom', el: 'thorn', cost: 3, dmg: 3, heal: 5, text: 'Deal 3 damage. Heal 5.' },
  { id: 'overgrowth', name: 'Overgrowth', el: 'thorn', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'galeslice', name: 'Gale Slice', el: 'gale', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'stormdive', name: 'Storm Dive', el: 'gale', cost: 4, dmg: 8, text: 'Deal 8 damage.' },
  { id: 'skyfall', name: 'Skyfall', el: 'gale', cost: 6, dmg: 12, text: 'Deal 12 damage.' },
  { id: 'windwall', name: 'Windwall', el: 'gale', cost: 2, ward: 5, text: 'Gain 5 shield.' },
  { id: 'zephyr', name: 'Zephyr Kiss', el: 'gale', cost: 3, dmg: 3, heal: 4, text: 'Deal 3 damage. Heal 4.' },
  { id: 'tailwind', name: 'Tailwind', el: 'gale', cost: 1, mana: 2, text: 'Gain 2 mana this turn.' },
];

const MAX_LIFE = 30;
const MAX_HAND = 7;
const MAX_MANA = 10;
const HAND_SIZE = 4;

/* ---------- sound (tiny WebAudio synth, no files) ---------- */
let audioCtx = null;
let muted = false;
function beep(freq, dur, type) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* audio is decoration; never break the game */ }
}
const sfx = {
  play: () => beep(520, 0.12, 'triangle'),
  hit: () => { beep(180, 0.18, 'sawtooth'); },
  heal: () => beep(660, 0.2, 'sine'),
  turn: () => beep(440, 0.1, 'sine'),
  win: () => { beep(523, 0.15, 'triangle'); setTimeout(() => beep(659, 0.15, 'triangle'), 140); setTimeout(() => beep(784, 0.3, 'triangle'), 280); },
  lose: () => { beep(392, 0.2, 'sawtooth'); setTimeout(() => beep(311, 0.35, 'sawtooth'), 180); },
};

/* ---------- state ---------- */
let rng = mulberry32((Date.now() % 2147483647) || 1);
let S = null; // game state

function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) deck.push({ ...def, uid: def.id + '-a' }, { ...def, uid: def.id + '-b' });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}

function freshSide() {
  return { life: MAX_LIFE, shield: 0, mana: 0, maxMana: 0, deck: [], hand: [], discard: [], score: 0, damageDealt: 0, cardsPlayed: 0 };
}

function newGame(seed) {
  rng = mulberry32(seed);
  S = {
    phase: 'play', turn: 1, busy: false, over: false,
    you: freshSide(), rival: freshSide(),
    log: [], arena: 'The stars are falling. Play a card.',
    seed: seed,
  };
  S.you.deck = buildDeck();
  S.rival.deck = buildDeck();
  for (let i = 0; i < HAND_SIZE; i++) { drawCard(S.you); drawCard(S.rival); }
  S.you.maxMana = 1; S.you.mana = 1;
  S.rival.maxMana = 1; S.rival.mana = 1;
  log('The duel begins. You hold the first move.', 'you');
  log('Vesk draws ' + S.rival.hand.length + ' cards and waits.', 'rival');
}

function drawCard(side) {
  if (side.hand.length >= MAX_HAND) return null;
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return null;
    side.deck = side.discard; side.discard = [];
    for (let i = side.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = side.deck[i]; side.deck[i] = side.deck[j]; side.deck[j] = t;
    }
  }
  const c = side.deck.pop();
  side.hand.push(c);
  return c;
}

function log(msg, cls) {
  S.log.unshift({ msg: msg, cls: cls || '' });
  if (S.log.length > 6) S.log.length = 6;
}

function applyDamage(target, amount, attacker) {
  let left = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, left);
    target.shield -= absorbed; left -= absorbed;
  }
  target.life = Math.max(0, target.life - left);
  attacker.damageDealt += amount;
  attacker.score += amount;
  return left;
}

/* Play a card from `side`'s hand at index `hi` against `foe`. Returns false if illegal. */
function playCard(side, foe, hi, whoLabel) {
  if (S.over || hi < 0 || hi >= side.hand.length) return false;
  const card = side.hand[hi];
  if (card.cost > side.mana) return false;
  side.mana -= card.cost;
  side.hand.splice(hi, 1);
  side.discard.push(card);
  side.cardsPlayed += 1;
  side.score += 2;
  let bits = [];
  if (card.dmg) {
    const dealt = applyDamage(foe, card.dmg, side);
    bits.push('deals ' + card.dmg + ' damage' + (foe.shield > 0 || dealt < card.dmg ? '' : ''));
    sfx.hit();
  }
  if (card.ward) { side.shield += card.ward; bits.push('gains ' + card.ward + ' shield'); }
  if (card.heal) { side.life = Math.min(MAX_LIFE, side.life + card.heal); bits.push('heals ' + card.heal); sfx.heal(); }
  if (card.draw) { const d1 = drawCard(side); const d2 = drawCard(side); bits.push('draws ' + ((d1 ? 1 : 0) + (d2 ? 1 : 0)) + ' cards'); }
  if (card.mana) { side.mana = Math.min(MAX_MANA, side.mana + card.mana); bits.push('gains ' + card.mana + ' mana'); }
  log(whoLabel + ' plays ' + card.name + ' — ' + bits.join(', ') + '.', whoLabel === 'You' ? 'you' : 'rival');
  S.arena = '<span class="big">' + card.name + '</span>' + ELEMENTS[card.el].icon + ' ' + card.text;
  sfx.play();
  checkEnd();
  return true;
}

function checkEnd() {
  if (S.over) return;
  if (S.rival.life <= 0) { endGame(true); return; }
  if (S.you.life <= 0) { endGame(false); return; }
}

function endGame(won) {
  S.over = true;
  S.phase = won ? 'win' : 'loss';
  if (won) { S.you.score += 50; sfx.win(); } else { sfx.lose(); }
  log(won ? 'Vesk falls. The last light is yours.' : 'Your chart burns out. Vesk claims the sky.', won ? 'you' : 'rival');
  render();
}

/* ---------- turns ---------- */
function endPlayerTurn() {
  if (S.over || S.busy || S.phase !== 'play') return;
  S.busy = true;
  log('You end your turn.', 'you');
  render();
  setTimeout(rivalTurn, 650);
}

function rivalTurn() {
  if (S.over) { S.busy = false; return; }
  S.rival.maxMana = Math.min(MAX_MANA, S.rival.maxMana + 1);
  S.rival.mana = S.rival.maxMana;
  drawCard(S.rival);
  S.arena = 'Vesk studies the falling stars…';
  render();
  let step = 0;
  const think = () => {
    if (S.over) { S.busy = false; return; }
    const pick = aiPick(S.rival, S.you);
    if (pick < 0 || step >= 4) {
      log('Vesk ends the turn.', 'rival');
      startPlayerTurn();
      return;
    }
    step++;
    playCard(S.rival, S.you, pick, 'Vesk');
    render();
    setTimeout(think, 750);
  };
  setTimeout(think, 700);
}

/* AI: lethal first, then survival, then best damage per mana. */
function aiPick(me, foe) {
  let best = -1; let bestVal = -1;
  for (let i = 0; i < me.hand.length; i++) {
    const c = me.hand[i];
    if (c.cost > me.mana) continue;
    let v = 0;
    if (c.dmg) {
      const lethal = foe.life - Math.max(0, c.dmg - foe.shield) <= 0;
      v = lethal ? 1000 : (c.dmg / c.cost) * 10;
    }
    if (c.ward) v = Math.max(v, me.life <= 12 ? 60 + c.ward : c.ward);
    if (c.heal) v = Math.max(v, me.life <= 15 ? 55 + c.heal : 20);
    if (c.draw) v = Math.max(v, me.hand.length <= 3 ? 45 : 15);
    if (c.mana) v = Math.max(v, 30);
    v += rng() * 2; // small tie-break variety
    if (v > bestVal) { bestVal = v; best = i; }
  }
  return best;
}

function startPlayerTurn() {
  if (S.over) { S.busy = false; return; }
  S.turn += 1;
  S.you.maxMana = Math.min(MAX_MANA, S.you.maxMana + 1);
  S.you.mana = S.you.maxMana;
  drawCard(S.you);
  S.arena = 'Turn ' + S.turn + '. The stars are falling. Play a card.';
  log('Turn ' + S.turn + ' — you draw a card (' + S.you.mana + ' mana).', 'you');
  sfx.turn();
  S.busy = false;
  render();
}

/* ---------- rendering ---------- */
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function cardElement(card, index, playable, onClick) {
  const e = el('div', 'card el-' + card.el + (playable ? ' playable' : ' unaffordable'));
  if (!playable && onClick) e.classList.add('disabled');
  const cost = el('span', 'cost', String(card.cost)); e.appendChild(cost);
  e.appendChild(el('span', 'el-icon', ELEMENTS[card.el].icon));
  e.appendChild(el('span', 'el-name', ELEMENTS[card.el].name));
  e.appendChild(el('div', 'cname', card.name));
  e.appendChild(el('div', 'ceffect', card.text));
  const atk = el('div', 'atk');
  atk.appendChild(el('b', null, card.dmg ? '⚔ ' + card.dmg : card.ward ? '🛡 ' + card.ward : '✦'));
  atk.appendChild(el('span', null, 'cost ' + card.cost));
  e.appendChild(atk);
  if (index !== null && index < 7) e.appendChild(el('span', 'key', String(index + 1)));
  if (onClick) e.addEventListener('click', () => onClick(index));
  return e;
}

function render() {
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  show('screen-title', S.phase === 'title');
  show('screen-table', S.phase === 'play');
  show('screen-end', S.phase === 'win' || S.phase === 'loss');
  if (S.phase === 'title') return;
  if (S.phase === 'win' || S.phase === 'loss') {
    const won = S.phase === 'win';
    $('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
    $('end-title').className = 'end-title ' + (won ? 'win' : 'loss');
    $('end-sub').textContent = won
      ? 'Vesk, the Hollow Star, bows. Your chart of the falling stars holds — the sky is yours.'
      : 'Vesk claims the last light. Your chart scatters — but every cartographer duels again.';
    $('stat-turns').textContent = String(S.turn);
    $('stat-played').textContent = String(S.you.cardsPlayed);
    $('stat-damage').textContent = String(S.you.damageDealt);
    $('stat-score').textContent = String(S.you.score);
    return;
  }
  // table
  $('turn-label').textContent = 'TURN ' + S.turn;
  $('phase-label').textContent = S.busy ? 'Vesk is thinking…' : 'Your move';
  const setLife = (prefix, side) => {
    $(prefix + '-life-fill').style.width = (side.life / MAX_LIFE * 100) + '%';
    $(prefix + '-life-text').textContent = '♥ ' + side.life + ' / ' + MAX_LIFE + (side.shield > 0 ? '   🛡 ' + side.shield : '');
    $(prefix + '-shield').textContent = side.shield > 0 ? '🛡 Shield ' + side.shield : '';
    $(prefix + '-deck').textContent = '🂠 Deck ' + side.deck.length + ' · Hand ' + side.hand.length;
    $(prefix + '-score').textContent = String(side.score);
  };
  setLife('you', S.you);
  setLife('rival', S.rival);
  // rival hand: face-down backs
  const rh = $('rival-hand'); rh.innerHTML = '';
  for (let i = 0; i < S.rival.hand.length; i++) {
    const b = el('div', 'card-back', '✦');
    rh.appendChild(b);
  }
  // player hand
  const yh = $('you-hand'); yh.innerHTML = '';
  S.you.hand.forEach((card, i) => {
    const playable = !S.busy && card.cost <= S.you.mana;
    yh.appendChild(cardElement(card, i, playable, (idx) => {
      if (S.busy || S.over) return;
      if (playCard(S.you, S.rival, idx, 'You')) render();
    }));
  });
  // arena + mana + log
  $('arena-text').innerHTML = S.arena;
  const pips = $('mana-pips'); pips.innerHTML = '';
  for (let i = 0; i < MAX_MANA; i++) {
    const p = el('span', 'pip' + (i < S.you.mana ? ' full' : ''));
    pips.appendChild(p);
  }
  $('mana-text').textContent = S.you.mana + ' / ' + S.you.maxMana + ' mana — turn ' + S.turn;
  $('btn-end').disabled = S.busy;
  const lg = $('log'); lg.innerHTML = '';
  for (const entry of S.log) lg.appendChild(el('div', entry.cls, entry.msg));
}

function showTitle() {
  S = { phase: 'title', turn: 0, busy: false, over: false, you: freshSide(), rival: freshSide(), log: [], arena: '', seed: 0 };
  render();
}

/* ---------- staged scenes for screenshots (same renderer, fixed seed) ---------- */
function stageTable() {
  newGame(20261122);
  // play a few scripted turns so the table looks lived-in
  S.turn = 4;
  S.you.maxMana = 4; S.you.mana = 3; S.rival.maxMana = 4; S.rival.mana = 2;
  S.you.life = 24; S.you.shield = 4; S.rival.life = 21; S.rival.shield = 0;
  S.you.score = 18; S.rival.score = 11;
  S.you.damageDealt = 14; S.rival.damageDealt = 8;
  S.you.cardsPlayed = 3; S.rival.cardsPlayed = 2;
  S.log = [
    { msg: 'You play Flame Lash — deals 6 damage.', cls: 'you' },
    { msg: 'Vesk plays Barkskin — gains 7 shield.', cls: 'rival' },
    { msg: 'You play Ashen Guard — gains 6 shield.', cls: 'you' },
    { msg: 'Vesk plays Riptide — deals 7 damage.', cls: 'rival' },
    { msg: 'Turn 4 — you draw a card (3 mana).', cls: 'you' },
  ];
  S.arena = '<span class="big">Turn 4</span>Your move — spend 3 mana, then end the turn.';
  render();
}

function stageEnd(won) {
  newGame(20261122);
  S.turn = 9;
  S.you.cardsPlayed = 14; S.rival.cardsPlayed = 12;
  S.you.damageDealt = won ? 34 : 22; S.rival.damageDealt = won ? 18 : 31;
  S.you.score = won ? 96 : 54; S.rival.score = won ? 41 : 88;
  if (won) { S.rival.life = 0; S.you.life = 12; } else { S.you.life = 0; S.rival.life = 9; }
  endGame(won);
}

/* ---------- autoplay self-play (soak test) ---------- */
function autoplay() {
  const step = () => {
    if (!S || S.over) { document.title = 'Starfall Pact — ' + (S && S.phase ? S.phase : 'done'); return; }
    if (S.busy) { setTimeout(step, 300); return; }
    const idx = aiPick(S.you, S.rival);
    if (idx >= 0 && S.you.hand.length) {
      playCard(S.you, S.rival, idx, 'You');
      render();
      setTimeout(step, 120);
    } else {
      endPlayerTurn();
      setTimeout(step, 300);
    }
  };
  setTimeout(step, 400);
}

/* ---------- boot ---------- */
function boot() {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene') || 'title';
  $('btn-play').addEventListener('click', () => { newGame((Date.now() % 2147483647) || 1); render(); });
  $('btn-again').addEventListener('click', () => { newGame((Date.now() % 2147483647) || 1); render(); });
  $('btn-end').addEventListener('click', endPlayerTurn);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') { muted = !muted; return; }
    if (e.key === 'r' || e.key === 'R') { newGame((Date.now() % 2147483647) || 1); render(); return; }
    if (!S || S.phase !== 'play' || S.over) return;
    if (e.key === 'Enter') { endPlayerTurn(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 7 && !S.busy) {
      if (playCard(S.you, S.rival, n - 1, 'You')) render();
    }
  });
  if (scene === 'table') stageTable();
  else if (scene === 'win') stageEnd(true);
  else if (scene === 'loss') stageEnd(false);
  else showTitle();
  if (params.get('autoplay') === '1') {
    newGame(20261122);
    render();
    autoplay();
  }
  window.__starfall = {
    get state() { return S; },
    newGame: newGame, playCard: playCard, aiPick: aiPick, render: render,
  };
}

document.addEventListener('DOMContentLoaded', boot);
