/**
 * ToggleSwitch Web Component
 * Generic binary toggle switch - fires 'toggle' event when switched
 */

class ToggleSwitch extends HTMLElement {
  connectedCallback() {
    // Build the component's HTML structure
    this.innerHTML = `
      <label class="switch">
        <input type="checkbox">
        <span class="switch-knob"></span>
        <span class="switch-spacer"></span>
      </label>
    `;
    
    // Attach event listener
    this.querySelector('input').addEventListener('change', (e) => {
      // Fire a custom 'toggle' event
      this.dispatchEvent(new CustomEvent('toggle', {
        detail: { checked: e.target.checked }
      }));
    });
  }
}

// Register the custom element
customElements.define('toggle-switch', ToggleSwitch);

