/**
 * PlayerSelectionModal Component
 * Modal for choosing player color in multiplayer
 */

class PlayerSelectionModal extends HTMLElement {
  connectedCallback() {
    // Build the modal structure
    this.innerHTML = `
      <kev-modal id="playerSelectionModal">
        <kev-n col b=".25" p="1" s="1">
          <h2 class="text-h2">Choose Player</h2>
          <kev-n s=".5">
            <kev-button id="whiteBtn" variant="icon">⚪</kev-button>
            <kev-button id="blackBtn" variant="icon">⚫</kev-button>
            <kev-button id="randomBtn" variant="icon">?</kev-button>
          </kev-n>
          <kev-button id="closeBtn" variant="text">Close</kev-button>
        </kev-n>
      </kev-modal>
    `;
    
    // Get references
    this.modal = this.querySelector('#playerSelectionModal');
    this.whiteBtn = this.querySelector('#whiteBtn');
    this.blackBtn = this.querySelector('#blackBtn');
    this.randomBtn = this.querySelector('#randomBtn');
    this.closeBtn = this.querySelector('#closeBtn');
    
    // Wire up event handlers
    this.setupButtons();
  }
  
  async setupButtons() {
    // Import multiplayer functions
    const { setPlayerColor } = await import('../multiplayer.js');
    
    this.whiteBtn.addEventListener('click', () => {
      setPlayerColor('white');
      this.close();
    });
    
    this.blackBtn.addEventListener('click', () => {
      setPlayerColor('black');
      this.close();
    });
    
    this.randomBtn.addEventListener('click', () => {
      // Random: choose white or black randomly
      const color = Math.random() < 0.5 ? 'white' : 'black';
      setPlayerColor(color);
      this.close();
    });
    
    this.closeBtn.addEventListener('click', () => {
      this.close();
    });
  }
  
  // Public API
  open() {
    this.modal.open();
  }
  
  close() {
    this.modal.close();
  }
}

// Register the custom element
customElements.define('player-selection-modal', PlayerSelectionModal);

