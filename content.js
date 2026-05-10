let captureInterval;
let previousImageData = null;
let lastCaptureVideoTime = null;
let targetInterval = 0;
let captureQuality = 0.3;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "START_CAPTURE") {
    captureQuality = parseFloat(message.quality) || 0.3;
    startCapture(message.interval);
  }

  if (message.action === "STOP_CAPTURE") {
    stopCapture();
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

function captureFrame() {
  try {
    const video = document.querySelector("video");

    if (!video) {
      console.log("No video found");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const MAX_WIDTH = 800;
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
    smallCtx.drawImage(video, 0, 0, thumbSize, thumbSize);
    const currentImageData = smallCtx.getImageData(0, 0, thumbSize, thumbSize);

    const image = canvas.toDataURL("image/jpeg", captureQuality);
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
  const d1 = imgData1.data;
  const d2 = imgData2.data;
  const len = d1.length;
  
  for (let i = 0; i < len; i += 4) {
    const rDiff = Math.abs(d1[i] - d2[i]);
    const gDiff = Math.abs(d1[i + 1] - d2[i + 1]);
    const bDiff = Math.abs(d1[i + 2] - d2[i + 2]);
    
    // A pixel is considered "changed" if the color difference is significant enough
    // This helps ignore video compression artifacts while catching text changes
    if (rDiff > 25 || gDiff > 25 || bDiff > 25) {
      differentPixels++;
    }
  }
  
  const totalPixels = len / 4;
  return 1 - (differentPixels / totalPixels);
}
