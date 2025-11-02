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
    this.gameResult = null; // Track game result
    this.isEditing = false; // Track if timer is being edited
    this.gameHasStarted = false; // Track if game has started
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
        <kev-n class="timer-container">
          <h3 class="text-h3 timer">${this.formatTime(this.timeRemaining)}</h3>
        </kev-n>
      </kev-n>
    `;
    
    // Initialize border color based on turn (white starts first)
    this.updateBorderColor('white');
    // Initialize timer container styling
    this.updateTimerContainer('white');
    // Add click listener to timer if game hasn't started
    this.setupTimerEdit();
  }

  setupEventListeners() {
    // Listen for game state changes
    window.addEventListener('turnChange', (e) => {
      // Mark that game has started
      this.gameHasStarted = true;
      
      // Don't start/stop timer if game is over
      if (this.gameResult) {
        return;
      }
      
      const player = this.getAttribute('player');
      if (e.detail.currentPlayer === player) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
      // Update border color based on turn
      this.updateBorderColor(e.detail.currentPlayer);
      // Update timer container styling based on turn
      this.updateTimerContainer(e.detail.currentPlayer);
    });

    // Listen for game end events
    window.addEventListener('gameEnd', (e) => {
      this.gameResult = e.detail.result;
      // Stop timer immediately when game ends
      this.stopTimer();
      this.displayGameResult(e.detail.result, e.detail.winner);
    });

    // Listen for game reset
    window.addEventListener('gameReset', () => {
      this.reset();
    });
  }

  setupTimerEdit() {
    const timerEl = this.querySelector('.timer');
    const timerContainer = this.querySelector('.timer-container');
    
    if (timerEl && timerContainer && !this.gameHasStarted && !this.gameResult) {
      // Make timer clickable before game starts
      timerContainer.style.cursor = 'pointer';
      timerEl.style.cursor = 'pointer';
      
      timerContainer.addEventListener('click', () => {
        if (!this.gameHasStarted && !this.gameResult && !this.isEditing) {
          this.startEditTimer();
        }
      });
    }
  }

  startEditTimer() {
    if (this.isEditing) return;
    
    this.isEditing = true;
    const timerContainer = this.querySelector('.timer-container');
    const currentTime = this.timeRemaining;
    
    // Remove background color while editing for better visibility
    timerContainer.style.backgroundColor = 'transparent';
    timerContainer.style.color = '';
    
    // Convert milliseconds to MM:SS format for display
    const totalSeconds = Math.floor(currentTime / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Replace timer with textfield
    timerContainer.innerHTML = `
      <kev-textfield 
        id="timer-edit-${this.getAttribute('player')}" 
        value="${timeString}"
        placeholder="MM:SS or seconds"
      ></kev-textfield>
    `;
    
    // Wait for custom element to be defined
    setTimeout(() => {
      const textField = timerContainer.querySelector('kev-textfield');
      if (textField) {
        const input = textField.querySelector('input');
        if (input) {
          input.focus();
          input.select(); // Select all text for easy editing
          
          // Handle Enter key to submit
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.submitTimerEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              this.cancelTimerEdit();
            }
          });
          
          // Handle blur to submit (clicking away)
          input.addEventListener('blur', () => {
            // Small delay to allow Enter key handler to fire first
            setTimeout(() => {
              if (this.isEditing) {
                this.submitTimerEdit();
              }
            }, 100);
          });
        }
      }
    }, 0);
  }

  submitTimerEdit() {
    if (!this.isEditing) return;
    
    const timerContainer = this.querySelector('.timer-container');
    const textField = timerContainer.querySelector('kev-textfield');
    
    if (!textField) {
      this.cancelTimerEdit();
      return;
    }
    
    const inputValue = textField.value.trim();
    
    if (inputValue) {
      // Parse input: MM:SS or just seconds
      let totalSeconds = 0;
      
      if (inputValue.includes(':')) {
        // MM:SS format
        const parts = inputValue.split(':');
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        totalSeconds = mins * 60 + secs;
      } else {
        // Just seconds
        totalSeconds = parseInt(inputValue, 10) || 0;
      }
      
      // Convert to milliseconds and update
      if (totalSeconds > 0) {
        this.timeRemaining = totalSeconds * 1000;
        this.updateTimerDisplay();
      }
    }
    
    // Restore timer display
    this.cancelTimerEdit();
  }

  cancelTimerEdit() {
    if (!this.isEditing) return;
    
    this.isEditing = false;
    const timerContainer = this.querySelector('.timer-container');
    
    // Restore timer display
    timerContainer.innerHTML = `
      <h3 class="text-h3 timer">${this.formatTime(this.timeRemaining)}</h3>
    `;
    
    // Re-setup edit functionality if needed
    this.setupTimerEdit();
    // Restore timer container styling
    this.updateTimerContainer('white');
  }

  startTimer() {
    // Don't start timer if game is over
    if (this.gameResult) {
      return;
    }
    
    this.stopTimer(); // Clear any existing timer
    
    // Record when timer started
    this.timerStartTime = Date.now();
    
    // Update every 100ms for smooth display
    this.timerInterval = setInterval(() => {
      // Check if game is over before continuing
      if (this.gameResult) {
        this.stopTimer();
        return;
      }
      
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
    if (timerEl && !this.gameResult) {
      timerEl.textContent = this.formatTime(this.timeRemaining);
    }
  }

  updateTimerContainer(currentPlayer) {
    const player = this.getAttribute('player') || 'white';
    const isTurnActive = currentPlayer === player;
    const timerContainer = this.querySelector('.timer-container');
    
    if (timerContainer && !this.gameResult) {
      // During turn: dark background, light text, no border
      // Not during turn: no background change
      if (isTurnActive) {
        timerContainer.style.backgroundColor = 'var(--dark)';
        timerContainer.style.color = 'var(--light)';
        timerContainer.style.padding = '0.5rem 1rem';
        timerContainer.style.border = '0';
      } else {
        timerContainer.style.backgroundColor = 'transparent';
        timerContainer.style.color = '';
        timerContainer.style.padding = '0';
        timerContainer.style.border = '0';
      }
    }
  }

  displayGameResult(result, winner) {
    const player = this.getAttribute('player') || 'white';
    const timerEl = this.querySelector('.timer');
    const timerContainer = this.querySelector('.timer-container');
    
    if (!timerEl || !timerContainer) return;
    
    // Determine win/lose/draw for this player
    let resultText = '';
    if (result === 'checkmate' || result === 'timeout') {
      resultText = winner === player ? 'Win' : 'Lose';
    } else if (result === 'stalemate' || result === 'repetition') {
      resultText = 'Draw';
    }
    
    // Update timer text to show result
    timerEl.textContent = resultText;
    
    // Style based on result
    if (resultText === 'Win') {
      timerContainer.style.backgroundColor = 'var(--dark)';
      timerContainer.style.color = 'var(--light)';
      timerContainer.style.border = 'none';
    } else if (resultText === 'Lose') {
      timerContainer.style.backgroundColor = 'var(--light)';
      timerContainer.style.color = 'var(--dark)';
      timerContainer.style.border = 'none';
    } else if (resultText === 'Draw') {
      timerContainer.style.backgroundColor = 'transparent';
      timerContainer.style.border = '0.25rem solid';
      timerContainer.style.color = 'var(--dark)';
    }
    
    timerContainer.style.padding = '0.5rem 1rem';
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
    this.gameResult = null;
    this.gameHasStarted = false;
    this.isEditing = false;
    
    this.updateTimerDisplay();
    
    // Reset border color to initial state (white starts first)
    this.updateBorderColor('white');
    // Reset timer container styling
    this.updateTimerContainer('white');
    // Re-setup edit functionality
    this.setupTimerEdit();
  }

  disconnectedCallback() {
    this.stopTimer();
  }
}

// Register the custom element
customElements.define('player-info', PlayerInfo);

