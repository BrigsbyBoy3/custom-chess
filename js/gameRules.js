/**
 * Game rules and validation logic
 * Checks for check, checkmate, stalemate, repetition, insufficient material
 */

import { getGameState } from './gameState.js';
import { getLegalMoves, getPieceMoves } from './moveGenerator.js';

/**
 * Find the king's position for a given color
 */
export function findKing(color) {
  const gameState = getGameState();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.type === 'k' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Check if a square is under attack by a given color
 */
export function isSquareUnderAttack(row, col, byColor) {
  const gameState = getGameState();
  // Check all pieces of the attacking color
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameState.board[r][c];
      if (piece && piece.color === byColor) {
        // Get moves for this piece (excluding castling for attack calculation)
        const moves = getPieceMoves(r, c, piece.type, piece.color, false);
        if (moves.some(move => move.row === row && move.col === col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if the king of a given color is in check
 */
export function isKingInCheck(color) {
  const king = findKing(color);
  if (!king) return false;
  
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareUnderAttack(king.row, king.col, opponentColor);
}

/**
 * Check if a player has any legal moves
 */
export function hasAnyLegalMoves(color) {
  const gameState = getGameState();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.color === color) {
        const moves = getLegalMoves(row, col);
        if (moves.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if the current position is checkmate
 */
export function isCheckmate(color) {
  return isKingInCheck(color) && !hasAnyLegalMoves(color);
}

/**
 * Check if the current position is stalemate (traditional stalemate)
 */
export function isStalemate(color) {
  return !isKingInCheck(color) && !hasAnyLegalMoves(color);
}

/**
 * Generate a position signature for repetition detection
 * Includes: piece positions, castling rights, en passant target, and current player
 */
export function getPositionSignature() {
  const gameState = getGameState();
  // Build signature string
  let signature = '';
  
  // Add piece positions (row by row, col by col)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece) {
        signature += `${row}${col}${piece.color}${piece.type}`;
        // Include hasMoved for kings and rooks (affects castling rights)
        if (piece.type === 'k' || piece.type === 'r') {
          signature += piece.hasMoved ? '1' : '0';
        }
      } else {
        signature += `${row}${col}_`;
      }
    }
  }
  
  // Add en passant target (if applicable)
  if (gameState.lastMove && gameState.lastMove.piece.type === 'p' && 
      Math.abs(gameState.lastMove.toRow - gameState.lastMove.fromRow) === 2) {
    const enPassantRow = gameState.lastMove.piece.color === 'white' ? 3 : 4;
    signature += `ep${enPassantRow}${gameState.lastMove.toCol}`;
  }
  
  // Add current player (whose turn it is affects the position)
  signature += `_${gameState.turn}`;
  
  return signature;
}

/**
 * Check if the current position has occurred three times (threefold repetition)
 */
export function isThreefoldRepetition() {
  const gameState = getGameState();
  const currentSignature = getPositionSignature();
  
  // Count how many times this position has occurred
  let count = 0;
  for (let i = 0; i < gameState.positionHistory.length; i++) {
    if (gameState.positionHistory[i] === currentSignature) {
      count++;
    }
  }
  
  // If this position has occurred 2 times before (making this the 3rd), it's a draw
  return count >= 2;
}

/**
 * Check if there is insufficient material for checkmate
 * Returns true if checkmate is impossible with current material
 */
export function hasInsufficientMaterial() {
  const gameState = getGameState();
  // Count pieces for each color
  const whitePieces = [];
  const blackPieces = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece) {
        if (piece.color === 'white') {
          whitePieces.push(piece);
        } else {
          blackPieces.push(piece);
        }
      }
    }
  }
  
  // Filter out kings (they're always present)
  const whiteNonKings = whitePieces.filter(p => p.type !== 'k');
  const blackNonKings = blackPieces.filter(p => p.type !== 'k');
  
  // Case 1: King vs King
  if (whiteNonKings.length === 0 && blackNonKings.length === 0) {
    return true;
  }
  
  // Case 2: King vs King + Knight
  if (whiteNonKings.length === 0 && blackNonKings.length === 1 && blackNonKings[0].type === 'n') {
    return true;
  }
  if (blackNonKings.length === 0 && whiteNonKings.length === 1 && whiteNonKings[0].type === 'n') {
    return true;
  }
  
  // Case 3: King vs King + Bishop
  if (whiteNonKings.length === 0 && blackNonKings.length === 1 && blackNonKings[0].type === 'b') {
    return true;
  }
  if (blackNonKings.length === 0 && whiteNonKings.length === 1 && whiteNonKings[0].type === 'b') {
    return true;
  }
  
  // Case 4: King + Bishop vs King + Bishop (same color bishops)
  if (whiteNonKings.length === 1 && blackNonKings.length === 1 &&
      whiteNonKings[0].type === 'b' && blackNonKings[0].type === 'b') {
    // Check if bishops are on the same color square
    // We need to find the bishop positions
    let whiteBishopSquare = null;
    let blackBishopSquare = null;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.type === 'b') {
          const isDarkSquare = (row + col) % 2 === 1;
          if (piece.color === 'white') {
            whiteBishopSquare = isDarkSquare ? 'dark' : 'light';
          } else {
            blackBishopSquare = isDarkSquare ? 'dark' : 'light';
          }
        }
      }
    }
    
    // If both bishops are on the same color square, checkmate is impossible
    if (whiteBishopSquare && blackBishopSquare && whiteBishopSquare === blackBishopSquare) {
      return true;
    }
  }
  
  // Case 5: King + Knight vs King + Knight (any number of knights - checkmate requires blunder)
  // Even with multiple knights, checkmate requires opponent cooperation
  const whiteKnights = whiteNonKings.filter(p => p.type === 'n').length;
  const blackKnights = blackNonKings.filter(p => p.type === 'n').length;
  const whiteBishops = whiteNonKings.filter(p => p.type === 'b').length;
  const blackBishops = blackNonKings.filter(p => p.type === 'b').length;
  
  // Check if either side has ONLY knights (no bishops, no pawns, no rooks, no queens)
  const whiteOnlyKnights = whiteNonKings.length > 0 && whiteNonKings.every(p => p.type === 'n');
  const blackOnlyKnights = blackNonKings.length > 0 && blackNonKings.every(p => p.type === 'n');
  
  // If both sides have only knights (any number), it's insufficient material
  // because checkmate with only knights requires the opponent to blunder into a stalemate trap
  if (whiteOnlyKnights && blackOnlyKnights) {
    return true;
  }
  
  // Case 6: King + Knight vs King + Bishop (neither side can force checkmate)
  if (whiteNonKings.length === 1 && blackNonKings.length === 1 &&
      ((whiteNonKings[0].type === 'n' && blackNonKings[0].type === 'b') ||
       (whiteNonKings[0].type === 'b' && blackNonKings[0].type === 'n'))) {
    return true;
  }
  
  // IMPORTANT: King + Bishop + Knight vs King CAN checkmate (removed from insufficient material)
  // King + 2 Bishops (opposite colors) vs King CAN checkmate (removed from insufficient material)
  // These combinations are NOT considered insufficient material
  
  return false;
}

