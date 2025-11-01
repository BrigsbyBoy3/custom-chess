/**
 * Button Web Component
 * Reusable button with variant support (solid/outline/icon)
 */

class Button extends HTMLElement {
  connectedCallback() {
    // Get attributes
    const variant = this.getAttribute('variant') || 'solid';
    const text = this.getAttribute('text') || this.textContent;
    const type = this.getAttribute('type') || 'button';
    const flex = this.getAttribute('flex');
    
    // Apply flex if specified
    if (flex) {
      this.style.display = 'flex';
      this.style.flex = flex;
    }
    
    // Apply base button classes
    this.classList.add('btn');
    this.classList.add(`btn-${variant}`);
    
    // Set button type attribute
    this.setAttribute('type', type);
    
    // Set role for semantics
    this.setAttribute('role', 'button');
    
    // If text attribute was provided, set the content
    if (this.getAttribute('text')) {
      this.textContent = text;
    }
  }
}

// Register the custom element
customElements.define('kev-button', Button);

