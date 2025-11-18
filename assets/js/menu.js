// Build a hierarchical header menu with expandable parent items (nested menus)
document.addEventListener('DOMContentLoaded', async () => {
  const menuContainer = document.querySelector('.header-menu');
  if (!menuContainer) return;

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

    // Create nodes
    items.forEach(item => {
      map.set(item.id, {
        ...item,
        children: []
      });
    });

    // Build parent-child relationships
    items.forEach(item => {
      const node = map.get(item.id);
      if (item.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(item.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Sort children by sort field
    roots.forEach(root => {
      sortBySort(root);
    });

    return roots.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  function sortBySort(node) {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      node.children.forEach(child => sortBySort(child));
    }
  }

  function renderMenu(tree) {
    menuContainer.innerHTML = '';
    const nav = document.createElement('nav');
    nav.className = 'header-nav';
    const ul = document.createElement('ul');
    ul.className = 'header-nav-list';

    tree.forEach((item, idx) => {
      const li = renderMenuItem(item, idx === 0);
      ul.appendChild(li);
    });

    nav.appendChild(ul);
    menuContainer.appendChild(nav);
  }

  function renderMenuItem(item, isFirst = false) {
    const li = document.createElement('li');
    li.className = 'menu-item';

    if (item.children && item.children.length > 0) {
      // Parent menu item (expandable)
      li.className += ' menu-item-parent';
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'menu-link menu-parent-link';
      link.textContent = item.title;

      const chevron = document.createElement('span');
      chevron.className = 'menu-chevron';
      chevron.textContent = '▼';
      link.appendChild(chevron);

      const submenu = document.createElement('ul');
      submenu.className = 'submenu';

      item.children.forEach(child => {
        const childLi = document.createElement('li');
        childLi.className = 'menu-item submenu-item';
        const childLink = document.createElement('a');
        childLink.href = child.path || '#';
        childLink.className = 'menu-link submenu-link';
        childLink.textContent = child.title;
        childLi.appendChild(childLink);
        submenu.appendChild(childLi);

        childLink.addEventListener('click', (e) => {
          e.preventDefault();
          setActive(childLink);
          if (child.path) window.location.href = child.path;
        });
      });

      link.addEventListener('click', (e) => {
        e.preventDefault();
        li.classList.toggle('expanded');
      });

      if (isFirst) {
        li.classList.add('expanded');
        link.classList.add('active');
      }

      li.appendChild(link);
      li.appendChild(submenu);
    } else {
      // Leaf menu item (no children)
      const link = document.createElement('a');
      link.href = item.path || '#';
      link.className = 'menu-link';
      link.textContent = item.title;

      if (isFirst) link.classList.add('active');

      link.addEventListener('click', (e) => {
        e.preventDefault();
        setActive(link);
        if (item.path) window.location.href = item.path;
      });

      li.appendChild(link);
    }

    return li;
  }

  function setActive(el) {
    document.querySelectorAll('.header-menu .menu-link').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
  }

  const raw = await fetchMenu();
  const tree = buildTree(raw.length ? raw : [
    { id: 1, title: 'Home', path: '/', parent_id: null, sort: 1 }
  ]);

  renderMenu(tree);
});
