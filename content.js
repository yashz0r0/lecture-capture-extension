let captureInterval;
let previousImage = null;

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

  const image = canvas.toDataURL("image/png");

  if (image === previousImage) {
    console.log("Duplicate frame skipped");
    return;
  }

  previousImage = image;

  const timestamp = formatTime(video.currentTime);

  saveCapture({
    image,
    timestamp,
    videoTitle: document.title,
    url: window.location.href,
  });

  console.log("Captured at:", timestamp);
}

function saveCapture(capture) {
  chrome.storage.local.get(["captures"], (result) => {
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
