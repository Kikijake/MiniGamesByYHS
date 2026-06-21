/**
 * Snake Game — Canvas-based with premium polish
 * Features: pulsing food, particle trail, screen shake, score count-up
 */

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 20

// DOM refs
const canvas = document.getElementById('snake-canvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('snake-score');
const highScoreSpan = document.getElementById('snake-highscore');
const startBtn = document.getElementById('snake-start-btn');
const overlay = document.getElementById('snake-overlay');
const overlayTitle = document.getElementById('snake-overlay-title');
const overlayScore = document.getElementById('snake-overlay-score');
const overlayBtn = document.getElementById('snake-overlay-btn');
const dpad = document.getElementById('snake-dpad');

// Show d-pad only on touch devices
if ('ontouchstart' in window) {
  dpad.classList.remove('hidden');
}

// --- State ---
let snake, direction, nextDirection, directionQueue;
let food, score, highScore;
let gameRunning, gameOver, gameLoopId;
let lastUpdateTime, tickInterval;
let animFrameId;
let time = 0; // for animations

// Particle system
let particles = [];
const MAX_PARTICLES = 60;

// Screen shake state
let shakeIntensity = 0;
const SHAKE_DECAY = 0.85;

// --- Init ---
function loadHighScore() {
  try {
    highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  } catch (_) {
    highScore = 0;
  }
  highScoreSpan.textContent = highScore;
}

function saveHighScore() {
  try {
    localStorage.setItem('snake_highscore', String(highScore));
  } catch (_) { /* ignore */ }
}

function initSnake() {
  const mid = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  directionQueue = [];
  score = 0;
  scoreSpan.textContent = '0';
  gameOver = false;
  overlay.classList.add('hidden');
  tickInterval = 130;
  lastUpdateTime = 0;
  particles = [];
  shakeIntensity = 0;
  canvas.classList.remove('shaking');
}

function spawnFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
  } while (occupied.has(`${x},${y}`));
  food = { x, y };

  // Burst particles on new food spawn
  const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
  emitParticles(fx, fy, '#fbbf24', 12, 4);
}

// --- Particle System ---
function emitParticles(x, y, color, count = 5, size = 3) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.025,
      color,
      size: size * (0.5 + Math.random() * 0.5),
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6 * p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Screen Shake ---
function triggerShake(intensity = 10) {
  shakeIntensity = intensity;
  canvas.classList.remove('shaking');
  // Force reflow to restart animation
  void canvas.offsetWidth;
  canvas.classList.add('shaking');
}

// --- Drawing ---
function drawSnake() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Grid (subtle)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }

  // Food — pulsing glow
  const pulse = Math.sin(time * 0.006) * 0.12 + 0.88;
  const foodRadius = (CELL_SIZE / 2 - 2) * pulse;
  const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const fy = food.y * CELL_SIZE + CELL_SIZE / 2;

  ctx.save();
  // Outer glow
  const glowIntensity = Math.sin(time * 0.004) * 0.3 + 0.5;
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 20 * glowIntensity;

  // Food body
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(
    fx - foodRadius * 0.2,
    fy - foodRadius * 0.2,
    foodRadius * 0.35,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();
  ctx.restore();

  // Snake body
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const pad = 1;
    const segX = seg.x * CELL_SIZE + pad;
    const segY = seg.y * CELL_SIZE + pad;
    const segSize = CELL_SIZE - pad * 2;

    if (isHead) {
      // Head glow
      ctx.save();
      ctx.shadowColor = 'rgba(74, 222, 128, 0.5)';
      ctx.shadowBlur = 12 + Math.sin(time * 0.008) * 4;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.roundRect(segX, segY, segSize, segSize, 3);
      ctx.fill();
      ctx.restore();
    } else {
      // Body gradient: lighter near head
      const t = i / snake.length;
      const r = Math.round(46 + (74 - 46) * (1 - t));
      const g = Math.round(222 - (222 - 180) * t);
      const b = Math.round(128 - (128 - 80) * t);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.roundRect(segX, segY, segSize, segSize, 2);
      ctx.fill();
    }

    // Eyes on head
    if (isHead) {
      ctx.fillStyle = '#0b0a1a';
      const eyeOff = CELL_SIZE * 0.25;
      const eyeR = 2.5;
      let ex1, ey1, ex2, ey2;
      if (direction.x === 1) {
        ex1 = seg.x * CELL_SIZE + CELL_SIZE - eyeOff; ey1 = seg.y * CELL_SIZE + eyeOff;
        ex2 = seg.x * CELL_SIZE + CELL_SIZE - eyeOff; ey2 = seg.y * CELL_SIZE + CELL_SIZE - eyeOff;
      } else if (direction.x === -1) {
        ex1 = seg.x * CELL_SIZE + eyeOff; ey1 = seg.y * CELL_SIZE + eyeOff;
        ex2 = seg.x * CELL_SIZE + eyeOff; ey2 = seg.y * CELL_SIZE + CELL_SIZE - eyeOff;
      } else if (direction.y === -1) {
        ex1 = seg.x * CELL_SIZE + eyeOff; ey1 = seg.y * CELL_SIZE + eyeOff;
        ex2 = seg.x * CELL_SIZE + CELL_SIZE - eyeOff; ey2 = seg.y * CELL_SIZE + eyeOff;
      } else {
        ex1 = seg.x * CELL_SIZE + eyeOff; ey1 = seg.y * CELL_SIZE + CELL_SIZE - eyeOff;
        ex2 = seg.x * CELL_SIZE + CELL_SIZE - eyeOff; ey2 = seg.y * CELL_SIZE + CELL_SIZE - eyeOff;
      }
      ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2); ctx.fill();

      // Pupils (direction indicator)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        ex1 + direction.x * 0.8,
        ey1 + direction.y * 0.8,
        1.2,
        0, Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        ex2 + direction.x * 0.8,
        ey2 + direction.y * 0.8,
        1.2,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  });

  // Particles (drawn on top)
  drawParticles();

  // Emit trail particles from head
  if (gameRunning && !gameOver) {
    const head = snake[0];
    const hx = head.x * CELL_SIZE + CELL_SIZE / 2;
    const hy = head.y * CELL_SIZE + CELL_SIZE / 2;
    emitParticles(hx, hy, 'rgba(74, 222, 128, 0.6)', 1, 2);
  }
}

