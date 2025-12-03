/**
 * Tabs Manager
 * Handles CRUD operations for saved tab configurations
 * Manages saved tab configurations in database (tabs_configurations)
 */

class TabsManager {
    constructor(tabManagerInstance) {
        this.tabManager = tabManagerInstance;
        this.modal = null;
        this.currentButton = null;
        this.configurations = [];
    }

    async show(button) {
        this.currentButton = button;
        
        // Hide all existing tabs modals first
        const allModals = document.querySelectorAll('.tabs-modal');
        allModals.forEach(modal => {
            modal.style.display = 'none';
            modal.remove();
        });
        
        // Remove existing modal if any
        const modalId = 'tabs-modal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        this.createModal(modalId);
        
        // Position modal below button
        this.positionModal(button);
        
        // Load saved configurations
        await this.loadConfigurations();
        
        // Show modal (even if loading failed, show empty state)
        this.modal.style.display = 'block';
        
        // Show dropdown immediately (like Search Patterns modal)
        const dropdown = document.getElementById(`${modalId}-dropdown`);
        if (dropdown) {
            this.renderDropdown();
        }
    }

    createModal(modalId) {
        const modalHTML = `
            <div id="${modalId}" class="tabs-modal" style="display: none;">
                <div class="tabs-modal-content">
                    <div class="tabs-modal-header">
                        <span class="tabs-modal-title">Tab Configurations</span>
                        <button type="button" class="tabs-modal-close" title="Close">×</button>
                    </div>
                    <div class="tabs-modal-body">
                        <div class="tabs-dropdown-wrapper">
                            <input type="text" 
                                   class="tabs-dropdown-input" 
                                   id="${modalId}-input"
                                   placeholder="Select or type to search..."
                                   autocomplete="off">
                            <div class="tabs-dropdown-list" id="${modalId}-dropdown"></div>
                        </div>
                        <div class="tabs-modal-actions">
                            <button type="button" class="tabs-btn tabs-btn-apply">Load</button>
                            <button type="button" class="tabs-btn tabs-btn-save">Save</button>
                            <button type="button" class="tabs-btn tabs-btn-delete">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        this.modal = document.getElementById(modalId);
        this.attachEventListeners(modalId);
    }

    positionModal(button) {
        if (!this.modal || !button) return;

        // Wait for modal to be rendered to get its dimensions
        requestAnimationFrame(() => {
            const buttonRect = button.getBoundingClientRect();
            const modalRect = this.modal.getBoundingClientRect();
            
            // Position below button, aligned to left edge
            let top = buttonRect.bottom + window.scrollY + 5;
            let left = buttonRect.left + window.scrollX;
            
            // Adjust if modal would go off screen
            if (left + modalRect.width > window.innerWidth) {
                left = window.innerWidth - modalRect.width - 10;
            }
            if (top + modalRect.height > window.innerHeight + window.scrollY) {
                top = buttonRect.top + window.scrollY - modalRect.height - 5;
            }
            
            this.modal.style.position = 'absolute';
            this.modal.style.top = `${top}px`;
            this.modal.style.zIndex = '10000';
            this.modal.style.right = '50px';
        });
    }

    attachEventListeners(modalId) {
        const input = document.getElementById(`${modalId}-input`);
        const dropdown = document.getElementById(`${modalId}-dropdown`);
        const closeBtn = this.modal.querySelector('.tabs-modal-close');
        const applyBtn = this.modal.querySelector('.tabs-btn-apply');
        const saveBtn = this.modal.querySelector('.tabs-btn-save');
        const deleteBtn = this.modal.querySelector('.tabs-btn-delete');

        // Close button
        closeBtn.addEventListener('click', () => {
            this.modal.style.display = 'none';
        });

        // Close modal on outside click (but not when clicking buttons inside)
        const handleOutsideClick = (e) => {
            if (this.modal && 
                this.modal.style.display === 'block' && 
                !this.modal.contains(e.target) && 
                !this.currentButton.contains(e.target)) {
                this.modal.style.display = 'none';
            }
        };
        document.addEventListener('click', handleOutsideClick);

        // Input typing - filter dropdown (dropdown is always visible)
        input.addEventListener('input', (e) => {
            this.filterDropdown(e.target.value);
        });

        // Input focus - ensure dropdown is visible
        input.addEventListener('focus', () => {
            dropdown.style.display = 'block';
        });

        // Close dropdown when clicking outside of input and dropdown (but not buttons)
        const closeDropdownOnOutsideClick = (e) => {
            // Check if click is outside the input and dropdown, but not on action buttons
            const actionButtons = this.modal.querySelector('.tabs-modal-actions');
            const closeBtn = this.modal.querySelector('.tabs-modal-close');
            
            // Don't close if clicking on action buttons, close button, input, or dropdown
            if (!input.contains(e.target) && 
                !dropdown.contains(e.target) && 
                !actionButtons.contains(e.target) &&
                !closeBtn.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        };

        // Use mousedown instead of click to close before other click handlers fire
        document.addEventListener('mousedown', closeDropdownOnOutsideClick);
        
        // Store the handler so we can remove it later if needed
        this._dropdownCloseHandler = closeDropdownOnOutsideClick;

        // Dropdown item click
        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.tabs-dropdown-item');
            if (item && !item.hasAttribute('data-no-select')) {
                const id = item.getAttribute('data-id');
                const name = item.getAttribute('data-name');
                if (id && name) {
                    input.value = name;
                    input.setAttribute('data-selected-id', id);
                    dropdown.style.display = 'none';
                }
            }
        });

        // Apply button
        applyBtn.addEventListener('click', () => {
            this.handleApply();
        });

        // Save button
        saveBtn.addEventListener('click', () => {
            this.handleSave();
        });

        // Delete button
        deleteBtn.addEventListener('click', () => {
            this.handleDelete();
        });
    }

    async loadConfigurations() {
        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getTabsConfigurations'
                })
            });

            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult.message) {
                        errorMessage = errorResult.message;
                    }
                } catch (e) {
                    // If response is not JSON, use default message
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            if (result.status === 'success') {
                this.configurations = result.data || [];
                // Automatically update dropdown after loading configurations
                this.renderDropdown();
            } else {
                throw new Error(result.message || 'Failed to load configurations');
            }
        } catch (error) {
            console.error('Error loading tabs configurations:', error);
            // Don't show alert if table doesn't exist - just use empty array
            if (error.message && error.message.includes('table') && error.message.includes('exist')) {
                this.configurations = [];
            } else {
                // Only show alert for other errors
                console.warn('Failed to load tab configurations:', error.message);
                this.configurations = [];
            }
            // Update dropdown even on error (to show empty state)
            this.renderDropdown();
        }
    }

    renderDropdown() {
        const dropdown = document.getElementById('tabs-modal-dropdown');
        if (!dropdown) return;

        if (this.configurations.length === 0) {
            dropdown.innerHTML = '<div class="tabs-dropdown-item" data-no-select>No saved configurations</div>';
            dropdown.style.display = 'block';
            return;
        }

        let html = '';
        this.configurations.forEach(config => {
            html += `
                <div class="tabs-dropdown-item" data-id="${config.id}" data-name="${config.name}">
                    ${this.escapeHtml(config.name)}
                </div>
            `;
        });

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }

    filterDropdown(searchTerm) {
        const dropdown = document.getElementById('tabs-modal-dropdown');
        if (!dropdown) return;

        const term = searchTerm.toLowerCase();
        const items = dropdown.querySelectorAll('.tabs-dropdown-item');
        
        items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            if (name.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async handleApply() {
        const input = document.getElementById('tabs-modal-input');
        const selectedId = input.getAttribute('data-selected-id');

        if (!selectedId) {
            alert('Please select a configuration to load');
            return;
        }

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getTabsConfiguration',
                    id: selectedId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                const tabsData = JSON.parse(result.data.data);
                
                // Restore tabs using tabManager
                if (this.tabManager && typeof this.tabManager.restoreTabsFromData === 'function') {
                    await this.tabManager.restoreTabsFromData(tabsData);
                    alert('Tabs configuration loaded successfully');
                    this.modal.style.display = 'none';
                } else {
                    throw new Error('TabManager restore method not available');
                }
            } else {
                throw new Error(result.message || 'Failed to load configuration');
            }
        } catch (error) {
            console.error('Error applying tabs configuration:', error);
            alert('Failed to load tabs configuration: ' + error.message);
        }
    }

    async handleSave() {
        const input = document.getElementById('tabs-modal-input');
        const name = input.value.trim();

        if (!name) {
            alert('Please enter a name for the tabs configuration');
            return;
        }

        // Check if name already exists
        const existingConfig = this.configurations.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existingConfig) {
            const confirmed = confirm(`A configuration with the name "${name}" already exists. Do you want to update it?`);
            if (!confirmed) {
                return;
            }
        }

        // Get current tabs state
        const currentState = this.getCurrentTabsState();

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveTabsConfiguration',
                    name: name,
                    data: JSON.stringify(currentState),
                    id: existingConfig ? existingConfig.id : null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                alert(existingConfig ? 'Configuration updated successfully' : 'Configuration saved successfully');
                await this.loadConfigurations(); // This will automatically call renderDropdown()
                input.setAttribute('data-selected-id', result.id || existingConfig.id);
            } else {
                throw new Error(result.message || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving tabs configuration:', error);
            alert('Failed to save tabs configuration: ' + error.message);
        }
    }

    async handleDelete() {
        const input = document.getElementById('tabs-modal-input');
        const selectedId = input.getAttribute('data-selected-id');

        if (!selectedId) {
            alert('Please select a configuration to delete');
            return;
        }

        const selectedConfig = this.configurations.find(c => c.id == selectedId);
        if (!selectedConfig) {
            alert('Configuration not found');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete "${selectedConfig.name}"?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteTabsConfiguration',
                    id: selectedId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                alert('Configuration deleted successfully');
                input.value = '';
                input.removeAttribute('data-selected-id');
                await this.loadConfigurations(); // This will automatically call renderDropdown()
            } else {
                throw new Error(result.message || 'Failed to delete configuration');
            }
        } catch (error) {
            console.error('Error deleting tabs configuration:', error);
            alert('Failed to delete tabs configuration: ' + error.message);
        }
    }

    getCurrentTabsState() {
        // Get current tabs state from tabManager
        if (!this.tabManager) {
            return { tabs: [], selectedIndex: 0 };
        }

        // Build state from tabManager's tabMap
        const tabs = [];
        const sortedTabs = Array.from(this.tabManager.tabMap.entries())
            .sort((a, b) => a[1].index - b[1].index);

        sortedTabs.forEach(([pageName, tabData]) => {
            tabs.push({
                pageName: pageName,
                label: tabData.label,
                content: tabData.content,
                modals: tabData.modals || '',
                scripts: tabData.scripts || [],
                styles: tabData.styles || []
            });
        });

        return {
            tabs: tabs,
            selectedIndex: this.tabManager.tabs ? this.tabManager.tabs.selectedIndex : 0
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other scripts
window.TabsManager = TabsManager;

