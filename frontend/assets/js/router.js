/**
 * SPA Router
 * 
 * Handles client-side routing for authenticated pages.
 * Loads content dynamically without page reload.
 */

class SPARouter {
    constructor(autoInit = true) {
        this.currentPage = null;
        this.contentContainer = null;
        this.modalsContainer = null;
        this.pageCache = new Map();
        if (autoInit) {
            this.init();
        }
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Find or create content container
        this.contentContainer = document.querySelector('main.content');
        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        // Find or create modals container
        this.modalsContainer = document.body;

        // Load initial page based on current URL or default to dashboard
        const initialPage = this.getPageFromPath() || 'dashboard';
        this.loadPage(initialPage, false);
    }

    /**
     * Get page name from current path
     */
    getPageFromPath() {
        const path = window.location.pathname;
        const match = path.match(/\/([^\/]+)\.php$/);
        if (match) {
            const page = match[1];
            // Only return if it's an authenticated page (not login/register)
            if (page !== 'index' && page !== 'login' && page !== 'register' && page !== 'logout') {
                return page;
            }
        }
        return null;
    }

    /**
     * Load a page dynamically
     * @param {string} pageName - Name of the page to load (e.g., 'dashboard', 'customers')
     * @param {boolean} updateHistory - Whether to update browser history
     */
    async loadPage(pageName, updateHistory = true) {
        if (this.currentPage === pageName) {
            return; // Already on this page
        }

        try {
            // Show loading state
            this.showLoading();

            // Check cache first
            if (this.pageCache.has(pageName)) {
                const cached = this.pageCache.get(pageName);
                this.renderPage(cached.content, cached.modals, cached.scripts);
                this.currentPage = pageName;
                if (updateHistory) {
                    history.pushState({ page: pageName }, '', `./${pageName}.php`);
                }
                return;
            }

            // Fetch page content from API
            const response = await fetch(`./backend/pages.php?page=${pageName}`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to load page');
            }

            // Cache the page
            this.pageCache.set(pageName, {
                content: data.content,
                modals: data.modals || '',
                scripts: data.scripts || []
            });

            // Render the page
            this.renderPage(data.content, data.modals || '', data.scripts || []);
            this.currentPage = pageName;

            // Update browser history
            if (updateHistory) {
                history.pushState({ page: pageName }, '', `./${pageName}.php`);
            }

        } catch (error) {
            console.error('Error loading page:', error);
            this.showError(`Failed to load page: ${error.message}`);
        }
    }

    /**
     * Render page content
     */
    renderPage(content, modals, scripts) {
        // Update content
        if (this.contentContainer) {
            this.contentContainer.innerHTML = content;
        }

        // Remove old modals (keep header and other static elements)
        const oldModals = document.querySelectorAll('smart-window:not([data-static])');
        oldModals.forEach(modal => modal.remove());

        // Add new modals
        if (modals) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modals;
            while (tempDiv.firstChild) {
                this.modalsContainer.appendChild(tempDiv.firstChild);
            }
        }

        // Load page-specific scripts
        this.loadScripts(scripts);
    }

    /**
     * Load page-specific scripts dynamically
     */
    loadScripts(scriptPaths) {
        // Remove old page scripts
        const oldScripts = document.querySelectorAll('script[data-page-script]');
        oldScripts.forEach(script => script.remove());

        // Load new scripts
        scriptPaths.forEach(scriptPath => {
            const script = document.createElement('script');
            script.src = `./assets/js/${scriptPath}`;
            script.setAttribute('data-page-script', 'true');
            script.onload = () => {
                // Dispatch custom event for script initialization
                window.dispatchEvent(new CustomEvent('pageLoaded', { 
                    detail: { page: this.currentPage } 
                }));
            };
            document.body.appendChild(script);
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '<div class="card"><h2>Loading...</h2></div>';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="card">
                    <h2>Error</h2>
                    <p style="color: red;">${message}</p>
                </div>
            `;
        }
    }

    /**
     * Clear page cache
     */
    clearCache() {
        this.pageCache.clear();
    }
}

const router = new SPARouter(false);

window.SPARouter = router;

