/**
 * Tab Manager
 * 
 * Manages smart-tabs integration with menu navigation.
 * Handles tab creation, selection, and persistence.
 */

class TabManager {
    constructor() {
        this.tabs = null;
        this.tabMap = new Map(); // Maps pageName -> { index, label, content, modals, scripts }
        this.storageKey = 'beornnotes_tabs_state';
        this.router = null;
        this.init();
    }

    init() {
        // Wait for DOMContentLoaded (same pattern as menu.js)
        document.addEventListener('DOMContentLoaded', () => this.setup());
    }

    /**
     * Wait for tabs element to exist and be upgraded by Smart UI
     * Checks both element existence and method availability
     */
    waitForTabsElement(callback, maxRetries = 50, currentRetry = 0) {
        const element = document.getElementById('tabs');
        
        // Check if element exists AND is upgraded (has required methods)
        if (element && 
            typeof element.insert === 'function' && 
            typeof element.select === 'function' &&
            typeof element.removeAt === 'function') {
            // Element is ready!
            callback(element);
            return;
        }
        
        // Retry if not ready yet
        if (currentRetry < maxRetries) {
            setTimeout(() => {
                this.waitForTabsElement(callback, maxRetries, currentRetry + 1);
            }, 50); // Check every 50ms
        } else {
            // Max retries reached - log error
            console.error('Tabs element not found or not upgraded after', maxRetries * 50, 'ms');
            console.error('Element found:', !!element);
            if (element) {
                console.error('Element has insert method:', typeof element.insert);
                console.error('Element has select method:', typeof element.select);
            }
        }
    }

    setup() {
        // Wait for tabs element to be ready (exists + upgraded)
        this.waitForTabsElement((tabsElement) => {
            this.tabs = tabsElement;
            
            // Verify Smart UI is loaded
            if (typeof Smart === 'undefined') {
                console.warn('Smart UI not loaded, retrying...');
                setTimeout(() => this.setup(), 100);
                return;
            }

            // Get router instance
            this.router = window.SPARouter;

            // Set up event listeners
            this.setupEventListeners();

            // Initialize with Dashboard tab
            this.initializeDashboard();
        });
    }

    setupEventListeners() {
        // Handle tab close
        this.tabs.addEventListener('close', (event) => {
            const index = event.detail.index;
            this.handleTabClose(index);
        });

        // Handle tab selection change
        this.tabs.addEventListener('change', (event) => {
            this.saveState();
        });

        // Handle tab reorder
        this.tabs.addEventListener('reorder', (event) => {
            this.updateTabMapAfterReorder();
            this.saveState();
        });
    }

    /**
     * Initialize with Dashboard tab on load
     */
    async initializeDashboard() {
        // Check if we have saved state
        const saved = localStorage.getItem(this.storageKey);
        
        if (saved) {
            // Restore state (which will include Dashboard if it was saved)
            await this.restoreState();
            
            // Ensure Dashboard exists (in case it wasn't in saved state)
            if (!this.tabMap.has('dashboard')) {
                await this.createTab('dashboard', 'Dashboard');
            }
        } else {
            // No saved state, start fresh with Dashboard
            await this.createTab('dashboard', 'Dashboard');
        }
    }

    /**
     * Find tab index by page name from our tracking map
     */
    findTabByPageName(pageName) {
        const tabData = this.tabMap.get(pageName);
        return tabData ? tabData.index : -1;
    }

    /**
     * Open or select a tab
     * @param {string} pageName - Page identifier (e.g., 'dashboard', 'customers')
     * @param {string} label - Tab label (from menu)
     */
    async openTab(pageName, label) {
        // Check if tab already exists in our map
        const existingIndex = this.findTabByPageName(pageName);
        
        if (existingIndex !== -1) {
            // Tab exists, just select it
            this.tabs.select(existingIndex);
            return;
        }

        // Tab doesn't exist, create it
        await this.createTab(pageName, label);
    }

