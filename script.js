// Move these variables outside DOMContentLoaded to make them global
let clickCount = 0;
let lastClickTime = 0;
let confettiTriggeredCount = 0; // Track how many times confetti has been triggered

/**
 * Wait for the DOM to be fully loaded before executing any JavaScript
 * This ensures all HTML elements are available for manipulation
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add version parameter to all CSS links to prevent caching
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (!link.href.includes('?v=')) {
            link.href = link.href + '?v=' + generateCacheBuster();
        }
    });
    
    // Load marked.js for Markdown parsing if not already loaded
    if (typeof marked === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = initializeAfterDependencies;
        document.head.appendChild(script);
    } else {
        initializeAfterDependencies();
    }
    
    // Secret confetti button implementation
    const confettiScript = document.createElement('script');
    confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    document.head.appendChild(confettiScript);
    
    // Initialize click tracking moved outside setTimeout so it can be reused
    setTimeout(() => {
        setupSecretButton(); // Call the function once on page load
    }, 1000);
});

/**
 * Setup the secret button functionality
 * This function can be called after each page navigation
 */
function setupSecretButton() {
    const secretButton = document.getElementById('secret-button');
    if (!secretButton) return;
    
    // Remove any existing event listeners first (to prevent duplicates)
    const newButton = secretButton.cloneNode(true);
    secretButton.parentNode.replaceChild(newButton, secretButton);
    
    newButton.addEventListener('click', function(e) {
        const now = Date.now();
        
        // Reset counter if clicks are too slow (more than 3 seconds apart)
        if (now - lastClickTime > 3000) {
            clickCount = 0;
        }
        
        clickCount++;
        lastClickTime = now;
        
        // Check if we've reached 3 quick clicks
        if (clickCount === 3) {
            confettiTriggeredCount++;
            
            // Every third time, show explosion instead of confetti
            if (confettiTriggeredCount >= 3) {
                // Get position of the rh45 heading instead of mouse position
                const rect = newButton.getBoundingClientRect();
                const centerX = rect.left + (rect.width / 2);
                const centerY = rect.top + (rect.height / 2);
                
                // Create explosion effect centered at the heading
                createExplosion(centerX, centerY);
                
                // Reset the confetti trigger counter
                confettiTriggeredCount = 0;
            } else {
                // Regular confetti
                confetti({
                    particleCount: 300,
                    spread: 180,
                    origin: { y: 0.6 },
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
                });
            }
            
            // Reset the click counter
            clickCount = 0;
        }
    });
}

// Move createExplosion outside the DOMContentLoaded so it can be used after navigation
function createExplosion(x, y) {
    // Create explosion container
    const explosionContainer = document.createElement('div');
    explosionContainer.className = 'explosion-container';
    explosionContainer.style.position = 'fixed';
    explosionContainer.style.left = `${x}px`;
    explosionContainer.style.top = `${y}px`;
    explosionContainer.style.zIndex = '9999';
    explosionContainer.style.pointerEvents = 'none';
    
    // Create flash element
    const flash = document.createElement('div');
    flash.className = 'explosion-flash';
    document.body.appendChild(flash);
    
    // Create fireball element
    const fireball = document.createElement('div');
    fireball.className = 'fireball';
    fireball.style.position = 'absolute';
    fireball.style.left = '50%';
    fireball.style.top = '50%';
    fireball.style.transform = 'translate(-50%, -50%)';
    
    // Create smoke element
    const smoke = document.createElement('div');
    smoke.className = 'smoke';
    smoke.style.position = 'absolute';
    smoke.style.left = '50%';
    smoke.style.top = '50%';
    smoke.style.transform = 'translate(-50%, -50%)';
    
    // Add elements to container
    explosionContainer.appendChild(smoke);
    explosionContainer.appendChild(fireball);
    document.body.appendChild(explosionContainer);
    
    // Add a shaking effect to the page
    document.body.classList.add('explosion-shake');
    
    // Remove explosion elements after animation completes
    setTimeout(() => {
        document.body.classList.remove('explosion-shake');
        explosionContainer.remove();
        flash.remove();
    }, 3500); // Match this to the total animation duration
}

