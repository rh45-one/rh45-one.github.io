/**
 * Wait for the DOM to be fully loaded before executing any JavaScript
 * This ensures all HTML elements are available for manipulation
 */
document.addEventListener('DOMContentLoaded', function() {
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
        });
        
    // Add loading indicator to the DOM
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    document.body.appendChild(loadingIndicator);
});

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
                // Load the new page content without refreshing
                loadPage(href);
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
        
        // Load the page content for the current URL shown in the address bar
        setTimeout(() => {
            loadPage(window.location.pathname);
        }, 50);
    });
}

/**
 * Fetches and loads page content without full page refresh
 * @param {string} url - The URL of the page to load
 */
function loadPage(url) {
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
            
            // Replace only the inner HTML of the content area to preserve structure
            if (newContent && currentContent) {
                currentContent.innerHTML = newContent.innerHTML;
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