    /**
     * Create a new tab
     */
    async createTab(pageName, label) {
        try {
            // Load page content
            const response = await fetch(`./backend/pages.php?page=${pageName}`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to load page');
            }

            // Get current tab count for insertion index
            const currentTabs = this.tabMap.size;
            const insertIndex = currentTabs;

            // Insert tab with content
            this.tabs.insert(insertIndex, {
                label: label,
                content: data.content || '<div class="card"><h2>Loading...</h2></div>'
            });

            // Set data attribute on the tab item
            // We need to wait a bit for the tab to be created
            setTimeout(() => {
                const tabItems = this.tabs.querySelectorAll('smart-tab-item');
                if (tabItems[insertIndex]) {
                    tabItems[insertIndex].setAttribute('data-page-name', pageName);
                }
            }, 50);

            // Store tab data in our map
            const tabData = {
                index: insertIndex,
                pageName: pageName,
                label: label,
                content: data.content || '',
                modals: data.modals || '',
                scripts: data.scripts || []
            };

            this.tabMap.set(pageName, tabData);

            // Inject modals into the tab content container
            if (data.modals) {
                this.injectModals(insertIndex, data.modals);
            }

            // Select the new tab
            this.tabs.select(insertIndex);

            // Load page-specific scripts
            if (data.scripts && data.scripts.length > 0) {
                this.loadTabScripts(insertIndex, data.scripts);
            }

            // Save state to localStorage
            this.saveState();

        } catch (error) {
            console.error('Error creating tab:', error);
            // Show error in a new tab
            const currentTabs = this.tabMap.size;
            this.tabs.insert(currentTabs, {
                label: label,
                content: `
                    <div class="card">
                        <h2>Error</h2>
                        <p style="color: red;">${error.message}</p>
                    </div>
                `
            });
        }
    }

    /**
     * Inject modals into tab content
     */
    injectModals(tabIndex, modalsHTML) {
        if (!modalsHTML) return;

        try {
            // Wait a bit for tab to be fully created
            setTimeout(() => {
                const tabContent = this.tabs.getTabContent(tabIndex);
                
                // Check if tabContent is a valid HTMLElement
                if (!tabContent || typeof tabContent.querySelector !== 'function') {
                    console.warn('Tab content not available for index', tabIndex);
                    return;
                }

                // Create a container for modals if it doesn't exist
                let modalsContainer = tabContent.querySelector('.tab-modals-container');
                if (!modalsContainer) {
                    modalsContainer = document.createElement('div');
                    modalsContainer.className = 'tab-modals-container';
                    modalsContainer.style.display = 'none'; // Hidden container for modals
                    tabContent.appendChild(modalsContainer);
                }

                // Inject modals
                modalsContainer.innerHTML = modalsHTML;
            }, 100); // Wait for tab to be fully created
        } catch (error) {
            console.error('Error injecting modals:', error);
        }
    }

    /**
     * Load scripts for a specific tab
     */
    loadTabScripts(tabIndex, scriptPaths) {
        // Remove old scripts for this tab
        const oldScripts = document.querySelectorAll(`script[data-tab-index="${tabIndex}"]`);
        oldScripts.forEach(script => script.remove());

        // Load new scripts
        scriptPaths.forEach(scriptPath => {
            const script = document.createElement('script');
            script.src = `./assets/js/${scriptPath}`;
            script.setAttribute('data-tab-index', tabIndex);
            script.setAttribute('data-page-script', 'true');
            document.body.appendChild(script);
        });
    }

    /**
     * Handle tab close
     */
    handleTabClose(index) {
        // Find pageName by index from our map
        let pageNameToRemove = null;
        for (const [pageName, tabData] of this.tabMap.entries()) {
            if (tabData.index === index) {
                pageNameToRemove = pageName;
                break;
            }
        }

        if (pageNameToRemove) {
            // Remove from map
            this.tabMap.delete(pageNameToRemove);

            // Remove scripts for this tab
            const scripts = document.querySelectorAll(`script[data-tab-index="${index}"]`);
            scripts.forEach(script => script.remove());

            // Update indices in map after removal
            this.updateTabMapIndices();
        }

        // Save state to localStorage
        this.saveState();
    }

    /**
     * Update tab map indices after reorder
     */
    updateTabMapAfterReorder() {
        // Get all tab items from DOM to update indices
        const tabItems = this.tabs.querySelectorAll('smart-tab-item');
        
        // Create new map with updated indices
        const newMap = new Map();
        
        tabItems.forEach((tabItem, index) => {
            const pageName = tabItem.getAttribute('data-page-name');
            if (pageName) {
                const existing = this.tabMap.get(pageName);
                if (existing) {
                    existing.index = index;
                    newMap.set(pageName, existing);
                }
            }
        });

        this.tabMap = newMap;
    }

