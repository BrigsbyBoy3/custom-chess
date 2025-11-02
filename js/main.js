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

// Game state
let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let legalMoves = [];
let lastMove = null; // Track last move for en passant
let gameOver = false;
let gameResult = null; // 'checkmate', 'stalemate', 'repetition', or null
let moveCount = 0; // Track number of moves made
let positionHistory = []; // Track position signatures for repetition detection

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
  gameOver = false;
  gameResult = null;
  moveCount = 0;
  positionHistory = [];
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
        
        // Wrap piece in a span for better animation control
        const pieceSpan = document.createElement('span');
        pieceSpan.className = 'piece';
        pieceSpan.textContent = pieceUnicode;
        square.appendChild(pieceSpan);
        square.classList.add('has-piece');
        
        // Add visual state for king in check or checkmate
        if (piece.type === 'k') {
          if (gameResult === 'checkmate' && piece.color === currentPlayer) {
            square.classList.add('king-in-checkmate');
          } else if (isKingInCheck(piece.color)) {
            square.classList.add('king-in-check');
          }
        }
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
}

/**
 * Handle square click
 */
function handleSquareClick(row, col) {
  // Don't allow moves if game is over
  if (gameOver) {
    return;
  }
  
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
      renderBoard();
      return; // Exit early to avoid rendering twice
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
 * Get legal moves for a piece (filtered to prevent check)
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

  // Filter out moves that would leave the king in check
  return moves.filter(move => !wouldMoveCauseCheck(row, col, move.row, move.col, move));
}

/**
 * Check if a move would leave the king in check
 */
