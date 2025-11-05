/**
 * Move generation logic for all chess pieces
 */

import { getGameState } from './gameState.js';
import { isKingInCheck, isSquareUnderAttack, findKing } from './gameRules.js';

/**
 * Get legal moves for a piece (filtered to prevent check)
 */
export function getLegalMoves(row, col) {
  const gameState = getGameState();
  const piece = gameState.board[row][col];
  if (!piece) return [];

  const moves = [];

  switch (piece.type) {
    case 'p':
      moves.push(...getPawnMoves(row, col, piece.color));
      break;
    case 'r':
      moves.push(...getRookMoves(row, col));
      break;
    case 'n':
      moves.push(...getKnightMoves(row, col));
      break;
    case 'b':
      moves.push(...getBishopMoves(row, col));
      break;
    case 'q':
      moves.push(...getQueenMoves(row, col));
      break;
    case 'k':
      moves.push(...getKingMoves(row, col));
      break;
  }

  // Filter out moves that would leave the king in check
  return moves.filter(move => !wouldMoveCauseCheck(row, col, move.row, move.col, move));
}

/**
 * Check if a move would leave the king in check
 */
function wouldMoveCauseCheck(fromRow, fromCol, toRow, toCol, moveData = {}) {
  const gameState = getGameState();
  // Save the current board state
  const piece = gameState.board[fromRow][fromCol];
  const capturedPiece = gameState.board[toRow][toCol];
  const originalHasMoved = piece.hasMoved;
  
  // Save en passant victim if applicable
  let enPassantVictim = null;
  let enPassantVictimRow = null;
  let enPassantVictimCol = null;
  if (moveData.isEnPassant) {
    enPassantVictimRow = fromRow;
    enPassantVictimCol = toCol;
    enPassantVictim = gameState.board[enPassantVictimRow][enPassantVictimCol];
  }
  
  // Make the move temporarily
  gameState.board[toRow][toCol] = piece;
  gameState.board[fromRow][fromCol] = null;
  if (moveData.isEnPassant) {
    gameState.board[enPassantVictimRow][enPassantVictimCol] = null;
  }
  
  // Check if king is in check after the move
  const inCheck = isKingInCheck(piece.color);
  
  // Restore the board state
  gameState.board[fromRow][fromCol] = piece;
  gameState.board[toRow][toCol] = capturedPiece;
  piece.hasMoved = originalHasMoved;
  if (moveData.isEnPassant) {
    gameState.board[enPassantVictimRow][enPassantVictimCol] = enPassantVictim;
  }
  
  return inCheck;
}

/**
 * Get pawn moves
 */
function getPawnMoves(row, col, color) {
  const gameState = getGameState();
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  // Forward move
  if (!gameState.board[row + direction]?.[col]) {
    moves.push({ row: row + direction, col });
    
    // Double move from starting position
    if (row === startRow && !gameState.board[row + 2 * direction]?.[col]) {
      moves.push({ row: row + 2 * direction, col });
    }
  }

  // Capture diagonally
  [-1, 1].forEach(offset => {
    const targetPiece = gameState.board[row + direction]?.[col + offset];
    if (targetPiece && targetPiece.color !== color) {
      moves.push({ row: row + direction, col: col + offset });
    }
  });

  // En passant
  if (gameState.lastMove && gameState.lastMove.piece.type === 'p' && 
      Math.abs(gameState.lastMove.toRow - gameState.lastMove.fromRow) === 2) {
    // Check if we're on the right row and adjacent column
    const enPassantRow = color === 'white' ? 3 : 4;
    if (row === enPassantRow && Math.abs(col - gameState.lastMove.toCol) === 1) {
      moves.push({ 
        row: row + direction, 
        col: gameState.lastMove.toCol, 
        isEnPassant: true 
      });
    }
  }

  return moves;
}

/**
 * Get rook moves
 */
function getRookMoves(row, col) {
  return getSlidingMoves(row, col, [
    [0, 1], [0, -1], [1, 0], [-1, 0]
  ]);
}

/**
 * Get bishop moves
 */
function getBishopMoves(row, col) {
  return getSlidingMoves(row, col, [
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ]);
}

/**
 * Get queen moves
 */
function getQueenMoves(row, col) {
  return getSlidingMoves(row, col, [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ]);
}

/**
 * Get knight moves
 */
function getKnightMoves(row, col) {
  const gameState = getGameState();
  const moves = [];
  const offsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  const piece = gameState.board[row][col];
  offsets.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = gameState.board[newRow][newCol];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  return moves;
}

/**
 * Get king moves (with castling validation)
 */
