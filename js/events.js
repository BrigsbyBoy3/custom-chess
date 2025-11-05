/**
 * Event dispatching for game state updates
 */

import { getGameState } from './gameState.js';

/**
 * Dispatch unified game state update to all components
 */
export function dispatchGameStateUpdate() {
  const gameState = getGameState();
  window.dispatchEvent(new CustomEvent('gameStateUpdate', {
    detail: {
      turn: gameState.turn,
      gameOver: gameState.gameOver,
      gameResult: gameState.gameResult,
      gameHasStarted: gameState.gameHasStarted,
      moveHistory: gameState.moveHistory, // Include move history
      players: {
        white: {
          captures: gameState.players.white.captures,
          timer: {
            timeRemaining: gameState.players.white.timer.timeRemaining,
            isRunning: gameState.players.white.timer.timerInterval !== null
          },
          castling: gameState.players.white.castling
        },
        black: {
          captures: gameState.players.black.captures,
          timer: {
            timeRemaining: gameState.players.black.timer.timeRemaining,
            isRunning: gameState.players.black.timer.timerInterval !== null
          },
          castling: gameState.players.black.castling
        }
      }
    }
  }));
}

