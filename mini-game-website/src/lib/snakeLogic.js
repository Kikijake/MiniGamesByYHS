/**
 * Snake Game — Pure game logic (no DOM, no React)
 * Extracted from the original vanilla JS snake.js
 */

export const GRID_SIZE = 20;
export const CANVAS_SIZE = 400;
export const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 20

export const SPEED_CONFIG = {
  base: 130,
  min: 50,
  decreasePerScore: 5,
  scoreInterval: 50,
};

export const KEY_MAP = {
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

/**
 * Initialize the snake at the center of the grid.
 * Returns the initial snake array (head first).
 */
export function initSnakeState() {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

/**
 * Spawn food at a random position not occupied by the snake.
 * Returns { x, y }.
 */
export function spawnFood(snake, gridSize = GRID_SIZE) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  let x, y;
  do {
    x = Math.floor(Math.random() * gridSize);
    y = Math.floor(Math.random() * gridSize);
  } while (occupied.has(`${x},${y}`));
  return { x, y };
}

/**
 * Process the direction queue and prevent reversal.
 * Returns { nextDirection, remainingQueue }.
 */
export function processDirectionQueue(queue, currentDir) {
  const remaining = [...queue];
  let nextDir = { ...currentDir };

  while (remaining.length > 0) {
    const candidate = remaining[0];
    // Prevent 180 degree reversal
    if (candidate.x === -nextDir.x && candidate.y === -nextDir.y) {
      remaining.shift();
      continue;
    }
    // Prevent same direction (no-op)
    if (candidate.x === nextDir.x && candidate.y === nextDir.y) {
      remaining.shift();
      continue;
    }
    nextDir = remaining.shift();
    break;
  }

  return { nextDirection: nextDir, remainingQueue: remaining };
}

/**
 * Check if a direction is a reversal of the current direction.
 */
export function preventReversal(newDir, currentDir) {
  if (newDir.x === -currentDir.x && newDir.y === -currentDir.y) {
    return { ...currentDir };
  }
  return { ...newDir };
}

/**
 * Check for wall or self collision.
 * Returns 'wall', 'self', or null.
 */
export function checkCollision(head, snake, gridSize = GRID_SIZE) {
  // Wall collision
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    return 'wall';
  }
  // Self collision (check against body segments, excluding the tail which will move)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      return 'self';
    }
  }
  return null;
}

/**
 * Update the snake game state.
 * Takes a state object and returns a new state object.
 *
 * @param {object} state - { snake, direction, nextDirection, directionQueue, food, score, tickInterval }
 * @returns {object} - Updated state with any changes, plus collision/over info
 */
export function updateSnake(state) {
  const {
    snake,
    direction,
    directionQueue,
    food,
    score,
    tickInterval,
  } = state;

  let newSnake = snake.map((s) => ({ ...s }));
  let newDirection = { ...direction };
  let newDirectionQueue = [...directionQueue];
  let newFood = { ...food };
  let newScore = score;
  let newTickInterval = tickInterval;
  let collision = null;
  let ate = false;

  // Process direction queue
  const processed = processDirectionQueue(newDirectionQueue, newDirection);
  newDirection = processed.nextDirection;
  newDirectionQueue = processed.remainingQueue;

  // Compute new head position
  const head = newSnake[0];
  const newHead = { x: head.x + newDirection.x, y: head.y + newDirection.y };

  // Collision check
  collision = checkCollision(newHead, newSnake, GRID_SIZE);
  if (collision) {
    return {
      snake: newSnake,
      direction: newDirection,
      nextDirection: newDirection,
      directionQueue: newDirectionQueue,
      food: newFood,
      score: newScore,
      tickInterval: newTickInterval,
      collision,
      ate: false,
      gameOver: true,
    };
  }

  // Move: add new head
  newSnake.unshift(newHead);

  // Food collision
  if (newHead.x === newFood.x && newHead.y === newFood.y) {
    newScore += 10;
    ate = true;
    // Speed up
    newTickInterval = Math.max(
      SPEED_CONFIG.min,
      SPEED_CONFIG.base - Math.floor(newScore / SPEED_CONFIG.scoreInterval) * SPEED_CONFIG.decreasePerScore
    );
    // Spawn new food
    newFood = spawnFood(newSnake, GRID_SIZE);
  } else {
    newSnake.pop();
  }

  return {
    snake: newSnake,
    direction: newDirection,
    nextDirection: newDirection,
    directionQueue: newDirectionQueue,
    food: newFood,
    score: newScore,
    tickInterval: newTickInterval,
    collision: null,
    ate,
    gameOver: false,
  };
}

// --- Particle System ---

const MAX_PARTICLES = 60;

/**
 * Create a single particle object.
 */
export function createParticle(x, y, color, size = 3) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 1 + Math.random() * 3;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    decay: 0.015 + Math.random() * 0.025,
    color,
    size: size * (0.5 + Math.random() * 0.5),
  };
}

/**
 * Emit a burst of particles at a position.
 * Returns an array of new particles (to be concatenated).
 */
export function emitParticles(x, y, color, count = 5, size = 3, currentCount = 0) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    if (currentCount + particles.length >= MAX_PARTICLES) break;
    particles.push(createParticle(x, y, color, size));
  }
  return particles;
}

/**
 * Update all particles: move, decay, remove dead ones.
 * Returns the updated particle array.
 */
export function updateParticles(particles) {
  const updated = [];
  for (const p of particles) {
    const np = { ...p };
    np.x += np.vx;
    np.y += np.vy;
    np.vx *= 0.97;
    np.vy *= 0.97;
    np.life -= np.decay;
    if (np.life > 0) {
      updated.push(np);
    }
  }
  return updated;
}
