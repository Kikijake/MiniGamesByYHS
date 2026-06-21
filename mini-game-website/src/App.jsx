import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import SnakeGame from './components/SnakeGame';
import TicTacToe from './components/TicTacToe';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/snake" element={<SnakeGame />} />
        <Route path="/tictactoe" element={<TicTacToe />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}
