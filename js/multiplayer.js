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

/**
 * Initialize multiplayer connection
 */
export function enableMultiplayer() {
  if (broadcastChannel) {
    console.log('Multiplayer already enabled');
    return;
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
  
  console.log('Multiplayer enabled - listening for messages from other tabs');
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

