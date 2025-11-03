/**
 * Main entry point for the chess game
 */

// Chess piece Unicode symbols with text variation selector to prevent emoji conversion
const PIECES = {
  white: {
    k: '♔\uFE0E',
    q: '♕\uFE0E',
    r: '♖\uFE0E',
    b: '♗\uFE0E',
    n: '♘\uFE0E',
    p: '♙\uFE0E'
  },
  black: {
    k: '♚\uFE0E',
    q: '♛\uFE0E',
    r: '♜\uFE0E',
    b: '♝\uFE0E',
    n: '♞\uFE0E',
    p: '♟\uFE0E'
  }
};

// Unified game state - single source of truth
const gameState = {
  // Board state
  board: [],
  selectedSquare: null,
  legalMoves: [],
  lastMove: null, // Track last move for en passant
  boardFlipped: false, // View state - whether board is flipped 180° (black perspective)
  
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

// Helper functions for backward compatibility during refactor
function getCurrentPlayer() {
  return gameState.turn;
}

function setCurrentPlayer(player) {
  gameState.turn = player;
}

/**
 * Initialize the chess board with starting positions
 */
function initializeBoard() {
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
  
  // Reset and stop timers
  stopPlayerTimer('white');
  stopPlayerTimer('black');
  gameState.players.white.timer.timeRemaining = 600000;
  gameState.players.black.timer.timeRemaining = 600000;
  
  dispatchGameStateUpdate();
}

/**
 * Render the chess board
 * 
 * IMPORTANT: gameState.board is the single source of truth for board state.
 * This function reads from gameState.board and renders it visually.
 * The visual board is always derived from gameState.board - never the other way around.
 */
function renderBoard() {
  const boardElement = document.getElementById('chessBoard');
  if (!boardElement) return;
  
  // Set data attribute so player-info components can observe board orientation
  const boardContainer = document.getElementById('board');
  if (boardContainer) {
    if (gameState.boardFlipped) {
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
      const visualRow = gameState.boardFlipped ? 7 - row : row;
      const visualCol = gameState.boardFlipped ? 7 - col : col;
      
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
        
        // On dark squares: white team uses solid, black team uses outline
        // On light squares: keep original (white uses outline, black uses solid)
        let pieceUnicode;
        if (isDarkSquare) {
          pieceUnicode = PIECES[piece.color === 'white' ? 'black' : 'white'][piece.type];
        } else {
          pieceUnicode = PIECES[piece.color][piece.type];
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
          handleSquareClick(row, col);
        }
      }
    });
    boardElement.dataset.listenerAttached = 'true';
  }
}

/**
 * Handle square click
 */
