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
    // Check if we already have a stored color
    const storedColor = sessionStorage.getItem('chess-player-color');
    if (storedColor === 'white' || storedColor === 'black') {
      localPlayerColor = storedColor;
    } else {
      // Default to white if no color assigned
      localPlayerColor = 'white';
      sessionStorage.setItem('chess-player-color', 'white');
    }
  }
  
  // Create BroadcastChannel for tab-to-tab communication
  broadcastChannel = new BroadcastChannel('chess-game');
  isMultiplayerEnabled = true;
  
  // Listen for messages from other tabs
  broadcastChannel.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'requestState') {
      // Another tab is requesting current game state (e.g., after refresh)
      // Send our current state
      const state = serializeForMultiplayer();
      broadcastChannel.postMessage({
        type: 'gameState',
        data: state
      });
    } else if (type === 'gameState') {
      // Receive game state from another tab
      (async () => {
        try {
          // Stop all timers before deserializing (to avoid conflicts)
          stopAllTimers();
          
          // Make sure player color is set before deserializing
          if (!localPlayerColor) {
            const storedColor = sessionStorage.getItem('chess-player-color');
            if (storedColor === 'white' || storedColor === 'black') {
              localPlayerColor = storedColor;
            } else {
              // Default to white if no color assigned
              localPlayerColor = 'white';
              sessionStorage.setItem('chess-player-color', 'white');
            }
          }
          
          await deserializeFromMultiplayer(data);
          
          // Sync timers after deserializing
          const gameState = getGameState();
          if (!gameState.gameOver && gameState.gameHasStarted) {
            // Start the timer for the current player (whose turn it is)
            startPlayerTimer(gameState.turn);
          }
          
          renderBoard();
          dispatchGameStateUpdate();
          console.log('Received game state from another tab');
          console.log(`Current player: ${localPlayerColor}, Turn: ${gameState.turn}, Can move: ${canMakeMove()}`);
        } catch (error) {
          console.error('Error deserializing game state:', error);
        }
      })();
    }
  });
  
  console.log(`Multiplayer enabled - you are playing as ${localPlayerColor}`);
  
  // Request current game state from other tabs on initial connection
  // This helps sync state when a tab refreshes
  // Send a request message - other tabs will respond with their current state
  setTimeout(() => {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'requestState'
      });
    }
  }, 100);
}

/**
 * Show player selection modal
 */
function showPlayerSelectionModal() {
  const modal = document.getElementById('playerSelectionModal');
  if (modal) {
    modal.open();
  }
}

/**
 * Show player selection modal (exported for manual use)
 */
export function openPlayerSelectionModal() {
  showPlayerSelectionModal();
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
  
  // Log current game state for debugging
  const gameState = getGameState();
  console.log(`Current turn: ${gameState.turn}, Game over: ${gameState.gameOver}, Can move: ${canMakeMove()}`);
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
  // Make sure player color is set (restore from sessionStorage if needed)
  if (!localPlayerColor) {
    const storedColor = sessionStorage.getItem('chess-player-color');
    if (storedColor === 'white' || storedColor === 'black') {
      localPlayerColor = storedColor;
    } else {
      // No color assigned - can't make moves
      return false;
    }
  }
  
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