/**
 * Generate a cache-busting parameter based on current time
 * @returns {string} Cache-busting string
 */
function generateCacheBuster() {
    // Use timestamp for simple versioning
    return new Date().getTime().toString();
}

/**
 * Initialize the application after all dependencies are loaded
 */
function initializeAfterDependencies() {
    /**
     * Load the global header from header.html
     * Using the Fetch API to make an asynchronous request to the server
     */
    fetch('/header.html')
        .then(response => response.text()) // Convert the response to text
        .then(data => {
            // Insert the loaded header HTML into the header-container div
            document.getElementById('header-container').innerHTML = data;
            
            // After header is successfully loaded, initialize PJAX navigation
            // This ensures navigation handlers are set up after header links exist
            setupPjaxNavigation();
            highlightCurrentPage();
        });
        
    // Add loading indicator to the DOM
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    document.body.appendChild(loadingIndicator);

    // Check if current page should load markdown content
    const currentPath = window.location.pathname;
    if (currentPath === '/categories/' || currentPath === '/categories') {
        loadMarkdownContent('/content/categories.md');
    }

    // Call version checking setup
    setupVersionChecking();
}

/**
 * Loads and renders Markdown content from a local file or URL
 * @param {string} markdownPath - Path to the markdown file
 */
function loadMarkdownContent(markdownPath) {
    // Ensure Markdown CSS is loaded
    ensureMarkdownCssIsLoaded();
    
    // Add cache busting parameter to markdown URLs
    const cacheBustedPath = markdownPath.includes('?') 
        ? markdownPath + '&cb=' + generateCacheBuster()
        : markdownPath + '?cb=' + generateCacheBuster();
    
    // Show loading indicator in the markdown content area
    const contentElement = document.querySelector('.markdown-content');
    if (contentElement) {
        contentElement.innerHTML = '<h1>Loading Content</h1><p>Please wait...</p>';
    }
    
    console.log('Fetching markdown from:', cacheBustedPath);
    
    fetch(cacheBustedPath)
        .then(response => {
            console.log('Markdown fetch response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(markdown => {
            console.log('Markdown content loaded successfully, length:', markdown.length);
            
            // Configure marked.js to use GitHub-flavored Markdown
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                pedantic: false,
                smartLists: true
            });
            
            // Parse the markdown to HTML
            const html = marked.parse(markdown);
            
            // Find the content container
            if (contentElement) {
                // Replace the content
                contentElement.innerHTML = html;
                console.log('Markdown rendered to HTML');
                
                // Apply direct styling to fix common issues
                applyMarkdownStyling(contentElement);
            } else {
                // Fallback to .posts if .markdown-content doesn't exist
                const postsElement = document.querySelector('.posts');
                if (postsElement) {
                    // Create a markdown-content container to ensure styles apply
                    postsElement.innerHTML = '<div class="markdown-content">' + html + '</div>';
                    console.log('Markdown rendered to posts container (fallback)');
                    
                    // Apply direct styling to fix common issues
                    applyMarkdownStyling(document.querySelector('.markdown-content'));
                } else {
                    console.error('Content element not found for Markdown insertion');
                }
            }
        })
        .catch(error => {
            console.error('Error loading Markdown content:', error, 'Path was:', cacheBustedPath);
            if (contentElement) {
                contentElement.innerHTML = `
                    <h1>Error</h1>
                    <p>Failed to load content from: ${cacheBustedPath}</p>
                    <p>Error: ${error.message}</p>
                    <p>Please check the console for more details.</p>
                `;
            }
        });
}

/**
 * Ensures that the markdown CSS file is loaded
 */
