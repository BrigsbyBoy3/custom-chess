/**
 * Multiplayer communication layer
 * 
 * Increment 1: Simple BroadcastChannel-based communication between browser tabs
 * This allows testing multiplayer locally without a server
 */

import { serializeForMultiplayer, deserializeFromMultiplayer, getGameState } from './gameState.js';
import { renderBoard } from './boardRenderer.js';
import { dispatchGameStateUpdate } from './events.js';
import { stopAllTimers, startPlayerTimer } from './timer.js';

let broadcastChannel = null;
let isMultiplayerEnabled = false;
let localPlayerColor = null; // 'white' or 'black' - which player this browser controls

/**
 * Initialize multiplayer connection
 * @param {string} playerColor - Optional: 'white' or 'black'. If not provided, will auto-assign.
 */
export function enableMultiplayer(playerColor = null) {
  if (broadcastChannel) {
    console.log('Multiplayer already enabled');
    return;
  }
  
  // Assign player color
  if (playerColor) {
    localPlayerColor = playerColor;
    sessionStorage.setItem('chess-player-color', playerColor);
  } else {
    localPlayerColor = assignPlayerColor();
  }
  
  // Create BroadcastChannel for tab-to-tab communication
  broadcastChannel = new BroadcastChannel('chess-game');
  isMultiplayerEnabled = true;
  
  // Listen for messages from other tabs
  broadcastChannel.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'gameState') {
      // Receive game state from another tab
      try {
        // Stop all timers before deserializing (to avoid conflicts)
        stopAllTimers();
        
        deserializeFromMultiplayer(data);
        
        // Sync timers after deserializing
        const gameState = getGameState();
        if (!gameState.gameOver && gameState.gameHasStarted) {
          // Start the timer for the current player (whose turn it is)
          startPlayerTimer(gameState.turn);
        }
        
        renderBoard();
        dispatchGameStateUpdate();
        console.log('Received game state from another tab');
      } catch (error) {
        console.error('Error deserializing game state:', error);
      }
    }
  });
  
  console.log(`Multiplayer enabled - you are playing as ${localPlayerColor}`);
}

/**
 * Auto-assign player color (simple: first connection gets white, second gets black)
 * Uses sessionStorage to coordinate between tabs
 */
function assignPlayerColor() {
  // Check if we already have a stored color
  const storedColor = sessionStorage.getItem('chess-player-color');
  if (storedColor === 'white' || storedColor === 'black') {
    return storedColor;
  }
  
  // Default: first player is white
  const assignedColor = 'white';
  sessionStorage.setItem('chess-player-color', assignedColor);
  console.log(`Auto-assigned player color: ${assignedColor}`);
  console.log('If you are the second player, call: window.chessGame.setPlayerColor("black")');
  return assignedColor;
}

/**
 * Set which player this browser controls
 * @param {string} color - 'white' or 'black'
 */
export function setPlayerColor(color) {
  if (color !== 'white' && color !== 'black') {
    console.error('Invalid player color. Must be "white" or "black"');
    return;
  }
  localPlayerColor = color;
  sessionStorage.setItem('chess-player-color', color);
  console.log(`Player color set to: ${color}`);
}

/**
 * Get which player this browser controls
 * @returns {string|null} 'white', 'black', or null if not assigned
 */
export function getPlayerColor() {
  return localPlayerColor;
}

/**
 * Check if it's this player's turn
 * @returns {boolean}
 */
export function isMyTurn() {
  if (!localPlayerColor) return false;
  const gameState = getGameState();
  return gameState.turn === localPlayerColor;
}

/**
 * Check if this player can make moves
 * @returns {boolean}
 */
export function canMakeMove() {
  if (!localPlayerColor) return false;
  const gameState = getGameState();
  return !gameState.gameOver && gameState.turn === localPlayerColor;
}

/**
 * Disable multiplayer connection
 */
export function disableMultiplayer() {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
    isMultiplayerEnabled = false;
    console.log('Multiplayer disabled');
  }
}

/**
 * Send current game state to other tabs
 */
export function broadcastGameState() {
  if (!isMultiplayerEnabled || !broadcastChannel) {
    return;
  }
  
  const state = serializeForMultiplayer();
  broadcastChannel.postMessage({
    type: 'gameState',
    data: state
  });
}

/**
 * Check if multiplayer is enabled
 */
export function isMultiplayerActive() {
  return isMultiplayerEnabled;
}

