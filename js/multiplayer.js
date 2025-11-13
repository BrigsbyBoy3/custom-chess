/**
 * Multiplayer communication layer
 * 
 * Uses Supabase Realtime for cross-device multiplayer communication
 * Falls back to BroadcastChannel for local tab-to-tab communication if Supabase is not configured
 */

import { serializeForMultiplayer, deserializeFromMultiplayer, getGameState } from './gameState.js';
import { renderBoard } from './boardRenderer.js';
import { dispatchGameStateUpdate } from './events.js';
import { stopAllTimers, startPlayerTimer } from './timer.js';
import { SUPABASE_CONFIG } from './supabaseConfig.js';

let supabaseClient = null;
let supabaseChannel = null;
let broadcastChannel = null; // Fallback for local testing
let isMultiplayerEnabled = false;
let localPlayerColor = null; // 'white' or 'black' - which player this browser controls
let gameRoomId = 'default-game'; // For now, use a single game room. Later, can support multiple rooms

/**
 * Handle incoming game state messages (shared between Supabase and BroadcastChannel)
 */
async function handleGameStateMessage(data) {
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
    console.log('Received game state');
    console.log(`Current player: ${localPlayerColor}, Turn: ${gameState.turn}, Can move: ${canMakeMove()}`);
  } catch (error) {
    console.error('Error deserializing game state:', error);
  }
}

/**
 * Initialize multiplayer connection
 * @param {string} playerColor - Optional: 'white' or 'black'. If not provided, will auto-assign.
 */
export function enableMultiplayer(playerColor = null) {
  if (isMultiplayerEnabled) {
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
  
  // Try to use Supabase Realtime if configured
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && typeof window !== 'undefined' && window.supabase) {
    try {
      // Initialize Supabase client
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      
      // Subscribe to Realtime channel for game state updates
      supabaseChannel = supabaseClient
        .channel(`chess-game-${gameRoomId}`)
        .on('broadcast', { event: 'gameState' }, (payload) => {
          // Ignore our own messages
          if (payload.payload && payload.payload.senderId === getSenderId()) {
            return;
          }
          if (payload.payload && payload.payload.data) {
            handleGameStateMessage(payload.payload.data);
          }
        })
        .on('broadcast', { event: 'requestState' }, (payload) => {
          // Another client is requesting current game state (e.g., after refresh)
          // Ignore our own requests
          if (payload.payload && payload.payload.senderId === getSenderId()) {
            return;
          }
          // Send our current state
          const state = serializeForMultiplayer();
          supabaseChannel.send({
            type: 'broadcast',
            event: 'gameState',
            payload: {
              data: state,
              senderId: getSenderId()
            }
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to Supabase Realtime');
            // Request current game state on initial connection
            setTimeout(() => {
              if (supabaseChannel) {
                supabaseChannel.send({
                  type: 'broadcast',
                  event: 'requestState',
                  payload: {
                    senderId: getSenderId()
                  }
                });
              }
            }, 100);
          }
        });
      
      isMultiplayerEnabled = true;
      console.log(`Multiplayer enabled (Supabase) - you are playing as ${localPlayerColor}`);
      return;
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      console.log('Falling back to BroadcastChannel for local testing');
    }
  }
  
  // Fallback to BroadcastChannel for local tab-to-tab communication
  if (typeof BroadcastChannel !== 'undefined') {
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
        handleGameStateMessage(data);
      }
    });
    
    console.log(`Multiplayer enabled (BroadcastChannel - local only) - you are playing as ${localPlayerColor}`);
    
    // Request current game state from other tabs on initial connection
    setTimeout(() => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'requestState'
        });
      }
    }, 100);
  } else {
    console.error('Multiplayer not available: Supabase not configured and BroadcastChannel not supported');
  }
}

/**
 * Generate a unique sender ID for this client
 * Used to ignore our own messages in Supabase Realtime
 */
function getSenderId() {
  let senderId = sessionStorage.getItem('chess-sender-id');
  if (!senderId) {
    senderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chess-sender-id', senderId);
  }
  return senderId;
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
  if (supabaseChannel) {
    supabaseClient.removeChannel(supabaseChannel);
    supabaseChannel = null;
    supabaseClient = null;
  }
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  isMultiplayerEnabled = false;
  console.log('Multiplayer disabled');
}

/**
 * Send current game state to other clients
 */
export function broadcastGameState() {
  if (!isMultiplayerEnabled) {
    return;
  }
  
  const state = serializeForMultiplayer();
  
  // Use Supabase Realtime if available
  if (supabaseChannel) {
    supabaseChannel.send({
      type: 'broadcast',
      event: 'gameState',
      payload: {
        data: state,
        senderId: getSenderId()
      }
    });
  } 
  // Fallback to BroadcastChannel
  else if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'gameState',
      data: state
    });
  }
}

/**
 * Check if multiplayer is enabled
 */
export function isMultiplayerActive() {
  return isMultiplayerEnabled;
}

