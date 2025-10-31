# Local Multiplayer Chess

A clean, modern chess game for local multiplayer play. Built with vanilla JavaScript, ready to extend with additional features.

## Features

✅ **Current Features:**
- Full chess piece movement (pawns, rooks, knights, bishops, queens, kings)
- Legal move highlighting
- Turn-based gameplay for two local players
- Pawn promotion to queen
- Clean, modern UI
- Responsive design

🔜 **Coming Soon (Easy to Add):**
- Check/checkmate detection
- Chess clock
- Pre-moves
- Move history
- Captured pieces display
- En passant
- Castling

## Running Locally

### Option 1: Python (Recommended)
```bash
cd chess-game
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 2: Direct File
Just open `index.html` directly in your browser (some features may not work due to CORS)

## Deploying to GitHub Pages

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., "chess-game")
3. **Don't** initialize with README (we already have files)

### Step 2: Push Your Code
```bash
cd chess-game

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial chess game"

# Add your GitHub repo as remote (replace with your username/repo)
git remote add origin https://github.com/YOUR-USERNAME/chess-game.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in sidebar)
3. Under "Source", select **main** branch
4. Click **Save**
5. Wait ~1-2 minutes for deployment

Your site will be live at: `https://YOUR-USERNAME.github.io/chess-game/`

## Integrating with Webflow

### Method 1: Full Iframe Embed
1. In Webflow, add an **Embed** element where you want the chess game
2. Paste this code:
```html
<iframe 
  src="https://YOUR-USERNAME.github.io/chess-game/" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
</iframe>
```

### Method 2: Direct Embed (More Integrated)
1. In Webflow, add an **Embed** element
2. Paste this code:
```html
<div id="chess-root"></div>
<link rel="stylesheet" href="https://YOUR-USERNAME.github.io/chess-game/css/styles.css">
<script type="module" src="https://YOUR-USERNAME.github.io/chess-game/js/main.js"></script>
```

**Note:** Method 1 (iframe) is simpler and more reliable for Webflow.

## File Structure

```
chess-game/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styling
├── js/
│   └── main.js         # Game logic
└── README.md           # This file
```

## How to Add Features

The code is organized to make adding features easy:

### Adding a Chess Clock
Create `js/clock.js` and import it in `main.js`. The clock can listen for move events and update timers.

### Adding Check/Checkmate Detection
Extend the `getLegalMoves()` function to filter out moves that leave the king in check, then check if the current player has any legal moves.

### Adding Move History
Create an array `moveHistory` and push moves as they're made. Display in a sidebar.

### Adding Pre-moves
Store the intended move when it's not the player's turn, then execute it when their turn begins.

## Updating Your Live Site

After making changes locally:

1. Test locally (refresh http://localhost:8000)
2. Commit and push:
```bash
git add .
git commit -m "Description of changes"
git push
```
3. Wait ~30-90 seconds for GitHub Pages to rebuild
4. Your live site will automatically update!

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## License

Free to use and modify as you wish!

