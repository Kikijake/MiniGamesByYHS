import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <section id="page-home" className="page active">
      <div className="hub-container">
        <h1 className="hub-title">Game Hub</h1>
        <p className="hub-subtitle">Choose your game</p>
        <div className="hub-cards">
          {/* Snake Card */}
          <Link to="/snake" className="hub-card" data-game="snake">
            <div className="hub-card-icon">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <rect x="10" y="10" width="80" height="80" rx="16" fill="#1e3a2f" stroke="#4ade80" strokeWidth="3" />
                <path d="M30 50 Q40 30 55 40 Q70 50 65 65 Q60 75 50 70 Q40 65 45 55 Q50 45 60 50" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />
                <circle cx="58" cy="45" r="3" fill="#4ade80" />
                <path d="M55 45 L60 42 L62 47 Z" fill="#4ade80" />
              </svg>
            </div>
            <h2 className="hub-card-title">Snake</h2>
            <p className="hub-card-desc">Classic snake action &mdash; eat, grow, survive!</p>
            <span className="hub-card-link">Play &rarr;</span>
          </Link>
          {/* Tic-Tac-Toe Card */}
          <Link to="/tictactoe" className="hub-card" data-game="tictactoe">
            <div className="hub-card-icon">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <rect x="10" y="10" width="80" height="80" rx="16" fill="#1e1e3a" stroke="#818cf8" strokeWidth="3" />
                <line x1="28" y1="28" x2="48" y2="48" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" />
                <line x1="48" y1="28" x2="28" y2="48" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" />
                <circle cx="72" cy="72" r="12" stroke="#f472b6" strokeWidth="5" fill="none" />
              </svg>
            </div>
            <h2 className="hub-card-title">Tic-Tac-Toe</h2>
            <p className="hub-card-desc">X's and O's &mdash; outthink your opponent!</p>
            <span className="hub-card-link">Play &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
