/**
 * PlayerInfo Web Component
 * Displays player name, captured pieces, and timer
 */

class PlayerInfo extends HTMLElement {
  constructor() {
    super();
    this.timerInterval = null;
    this.timeRemaining = 600000; // 10 minutes in milliseconds (adjust as needed)
    this.timerStartTime = null; // When the timer started
  }

  connectedCallback() {
    const player = this.getAttribute('player') || 'white';
    const isWhite = player === 'white';
    
    // Set ID for easy targeting
    this.id = `player-container-${player}`;
    
    this.render();
    this.setupEventListeners();
  }

  render() {
    const player = this.getAttribute('player') || 'white';
    const displayName = player.charAt(0).toUpperCase() + player.slice(1);
    
    this.innerHTML = `
      <kev-n justify="space-between" align="center" p="1" b=".25" s="1">
        <p class="text-h5 player-name">${displayName}</p>
        <kev-n class="capture-container" flex="1" s=".5" style="padding-left: 1rem;"></kev-n>
        <h3 class="text-h3 timer">${this.formatTime(this.timeRemaining)}</h3>
      </kev-n>
    `;
  }

  setupEventListeners() {
    // Listen for game state changes
    window.addEventListener('turnChange', (e) => {
      const player = this.getAttribute('player');
      if (e.detail.currentPlayer === player) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });

    // Listen for piece captures
    window.addEventListener('pieceCaptured', (e) => {
      const player = this.getAttribute('player');
      // If a white piece was captured, black gets it
      // If a black piece was captured, white gets it
      if (e.detail.capturedBy === player) {
        this.addCapturedPiece(e.detail.piece);
      }
    });

    // Listen for game reset
    window.addEventListener('gameReset', () => {
      this.reset();
    });
  }

  startTimer() {
    this.stopTimer(); // Clear any existing timer
    
    // Record when timer started
    this.timerStartTime = Date.now();
    
    // Update every 100ms for smooth display
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.timerStartTime;
      this.timeRemaining -= elapsed;
      this.timerStartTime = Date.now(); // Reset for next interval
      
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.stopTimer();
        // Dispatch time's up event
        window.dispatchEvent(new CustomEvent('timeUp', {
          detail: { player: this.getAttribute('player') }
        }));
      }
      
      this.updateTimerDisplay();
    }, 100); // Update 10 times per second
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.timerStartTime = null;
    }
  }

  updateTimerDisplay() {
    const timerEl = this.querySelector('.timer');
    if (timerEl) {
      timerEl.textContent = this.formatTime(this.timeRemaining);
    }
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10); // Get centiseconds (hundredths)
    
    // Show milliseconds when under 10 seconds
    if (totalSeconds < 10) {
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    }
    
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  addCapturedPiece(piece) {
    const container = this.querySelector('.capture-container');
    if (container) {
      const pieceSpan = document.createElement('span');
      pieceSpan.textContent = piece;
      pieceSpan.style.fontSize = '1.25rem';
      container.appendChild(pieceSpan);
    }
  }

  reset() {
    this.stopTimer();
    this.timeRemaining = 600000; // Reset to initial time (10 minutes in milliseconds)
    
    // Clear captured pieces
    const container = this.querySelector('.capture-container');
    if (container) {
      container.innerHTML = '';
    }
    
    this.updateTimerDisplay();
  }

  disconnectedCallback() {
    this.stopTimer();
  }
}

// Register the custom element
customElements.define('player-info', PlayerInfo);

