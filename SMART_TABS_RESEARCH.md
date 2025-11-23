# Smart-Tabs Component Research

## Overview
`smart-tabs` is a Smart UI component that organizes content across different screens, data sets, and other interactions. Tabs can be displayed horizontally or vertically and can be paired with components like top app bars.

## Basic Usage

```html
<smart-tabs id="tabs" reorder close-buttons>
  <smart-tab-item label="Tab 1">Content 1</smart-tab-item>
  <smart-tab-item label="Tab 2">Content 2</smart-tab-item>
</smart-tabs>
```

## Key Properties

### Tab Management
- **`closeButtons`** (boolean, default: false)
  - Controls whether close buttons are shown on tabs
  - When enabled, users can close tabs individually

- **`closeButtonMode`** (string, default: "default")
  - Controls when close buttons appear
  - Options: "default", "hover", "always", etc.

- **`reorder`** (boolean, default: false)
  - Enables drag-and-drop reordering of tabs
  - Users can rearrange tabs by dragging

- **`addNewTab`** (boolean, default: false)
  - Shows a "+" button to add new tabs
  - Triggers `onAddNewTabClick` event when clicked

### Selection & Navigation
- **`selectedIndex`** (number | null)
  - Gets/sets the currently selected tab index
  - Set to `null` to deselect all (requires `allowToggle: true`)

- **`allowToggle`** (boolean, default: false)
  - Allows deselecting tabs (setting `selectedIndex` to `null`)
  - When enabled, clicking an active tab deselects it

- **`selectionMode`** (string, default: "click")
  - How users switch between tabs
  - Options: "click", "keyboard", "swipe", etc.

### Layout & Display
- **`tabPosition`** (string, default: "top")
  - Position of the tab strip
  - Options: "top", "bottom", "left", "right"

- **`tabLayout`** (string, default: "scroll")
  - How tabs handle overflow
  - Options: "scroll", "dropDown", "wrap", "shrink"

- **`tabTextOrientation`** (string, default: "horizontal")
  - Text direction in tabs
  - Options: "horizontal", "vertical"

- **`overflow`** (string, default: "auto")
  - Scroll button behavior when tabs overflow
  - Options: "auto", "hidden", "scroll", etc.

### Content Management
- **`collapsible`** (boolean, default: false)
  - Allows collapsing/expanding content sections

- **`collapsed`** (boolean, default: false)
  - Gets/sets whether content is collapsed

- **`dataSource`** (any, default: null)
  - Data source for dynamic tab generation

## Key Methods

### Tab Manipulation
```javascript
// Add a new tab
tabs.insert(index, {
  label: "New Tab",
  content: "<div>Tab Content</div>",
  group: "groupName" // optional
});

// Remove a tab
tabs.removeAt(index);

// Select a tab
tabs.select(index);

// Update a tab
tabs.update(index, "New Label", "<div>New Content</div>");
```

### Information Retrieval
```javascript
// Get all tabs
const allTabs = tabs.getTabs();

// Get tab label
const label = tabs.getTabLabel(index);

// Get tab content element
const content = tabs.getTabContent(index);

// Ensure tab is visible (scrolls if needed)
tabs.ensureVisible(index);
```

### Content Control
```javascript
// Expand content
tabs.expand();

// Collapse content
tabs.collapse();

// Refresh tab header (useful for dynamic content)
tabs.refreshTabHeader();
```

## Events

### Selection Events
- **`onChange`** - Fired when a different tab is selected
  ```javascript
  tabs.addEventListener('change', (event) => {
    const { index, oldIndex } = event.detail;
    console.log(`Tab ${oldIndex} -> ${index}`);
  });
  ```

### Tab Management Events
- **`onClose`** - Fired when a tab is closed
  ```javascript
  tabs.addEventListener('close', (event) => {
    const { index } = event.detail;
    console.log(`Tab ${index} closed`);
  });
  ```

- **`onClosing`** - Fired before a tab closes (can be prevented)
  ```javascript
  tabs.addEventListener('closing', (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault(); // Cancel close
    }
  });
  ```

