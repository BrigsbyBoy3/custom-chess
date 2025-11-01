/**
 * PaletteModal Component
 * Modal for customizing color palette
 */

class PaletteModal extends HTMLElement {
  connectedCallback() {
    // Get current values from CSS custom properties
    const computedStyle = getComputedStyle(document.documentElement);
    const currentWhite = computedStyle.getPropertyValue('--white').trim();
    const currentBlack = computedStyle.getPropertyValue('--black').trim();
    
    // Build the modal structure
    this.innerHTML = `
      <kev-modal id="paletteModal">
        <kev-n col s=".25">
          <h2 class="text-h2">Palette Settings</h2>
          <p class="text-body1">Choose your colors.</p>
        </kev-n>
        <kev-n align="flex-end" s="1">
          <div id="whitePreview" style="background: var(--white); height: 3rem; width: 3rem; border: var(--dark) .125rem solid"></div>
          <kev-textfield id="whiteInput" flex="1" label="White" placeholder="Enter hex color" value="${currentWhite}"></kev-textfield>
        </kev-n>
        <kev-n align="flex-end" s="1">
          <div id="blackPreview" style="background: var(--black); height: 3rem; width: 3rem; border: var(--dark) .125rem solid"></div>
          <kev-textfield id="blackInput" flex="1" label="Black" placeholder="Enter hex color" value="${currentBlack}"></kev-textfield>
        </kev-n>
          <kev-button id="closeBtn" variant="solid">Close</kev-button>
      </kev-modal>
    `;
    
    // Get references
    this.modal = this.querySelector('#paletteModal');
    this.whiteInput = this.querySelector('#whiteInput');
    this.blackInput = this.querySelector('#blackInput');
    this.whitePreview = this.querySelector('#whitePreview');
    this.blackPreview = this.querySelector('#blackPreview');
    
    // Wire up event handlers
    this.setupColorInputs();
    this.setupButtons();
  }
  
  setupColorInputs() {
    const expandHexColor = (hex) => {
      // Expand 3-digit hex to 6-digit (#FFF -> #FFFFFF)
      if (hex.match(/^#[0-9A-Fa-f]{3}$/)) {
        return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex;
    };
    
    const isValidHex = (color) => {
      return color.match(/^#[0-9A-Fa-f]{3}$/) || color.match(/^#[0-9A-Fa-f]{6}$/);
    };
    
    // Track last valid values (initialize from current CSS custom properties)
    const computedStyle = getComputedStyle(document.documentElement);
    let lastValidWhite = computedStyle.getPropertyValue('--white').trim();
    let lastValidBlack = computedStyle.getPropertyValue('--black').trim();
    
    const whiteInputEl = this.whiteInput.querySelector('input');
    const blackInputEl = this.blackInput.querySelector('input');
    
    whiteInputEl.addEventListener('input', (e) => {
      let color = e.target.value;
      if (isValidHex(color)) {
        color = expandHexColor(color);
        lastValidWhite = color;
        document.documentElement.style.setProperty('--white', color);
        this.whitePreview.style.background = color;
      }
    });
    
    whiteInputEl.addEventListener('blur', (e) => {
      if (!isValidHex(e.target.value)) {
        e.target.value = lastValidWhite;
      }
    });
    
    blackInputEl.addEventListener('input', (e) => {
      let color = e.target.value;
      if (isValidHex(color)) {
        color = expandHexColor(color);
        lastValidBlack = color;
        document.documentElement.style.setProperty('--black', color);
        this.blackPreview.style.background = color;
      }
    });
    
    blackInputEl.addEventListener('blur', (e) => {
      if (!isValidHex(e.target.value)) {
        e.target.value = lastValidBlack;
      }
    });
  }
  
  setupButtons() {
    this.querySelector('#closeBtn').addEventListener('click', () => {
      this.close();
    });
    
    // Apply button could save to localStorage in the future
    this.querySelector('#applyBtn').addEventListener('click', () => {
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
customElements.define('palette-modal', PaletteModal);

