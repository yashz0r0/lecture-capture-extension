document.addEventListener("DOMContentLoaded", () => {
  const pageTitle = document.getElementById("pageTitle");
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const undoBtn = document.getElementById("undoBtn");
  const recentlyDeletedBtn = document.getElementById("recentlyDeletedBtn");
  const backToGalleryBtn = document.getElementById("backToGalleryBtn");
  const emptyTrashBtn = document.getElementById("emptyTrashBtn");
  const exportSettings = document.getElementById("exportSettings");
  const exportQualitySlider = document.getElementById("exportQualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const estimatedSize = document.getElementById("estimatedSize");

  // Create Modal UI for viewing images
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = `
    <div id="imageModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.9);">
      <span id="closeModal" style="position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer;">&times;</span>
      <img id="modalImage" style="margin: auto; display: block; max-width: 90%; max-height: 90%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    </div>
  `;
  document.body.appendChild(modalContainer);

  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeModal = document.getElementById("closeModal");

  closeModal.addEventListener("click", () => imageModal.style.display = "none");
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) imageModal.style.display = "none";
  });

  function openImageViewer(src) {
    const q = parseFloat(exportQualitySlider.value);
    if (q === 1.0) {
      modalImage.src = src;
      imageModal.style.display = "block";
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      modalImage.src = canvas.toDataURL("image/jpeg", q);
      imageModal.style.display = "block";
    };
    img.src = src;
  }

  let currentView = 'gallery';
  let lastDeletedState = null;
  let firstSlideOriginalImage = null;

  function initExportSettings(captures) {
    if (captures.length > 0) {
      const img = new Image();
      img.onload = () => {
        firstSlideOriginalImage = img;
        updateLivePreview();
      };
      img.src = captures[0].image;
    }
  }

  function updateLivePreview() {
    if (!firstSlideOriginalImage) return;
    const q = parseFloat(exportQualitySlider.value);
    qualityValue.innerText = q.toFixed(1);
    
    const canvas = document.createElement("canvas");
    canvas.width = firstSlideOriginalImage.width;
    canvas.height = firstSlideOriginalImage.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(firstSlideOriginalImage, 0, 0);
    
    const compressedDataUrl = canvas.toDataURL("image/jpeg", q);
    
    const bytes = compressedDataUrl.length * 0.75;
    const kb = (bytes / 1024).toFixed(1);
    estimatedSize.innerText = `${kb} KB`;
  }

  if (exportQualitySlider) {
    exportQualitySlider.addEventListener("input", updateLivePreview);
  }

  function toggleView(view) {
    currentView = view;
    if (view === 'trash') {
      pageTitle.innerText = "Recently Deleted";
      recentlyDeletedBtn.style.display = "none";
      downloadPdfBtn.style.display = "none";
      clearAllBtn.style.display = "none";
      undoBtn.style.display = "none";
      if(exportSettings) exportSettings.style.display = "none";
      
      backToGalleryBtn.style.display = "inline-block";
      emptyTrashBtn.style.display = "inline-block";
    } else {
      pageTitle.innerText = "Captured Slides";
      recentlyDeletedBtn.style.display = "inline-block";
      downloadPdfBtn.style.display = "inline-block";
      clearAllBtn.style.display = "inline-block";
      if(exportSettings) exportSettings.style.display = "flex";
      showUndoButton();
      
      backToGalleryBtn.style.display = "none";
      emptyTrashBtn.style.display = "none";
    }
    loadCaptures();
  }

  recentlyDeletedBtn.addEventListener("click", () => toggleView('trash'));
  backToGalleryBtn.addEventListener("click", () => toggleView('gallery'));

  function showUndoButton() {
    if (lastDeletedState && currentView === 'gallery') {
      undoBtn.style.display = "inline-block";
    }
  }

  function hideUndoButton() {
    lastDeletedState = null;
    undoBtn.style.display = "none";
  }

  undoBtn.addEventListener("click", () => {
    if (!lastDeletedState) return;

    chrome.storage.local.get(["captures", "deletedCaptures"], (result) => {
      let captures = result.captures || [];
      let deletedCaptures = result.deletedCaptures || [];

      if (lastDeletedState.type === 'single') {
        captures.splice(lastDeletedState.index, 0, lastDeletedState.capture);
        // Also remove from deletedCaptures (it was unshifted)
        deletedCaptures.shift();
      } else if (lastDeletedState.type === 'all') {
        captures = lastDeletedState.captures;
        // Remove from deletedCaptures (first N elements were prepended)
        deletedCaptures.splice(0, lastDeletedState.captures.length);
      }

      chrome.storage.local.set({ captures, deletedCaptures }, () => {
        loadCaptures();
        hideUndoButton();
      });
    });
  });

  function loadCaptures() {
    const storageKey = currentView === 'trash' ? "deletedCaptures" : "captures";
    chrome.storage.local.get([storageKey], (result) => {
      const items = result[storageKey] || [];
      
      grid.innerHTML = "";
      
      if (items.length === 0) {
        emptyState.style.display = "block";
        emptyState.innerText = currentView === 'trash' ? "No recently deleted items." : "No images captured yet.";
        downloadPdfBtn.disabled = true;
        emptyTrashBtn.disabled = true;
        if (exportSettings) exportSettings.style.display = "none";
      } else {
        emptyState.style.display = "none";
        downloadPdfBtn.disabled = false;
        emptyTrashBtn.disabled = false;
        
        if (currentView !== 'trash') {
          if (exportSettings) exportSettings.style.display = "flex";
          initExportSettings(items);
        }
        
        items.forEach((item, index) => {
          const card = document.createElement("div");
          card.className = "card";
          
          if (currentView === 'trash') {
            card.innerHTML = `
              <div style="position: relative; display: inline-block; width: 100%;">
                <img src="${item.image}" alt="Slide at ${item.timestamp}" class="view-trigger" data-src="${item.image}" style="cursor: pointer; display: block; width: 100%;" title="Click to view full screen">
                <div class="view-icon" data-src="${item.image}" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" title="View Image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </div>
              </div>
              <div class="card-info">
                <div>Time: ${item.timestamp}</div>
              </div>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <button class="restore-btn" data-index="${index}" style="flex: 1;">Restore</button>
                <button class="perm-delete-btn" data-index="${index}" style="flex: 1;">Delete</button>
              </div>
            `;
          } else {
            card.innerHTML = `
              <div style="position: relative; display: inline-block; width: 100%;">
                <img src="${item.image}" alt="Slide at ${item.timestamp}" class="view-trigger" data-src="${item.image}" style="cursor: pointer; display: block; width: 100%;" title="Click to view full screen">
                <div class="view-icon" data-src="${item.image}" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" title="View Image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </div>
              </div>
              <div class="card-info">
                <div>Time: ${item.timestamp}</div>
              </div>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <button class="delete-btn" data-index="${index}" style="flex: 1;">Delete</button>
              </div>
            `;
          }
          grid.appendChild(card);
        });

        // Add view listeners
        document.querySelectorAll(".view-trigger, .view-icon").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const src = e.target.getAttribute("data-src");
            openImageViewer(src);
          });
        });

        if (currentView === 'trash') {
          document.querySelectorAll(".restore-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.target.disabled = true;
              const index = e.target.getAttribute("data-index");
              restoreCapture(index);
            });
          });
          document.querySelectorAll(".perm-delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.target.disabled = true;
              const index = e.target.getAttribute("data-index");
              permanentlyDeleteCapture(index);
            });
          });
        } else {
          document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.target.disabled = true;
              const index = e.target.getAttribute("data-index");
              deleteCapture(index);
            });
          });
        }
      }
    });
  }

  function deleteCapture(index) {
    chrome.storage.local.get(["captures", "deletedCaptures"], (result) => {
      let captures = result.captures || [];
      let deletedCaptures = result.deletedCaptures || [];
      
      const deletedCapture = captures[index];
      if (!deletedCapture) return;

      deletedCapture.originalIndex = parseInt(index, 10);
      lastDeletedState = { type: 'single', index: parseInt(index, 10), capture: deletedCapture };
      
      captures.splice(index, 1);
      deletedCaptures.unshift(deletedCapture);
      
      chrome.storage.local.set({ captures, deletedCaptures }, () => {
        loadCaptures();
        showUndoButton();
      });
    });
  }

  function restoreCapture(index) {
    chrome.storage.local.get(["captures", "deletedCaptures"], (result) => {
      let captures = result.captures || [];
      let deletedCaptures = result.deletedCaptures || [];
      
      const restoredArray = deletedCaptures.splice(index, 1);
      if (restoredArray.length === 0) return;
      
      const restored = restoredArray[0];
      const insertIndex = restored.originalIndex !== undefined ? Math.min(restored.originalIndex, captures.length) : captures.length;
      captures.splice(insertIndex, 0, restored);
      
      // If we are restoring, it might invalidate the undo state if they overlap
      hideUndoButton();
      
      chrome.storage.local.set({ captures, deletedCaptures }, () => {
        loadCaptures();
      });
    });
  }

  function permanentlyDeleteCapture(index) {
    chrome.storage.local.get(["deletedCaptures"], (result) => {
      let deletedCaptures = result.deletedCaptures || [];
      if (index >= deletedCaptures.length) return;
      
      deletedCaptures.splice(index, 1);
      chrome.storage.local.set({ deletedCaptures }, () => {
        loadCaptures();
      });
    });
  }

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all captured slides?")) {
      chrome.storage.local.get(["captures", "deletedCaptures"], (result) => {
        const captures = result.captures || [];
        let deletedCaptures = result.deletedCaptures || [];
        
        if (captures.length > 0) {
          lastDeletedState = { type: 'all', captures: [...captures] };
          
          const capturesWithIndex = captures.map((c, i) => ({...c, originalIndex: i}));
          deletedCaptures = [...capturesWithIndex.reverse(), ...deletedCaptures];
          
          chrome.storage.local.set({ captures: [], deletedCaptures }, () => {
            loadCaptures();
            showUndoButton();
          });
        }
      });
    }
  });

  emptyTrashBtn.addEventListener("click", () => {
    if (confirm("Permanently delete all items in Recently Deleted?")) {
      chrome.storage.local.set({ deletedCaptures: [] }, () => {
        hideUndoButton();
        loadCaptures();
      });
    }
  });

  downloadPdfBtn.addEventListener("click", () => {
    chrome.storage.local.get(["captures"], async (result) => {
      const captures = result.captures || [];
      if (captures.length === 0) return;

      downloadPdfBtn.innerText = "Generating...";
      downloadPdfBtn.disabled = true;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const q = parseFloat(exportQualitySlider.value);

      const processImage = (dataUrl) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", q));
          };
          img.src = dataUrl;
        });
      };

      for (let index = 0; index < captures.length; index++) {
        const capture = captures[index];
        if (index > 0) {
          doc.addPage();
        }
        
        const compressedImg = await processImage(capture.image);
        doc.addImage(compressedImg, "JPEG", 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(capture.timestamp, 10, pageHeight - 10);
      }

      const fileName = captures[0].videoTitle ? 
        `Lecture-${captures[0].videoTitle.replace(/[^a-z0-9]/gi, '_')}.pdf` : 
        "Lecture_Slides.pdf";
        
      doc.save(fileName);
      
      downloadPdfBtn.innerText = "Download PDF";
      downloadPdfBtn.disabled = false;
    });
  });

  loadCaptures();
});
