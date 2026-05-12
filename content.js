let captureInterval;
let previousImageData = null;
let lastCaptureVideoTime = null;
let targetInterval = 0;
let customIgnoreBox = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_CAPTURE") {
    startCapture(message.interval);
  }

  if (message.action === "STOP_CAPTURE") {
    stopCapture();
  }

  if (message.action === "START_SELECTION") {
    startSelection();
    sendResponse({ status: "started" });
    return true;
  }
});

function startCapture(seconds) {
  stopCapture();

  targetInterval = seconds;
  const video = document.querySelector("video");
  lastCaptureVideoTime = video ? video.currentTime : 0;

  // Poll frequently (every 250ms real time) to check video time
  captureInterval = setInterval(() => {
    const v = document.querySelector("video");
    if (!v) return;

    if (v.currentTime - lastCaptureVideoTime >= targetInterval) {
      captureFrame();
      lastCaptureVideoTime = v.currentTime;
    } else if (v.currentTime < lastCaptureVideoTime) {
      // User scrubbed backwards, reset tracker
      lastCaptureVideoTime = v.currentTime;
    }
  }, 250);

  alert(`Capture started every ${seconds} seconds of video time`);
}

function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    alert("Capture stopped");
  }
}

function startSelection() {
  const video = document.querySelector("video");
  if (!video) {
    alert("No video found on this page.");
    return;
  }

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.zIndex = "999999";
  overlay.style.cursor = "crosshair";
  
  const selectionBox = document.createElement("div");
  selectionBox.style.position = "absolute";
  selectionBox.style.border = "2px dashed red";
  selectionBox.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
  selectionBox.style.display = "none";
  overlay.appendChild(selectionBox);

  document.body.appendChild(overlay);

  let isDrawing = false;
  let startX, startY;

  const onMouseDown = (e) => {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.display = "block";
  };

  const onMouseMove = (e) => {
    if (!isDrawing) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    selectionBox.style.left = `${Math.min(startX, currentX)}px`;
    selectionBox.style.top = `${Math.min(startY, currentY)}px`;
    selectionBox.style.width = `${Math.abs(currentX - startX)}px`;
    selectionBox.style.height = `${Math.abs(currentY - startY)}px`;
  };

  const onMouseUp = (e) => {
    isDrawing = false;
    
    const rectX = Math.min(startX, e.clientX);
    const rectY = Math.min(startY, e.clientY);
    const rectW = Math.abs(e.clientX - startX);
    const rectH = Math.abs(e.clientY - startY);

    const videoRect = video.getBoundingClientRect();
    
    if (rectW > 10 && rectH > 10) {
      const relX = (rectX - videoRect.left) / videoRect.width;
      const relY = (rectY - videoRect.top) / videoRect.height;
      const relW = rectW / videoRect.width;
      const relH = rectH / videoRect.height;
      
      customIgnoreBox = {
        x: Math.max(0, relX),
        y: Math.max(0, relY),
        width: Math.min(1 - Math.max(0, relX), relW),
        height: Math.min(1 - Math.max(0, relY), relH)
      };
      
      alert("Custom ignore area saved! You can now start the capture.");
    }

    document.body.removeChild(overlay);
  };

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mousemove", onMouseMove);
  overlay.addEventListener("mouseup", onMouseUp);
}

