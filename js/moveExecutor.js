/**
 * Move execution logic
 * Handles making moves, updating castling rights, tracking captures, etc.
 */

import { getGameState, setStateProperty } from './gameState.js';
import { findAmbiguousPieces } from './moveGenerator.js';
import { isKingInCheck, isCheckmate, isStalemate, isThreefoldRepetition, hasInsufficientMaterial, getPositionSignature } from './gameRules.js';
import { stopPlayerTimer, startPlayerTimer, stopAllTimers } from './timer.js';
import { dispatchGameStateUpdate } from './events.js';

/**
 * Update castling rights when a piece moves
 */
function updateCastlingRights(piece, fromRow, fromCol) {
  const gameState = getGameState();
  if (!piece) return;
  
  const playerColor = piece.color;
  
  // If king moved, lose all castling rights
  if (piece.type === 'k') {
    gameState.players[playerColor].castling.kingside = false;
    gameState.players[playerColor].castling.queenside = false;
  }
  // If rook moved, lose the corresponding castling right
  else if (piece.type === 'r') {
    // Kingside rook is at col 7, queenside rook is at col 0
    // White rooks start at row 7, black rooks start at row 0
    const isKingsideRook = fromCol === 7;
    const isQueensideRook = fromCol === 0;
    
    if (isKingsideRook) {
      gameState.players[playerColor].castling.kingside = false;
    }
    if (isQueensideRook) {
      gameState.players[playerColor].castling.queenside = false;
    }
  }
}

/**
 * Make a move
 */
