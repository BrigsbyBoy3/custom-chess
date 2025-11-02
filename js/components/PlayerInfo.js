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
    const playerColor = player === 'white' ? 'var(--white)' : 'var(--black)';
    
    this.innerHTML = `
      <kev-n class="player-info-container" justify="space-between" align="center" p="1" b=".25" s="1">
        <kev-n h="3rem" w="3rem" b=".25" style="background-color: ${playerColor};"></kev-n>
        <capture-container player="${player}"></capture-container>
        <h3 class="text-h3 timer">${this.formatTime(this.timeRemaining)}</h3>
      </kev-n>
    `;
    
    // Initialize border color based on turn (white starts first)
    this.updateBorderColor('white');
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
      // Update border color based on turn
      this.updateBorderColor(e.detail.currentPlayer);
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

  updateBorderColor(currentPlayer) {
    const player = this.getAttribute('player') || 'white';
    const isTurnActive = currentPlayer === player;
    const container = this.querySelector('.player-info-container');
    
    if (container) {
      // When it's NOT their turn, border should be light (invisible)
      // When it IS their turn, border should be dark (visible)
      if (isTurnActive) {
        container.style.borderColor = 'var(--dark)';
      } else {
        container.style.borderColor = 'var(--light)';
      }
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

  reset() {
    this.stopTimer();
    this.timeRemaining = 600000; // Reset to initial time (10 minutes in milliseconds)
    
    this.updateTimerDisplay();
    
    // Reset border color to initial state (white starts first)
    this.updateBorderColor('white');
  }

  disconnectedCallback() {
    this.stopTimer();
  }
}

// Register the custom element
customElements.define('player-info', PlayerInfo);

