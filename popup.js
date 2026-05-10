const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const intervalSelect = document.getElementById("interval");
const galleryBtn = document.getElementById("galleryBtn");

startBtn.addEventListener("click", async () => {
  try {
    const interval = intervalSelect.value;
    const quality = document.getElementById("quality").value;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, {
      action: "START_CAPTURE",
      interval: interval,
      quality: quality,
    }, (response) => {
      if (chrome.runtime.lastError) {
        alert("Please make sure you are on a YouTube video page and refresh the page.");
      }
    });
  } catch (error) {
    console.error(error);
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, {
      action: "STOP_CAPTURE",
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Ignore errors on stop if script isn't there
        console.log(chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error(error);
  }
});

galleryBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "gallery.html" });
});
