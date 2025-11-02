/**
 * CaptureContainer Web Component
 * Displays captured pieces in a grid layout
 */

class CaptureContainer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    // Request current state and update display
    window.dispatchEvent(new CustomEvent('gameStateRequest'));
    this.updatePieceDisplay(); // Update display based on current theme
  }

  render() {
    // Set up container styles (no background or color - set dynamically by parent)
    this.style.display = 'flex';
    this.style.flexWrap = 'wrap';
    this.style.flex = '1';
    this.style.minWidth = '12rem';
    this.style.gap = '.25rem';
  }

  setupEventListeners() {
    // Listen for centralized game state updates
    window.addEventListener('gameStateUpdate', (e) => {
      const player = this.getAttribute('player');
      const captures = e.detail.players[player].captures || '';
      this.updateFromGameState(captures);
    });

    // Listen for theme changes
    document.addEventListener('themechange', () => {
      this.updatePieceDisplay();
    });

    // Listen for game reset
    window.addEventListener('gameReset', () => {
      this.reset();
    });
  }

  /**
   * Update display from centralized game state
   * @param {string} captures - String of captured pieces (e.g., "QRBP")
   */
  updateFromGameState(captures) {
    // Clear existing pieces
    this.innerHTML = '';
    
    // Map piece symbols to piece types
    const pieceMap = { 'Q': 'q', 'R': 'r', 'B': 'b', 'N': 'n', 'P': 'p' };
    
    // Create spans for each captured piece
    for (const symbol of captures) {
      const pieceType = pieceMap[symbol];
      if (pieceType) {
        const pieceSpan = document.createElement('span');
        pieceSpan.dataset.pieceType = pieceType;
        pieceSpan.style.fontSize = '1.5rem';
        pieceSpan.style.width = '1.5rem';
        pieceSpan.style.height = '1.5rem';
        pieceSpan.style.display = 'flex';
        pieceSpan.style.alignItems = 'center';
        pieceSpan.style.justifyContent = 'center';
        
        this.appendChild(pieceSpan);
      }
    }
    
    // Update display based on current theme
    this.updatePieceDisplay();
  }

  updatePieceDisplay() {
    const PIECES = {
      white: { k: '♔\uFE0E', q: '♕\uFE0E', r: '♖\uFE0E', b: '♗\uFE0E', n: '♘\uFE0E', p: '♙\uFE0E' },
      black: { k: '♚\uFE0E', q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' }
    };
    
    const player = this.getAttribute('player');
    const isDarkTheme = document.documentElement.hasAttribute('data-theme');
    
    // Determine which piece set to use based on player and theme
    // White player: light mode = solid (black), dark mode = outline (white)
    // Black player: light mode = outline (white), dark mode = solid (black)
    let useSolid;
    if (player === 'white') {
      useSolid = !isDarkTheme; // Light mode = solid, dark mode = outline
    } else {
      useSolid = isDarkTheme; // Light mode = outline, dark mode = solid
    }
    
    const displaySet = useSolid ? PIECES.black : PIECES.white;
    
    // Update all piece spans
    const pieceSpans = this.querySelectorAll('span[data-piece-type]');
    pieceSpans.forEach(span => {
      const pieceType = span.dataset.pieceType;
      span.textContent = displaySet[pieceType];
    });
  }

  reset() {
    this.innerHTML = '';
    // Re-apply styles after clearing
    this.render();
  }

  disconnectedCallback() {
    // Clean up event listeners if needed
  }
}

// Register the custom element
customElements.define('capture-container', CaptureContainer);

