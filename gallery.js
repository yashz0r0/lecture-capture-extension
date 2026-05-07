document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  function loadCaptures() {
    chrome.storage.local.get(["captures"], (result) => {
      const captures = result.captures || [];
      
      grid.innerHTML = "";
      
      if (captures.length === 0) {
        emptyState.style.display = "block";
        downloadPdfBtn.disabled = true;
      } else {
        emptyState.style.display = "none";
        downloadPdfBtn.disabled = false;
        
        captures.forEach((capture, index) => {
          const card = document.createElement("div");
          card.className = "card";
          
          card.innerHTML = `
            <img src="${capture.image}" alt="Slide at ${capture.timestamp}">
            <div class="card-info">
              <div>Time: ${capture.timestamp}</div>
            </div>
            <button class="delete-btn" data-index="${index}">Delete</button>
          `;
          
          grid.appendChild(card);
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const index = e.target.getAttribute("data-index");
            deleteCapture(index);
          });
        });
      }
    });
  }

  function deleteCapture(index) {
    chrome.storage.local.get(["captures"], (result) => {
      let captures = result.captures || [];
      captures.splice(index, 1);
      chrome.storage.local.set({ captures }, () => {
        loadCaptures();
      });
    });
  }

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all captured slides?")) {
      chrome.storage.local.set({ captures: [] }, () => {
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
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      captures.forEach((capture, index) => {
        if (index > 0) {
          doc.addPage();
        }
        
        doc.addImage(capture.image, "PNG", 0, 0, pageWidth, pageHeight);
        
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
