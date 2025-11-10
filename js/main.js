/**
 * Main entry point for the chess game
 * Orchestrates modules and handles UI events
 */

import { getGameState, initializeBoard, resetGame, serializeForMultiplayer, deserializeFromMultiplayer } from './gameState.js';
import { getLegalMoves } from './moveGenerator.js';
import { makeMove } from './moveExecutor.js';
import { renderBoard, isBoardFlipped, toggleBoardFlip } from './boardRenderer.js';
import { stopAllTimers } from './timer.js';
import { hasInsufficientMaterial } from './gameRules.js';
import { dispatchGameStateUpdate } from './events.js';
import { enableMultiplayer, disableMultiplayer, broadcastGameState, isMultiplayerActive, getPlayerColor, setPlayerColor, canMakeMove, openPlayerSelectionModal } from './multiplayer.js';

/**
 * Handle square click
 */
function handleSquareClick(row, col) {
  const gameState = getGameState();
  // Don't allow moves if game is over
  if (gameState.gameOver) {
    return;
  }
  
  const piece = gameState.board[row][col];
  
  // In multiplayer, only allow moves if it's this player's turn
  if (isMultiplayerActive()) {
    if (!canMakeMove()) {
      const playerColor = getPlayerColor();
      const gameState = getGameState();
      console.log(`Move blocked - Player: ${playerColor}, Turn: ${gameState.turn}, Game over: ${gameState.gameOver}`);
      return; // Not this player's turn - ignore click
    }
  }

  // If a square is already selected
  if (gameState.selectedSquare) {
    // Check if clicked square is a legal move
    const isLegalMove = gameState.legalMoves.some(move => move.row === row && move.col === col);
    
    if (isLegalMove) {
      // Make the move (this updates gameState.board - the source of truth)
      makeMove(gameState.selectedSquare.row, gameState.selectedSquare.col, row, col);
      // Clear selection AFTER move is made
      gameState.selectedSquare = null;
      gameState.legalMoves = [];
      // Render board to show the move (gameState.board was updated in makeMove)
      // Use requestAnimationFrame to ensure all state updates and DOM operations complete
      requestAnimationFrame(() => {
        renderBoard();
        // Broadcast game state to other tabs if multiplayer is enabled
        if (isMultiplayerActive()) {
          broadcastGameState();
        }
      });
      return; // Exit early to avoid rendering twice
    } else if (piece && piece.color === gameState.turn) {
      // Select a different piece of the same color
      gameState.selectedSquare = { row, col };
      gameState.legalMoves = getLegalMoves(row, col);
    } else {
      // Deselect
      gameState.selectedSquare = null;
      gameState.legalMoves = [];
    }
  } else if (piece && piece.color === gameState.turn) {
    // Select a piece
    gameState.selectedSquare = { row, col };
    gameState.legalMoves = getLegalMoves(row, col);
  }

  // Defer rendering to next frame to ensure click event fully processes first
  requestAnimationFrame(() => {
    renderBoard();
  });
}

/**
 * Get the flip board icon based on theme and board orientation
 * ⬒: (light theme + white on bottom) OR (dark theme + black on bottom)
 * ⬓: (light theme + black on bottom) OR (dark theme + white on bottom)
 */
function getFlipBoardIcon() {
  const isDarkTheme = document.documentElement.hasAttribute('data-theme');
  const isWhiteOnBottom = !isBoardFlipped();
  
  // ⬒ cases: light theme with white on bottom, OR dark theme with black on bottom
  if ((!isDarkTheme && isWhiteOnBottom) || (isDarkTheme && !isWhiteOnBottom)) {
    return '⬒';
  }
  // ⬓ cases: light theme with black on bottom, OR dark theme with white on bottom
  return '⬓';
}

/**
 * Update the flip board button icon
 */
function updateFlipBoardIcon() {
  const flipBoardBtn = document.getElementById('flip-board');
  if (flipBoardBtn) {
    flipBoardBtn.textContent = getFlipBoardIcon();
  }
}

/**
 * Handle time's up event
 */
