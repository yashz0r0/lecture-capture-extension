const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const intervalSelect = document.getElementById("interval");
const galleryBtn = document.getElementById("galleryBtn");

startBtn.addEventListener("click", async () => {
  const interval = intervalSelect.value;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.tabs.sendMessage(tab.id, {
    action: "START_CAPTURE",
    interval: interval,
  });
});

stopBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.tabs.sendMessage(tab.id, {
    action: "STOP_CAPTURE",
  });
});

galleryBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "gallery.html" });
});
