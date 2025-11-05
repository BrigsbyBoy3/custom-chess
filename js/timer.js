/**
 * Timer management for chess game
 */

import { getGameState, setStateProperty } from './gameState.js';
import { dispatchGameStateUpdate } from './events.js';

/**
 * Start a player's timer
 */
export function startPlayerTimer(player) {
  const gameState = getGameState();
  if (!gameState.players[player] || gameState.gameOver) return;
  
  stopPlayerTimer(player); // Clear any existing timer
  
  // Record when timer started
  gameState.players[player].timer.timerStartTime = Date.now();
  
  // Update every 100ms for smooth display
  gameState.players[player].timer.timerInterval = setInterval(() => {
    if (gameState.gameOver) {
      stopPlayerTimer(player);
      return;
    }
    
    const elapsed = Date.now() - gameState.players[player].timer.timerStartTime;
    gameState.players[player].timer.timeRemaining -= elapsed;
    gameState.players[player].timer.timerStartTime = Date.now(); // Reset for next interval
    
    if (gameState.players[player].timer.timeRemaining <= 0) {
      gameState.players[player].timer.timeRemaining = 0;
      stopPlayerTimer(player);
      // Dispatch time's up event
      window.dispatchEvent(new CustomEvent('timeUp', {
        detail: { player: player }
      }));
    }
    
    // Dispatch game state update for timer updates
    dispatchGameStateUpdate();
  }, 100); // Update 10 times per second
}

/**
 * Stop a player's timer
 */
export function stopPlayerTimer(player) {
  const gameState = getGameState();
  if (!gameState.players[player]) return;
  
  if (gameState.players[player].timer.timerInterval) {
    clearInterval(gameState.players[player].timer.timerInterval);
    gameState.players[player].timer.timerInterval = null;
    gameState.players[player].timer.timerStartTime = null;
  }
}

/**
 * Stop all timers
 */
export function stopAllTimers() {
  stopPlayerTimer('white');
  stopPlayerTimer('black');
}

