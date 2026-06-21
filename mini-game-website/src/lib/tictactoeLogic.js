/**
 * Tic-Tac-Toe — Pure game logic (no DOM, no React)
 * Extracted from the original vanilla JS tictactoe.js
 */

export const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

/**
 * Check the board for a winner.
 * Returns { winner: 'X'|'O'|'draw', combo: number[] } | null
 */
export function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, c, d] = combo;
    if (board[a] && board[a] === board[c] && board[a] === board[d]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every((cell) => cell !== '')) return { winner: 'draw', combo: null };
  return null;
}

/**
 * Check if the board is full.
 */
export function isBoardFull(board) {
  return board.every((cell) => cell !== '');
}

/**
 * Get array of available move indices.
 */
export function getAvailableMoves(board) {
  return board.reduce((acc, cell, i) => {
    if (cell === '') acc.push(i);
    return acc;
  }, []);
}

/**
 * Minimax algorithm with alpha-beta pruning.
 * Assumes AI plays as 'O' and player as 'X'.
 */
export function minimax(board, depth, isMaximizing, alpha, beta) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'X') return 10 - depth;
    if (result.winner === 'O') return depth - 10;
    if (result.winner === 'draw') return 0;
  }

  const available = getAvailableMoves(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of available) {
      board[move] = 'X';
      const score = minimax(board, depth + 1, false, alpha, beta);
      board[move] = '';
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of available) {
      board[move] = 'O';
      const score = minimax(board, depth + 1, true, alpha, beta);
      board[move] = '';
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Get the best move for the AI given difficulty.
 * difficulty: 'easy' | 'medium' | 'hard'
 * Returns the index of the best move, or -1 if no moves available.
 */
export function getBestMove(board, difficulty) {
  const available = getAvailableMoves(board);
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
  const boardCopy = [...board];

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
