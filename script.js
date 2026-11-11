const $ = s => document.querySelector(s);
const COLORS = ['#e53935','#1e88e5','#43a047','#fdd835'];
const OFF = [[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]];
const PIPS = [0,[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const SHOW = {1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dice = $('#dice'), btn = $('#rollBtn');

// the classic board (snake head: tail, ladder bottom: top)
const CLASSIC = {
  S: {17:7, 54:34, 62:19, 64:60, 87:24, 93:73, 95:75, 99:78},
  L: {4:25, 9:31, 20:41, 28:84, 40:59, 63:81, 71:91}
};
let SNAKES = {}, LADDERS = {};
let custom = null;                 // saved custom board, or null = classic
let players, cur, busy, spins = 0;

// square number -> [col,row] (row 0 = top)
const rc = n => { const i = n-1, row = Math.floor(i/10); let c = i%10; if (row%2) c = 9-c; return [c, 9-row]; };
const ctr = n => { const [c,r] = rc(n); return [c*60+30, r*60+30]; };

// ---------- board customizing ----------
const parsePairs = str => [...str.matchAll(/(\d+)\D+(\d+)/g)].map(m => [+m[1], +m[2]]);
const fmt = o => Object.entries(o).map(([a,b]) => `${a}-${b}`).join(', ');

// returns {S,L} or an error string
function validate(sp, lp) {
  const S = {}, L = {}, starts = new Set();
  for (const [a,b] of sp) {
    if (a < 2 || a > 99 || b < 1 || b >= a) return `Snake ${a}-${b}: head must be 2–99 and tail must be lower (1–${a-1}).`;
    if (starts.has(a)) return `Square ${a} is already used as a start.`;
    starts.add(a); S[a] = b;
  }
  for (const [a,b] of lp) {
    if (a < 2 || a > 99 || b <= a || b > 100) return `Ladder ${a}-${b}: bottom must be 2–99 and top must be higher (up to 100).`;
    if (starts.has(a)) return `Square ${a} is already used as a start.`;
    starts.add(a); L[a] = b;
  }
  for (const end of [...Object.values(S), ...Object.values(L)])
    if (starts.has(end)) return `Square ${end} is both an end and a start (chain). Please change it.`;
  return {S, L};
}

function fillEditor(b) { $('#snakeIn').value = fmt(b.S); $('#ladderIn').value = fmt(b.L); $('#err').textContent = ''; }
const updateLabel = () => $('#boardLabel').textContent = custom ? 'Board: ✏️ Custom (saved)' : 'Board: Classic';

$('#editBtn').onclick = () => { fillEditor(custom || CLASSIC); $('#editor').hidden = false; };
$('#closeEditor').onclick = () => $('#editor').hidden = true;
$('#resetBoard').onclick = () => { custom = null; updateLabel(); $('#editor').hidden = true; };
$('#saveBoard').onclick = () => {
  const r = validate(parsePairs($('#snakeIn').value), parsePairs($('#ladderIn').value));
  if (typeof r === 'string') { $('#err').textContent = '⚠️ ' + r; return; }
  custom = r; updateLabel(); $('#editor').hidden = true;
};

// ---------- dice ----------
for (let v = 1; v <= 6; v++) {
  const f = document.createElement('div');
  f.className = 'face f' + v;
  for (let i = 0; i < 9; i++) f.innerHTML += PIPS[v].includes(i) ? '<span class="pip"></span>' : '<span></span>';
  dice.appendChild(f);
}
function spin(v) {
  Sound.dice();
  spins++;
  const [x,y] = SHOW[v];
  dice.style.transform = `rotateX(${x + spins*720}deg) rotateY(${y + spins*720}deg)`;
  return sleep(1200);
}

// ---------- board drawing ----------
function ladderSVG(a, b) {
  const [x1,y1] = ctr(a), [x2,y2] = ctr(b);
  const dx = x2-x1, dy = y2-y1, L = Math.hypot(dx,dy), nx = -dy/L*9, ny = dx/L*9;
  let s = '<g stroke-linecap="round">';
  const n = Math.floor(L/24);
  for (let i = 1; i <= n; i++) {
    const t = i/(n+1), px = x1+dx*t, py = y1+dy*t;
    s += `<line x1="${px-nx}" y1="${py-ny}" x2="${px+nx}" y2="${py+ny}" stroke="#a1692f" stroke-width="5"/>`;
  }
  for (const k of [1,-1]) {
    s += `<line x1="${x1+nx*k+2}" y1="${y1+ny*k+3}" x2="${x2+nx*k+2}" y2="${y2+ny*k+3}" stroke="#0003" stroke-width="7"/>`;
    s += `<line x1="${x1+nx*k}" y1="${y1+ny*k}" x2="${x2+nx*k}" y2="${y2+ny*k}" stroke="#7b4a1e" stroke-width="7"/>`;
    s += `<line x1="${x1+nx*k}" y1="${y1+ny*k}" x2="${x2+nx*k}" y2="${y2+ny*k}" stroke="#d9a066" stroke-width="2"/>`;
  }
  return s + '</g>';
}

function snakeSVG(a, b, idx) {
  const [x1,y1] = ctr(a), [x2,y2] = ctr(b);
  const dx = x2-x1, dy = y2-y1, L = Math.hypot(dx,dy), nx = -dy/L, ny = dx/L;
  const N = 50, amp = 15 + (idx%3)*4, waves = Math.round(L/85) + 1;
  const col = [['#2e7d32','#9ccc65'],['#6a1b9a','#ce93d8'],['#c62828','#ffab91'],['#e65100','#ffe082']][idx%4];
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k/N, env = Math.min(1, t*5, (1-t)*5);
    const off = Math.sin(t*waves*Math.PI) * amp * env;
    pts.push([x1+dx*t+nx*off, y1+dy*t+ny*off]);
  }
  let s = '<g stroke-linecap="round">';
  for (let k = 0; k < N; k++) {
    const w = 15 - 11*(k/N);
    s += `<line x1="${pts[k][0]+2}" y1="${pts[k][1]+3}" x2="${pts[k+1][0]+2}" y2="${pts[k+1][1]+3}" stroke="#0003" stroke-width="${w}"/>`;
  }
  for (let k = 0; k < N; k++) {
    const w = 15 - 11*(k/N), c = Math.floor(k/3)%2 ? col[1] : col[0];
    s += `<line x1="${pts[k][0]}" y1="${pts[k][1]}" x2="${pts[k+1][0]}" y2="${pts[k+1][1]}" stroke="${c}" stroke-width="${w}"/>`;
  }
  const [hx,hy] = pts[0], ddx = hx-pts[2][0], ddy = hy-pts[2][1], dl = Math.hypot(ddx,ddy) || 1;
  const ux = ddx/dl, uy = ddy/dl, vx = -uy, vy = ux;
  s += `<line x1="${hx+ux*10}" y1="${hy+uy*10}" x2="${hx+ux*19}" y2="${hy+uy*19}" stroke="#e53935" stroke-width="2"/>`;
  s += `<ellipse cx="${hx}" cy="${hy}" rx="12" ry="10" fill="${col[0]}" stroke="${col[1]}" stroke-width="2" transform="rotate(${Math.atan2(uy,ux)*180/Math.PI} ${hx} ${hy})"/>`;
  for (const k of [1,-1]) {
    const ex = hx+ux*4+vx*6*k, ey = hy+uy*4+vy*6*k;
    s += `<circle cx="${ex}" cy="${ey}" r="3.2" fill="#fff"/><circle cx="${ex+ux}" cy="${ey+uy}" r="1.5" fill="#000"/>`;
  }
  return s + '</g>';
}

function buildBoard() {
  const board = $('#board');
  board.innerHTML = '';
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const rb = 9-r, num = rb%2 === 0 ? rb*10+c+1 : rb*10+10-c;
    const d = document.createElement('div');
    d.className = 'cell ' + ((r+c)%2 ? 'a' : 'b');
    d.textContent = num;
    board.appendChild(d);
  }
  let svg = '<svg id="svg" viewBox="0 0 600 600">';
  Object.entries(LADDERS).forEach(([a,b]) => svg += ladderSVG(+a,+b));
  Object.entries(SNAKES).forEach(([a,b],i) => svg += snakeSVG(+a,+b,i));
  board.insertAdjacentHTML('beforeend', svg + '</svg>');
  players.forEach((p,i) => {
    p.el = document.createElement('div');
    p.el.className = 'token';
    p.el.style.background = p.color;
    p.el.style.zIndex = 5 + i;
    board.appendChild(p.el);
    place(p, i);
  });
}

function place(p, i = players.indexOf(p)) {
  const [c,r] = rc(p.pos);
  p.el.style.left = (c*10 + 2.5 + OFF[i][0]) + '%';
  p.el.style.top  = (r*10 + 2.5 + OFF[i][1]) + '%';
  document.querySelectorAll('.pl b')[i].textContent = p.pos;
}

// ---------- game flow ----------
const say = t => $('#status').textContent = t;

function start(mode) {
  const b = custom || CLASSIC;
  SNAKES = b.S; LADDERS = b.L;
  const n = mode === 'bot' ? 2 : +mode;
  players = [...Array(n)].map((_,i) => ({
    name: mode === 'bot' ? (i ? 'Bot 🤖' : 'You') : 'Player ' + (i+1),
    pos: 1, bot: mode === 'bot' && i === 1, color: COLORS[i]
  }));
  $('#players').innerHTML = players.map(p =>
    `<div class="pl"><span class="dot" style="background:${p.color}"></span>${p.name}<b>1</b></div>`).join('');
  cur = 0;
  $('#menu').hidden = true; $('#win').hidden = true; $('#game').hidden = false;
  buildBoard();
  turn();
}

function turn() {
  document.querySelectorAll('.pl').forEach((e,i) => e.classList.toggle('on', i === cur));
  say(`${players[cur].name}’s turn`);
  busy = false;
  btn.disabled = players[cur].bot;
  if (players[cur].bot) setTimeout(roll, 900);
}

async function roll() {
  if (busy) return;
  busy = true; btn.disabled = true;
  const p = players[cur], v = 1 + Math.floor(Math.random()*6);
  let climbed = false;
  say(`${p.name} is rolling...`);
  await spin(v);
  say(`${p.name} rolled a ${v}`);

  if (p.pos + v > 100) {
    Sound.bump();
    say(`${p.name} rolled ${v}: needs exact number to reach 100`);
    await sleep(1000);
  } else {
    for (let i = 0; i < v; i++) {
      p.pos++; place(p);
      p.el.classList.remove('hop'); void p.el.offsetWidth; p.el.classList.add('hop');
      Sound.hop(i);
      await sleep(260);
    }
    const snake = SNAKES[p.pos], to = snake || LADDERS[p.pos];
    if (to) {
      climbed = !snake;
      say(snake ? '🐍 Oh no, a snake!' : '🪜 Climbing a ladder!');
      await sleep(500);
      if (snake) {
        Sound.snake();
        $('#board').classList.add('shake');
        setTimeout(() => $('#board').classList.remove('shake'), 500);
      } else Sound.ladder();
      p.el.classList.add('slide', 'glow');
      p.pos = to; place(p);
      await sleep(1050);
      p.el.classList.remove('slide', 'glow');
    }
    if (p.pos === 100) {
      Sound.win(); confetti();
      $('#winText').textContent = `🏆 ${p.name} won!`;
      $('#win').hidden = false;
      return;
    }
  }

  // extra turn on a 6 or after climbing a ladder
  if (v === 6 || climbed) {
    Sound.six();
    say(climbed ? `🪜 ${p.name} climbed a ladder: roll again!` : `${p.name} rolled a 6: roll again!`);
    await sleep(900);
  } else cur = (cur+1) % players.length;
  turn();
}

function confetti() {
  for (let i = 0; i < 120; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = `hsl(${Math.random() * 360},90%,60%)`;
    c.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    c.style.animationDelay = Math.random() * 0.8 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 6000);
  }
}

btn.onclick = () => { Sound.init(); roll(); };
$('#restart').onclick = $('#again').onclick = () => { $('#win').hidden = true; $('#game').hidden = true; $('#menu').hidden = false; };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { Sound.init(); start(b.dataset.mode); });
updateLabel();