document.addEventListener('DOMContentLoaded', async () => {
  // Wait for menu element to exist and be upgraded by Smart UI
  function waitForMenu(callback, maxRetries = 100, currentRetry = 0) {
    const menu = document.getElementById('menu');

    // Check if Smart UI is loaded, element exists AND is upgraded (has addItem method)
    // Also check if menu has internal structure ready (check for shadowRoot or internal elements)
    if (typeof Smart !== 'undefined' && 
        menu && 
        typeof menu.addItem === 'function' &&
        menu.isConnected) {
      // Additional check: wait a bit more to ensure internal structure is ready
      // Try to access menu's internal structure to verify it's ready
      try {
        // If menu has been upgraded and is connected, it should be ready
        // Add a small delay to ensure internal DOM is initialized
        setTimeout(() => {
          callback(menu);
        }, 100);
        return;
      } catch (e) {
        // If there's an error, continue retrying
      }
    }
    
    // Retry if not ready yet
    if (currentRetry < maxRetries) {
      setTimeout(() => {
        waitForMenu(callback, maxRetries, currentRetry + 1);
      }, 50);
    } else {
      console.error('Menu element not found or not upgraded after', maxRetries * 50, 'ms');
      console.error('Smart UI loaded:', typeof Smart !== 'undefined');
      console.error('Menu element found:', !!menu);
      if (menu) {
        console.error('Menu has addItem method:', typeof menu.addItem);
        console.error('Menu isConnected:', menu.isConnected);
      }
    }
  }
  
  waitForMenu(async (menu) => {

  async function fetchMenu() {
    try {
      const res = await fetch('./backend/menu.php?action=getMenu');
      if (!res.ok) throw new Error('Network response was not ok');
      const json = await res.json();
      return json.user_menu || [];
    } catch (err) {
      console.error('Could not load menu:', err);
      return [];
    }
  }

  function buildTree(items) {
    const map = new Map();
    const roots = [];
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });
    items.forEach(item => {
      const node = map.get(item.id);
      if (item.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(item.parent_id);
        if (parent) parent.children.push(node);
      }
    });
    roots.forEach(sortNode);
    return roots.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    function sortNode(n) {
      if (n.children) {
        n.children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        n.children.forEach(sortNode);
      }
    }
  }

  function createMenuItem(item) {
    if (item.children && item.children.length > 0) {
      const group = document.createElement('smart-menu-items-group');
      group.label = item.title;
      group.value = item.id;

      item.children.forEach(child => {
        const childEl = createMenuItem(child);
        // Wait for element to be upgraded before appending
        if (childEl) {
          group.appendChild(childEl);
        }
      });

      return group;
    } else {
      const menuItem = document.createElement('smart-menu-item');
      menuItem.label = item.title;
      menuItem.value = item.id;
      menuItem.addEventListener('click', () => {
        if (item.path) {
          // Check if it's an authenticated page (SPA route) or external page
          const path = item.path.replace('./', '').replace('/', '');
          const pageName = path.replace('.php', '');
          
          // If it's login, register, or logout, use normal navigation
          if (pageName === 'index' || pageName === 'login' || pageName === 'register' || pageName === 'logout') {
            window.location.href = item.path;
          } else {
            // Use TabManager for authenticated pages
            if (window.TabManager && window.TabManager.openTab) {
              window.TabManager.openTab(pageName, item.title);
            } else {
              // Fallback to normal navigation if TabManager not loaded
              window.location.href = item.path;
            }
          }
        }
      });
      return menuItem;
    }
  }

    const raw = await fetchMenu();
    const tree = buildTree(raw);
    
    // Verify menu is still ready before adding items
    if (!menu || typeof menu.addItem !== 'function') {
      console.error('Menu element not ready when trying to add items');
      return;
    }

    // Wait a bit more to ensure menu's internal structure is fully ready
    await new Promise(resolve => setTimeout(resolve, 150));

    // Add items one by one with small delays to avoid overwhelming the menu
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      const el = createMenuItem(node);
      
      if (!el) {
        console.warn('Failed to create menu item for:', node);
        continue;
      }

      try {
        // Wait for element to be upgraded by Smart UI before adding
        await new Promise(resolve => {
          // Use requestAnimationFrame to ensure element is ready
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                menu.addItem(el);
                resolve();
              } catch (error) {
                console.error('Error adding menu item:', error);
                // Try using appendChild as fallback
                try {
                  menu.appendChild(el);
                  resolve();
                } catch (fallbackError) {
                  console.error('Fallback appendChild also failed:', fallbackError);
                  resolve();
                }
              }
            });
          });
        });
        
        // Small delay between items
        if (i < tree.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        console.error('Error adding menu item:', error);
      }
    }
    
  });
});
