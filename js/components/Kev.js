/**
 * kev-n Web Component
 * Figma-style flexible container with intuitive sizing
 */

class KevN extends HTMLElement {
  connectedCallback() {
    // Defaults: flex row, no spacing
    this.style.display = 'flex';
    if (!this.style.margin) this.style.margin = '0';
    if (!this.style.padding) this.style.padding = '0';
    if (!this.style.gap) this.style.gap = '0';
    if (!this.style.border) this.style.border = '0';
    this.style.boxSizing = 'border-box';
    if (!this.style.color) this.style.color = 'var(--dark)';
    if (!this.style.borderColor) this.style.borderColor = 'var(--dark)';
    
    // Direction shortcuts
    if (this.hasAttribute('col')) {
      this.style.flexDirection = 'column';
    } else {
      this.style.flexDirection = this.getAttribute('direction') || 'row';
    }
    
    // Spacing (rem values)
    const m = this.getAttribute('m');
    const p = this.getAttribute('p');
    const s = this.getAttribute('s');
    if (m) this.style.margin = `${m}rem`;
    if (p) this.style.padding = `${p}rem`;
    if (s) this.style.gap = `${s}rem`;
    
    // Fixed dimensions (must include unit, e.g. "600px")
    const w = this.getAttribute('w');
    const h = this.getAttribute('h');
    if (w) this.style.width = w;
    if (h) this.style.height = h;
    
    // Flex (use for growing/filling space)
    const flex = this.getAttribute('flex');
    if (flex) this.style.flex = flex;
    
    // Max constraints
    const maxW = this.getAttribute('max-w');
    const maxH = this.getAttribute('max-h');
    if (maxW) this.style.maxWidth = maxW;
    if (maxH) this.style.maxHeight = maxH;
    
    // Border (always dark color)
    const b = this.getAttribute('b');
    if (b) {
      this.style.border = `${b}rem solid var(--dark)`;
    }
    
    // Flexbox alignment
    const justify = this.getAttribute('justify');
    const align = this.getAttribute('align');
    if (justify) this.style.justifyContent = justify;
    if (align) this.style.alignItems = align;
    
    // Background (defaults to dark if attribute exists)
    if (this.hasAttribute('bg')) {
      const bg = this.getAttribute('bg');
      this.style.background = bg || 'var(--dark)';
      
      // If background is set, make children text light
      this.style.color = 'var(--light)';
    }
  }
}

// Register the custom element
customElements.define('kev-n', KevN);

