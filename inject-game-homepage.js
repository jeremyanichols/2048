(() => {
    const SCRIPT_PREFIX = "[inject-game]";
    /* ─────────────────────────────────────────────
       1. Mount the game inside the hero section
    ───────────────────────────────────────────── */
    function mountGame() {
        console.log(`${SCRIPT_PREFIX} mountGame function called.`);
        const heroSection = document.getElementById('hero');
        if (!heroSection) {
            console.error(`${SCRIPT_PREFIX} #hero section not found – aborting.`);
            return;
        }
        console.log(`${SCRIPT_PREFIX} Found #hero section:`, heroSection);

        const contentCol = heroSection.querySelector('.px-8');
        if (!contentCol) {
            console.error(`${SCRIPT_PREFIX} .px-8 content column not found inside #hero. Will try to append to #hero directly.`);
        }
        const targetElementForGame = contentCol || heroSection;
        console.log(`${SCRIPT_PREFIX} Target element for game injection:`, targetElementForGame);


        /* ── iframe element ───────────────────────── */
        const frame = document.createElement('iframe');
        frame.src = '2048/'; // Ensure this path is correct
        frame.style.opacity = '0'; // Initially hidden, will be shown after theme confirmation
        frame.title = '2048 Game';
        frame.setAttribute('allowtransparency', 'true');
        frame.setAttribute('scrolling', 'no');
        frame.style.border = 'none';
        frame.style.width = '780px';
        // Set initial height based on screen size
        function updateIframeHeight() {
            const screenHeight = window.innerHeight;
            if (screenHeight < 800) {
                frame.style.height = '1200px';
            } else if (screenHeight < 1000) {
                frame.style.height = '1000px';
            } else {
                frame.style.height = '900px';
            }
            frame.style.width = '100%';
            frame.style.maxWidth = '780px';
        }

        // Set initial height
        updateIframeHeight();

        // Update height on window resize
        window.addEventListener('resize', updateIframeHeight);

        frame.id = 'game-2048-iframe';

        // Prevent any scrolling interference from the iframe
        frame.style.overflow = 'hidden';
        frame.style.position = 'relative';

        // Create wrapper that stays in document flow
        const wrapper = document.createElement('div');
        wrapper.className = 'flex justify-center w-full mt-0 mb-4';
        wrapper.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            overflow: hidden;
            width: 100%;
            max-width: 780px;
            margin: 0 auto;
        `;
        wrapper.appendChild(frame);

        // Insert the wrapper in the normal document flow
        if (targetElementForGame) {
            console.log(`${SCRIPT_PREFIX} Prepending game wrapper to targetElementForGame:`, targetElementForGame);
            targetElementForGame.prepend(wrapper);
        } else {
            console.error(`${SCRIPT_PREFIX} Target element for game was not defined. Cannot inject game.`);
            return;
        }

        // Cleanup function
        const cleanup = () => {
            window.removeEventListener('resize', updateIframeHeight);
            wrapper.remove();
        };

        // Add cleanup to window unload
        window.addEventListener('unload', cleanup);

        // No need for scroll handlers anymore since the iframe is fixed
        // and the page will scroll normally underneath it

        console.log(`${SCRIPT_PREFIX} 2048 iframe injection attempt complete.`);

        // Verify after a short delay
        setTimeout(() => {
            if (targetElementForGame && targetElementForGame.contains(wrapper) && wrapper.contains(frame)) {
                console.log(`${SCRIPT_PREFIX} Verification: Game iframe IS present in the DOM.`);
            } else {
                console.error(`${SCRIPT_PREFIX} Verification: Game iframe IS NOT present in the DOM after injection attempt.`);
            }
        }, 100);


        // Function to send theme to iframe
        function sendThemeToIframe() {
            const parentHtml = document.documentElement;
            let currentTheme = 'sf-dark-theme'; // Default to dark
            if (parentHtml.classList.contains('light-theme')) {
                currentTheme = 'sf-light-theme';
            }

            if (frame.contentWindow) {
                frame.contentWindow.postMessage({ type: 'sfThemeChange', theme: currentTheme }, '*');
                console.log(`${SCRIPT_PREFIX} Sent theme to iframe: ${currentTheme}`);
            }
        }

        // Send theme both on load and after a short delay to ensure it's received
        frame.addEventListener('load', () => {
            console.log(`${SCRIPT_PREFIX} Game iframe loaded. Sending initial theme.`);
            sendThemeToIframe();
            // Send theme again after a short delay as backup
            setTimeout(sendThemeToIframe, 100);
        });

        // Listen for theme applied confirmation from iframe
        window.addEventListener('message', (event) => {
            if (event.source !== frame.contentWindow) {
                return;
            }

            if (event.data && event.data.type === 'themeApplied') {
                console.log(`${SCRIPT_PREFIX} Received 'themeApplied' (theme: ${event.data.theme}) from iframe. Making iframe visible.`);
                frame.style.opacity = '1';
            }
        });

        // Observe theme changes on parent page's <html> element
        const themeObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log(`${SCRIPT_PREFIX} Parent <html> class changed. Resending theme.`);
                    sendThemeToIframe(); // If iframe is visible, it will just update its theme
                    break;
                }
            }
        });

        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        // This code should run on the parent page that embeds the 2048 game iframe.

        // Assuming your 2048 game iframe has an ID, e.g., 'game-2048-iframe'.
        // If it's identified differently (e.g., by class or it's the only iframe), adjust the selector.
        const gameIframe = document.getElementById('game-2048-iframe'); // This should now find the iframe

        if (gameIframe) {
            window.addEventListener('keydown', function (event) {
                const relevantKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

                if (relevantKeys.includes(event.key)) {
                    // Prevent default page scroll for arrow keys when the game iframe is present
                    event.preventDefault();

                    if (gameIframe.contentWindow) {
                        let targetOrigin = '*'; // Default, less secure.
                        if (gameIframe.src) {
                            try {
                                // Resolve the iframe's src to an absolute URL to get its origin
                                const iframeUrl = new URL(gameIframe.src, window.location.href);
                                targetOrigin = iframeUrl.origin;
                            } catch (e) {
                                console.warn('Could not parse 2048 iframe src for origin. Defaulting to wildcard. Iframe src:', gameIframe.src);
                            }
                        }
                        // Handle cases like opaque origins (e.g., sandboxed iframes, though unlikely here)
                        if (targetOrigin === "null" || targetOrigin === "about:blank") {
                            targetOrigin = "*";
                        }


                        gameIframe.contentWindow.postMessage({
                            type: '2048-key-event',
                            key: event.key
                        }, targetOrigin);
                    }
                }
            });
            // console.log('Parent page keydown listener for 2048 game initialized.');
        } else {
            // console.warn('2048 game iframe not found. Global keydown listener for game not attached.');
        }

        // Listen for navigation requests from the iframe
        window.addEventListener('message', (event) => {
            if (event.source !== frame.contentWindow) {
                return;
            }

            if (event.data && event.data.type === 'sfNavigation') {
                window.location.href = event.data.url;
            }
        });
    }

    /* ─────────────────────────────────────────────
       2. Schedule mounting when DOM is ready
    ───────────────────────────────────────────── */
    function scheduleMount() {
        console.log(`${SCRIPT_PREFIX} scheduleMount function called. document.readyState: ${document.readyState}`);
        if ('requestIdleCallback' in window) {
            console.log(`${SCRIPT_PREFIX} Scheduling mountGame with requestIdleCallback.`);
            window.requestIdleCallback(mountGame, { timeout: 1500 });
        } else {
            console.log(`${SCRIPT_PREFIX} Scheduling mountGame with setTimeout (fallback).`);
            setTimeout(mountGame, 400);
        }
    }

    if (document.readyState === 'loading') {
        console.log(`${SCRIPT_PREFIX} DOM is loading. Adding DOMContentLoaded listener.`);
        document.addEventListener('DOMContentLoaded', scheduleMount);
    } else {
        console.log(`${SCRIPT_PREFIX} DOM already loaded or interactive. Calling scheduleMount directly.`);
        scheduleMount();
    }
})(); 