function ensureMarkdownCssIsLoaded() {
    const markdownCssPath = '/css/markdown.css';
    
    // Check if the CSS is already loaded
    const isCssLoaded = Array.from(document.styleSheets).some(sheet => {
        return sheet.href && sheet.href.includes('markdown.css');
    });
    
    // If not loaded, add it dynamically
    if (!isCssLoaded) {
        console.log('Adding markdown CSS to document');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = markdownCssPath + '?v=' + generateCacheBuster();
        document.head.appendChild(link);
    } else {
        // Reload it with a new cache buster
        const existingLinks = document.querySelectorAll('link[href*="markdown.css"]');
        existingLinks.forEach(link => {
            const newHref = markdownCssPath + '?v=' + generateCacheBuster();
            if (link.href !== newHref) {
                link.href = newHref;
            }
        });
    }
}

/**
 * Applies critical styling directly to markdown elements as a fallback
 * @param {HTMLElement} container - The container with markdown content
 */
function applyMarkdownStyling(container) {
    if (!container) return;
    
    // Fix headings
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
        heading.style.color = '#fff';
    });
    
    // Fix bold text
    container.querySelectorAll('strong').forEach(element => {
        element.style.color = 'inherit';
    });
    
    // Fix code blocks
    container.querySelectorAll('pre').forEach(block => {
        block.style.backgroundColor = '#161b22';
        block.style.borderRadius = '6px';
        block.style.padding = '16px';
        block.style.overflow = 'auto';
        block.style.fontSize = '85%';
        block.style.lineHeight = '1.45';
        block.style.border = '1px solid #30363d';
        block.style.marginBottom = '16px';
    });
    
    // Fix inline code
    container.querySelectorAll('code:not(pre code)').forEach(code => {
        code.style.backgroundColor = 'rgba(240, 246, 252, 0.15)';
        code.style.borderRadius = '3px';
        code.style.fontSize = '85%';
        code.style.padding = '0.2em 0.4em';
    });
    
    // Fix code within pre blocks
    container.querySelectorAll('pre code').forEach(code => {
        code.style.backgroundColor = 'transparent';
        code.style.padding = '0';
        code.style.margin = '0';
        code.style.fontSize = '100%';
        code.style.whiteSpace = 'pre';
        code.style.overflow = 'visible';
    });
}

/**
 * Sets up PJAX (pushState + AJAX) navigation
 * This allows for smooth page transitions without full page reloads
 * PJAX updates only the necessary parts of the page while maintaining state
 */
function setupPjaxNavigation() {
    /**
     * Find all internal links (starting with /) in the document
     * Apply click handlers to each link to enable PJAX navigation
     */
    document.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('click', function(e) {
            // Skip PJAX for external links (different hostname)
            if (this.hostname !== window.location.hostname) return;
            
            // Prevent the default browser navigation behavior
            e.preventDefault();
            
            // Get the target URL from the link's href attribute
            const href = this.getAttribute('href');
            
            // Trigger the transition effect
            document.body.classList.add('page-transition');
            document.body.classList.add('loading');
            
            /**
             * Update the browser's address bar without refreshing the page
             * This maintains proper browser history and bookmarking
             * Parameters: state object, page title (ignored by most browsers), URL
             */
            history.pushState({}, '', href);
            
            // Short delay to ensure transition is visible
            setTimeout(() => {
                // Check if this is a Markdown page
                if (href === '/projects/' || href === '/projects') {
                    loadPage(href, true);
                } else {
                    loadPage(href, false);
                }
            }, 50);
        });
    });
    
    /**
     * Handle browser back/forward navigation
     * The popstate event fires when the user navigates browser history
     */
    window.addEventListener('popstate', function() {
        // Apply transition effect
        document.body.classList.add('page-transition');
        document.body.classList.add('loading');
        
        const currentPath = window.location.pathname;
        const isMarkdownPage = (currentPath === '/categories/' || currentPath === '/categories');
        
        // Load the page content for the current URL shown in the address bar
        setTimeout(() => {
            loadPage(currentPath, isMarkdownPage);
        }, 50);
    });
}

/**
 * Fetches and loads page content without full page refresh
 * @param {string} url - The URL of the page to load
 * @param {boolean} isMarkdownPage - Whether this page should load markdown content
 */
