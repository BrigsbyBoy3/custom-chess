/**
 * Centralized game state management
 * 
 * This module manages the single source of truth for game state.
 * Designed to support online multiplayer by providing easy serialization
 * of the minimal state needed (move history, turn, timers).
 */

// Unified game state - single source of truth
const gameState = {
  // Board state
  board: [],
  selectedSquare: null,
  legalMoves: [],
  lastMove: null, // Track last move for en passant
  // Note: boardFlipped is now in viewState.js (client-side UI preference, not shared)
  
  // Turn and game status
  turn: 'white', // Current player whose turn it is
  gameOver: false,
  gameResult: null, // 'checkmate', 'stalemate', 'repetition', 'timeout', or null
  gameHasStarted: false,
  
  // Move tracking
  moveCount: 0,
  moveHistory: [], // Array of move objects
  positionHistory: [], // Track position signatures for repetition detection
  
  // Player data
  players: {
    white: {
      color: 'white',
      captures: '', // String of captured piece types (e.g., "qrbp") - lowercase letters
      timer: {
        timeRemaining: 600000, // milliseconds
        timerInterval: null,
        timerStartTime: null
      },
      castling: {
        kingside: true,
        queenside: true
      }
    },
    black: {
      color: 'black',
      captures: '',
      timer: {
        timeRemaining: 600000,
        timerInterval: null,
        timerStartTime: null
      },
      castling: {
        kingside: true,
        queenside: true
      }
    }
  }
};

/**
 * Get the current game state (read-only access)
 */
export function getGameState() {
  return gameState;
}

/**
 * Get a specific property from game state
 */
export function getStateProperty(key) {
  return gameState[key];
}

/**
 * Set a specific property in game state
 */
export function setStateProperty(key, value) {
  gameState[key] = value;
}

/**
 * Serialize game state for multiplayer synchronization
 * Returns only the minimal data needed for online play:
 * 1. Move history (array of move objects)
 * 2. Current turn (string: 'white' | 'black')
 * 3. White's time remaining (number in milliseconds)
 * 4. Black's time remaining (number in milliseconds)
 * 
 * All other state (board, castling rights, en passant, etc.) can be
 * reconstructed from move history starting from the initial position.
 */
export function serializeForMultiplayer() {
  return {
    moveHistory: JSON.parse(JSON.stringify(gameState.moveHistory)), // Deep copy
    turn: gameState.turn,
    whiteTime: gameState.players.white.timer.timeRemaining,
    blackTime: gameState.players.black.timer.timeRemaining
  };
}

/**
 * Deserialize multiplayer state and apply it to game state
 * This will reconstruct the board and all derived state from move history
 */
export function deserializeFromMultiplayer(multiplayerState) {
  // Validate required fields
  if (!multiplayerState.moveHistory || 
      !multiplayerState.turn || 
      typeof multiplayerState.whiteTime !== 'number' ||
      typeof multiplayerState.blackTime !== 'number') {
    throw new Error('Invalid multiplayer state: missing required fields');
  }
  
  // Apply move history and timers
  // Note: This will need to be called after board initialization
  // The actual board reconstruction should be handled by the game logic
  gameState.moveHistory = JSON.parse(JSON.stringify(multiplayerState.moveHistory));
  gameState.turn = multiplayerState.turn;
  gameState.players.white.timer.timeRemaining = multiplayerState.whiteTime;
  gameState.players.black.timer.timeRemaining = multiplayerState.blackTime;
  
  // Mark game as started if there are moves
  gameState.gameHasStarted = multiplayerState.moveHistory.length > 0;
}

/**
 * Initialize the chess board with starting positions
 */
export function initializeBoard() {
  gameState.board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces (top)
  gameState.board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'black', hasMoved: false }));
  gameState.board[1] = Array(8).fill(null).map(() => ({ type: 'p', color: 'black', hasMoved: false }));
  
  // White pieces (bottom)
  gameState.board[6] = Array(8).fill(null).map(() => ({ type: 'p', color: 'white', hasMoved: false }));
  gameState.board[7] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'white', hasMoved: false }));
  
  // Reset game state
  gameState.turn = 'white';
  gameState.selectedSquare = null;
  gameState.legalMoves = [];
  gameState.lastMove = null;
  gameState.gameOver = false;
  gameState.gameResult = null;
  gameState.moveCount = 0;
  gameState.positionHistory = [];
  gameState.moveHistory = [];
  gameState.gameHasStarted = false;
  
  // Reset player data
  gameState.players.white.captures = '';
  gameState.players.black.captures = '';
  gameState.players.white.castling = { kingside: true, queenside: true };
  gameState.players.black.castling = { kingside: true, queenside: true };
  
  // Reset and stop timers (but keep time remaining values)
  // Timer intervals will be stopped by timer module
  gameState.players.white.timer.timerInterval = null;
  gameState.players.white.timer.timerStartTime = null;
  gameState.players.black.timer.timerInterval = null;
  gameState.players.black.timer.timerStartTime = null;
  gameState.players.white.timer.timeRemaining = 600000;
  gameState.players.black.timer.timeRemaining = 600000;
}

/**
 * Reset game to initial state
 */
export function resetGame() {
  initializeBoard();
}

