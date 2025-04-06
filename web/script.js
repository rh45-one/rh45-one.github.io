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
}

/**
 * Loads and renders Markdown content from a local file or URL
 * @param {string} markdownPath - Path to the markdown file
 */
function loadMarkdownContent(markdownPath) {
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
            
            // Parse the markdown to HTML
            const html = marked.parse(markdown);
            
            // Find the content container
            if (contentElement) {
                // Replace the content
                contentElement.innerHTML = html;
                console.log('Markdown rendered to HTML');
            } else {
                // Fallback to .posts if .markdown-content doesn't exist
                const postsElement = document.querySelector('.posts');
                if (postsElement) {
                    postsElement.innerHTML = html;
                    console.log('Markdown rendered to posts container (fallback)');
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
                else if (isMarkdownPage || url.includes('/projects') || url.includes('/categories')) {
                    // Determine which markdown file to load based on the URL
                    let mdPath = '/content/categories.md';
                    
                    if (url.includes('/projects')) {
                        mdPath = '/markdown/projects.md';  // This matches the path in the HTML file
                    }
                    
                    console.log('Loading markdown based on URL path:', mdPath);
                    loadMarkdownContent(mdPath);
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