function loadPage(url, isMarkdownPage) {
    // Set a failsafe timeout to ensure loading state is always cleared
    const failsafeTimer = setTimeout(() => {
        document.body.classList.remove('page-transition');
        document.body.classList.remove('loading');
        console.log('Failsafe: cleared loading state');
    }, 2000);
    
    // Fetch the HTML content from the target URL
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Create a DOM parser to convert the raw HTML text into a document object
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Get the content element from the loaded page
            const newContent = doc.querySelector('.content');
            
            // Get the current content element
            const currentContent = document.querySelector('.content');
            
            // Extract the markdown URL from the original page if it exists
            let markdownUrl = null;
            const scriptTags = doc.querySelectorAll('script');
            scriptTags.forEach(script => {
                const scriptContent = script.textContent;
                if (scriptContent && scriptContent.includes('loadMarkdownContent')) {
                    const match = scriptContent.match(/loadMarkdownContent\(['"]([^'"]+)['"]\)/);
                    if (match && match[1]) {
                        markdownUrl = match[1];
                        console.log('Found markdown URL in page:', markdownUrl);
                    }
                }
            });
            
            // Replace only the inner HTML of the content area to preserve structure
            if (newContent && currentContent) {
                currentContent.innerHTML = newContent.innerHTML;
                
                // Check for markdown content on this page
                if (markdownUrl) {
                    console.log('Loading markdown from extracted URL:', markdownUrl);
                    loadMarkdownContent(markdownUrl);
                } 
                else if (isMarkdownPage || url.includes('/projects')) {
                    // Determine which markdown file to load based on the URL
                    if (url.includes('/projects')) {
                        let mdPath = 'markdown/projects.md';  // This matches the path in the HTML file
                        console.log('Loading markdown based on URL path:', mdPath);
                        loadMarkdownContent(mdPath);
                    }
                }
            } else {
                console.warn('Content elements not found', 
                             { newContentFound: !!newContent, 
                               currentContentFound: !!currentContent });
            }
            
            // Update the document title
            document.title = doc.title;
            
            // Check if we're on the home page and fix any specific structure issues
            if (url === '/' || url === '/index.html') {
                // Fix home page specific structure if needed
                const mainElement = document.querySelector('main');
                if (mainElement) {
                    // Ensure main element has correct styles for home page
                    mainElement.style.textAlign = 'center';
                }
            }
            
            // Highlight current page in navigation
            highlightCurrentPage();
            
            // Clear the failsafe timer as we've completed successfully
            clearTimeout(failsafeTimer);
            
            // Remove transition classes
            setTimeout(() => {
                document.body.classList.remove('page-transition');
                document.body.classList.remove('loading');
                
                // Reattach event listeners to new elements on the homepage
                if (url === '/' || url === '/index.html') {
                    setupSecretButton();
                }
            }, 200);
        })
        .catch(error => {
            // Log any errors that occur
            console.error('Error during page navigation:', error);
            
            // Ensure we still remove loading classes even if there's an error
            document.body.classList.remove('page-transition');
            document.body.classList.remove('loading');
            
            // Clear the failsafe timer
            clearTimeout(failsafeTimer);
        });
}

/**
 * Highlight the current page link in the navigation
 * This adds the 'active' class to the link that matches the current URL
 */
function highlightCurrentPage() {
    try {
        // Get the current path from the URL
        const currentPath = window.location.pathname;
        
        // Find all navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        
        // Loop through each link
        navLinks.forEach(link => {
            // Get the path from the link's href
            const linkPath = link.getAttribute('href');
            
            // Check if the current path matches the link's path
            if (
                (currentPath === linkPath) || 
                (currentPath === '/' && linkPath === '/') ||
                (currentPath.includes(link.getAttribute('data-page')))
            ) {
                // Add the active class to this link
                link.classList.add('active');
            } else {
                // Remove the active class from other links
                link.classList.remove('active');
            }
        });
    } catch (error) {
        console.error('Error in highlightCurrentPage:', error);
    }
}

