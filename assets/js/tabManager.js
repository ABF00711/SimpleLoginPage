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
    waitForTabsElement(callback, maxRetries = 100, currentRetry = 0) {
        const element = document.getElementById('tabs');
        
        // Check if element exists AND is upgraded (has required methods)
        // Also check if Smart UI is loaded
        if (element && 
            typeof Smart !== 'undefined' &&
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
            console.error('Smart UI loaded:', typeof Smart !== 'undefined');
            if (element) {
                console.error('Element has insert method:', typeof element.insert);
                console.error('Element has select method:', typeof element.select);
                console.error('Element has removeAt method:', typeof element.removeAt);
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

            // Verify tabs element is still ready
            if (!this.tabs || typeof this.tabs.insert !== 'function') {
                throw new Error('Tabs element is not ready');
            }

            // Get current tab count for insertion index
            const currentTabs = this.tabMap.size;
            const insertIndex = currentTabs;

            // Insert tab with content
            try {
                this.tabs.insert(insertIndex, {
                    label: label,
                    content: data.content || '<div class="card"><h2>Loading...</h2></div>'
                });
            } catch (insertError) {
                console.error('Error inserting tab:', insertError);
                // Retry once after a short delay
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!this.tabs || typeof this.tabs.insert !== 'function') {
                    throw new Error('Tabs element still not ready after retry');
                }
                this.tabs.insert(insertIndex, {
                    label: label,
                    content: data.content || '<div class="card"><h2>Loading...</h2></div>'
                });
            }

            // Set data attribute on the tab item
            // We need to wait a bit for the tab to be created
            setTimeout(() => {
                const tabItems = this.tabs.querySelectorAll('smart-tab-item');
                if (tabItems[insertIndex]) {
                    tabItems[insertIndex].setAttribute('data-page-name', pageName);
                }
            }, 50);

            // Store tab data in our map
            // IMPORTANT: Store scripts from API response (not from DOM) to ensure all scripts are saved
            const tabData = {
                index: insertIndex,
                pageName: pageName,
                label: label,
                content: data.content || '',
                modals: data.modals || '',
                scripts: data.scripts || [], // Use scripts from API, not from DOM
                styles: data.styles || []
            };

            this.tabMap.set(pageName, tabData);
            
            // Log for debugging
            if (pageName === 'customers' && data.scripts) {
                console.log(`Saved ${data.scripts.length} scripts for customers tab:`, data.scripts);
            }

            // Inject modals into the tab content container
            if (data.modals) {
                this.injectModals(insertIndex, data.modals);
            }

            // Select the new tab
            this.tabs.select(insertIndex);

            // Load page-specific styles
            if (data.styles && data.styles.length > 0) {
                this.loadTabStyles(insertIndex, data.styles);
            }

            // Load page-specific scripts and wait for them (ensures TableModule is ready)
            if (data.scripts && data.scripts.length > 0) {
                await this.loadTabScripts(insertIndex, data.scripts);
                
                // Initialize page-specific code AFTER scripts are loaded
                if (pageName === 'customers' && typeof window.initCustomersTable === 'function') {
                    window.initCustomersTable();
                }
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
     * Load styles for a specific tab
     */
    loadTabStyles(tabIndex, stylePaths) {
        // Remove old styles for this tab
        const oldStyles = document.querySelectorAll(`link[data-tab-index="${tabIndex}"]`);
        oldStyles.forEach(style => style.remove());

        // Load new styles
        stylePaths.forEach(stylePath => {
            // Check if this style is already loaded globally (avoid duplicates)
            const existingStyle = document.querySelector(`link[href*="${stylePath}"]`);
            if (existingStyle && !existingStyle.hasAttribute('data-tab-index')) {
                // Style is already loaded globally, skip it
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            // Handle absolute paths (starting with libs/ or /)
            if (stylePath.startsWith('libs/') || stylePath.startsWith('/')) {
                link.href = `./${stylePath}`;
            } else {
                link.href = `./assets/css/${stylePath}`;
            }
            link.setAttribute('data-tab-index', tabIndex);
            link.setAttribute('data-page-style', 'true');
            document.head.appendChild(link);
        });
    }

    /**
     * Load scripts for a specific tab
     * Loads scripts SEQUENTIALLY to ensure proper execution order
     * Returns a Promise that resolves when all scripts are loaded
     */
    loadTabScripts(tabIndex, scriptPaths) {
        // Remove old scripts for this tab
        const oldScripts = document.querySelectorAll(`script[data-tab-index="${tabIndex}"]`);
        oldScripts.forEach(script => script.remove());

        if (!scriptPaths || scriptPaths.length === 0) {
            return Promise.resolve();
        }

        // Load scripts SEQUENTIALLY (one after another) to ensure proper order
        return scriptPaths.reduce((promise, scriptPath) => {
            return promise.then(() => {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    // Handle absolute paths (starting with libs/ or /)
                    if (scriptPath.startsWith('libs/') || scriptPath.startsWith('/')) {
                        script.src = `./${scriptPath}`;
                    } else {
                        script.src = `./assets/js/${scriptPath}`;
                    }
                    script.setAttribute('data-tab-index', tabIndex);
                    script.setAttribute('data-page-script', 'true');
                    
                    // Log script loading (for debugging)
                    if (scriptPath.includes('table-module.js')) {
                        console.log(`Loading table-module.js from: ${script.src}`);
                    }
                    
                    // Wait for script to load AND execute
                    script.addEventListener('load', () => {
                        // For table-module.js, verify TableModule is actually available
                        if (scriptPath.includes('table-module.js')) {
                            // The load event fires after script execution
                            // Use setTimeout(0) to ensure we're in the next event loop tick
                            setTimeout(() => {
                                // Check if TableModule is available (check window.TableModule specifically)
                                if (typeof window.TableModule !== 'undefined') {
                                    console.log('✓ TableModule loaded successfully');
                                    resolve();
                                } else {
                                    // If not available, wait a bit more (script might still be executing)
                                    const maxChecks = 20;
                                    let checkCount = 0;
                                    const checkInterval = setInterval(() => {
                                        checkCount++;
                                        if (typeof window.TableModule !== 'undefined') {
                                            clearInterval(checkInterval);
                                            console.log('✓ TableModule loaded after polling');
                                            resolve();
                                        } else if (checkCount >= maxChecks) {
                                            clearInterval(checkInterval);
                                            console.error('✗ TableModule not available after table-module.js loaded');
                                            console.error('Script src:', script.src);
                                            console.error('Script complete:', script.complete);
                                            console.error('window.TableModule:', typeof window.TableModule);
                                            reject(new Error('TableModule failed to load - window.TableModule is undefined'));
                                        }
                                    }, 50);
                                }
                            }, 0);
                        } else {
                            // For other scripts, small delay to ensure execution
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => resolve());
                            });
                        }
                    }, { once: true });
                    
                    script.addEventListener('error', (e) => {
                        console.error(`✗ Failed to load script: ${scriptPath}`, e);
                        reject(new Error(`Failed to load script: ${scriptPath}`));
                    });
                    
                    // Also listen for script execution errors
                    window.addEventListener('error', function onError(e) {
                        if (e.filename && e.filename.includes(scriptPath.split('/').pop())) {
                            console.error(`✗ Script execution error in ${scriptPath}:`, e.message);
                            window.removeEventListener('error', onError);
                            // Don't reject here - let the load handler deal with it
                        }
                    }, { once: true });
                    
                    document.body.appendChild(script);
                });
            });
        }, Promise.resolve());
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
            // Get scripts for this tab from DOM
            const scriptsFromDOM = Array.from(document.querySelectorAll(`script[data-tab-index="${tabData.index}"]`))
                .map(script => {
                    const src = script.src;
                    // Extract relative path from full URL
                    // Match both /assets/js/ and /libs/ paths
                    const assetsMatch = src.match(/\/assets\/js\/(.+)$/);
                    const libsMatch = src.match(/\/libs\/(.+)$/);
                    if (libsMatch) {
                        return `libs/${libsMatch[1]}`;
                    } else if (assetsMatch) {
                        return assetsMatch[1];
                    }
                    return '';
                })
                .filter(s => s);

            // Use scripts from DOM if available, otherwise use saved scripts
            tabs.push({
                pageName: pageName,
                label: tabData.label,
                content: tabData.content,
                modals: tabData.modals || '',
                scripts: scriptsFromDOM.length > 0 ? scriptsFromDOM : (tabData.scripts || []),
                styles: tabData.styles || []
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

            // Verify tabs element is ready before restoring
            if (!this.tabs || typeof this.tabs.insert !== 'function') {
                console.error('Tabs element not ready for restoreState');
                return;
            }

            // Additional check: verify tabs element is connected to DOM
            if (!this.tabs.isConnected || !this.tabs.parentElement) {
                console.error('Tabs element not connected to DOM in restoreState');
                return;
            }

            // Restore tabs one by one (insert at end each time)
            for (let i = 0; i < state.tabs.length; i++) {
                const tabData = state.tabs[i];
                
                try {
                    // Verify tabs element is still ready before each insert
                    if (!this.tabs || typeof this.tabs.insert !== 'function') {
                        console.error('Tabs element not ready for insert at index', i);
                        break;
                    }

                    // Additional check: verify tabs element is actually in the DOM and upgraded
                    if (!this.tabs.isConnected || !this.tabs.parentElement) {
                        console.error('Tabs element not connected to DOM at index', i);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        if (!this.tabs.isConnected) {
                            console.error('Tabs element still not connected after wait');
                            break;
                        }
                    }

                    // Get current tab count to insert at the end
                    const currentTabItems = this.tabs.querySelectorAll('smart-tab-item');
                    const insertIndex = currentTabItems.length;

                    // Insert tab at the end with error handling
                    try {
                        this.tabs.insert(insertIndex, {
                            label: tabData.label,
                            content: tabData.content || '<div class="card"><h2>Loading...</h2></div>'
                        });
                    } catch (insertError) {
                        console.error('Error inserting tab at index', i, ':', insertError);
                        // Wait a bit and retry once
                        await new Promise(resolve => setTimeout(resolve, 200));
                        if (!this.tabs || typeof this.tabs.insert !== 'function') {
                            console.error('Tabs element still not ready after retry');
                            break;
                        }
                        try {
                            this.tabs.insert(insertIndex, {
                                label: tabData.label,
                                content: tabData.content || '<div class="card"><h2>Loading...</h2></div>'
                            });
                        } catch (retryError) {
                            console.error('Error inserting tab on retry:', retryError);
                            break; // Stop restoring if retry also fails
                        }
                    }

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

                    // Load styles
                    if (tabData.styles && tabData.styles.length > 0) {
                        this.loadTabStyles(insertIndex, tabData.styles);
                    }

                    // Load scripts and WAIT for them to finish (critical for TableModule)
                    if (tabData.scripts && tabData.scripts.length > 0) {
                        console.log(`Loading ${tabData.scripts.length} scripts for ${tabData.pageName}:`, tabData.scripts);
                        try {
                            await this.loadTabScripts(insertIndex, tabData.scripts);
                            console.log(`✓ All scripts loaded for ${tabData.pageName}`);
                            
                            // Verify TableModule is available before initializing
                            if (tabData.pageName === 'customers') {
                                if (typeof window.TableModule !== 'undefined') {
                                    console.log('✓ TableModule verified before initialization');
                                    if (typeof window.initCustomersTable === 'function') {
                                        window.initCustomersTable();
                                    } else {
                                        console.error('✗ initCustomersTable function not found');
                                    }
                                } else {
                                    console.error('✗ TableModule not available after scripts loaded');
                                    console.error('Available on window:', Object.keys(window).filter(k => k.includes('Table')));
                                }
                            }
                        } catch (error) {
                            console.error(`Error loading scripts for ${tabData.pageName}:`, error);
                            // Don't initialize if scripts failed to load
                        }
                    } else {
                        console.warn(`No scripts to load for ${tabData.pageName}`);
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
