/**
 * Chess game constants
 */

// Chess piece Unicode symbols with text variation selector to prevent emoji conversion
// Note: These are organized by visual style (solid vs outlined), not by player color
// The mapping from player color to visual style depends on context (board square, theme, etc.)
export const PIECES = {
  outlined: {
    k: '♔\uFE0E',
    q: '♕\uFE0E',
    r: '♖\uFE0E',
    b: '♗\uFE0E',
    n: '♘\uFE0E',
    p: '♙\uFE0E'
  },
  solid: {
    k: '♚\uFE0E',
    q: '♛\uFE0E',
    r: '♜\uFE0E',
    b: '♝\uFE0E',
    n: '♞\uFE0E',
    p: '♟\uFE0E'
  }
};

