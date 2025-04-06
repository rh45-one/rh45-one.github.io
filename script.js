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
    
    // Initialize click tracking
    let clickCount = 0;
    let lastClickTime = 0;
    
    // Find the h1 element after header is loaded
    setTimeout(() => {
        const secretButton = document.getElementById('secret-button');
        if (!secretButton) return;
        
        secretButton.addEventListener('click', function(e) {
            const now = Date.now();
            
            // Reset counter if clicks are too slow (more than 3 seconds apart)
            if (now - lastClickTime > 3000) {
                clickCount = 0;
            }
            
            clickCount++;
            lastClickTime = now;
            
            // Check if we've reached 10 quick clicks
            if (clickCount === 5) {
                // Explosion of confetti!
                confetti({
                    particleCount: 300,
                    spread: 180,
                    origin: { y: 0.6 },
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
                });
                
                // Reset the counter
                clickCount = 0;
            }
        });
    }, 1000);
});

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
        `;
        document.head.appendChild(style);
        
        // Add event listener to close button
        document.querySelector('.close-notification').addEventListener('click', function() {
            document.querySelector('.update-notification').remove();
        });
    }
}