- **`onAddNewTabClick`** - Fired when "+" button is clicked
  ```javascript
  tabs.addEventListener('addNewTabClick', (event) => {
    // Add new tab logic
  });
  ```

### Drag & Drop Events
- **`onDragStart`** - Fired when dragging starts
  ```javascript
  tabs.addEventListener('dragStart', (event) => {
    const { index, label } = event.detail;
  });
  ```

- **`onDragEnd`** - Fired when dragging ends
  ```javascript
  tabs.addEventListener('dragEnd', (event) => {
    const { index, left, top } = event.detail;
  });
  ```

- **`onReorder`** - Fired when tabs are reordered
  ```javascript
  tabs.addEventListener('reorder', (event) => {
    const { index, oldIndex } = event.detail;
    // Save new order
  });
  ```

## Smart-Tab-Item Properties

Individual tab items (`smart-tab-item`) have their own properties:

- **`label`** (string) - Tab label text
- **`content`** (string | HTMLElement) - Tab content
- **`selected`** (boolean) - Whether tab is selected
- **`disabled`** (boolean) - Whether tab is disabled
- **`closeButtonHidden`** (boolean) - Hide close button for this tab
- **`index`** (number) - Tab position index

## Example: Dynamic Tab Management

```javascript
const tabs = document.getElementById('tabs');

// Add tab programmatically
function addTab(title, content) {
  const index = tabs.getTabs().length;
  tabs.insert(index, {
    label: title,
    content: content
  });
  tabs.select(index);
}

// Remove tab
function removeTab(index) {
  tabs.removeAt(index);
}

// Save tab state to localStorage
tabs.addEventListener('reorder', (event) => {
  const tabOrder = tabs.getTabs().map((tab, idx) => ({
    label: tabs.getTabLabel(idx),
    content: tabs.getTabContent(idx).innerHTML
  }));
  localStorage.setItem('tabs', JSON.stringify(tabOrder));
});

// Load tabs from localStorage
function loadTabs() {
  const saved = JSON.parse(localStorage.getItem('tabs') || '[]');
  saved.forEach(tab => {
    addTab(tab.label, tab.content);
  });
}
```

## Integration with SPA Router

For your use case, you can integrate smart-tabs with the SPA router:

```javascript
// When menu item is clicked, add/switch to tab
function openInTab(pageName, title) {
  const tabs = document.getElementById('tabs');
  const existingIndex = findTabByPage(pageName);
  
  if (existingIndex !== -1) {
    // Tab exists, just select it
    tabs.select(existingIndex);
  } else {
    // Create new tab
    router.loadPage(pageName).then(content => {
      tabs.insert(tabs.getTabs().length, {
        label: title,
        content: content
      });
      tabs.select(tabs.getTabs().length - 1);
    });
  }
}
```

## Best Practices

1. **Tab Limits**: Consider limiting the number of open tabs to prevent performance issues
2. **Memory Management**: Remove event listeners when tabs are closed
3. **State Persistence**: Save tab state to localStorage for user preferences
4. **Content Loading**: Load tab content lazily when tab is selected
5. **Close Confirmation**: Use `onClosing` event to confirm before closing tabs with unsaved changes

## CSS Styling

The component can be styled using CSS variables and classes:
- `.smart-tabs` - Main container
- `.smart-tab-item` - Individual tab
- `.smart-tab-item[selected]` - Selected tab
- `.smart-tab-item[disabled]` - Disabled tab

## Current Implementation in Your Project

You have:
```html
<smart-tab id="tabs" class="demoTabs" reorder close-buttons></smart-tab>
```

This enables:
- ✅ Tab reordering (drag & drop)
- ✅ Close buttons on tabs
- Ready for dynamic tab management

Next steps:
1. Integrate with SPA router to add tabs when menu items are clicked
2. Implement tab persistence (localStorage)
3. Handle tab close events
4. Load content dynamically into tabs

