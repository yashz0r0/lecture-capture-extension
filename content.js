let captureInterval;
let previousImageData = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "START_CAPTURE") {
    startCapture(message.interval);
  }

  if (message.action === "STOP_CAPTURE") {
    stopCapture();
  }
});

function startCapture(seconds) {
  stopCapture();

  captureInterval = setInterval(() => {
    captureFrame();
  }, seconds * 1000);

  alert(`Capture started every ${seconds} seconds`);
}

function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = 64;
    smallCanvas.height = 64;
    const smallCtx = smallCanvas.getContext("2d");
    smallCtx.drawImage(video, 0, 0, 64, 64);
    const currentImageData = smallCtx.getImageData(0, 0, 64, 64);

    const image = canvas.toDataURL("image/png");
    const timestamp = formatTime(video.currentTime);
    const capture = {
      image,
      timestamp,
      videoTitle: document.title,
      url: window.location.href,
    };

    if (previousImageData) {
      const sim = calculateSimilarity(previousImageData, currentImageData);
      
      if (sim >= 0.99) {
        console.log("Duplicate frame skipped");
        return;
      }

      if (sim >= 0.95) {
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
  let diff = 0;
  const d1 = imgData1.data;
  const d2 = imgData2.data;
  const len = d1.length;
  
  for (let i = 0; i < len; i += 4) {
    diff += Math.abs(d1[i] - d2[i]) + 
            Math.abs(d1[i + 1] - d2[i + 1]) + 
            Math.abs(d1[i + 2] - d2[i + 2]);
  }
  
  const maxDiff = (len / 4) * 255 * 3;
  return 1 - (diff / maxDiff);
}
