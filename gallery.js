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

  let currentView = 'gallery';
  let lastDeletedState = null;

  function toggleView(view) {
    currentView = view;
    if (view === 'trash') {
      pageTitle.innerText = "Recently Deleted";
      recentlyDeletedBtn.style.display = "none";
      downloadPdfBtn.style.display = "none";
      clearAllBtn.style.display = "none";
      undoBtn.style.display = "none";
      
      backToGalleryBtn.style.display = "inline-block";
      emptyTrashBtn.style.display = "inline-block";
    } else {
      pageTitle.innerText = "Captured Slides";
      recentlyDeletedBtn.style.display = "inline-block";
      downloadPdfBtn.style.display = "inline-block";
      clearAllBtn.style.display = "inline-block";
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
      } else {
        emptyState.style.display = "none";
        downloadPdfBtn.disabled = false;
        emptyTrashBtn.disabled = false;
        
        items.forEach((item, index) => {
          const card = document.createElement("div");
          card.className = "card";
          
          if (currentView === 'trash') {
            card.innerHTML = `
              <img src="${item.image}" alt="Slide at ${item.timestamp}">
              <div class="card-info">
                <div>Time: ${item.timestamp}</div>
              </div>
              <button class="restore-btn" data-index="${index}">Restore</button>
              <button class="perm-delete-btn" data-index="${index}">Delete</button>
            `;
          } else {
            card.innerHTML = `
              <img src="${item.image}" alt="Slide at ${item.timestamp}">
              <div class="card-info">
                <div>Time: ${item.timestamp}</div>
              </div>
              <button class="delete-btn" data-index="${index}">Delete</button>
            `;
          }
          grid.appendChild(card);
        });

        if (currentView === 'trash') {
          document.querySelectorAll(".restore-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              const index = e.target.getAttribute("data-index");
              restoreCapture(index);
            });
          });
          document.querySelectorAll(".perm-delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              const index = e.target.getAttribute("data-index");
              permanentlyDeleteCapture(index);
            });
          });
        } else {
          document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
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
      
      const restored = deletedCaptures.splice(index, 1)[0];
      captures.push(restored);
      
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
          deletedCaptures = [...captures.reverse(), ...deletedCaptures];
          
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
    chrome.storage.local.get(["captures"], (result) => {
      const captures = result.captures || [];
      if (captures.length === 0) return;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      captures.forEach((capture, index) => {
        if (index > 0) {
          doc.addPage();
        }
        
        const imgFormat = capture.image.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(capture.image, imgFormat, 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(capture.timestamp, 10, pageHeight - 10);
      });

      const fileName = captures[0].videoTitle ? 
        `Lecture-${captures[0].videoTitle.replace(/[^a-z0-9]/gi, '_')}.pdf` : 
        "Lecture_Slides.pdf";
        
      doc.save(fileName);
    });
  });

  loadCaptures();
});
