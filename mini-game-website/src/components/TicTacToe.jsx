import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import * as TTTLogic from '../lib/tictactoeLogic';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningCombo, setWinningCombo] = useState(null);
  const [mode, setMode] = useState('pvai');
  const [difficulty, setDifficulty] = useState('medium');

  const aiTimeoutRef = useRef(null);
  const winLineRef = useRef(null);
  const boardRef = useRef(null);
  const gameOverRef = useRef(false);

  // --- Win line drawing ---
  const drawWinLine = useCallback((combo) => {
    const lineEl = winLineRef.current;
    const boardEl = boardRef.current;
    if (!lineEl || !boardEl || !combo) return;

    const cells = boardEl.querySelectorAll('.ttt-cell');
    const [a, , c] = combo;
    const cellA = cells[a];
    const cellC = cells[c];
    if (!cellA || !cellC) return;

    const boardRect = boardEl.getBoundingClientRect();
    const rectA = cellA.getBoundingClientRect();
    const rectC = cellC.getBoundingClientRect();

    const x1 = rectA.left + rectA.width / 2 - boardRect.left;
    const y1 = rectA.top + rectA.height / 2 - boardRect.top;
    const x2 = rectC.left + rectC.width / 2 - boardRect.left;
    const y2 = rectC.top + rectC.height / 2 - boardRect.top;

    lineEl.setAttribute('x1', x1);
    lineEl.setAttribute('y1', y1);
    lineEl.setAttribute('x2', x2);
    lineEl.setAttribute('y2', y2);

    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    lineEl.style.strokeDasharray = length;
    lineEl.style.strokeDashoffset = length;

    // Force reflow, then animate
    void lineEl.getBoundingClientRect();
    lineEl.style.transition = 'stroke-dashoffset 0.4s ease-out';
    lineEl.style.strokeDashoffset = '0';
  }, []);

  const clearWinLine = useCallback(() => {
    const lineEl = winLineRef.current;
    if (lineEl) {
      lineEl.style.transition = 'none';
      lineEl.style.strokeDashoffset = '0';
      lineEl.setAttribute('x1', '0');
      lineEl.setAttribute('y1', '0');
      lineEl.setAttribute('x2', '0');
      lineEl.setAttribute('y2', '0');
    }
  }, []);

  // --- Confetti ---
  const triggerConfetti = useCallback(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
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
  }, []);

  // --- Process move and check winner ---
  const processMove = useCallback((newBoard, player) => {
    const result = TTTLogic.checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningCombo(result.combo);
      setGameOver(true);
      gameOverRef.current = true;

      // Confetti on win (not on draw)
      if (result.winner !== 'draw') {
        setTimeout(() => triggerConfetti(), 100);
      }

      // Draw win line if there is a combo
      if (result.combo) {
        setTimeout(() => drawWinLine(result.combo), 50);
      }
      return true;
    }
    return false;
  }, [triggerConfetti, drawWinLine]);

  // --- Make a move (used by both human and AI) ---
  const makeMove = useCallback((index, player) => {
    if (gameOverRef.current) return;

    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);

    const ended = processMove(newBoard, player);
    if (!ended) {
      const nextPlayer = player === 'X' ? 'O' : 'X';
      setCurrentPlayer(nextPlayer);
    }
  }, [board, processMove]);

  // --- Human click handler ---
  const handleCellClick = useCallback((index) => {
    if (gameOver) return;
    if (board[index] !== '') return;
    if (mode === 'pvai' && currentPlayer !== 'X') return;

    makeMove(index, currentPlayer);
  }, [gameOver, board, mode, currentPlayer, makeMove]);

  // Update ref when gameOver changes
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // --- AI turn effect ---
  useEffect(() => {
    if (mode === 'pvai' && currentPlayer === 'O' && !gameOverRef.current) {
      aiTimeoutRef.current = setTimeout(() => {
        aiTimeoutRef.current = null;
        const move = TTTLogic.getBestMove(board, difficulty);
        if (move !== -1 && !gameOverRef.current) {
          makeMove(move, 'O');
        }
      }, 200);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [currentPlayer, mode, board, difficulty, makeMove]);

  // Reset when mode or difficulty changes
  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameOver(false);
    gameOverRef.current = false;
    setWinner(null);
    setWinningCombo(null);
    clearWinLine();
  }, [clearWinLine]);

  // Mode/difficulty change triggers reset
  useEffect(() => {
    resetGame();
  }, [mode, difficulty, resetGame]);

  // --- Status text ---
  let statusText = '';
  if (winner === 'X') statusText = 'X wins!';
  else if (winner === 'O') statusText = 'O wins!';
  else if (winner === 'draw') statusText = 'Draw!';
  else statusText = `${currentPlayer}'s turn`;

  let statusColor = 'var(--text-secondary)';
  if (winner === 'X') statusColor = 'var(--accent-ttt)';
  else if (winner === 'O') statusColor = 'var(--accent-pink)';
  else if (winner === 'draw') statusColor = 'var(--text-secondary)';
  else statusColor = currentPlayer === 'X' ? 'var(--accent-ttt)' : 'var(--accent-pink)';

  return (
    <section id="page-tictactoe" className="page active">
      <div className="game-container">
        <Link to="/" className="back-link">&larr; Back to Hub</Link>
        <h1 className="game-title">Tic-Tac-Toe</h1>

        <div className="ttt-controls">
          <label className="control-group">
            Mode:
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="pvp">Player vs Player</option>
              <option value="pvai">Player vs AI</option>
            </select>
          </label>
          <label className="control-group">
            Difficulty:
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <div className="ttt-status" style={{ color: statusColor }}>
          {statusText}
        </div>

        <div className="ttt-board" ref={boardRef}>
          {board.map((cell, i) => (
            <button
              key={i}
              className={`ttt-cell${cell ? ' disabled' : ''}${(winningCombo && winningCombo.includes(i)) ? ' win-cell' : ''}`}
              onClick={() => handleCellClick(i)}
              data-index={i}
              data-player={cell || undefined}
            >
              {cell}
            </button>
          ))}
          <svg className="ttt-win-line">
            <line
              ref={winLineRef}
              x1="0"
              y1="0"
              x2="0"
              y2="0"
              stroke="var(--accent-snake)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <button className="btn" onClick={resetGame}>Restart</button>
      </div>
    </section>
  );
}
