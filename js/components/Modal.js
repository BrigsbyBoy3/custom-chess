/**
 * Modal Web Component
 * A centered overlay dialog similar to MUI's Dialog
 */

class Modal extends HTMLElement {
  connectedCallback() {
    // Wrap content in modal structure
    this.wrapContent();
    
    // Start hidden
    this.style.display = 'none';
    
    // Close on backdrop click
    this.querySelector('.modal-backdrop').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.close();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  wrapContent() {
    const content = this.innerHTML;
    this.innerHTML = `
      <div class="modal-backdrop">
        <kev-n class="modal-content" col b="2" p="2" s="2">
          ${content}
        </kev-n>
      </div>
    `;
  }
  
  open() {
    this.style.display = 'block';
    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('modalopen', { bubbles: true }));
  }
  
  close() {
    this.style.display = 'none';
    this.removeAttribute('open');
    document.body.style.overflow = '';
    
    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('modalclose', { bubbles: true }));
  }
  
  isOpen() {
    return this.hasAttribute('open');
  }
  
  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
}

// Register the custom element
customElements.define('kev-modal', Modal);

