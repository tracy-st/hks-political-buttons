const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

createApp({
  setup() {
    // Theme management
    const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');

    // Workspace background management
    const isWorkspaceDark = ref(localStorage.getItem('workspaceDark') === 'true');

    // Data
    const images = ref([]);
    const loading = ref(true);
    const error = ref('');

    // Workspace
    const workspaceItems = ref([]);
    const zoom = ref(0.2);
    const panX = ref(0);
    const panY = ref(0);

    // Workspace persistence
    const hasSavedWorkspace = ref(localStorage.getItem('savedWorkspace') !== null);

    // UI State
    const sidebarCollapsed = ref(false);
    const isFullscreen = ref(false);
    const showWorkspaceList = ref(false);
    const showInstructions = ref(false);
    const showImageModal = ref(false);
    const selectedImage = ref(null);

    // Filters
    const colorFilter = ref('');
    const searchHex = ref('');
    const tolerance = ref(60);
    const searchTitle = ref('');
    const searchMetadata = ref('');
    const selectedDecades = ref([]);
    const colorPickerUsed = ref(false);

    // Dragging state
    const isPanning = ref(false);
    const panLastX = ref(0);
    const panLastY = ref(0);
    const isDragging = ref(false);
    const dragItem = ref(null);
    const dragOffsetX = ref(0);
    const dragOffsetY = ref(0);

    // Refs
    const workspace = ref(null);
    const workspaceInner = ref(null);

    // Computed properties
    const workspaceTransform = computed(() => {
      return {
        transform: `translate(${panX.value * zoom.value}px, ${panY.value * zoom.value}px) scale(${zoom.value})`,
        transformOrigin: '0 0'
      };
    });

    const availableDecades = computed(() => {
      const decadeCounts = {};
      const filteredDecadeCounts = {};

      // Count all decades
      images.value.forEach(img => {
        const date = img.earliest_date;
        if (date && /^\d{4}$/.test(date)) {
          const year = parseInt(date);
          const decade = Math.floor(year / 10) * 10;
          decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
      });

      // Count filtered decades
      filteredImages.value.forEach(img => {
        const date = img.earliest_date;
        if (date && /^\d{4}$/.test(date)) {
          const year = parseInt(date);
          const decade = Math.floor(year / 10) * 10;
          filteredDecadeCounts[decade] = (filteredDecadeCounts[decade] || 0) + 1;
        }
      });

      return Object.keys(decadeCounts)
        .map(d => parseInt(d))
        .sort((a, b) => a - b)
        .map(decade => ({
          value: decade,
          totalCount: decadeCounts[decade],
          filteredCount: filteredDecadeCounts[decade] || 0
        }));
    });

    // Create a reactive color filter object like the original
    const colorFilterObj = computed(() => {
      const clr = colorPickerUsed.value ? normalizeHex(colorFilter.value) : '';
      const searchHexNorm = normalizeHex(searchHex.value);
      const tol = parseInt(tolerance.value);
      return { clr, searchHex: searchHexNorm, tol };
    });

    // Check if any filters are active
    const hasActiveFilters = computed(() => {
      return searchTitle.value ||
             searchMetadata.value ||
             selectedDecades.value.length > 0 ||
             colorPickerUsed.value ||
             searchHex.value;
    });

    const filteredImages = computed(() => {
      // Don't show any images if no filters are active
      if (!hasActiveFilters.value) {
        return [];
      }

      const cf = colorFilterObj.value;

      let filtered = images.value.filter(img => {
        // Title search
        if (searchTitle.value && !(img.name || '').toLowerCase().includes(searchTitle.value.toLowerCase())) {
          return false;
        }

        // Metadata search
        if (searchMetadata.value) {
          const term = searchMetadata.value.toLowerCase();
          const personMatch = (img.person || '').toLowerCase().includes(term);
          const partyMatch = (img.party || '').toLowerCase().includes(term);
          const officeMatch = (img.office || '').toLowerCase().includes(term);
          if (!personMatch && !partyMatch && !officeMatch) {
            return false;
          }
        }

        // Decade filter
        if (selectedDecades.value.length > 0) {
          const date = img.earliest_date;
          if (date && /^\d{4}$/.test(date)) {
            const year = parseInt(date);
            const decade = Math.floor(year / 10) * 10;
            if (!selectedDecades.value.includes(decade)) {
              return false;
            }
          } else {
            return false;
          }
        }

        // Color filter - exact same logic as original
        if (!cf.clr && !cf.searchHex) return true;

        if (cf.searchHex) {
          let best = 0;
          img.colors.forEach(c => {
            if (colorDistance(hexToRgb(c.hex), hexToRgb(cf.searchHex)) <= cf.tol) {
              best = Math.max(best, c.proportion);
            }
          });
          return best > 0;
        }

        if (cf.clr) {
          let best = 0;
          img.colors.forEach(c => {
            if (colorDistance(hexToRgb(c.hex), hexToRgb(cf.clr)) <= cf.tol) {
              best = Math.max(best, c.proportion);
            }
          });
          return best > 0;
        }

        return true;
      });

      // Sort by color match if color filter is active
      if (cf.clr || cf.searchHex) {
        const targetColor = cf.searchHex || cf.clr;
        filtered.sort((a, b) => {
          const scoreA = getColorScore(a, targetColor);
          const scoreB = getColorScore(b, targetColor);
          return scoreB - scoreA;
        });
      }

      return filtered;
    });

    // Methods
    const toggleTheme = () => {
      isDarkMode.value = !isDarkMode.value;
      localStorage.setItem('darkMode', isDarkMode.value.toString());
      updateTheme();
    };

    const toggleWorkspaceBackground = () => {
      isWorkspaceDark.value = !isWorkspaceDark.value;
      localStorage.setItem('workspaceDark', isWorkspaceDark.value.toString());
    };

    const updateTheme = () => {
      document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
    };

    const buildIIIFUrl = (iiifId, size = 300) => {
      if (!iiifId) return '';
      return `https://iiif-cache.digitalhumanities.fas.harvard.edu/iiif/thumb?url=https://ids.lib.harvard.edu/ids/iiif/${iiifId}/full/,${size}/0/default.jpg`;
    };

    const loadCSV = async () => {
      try {
        loading.value = true;
        const response = await fetch('../data/hks_buttons_new.csv');
        const text = await response.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        const byImage = {};
        parsed.data.forEach(row => {
          const iiifId = (row.iiifid || '').trim();
          if (!iiifId) return;

          if (!byImage[iiifId]) {
            byImage[iiifId] = {
              iiifId: iiifId,
              id: iiifId,
              w_cm: row.wcm || '',
              title: row.name || '',
              earliest_date: row.earliest_date || '',
              person: row.person || '',
              party: row.party || '',
              office: row.office || '',
              raw: []
            };
          }

          byImage[iiifId].raw.push({ color: row.Hex, proportion: row.frequency });
        });

        images.value = Object.keys(byImage).map((k, idx) => {
          const g = byImage[k];
          g.raw.sort((a, b) => (parseFloat(b.proportion) || 0) - (parseFloat(a.proportion) || 0));
          const colors = g.raw
            .map(rr => ({ hex: (rr.color || ''), proportion: parseFloat(rr.proportion) || 0 }))
            .filter(c => c.hex);

          return {
            id: g.id || `img-${idx}`,
            name: g.title || `Image ${idx + 685}`,
            width: parseFloat(g.w_cm) || 3,
            iiifId: g.iiifId,
            url: buildIIIFUrl(g.iiifId, 600),
            colors,
            earliest_date: g.earliest_date,
            person: g.person,
            party: g.party,
            office: g.office
          };
        });
        loading.value = false;
      } catch (err) {
        error.value = 'Failed to load data: ' + err.message;
        loading.value = false;
      }
    };

    // Color utilities
    const normalizeHex = (h) => {
      if (!h) return '';
      h = h.trim();
      if (h[0] !== '#') h = '#' + h;
      if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      return h.toLowerCase();
    };

    const hexToRgb = (hex) => {
      if (!hex) return { r: 0, g: 0, b: 0 };
      hex = normalizeHex(hex);
      hex = hex.replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
      }
      const n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    const colorDistance = (a, b) => {
      const dr = a.r - b.r;
      const dg = a.g - b.g;
      const db = a.b - b.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const getColorScore = (img, targetColor) => {
      let best = 0;
      const tol = parseInt(tolerance.value);
      img.colors.forEach(color => {
        if (colorDistance(hexToRgb(color.hex), hexToRgb(targetColor)) <= tol) {
          best = Math.max(best, color.proportion);
        }
      });
      return best;
    };

    // Workspace methods
    const screenToLogical = (clientX, clientY) => {
      const rect = workspace.value.getBoundingClientRect();
      const sx = (clientX - rect.left) / zoom.value;
      const sy = (clientY - rect.top) / zoom.value;
      return { lx: sx - panX.value, ly: sy - panY.value };
    };

    const addToWorkspace = (img, x = 50, y = 50) => {
      if (workspaceItems.value.some(item => item.id === img.id)) {
        return;
      }

      // Add stagger offset based on existing items count
      const staggerOffset = workspaceItems.value.length * 15; // 15px offset per existing item
      const staggeredX = x + staggerOffset;
      const staggeredY = y + staggerOffset;

      workspaceItems.value.push({
        id: img.id,
        name: img.name,
        url: img.url,
        width: img.width,
        x: staggeredX,
        y: staggeredY,
        dragging: false
      });
    };

    const removeFromWorkspace = (itemId) => {
      const index = workspaceItems.value.findIndex(item => item.id === itemId);
      if (index > -1) {
        workspaceItems.value.splice(index, 1);
      }
    };

    // Workspace persistence functions
    const saveWorkspace = () => {
      const workspaceData = {
        items: workspaceItems.value,
        zoom: zoom.value,
        panX: panX.value,
        panY: panY.value,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('savedWorkspace', JSON.stringify(workspaceData));
      hasSavedWorkspace.value = true;
      console.log('Workspace saved to localStorage');
    };

    const loadWorkspace = () => {
      const saved = localStorage.getItem('savedWorkspace');
      if (saved) {
        try {
          const workspaceData = JSON.parse(saved);
          workspaceItems.value = workspaceData.items || [];
          zoom.value = workspaceData.zoom || 0.25;
          panX.value = workspaceData.panX || 0;
          panY.value = workspaceData.panY || 0;
          console.log('Workspace loaded from localStorage');
        } catch (error) {
          console.error('Error loading workspace:', error);
          alert('Error loading saved workspace');
        }
      }
    };

    const downloadWorkspace = () => {
      const workspaceData = {
        items: workspaceItems.value,
        zoom: zoom.value,
        panX: panX.value,
        panY: panY.value,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(workspaceData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hks-workspace-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    const uploadWorkspace = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workspaceData = JSON.parse(e.target.result);
            workspaceItems.value = workspaceData.items || [];
            zoom.value = workspaceData.zoom || 0.25;
            panX.value = workspaceData.panX || 0;
            panY.value = workspaceData.panY || 0;
            console.log('Workspace loaded from file');
          } catch (error) {
            console.error('Error parsing workspace file:', error);
            alert('Invalid workspace file format');
          }
        };
        reader.readAsText(file);
      }
      // Clear the file input
      event.target.value = '';
    };

    const clearWorkspace = () => {
      if (confirm('Are you sure you want to clear all items from the workspace?')) {
        workspaceItems.value = [];
        zoom.value = 0.25;
        panX.value = 0;
        panY.value = 0;
      }
    };

    const downloadWorkspacePNG = async () => {
      if (!workspace.value || workspaceItems.value.length === 0) return;

      try {
        // Show capturing indicator
        workspace.value.classList.add('capturing');

        // Temporarily hide UI elements that shouldn't appear in the export
        const rightControls = workspace.value.parentElement.querySelector('.right-controls');
        const viewBar = workspace.value.parentElement.querySelector('.view-bar');
        const workspaceControls = workspace.value.parentElement.querySelector('.workspace-controls');

        if (rightControls) rightControls.style.display = 'none';
        if (viewBar) viewBar.style.display = 'none';
        if (workspaceControls) workspaceControls.style.display = 'none';

        // Fix text rendering for PNG export
        const workspaceLabel = workspace.value.querySelector('#workspaceLabel');
        let originalStyles = {};

        if (workspaceLabel) {
          // Store original styles
          originalStyles = {
            fontSize: workspaceLabel.style.fontSize,
            letterSpacing: workspaceLabel.style.letterSpacing,
            fontFamily: workspaceLabel.style.fontFamily
          };

          // Apply fixed styles for capture
          workspaceLabel.style.fontSize = '1200px';
          workspaceLabel.style.letterSpacing = '-0.02em';
          workspaceLabel.style.fontFamily = '"Public Sans", sans-serif';
        }

        // Wait a moment for the DOM to update and show the indicator
        await new Promise(resolve => setTimeout(resolve, 300));

        // Remove the indicator before capture
        workspace.value.classList.remove('capturing');

        // Capture the workspace
        const canvas = await html2canvas(workspace.value, {
          backgroundColor: null, // Preserve workspace background
          scale: 6, // Ultra high resolution (6x for crisp button details)
          useCORS: true,
          allowTaint: true,
          imageTimeout: 30000, // Increased timeout for larger images
          removeContainer: false,
          logging: false, // Disable console logs for cleaner output
          onclone: (clonedDoc) => {
            // Only hide background text if it's actually hidden (when workspace is in dark mode)
            if (isWorkspaceDark.value) {
              const clonedLabel = clonedDoc.querySelector('#workspaceLabel');
              if (clonedLabel) {
                clonedLabel.style.display = 'none';
              }
            }
          }
        });

        // Restore original text styles
        if (workspaceLabel) {
          workspaceLabel.style.fontSize = originalStyles.fontSize;
          workspaceLabel.style.letterSpacing = originalStyles.letterSpacing;
          workspaceLabel.style.fontFamily = originalStyles.fontFamily;
        }

        // Restore UI elements
        if (rightControls) rightControls.style.display = '';
        if (viewBar) viewBar.style.display = '';
        if (workspaceControls) workspaceControls.style.display = '';

        // Convert to blob and download (maximum quality PNG)
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `hks-workspace-ultra-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          console.log(`Ultra high-resolution PNG exported: ${canvas.width}x${canvas.height} pixels`);
        }, 'image/png', 1.0);

      } catch (error) {
        console.error('Error capturing workspace:', error);
        alert('Error generating PNG. Please try again.');

        // Make sure UI elements are restored and indicator is removed even on error
        workspace.value.classList.remove('capturing');
        const rightControls = workspace.value.parentElement.querySelector('.right-controls');
        const viewBar = workspace.value.parentElement.querySelector('.view-bar');
        const workspaceControls = workspace.value.parentElement.querySelector('.workspace-controls');

        if (rightControls) rightControls.style.display = '';
        if (viewBar) viewBar.style.display = '';
        if (workspaceControls) workspaceControls.style.display = '';
      }
    };

    // Event handlers
    const handleDragStart = (event, img) => {
      event.dataTransfer.setData('id', img.id);
    };

    const handleDrop = (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('id');
      const img = images.value.find(i => i.id === id);
      if (img) {
        const logical = screenToLogical(event.clientX, event.clientY);
        addToWorkspace(img, logical.lx, logical.ly);
      }
    };

    const startPanning = (event) => {
      if (event.target.closest('.workspace-card')) return;
      isPanning.value = true;
      panLastX.value = event.clientX;
      panLastY.value = event.clientY;
      event.preventDefault();
    };

    const startDragging = (event, item) => {
      event.stopPropagation();
      isDragging.value = true;
      dragItem.value = item;
      const logical = screenToLogical(event.clientX, event.clientY);
      dragOffsetX.value = logical.lx - item.x;
      dragOffsetY.value = logical.ly - item.y;
      item.dragging = true;
    };

    const handleMouseMove = (event) => {
      if (isPanning.value) {
        const deltaX = event.clientX - panLastX.value;
        const deltaY = event.clientY - panLastY.value;
        panX.value += deltaX / zoom.value;
        panY.value += deltaY / zoom.value;
        panLastX.value = event.clientX;
        panLastY.value = event.clientY;
      } else if (isDragging.value && dragItem.value) {
        const logical = screenToLogical(event.clientX, event.clientY);
        dragItem.value.x = logical.lx - dragOffsetX.value;
        dragItem.value.y = logical.ly - dragOffsetY.value;
      }
    };

    const handleMouseUp = (event) => {
      if (isDragging.value && dragItem.value) {
        const rect = workspace.value.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
          removeFromWorkspace(dragItem.value.id);
        }
        dragItem.value.dragging = false;
        dragItem.value = null;
      }
      isPanning.value = false;
      isDragging.value = false;
    };

    const handleWheel = (event) => {
      const mouse = screenToLogical(event.clientX, event.clientY);
      const mx = mouse.lx;
      const my = mouse.ly;
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(Math.max(zoom.value + delta, 0.2), 3);

      if (newZoom === zoom.value) return;

      panX.value = (mx + panX.value) * (zoom.value / newZoom) - mx;
      panY.value = (my + panY.value) * (zoom.value / newZoom) - my;
      zoom.value = newZoom;
    };

    // UI methods
    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    const zoomIn = () => {
      const newZoom = Math.min(zoom.value + 0.1, 5);
      zoom.value = newZoom;
    };

    const zoomOut = () => {
      const newZoom = Math.max(zoom.value - 0.1, 0.1);
      zoom.value = newZoom;
    };

    const resetZoom = () => {
      zoom.value = 0.20;
      panX.value = 0;
      panY.value = 0;
    };

    const exitFullscreen = async () => {
      const doc = document;
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn('Exit fullscreen failed', err);
      }
    };

    const toggleFullscreen = async () => {
      const doc = document;
      const wsContainer = workspace.value?.parentElement;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

      try {
        if (!isFull && wsContainer) {
          if (wsContainer.requestFullscreen) {
            await wsContainer.requestFullscreen();
          } else if (wsContainer.webkitRequestFullscreen) {
            wsContainer.webkitRequestFullscreen();
          } else if (wsContainer.mozRequestFullScreen) {
            wsContainer.mozRequestFullScreen();
          } else if (wsContainer.msRequestFullscreen) {
            wsContainer.msRequestFullscreen();
          }
        } else {
          await exitFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen toggle failed', err);
      }
    };

    const openImageModal = (img) => {
      selectedImage.value = img;
      showImageModal.value = true;
    };

    const onColorPickerChange = () => {
      colorPickerUsed.value = true;
      tolerance.value = 40; // Set default tolerance to 40 when color is selected
    };

    const clearAllFilters = () => {
      colorFilter.value = '#ff0000';
      colorPickerUsed.value = false; // Reset color filter active state
      searchHex.value = '';
      searchTitle.value = '';
      searchMetadata.value = '';
      tolerance.value = 60;
      selectedDecades.value = [];
    };

    const selectAllDecades = () => {
      selectedDecades.value = availableDecades.value.map(d => d.value);
    };

    const deselectAllDecades = () => {
      selectedDecades.value = [];
    };

    const downloadCSV = () => {
      if (workspaceItems.value.length === 0) return;

      const rows = [['id', 'name', 'url']];
      workspaceItems.value.forEach(item => {
        rows.push([item.id || '', item.name || '', item.url || '']);
      });

      const csv = rows.map(row =>
        row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
      ).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workspace_items.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };


    // Lifecycle
    onMounted(() => {
      loadCSV();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement);
      });

    });

    return {
      // Data
      images,
      loading,
      error,
      workspaceItems,
      filteredImages,
      availableDecades,
      colorFilterObj,
      hasActiveFilters,
      hasSavedWorkspace,

      // Theme
      isDarkMode,
      toggleTheme,

      // Workspace background
      isWorkspaceDark,
      toggleWorkspaceBackground,

      // UI State
      sidebarCollapsed,
      isFullscreen,
      showWorkspaceList,
      showInstructions,
      showImageModal,
      selectedImage,

      // Workspace
      zoom,
      workspaceTransform,
      workspace,
      workspaceInner,

      // Filters
      colorFilter,
      searchHex,
      tolerance,
      searchTitle,
      searchMetadata,
      selectedDecades,

      // Methods
      toggleSidebar,
      zoomIn,
      zoomOut,
      resetZoom,
      toggleFullscreen,
      exitFullscreen,
      openImageModal,
      addToWorkspace,
      saveWorkspace,
      loadWorkspace,
      downloadWorkspace,
      downloadWorkspacePNG,
      uploadWorkspace,
      clearWorkspace,
      handleDragStart,
      handleDrop,
      startPanning,
      startDragging,
      handleWheel,
      onColorPickerChange,
      clearAllFilters,
      selectAllDecades,
      deselectAllDecades,
      downloadCSV
    };
  }
}).mount('#app');