/**
 * Set up version checking
 * Periodically checks if the site has been updated
 */
function setupVersionChecking() {
    // Create a version file for your site
    const versionUrl = '/version.txt?t=' + generateCacheBuster();
    let currentVersion = localStorage.getItem('site-version') || '0';
    
    // Check for updates every minute
    setInterval(() => {
        fetch(versionUrl)
            .then(response => response.text())
            .then(version => {
                if (version.trim() !== currentVersion && currentVersion !== '0') {
                    // Site has been updated
                    showUpdateNotification();
                }
                // Store the current version
                localStorage.setItem('site-version', version.trim());
                currentVersion = version.trim();
            })
            .catch(err => console.error('Version check failed:', err));
    }, 60000); // Check every minute
}

/**
 * Show a notification that the site has been updated
 */
function showUpdateNotification() {
    // Create notification element if it doesn't exist
    if (!document.querySelector('.update-notification')) {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-message">
                This site has been updated. <a href="javascript:location.reload(true)">Refresh</a> to see the latest version.
                <button class="close-notification">×</button>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Style the notification
        const style = document.createElement('style');
        style.textContent = `
            .update-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2bbc8a;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: slide-in 0.3s ease;
            }
            
            .update-message a {
                color: white;
                text-decoration: underline;
                margin-left: 5px;
            }
            
            .close-notification {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: 10px;
                vertical-align: middle;
            }
            
            @keyframes slide-in {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes explosion-shake {
                0% { transform: translate(0, 0) rotate(0); }
                10% { transform: translate(-5px, -5px) rotate(-1deg); }
                20% { transform: translate(5px, -5px) rotate(1deg); }
                30% { transform: translate(-5px, 5px) rotate(0); }
                40% { transform: translate(5px, 5px) rotate(1deg); }
                50% { transform: translate(-5px, -5px) rotate(-1deg); }
                60% { transform: translate(5px, -5px) rotate(0); }
                70% { transform: translate(-5px, 5px) rotate(-1deg); }
                80% { transform: translate(-5px, -5px) rotate(1deg); }
                90% { transform: translate(5px, -5px) rotate(0); }
                100% { transform: translate(0, 0) rotate(0); }
            }
            
            .explosion-shake {
                animation: explosion-shake 0.5s linear;
            }
        `;
        document.head.appendChild(style);
        
        // Add event listener to close button
        document.querySelector('.close-notification').addEventListener('click', function() {
            document.querySelector('.update-notification').remove();
        });
    }
}