// roundRect polyfill for canvas (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = typeof radii === 'number' ? radii : (radii || 0);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };
}

// --- Game Logic ---
function updateSnake() {
  if (gameOver) return;

  // Process direction queue
  if (directionQueue.length > 0) {
    nextDirection = directionQueue.shift();
  }

  // Prevent 180° reversal
  if (nextDirection.x === -direction.x && nextDirection.y === -direction.y) {
    nextDirection = { ...direction };
  }
  direction = { ...nextDirection };

  // Compute new head
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    endGame();
    return;
  }

  // Self collision
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
      endGame();
      return;
    }
  }

  // Move
  snake.unshift(newHead);

  // Food collision
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    animateScoreUpdate(scoreSpan, score);
    if (score > highScore) {
      highScore = score;
      animateScoreUpdate(highScoreSpan, highScore);
      saveHighScore();
    }
    // Speed up slightly
    tickInterval = Math.max(50, 130 - Math.floor(score / 50) * 5);
    // Burst on food eaten
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
    emitParticles(fx, fy, '#fbbf24', 15, 5);
    spawnFood();
  } else {
    snake.pop();
  }
}

// --- Score count-up animation ---
function animateScoreUpdate(el, newValue) {
  const current = parseInt(el.textContent, 10) || 0;
  if (current === newValue) return;

  const startTime = performance.now();
  const duration = 300; // ms
  const diff = newValue - current;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(current + diff * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function endGame() {
  gameOver = true;
  gameRunning = false;
  overlayTitle.textContent = score > 0 ? 'Nice try!' : 'Game Over';
  overlayTitle.className = score > 0 ? 'nice-try-title' : 'game-over-title';
  overlayScore.textContent = score;
  overlay.classList.remove('hidden');
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (gameLoopId) clearInterval(gameLoopId);

  triggerShake(12);
}

// --- Game Loop ---
function gameLoop(timestamp) {
  time = timestamp;

  if (!gameRunning && !gameOver) {
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  if (gameOver) {
    updateParticles();
    drawSnake();
    return;
  }

  if (!lastUpdateTime) lastUpdateTime = timestamp;
  const elapsed = timestamp - lastUpdateTime;

  if (elapsed >= tickInterval) {
    lastUpdateTime = timestamp;
    updateSnake();
  }

  updateParticles();
  drawSnake();

  animFrameId = requestAnimationFrame(gameLoop);
}

function startSnakeGame() {
  if (gameRunning) return;
  initSnake();
  spawnFood();
  gameRunning = true;
  gameOver = false;
  lastUpdateTime = 0;
  drawSnake();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
  startBtn.textContent = 'Restart';
}

function restartSnake() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (gameLoopId) clearInterval(gameLoopId);
  gameRunning = false;
  startSnakeGame();
}

// --- Input: Keyboard ---
const KEY_MAP = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  W: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  S: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  A: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  D: { x: 1, y: 0 },
};

function queueDirection(dir) {
  if (!gameRunning || gameOver) return;
  if (directionQueue.length >= 3) return;
  const last = directionQueue.length > 0
    ? directionQueue[directionQueue.length - 1]
    : direction;
  if (dir.x === -last.x && dir.y === -last.y) return;
  if (dir.x === last.x && dir.y === last.y) return;
  directionQueue.push(dir);
}

document.addEventListener('keydown', (e) => {
  const dir = KEY_MAP[e.key];
  if (dir) {
    e.preventDefault();
    queueDirection(dir);
  }
});

// --- Input: Touch / D-Pad ---
dpad.addEventListener('click', (e) => {
  const btn = e.target.closest('.dpad-btn');
  if (!btn) return;
  const dir = btn.dataset.dir;
  const map = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  queueDirection(map[dir]);
});

// --- Input: Swipe ---
let touchStartX = 0, touchStartY = 0;
let touchStartTime = 0;

canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = Date.now();
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!gameRunning || gameOver) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const elapsed = Date.now() - touchStartTime;
  if (elapsed > 500) return;
  const minSwipe = 30;
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }
  queueDirection(dir);
}, { passive: true });

// --- Events ---
startBtn.addEventListener('click', restartSnake);
overlayBtn.addEventListener('click', restartSnake);

// --- Init ---
loadHighScore();
initSnake();
spawnFood();
drawSnake();

export { restartSnake };
