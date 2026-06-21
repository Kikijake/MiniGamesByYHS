import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as SnakeLogic from '../lib/snakeLogic';

const { GRID_SIZE, CANVAS_SIZE, CELL_SIZE, SPEED_CONFIG } = SnakeLogic;
const MAX_PARTICLES = 60;

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

function loadHighScore() {
  try {
    return parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  } catch (_) {
    return 0;
  }
}

function saveHighScore(val) {
  try {
    localStorage.setItem('snake_highscore', String(val));
  } catch (_) { /* ignore */ }
}

let scorePopTimeout = null;

export default function SnakeGame() {
  // --- State for rendering ---
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [overlayHidden, setOverlayHidden] = useState(true);
  const [overlayTitle, setOverlayTitle] = useState('Game Over');
  const [overlayScore, setOverlayScore] = useState(0);
  const [startBtnText, setStartBtnText] = useState('Start Game');
  const [scorePop, setScorePop] = useState(false);

  // --- Refs for mutable game state ---
  const canvasRef = useRef(null);
  const snakeRef = useRef([]);
  const directionRef = useRef({ x: 1, y: 0 });
  const nextDirectionRef = useRef({ x: 1, y: 0 });
  const directionQueueRef = useRef([]);
  const foodRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const tickIntervalRef = useRef(SPEED_CONFIG.base);
  const timeRef = useRef(0);
  const gameRunningRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);

  // --- Drawing functions ---

  const drawGrid = useCallback((ctx) => {
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
  }, []);

  const drawFood = useCallback((ctx, food, time) => {
    const pulse = Math.sin(time * 0.006) * 0.12 + 0.88;
    const foodRadius = (CELL_SIZE / 2 - 2) * pulse;
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    const glowIntensity = Math.sin(time * 0.004) * 0.3 + 0.5;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20 * glowIntensity;

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
    ctx.fill();

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
  }, []);

  const drawSnakeBody = useCallback((ctx, snake, direction, time) => {
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
        ctx.arc(ex1 + direction.x * 0.8, ey1 + direction.y * 0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2 + direction.x * 0.8, ey2 + direction.y * 0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, []);

  const drawParticles = useCallback((ctx, particles) => {
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
  }, []);

  // --- Game loop ---

  const gameLoop = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current = timestamp;

    if (!gameRunningRef.current && !gameOverRef.current) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gameOverRef.current) {
      // Still render particles after game over
      particlesRef.current = SnakeLogic.updateParticles(particlesRef.current);
      // Draw
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawGrid(ctx);
      drawFood(ctx, foodRef.current, timeRef.current);
      drawSnakeBody(ctx, snakeRef.current, directionRef.current, timeRef.current);
      drawParticles(ctx, particlesRef.current);
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
    const elapsed = timestamp - lastUpdateRef.current;

    if (elapsed >= tickIntervalRef.current) {
      lastUpdateRef.current = timestamp;

      // Update game state
      const state = {
        snake: snakeRef.current,
        direction: directionRef.current,
        nextDirection: nextDirectionRef.current,
        directionQueue: directionQueueRef.current,
        food: foodRef.current,
        score: scoreRef.current,
        tickInterval: tickIntervalRef.current,
      };

      const newState = SnakeLogic.updateSnake(state);

      // Apply changes
      snakeRef.current = newState.snake;
      directionRef.current = newState.direction;
      nextDirectionRef.current = newState.nextDirection;
      directionQueueRef.current = newState.directionQueue;
      foodRef.current = newState.food;
      tickIntervalRef.current = newState.tickInterval;

      if (newState.gameOver) {
        gameOverRef.current = true;
        gameRunningRef.current = false;
        setGameOver(true);
        setGameRunning(false);
        setOverlayHidden(false);
        setOverlayTitle(scoreRef.current > 0 ? 'Nice try!' : 'Game Over');
        setOverlayScore(scoreRef.current);
        // Trigger shake
        const cnv = canvasRef.current;
        if (cnv) {
          cnv.classList.remove('shaking');
          void cnv.offsetWidth;
          cnv.classList.add('shaking');
        }
        // Emit particles at end position
        if (newState.food) {
          const fx = newState.food.x * CELL_SIZE + CELL_SIZE / 2;
          const fy = newState.food.y * CELL_SIZE + CELL_SIZE / 2;
          const newParts = SnakeLogic.emitParticles(fx, fy, '#fbbf24', 12, 4, particlesRef.current.length);
          particlesRef.current = [...particlesRef.current, ...newParts];
        }
      }

      if (newState.ate) {
        const newScore = newState.score;
        scoreRef.current = newScore;
        setScore(newScore);
        setScorePop(true);
        if (scorePopTimeout) clearTimeout(scorePopTimeout);
        scorePopTimeout = setTimeout(() => {
          setScorePop(false);
        }, 300);

        if (newScore > highScore) {
          setHighScore(newScore);
          saveHighScore(newScore);
        }

        // Emit particles on food eat
        const fx = newState.food.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = newState.food.y * CELL_SIZE + CELL_SIZE / 2;
        const newParts = SnakeLogic.emitParticles(fx, fy, '#fbbf24', 15, 5, particlesRef.current.length);
        particlesRef.current = [...particlesRef.current, ...newParts];
      }
    }

    // Update particles every frame
    particlesRef.current = SnakeLogic.updateParticles(particlesRef.current);

    // Emit trail particles from head
    if (gameRunningRef.current && !gameOverRef.current && snakeRef.current.length > 0) {
      const head = snakeRef.current[0];
      const hx = head.x * CELL_SIZE + CELL_SIZE / 2;
      const hy = head.y * CELL_SIZE + CELL_SIZE / 2;
      const trail = SnakeLogic.emitParticles(hx, hy, 'rgba(74, 222, 128, 0.6)', 1, 2, particlesRef.current.length);
      particlesRef.current = [...particlesRef.current, ...trail];
    }

    // Draw everything
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGrid(ctx);
    drawFood(ctx, foodRef.current, timeRef.current);
    drawSnakeBody(ctx, snakeRef.current, directionRef.current, timeRef.current);
    drawParticles(ctx, particlesRef.current);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [drawGrid, drawFood, drawSnakeBody, drawParticles, highScore]);

  // --- Game lifecycle ---

  const initGame = useCallback(() => {
    snakeRef.current = SnakeLogic.initSnakeState();
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    directionQueueRef.current = [];
    scoreRef.current = 0;
    tickIntervalRef.current = SPEED_CONFIG.base;
    lastUpdateRef.current = 0;
    particlesRef.current = [];
    foodRef.current = SnakeLogic.spawnFood(snakeRef.current, GRID_SIZE);
    gameOverRef.current = false;
    gameRunningRef.current = false;

    setScore(0);
    setGameOver(false);
    setGameRunning(false);
    setOverlayHidden(true);

    const cnv = canvasRef.current;
    if (cnv) cnv.classList.remove('shaking');

    // Initial draw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Emit particles on new food spawn
        const fx = foodRef.current.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = foodRef.current.y * CELL_SIZE + CELL_SIZE / 2;
        const newParts = SnakeLogic.emitParticles(fx, fy, '#fbbf24', 12, 4, 0);
        particlesRef.current = [...particlesRef.current, ...newParts];

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawGrid(ctx);
        drawFood(ctx, foodRef.current, 0);
        drawSnakeBody(ctx, snakeRef.current, directionRef.current, 0);
        drawParticles(ctx, particlesRef.current);
      }
    }
  }, [drawGrid, drawFood, drawSnakeBody, drawParticles]);

  const startGame = useCallback(() => {
    if (gameRunningRef.current) return;
    initGame();
    gameRunningRef.current = true;
    gameOverRef.current = false;
    lastUpdateRef.current = 0;
    setGameRunning(true);
    setGameOver(false);
    setStartBtnText('Restart');
    setOverlayHidden(true);

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop]);

  const restart = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    gameRunningRef.current = false;
    startGame();
  }, [startGame]);

  // --- Input handling ---

  const queueDirection = useCallback((dir) => {
    if (!gameRunningRef.current || gameOverRef.current) return;
    const queue = directionQueueRef.current;
    if (queue.length >= 3) return;
    const last = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    if (dir.x === -last.x && dir.y === -last.y) return;
    if (dir.x === last.x && dir.y === last.y) return;
    directionQueueRef.current = [...queue, dir];
  }, []);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const dir = SnakeLogic.KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        queueDirection(dir);
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [queueDirection, restart]);

  // Touch/swipe handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e) => {
      if (!gameRunningRef.current || gameOverRef.current) return;
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
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queueDirection]);

  // D-pad handler
  useEffect(() => {
    const dpad = document.getElementById('snake-dpad');
    if (!dpad) return;

    const handleDpadClick = (e) => {
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
    };

    dpad.addEventListener('click', handleDpadClick);
    return () => {
      dpad.removeEventListener('click', handleDpadClick);
    };
  }, [queueDirection]);

  // D-pad visibility for touch devices
  useEffect(() => {
    const dpad = document.getElementById('snake-dpad');
    if (dpad && 'ontouchstart' in window) {
      dpad.classList.remove('hidden');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Score pop timeout cleanup
  useEffect(() => {
    return () => {
      if (scorePopTimeout) clearTimeout(scorePopTimeout);
    };
  }, []);

  return (
    <section id="page-snake" className="page active">
      <div className="game-container">
        <Link to="/" className="back-link">&larr; Back to Hub</Link>
        <h1 className="game-title">Snake</h1>

        <p className="controls-hint">
          <kbd>Arrow keys</kbd> / <kbd>WASD</kbd> to move
          &nbsp;&middot;&nbsp;
          <kbd>Space</kbd> to restart
        </p>

        <div className="snake-scoreboard">
          <div className="score-display">
            Score: <span id="snake-score" className={scorePop ? 'score-pop' : ''}>{score}</span>
          </div>
          <div className="score-display high-score-display">
            High Score: <span id="snake-highscore">{highScore}</span>
          </div>
        </div>

        <div className="canvas-wrapper">
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} id="snake-canvas" />
          <div id="snake-overlay" className={`game-overlay${overlayHidden ? ' hidden' : ''}`}>
            <div className="overlay-content">
              <h2 className={overlayTitle === 'Nice try!' ? 'nice-try-title' : 'game-over-title'}>{overlayTitle}</h2>
              <p>Score: <span>{overlayScore}</span></p>
              <button className="btn" onClick={restart}>Play Again</button>
            </div>
          </div>
        </div>

        <div className="snake-controls">
          <button className="btn" onClick={restart}>{startBtnText}</button>

          {/* D-Pad (touch only) */}
          <div id="snake-dpad" className="dpad hidden">
            <div className="dpad-row">
              <button className="dpad-btn" data-dir="up" aria-label="Up">&#9650;</button>
            </div>
            <div className="dpad-row">
              <button className="dpad-btn" data-dir="left" aria-label="Left">&#9664;</button>
              <button className="dpad-btn" data-dir="down" aria-label="Down">&#9660;</button>
              <button className="dpad-btn" data-dir="right" aria-label="Right">&#9654;</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