// Add these styles to the existing styles section
// (in the showUpdateNotification function or in a separate CSS file)
const explosionStyles = `
    @keyframes explosion-shake {
        0% { transform: translate(0, 0) rotate(0); }
        10% { transform: translate(-10px, -10px) rotate(-2deg); }
        20% { transform: translate(10px, -10px) rotate(2deg); }
        30% { transform: translate(-10px, 10px) rotate(-1deg); }
        40% { transform: translate(10px, 10px) rotate(1deg); }
        50% { transform: translate(-5px, -5px) rotate(-0.5deg); }
        60% { transform: translate(5px, -5px) rotate(0.5deg); }
        70% { transform: translate(-2px, 2px) rotate(-0.25deg); }
        80% { transform: translate(2px, -2px) rotate(0.25deg); }
        100% { transform: translate(0, 0) rotate(0); }
    }
    
    .explosion-shake {
        animation: explosion-shake 0.8s ease-out;
    }
    
    .explosion-container {
        width: 10px;
        height: 10px;
        pointer-events: none;
    }
    
    @keyframes fireball {
        0% { 
            width: 20px;
            height: 20px;
            opacity: 0.9;
            background: radial-gradient(circle, white 0%, #ffdd00 30%, #ff5500 70%, #ff3300 100%);
            border-radius: 50% 20% 60% 30% / 30% 70% 40% 50%;
            transform: rotate(0deg) scale(1);
        }
        5% { 
            width: 80px;
            height: 80px;
            opacity: 1;
            background: radial-gradient(circle, white 0%, #ffdd00 20%, #ff5500 60%, #ff3300 100%);
            border-radius: 70% 30% 50% 20% / 20% 60% 30% 70%;
            transform: rotate(15deg) scale(1.1);
        }
        15% { 
            width: 160px;
            height: 160px;
            opacity: 1;
            background: radial-gradient(circle, white 0%, #ffdd00 15%, #ff5500 50%, #ff3300 100%);
            border-radius: 30% 60% 20% 70% / 60% 30% 70% 20%;
            transform: rotate(30deg) scale(1.2);
        }
        40% { 
            width: 220px;
            height: 220px;
            opacity: 0.8;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,221,0,0.8) 10%, rgba(255,85,0,0.7) 40%, rgba(255,51,0,0.5) 100%);
            border-radius: 40% 20% 70% 30% / 30% 60% 40% 80%;
            transform: rotate(45deg) scale(1.1);
        }
        100% { 
            width: 180px;
            height: 180px;
            opacity: 0;
            background: radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,221,0,0) 10%, rgba(255,85,0,0) 40%, rgba(255,51,0,0) 100%);
            border-radius: 50%;
            transform: rotate(60deg) scale(1);
        }
    }
    
    .fireball {
        position: absolute;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 80px 30px rgba(255,160,0,0.8);
        animation: fireball 2s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards;
        mix-blend-mode: screen;
        z-index: 10000;
    }
    
    .fireball::before, .fireball::after {
        content: "";
        position: absolute;
        background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,221,0,0.9) 20%, rgba(255,85,0,0.7) 60%, rgba(255,51,0,0.5) 100%);
        animation: spikes 1.5s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards;
        border-radius: 30% 70% 40% 60% / 60% 30% 70% 40%;
        z-index: 10001;
    }
    
    .fireball::before {
        top: -15%;
        left: 25%;
        width: 60%;
        height: 60%;
        transform: rotate(25deg);
    }
    
    .fireball::after {
        bottom: -5%;
        right: 10%;
        width: 50%;
        height: 50%;
        transform: rotate(-45deg);
    }
    
    @keyframes spikes {
        0% {
            opacity: 0;
            transform: scale(0.2) rotate(0deg);
        }
        15% {
            opacity: 1;
            transform: scale(1.3) rotate(15deg);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.8) rotate(30deg);
        }
        100% {
            opacity: 0;
            transform: scale(1) rotate(45deg);
        }
    }
    
    @keyframes smoke {
        0% { 
            width: 0px;
            height: 0px;
            opacity: 0;
            background-color: rgba(80,80,80,0.8);
            transform: translate(-50%, -50%) translateY(0);
        }
        15% { 
            width: 120px;
            height: 120px;
            opacity: 0.8;
            background-color: rgba(90,90,90,0.8);
            transform: translate(-50%, -50%) translateY(0);
        }
        50% { 
            width: 350px;
            height: 350px;
            opacity: 0.7;
            background-color: rgba(100,100,100,0.6);
            transform: translate(-50%, -50%) translateY(-50px);
        }
        100% { 
            width: 600px;
            height: 600px;
            opacity: 0;
            background-color: rgba(120,120,120,0.1);
            transform: translate(-50%, -50%) translateY(-100px);
        }
    }
    
    .smoke {
        position: absolute;
        border-radius: 40% 60% 55% 45% / 60% 40% 60% 40%;
        filter: blur(30px);
        animation: smoke 3.5s ease-out forwards;
        z-index: 9999;
        /* Remove top: 0; left: 0; as we're setting them inline */
    }
    
    @keyframes flash {
        0%, 20% { opacity: 1; }
        21%, 100% { opacity: 0; }
    }
    
    .explosion-flash {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.4);
        pointer-events: none;
        z-index: 9998;
        animation: flash 0.5s ease-out forwards;
    }
`;

// Add the explosion styles to the document
if (!document.getElementById('explosion-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'explosion-styles';
    styleElement.textContent = explosionStyles;
    document.head.appendChild(styleElement);
}