export function makeMove(fromRow, fromCol, toRow, toCol) {
  const gameState = getGameState();
  const piece = gameState.board[fromRow][fromCol];
  const move = gameState.legalMoves.find(m => m.row === toRow && m.col === toCol);
  
  // Capture piece type/color BEFORE making move (before promotion changes piece.type)
  // This ensures historical moves show correct piece type
  const pieceTypeAtMove = piece.type;
  const pieceColorAtMove = piece.color;
  
  // Check for ambiguous moves BEFORE making the move (need current board state)
  const ambiguousPieces = findAmbiguousPieces(piece.type, piece.color, fromRow, fromCol, toRow, toCol);
  
  // Check for promotion BEFORE making the move (piece.type will change after)
  const isPromotion = piece.type === 'p' && (toRow === 0 || toRow === 7);
  
  // Check for captures
  const capturedPiece = gameState.board[toRow][toCol];
  let enPassantCapture = null;
  
  // Handle castling
  if (move && move.isCastling) {
    // Move king
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;
    piece.hasMoved = true;
    
    // Update castling rights - king has moved, can't castle anymore
    gameState.players[piece.color].castling.kingside = false;
    gameState.players[piece.color].castling.queenside = false;
    
    // Move rook
    const rookFromCol = move.rookCol;
    const rookToCol = toCol === 6 ? 5 : 3; // Kingside: 5, Queenside: 3
    const rook = gameState.board[fromRow][rookFromCol];
    gameState.board[fromRow][rookToCol] = rook;
    gameState.board[fromRow][rookFromCol] = null;
    rook.hasMoved = true;
  } else if (move && move.isEnPassant) {
    // En passant capture
    enPassantCapture = gameState.board[fromRow][toCol];
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;
    piece.hasMoved = true;
    
    // Remove the captured pawn (on the same row as the capturing pawn)
    gameState.board[fromRow][toCol] = null;
    
    // Update castling rights if king or rook moved
    updateCastlingRights(piece, fromRow, fromCol);
  } else {
    // Normal move
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;
    piece.hasMoved = true;

    // Pawn promotion (auto-promote to queen)
    if (isPromotion) {
      gameState.board[toRow][toCol].type = 'q';
    }
    
    // Update castling rights if king or rook moved
    updateCastlingRights(piece, fromRow, fromCol);
  }
  
  // Also check if a rook was captured (this removes castling rights)
  if (capturedPiece && capturedPiece.type === 'r') {
    // If a rook was captured, determine which side it was on
    const playerColor = capturedPiece.color;
    // Rook at col 7 is kingside, col 0 is queenside
    // White rooks start at row 0, black rooks start at row 7
    if (toCol === 7 && ((playerColor === 'white' && toRow === 0) || (playerColor === 'black' && toRow === 7))) {
      gameState.players[playerColor].castling.kingside = false;
    }
    if (toCol === 0 && ((playerColor === 'white' && toRow === 0) || (playerColor === 'black' && toRow === 7))) {
      gameState.players[playerColor].castling.queenside = false;
    }
  }

  // Track captured piece in game state
  if (capturedPiece || enPassantCapture) {
    const captured = capturedPiece || enPassantCapture;
    const capturingPlayer = gameState.turn; // Player who made the move (before switch)
    
    // Add captured piece to the capturing player's string
    // Order: Q R B N P (most valuable to least, pawns at end)
    // Store piece types (q, r, b, n, p) - Unicode rendering will be done in PlayerInfo based on theme
    // Order by piece value: q r b n p (most valuable first, pawns last)
    const order = { q: 1, r: 2, b: 3, n: 4, p: 5 };
    let currentString = gameState.players[capturingPlayer].captures || '';
    
    // Convert current string to array of piece types
    const currentPieces = currentString.split('').filter(p => p);
    
    // Insert new piece in order
    const newPieceType = captured.type;
    const insertIndex = currentPieces.findIndex(p => (order[p] || 6) > order[newPieceType]);
    
    if (insertIndex === -1) {
      currentPieces.push(newPieceType);
    } else {
      currentPieces.splice(insertIndex, 0, newPieceType);
    }
    
    // Store as piece types (lowercase letters: q, r, b, n, p)
    gameState.players[capturingPlayer].captures = currentPieces.join('');
    
    // Dispatch game state update
    dispatchGameStateUpdate();
  }

  // Track last move for en passant
  gameState.lastMove = {
    piece: piece,
    fromRow: fromRow,
    fromCol: fromCol,
    toRow: toRow,
    toCol: toCol
  };

  // Increment move count
  gameState.moveCount++;
  
  // Check if this move puts the opponent in check (before switching players)
  const opponentColor = gameState.turn === 'white' ? 'black' : 'white';
  const putsInCheck = isKingInCheck(opponentColor);
  
  // Determine promoted piece (if promotion occurred)
  const promotedPiece = isPromotion ? 'q' : null;
  
  // Add move to history
  const movePlayer = gameState.turn; // The player who made this move (before switch)
  gameState.moveHistory.push({
    piece: { type: pieceTypeAtMove, color: pieceColorAtMove },
    fromRow: fromRow,
    fromCol: fromCol,
    toRow: toRow,
    toCol: toCol,
    player: movePlayer,
    moveNumber: gameState.moveCount,
    isCastling: move && move.isCastling,
    isEnPassant: move && move.isEnPassant,
    isCapture: !!(capturedPiece || enPassantCapture),
    promotedPiece: promotedPiece,
    putsInCheck: putsInCheck,
    ambiguousPieces: ambiguousPieces
  });
  
  // Dispatch move made event (before switching players)
  window.dispatchEvent(new CustomEvent('moveMade', {
    detail: {
      piece: { type: pieceTypeAtMove, color: pieceColorAtMove }, // Snapshot, not reference
      fromRow: fromRow,
      fromCol: fromCol,
      toRow: toRow,
      toCol: toCol,
      player: movePlayer,
      moveNumber: gameState.moveCount,
      isCastling: move && move.isCastling,
      isEnPassant: move && move.isEnPassant,
      isCapture: !!(capturedPiece || enPassantCapture),
      promotedPiece: promotedPiece,
      putsInCheck: putsInCheck,
      ambiguousPieces: ambiguousPieces // Array of {row, col} for other pieces that could reach toSquare
    }
  }));
  
  // Mark game as started
  if (!gameState.gameHasStarted) {
    gameState.gameHasStarted = true;
  }
  
  // Switch players
  const previousPlayer = gameState.turn;
  gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
  
  // Manage timers: stop previous player's timer, start new player's timer
  if (!gameState.gameOver) {
    stopPlayerTimer(previousPlayer);
    startPlayerTimer(gameState.turn);
  }
  
  // Dispatch turn change event
  window.dispatchEvent(new CustomEvent('turnChange', {
    detail: {
      currentPlayer: gameState.turn
    }
  }));
  
  // Dispatch game state update so components sync
  dispatchGameStateUpdate();
  
  // Stop all timers when game ends
  // Check for checkmate, stalemate, threefold repetition, or insufficient material
  // Note: Check repetition BEFORE saving position (we want to detect if position occurred 2 times before)
  let winner = null;
  if (isCheckmate(gameState.turn)) {
    gameState.gameOver = true;
    gameState.gameResult = 'checkmate';
    stopAllTimers();
    // The winner is the player who just made the move (the one whose turn it was before switching)
    winner = gameState.turn === 'white' ? 'black' : 'white';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: winner
      }
    }));
    dispatchGameStateUpdate();
  } else if (isThreefoldRepetition()) {
    gameState.gameOver = true;
    gameState.gameResult = 'repetition';
    stopAllTimers();
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: null // Draw - no winner
      }
    }));
    dispatchGameStateUpdate();
  } else if (isStalemate(gameState.turn) || hasInsufficientMaterial()) {
    gameState.gameOver = true;
    gameState.gameResult = 'stalemate';
    stopAllTimers();
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: null // Draw - no winner
      }
    }));
    dispatchGameStateUpdate();
  }
  
  // Save current position to history (after the move and player switch)
  // Save after checks so we detect if position occurred 2 times before (making this the 3rd)
  gameState.positionHistory.push(getPositionSignature());
}

