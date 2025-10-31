/**
 * Main entry point for the chess game
 */

// Chess piece Unicode symbols
const PIECES = {
  white: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙'
  },
  black: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟'
  }
};

// Game state
let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let legalMoves = [];
let lastMove = null; // Track last move for en passant

/**
 * Initialize the chess board with starting positions
 */
function initializeBoard() {
  board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces (top)
  board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'black', hasMoved: false }));
  board[1] = Array(8).fill(null).map(() => ({ type: 'p', color: 'black', hasMoved: false }));
  
  // White pieces (bottom)
  board[6] = Array(8).fill(null).map(() => ({ type: 'p', color: 'white', hasMoved: false }));
  board[7] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(p => ({ type: p, color: 'white', hasMoved: false }));
  
  currentPlayer = 'white';
  selectedSquare = null;
  legalMoves = [];
  lastMove = null;
}

/**
 * Render the chess board
 */
function renderBoard() {
  const boardElement = document.getElementById('chessBoard');
  boardElement.innerHTML = '';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square';
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = board[row][col];
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
        
        square.textContent = pieceUnicode;
        square.classList.add('has-piece');
      }

      // Highlight selected square
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // Highlight legal moves
      const moveAtSquare = legalMoves.find(move => move.row === row && move.col === col);
      if (moveAtSquare) {
        square.classList.add('legal-move');
        if (piece) {
          square.classList.add('has-piece');
        }
        // Mark en passant target square
        if (moveAtSquare.isEnPassant) {
          square.dataset.enPassantTarget = 'true';
          square.dataset.capturedPawnRow = selectedSquare.row;
          square.dataset.capturedPawnCol = moveAtSquare.col;
        }
      }

      // Mark square as en passant captured pawn
      const enPassantMove = legalMoves.find(m => m.isEnPassant);
      if (enPassantMove && selectedSquare && 
          row === selectedSquare.row && col === enPassantMove.col) {
        square.dataset.enPassantVictim = 'true';
      }

      // Highlight previous move
      if (lastMove) {
        if (row === lastMove.fromRow && col === lastMove.fromCol) {
          square.classList.add('previous-move');
        }
        if (row === lastMove.toRow && col === lastMove.toCol) {
          square.classList.add('previous-move');
        }
      }

      square.addEventListener('click', () => handleSquareClick(row, col));

      boardElement.appendChild(square);
    }
  }

  updateGameInfo();
}

/**
 * Handle square click
 */
function handleSquareClick(row, col) {
  const piece = board[row][col];

  // If a square is already selected
  if (selectedSquare) {
    // Check if clicked square is a legal move
    const isLegalMove = legalMoves.some(move => move.row === row && move.col === col);
    
    if (isLegalMove) {
      // Make the move
      makeMove(selectedSquare.row, selectedSquare.col, row, col);
      selectedSquare = null;
      legalMoves = [];
    } else if (piece && piece.color === currentPlayer) {
      // Select a different piece of the same color
      selectedSquare = { row, col };
      legalMoves = getLegalMoves(row, col);
    } else {
      // Deselect
      selectedSquare = null;
      legalMoves = [];
    }
  } else if (piece && piece.color === currentPlayer) {
    // Select a piece
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(row, col);
  }

  renderBoard();
}

/**
 * Get legal moves for a piece (simplified version)
 */
function getLegalMoves(row, col) {
  const piece = board[row][col];
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

  return moves;
}

/**
 * Get pawn moves
 */
function getPawnMoves(row, col, color) {
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  // Forward move
  if (!board[row + direction]?.[col]) {
    moves.push({ row: row + direction, col });
    
    // Double move from starting position
    if (row === startRow && !board[row + 2 * direction]?.[col]) {
      moves.push({ row: row + 2 * direction, col });
    }
  }

  // Capture diagonally
  [-1, 1].forEach(offset => {
    const targetPiece = board[row + direction]?.[col + offset];
    if (targetPiece && targetPiece.color !== color) {
      moves.push({ row: row + direction, col: col + offset });
    }
  });

  // En passant
  if (lastMove && lastMove.piece.type === 'p' && 
      Math.abs(lastMove.toRow - lastMove.fromRow) === 2) {
    // Check if we're on the right row and adjacent column
    const enPassantRow = color === 'white' ? 3 : 4;
    if (row === enPassantRow && Math.abs(col - lastMove.toCol) === 1) {
      moves.push({ 
        row: row + direction, 
        col: lastMove.toCol, 
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

  const piece = board[row][col];
  offsets.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  return moves;
}

/**
 * Get king moves
 */
function getKingMoves(row, col) {
  const moves = [];
  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const piece = board[row][col];
  offsets.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  });

  // Castling
  if (!piece.hasMoved) {
    // Kingside castling
    const kingsideRook = board[row][7];
    if (kingsideRook && kingsideRook.type === 'r' && !kingsideRook.hasMoved &&
        !board[row][5] && !board[row][6]) {
      moves.push({ row, col: 6, isCastling: true, rookCol: 7 });
    }
    
    // Queenside castling
    const queensideRook = board[row][0];
    if (queensideRook && queensideRook.type === 'r' && !queensideRook.hasMoved &&
        !board[row][1] && !board[row][2] && !board[row][3]) {
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
  const piece = board[row][col];

  directions.forEach(([dr, dc]) => {
    let newRow = row + dr;
    let newCol = col + dc;

    while (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      
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
 * Make a move
 */
function makeMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
  
  // Handle castling
  if (move && move.isCastling) {
    // Move king
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    piece.hasMoved = true;
    
    // Move rook
    const rookFromCol = move.rookCol;
    const rookToCol = toCol === 6 ? 5 : 3; // Kingside: 5, Queenside: 3
    const rook = board[fromRow][rookFromCol];
    board[fromRow][rookToCol] = rook;
    board[fromRow][rookFromCol] = null;
    rook.hasMoved = true;
  } else if (move && move.isEnPassant) {
    // En passant capture
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    piece.hasMoved = true;
    
    // Remove the captured pawn (on the same row as the capturing pawn)
    board[fromRow][toCol] = null;
  } else {
    // Normal move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    piece.hasMoved = true;

    // Pawn promotion (auto-promote to queen)
    if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
      board[toRow][toCol].type = 'q';
    }
  }

  // Track last move for en passant
  lastMove = {
    piece: piece,
    fromRow: fromRow,
    fromCol: fromCol,
    toRow: toRow,
    toCol: toCol
  };

  // Switch players
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

/**
 * Update game info display
 */
function updateGameInfo() {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} to move`;
}

/**
 * Reset game
 */
function resetGame() {
  initializeBoard();
  renderBoard();
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const isDark = document.documentElement.hasAttribute('data-theme');
  console.log('Toggle theme - current state:', isDark ? 'dark' : 'light');
  
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    console.log('Switched to light mode');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    console.log('Switched to dark mode');
  }
}

/**
 * Initialize the game on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeBoard();
  renderBoard();

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  
  // Theme toggle - wire up the switch to theme logic
  document.getElementById('themeToggle').addEventListener('toggle', toggleTheme);
});

