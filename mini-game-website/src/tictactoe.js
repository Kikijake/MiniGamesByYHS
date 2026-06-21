/**
 * Tic-Tac-Toe — DOM-based with premium polish
 * Features: confetti on win, animated win line, colored X/O pieces,
 *           cell animation on placement, minimax AI
 */

import confetti from 'canvas-confetti';

// DOM refs
const tttBoard = document.getElementById('ttt-board');
const tttCells = document.querySelectorAll('.ttt-cell');
const tttStatus = document.getElementById('ttt-status');
const tttMode = document.getElementById('ttt-mode');
const tttDifficulty = document.getElementById('ttt-difficulty');
const tttRestart = document.getElementById('ttt-restart');

// Win line SVG overlay
const winLineNS = 'http://www.w3.org/2000/svg';
let winLineSvg, winLineEl;

function createWinLineOverlay() {
  winLineSvg = document.createElementNS(winLineNS, 'svg');
  winLineSvg.setAttribute('class', 'ttt-win-line');
  winLineSvg.setAttribute('width', '100%');
  winLineSvg.setAttribute('height', '100%');
  winLineSvg.style.position = 'absolute';
  winLineSvg.style.top = '0';
  winLineSvg.style.left = '0';
  winLineSvg.style.pointerEvents = 'none';
  winLineSvg.style.zIndex = '5';

  winLineEl = document.createElementNS(winLineNS, 'line');
  winLineEl.setAttribute('x1', '0');
  winLineEl.setAttribute('y1', '0');
  winLineEl.setAttribute('x2', '0');
  winLineEl.setAttribute('y2', '0');
  winLineSvg.appendChild(winLineEl);

  tttBoard.appendChild(winLineSvg);
}

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
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === 'medium') {
    if (Math.random() < 0.3) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

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

// --- Animated Win Line ---
function drawAnimatedWinLine(combo) {
  if (!winLineSvg || !winLineEl) return;

  const [a, , c] = combo;
  const cellA = tttCells[a];
  const cellC = tttCells[c];
  const boardRect = tttBoard.getBoundingClientRect();

  const rectA = cellA.getBoundingClientRect();
  const rectC = cellC.getBoundingClientRect();

  const x1 = rectA.left + rectA.width / 2 - boardRect.left;
  const y1 = rectA.top + rectA.height / 2 - boardRect.top;
  const x2 = rectC.left + rectC.width / 2 - boardRect.left;
  const y2 = rectC.top + rectC.height / 2 - boardRect.top;

  winLineEl.setAttribute('x1', x1);
  winLineEl.setAttribute('y1', y1);
  winLineEl.setAttribute('x2', x2);
  winLineEl.setAttribute('y2', y2);

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  winLineEl.style.strokeDasharray = length;
  winLineEl.style.strokeDashoffset = length;

  // Force reflow, then animate
  void winLineEl.getBoundingClientRect();
  winLineEl.style.transition = 'stroke-dashoffset 0.4s ease-out';
  winLineEl.style.strokeDashoffset = '0';
}

function clearWinLine() {
  if (winLineEl) {
    winLineEl.style.transition = 'none';
    winLineEl.style.strokeDashoffset = '0';
  }
}

// --- Confetti Celebration ---
function triggerConfetti() {
  const rect = tttBoard.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  // First burst
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x, y },
    colors: ['#818cf8', '#f472b6', '#4ade80', '#fbbf24', '#f87171'],
  });

  // Second burst after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { x, y },
      colors: ['#818cf8', '#f472b6', '#fbbf24'],
    });
  }, 200);
}

// --- Rendering ---
function renderTTT() {
  tttCells.forEach((cell, i) => {
    const val = board[i];

    // Set text
    cell.textContent = val;

    // Set data attribute for color styling
    if (val) {
      cell.dataset.player = val;
    } else {
      delete cell.dataset.player;
    }

    // Clear win class
    cell.classList.remove('win-cell');

    // Disabled state
    if (val !== '' || tttGameOver) {
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
    drawAnimatedWinLine(winningCombo);
  } else {
    clearWinLine();
  }

  // Status
  if (tttWinner === 'X') {
    tttStatus.textContent = 'X wins!';
    tttStatus.style.color = 'var(--accent-ttt)';
  } else if (tttWinner === 'O') {
    tttStatus.textContent = 'O wins!';
    tttStatus.style.color = 'var(--accent-pink)';
  } else if (tttWinner === 'draw') {
    tttStatus.textContent = 'Draw!';
    tttStatus.style.color = 'var(--text-secondary)';
  } else {
    tttStatus.textContent = `${currentPlayer}'s turn`;
    tttStatus.style.color = currentPlayer === 'X'
      ? 'var(--accent-ttt)'
      : 'var(--accent-pink)';
  }
}

// --- Cell placement animation ---
function animateCellPlacement(cell) {
  cell.style.transform = 'scale(0)';
  cell.style.transition = 'none';
  // Force reflow
  void cell.offsetWidth;
  cell.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
  cell.style.transform = 'scale(1)';
}

// --- Game Logic ---
function handleTTTClick(index) {
  if (tttGameOver) return;
  if (board[index] !== '') return;

  const mode = tttMode.value;
  if (mode === 'pvai' && currentPlayer !== 'X') return;

  makeMove(index, currentPlayer);
}

function makeMove(index, player) {
  board[index] = player;

  // Animate placement
  animateCellPlacement(tttCells[index]);

  const result = checkWinner(board);
  if (result) {
    tttWinner = result.winner;
    winningCombo = result.combo;
    tttGameOver = true;
    renderTTT();

    // Confetti on win (not on draw)
    if (result.winner !== 'draw') {
      triggerConfetti();
    }
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
  clearWinLine();
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
createWinLineOverlay();
resetTTT();
