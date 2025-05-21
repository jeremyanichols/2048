(() => {
    let heroWrapperFoundAndProcessed = false;
    const SCRIPT_PREFIX = "[MY_CLEANUP_V3]"; // Updated prefix for new log version
    let observer = null;

    /* ────────────────────────────────────────────────
       NEW ➊ – helper to add spacing (or an image div) below the header
    ──────────────────────────────────────────────────*/
    const EXTRA_HEADER_MARGIN_PX = 32;       // Still used for non-fixed/sticky headers' margin-bottom

    function addExtraMarginBelowHeader() {
        const header = document.querySelector('header');
        if (!header) {
            console.warn(`${SCRIPT_PREFIX} addExtraMarginBelowHeader: <header> not found.`);
            return;
        }

        // Try to find an existing spacer div by its ID
        let graphicSpacer = document.getElementById('header-graphic-spacer');

        if (header.dataset.extraMarginApplied === '1' && graphicSpacer && graphicSpacer.previousElementSibling === header) {
            // If already processed and the correct spacer div is in place, do nothing.
            return;
        }

        // Clean up any old/orphaned spacers (could be div or img from previous versions)
        document.querySelectorAll('[data-is-header-spacer="1"]').forEach(sp => {
            if (sp.id !== 'header-graphic-spacer' || sp.previousElementSibling !== header) {
                console.log(`${SCRIPT_PREFIX} addExtraMarginBelowHeader: Removing old/orphaned spacer:`, sp);
                sp.remove();
                if (sp.id === 'header-graphic-spacer') graphicSpacer = null; // Nullify if we removed our target
            }
        });
        // Re-fetch in case it was removed and re-added by another process, or ensure it's null
        graphicSpacer = document.getElementById('header-graphic-spacer');


        const headerPos = getComputedStyle(header).position;

        if (headerPos === 'fixed' || headerPos === 'sticky') {
            // If the correct spacer div isn't there or is misplaced, create/re-place it.
            if (!graphicSpacer || graphicSpacer.previousElementSibling !== header) {
                if (graphicSpacer) graphicSpacer.remove(); // Remove if misplaced

                graphicSpacer = document.createElement('div');
                graphicSpacer.id = 'header-graphic-spacer';
                graphicSpacer.dataset.isHeaderSpacer = '1'; // For the observer to find it
                // All styling (height, background-image, etc.) will be handled by CSS in index.html
                header.after(graphicSpacer);
                console.log(`${SCRIPT_PREFIX} addExtraMarginBelowHeader: Ensured DIV spacer (#header-graphic-spacer) is after ${headerPos} header.`);
            }
        } else {
            // For non-fixed/sticky headers, remove the graphic spacer if it exists
            // and apply margin-bottom to the header itself.
            if (graphicSpacer) {
                graphicSpacer.remove();
                console.log(`${SCRIPT_PREFIX} addExtraMarginBelowHeader: Removed #header-graphic-spacer for non-fixed header.`);
            }
            header.style.marginBottom = `${EXTRA_HEADER_MARGIN_PX}px`;
            console.log(`${SCRIPT_PREFIX} addExtraMarginBelowHeader: applied ${EXTRA_HEADER_MARGIN_PX}px margin-bottom to non-fixed <header>.`);
        }

        header.dataset.extraMarginApplied = '1';
    }

    /**
     * Removes the "Other networks" button that lives inside #hero.
     * We identify it by its href="#networks".
     */
    function removeOtherNetworksButton(heroSection) {
        const btn = heroSection?.querySelector('a[href="#networks"]');
        if (btn) {
            console.log(`${SCRIPT_PREFIX} removeOtherNetworksButton: deleting`, btn);
            btn.remove();
        }
    }

    function findHeroWrapperInMain(mainElement) {
        const heroSection = document.getElementById('hero');
        if (!heroSection) {
            console.warn(`${SCRIPT_PREFIX} findHeroWrapperInMain: #hero section not found.`);
            return null;
        }

        // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: Initial mainElement:`, mainElement);
        // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: heroSection found:`, heroSection);

        if (!document.body.contains(mainElement)) {
            console.warn(`${SCRIPT_PREFIX} findHeroWrapperInMain: The passed mainElement is detached from DOM. Re-querying.`);
            mainElement = document.querySelector('main');
            if (!mainElement) {
                console.error(`${SCRIPT_PREFIX} findHeroWrapperInMain: Failed to re-query <main> element.`);
                return null;
            }
            // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: Re-queried mainElement:`, mainElement);
        }

        if (!mainElement.contains(heroSection)) {
            console.warn(`${SCRIPT_PREFIX} findHeroWrapperInMain: mainElement DOES NOT CONTAIN heroSection. This is a major issue.`);
            let path = [];
            let el = heroSection;
            while (el && el !== document.body.parentElement) {
                path.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.toString().split(' ')[0] : ''));
                el = el.parentElement;
            }
            console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: Path from heroSection to root: ${path.join(' <- ')}`);
            console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: mainElement's parent:`, mainElement.parentElement);
            return null;
        } else {
            // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: mainElement CONTAINS heroSection.`);
        }

        let currentElement = heroSection;
        let iterations = 0;
        const maxIterations = 10;

        while (currentElement && currentElement.parentElement && iterations < maxIterations) {
            iterations++;
            if (currentElement.parentElement === mainElement) {
                // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: Found hero wrapper (direct child of main):`, currentElement, `after ${iterations} iteration(s).`);
                return currentElement;
            }
            currentElement = currentElement.parentElement;
            if (currentElement === document.body || currentElement === mainElement.parentElement || !mainElement.contains(currentElement)) {
                break;
            }
        }

        if (heroSection.parentElement === mainElement) {
            // console.log(`${SCRIPT_PREFIX} findHeroWrapperInMain: Hero section itself is a direct child of main. Returning heroSection as its own wrapper.`);
            return heroSection; // Treat heroSection itself as the "container" if it's a direct child
        }

        console.warn(`${SCRIPT_PREFIX} findHeroWrapperInMain: Hero section's container not found as a direct child of <main> after ${iterations} iterations. Last currentElement:`, currentElement);
        return null;
    }

    function performCleanup(mainElement, isInitialRun = false) {
        if (!mainElement || !document.body.contains(mainElement)) {
            console.warn(`${SCRIPT_PREFIX} performCleanup: mainElement is invalid or detached. Re-querying.`);
            mainElement = document.querySelector('main');
            if (!mainElement) {
                console.error(`${SCRIPT_PREFIX} performCleanup: Could not re-find main element. Aborting cleanup.`);
                return;
            }
            console.log(`${SCRIPT_PREFIX} performCleanup: Re-found main element.`);
        }

        const heroSection = document.getElementById('hero');
        if (!heroSection) {
            console.warn(`${SCRIPT_PREFIX} performCleanup: #hero section not found. Aborting for this attempt.`);
            return;
        }
        console.log(`${SCRIPT_PREFIX} performCleanup: Found #hero:`, heroSection);

        // Remove the "Other networks" button
        removeOtherNetworksButton(heroSection);

        // Remove the chevron and caption text/image
        removeChevronAndCaption(heroSection);

        // Add margin under header
        addExtraMarginBelowHeader();

        const heroContainerDiv = findHeroWrapperInMain(mainElement);

        if (!heroContainerDiv) {
            if (isInitialRun || !heroWrapperFoundAndProcessed) {
                console.warn(`${SCRIPT_PREFIX} performCleanup: Could not find the hero container div in <main>. Cleanup aborted for this attempt.`);
            }
            return;
        }

        if (!heroWrapperFoundAndProcessed || isInitialRun) {
            console.log(`${SCRIPT_PREFIX} performCleanup: Identified hero container div (direct child of main or #hero itself if direct child):`, heroContainerDiv);
        }

        // Ensure heroSection is still valid and part of heroContainerDiv (unless heroContainerDiv IS heroSection)
        if (heroContainerDiv !== heroSection && !heroContainerDiv.contains(heroSection)) {
            console.error(`${SCRIPT_PREFIX} performCleanup: Critical: heroSection is not inside identified heroContainerDiv. Aborting. heroSection parent:`, heroSection.parentElement);
            return;
        }

        console.log(`${SCRIPT_PREFIX} performCleanup: Starting removal phase. heroSection:`, heroSection, "heroContainerDiv:", heroContainerDiv);

        // 1. Clean up elements *inside* the heroContainerDiv, that come *after* the actual heroSection
        // This applies if heroContainerDiv is a PARENT of heroSection
        let removedInsideCount = 0;
        if (heroContainerDiv !== heroSection) {
            let currentSiblingInContainer = heroSection.nextElementSibling;
            console.log(`${SCRIPT_PREFIX} performCleanup: Initial nextElementSibling of heroSection (for inner cleanup):`, currentSiblingInContainer);

            while (currentSiblingInContainer) {
                const childToRemove = currentSiblingInContainer;
                currentSiblingInContainer = currentSiblingInContainer.nextElementSibling;

                if (childToRemove.parentElement === heroContainerDiv) {
                    console.log(`${SCRIPT_PREFIX} performCleanup: Removing element INSIDE hero container (after #hero):`, childToRemove.id || childToRemove.tagName, childToRemove.className?.substring(0, 50));
                    heroContainerDiv.removeChild(childToRemove);
                    removedInsideCount++;
                } else {
                    console.warn(`${SCRIPT_PREFIX} performCleanup: Element ${childToRemove.id || childToRemove.tagName} is not a direct child of heroContainerDiv. Parent is ${childToRemove.parentElement}. Stopping inner cleanup.`);
                    break;
                }
            }
            if (removedInsideCount > 0) {
                console.log(`${SCRIPT_PREFIX} performCleanup: Removed ${removedInsideCount} element(s) from inside hero container (after #hero).`);
            } else {
                console.log(`${SCRIPT_PREFIX} performCleanup: No elements found/removed inside hero container after #hero.`);
            }
        } else {
            console.log(`${SCRIPT_PREFIX} performCleanup: heroContainerDiv is heroSection itself, skipping inner cleanup.`);
        }


        // 2. Remove any sections *after* the heroContainerDiv that are direct children of main
        let nextMainSibling = heroContainerDiv.nextElementSibling;
        let removedAfterContainerCount = 0;
        console.log(`${SCRIPT_PREFIX} performCleanup: Initial nextElementSibling of heroContainerDiv (for outer cleanup in main):`, nextMainSibling);

        while (nextMainSibling) {
            const mainSiblingToRemove = nextMainSibling;
            nextMainSibling = nextMainSibling.nextElementSibling;

            if (mainSiblingToRemove.parentElement === mainElement) {
                console.log(`${SCRIPT_PREFIX} performCleanup: Removing element AFTER hero container (sibling in main):`, mainSiblingToRemove.id || mainSiblingToRemove.tagName, mainSiblingToRemove.className?.substring(0, 50));
                mainElement.removeChild(mainSiblingToRemove);
                removedAfterContainerCount++;
            } else {
                console.warn(`${SCRIPT_PREFIX} performCleanup: Element ${mainSiblingToRemove.id || mainSiblingToRemove.tagName} is not a direct child of <main>. Parent is ${mainSiblingToRemove.parentElement}. Stopping outer cleanup.`);
                break;
            }
        }
        if (removedAfterContainerCount > 0) {
            console.log(`${SCRIPT_PREFIX} performCleanup: Removed ${removedAfterContainerCount} element(s) after hero container (siblings in main).`);
        } else {
            console.log(`${SCRIPT_PREFIX} performCleanup: No elements found/removed after hero container in main.`);
        }

        heroWrapperFoundAndProcessed = true;
    }

    function observeMain(mainElementToObserve) {
        if (observer) {
            observer.disconnect();
            // console.log(`${SCRIPT_PREFIX} observeMain: Disconnected existing MutationObserver.`);
        }
        if (!mainElementToObserve || !document.body.contains(mainElementToObserve)) {
            console.warn(`${SCRIPT_PREFIX} observeMain: mainElementToObserve is invalid or detached. Cannot observe.`);
            return;
        }

        observer = new MutationObserver((mutationsList) => {
            let relevantChangeDetected = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    relevantChangeDetected = true;
                    // console.log(`${SCRIPT_PREFIX} MutationObserver: Detected added nodes. First added node:`, mutation.addedNodes[0]);
                    // mutation.addedNodes.forEach(node => {
                    //     if (node.nodeType === Node.ELEMENT_NODE) {
                    //         console.log(`${SCRIPT_PREFIX} MutationObserver: Added node: <${node.tagName} id="${node.id}" class="${node.className?.substring(0,50)}"> to parent:`, node.parentElement);
                    //     }
                    // });
                    break;
                }
            }

            if (relevantChangeDetected) {
                console.log(`${SCRIPT_PREFIX} MutationObserver: Relevant nodes added to <main> or its subtree, re-running cleanup.`);
                const currentMain = document.querySelector('main');
                if (currentMain) {
                    performCleanup(currentMain);
                } else {
                    console.error(`${SCRIPT_PREFIX} MutationObserver: <main> not found for re-cleanup.`);
                }
            }
        });

        observer.observe(mainElementToObserve, { childList: true, subtree: true });
        console.log(`${SCRIPT_PREFIX} observeMain: MutationObserver is now watching <main> and its subtree.`);
    }

    /* ────────────────────────────────────────────────
       ➋ NEW – observer that keeps the spacing alive
   ────────────────────────────────────────────────── */
    function observeHeaderSpacing() {
        /* run once right now */
        addExtraMarginBelowHeader();

        /* watch for future header or spacer changes */
        const headerWatcher = new MutationObserver(() => {
            /* Re-apply if:
               – the current header has no data-flag
               – OR the spacer is missing                         */
            const header = document.querySelector('header');
            // Ensure we are looking for the correct spacer type (div with the specific ID or dataset)
            const spacer = document.querySelector('div#header-graphic-spacer[data-is-header-spacer="1"]');

            if (!header) return;

            const headerPos = getComputedStyle(header).position;
            if (headerPos === 'fixed' || headerPos === 'sticky') {
                if (header.dataset.extraMarginApplied !== '1' || !spacer || spacer.previousElementSibling !== header) {
                    addExtraMarginBelowHeader();
                }
            } else { // For non-fixed/sticky headers, the logic in addExtraMarginBelowHeader handles applying margin.
                if (header.dataset.extraMarginApplied !== '1' || (spacer && spacer.previousElementSibling === header)) { // if spacer exists for non-fixed, it should be removed
                    addExtraMarginBelowHeader();
                }
            }
        });

        headerWatcher.observe(document.body, { childList: true, subtree: true });
        console.log(`${SCRIPT_PREFIX} observeHeaderSpacing: now watching for header changes.`);
    }

    /* ────────────────────────────────────────────────
       ➌ init – call the new observer once the page loads
   ────────────────────────────────────────────────── */
    function initCleanup() {
        const mainElement = document.querySelector('main');
        if (mainElement) {
            console.log(`${SCRIPT_PREFIX} initCleanup: <main> element found. Performing initial cleanup and setting up observers.`);
            performCleanup(mainElement, true);
            observeMain(mainElement);          // existing <main> observer
            observeHeaderSpacing();            // 🔸 NEW 🔸
        } else {
            console.warn(`${SCRIPT_PREFIX} initCleanup: <main> element not found on initial try. Will retry.`);
            setTimeout(initCleanup, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCleanup);
    } else {
        initCleanup();
    }

    window.addEventListener('load', () => {
        console.log(`${SCRIPT_PREFIX} Window loaded event. Ensuring cleanup runs.`);
        const currentMain = document.querySelector('main');
        if (currentMain) {
            performCleanup(currentMain);
            if (!observer) { // If observer wasn't set up for some reason
                observeMain(currentMain);
            }
        } else {
            console.warn(`${SCRIPT_PREFIX} Window load: <main> not found. initCleanup should handle or have handled this.`);
        }
    });

    // Fallback checks, just in case
    setTimeout(() => {
        const currentMain = document.querySelector('main');
        if (currentMain) performCleanup(currentMain);
    }, 3000);
    setTimeout(() => {
        const currentMain = document.querySelector('main');
        if (currentMain) performCleanup(currentMain);
    }, 6000);

    /**
     * Removes the chevron down icon and the astronaut caption text from the hero section
     */
    function removeChevronAndCaption(heroSection) {
        if (!heroSection) {
            console.warn(`${SCRIPT_PREFIX} removeChevronAndCaption: heroSection is null or undefined.`);
            return;
        }

        // Remove the chevron down icon
        const chevron = heroSection.querySelector('.icon--chevronDown');
        if (chevron) {
            // Find the closest meaningful parent to remove (usually a button or div)
            const chevronParent = chevron.closest('button') || chevron.closest('div');
            if (chevronParent) {
                console.log(`${SCRIPT_PREFIX} removeChevronAndCaption: removing chevron and its parent:`, chevronParent);
                chevronParent.remove();
            } else {
                console.log(`${SCRIPT_PREFIX} removeChevronAndCaption: removing chevron directly:`, chevron);
                chevron.remove();
            }
        } else {
            console.log(`${SCRIPT_PREFIX} removeChevronAndCaption: chevron not found.`);
        }

        // Remove the astronaut caption text/image
        const caption = heroSection.querySelector('.opacity-50.flounder\\:opacity-100.absolute');
        if (caption) {
            console.log(`${SCRIPT_PREFIX} removeChevronAndCaption: removing caption:`, caption);
            caption.remove();
        } else {
            console.log(`${SCRIPT_PREFIX} removeChevronAndCaption: caption not found.`);
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        /* Hide the original stake button */
        .group\\/button.inline-flex.items-center.font-semibold.whitespace-nowrap.rounded-0.font-mono.text-backgroundInverseOnDefault.bg-backgroundInverseDefault.\\!bg-neutral100.\\!text-neutral0 {
            display: none !important;
        }

        /* Hide the ETH staked text */
        .font-mono.leading-tight.text-\\[14px\\].font-semibold.max-w-\\[150px\\].flounder\\:max-w-full {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

})();