    /**
     * Update tab map indices (after close or other operations)
     */
    updateTabMapIndices() {
        // Get all tab items from DOM
        const tabItems = this.tabs.querySelectorAll('smart-tab-item');
        const newMap = new Map();

        tabItems.forEach((tabItem, index) => {
            const pageName = tabItem.getAttribute('data-page-name');
            if (pageName) {
                const existing = this.tabMap.get(pageName);
                if (existing) {
                    existing.index = index;
                    newMap.set(pageName, existing);
                }
            }
        });

        this.tabMap = newMap;
    }

    /**
     * Save tab state to localStorage
     */
    saveState() {
        // Build state from our tabMap
        const tabs = [];
        
        // Sort by index to maintain order
        const sortedTabs = Array.from(this.tabMap.entries())
            .sort((a, b) => a[1].index - b[1].index);

        sortedTabs.forEach(([pageName, tabData]) => {
            // Get scripts for this tab
            const scripts = Array.from(document.querySelectorAll(`script[data-tab-index="${tabData.index}"]`))
                .map(script => {
                    const src = script.src;
                    const match = src.match(/\/assets\/js\/(.+)$/);
                    return match ? match[1] : '';
                })
                .filter(s => s);

            tabs.push({
                pageName: pageName,
                label: tabData.label,
                content: tabData.content,
                modals: tabData.modals || '',
                scripts: scripts.length > 0 ? scripts : (tabData.scripts || [])
            });
        });

        const state = {
            tabs: tabs,
            selectedIndex: this.tabs.selectedIndex
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving tab state:', error);
        }
    }

    /**
     * Restore tab state from localStorage
     */
    async restoreState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const state = JSON.parse(saved);
            if (!state.tabs || state.tabs.length === 0) return;

            // Clear existing tabs
            const tabItems = this.tabs.querySelectorAll('smart-tab-item');
            for (let i = tabItems.length - 1; i >= 0; i--) {
                this.tabs.removeAt(i);
            }
            this.tabMap.clear();

            // Wait for tabs to be fully cleared
            await new Promise(resolve => setTimeout(resolve, 100));

            // Restore tabs one by one (insert at end each time)
            for (let i = 0; i < state.tabs.length; i++) {
                const tabData = state.tabs[i];
                
                try {
                    // Get current tab count to insert at the end
                    const currentTabItems = this.tabs.querySelectorAll('smart-tab-item');
                    const insertIndex = currentTabItems.length;

                    // Validate tabs element is ready
                    if (!this.tabs || typeof this.tabs.insert !== 'function') {
                        console.error('Tabs element not ready for insert');
                        break;
                    }

                    // Insert tab at the end
                    this.tabs.insert(insertIndex, {
                        label: tabData.label,
                        content: tabData.content || '<div class="card"><h2>Loading...</h2></div>'
                    });

                    // Wait for tab to be created before continuing
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Set data attribute
                    const updatedTabItems = this.tabs.querySelectorAll('smart-tab-item');
                    if (updatedTabItems[insertIndex]) {
                        updatedTabItems[insertIndex].setAttribute('data-page-name', tabData.pageName);
                    }

                    // Store in map with actual index
                    this.tabMap.set(tabData.pageName, {
                        index: insertIndex,
                        pageName: tabData.pageName,
                        label: tabData.label,
                        content: tabData.content || '',
                        modals: tabData.modals || '',
                        scripts: tabData.scripts || []
                    });

                    // Inject modals (with delay)
                    if (tabData.modals) {
                        setTimeout(() => {
                            this.injectModals(insertIndex, tabData.modals);
                        }, 150);
                    }

                    // Load scripts
                    if (tabData.scripts && tabData.scripts.length > 0) {
                        this.loadTabScripts(insertIndex, tabData.scripts);
                    }
                } catch (error) {
                    console.error(`Error restoring tab ${i}:`, error);
                    // Continue with next tab even if one fails
                }
            }

            // Restore selected tab
            if (state.selectedIndex !== null && state.selectedIndex >= 0) {
                const tabItems = this.tabs.querySelectorAll('smart-tab-item');
                if (state.selectedIndex < tabItems.length) {
                    this.tabs.select(state.selectedIndex);
                }
            }

        } catch (error) {
            console.error('Error restoring tab state:', error);
        }
    }
}

// Initialize tab manager
const tabManager = new TabManager();

// Export for use in other scripts
window.TabManager = tabManager;