function wouldMoveCauseCheck(fromRow, fromCol, toRow, toCol, moveData = {}) {
  // Save the current board state
  const piece = board[fromRow][fromCol];
  const capturedPiece = board[toRow][toCol];
  const originalHasMoved = piece.hasMoved;
  
  // Save en passant victim if applicable
  let enPassantVictim = null;
  let enPassantVictimRow = null;
  let enPassantVictimCol = null;
  if (moveData.isEnPassant) {
    enPassantVictimRow = fromRow;
    enPassantVictimCol = toCol;
    enPassantVictim = board[enPassantVictimRow][enPassantVictimCol];
  }
  
  // Make the move temporarily
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;
  if (moveData.isEnPassant) {
    board[enPassantVictimRow][enPassantVictimCol] = null;
  }
  
  // Check if king is in check after the move
  const inCheck = isKingInCheck(piece.color);
  
  // Restore the board state
  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = capturedPiece;
  piece.hasMoved = originalHasMoved;
  if (moveData.isEnPassant) {
    board[enPassantVictimRow][enPassantVictimCol] = enPassantVictim;
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
 * Get king moves (with castling validation)
 */
function getKingMoves(row, col) {
  // Get basic moves first
  const moves = getKingMovesBasic(row, col, false);
  
  const piece = board[row][col];
  const opponentColor = piece.color === 'white' ? 'black' : 'white';
  
  // Add castling with proper validation (can't castle through or out of check)
  if (!piece.hasMoved && !isKingInCheck(piece.color)) {
    // Kingside castling
    const kingsideRook = board[row][7];
    if (kingsideRook && kingsideRook.type === 'r' && !kingsideRook.hasMoved &&
        !board[row][5] && !board[row][6] &&
        !isSquareUnderAttack(row, 5, opponentColor) &&
        !isSquareUnderAttack(row, 6, opponentColor)) {
      moves.push({ row, col: 6, isCastling: true, rookCol: 7 });
    }
    
    // Queenside castling
    const queensideRook = board[row][0];
    if (queensideRook && queensideRook.type === 'r' && !queensideRook.hasMoved &&
        !board[row][1] && !board[row][2] && !board[row][3] &&
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
 * Find the king's position for a given color
 */
function findKing(color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
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
      const piece = board[r][c];
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

  // Only add castling if requested (to avoid infinite recursion in attack check)
  if (includeCastling && !piece.hasMoved) {
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
      const piece = board[row][col];
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
      const piece = board[row][col];
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
  if (lastMove && lastMove.piece.type === 'p' && 
      Math.abs(lastMove.toRow - lastMove.fromRow) === 2) {
    const enPassantRow = lastMove.piece.color === 'white' ? 3 : 4;
    signature += `ep${enPassantRow}${lastMove.toCol}`;
  }
  
  // Add current player (whose turn it is affects the position)
  signature += `_${currentPlayer}`;
  
  return signature;
}

/**
 * Check if the current position has occurred three times (threefold repetition)
 */
function isThreefoldRepetition() {
  const currentSignature = getPositionSignature();
  
  // Count how many times this position has occurred
  let count = 0;
  for (let i = 0; i < positionHistory.length; i++) {
    if (positionHistory[i] === currentSignature) {
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
      const piece = board[row][col];
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
        const piece = board[row][col];
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
 * Make a move
 */
function makeMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
  
  // Check for captures
  const capturedPiece = board[toRow][toCol];
  let enPassantCapture = null;
  
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
    enPassantCapture = board[fromRow][toCol];
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

  // Dispatch capture event if a piece was captured
  if (capturedPiece) {
    window.dispatchEvent(new CustomEvent('pieceCaptured', {
      detail: {
        pieceType: capturedPiece.type,
        pieceColor: capturedPiece.color,
        capturedBy: currentPlayer // The current player (before switch) captured this piece
      }
    }));
  } else if (enPassantCapture) {
    window.dispatchEvent(new CustomEvent('pieceCaptured', {
      detail: {
        pieceType: enPassantCapture.type,
        pieceColor: enPassantCapture.color,
        capturedBy: currentPlayer
      }
    }));
  }

  // Track last move for en passant
  lastMove = {
    piece: piece,
    fromRow: fromRow,
    fromCol: fromCol,
    toRow: toRow,
    toCol: toCol
  };

  // Increment move count
  moveCount++;
  
  // Switch players
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  
  // Dispatch turn change event
  // Start timers: white's timer starts after the first move, black's on their first turn
  window.dispatchEvent(new CustomEvent('turnChange', {
    detail: {
      currentPlayer: currentPlayer
    }
  }));
  
  // Check for checkmate, stalemate, threefold repetition, or insufficient material
  // Note: Check repetition BEFORE saving position (we want to detect if position occurred 2 times before)
  let winner = null;
  if (isCheckmate(currentPlayer)) {
    gameOver = true;
    gameResult = 'checkmate';
    // The winner is the player who just made the move (the one whose turn it was before switching)
    winner = currentPlayer === 'white' ? 'black' : 'white';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameResult,
        winner: winner
      }
    }));
  } else if (isThreefoldRepetition()) {
    gameOver = true;
    gameResult = 'repetition';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameResult,
        winner: null // Draw - no winner
      }
    }));
  } else if (isStalemate(currentPlayer) || hasInsufficientMaterial()) {
    gameOver = true;
    gameResult = 'stalemate';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameResult,
        winner: null // Draw - no winner
      }
    }));
  }
  
  // Save current position to history (after the move and player switch)
  // Save after checks so we detect if position occurred 2 times before (making this the 3rd)
  positionHistory.push(getPositionSignature());
}

/**
 * Reset game
 */
function resetGame() {
  initializeBoard();
  renderBoard();
  
  // Dispatch game reset event
  window.dispatchEvent(new CustomEvent('gameReset'));
}

/**
 * Handle time's up event
 */
function handleTimeUp(playerWhoRanOut) {
  // Don't handle if game is already over
  if (gameOver) {
    return;
  }
  
  // The winner is the player who DIDN'T run out of time
  const winner = playerWhoRanOut === 'white' ? 'black' : 'white';
  
  // Check if winner has insufficient material (if so, it's a draw)
  // We need to check this before declaring a winner
  // Create a temporary board state where we swap to the winner's perspective
  // Actually, hasInsufficientMaterial checks both sides, so we just need to check it
  
  // If there's insufficient material, it's a draw regardless of time
  if (hasInsufficientMaterial()) {
    gameOver = true;
    gameResult = 'stalemate';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameResult,
        winner: null // Draw - no winner
      }
    }));
  } else {
    // Winner by time
    gameOver = true;
    gameResult = 'timeout';
    window.dispatchEvent(new CustomEvent('gameEnd', {
      detail: {
        result: gameResult,
        winner: winner
      }
    }));
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

