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
 * 5. Game over status (boolean)
 * 6. Game result (string or null)
 * 
 * All other state (board, castling rights, en passant, etc.) can be
 * reconstructed from move history starting from the initial position.
 */
export function serializeForMultiplayer() {
  return {
    moveHistory: JSON.parse(JSON.stringify(gameState.moveHistory)), // Deep copy
    turn: gameState.turn,
    whiteTime: gameState.players.white.timer.timeRemaining,
    blackTime: gameState.players.black.timer.timeRemaining,
    gameOver: gameState.gameOver,
    gameResult: gameState.gameResult
  };
}

/**
 * Deserialize multiplayer state and apply it to game state
 * This will reconstruct the board and all derived state from move history
 */
export async function deserializeFromMultiplayer(multiplayerState) {
  // Validate required fields
  if (!multiplayerState.moveHistory || 
      !multiplayerState.turn || 
      typeof multiplayerState.whiteTime !== 'number' ||
      typeof multiplayerState.blackTime !== 'number') {
    throw new Error('Invalid multiplayer state: missing required fields');
  }
  
  // Apply move history and timers first
  gameState.moveHistory = JSON.parse(JSON.stringify(multiplayerState.moveHistory));
  gameState.turn = multiplayerState.turn;
  gameState.players.white.timer.timeRemaining = multiplayerState.whiteTime;
  gameState.players.black.timer.timeRemaining = multiplayerState.blackTime;
  
  // Restore game over status (important for multiplayer sync)
  gameState.gameOver = multiplayerState.gameOver || false;
  gameState.gameResult = multiplayerState.gameResult || null;
  
  // Mark game as started if there are moves
  gameState.gameHasStarted = multiplayerState.moveHistory.length > 0;
  
  // Reconstruct board from move history
  await reconstructBoardFromMoveHistory();
  
  // If game is over, dispatch game end event so UI updates
  if (gameState.gameOver && gameState.gameResult) {
    // Determine winner if checkmate
    let winner = null;
    if (gameState.gameResult === 'checkmate') {
      // Winner is the player whose turn it is NOT (the one who delivered checkmate)
      winner = gameState.turn === 'white' ? 'black' : 'white';
    } else if (gameState.gameResult === 'timeout') {
      // Winner is the player whose turn it is (the one who didn't run out of time)
      winner = gameState.turn;
    }
    // For stalemate, repetition - winner is null (draw)
    
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: winner
      }
    }));
  }
}

/**
 * Reconstruct board from move history (simplified - just applies moves without events)
 * This function rebuilds the board and position history from move history
 */
async function reconstructBoardFromMoveHistory() {
  // Reset board to starting position
  gameState.board = Array(8).fill(null).map(() => Array(8).fill(null));
  gameState.board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'black', hasMoved: false }));
  gameState.board[1] = Array(8).fill(null).map(() => ({ type: 'p', color: 'black', hasMoved: false }));
  gameState.board[6] = Array(8).fill(null).map(() => ({ type: 'p', color: 'white', hasMoved: false }));
  gameState.board[7] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'white', hasMoved: false }));
  
  // Reset derived state
  gameState.selectedSquare = null;
  gameState.legalMoves = [];
  gameState.lastMove = null;
  gameState.moveCount = 0;
  gameState.positionHistory = [];
  gameState.players.white.captures = '';
  gameState.players.black.captures = '';
  gameState.players.white.castling = { kingside: true, queenside: true };
  gameState.players.black.castling = { kingside: true, queenside: true };
  
  // Import getPositionSignature for rebuilding position history
  const { getPositionSignature } = await import('./gameRules.js');
  
  // Save initial position (before any moves)
  gameState.positionHistory.push(getPositionSignature());
  
  // Apply each move in sequence
  for (const move of gameState.moveHistory) {
    const { fromRow, fromCol, toRow, toCol, piece, isCastling, isEnPassant, promotedPiece, isCapture } = move;
    const pieceObj = gameState.board[fromRow][fromCol];
    if (!pieceObj) continue;
    
    // Track captured piece BEFORE making the move
    let capturedPiece = null;
    if (isEnPassant) {
      // For en passant, captured piece is on the same row, different column
      capturedPiece = gameState.board[fromRow][toCol];
    } else if (isCapture && !isCastling) {
      // For normal captures, captured piece is at destination
      capturedPiece = gameState.board[toRow][toCol];
    }
    
    if (isCastling) {
      gameState.board[toRow][toCol] = pieceObj;
      gameState.board[fromRow][fromCol] = null;
      pieceObj.hasMoved = true;
      const rookFromCol = toCol === 6 ? 7 : 0;
      const rookToCol = toCol === 6 ? 5 : 3;
      const rook = gameState.board[fromRow][rookFromCol];
      if (rook) {
        gameState.board[fromRow][rookToCol] = rook;
        gameState.board[fromRow][rookFromCol] = null;
        rook.hasMoved = true;
      }
      gameState.players[piece.color].castling.kingside = false;
      gameState.players[piece.color].castling.queenside = false;
    } else if (isEnPassant) {
      gameState.board[toRow][toCol] = pieceObj;
      gameState.board[fromRow][fromCol] = null;
      pieceObj.hasMoved = true;
      gameState.board[fromRow][toCol] = null; // Remove captured pawn
      if (pieceObj.type === 'k') {
        gameState.players[pieceObj.color].castling.kingside = false;
        gameState.players[pieceObj.color].castling.queenside = false;
      } else if (pieceObj.type === 'r') {
        if (fromCol === 7) gameState.players[pieceObj.color].castling.kingside = false;
        if (fromCol === 0) gameState.players[pieceObj.color].castling.queenside = false;
      }
    } else {
      gameState.board[toRow][toCol] = pieceObj;
      gameState.board[fromRow][fromCol] = null;
      pieceObj.hasMoved = true;
      if (promotedPiece) pieceObj.type = promotedPiece;
      if (pieceObj.type === 'k') {
        gameState.players[pieceObj.color].castling.kingside = false;
        gameState.players[pieceObj.color].castling.queenside = false;
      } else if (pieceObj.type === 'r') {
        if (fromCol === 7) gameState.players[pieceObj.color].castling.kingside = false;
        if (fromCol === 0) gameState.players[pieceObj.color].castling.queenside = false;
      }
    }
    
    // Reconstruct captures string if a piece was captured
    if (capturedPiece) {
      const capturingPlayer = move.player;
      const order = { q: 1, r: 2, b: 3, n: 4, p: 5 };
      let currentString = gameState.players[capturingPlayer].captures || '';
      const currentPieces = currentString.split('').filter(p => p);
      const newPieceType = capturedPiece.type;
      const insertIndex = currentPieces.findIndex(p => (order[p] || 6) > order[newPieceType]);
      
      if (insertIndex === -1) {
        currentPieces.push(newPieceType);
      } else {
        currentPieces.splice(insertIndex, 0, newPieceType);
      }
      
      gameState.players[capturingPlayer].captures = currentPieces.join('');
    }
    
    gameState.lastMove = { piece: pieceObj, fromRow, fromCol, toRow, toCol };
    gameState.moveCount = move.moveNumber;
    
    // Rebuild position history after each move (needed for repetition detection)
    // Temporarily set turn to the player who just moved to get correct signature
    const tempTurn = gameState.turn;
    gameState.turn = move.player === 'white' ? 'black' : 'white'; // Turn after move
    gameState.positionHistory.push(getPositionSignature());
    gameState.turn = tempTurn; // Restore correct turn
  }
  
  // Turn is already set correctly by deserializeFromMultiplayer before this function is called
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

