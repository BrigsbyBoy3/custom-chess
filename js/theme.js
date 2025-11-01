/**
 * Theme Management Module
 * Centralized theme state and switching logic
 */

const THEME_ICONS = {
  light: '⏾',
  dark: '❂'
};

/**
 * Check if dark theme is currently active
 */
export function isDarkTheme() {
  return document.documentElement.hasAttribute('data-theme');
}

/**
 * Get the icon for the current theme
 */
export function getThemeIcon() {
  return isDarkTheme() ? THEME_ICONS.dark : THEME_ICONS.light;
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  if (isDarkTheme()) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('chess-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('chess-theme', 'dark');
  }
  
  // Dispatch custom event for any listeners
  document.dispatchEvent(new CustomEvent('themechange', {
    detail: { isDark: isDarkTheme() }
  }));
}

/**
 * Load saved theme from localStorage
 */
export function loadSavedTheme() {
  const savedTheme = localStorage.getItem('chess-theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

/**
 * Set theme explicitly
 */
export function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  document.dispatchEvent(new CustomEvent('themechange', {
    detail: { isDark: isDarkTheme() }
  }));
}

/**
 * Initialize a theme toggle button
 * Sets up click handler and icon updates automatically
 */
export function initThemeToggle(buttonElement) {
  // Set initial icon
  buttonElement.textContent = getThemeIcon();
  
  // Add click handler
  buttonElement.addEventListener('click', () => {
    toggleTheme();
    buttonElement.textContent = getThemeIcon();
  });
}

/**
 * ThemeIcon Web Component
 * Displays the current theme icon and updates automatically
 */
class ThemeIcon extends HTMLElement {
  connectedCallback() {
    // Set initial icon
    this.updateIcon();
    
    // Listen for theme changes
    document.addEventListener('themechange', () => {
      this.updateIcon();
    });
  }
  
  updateIcon() {
    this.textContent = getThemeIcon();
  }
}

// Register the custom element
customElements.define('theme-icon', ThemeIcon);

