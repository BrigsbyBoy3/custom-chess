/**
 * MoveHistory Web Component
 * Displays the history of moves in FIDE standard algebraic notation
 */

class MoveHistory extends HTMLElement {
  constructor() {
    super();
    this.moves = []; // Array of move objects
    this.gameResult = null; // Track if game ended in checkmate
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <kev-n col p="1" s="1">
        <table class="move-history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </kev-n>
    `;
    this.updateDisplay();
  }

  setupEventListeners() {
    // Listen for moves
    window.addEventListener('moveMade', (e) => {
      this.addMove(e.detail);
    });

    // Listen for game end to add checkmate notation
    window.addEventListener('gameEnd', (e) => {
      this.gameResult = e.detail.result;
      if (e.detail.result === 'checkmate') {
        // Update the last move to add # (checkmate symbol)
        if (this.moves.length > 0) {
          const lastMove = this.moves[this.moves.length - 1];
          lastMove.isCheckmate = true;
          this.updateDisplay();
        }
      }
    });

    // Listen for game reset
    window.addEventListener('gameReset', () => {
      this.reset();
    });
  }

  addMove(moveData) {
    this.moves.push(moveData);
    this.updateDisplay();
  }

  updateDisplay() {
    const tbody = this.querySelector('tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (this.moves.length === 0) {
      return;
    }

    // Group moves into pairs (white and black) - standard FIDE notation format
    for (let i = 0; i < this.moves.length; i += 2) {
      const whiteMove = this.moves[i];
      const blackMove = this.moves[i + 1];
      
      // Move pair number: 1, 2, 3, etc. (each pair represents one full turn)
      const pairNumber = Math.floor(i / 2) + 1;
      
      const whiteNotation = this.formatMove(whiteMove);
      const blackNotation = blackMove ? this.formatMove(blackMove) : '';
      
      // Create table row
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pairNumber}</td>
        <td>${whiteNotation}</td>
        <td>${blackNotation || ''}</td>
      `;
      tbody.appendChild(row);
    }
  }

  formatMove(move) {
    // Handle castling first
    if (move.isCastling) {
      const isKingside = move.toCol === 6; // Kingside castling moves king to g (col 6)
      const notation = isKingside ? 'O-O' : 'O-O-O';
      return notation + (move.isCheckmate ? '#' : (move.putsInCheck ? '+' : ''));
    }

    // Get piece abbreviation (K, Q, R, B, N, or empty for pawn)
    const pieceSymbol = this.getPieceSymbol(move.piece.type);
    
    // Get target square
    const toSquare = this.coordToAlgebraic(move.toRow, move.toCol);
    
    // Determine disambiguation needed (if any)
    const disambiguation = this.getDisambiguation(move);
    
    // Handle captures
    let notation = '';
    if (move.isCapture) {
      if (move.piece.type === 'p') {
        // For pawns, include the file of departure: exd5
        const fromFile = this.coordToAlgebraic(move.fromRow, move.fromCol)[0];
        notation = `${fromFile}x${toSquare}`;
      } else {
        notation = `${pieceSymbol}${disambiguation}x${toSquare}`;
      }
    } else {
      // Normal move
      if (move.piece.type === 'p') {
        notation = toSquare; // Pawns just show destination square
      } else {
        notation = `${pieceSymbol}${disambiguation}${toSquare}`;
      }
    }

    // Handle promotion
    if (move.promotedPiece) {
      const promotionSymbol = this.getPieceSymbol(move.promotedPiece);
      notation += `=${promotionSymbol}`;
    }

    // Add check/checkmate notation
    if (move.isCheckmate) {
      notation += '#';
    } else if (move.putsInCheck) {
      notation += '+';
    }

    return notation;
  }

  getDisambiguation(move) {
    // If no ambiguous pieces, no disambiguation needed
    if (!move.ambiguousPieces || move.ambiguousPieces.length === 0) {
      return '';
    }

    const ambiguous = move.ambiguousPieces;
    const fromFile = this.coordToAlgebraic(move.fromRow, move.fromCol)[0];
    const fromRank = this.coordToAlgebraic(move.fromRow, move.fromCol)[1];

    // Check if file disambiguation is sufficient (all other pieces on different files)
    const sameFilePieces = ambiguous.filter(p => {
      const file = this.coordToAlgebraic(p.row, p.col)[0];
      return file === fromFile;
    });

    // Check if rank disambiguation is sufficient (all other pieces on different ranks)
    const sameRankPieces = ambiguous.filter(p => {
      const rank = this.coordToAlgebraic(p.row, p.col)[1];
      return rank === fromRank;
    });

    // If all ambiguous pieces are on different files, file disambiguation is enough
    if (sameFilePieces.length === 0) {
      return fromFile;
    }

    // If all ambiguous pieces are on different ranks, rank disambiguation is enough
    if (sameRankPieces.length === 0) {
      return fromRank;
    }

    // If some pieces share the file and some share the rank, need both
    // This is the full disambiguation case
    return fromFile + fromRank;
  }

  getPieceSymbol(pieceType) {
    const symbols = {
      'k': 'K',
      'q': 'Q',
      'r': 'R',
      'b': 'B',
      'n': 'N',
      'p': '' // Pawns don't get a symbol
    };
    return symbols[pieceType] || '';
  }

  coordToAlgebraic(row, col) {
    // Convert 0-7 row/col to algebraic notation (a-h, 1-8)
    const file = String.fromCharCode(97 + col); // a-h (97 is 'a' in ASCII)
    const rank = 8 - row; // 1-8 (row 0 is rank 8, row 7 is rank 1)
    return `${file}${rank}`;
  }

  reset() {
    this.moves = [];
    this.gameResult = null;
    this.updateDisplay();
  }
}

// Register the custom element
customElements.define('move-history', MoveHistory);