function captureFrame() {
  try {
    const video = document.querySelector("video");

    if (!video) {
      console.log("No video found");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Capture at highest quality (1080p equivalent) for gallery previewing
    const MAX_WIDTH = 1920;
    let drawWidth = video.videoWidth;
    let drawHeight = video.videoHeight;

    if (drawWidth > MAX_WIDTH) {
      drawHeight = Math.floor(drawHeight * (MAX_WIDTH / drawWidth));
      drawWidth = MAX_WIDTH;
    }

    canvas.width = drawWidth;
    canvas.height = drawHeight;

    ctx.drawImage(video, 0, 0, drawWidth, drawHeight);

    const smallCanvas = document.createElement("canvas");
    const thumbSize = 128;
    smallCanvas.width = thumbSize;
    smallCanvas.height = thumbSize;
    const smallCtx = smallCanvas.getContext("2d");

    // Draw full video to thumbnail
    smallCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, thumbSize, thumbSize);
    
    // Efficiency Upgrade: Clear the custom ignored pixels from the canvas directly
    if (customIgnoreBox) {
      const cx = customIgnoreBox.x * thumbSize;
      const cy = customIgnoreBox.y * thumbSize;
      const cw = customIgnoreBox.width * thumbSize;
      const ch = customIgnoreBox.height * thumbSize;
      smallCtx.clearRect(cx, cy, cw, ch);
    }

    const currentImageData = smallCtx.getImageData(0, 0, thumbSize, thumbSize);

    // Save absolute highest quality to storage. 
    // The gallery will compress it later based on user preference.
    const image = canvas.toDataURL("image/jpeg", 1.0);
    const timestamp = formatTime(video.currentTime);
    const capture = {
      image,
      timestamp,
      videoTitle: document.title,
      url: window.location.href,
    };

    if (previousImageData) {
      const sim = calculateSimilarity(previousImageData, currentImageData);
      console.log(`Similarity: ${sim.toFixed(4)}`);
      
      if (sim >= 0.995) {
        console.log("Duplicate frame skipped");
        return;
      }

      if (sim >= 0.98) {
        console.log("Updating last capture with more info");
        previousImageData = currentImageData;
        updateLastCapture(capture);
        return;
      }
    }

    previousImageData = currentImageData;
    saveCapture(capture);
    console.log("Captured at:", timestamp);
  } catch (error) {
    console.error("Capture failed or extension context invalidated:", error);
    stopCapture();
  }
}

function saveCapture(capture) {
  if (!chrome.runtime?.id) {
    console.log("Extension reloaded. Stopping capture.");
    stopCapture();
    return;
  }

  chrome.storage.local.get(["captures"], (result) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const captures = result.captures || [];

    captures.push(capture);

    chrome.storage.local.set({ captures });
  });
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function updateLastCapture(capture) {
  if (!chrome.runtime?.id) {
    console.log("Extension reloaded. Stopping capture.");
    stopCapture();
    return;
  }

  chrome.storage.local.get(["captures"], (result) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const captures = result.captures || [];
    if (captures.length > 0) {
      captures[captures.length - 1] = capture;
    } else {
      captures.push(capture);
    }

    chrome.storage.local.set({ captures });
  });
}

function calculateSimilarity(imgData1, imgData2) {
  let differentPixels = 0;
  let totalValidPixels = 0;
  const d1 = imgData1.data;
  const d2 = imgData2.data;
  const len = d1.length;
  
  for (let i = 0; i < len; i += 4) {
    // If the pixel was cleared by custom ignore box, its alpha is 0
    if (d2[i + 3] === 0) continue;
    
    totalValidPixels++;
    
    // Using manual absolute value is slightly faster than Math.abs
    let rDiff = d1[i] - d2[i];
    let gDiff = d1[i + 1] - d2[i + 1];
    let bDiff = d1[i + 2] - d2[i + 2];
    
    if (rDiff < 0) rDiff = -rDiff;
    if (gDiff < 0) gDiff = -gDiff;
    if (bDiff < 0) bDiff = -bDiff;
    
    if (rDiff > 25 || gDiff > 25 || bDiff > 25) {
      differentPixels++;
      
      // Early Exit Optimization:
      // If we find more than 400 different pixels (~2.4% of screen), 
      // we already know similarity is < 0.98.
      // We can stop checking the rest of the 16,000 pixels!
      if (differentPixels > 400) {
        return 0; 
      }
    }
  }
  
  if (totalValidPixels === 0) return 1; 
  return 1 - (differentPixels / totalValidPixels);
}