function handleTimeUp(playerWhoRanOut) {
  const gameState = getGameState();
  // Don't handle if game is already over
  if (gameState.gameOver) {
    return;
  }
  
  // Stop all timers
  stopAllTimers();
  
  // The winner is the player who DIDN'T run out of time
  const winner = playerWhoRanOut === 'white' ? 'black' : 'white';
  
  // Check if winner has insufficient material (if so, it's a draw)
  // If there's insufficient material, it's a draw regardless of time
  if (hasInsufficientMaterial()) {
    gameState.gameOver = true;
    gameState.gameResult = 'stalemate';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: null // Draw - no winner
      }
    }));
    dispatchGameStateUpdate();
  } else {
    // Winner by time
    gameState.gameOver = true;
    gameState.gameResult = 'timeout';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameState.gameResult,
        winner: winner
      }
    }));
    dispatchGameStateUpdate();
  }
}

/**
 * Load saved colors from localStorage
 */
function loadSavedColors() {
  const savedWhite = localStorage.getItem('chess-color-white');
  const savedBlack = localStorage.getItem('chess-color-black');
  
  if (savedWhite) {
    document.documentElement.style.setProperty('--white', savedWhite);
  }
  if (savedBlack) {
    document.documentElement.style.setProperty('--black', savedBlack);
  }
}

/**
 * Initialize the game on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved preferences
  const { loadSavedTheme } = await import('./theme.js');
  loadSavedTheme();
  loadSavedColors();
  
  // Initialize board (will be overridden by multiplayer state if available)
  initializeBoard();
  renderBoard();
  
  // Dispatch initial game state update so all components sync
  dispatchGameStateUpdate();

  // Listen for game state requests (from components)
  window.addEventListener('gameStateRequest', () => {
    dispatchGameStateUpdate();
  });

  // Listen for timer edits (when user edits timer before game starts)
  window.addEventListener('timerEdit', (e) => {
    const gameState = getGameState();
    const { player, timeRemaining } = e.detail;
    if (gameState.players[player] && !gameState.gameHasStarted) {
      gameState.players[player].timer.timeRemaining = timeRemaining;
      dispatchGameStateUpdate();
    }
  });

  // Listen for square clicks from board renderer
  window.addEventListener('squareClick', (e) => {
    handleSquareClick(e.detail.row, e.detail.col);
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    resetGame();
    renderBoard();
    dispatchGameStateUpdate();
    window.dispatchEvent(new CustomEvent('gameReset'));
    
    // Show player selection modal in multiplayer
    if (isMultiplayerActive()) {
      openPlayerSelectionModal();
    }
  });
  
  // Theme toggle button
  const { toggleTheme } = await import('./theme.js');
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Palette button - open modal
  const paletteModal = document.getElementById('paletteModal');
  document.getElementById('palette').addEventListener('click', () => {
    paletteModal.open();
  });
  
  // Flip board button - toggle board orientation (black perspective)
  const flipBoardBtn = document.getElementById('flip-board');
  if (flipBoardBtn) {
    // Set initial icon
    updateFlipBoardIcon();
    
    flipBoardBtn.addEventListener('click', () => {
      toggleBoardFlip();
      renderBoard();
      // Update icon to reflect new orientation
      updateFlipBoardIcon();
      // Re-sync all components after flip (view state doesn't need to be shared, but UI updates)
      dispatchGameStateUpdate();
    });
    
    // Listen for theme changes to update icon
    document.addEventListener('themechange', () => {
      updateFlipBoardIcon();
    });
  }
  
  // Listen for time's up event
  window.addEventListener('timeUp', (e) => {
    handleTimeUp(e.detail.player);
  });

  // Expose multiplayer functions to window for testing
  window.chessGame = {
    serializeForMultiplayer,
    deserializeFromMultiplayer,
    getGameState,
    // Multiplayer controls
    enableMultiplayer,
    disableMultiplayer,
    broadcastGameState,
    isMultiplayerActive,
    // Player assignment
    getPlayerColor,
    setPlayerColor,
    canMakeMove
  };
  
  // Enable multiplayer by default (can be disabled via console)
  enableMultiplayer();
});
