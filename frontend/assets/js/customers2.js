/**
 * Customers2 Page Script
 * Loads and initializes CustomTable with data from forms and data_config tables
 * Includes search functionality for Age and Job fields with localStorage persistence
 * 
 * This script exports an initialization function that should be called
 * AFTER all dependencies (TableModule) are loaded.
 */

(function() {
    const formName = 'Customers';
    const STORAGE_KEY = 'customers2_search_filters';
    
    // Store table instance globally for search functionality
    let customers2Table = null;
    
    /**
     * Wait for container to be available in DOM
     */
    function waitForContainer() {
        return new Promise((resolve, reject) => {
            const container = document.getElementById('customers2-table');
            if (container) {
                resolve(container);
                return;
            }

            // Use MutationObserver to watch for container creation
            const observer = new MutationObserver(() => {
                const container = document.getElementById('customers2-table');
                if (container) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(container);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error('Customers2 table container not found'));
            }, 5000); // 5 seconds max
        });
    }
    
    /**
     * Get unique job values from data
     */
    function getUniqueJobs(data) {
        const jobs = new Set();
        data.forEach(row => {
            const job = row.job || row.Job || '';
            if (job && job.trim() !== '') {
                jobs.add(job.trim());
            }
        });
        return Array.from(jobs).sort();
    }
    
    /**
     * Load search filters from localStorage
     */
    function loadSearchFilters() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading search filters from localStorage:', e);
        }
        return { age: '', job: '' };
    }
    
    /**
     * Save search filters to localStorage
     */
    function saveSearchFilters(age, job) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ age, job }));
        } catch (e) {
            console.error('Error saving search filters to localStorage:', e);
        }
    }
    
    /**
     * Apply filters to table data
     */
    function applyFilters(age, job) {
        if (!customers2Table) return;
        
        // Get original data
        const originalData = customers2Table.originalData || customers2Table.options.data || [];
        
        // Filter data
        let filteredData = originalData.filter(row => {
            // Age filter
            if (age && age !== '') {
                const rowAge = row.age || row.Age || '';
                const ageNum = parseInt(age);
                const rowAgeNum = parseInt(rowAge);
                
                if (isNaN(ageNum) || isNaN(rowAgeNum) || rowAgeNum !== ageNum) {
                    return false;
                }
            }
            
            // Job filter
            if (job && job !== '') {
                const rowJob = (row.job || row.Job || '').trim();
                if (rowJob !== job.trim()) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Update table with filtered data
        customers2Table.updateData(filteredData);
        customers2Table.render();
    }
    
    /**
     * Initialize search form
     */
    function initializeSearchForm(data) {
        const ageInput = document.getElementById('age-search');
        const jobDropdown = document.getElementById('job-search');
        const searchForm = document.getElementById('customers2-search-form');
        
        if (!ageInput || !jobDropdown || !searchForm) {
            console.error('Search form elements not found');
            return;
        }
        
        // Get unique jobs and populate dropdown
        const uniqueJobs = getUniqueJobs(data);
        const jobOptions = uniqueJobs.map(job => ({ label: job, value: job }));
        
        // Wait for Smart UI to upgrade the dropdown
        function waitForSmartDropdown(callback, maxRetries = 50, currentRetry = 0) {
            if (typeof Smart !== 'undefined' && jobDropdown && typeof jobDropdown.dataSource !== 'undefined') {
                callback();
            } else if (currentRetry < maxRetries) {
                setTimeout(() => {
                    waitForSmartDropdown(callback, maxRetries, currentRetry + 1);
                }, 100);
            } else {
                console.error('Smart dropdown not available after 5 seconds');
            }
        }
        
        waitForSmartDropdown(() => {
            // Set dropdown data source
            jobDropdown.dataSource = jobOptions;
            
            // Load saved filters
            const savedFilters = loadSearchFilters();
            
            // Set age value
            if (ageInput.value !== undefined) {
                ageInput.value = savedFilters.age || '';
            } else if (typeof ageInput.setValue === 'function') {
                ageInput.setValue(savedFilters.age || '');
            }
            
            // Set job value
            if (jobDropdown.selectedValues !== undefined) {
                jobDropdown.selectedValues = savedFilters.job ? [savedFilters.job] : [];
            } else if (typeof jobDropdown.select === 'function') {
                if (savedFilters.job) {
                    jobDropdown.select(savedFilters.job);
                }
            }
            
            // Apply filters if values exist
            if (savedFilters.age || savedFilters.job) {
                setTimeout(() => {
                    applyFilters(savedFilters.age, savedFilters.job);
                }, 100);
            }
        });
        
        // Handle form submission
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get values from Smart UI components
            let age = '';
            let job = '';
            
            if (ageInput.value !== undefined) {
                age = ageInput.value || '';
            } else if (typeof ageInput.getValue === 'function') {
                age = ageInput.getValue() || '';
            }
            
            if (jobDropdown.selectedValues !== undefined) {
                job = jobDropdown.selectedValues && jobDropdown.selectedValues.length > 0 
                    ? jobDropdown.selectedValues[0] 
                    : '';
            } else if (typeof jobDropdown.getSelectedValues === 'function') {
                const selected = jobDropdown.getSelectedValues();
                job = selected && selected.length > 0 ? selected[0] : '';
            } else if (jobDropdown.selectedIndexes !== undefined && jobDropdown.selectedIndexes.length > 0) {
                const index = jobDropdown.selectedIndexes[0];
                if (jobOptions[index]) {
                    job = jobOptions[index].value;
                }
            }
            
            // Save to localStorage
            saveSearchFilters(age, job);
            
            // Apply filters
            applyFilters(age, job);
        });
    }
    
    /**
     * Initialize the table
     * This function is called by tabManager AFTER all scripts are loaded
     */
    async function initializeTable() {
        try {
            // TableModule should already be available (scripts loaded sequentially)
            // Check window.TableModule specifically (this is how it's exposed)
            if (typeof window.TableModule === 'undefined') {
                console.error('TableModule check failed:');
                console.error('- typeof window.TableModule:', typeof window.TableModule);
                console.error('- typeof TableModule:', typeof TableModule);
                throw new Error('TableModule is not available. Scripts may not have loaded correctly.');
            }
            
            // Use window.TableModule (this is how it's exposed)
            const TableModuleClass = window.TableModule;
            
            // Wait for container
            const container = await waitForContainer();
            
            // Check if already initialized
            if (container.querySelector('.table-module')) {
                return;
            }

            // Show loading message
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading table...</div>';
            
            // Fetch table data
            const response = await fetch(`./backend/table-data.php?formName=${encodeURIComponent(formName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            
            // Store formName in a variable accessible to the callback
            const currentFormName = formName;
            
            // Initialize CustomTable
            customers2Table = new TableModuleClass('customers2-table', {
                // Set form name for add modal and table name for grid_state
                formName: currentFormName,
                tableName: currentFormName, // Use formName as tableName for grid_state
                data: result.data,
                columns: result.columns,
                storageKey: `table_customers2_${currentFormName}`,
                sortable: true,
                resizable: true,
                reorderable: true,
                columnVisibility: true,
                searchable: false, // Disable default searchable since we have custom search
                striped: true,
                hover: true,
                selectable: true,
                onEdit: (rowIndex, rowData) => {
                    // Show edit modal with existing row data
                    if (customers2Table.addModal) {
                        customers2Table.addModal.show(rowData, rowIndex);
                    } else {
                        console.error('Add modal is not available');
                    }
                },
                onAdd: () => {
                    // Show add modal
                    if (customers2Table.addModal) {
                        customers2Table.addModal.show();
                    } else {
                        console.error('Add modal is not available');
                    }
                },
                onDelete: async (selectedRows, selectedData) => {
                    if (selectedRows.length === 0) {
                        return;
                    }
                    
                    // Confirm deletion
                    if (!confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`)) {
                        return;
                    }
                    
                    try {
                        // Call delete API
                        const response = await fetch('./backend/table-data.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'delete',
                                formName: currentFormName,
                                rows: selectedData
                            })
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                        }
                        
                        const result = await response.json();
                        
                        if (result.status === 'success') {
                            // Clear selected rows
                            customers2Table.selectedRows.clear();
                            
                            // Reload table data
                            const dataResponse = await fetch(`./backend/table-data.php?formName=${encodeURIComponent(currentFormName)}`);
                            if (!dataResponse.ok) {
                                throw new Error(`HTTP error! status: ${dataResponse.status}`);
                            }
                            
                            const dataResult = await dataResponse.json();
                            if (dataResult.status === 'error') {
                                throw new Error(dataResult.message);
                            }
                            
                            // Update table data
                            customers2Table.updateData(dataResult.data);
                            customers2Table.render();
                            
                            // Re-apply filters after reload
                            const savedFilters = loadSearchFilters();
                            applyFilters(savedFilters.age, savedFilters.job);
                            
                            alert(`Successfully deleted ${result.deletedCount} row(s)`);
                        } else {
                            throw new Error(result.message || 'Delete failed');
                        }
                    } catch (error) {
                        console.error('Error deleting rows:', error);
                        alert('Failed to delete rows: ' + error.message);
                    }
                }
            });
            
            customers2Table.render();
            
            // Initialize search form with data
            initializeSearchForm(result.data);
            
            // Listen for add submit event
            customers2Table.container.addEventListener('tableAddSubmit', async (e) => {
                const { rowData, fileFields, tableName } = e.detail;
                
                try {
                    // Call add API
                    const response = await fetch('./backend/table-data.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'add',
                            formName: currentFormName,
                            rowData: rowData,
                            fileFields: fileFields
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        // Reload table data
                        const dataResponse = await fetch(`./backend/table-data.php?formName=${encodeURIComponent(currentFormName)}`);
                        if (!dataResponse.ok) {
                            throw new Error(`HTTP error! status: ${dataResponse.status}`);
                        }
                        
                        const dataResult = await dataResponse.json();
                        if (dataResult.status === 'error') {
                            throw new Error(dataResult.message);
                        }
                        
                        // Update table data
                        customers2Table.updateData(dataResult.data);
                        customers2Table.render();
                        
                        // Re-apply filters after reload
                        const savedFilters = loadSearchFilters();
                        applyFilters(savedFilters.age, savedFilters.job);
                        
                        // Update job dropdown with new data
                        const uniqueJobs = getUniqueJobs(dataResult.data);
                        const jobOptions = uniqueJobs.map(job => ({ label: job, value: job }));
                        const jobDropdown = document.getElementById('job-search');
                        if (jobDropdown && jobDropdown.dataSource !== undefined) {
                            jobDropdown.dataSource = jobOptions;
                        }
                        
                        alert('Successfully added new row');
                    } else {
                        throw new Error(result.message || 'Add failed');
                    }
                } catch (error) {
                    console.error('Error adding row:', error);
                    alert('Failed to add row: ' + error.message);
                }
            });
            
            // Listen for edit submit event
            customers2Table.container.addEventListener('tableEditSubmit', async (e) => {
                const { rowData, fileFields, rowIndex, originalRowData } = e.detail;
                
                try {
                    // Call update API
                    const response = await fetch('./backend/table-data.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'update',
                            formName: currentFormName,
                            rowData: rowData,
                            rowIndex: rowIndex,
                            originalRowData: originalRowData,
                            fileFields: fileFields
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        // Reload table data
                        const dataResponse = await fetch(`./backend/table-data.php?formName=${encodeURIComponent(currentFormName)}`);
                        if (!dataResponse.ok) {
                            throw new Error(`HTTP error! status: ${dataResponse.status}`);
                        }
                        
                        const dataResult = await dataResponse.json();
                        if (dataResult.status === 'error') {
                            throw new Error(dataResult.message);
                        }
                        
                        // Update table data
                        customers2Table.updateData(dataResult.data);
                        customers2Table.render();
                        
                        // Re-apply filters after reload
                        const savedFilters = loadSearchFilters();
                        applyFilters(savedFilters.age, savedFilters.job);
                        
                        // Update job dropdown with new data
                        const uniqueJobs = getUniqueJobs(dataResult.data);
                        const jobOptions = uniqueJobs.map(job => ({ label: job, value: job }));
                        const jobDropdown = document.getElementById('job-search');
                        if (jobDropdown && jobDropdown.dataSource !== undefined) {
                            jobDropdown.dataSource = jobOptions;
                        }
                        
                        alert('Successfully updated row');
                    } else {
                        throw new Error(result.message || 'Update failed');
                    }
                } catch (error) {
                    console.error('Error updating row:', error);
                    alert('Failed to update row: ' + error.message);
                }
            });
        } catch (error) {
            console.error('Error initializing customers2 table:', error);
            const container = document.getElementById('customers2-table');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #d32f2f;">
                        <p><strong>Failed to load table</strong></p>
                        <p style="font-size: 0.9em; margin-top: 10px;">${error.message}</p>
                        <p style="font-size: 0.85em; margin-top: 10px; color: #666;">Please refresh the page or try again later.</p>
                    </div>
                `;
            }
        }
    }
    
    // Export initialization function for tabManager to call
    window.initCustomers2Table = initializeTable;
    
    // Fallback: Auto-initialize if TableModule is already available (for direct page loads)
    if (typeof TableModule !== 'undefined') {
        initializeTable();
    }
})();

