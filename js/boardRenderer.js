/**
 * Board rendering logic
 * 
 * IMPORTANT: gameState.board is the single source of truth for board state.
 * This module reads from gameState.board and renders it visually.
 */

import { PIECES } from './constants.js';
import { getGameState } from './gameState.js';
import { getLegalMoves } from './moveGenerator.js';
import { isKingInCheck } from './gameRules.js';

// Client-side view preference: board orientation (0 = white on bottom, 1 = black on bottom)
// This is NOT shared in multiplayer - each player can flip their board independently
let boardFlipped = false;

/**
 * Get board flip state
 */
export function isBoardFlipped() {
  return boardFlipped;
}

/**
 * Toggle board flip state
 */
export function toggleBoardFlip() {
  boardFlipped = !boardFlipped;
}

/**
 * Render the chess board
 */
export function renderBoard() {
  const gameState = getGameState();
  const boardElement = document.getElementById('chessBoard');
  if (!boardElement) return;
  
  // Set data attribute so player-info components can observe board orientation
  const boardContainer = document.getElementById('board');
  if (boardContainer) {
    if (boardFlipped) {
      boardContainer.setAttribute('data-flipped', 'true');
    } else {
      boardContainer.removeAttribute('data-flipped');
    }
  }
  
  boardElement.innerHTML = '';

  // Render all squares but map them to correct grid positions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Calculate visual grid position (inverted if flipped)
      const visualRow = boardFlipped ? 7 - row : row;
      const visualCol = boardFlipped ? 7 - col : col;
      
      const square = document.createElement('div');
      square.className = 'square';
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      // Store actual board coordinates for click handling
      square.dataset.row = row;
      square.dataset.col = col;
      // Set CSS Grid position based on visual position
      square.style.gridRow = (visualRow + 1).toString();
      square.style.gridColumn = (visualCol + 1).toString();

      const piece = gameState.board[row][col];
      if (piece) {
        const isDarkSquare = (row + col) % 2 === 1;
        
        // On dark squares: white team uses solid, black team uses outlined
        // On light squares: white uses outlined, black uses solid
        let pieceUnicode;
        if (isDarkSquare) {
          pieceUnicode = PIECES[piece.color === 'white' ? 'solid' : 'outlined'][piece.type];
        } else {
          pieceUnicode = PIECES[piece.color === 'white' ? 'outlined' : 'solid'][piece.type];
        }
        
        // Wrap piece in a span for better animation control
        const pieceSpan = document.createElement('span');
        pieceSpan.className = 'piece';
        pieceSpan.textContent = pieceUnicode;
        square.appendChild(pieceSpan);
        square.classList.add('has-piece');
        
        // Add visual state for king in check or checkmate
        if (piece.type === 'k') {
          if (gameState.gameResult === 'checkmate' && piece.color === gameState.turn) {
            square.classList.add('king-in-checkmate');
          } else if (isKingInCheck(piece.color)) {
            square.classList.add('king-in-check');
          }
        }
      }

      // Highlight selected square
      if (gameState.selectedSquare && gameState.selectedSquare.row === row && gameState.selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // Highlight legal moves
      const moveAtSquare = gameState.legalMoves.find(move => move.row === row && move.col === col);
      if (moveAtSquare) {
        square.classList.add('legal-move');
        if (piece) {
          square.classList.add('has-piece');
        }
        // Mark en passant target square
        if (moveAtSquare.isEnPassant) {
          square.dataset.enPassantTarget = 'true';
          square.dataset.capturedPawnRow = gameState.selectedSquare.row;
          square.dataset.capturedPawnCol = moveAtSquare.col;
        }
      }

      // Mark square as en passant captured pawn
      const enPassantMove = gameState.legalMoves.find(m => m.isEnPassant);
      if (enPassantMove && gameState.selectedSquare && 
          row === gameState.selectedSquare.row && col === enPassantMove.col) {
        square.dataset.enPassantVictim = 'true';
      }

      // Highlight previous move
      if (gameState.lastMove) {
        if (row === gameState.lastMove.fromRow && col === gameState.lastMove.fromCol) {
          square.classList.add('previous-move');
        }
        if (row === gameState.lastMove.toRow && col === gameState.lastMove.toCol) {
          square.classList.add('previous-move');
        }
      }

      boardElement.appendChild(square);
    }
  }
  
  // Use event delegation - attach listener to board container (only once)
  if (!boardElement.dataset.listenerAttached) {
    boardElement.addEventListener('click', (e) => {
      // Find the square element that was clicked
      const square = e.target.closest('.square');
      if (square) {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        if (!isNaN(row) && !isNaN(col)) {
          // Dispatch a custom event that main.js will handle
          window.dispatchEvent(new CustomEvent('squareClick', {
            detail: { row, col }
          }));
        }
      }
    });
    boardElement.dataset.listenerAttached = 'true';
  }
}

