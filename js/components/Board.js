/**
 * Board Web Component
 * Chess board container
 */

class Board extends HTMLElement {
  connectedCallback() {
    // Apply board styling
    this.classList.add('chess-board');
    
    // Set ID for JavaScript targeting
    if (!this.id) {
      this.id = 'chessBoard';
    }
  }
}

// Register the custom element
customElements.define('chess-board', Board);

