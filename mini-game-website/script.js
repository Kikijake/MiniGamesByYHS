/* ===================================================================
   SPA Router
   =================================================================== */
function navigate() {
  const hash = location.hash.slice(1) || 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${hash}`);
  if (target) target.classList.add('active');
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

/* ===================================================================
   Snake Game
   =================================================================== */
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 20

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
}

function spawnFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
  } while (occupied.has(`${x},${y}`));
  food = { x, y };
}

// --- Drawing ---
function drawSnake() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Grid
  ctx.strokeStyle = '#16162a';
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

  // Food
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
  ctx.arc(fx, fy, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // Snake body
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const pad = 1;
    ctx.fillStyle = isHead ? '#4ade80' : '#2ecc71';
    ctx.shadowColor = isHead ? 'rgba(74,222,128,0.4)' : 'transparent';
    ctx.shadowBlur = isHead ? 8 : 0;
    ctx.fillRect(
      seg.x * CELL_SIZE + pad,
      seg.y * CELL_SIZE + pad,
      CELL_SIZE - pad * 2,
      CELL_SIZE - pad * 2
    );
    ctx.shadowBlur = 0;

    // Eyes on head
    if (isHead) {
      ctx.fillStyle = '#0f0f1a';
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
    }
  });
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

  // Self collision (check against current body, excluding tail which will move)
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
    scoreSpan.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreSpan.textContent = highScore;
      saveHighScore();
    }
    // Speed up slightly
    tickInterval = Math.max(50, 130 - Math.floor(score / 50) * 5);
    spawnFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  gameOver = true;
  gameRunning = false;
  overlayTitle.textContent = score > 0 ? 'Nice try!' : 'Game Over';
  overlayScore.textContent = score;
  overlay.classList.remove('hidden');
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (gameLoopId) clearInterval(gameLoopId);
}

// --- Game Loop ---
function gameLoop(timestamp) {
  if (!gameRunning && !gameOver) {
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  if (gameOver) {
    drawSnake();
    return;
  }

  if (!lastUpdateTime) lastUpdateTime = timestamp;
  const elapsed = timestamp - lastUpdateTime;

  if (elapsed >= tickInterval) {
    lastUpdateTime = timestamp;
    updateSnake();
    drawSnake();
  }

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
  // Don't queue if the queue is too long
  if (directionQueue.length >= 3) return;
  // Don't queue if the last queued direction is the same
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
  if (elapsed > 500) return; // too slow
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

/* ===================================================================
   Tic-Tac-Toe
   =================================================================== */
const tttBoard = document.getElementById('ttt-board');
const tttCells = document.querySelectorAll('.ttt-cell');
const tttStatus = document.getElementById('ttt-status');
const tttMode = document.getElementById('ttt-mode');
const tttDifficulty = document.getElementById('ttt-difficulty');
const tttRestart = document.getElementById('ttt-restart');

// --- State ---
let board = Array(9).fill('');
let currentPlayer = 'X';
let tttGameOver = false;
let tttWinner = null; // 'X', 'O', 'draw', or null
let winningCombo = null;
let aiTimeoutId = null;

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

// --- Helpers ---
function checkWinner(b) {
  for (const combo of WIN_COMBOS) {
    const [a, c, d] = combo;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { winner: b[a], combo };
    }
  }
  if (b.every(cell => cell !== '')) return { winner: 'draw', combo: null };
  return null;
}

function isBoardFull(b) {
  return b.every(cell => cell !== '');
}

function getAvailableMoves(b) {
  return b.reduce((acc, cell, i) => {
    if (cell === '') acc.push(i);
    return acc;
  }, []);
}

// --- Minimax with Alpha-Beta ---
function minimax(b, depth, isMaximizing, alpha, beta) {
  const result = checkWinner(b);
  if (result) {
    if (result.winner === 'X') return 10 - depth;
    if (result.winner === 'O') return depth - 10;
    if (result.winner === 'draw') return 0;
  }

  const available = getAvailableMoves(b);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of available) {
      b[move] = 'X';
      const score = minimax(b, depth + 1, false, alpha, beta);
      b[move] = '';
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of available) {
      b[move] = 'O';
      const score = minimax(b, depth + 1, true, alpha, beta);
      b[move] = '';
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(b, difficulty) {
  const available = getAvailableMoves(b);
  if (available.length === 0) return -1;

  if (difficulty === 'easy') {
    // Random move
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === 'medium') {
    // 70% minimax, 30% random
    if (Math.random() < 0.3) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // Hard or Medium (minimax path): full minimax
  // O is the minimizer, so we select the move with the lowest score
  let bestScore = Infinity;
  let bestMove = available[0];
  const boardCopy = [...b];

  for (const move of available) {
    boardCopy[move] = 'O';
    const score = minimax(boardCopy, 0, true, -Infinity, Infinity);
    boardCopy[move] = '';
    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// --- Rendering ---
function renderTTT() {
  tttCells.forEach((cell, i) => {
    cell.textContent = board[i];
    cell.classList.remove('win-cell');
    if (board[i] !== '' || tttGameOver) {
      cell.classList.add('disabled');
    } else {
      cell.classList.remove('disabled');
    }
  });

  // Highlight winning cells
  if (winningCombo) {
    winningCombo.forEach(i => {
      tttCells[i].classList.add('win-cell');
    });
  }

  // Status
  if (tttWinner === 'X') {
    tttStatus.textContent = 'X wins!';
  } else if (tttWinner === 'O') {
    tttStatus.textContent = 'O wins!';
  } else if (tttWinner === 'draw') {
    tttStatus.textContent = 'Draw!';
  } else {
    tttStatus.textContent = `${currentPlayer}'s turn`;
  }
}

// --- Game Logic ---
function handleTTTClick(index) {
  if (tttGameOver) return;
  if (board[index] !== '') return;

  // In PvAI mode, only allow clicks when it's the human's turn (X)
  const mode = tttMode.value;
  if (mode === 'pvai' && currentPlayer !== 'X') return;

  makeMove(index, currentPlayer);
}

function makeMove(index, player) {
  board[index] = player;

  const result = checkWinner(board);
  if (result) {
    tttWinner = result.winner;
    winningCombo = result.combo;
    tttGameOver = true;
    renderTTT();
    return;
  }

  // Switch player
  currentPlayer = player === 'X' ? 'O' : 'X';
  renderTTT();

  // AI turn
  const mode = tttMode.value;
  if (!tttGameOver && mode === 'pvai' && currentPlayer === 'O') {
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      const difficulty = tttDifficulty.value;
      const move = getBestMove(board, difficulty);
      if (move !== -1) {
        makeMove(move, 'O');
      }
    }, 200);
  }
}

function resetTTT() {
  // Cancel any pending AI move
  if (aiTimeoutId) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
  }
  board = Array(9).fill('');
  currentPlayer = 'X';
  tttGameOver = false;
  tttWinner = null;
  winningCombo = null;
  renderTTT();
}

// --- Events ---
tttBoard.addEventListener('click', (e) => {
  const cell = e.target.closest('.ttt-cell');
  if (!cell) return;
  const index = parseInt(cell.dataset.index, 10);
  handleTTTClick(index);
});

tttMode.addEventListener('change', resetTTT);
tttDifficulty.addEventListener('change', resetTTT);
tttRestart.addEventListener('click', resetTTT);

// --- Init ---
resetTTT();