function handleSquareClick(row, col) {
  // Don't allow moves if game is over
  if (gameState.gameOver) {
    return;
  }
  
  const piece = gameState.board[row][col];

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
 * Get legal moves for a piece (filtered to prevent check)
 */
function getLegalMoves(row, col) {
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
 * Find the king's position for a given color
 */
function findKing(color) {
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
function isSquareUnderAttack(row, col, byColor) {
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
 * Get moves for a piece without check validation (for attack detection)
 */
function getPieceMoves(row, col, type, color, includeCastling = true) {
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
function findAmbiguousPieces(pieceType, pieceColor, fromRow, fromCol, toRow, toCol) {
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

/**
 * Check if the king of a given color is in check
 */
function isKingInCheck(color) {
  const king = findKing(color);
  if (!king) return false;
  
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareUnderAttack(king.row, king.col, opponentColor);
}

/**
 * Check if a player has any legal moves
 */
function hasAnyLegalMoves(color) {
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
function isCheckmate(color) {
  return isKingInCheck(color) && !hasAnyLegalMoves(color);
}

/**
 * Check if the current position is stalemate (traditional stalemate)
 */
function isStalemate(color) {
  return !isKingInCheck(color) && !hasAnyLegalMoves(color);
}

/**
 * Generate a position signature for repetition detection
 * Includes: piece positions, castling rights, en passant target, and current player
 */
function getPositionSignature() {
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
function isThreefoldRepetition() {
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
function hasInsufficientMaterial() {
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

/**
 * Update castling rights when a piece moves
 */
function updateCastlingRights(piece, fromRow, fromCol) {
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
function makeMove(fromRow, fromCol, toRow, toCol) {
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
    stopPlayerTimer('white');
    stopPlayerTimer('black');
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
    stopPlayerTimer('white');
    stopPlayerTimer('black');
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
    stopPlayerTimer('white');
    stopPlayerTimer('black');
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
  
  // Note: renderBoard() is called by handleSquareClick() after selection is cleared
  // to ensure the board reflects both the move AND the cleared selection state
}

/**
 * Reset game
 */
/**
 * Start a player's timer
 */
function startPlayerTimer(player) {
  if (!gameState.players[player] || gameState.gameOver) return;
  
  stopPlayerTimer(player); // Clear any existing timer
  
  // Record when timer started
  gameState.players[player].timer.timerStartTime = Date.now();
  
  // Update every 100ms for smooth display
  gameState.players[player].timer.timerInterval = setInterval(() => {
    if (gameState.gameOver) {
      stopPlayerTimer(player);
      return;
    }
    
    const elapsed = Date.now() - gameState.players[player].timer.timerStartTime;
    gameState.players[player].timer.timeRemaining -= elapsed;
    gameState.players[player].timer.timerStartTime = Date.now(); // Reset for next interval
    
    if (gameState.players[player].timer.timeRemaining <= 0) {
      gameState.players[player].timer.timeRemaining = 0;
      stopPlayerTimer(player);
      // Dispatch time's up event
      window.dispatchEvent(new CustomEvent('timeUp', {
        detail: { player: player }
      }));
    }
    
    dispatchGameStateUpdate();
  }, 100); // Update 10 times per second
}

/**
 * Stop a player's timer
 */
function stopPlayerTimer(player) {
  if (!gameState.players[player]) return;
  
  if (gameState.players[player].timer.timerInterval) {
    clearInterval(gameState.players[player].timer.timerInterval);
    gameState.players[player].timer.timerInterval = null;
    gameState.players[player].timer.timerStartTime = null;
  }
}

/**
 * Get the flip board icon based on theme and board orientation
 * ⬒: (light theme + white on bottom) OR (dark theme + black on bottom)
 * ⬓: (light theme + black on bottom) OR (dark theme + white on bottom)
 */
function getFlipBoardIcon() {
  const isDarkTheme = document.documentElement.hasAttribute('data-theme');
  const isWhiteOnBottom = !gameState.boardFlipped;
  
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
 * Dispatch unified game state update to all components
 */
function dispatchGameStateUpdate() {
  window.dispatchEvent(new CustomEvent('gameStateUpdate', {
    detail: {
      turn: gameState.turn,
      gameOver: gameState.gameOver,
      gameResult: gameState.gameResult,
      gameHasStarted: gameState.gameHasStarted,
      moveHistory: gameState.moveHistory, // Include move history
      players: {
        white: {
          captures: gameState.players.white.captures,
          timer: {
            timeRemaining: gameState.players.white.timer.timeRemaining,
            isRunning: gameState.players.white.timer.timerInterval !== null
          },
          castling: gameState.players.white.castling
        },
        black: {
          captures: gameState.players.black.captures,
          timer: {
            timeRemaining: gameState.players.black.timer.timeRemaining,
            isRunning: gameState.players.black.timer.timerInterval !== null
          },
          castling: gameState.players.black.castling
        }
      }
    }
  }));
}


/**
 * Reset game
 */
function resetGame() {
  initializeBoard();
  renderBoard();
  
  // Dispatch game state update
  dispatchGameStateUpdate();
  
  // Dispatch game reset event
  window.dispatchEvent(new CustomEvent('gameReset'));
}

/**
 * Handle time's up event
 */
function handleTimeUp(playerWhoRanOut) {
  // Don't handle if game is already over
  if (gameState.gameOver) {
    return;
  }
  
  // Stop all timers
  stopPlayerTimer('white');
  stopPlayerTimer('black');
  
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
 * Initialize the game on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved preferences
  const { loadSavedTheme } = await import('./theme.js');
  loadSavedTheme();
  loadSavedColors();
  
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
    const { player, timeRemaining } = e.detail;
    if (gameState.players[player] && !gameState.gameHasStarted) {
      gameState.players[player].timer.timeRemaining = timeRemaining;
      dispatchGameStateUpdate();
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  
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
      gameState.boardFlipped = !gameState.boardFlipped;
      renderBoard();
      // Update icon to reflect new orientation
      updateFlipBoardIcon();
      // Re-sync all components after flip
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
});

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