function getKingMoves(row, col) {
  const gameState = getGameState();
  // Get basic moves first
  const moves = getKingMovesBasic(row, col, false);
  
  const piece = gameState.board[row][col];
  const opponentColor = piece.color === 'white' ? 'black' : 'white';
  
  // Add castling with proper validation (can't castle through or out of check)
  if (!piece.hasMoved && !isKingInCheck(piece.color)) {
    // Kingside castling
    const kingsideRook = gameState.board[row][7];
    if (kingsideRook && kingsideRook.type === 'r' && !kingsideRook.hasMoved &&
        !gameState.board[row][5] && !gameState.board[row][6] &&
        !isSquareUnderAttack(row, 5, opponentColor) &&
        !isSquareUnderAttack(row, 6, opponentColor)) {
      moves.push({ row, col: 6, isCastling: true, rookCol: 7 });
    }
    
    // Queenside castling
    const queensideRook = gameState.board[row][0];
    if (queensideRook && queensideRook.type === 'r' && !queensideRook.hasMoved &&
        !gameState.board[row][1] && !gameState.board[row][2] && !gameState.board[row][3] &&
        !isSquareUnderAttack(row, 2, opponentColor) &&
        !isSquareUnderAttack(row, 3, opponentColor)) {
      moves.push({ row, col: 2, isCastling: true, rookCol: 0 });
    }
  }

  return moves;
}

/**
 * Get sliding moves (for rook, bishop, queen)
 */
function getSlidingMoves(row, col, directions) {
  const gameState = getGameState();
  const moves = [];
  const piece = gameState.board[row][col];

  directions.forEach(([dr, dc]) => {
    let newRow = row + dr;
    let newCol = col + dc;

    while (isValidSquare(newRow, newCol)) {
      const targetPiece = gameState.board[newRow][newCol];
      
      if (targetPiece) {
        if (targetPiece.color !== piece.color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
      
      moves.push({ row: newRow, col: newCol });
      newRow += dr;
      newCol += dc;
    }
  });

  return moves;
}

/**
 * Check if square is valid
 */
function isValidSquare(row, col) {
  return row >= 0 && row <= 7 && col >= 0 && col <= 7;
}

/**
 * Get moves for a piece without check validation (for attack detection)
 */
export function getPieceMoves(row, col, type, color, includeCastling = true) {
  switch (type) {
    case 'p':
      return getPawnMoves(row, col, color);
    case 'r':
      return getRookMoves(row, col);
    case 'n':
      return getKnightMoves(row, col);
    case 'b':
      return getBishopMoves(row, col);
    case 'q':
      return getQueenMoves(row, col);
    case 'k':
      return getKingMovesBasic(row, col, includeCastling);
    default:
      return [];
  }
}

/**
 * Get basic king moves without castling (to avoid infinite recursion)
 */
function getKingMovesBasic(row, col, includeCastling = true) {
  const gameState = getGameState();
  const moves = [];
  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const piece = gameState.board[row][col];
  offsets.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = gameState.board[newRow][newCol];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  // Only add castling if requested (to avoid infinite recursion in attack check)
  if (includeCastling && !piece.hasMoved) {
    // Kingside castling
    const kingsideRook = gameState.board[row][7];
    if (kingsideRook && kingsideRook.type === 'r' && !kingsideRook.hasMoved &&
        !gameState.board[row][5] && !gameState.board[row][6]) {
      moves.push({ row, col: 6, isCastling: true, rookCol: 7 });
    }
    
    // Queenside castling
    const queensideRook = gameState.board[row][0];
    if (queensideRook && queensideRook.type === 'r' && !queensideRook.hasMoved &&
        !gameState.board[row][1] && !gameState.board[row][2] && !gameState.board[row][3]) {
      moves.push({ row, col: 2, isCastling: true, rookCol: 0 });
    }
  }

  return moves;
}

/**
 * Find other pieces of the same type that could reach the same square (for disambiguation)
 */
export function findAmbiguousPieces(pieceType, pieceColor, fromRow, fromCol, toRow, toCol) {
  const gameState = getGameState();
  const ambiguous = [];
  
  // Don't check for ambiguity for pawns (handled by file in captures) or kings (only one king)
  if (pieceType === 'p' || pieceType === 'k') {
    return ambiguous;
  }
  
  // Check all pieces of the same type and color
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Skip the piece that's actually making the move
      if (row === fromRow && col === fromCol) {
        continue;
      }
      
      const otherPiece = gameState.board[row][col];
      if (otherPiece && otherPiece.type === pieceType && otherPiece.color === pieceColor) {
        // Check if this piece could also reach the destination square
        const legalMoves = getLegalMoves(row, col);
        if (legalMoves.some(m => m.row === toRow && m.col === toCol)) {
          ambiguous.push({ row, col });
        }
      }
    }
  }
  
  return ambiguous;
}

