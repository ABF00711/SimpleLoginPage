/**
 * Customers Page Script
 * Loads and initializes CustomTable with data from forms and data_config tables
 * 
 * This script exports an initialization function that should be called
 * AFTER all dependencies (TableModule) are loaded.
 */

(function() {
    const formName = 'Customers';
    
    /**
     * Wait for container to be available in DOM
     */
    function waitForContainer() {
        return new Promise((resolve, reject) => {
            const container = document.getElementById('customers-table');
            if (container) {
                resolve(container);
                return;
            }

            // Use MutationObserver to watch for container creation
            const observer = new MutationObserver(() => {
                const container = document.getElementById('customers-table');
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
                reject(new Error('Customers table container not found'));
            }, 5000); // 5 seconds max
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
                console.log('Customers table already initialized');
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
            
            // Initialize CustomTable
            const customersTable = new TableModuleClass('customers-table', {
                data: result.data,
                columns: result.columns,
                storageKey: `table_customers_${formName}`,
                sortable: true,
                resizable: true,
                reorderable: true,
                columnVisibility: true,
                searchable: true,
                striped: true,
                hover: true,
                selectable: true,
                onDelete: (selectedRows, selectedData) => {
                    console.log('Delete callback called:', {
                        selectedRows: selectedRows,
                        selectedData: selectedData,
                        count: selectedRows.length
                    });
                    // TODO: Implement delete logic here
                    // Example:
                    // if (confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`)) {
                    //     // Call your delete API
                    // }
                }
            });
            
            customersTable.render();
            
            console.log('Customers table initialized:', {
                formName: result.form.formName,
                tableView: result.form.tableView,
                columns: result.columns.length,
                rows: result.data.length
            });
        } catch (error) {
            console.error('Error initializing customers table:', error);
            const container = document.getElementById('customers-table');
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
    window.initCustomersTable = initializeTable;
    
    // Fallback: Auto-initialize if TableModule is already available (for direct page loads)
    if (typeof TableModule !== 'undefined') {
        initializeTable();
    }
})();