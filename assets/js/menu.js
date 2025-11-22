document.addEventListener('DOMContentLoaded', async () => {
  const menu = document.getElementById('menu');  
  if (!menu) return;

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
        group.appendChild(childEl);
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
            // Use SPA router for authenticated pages
            if (window.SPARouter && window.SPARouter.loadPage) {
              window.SPARouter.loadPage(pageName);
            } else {
              // Fallback to normal navigation if router not loaded
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

  tree.forEach(node => {
    const el = createMenuItem(node);
    menu.addItem(el);
  });
});
