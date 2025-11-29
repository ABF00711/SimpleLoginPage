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
            const customersTable = new TableModuleClass('customers-table', {
                // Set form name for add modal and table name for grid_state
                formName: currentFormName,
                tableName: currentFormName, // Use formName as tableName for grid_state
                data: result.data,
                columns: result.columns,
                storageKey: `table_customers_${currentFormName}`,
                sortable: true,
                resizable: true,
                reorderable: true,
                columnVisibility: true,
                searchable: true,
                striped: true,
                hover: true,
                selectable: true,
                onEdit: (rowIndex, rowData) => {
                    // Show edit modal with existing row data
                    if (customersTable.addModal) {
                        customersTable.addModal.show(rowData, rowIndex);
                    } else {
                        console.error('Add modal is not available');
                    }
                },
                onAdd: () => {
                    // Show add modal
                    if (customersTable.addModal) {
                        customersTable.addModal.show();
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
                            customersTable.selectedRows.clear();
                            
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
                            customersTable.updateData(dataResult.data);
                            customersTable.render();
                            
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
            
            customersTable.render();
            
            // Listen for add submit event
            customersTable.container.addEventListener('tableAddSubmit', async (e) => {
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
                        customersTable.updateData(dataResult.data);
                        customersTable.render();
                        
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
            customersTable.container.addEventListener('tableEditSubmit', async (e) => {
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
                        customersTable.updateData(dataResult.data);
                        customersTable.render();
                        
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