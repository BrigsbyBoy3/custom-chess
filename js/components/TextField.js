/**
 * TextField Web Component
 * Input field with optional label
 */

class TextField extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute('label') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const name = this.getAttribute('name') || '';
    const flex = this.getAttribute('flex');
    
    // Apply flex if specified
    if (flex) {
      this.style.display = 'flex';
      this.style.flex = flex;
    }
    
    // Build the structure
    this.innerHTML = `
      <kev-n col flex="1" s="0.5">
        ${label ? `<span class="text-overline">${label}</span>` : ''}
        <kev-n class="text-field-input" align="center">
          <input 
            type="text" 
            class="text-body1" 
            placeholder="${placeholder}"
            value="${value}"
            name="${name}"
          />
        </kev-n>
      </kev-n>
    `;
    
    // Store reference to input
    this.inputElement = this.querySelector('input');
    
    // Set border-bottom and fixed height (inline style needed to override kev-n defaults)
    const fieldContainer = this.querySelector('.text-field-input');
    fieldContainer.style.height = '3rem';
    fieldContainer.style.borderBottom = '0.125rem solid var(--dark)';
    
    // Handle focus state
    this.inputElement.addEventListener('focus', () => {
      fieldContainer.style.borderBottom = '0.25rem solid var(--dark)';
    });
    
    this.inputElement.addEventListener('blur', () => {
      fieldContainer.style.borderBottom = '0.125rem solid var(--dark)';
    });
  }
  
  // Expose input value
  get value() {
    return this.inputElement?.value || '';
  }
  
  set value(val) {
    if (this.inputElement) {
      this.inputElement.value = val;
    }
  }
  
  // Focus the input
  focus() {
    this.inputElement?.focus();
  }
}

// Register the custom element
customElements.define('kev-textfield', TextField);

