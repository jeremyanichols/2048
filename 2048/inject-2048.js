(() => {
    function mountGame() {
        /* ─────────────────────────────────────────────────────────────
           1. Locate the "Connect to see your dashboard" wrapper.
              The safe selector is .max-w-\[560px\] (brackets escaped).
        ───────────────────────────────────────────────────────────── */
        const placeholder = document.getElementById('game-placeholder');
        if (!placeholder) {
            console.error('Placeholder element with id "game-placeholder" not found. Game cannot be injected.');
            return;
        }

        console.log('Found placeholder:', placeholder);
        // Log what's inside the placeholder BEFORE we change it
        // console.log('Placeholder innerHTML BEFORE change:', placeholder.innerHTML); // Can be very verbose

        placeholder.innerHTML = ''; // Clear it

        /* …and replace it with the game */
        const frame = document.createElement('iframe');
        // This path is relative to dashboard.html.
        // It expects your game's index.html to be at:
        // stakefish/stake.fish/2048/index.html
        frame.src = '2048/index.html';
        frame.title = '2048';
        frame.width = 450;
        frame.height = 550;
        frame.style.border = '3px solid green'; // Keep a visible border
        frame.style.display = 'block'; // Helps with layout
        frame.style.backgroundColor = 'lightblue'; // Makes the iframe itself very obvious if it's rendered

        placeholder.appendChild(frame);
        console.log('2048 iframe injected into #game-placeholder.');
        // Log what's inside the placeholder AFTER we change it
        // console.log('Placeholder innerHTML AFTER change:', placeholder.innerHTML); // Check if iframe is there

        // Check if the iframe is still there after a moment, in case React is very fast
        setTimeout(() => {
            if (placeholder.contains(frame)) {
                console.log('IFRAME STILL PRESENT in placeholder after 200ms.');
            } else {
                console.error('IFRAME NO LONGER in placeholder after 200ms. React likely interfered.');
                // For debugging, you could try to re-add it to see if it flashes
                // placeholder.innerHTML = ''; // Clear again
                // placeholder.appendChild(frame.cloneNode(true)); // Use a clone
                // console.log('Re-attempted iframe append after 200ms.');
            }
        }, 200);
    }

    // Try running a bit later, after other scripts might have finished,
    // including React's initial render cycle.
    function scheduleMount() {
        if (window.requestIdleCallback) {
            console.log('Scheduling mountGame with requestIdleCallback.');
            window.requestIdleCallback(mountGame, { timeout: 2000 }); // Wait until browser is idle, or max 2s
        } else {
            console.log('Scheduling mountGame with setTimeout (fallback).');
            setTimeout(mountGame, 500); // Fallback if requestIdleCallback isn't available
        }
    }

    // Ensure the DOM is ready before trying to schedule
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleMount);
    } else {
        scheduleMount();
    }
})(); 