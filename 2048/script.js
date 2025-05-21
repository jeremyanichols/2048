// Add this before the DOMContentLoaded event
function getThemeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') === 'light' ? 'sf-light-theme' : 'sf-dark-theme';
}

document.addEventListener('DOMContentLoaded', () => {
    // Add styles to contain the game without interfering with page scroll
    document.body.style.cssText = `
        overflow: hidden;
        position: relative;
        height: 100%;
        margin: 0;
        padding: 0;
    `;

    // Prevent only touchmove events to avoid game swipe interference
    document.addEventListener('touchmove', (event) => {
        if (event.target.closest('.game-container')) {
            event.preventDefault();
        }
    }, { passive: false });

    // Function to get the currently applied theme from the <html> element
    function getInitialThemeFromHtml() {
        if (document.documentElement.classList.contains('sf-light-theme')) {
            return 'sf-light-theme';
        }
        return 'sf-dark-theme'; // Default if no specific theme class found or if only sf-dark-theme is present
    }

    const initialTheme = getInitialThemeFromHtml();

    // Ensure body class is synchronized with the <html> element's class
    document.body.classList.remove('sf-light-theme', 'sf-dark-theme');
    document.body.classList.add(initialTheme);
    // console.log('2048 Game (DOMContentLoaded): Synchronized body class to:', initialTheme);

    // Game variables
    let grid = Array(4).fill().map(() => Array(4).fill(0));
    let score = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
    let gameOver = false;
    let gameWon = false;
    let canMove = true;

    // DOM elements
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const tileContainer = document.getElementById('tile-container');
    const gameMessage = document.querySelector('.game-message');
    const retryButton = document.querySelector('.retry-button');
    const shareXLink = document.getElementById('share-x-link'); // Select the share link

    // Then listen for theme changes from parent
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'sfThemeChange') {
            const themeToApply = event.data.theme;
            // console.log('2048 Game: Received theme update from parent:', themeToApply);

            const themeToRemove = themeToApply === 'sf-light-theme' ? 'sf-dark-theme' : 'sf-light-theme';

            document.documentElement.classList.remove(themeToRemove);
            document.documentElement.classList.add(themeToApply);

            document.body.classList.remove(themeToRemove);
            document.body.classList.add(themeToApply);

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'themeApplied', theme: themeToApply }, '*');
                // console.log('2048 Game: Sent theme applied confirmation to parent');
            }
        }
    });

    // Function to create the visual grid cells (call this in initGame)
    function createGridCells() {
        // Clear existing tiles but keep grid cells
        const existingTiles = tileContainer.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        // Only create grid cells if they don't exist
        if (!tileContainer.querySelector('.grid-cell')) {
            for (let i = 0; i < 16; i++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                tileContainer.appendChild(cell);
            }
        }
    }

    // Initialize game
    function initGame() {
        // Clear the grid
        grid = Array(4).fill().map(() => Array(4).fill(0));
        // Reset score
        score = 0;
        // Reset game state
        gameOver = false;
        gameWon = false;
        canMove = true;
        // Clear all existing tiles
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
        // Hide any game messages
        gameMessage.className = 'game-message';
        gameMessage.querySelector('p').textContent = '';
        // Create grid cells if they don't exist
        createGridCells();
        // Update score display
        updateScore();
        // Add initial tiles
        addRandomTile();
        addRandomTile();
        // Update grid display
        updateGrid();
    }

    // Update score display and share link
    function updateScore() {
        scoreElement.textContent = score;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bestScore', bestScore);
        }

        bestScoreElement.textContent = bestScore;
        updateShareXLink(); // Update the share link whenever the score is updated
    }

    // Function to update the X.com share link
    function updateShareXLink() {
        if (!shareXLink) return;

        const text = `I just hit a high score of ${bestScore} playing @stakefish 2048 game. Can you beat it?\n\n2048.stake.fish`;
        const encodedText = encodeURIComponent(text);
        shareXLink.href = `https://x.com/intent/tweet?text=${encodedText}`;
    }

    // Clear all tiles from the board
    function clearTiles() {
        tileContainer.innerHTML = '';
    }

    // Hide game message
    function hideMessage() {
        gameMessage.className = 'game-message';
    }

    // Add a random tile (2 or 4) to an empty cell
    function addRandomTile() {
        const emptyCells = [];

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            grid[row][col] = Math.random() < 0.9 ? 2 : 4;
            createTileElement(row, col, grid[row][col], true);
        }
    }

    // Function to calculate responsive font size for tiles
    function getResponsiveTileFontSize(value) {
        const isSmallScreen = window.innerWidth <= 480; // Breakpoint for when tiles get quite small

        if (value >= 10000) { // e.g., 16384
            return isSmallScreen ? '12px' : '18px';
        } else if (value >= 1000) { // e.g., 1024, 2048, 4096, 8192
            return isSmallScreen ? '15px' : '24px';
        } else if (value >= 100) { // e.g., 128, 256, 512
            return isSmallScreen ? '18px' : '30px';
        } else if (value >= 10) { // e.g., 16, 32, 64
            return isSmallScreen ? '22px' : '35px';
        } else { // Single digit tiles: 2, 4, 8
            return isSmallScreen ? '26px' : '40px';
        }
    }

    // Create a tile DOM element
    function createTileElement(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        if (isNew) {
            tile.classList.add('new-tile');
            tile.addEventListener('animationend', () => tile.classList.remove('new-tile'), { once: true });
        }
        tile.style.fontSize = getResponsiveTileFontSize(value); // Use responsive font size
        tile.textContent = value;

        // Calculate position and size based on game-container and gap
        const gameContainerPadding = 10; // Must match .game-container padding in CSS
        const gap = 10; // Must match .game-container gap in CSS

        // tileContainer is the direct child of game-container, offset by padding
        // So, its offsetWidth should be game-container's width MINUS (2 * gameContainerPadding)
        // However, script.js positions tiles relative to #tile-container, which itself is offset by padding.
        // The #tile-container's effective width for tile placement is (parent_width - 2*padding_of_parent - 3*gap_between_tiles)
        // Let's use the #tile-container's actual offsetWidth for simplicity, assuming it's correctly sized by CSS.

        const containerWidth = tileContainer.offsetWidth; // This is the usable area for tiles
        const tileSize = (containerWidth - (gap * 3)) / 4;

        const top = row * (tileSize + gap);
        const left = col * (tileSize + gap);

        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.top = `${top}px`;
        tile.style.left = `${left}px`;

        tileContainer.appendChild(tile);
        return tile; // Return tile for merge animation
    }

    // Update the visual representation of the grid
    function updateGrid() {
        // Remove only tile elements, keeping grid cells
        const existingTiles = tileContainer.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        // Add new tiles based on current grid state
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] !== 0) {
                    createTileElement(row, col, grid[row][col]);
                }
            }
        }
    }

    // Move tiles in the specified direction
    function move(direction) {
        if (!canMove || gameOver || gameWon) return;

        // Clone grid to check if movement occurs
        const previousGrid = JSON.parse(JSON.stringify(grid));
        let moved = false;

        // Prevent moves during animation
        canMove = false;

        switch (direction) {
            case 'up':
                moved = moveUp();
                break;
            case 'right':
                moved = moveRight();
                break;
            case 'down':
                moved = moveDown();
                break;
            case 'left':
                moved = moveLeft();
                break;
        }

        // Update UI and check game state
        updateGrid();
        updateScore();

        // Allow moves after a brief delay for animations
        setTimeout(() => {
            // Add new tile only if grid changed
            if (moved) {
                addRandomTile();
                checkGameOver();
            }

            canMove = true;
        }, 150);
    }

    // Move tiles up
    function moveUp() {
        let moved = false;

        for (let col = 0; col < 4; col++) {
            // Compact tiles
            for (let row = 1; row < 4; row++) {
                if (grid[row][col] !== 0) {
                    let currentRow = row;

                    while (currentRow > 0 && grid[currentRow - 1][col] === 0) {
                        grid[currentRow - 1][col] = grid[currentRow][col];
                        grid[currentRow][col] = 0;
                        currentRow--;
                        moved = true;
                    }

                    // Merge tiles
                    if (currentRow > 0 && grid[currentRow - 1][col] === grid[currentRow][col]) {
                        grid[currentRow - 1][col] *= 2;
                        score += grid[currentRow - 1][col];
                        grid[currentRow][col] = 0;
                        moved = true;

                        // Check for 2048 tile
                        if (grid[currentRow - 1][col] === 2048 && !gameWon) {
                            gameWon = true;
                            showWinMessage();
                        }
                    }
                }
            }
        }

        return moved;
    }

    // Move tiles right
    function moveRight() {
        let moved = false;

        for (let row = 0; row < 4; row++) {
            // Compact tiles
            for (let col = 2; col >= 0; col--) {
                if (grid[row][col] !== 0) {
                    let currentCol = col;

                    while (currentCol < 3 && grid[row][currentCol + 1] === 0) {
                        grid[row][currentCol + 1] = grid[row][currentCol];
                        grid[row][currentCol] = 0;
                        currentCol++;
                        moved = true;
                    }

                    // Merge tiles
                    if (currentCol < 3 && grid[row][currentCol + 1] === grid[row][currentCol]) {
                        grid[row][currentCol + 1] *= 2;
                        score += grid[row][currentCol + 1];
                        grid[row][currentCol] = 0;
                        moved = true;

                        // Check for 2048 tile
                        if (grid[row][currentCol + 1] === 2048 && !gameWon) {
                            gameWon = true;
                            showWinMessage();
                        }
                    }
                }
            }
        }

        return moved;
    }

    // Move tiles down
    function moveDown() {
        let moved = false;

        for (let col = 0; col < 4; col++) {
            // Compact tiles
            for (let row = 2; row >= 0; row--) {
                if (grid[row][col] !== 0) {
                    let currentRow = row;

                    while (currentRow < 3 && grid[currentRow + 1][col] === 0) {
                        grid[currentRow + 1][col] = grid[currentRow][col];
                        grid[currentRow][col] = 0;
                        currentRow++;
                        moved = true;
                    }

                    // Merge tiles
                    if (currentRow < 3 && grid[currentRow + 1][col] === grid[currentRow][col]) {
                        grid[currentRow + 1][col] *= 2;
                        score += grid[currentRow + 1][col];
                        grid[currentRow][col] = 0;
                        moved = true;

                        // Check for 2048 tile
                        if (grid[currentRow + 1][col] === 2048 && !gameWon) {
                            gameWon = true;
                            showWinMessage();
                        }
                    }
                }
            }
        }

        return moved;
    }

    // Move tiles left
    function moveLeft() {
        let moved = false;

        for (let row = 0; row < 4; row++) {
            // Compact tiles
            for (let col = 1; col < 4; col++) {
                if (grid[row][col] !== 0) {
                    let currentCol = col;

                    while (currentCol > 0 && grid[row][currentCol - 1] === 0) {
                        grid[row][currentCol - 1] = grid[row][currentCol];
                        grid[row][currentCol] = 0;
                        currentCol--;
                        moved = true;
                    }

                    // Merge tiles
                    if (currentCol > 0 && grid[row][currentCol - 1] === grid[row][currentCol]) {
                        grid[row][currentCol - 1] *= 2;
                        score += grid[row][currentCol - 1];
                        grid[row][currentCol] = 0;
                        moved = true;

                        // Check for 2048 tile
                        if (grid[row][currentCol - 1] === 2048 && !gameWon) {
                            gameWon = true;
                            showWinMessage();
                        }
                    }
                }
            }
        }

        return moved;
    }

    // Check if any moves are possible
    function hasAvailableMoves() {
        // Check for empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) return true;
            }
        }

        // Check for possible merges
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = grid[row][col];

                // Check adjacent cells
                if ((row < 3 && grid[row + 1][col] === value) ||
                    (col < 3 && grid[row][col + 1] === value)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Check if game is over
    function checkGameOver() {
        if (!hasAvailableMoves() && !gameOver) {
            gameOver = true;
            showGameOverMessage();
        }
    }

    // Show win message
    function showWinMessage() {
        gameMessage.className = 'game-message game-won';
        gameMessage.querySelector('p').textContent = 'You Win!';
    }

    // Show game over message
    function showGameOverMessage() {
        gameMessage.className = 'game-message game-over';
        gameMessage.querySelector('p').textContent = 'Game Over!';
    }

    // Event listeners
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                move('up');
                break;
            case 'ArrowRight':
                e.preventDefault();
                move('right');
                break;
            case 'ArrowDown':
                e.preventDefault();
                move('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                move('left');
                break;
        }
    });

    retryButton.addEventListener('click', initGame);

    // Add event listener for the new game button
    document.querySelector('.new-game-button').addEventListener('click', initGame);

    // Start the game
    initGame(); // This calls updateScore(), which will call updateShareXLink()

    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (!tileContainer) return; // Make sure tileContainer exists
            updateGrid();       // Recalculate --cell-size based on new container width and gap
            updateScore();       // Redraw all tiles with new sizes and font sizes
            // console.log('Game resized');
        }, 250); // Debounce for 250ms
    });

    // Call once after initial load to ensure mobile sizes are set if starting on mobile
    // This might be redundant if initGame already does this effectively, but safe to have.
    // Ensure this runs after the DOM is fully ready and styled.
    // A small timeout can help ensure styles are applied.
    setTimeout(() => {
        if (window.innerWidth <= 767) {
            updateGrid();
            updateScore();
        }
    }, 100);

    // Listen for messages from the parent window (for keyboard controls)
    // Determine the expected origin of the parent page that embeds this iframe.
    let determinedExpectedParentOrigin = 'https://stake.fish'; // Default for production

    // Adjust for local development if the iframe itself is served from localhost or 127.0.0.1
    // This assumes the parent page will also be on a corresponding localhost origin.
    if (window.location.protocol === 'http:' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        determinedExpectedParentOrigin = window.location.origin;
    }
    // For more specific local origins, you could use a list:
    // const ALLOWED_PARENT_ORIGINS = [
    //     'https://stake.fish',
    //     'http://localhost:3000', // Example local dev server
    //     'http://127.0.0.1:3000'
    // ];

    window.addEventListener('message', function (event) {
        // Security: Always verify the origin of the message
        // if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) { // If using a list
        if (event.origin !== determinedExpectedParentOrigin) {
            console.warn(`2048 Game: Message received from unexpected origin: ${event.origin}. Expected: ${determinedExpectedParentOrigin}`);
            return;
        }

        if (event.data && event.data.type === 'sfThemeChange') { // Check for existing theme change message type
            const themeToApply = event.data.theme;
            const themeToRemove = themeToApply === 'sf-light-theme' ? 'sf-dark-theme' : 'sf-light-theme';

            document.documentElement.classList.remove(themeToRemove);
            document.documentElement.classList.add(themeToApply);
            document.body.classList.remove(themeToRemove);
            document.body.classList.add(themeToApply);

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'themeApplied', theme: themeToApply }, event.origin); // Reply to actual parent origin
            }
            return; // Theme message handled, do not process as key event
        }

        if (event.data && event.data.type === '2048-key-event' && event.data.key) {
            // console.log('2048 iframe received key event from parent:', event.data.key);

            // Check game state before moving (move() function already does this, but good for clarity)
            if (gameOver || !canMove) {
                return;
            }

            switch (event.data.key) {
                case 'ArrowUp':
                    move('up');
                    break;
                case 'ArrowDown':
                    move('down');
                    break;
                case 'ArrowLeft':
                    move('left');
                    break;
                case 'ArrowRight':
                    move('right');
                    break;
            }
        }
    });

    // Add click handler for stake button
    document.querySelector('.stake-button').addEventListener('click', function (event) {
        event.preventDefault();
        // Tell the parent window to navigate
        if (window.parent) {
            window.parent.postMessage({
                type: 'sfNavigation',
                url: 'https://stake.fish'
            }, '*');
        }
    });
}); 